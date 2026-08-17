import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CagedError } from './core';
import type { CagedArtifactStorageAdapter } from './artifact-storage';
import type { CagedSourceKind, CagedSourceVintage } from './types';

export function officialCagedUrl(kind: CagedSourceKind, declarationMonth: string): string {
  if (!/^20\d{4}$/.test(declarationMonth)) throw new CagedError('CAGED_PARSE_ERROR', `Competência de declaração inválida: ${declarationMonth}`);
  return `ftp://ftp.mtps.gov.br/pdet/microdados/NOVO%20CAGED/${declarationMonth.slice(0, 4)}/${declarationMonth}/CAGED${kind}${declarationMonth}.7z`;
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} saiu com código ${code}: ${stderr.slice(-2000)}`)));
  });
}

export async function acquireCagedVintage(storage: CagedArtifactStorageAdapter, kind: CagedSourceKind, declarationMonth: string, forceSourceCheck = false): Promise<{ vintage: CagedSourceVintage; cacheHit: boolean; downloadMs: number }> {
  const cached = await storage.readCurrentVintage(kind, declarationMonth);
  if (cached && !forceSourceCheck) return { vintage: cached, cacheHit: true, downloadMs: 0 };
  const sourceUrl = officialCagedUrl(kind, declarationMonth);
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'politixos-caged-download-'));
  const partial = path.join(tempDirectory, `${kind}.7z.partial`);
  const started = performance.now();
  try {
    await run('curl', ['--fail', '--location', '--retry', '3', '--retry-delay', '2', '--connect-timeout', '30', '--max-time', '900', '--output', partial, sourceUrl]);
    const vintage = await storage.commitDownloaded(kind, declarationMonth, sourceUrl, partial);
    return { vintage, cacheHit: Boolean(cached && cached.sha256 === vintage.sha256), downloadMs: performance.now() - started };
  } catch (error) {
    throw new CagedError('CAGED_DOWNLOAD_FAILED', `Falha ao baixar ${kind} ${declarationMonth}: ${error instanceof Error ? error.message : String(error)}`, { sourceUrl });
  } finally { await fs.rm(tempDirectory, { recursive: true, force: true }); }
}

export function validateCagedArchiveEntries(entries: string[]): string {
  const clean = entries.map((entry) => entry.trim()).filter(Boolean);
  for (const entry of clean) { const normalized = entry.replace(/\\/g, '/'); if (normalized === '.' || normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.split('/').includes('..') || normalized.includes('/')) throw new CagedError('CAGED_UNSAFE_ARCHIVE', `Entrada insegura no arquivo: ${entry}`); }
  const txt = clean.filter((entry) => entry.toLowerCase().endsWith('.txt'));
  if (clean.length !== 1 || txt.length !== 1) throw new CagedError('CAGED_EXTRACT_FAILED', `esperado exatamente 1 TXT raiz; entradas=${clean.length}, txt=${txt.length}`);
  return txt[0];
}

async function listArchive(archivePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => { const child = spawn('/usr/bin/bsdtar', ['-tf', archivePath], { stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = '', stderr = ''; child.stdout.on('data', (chunk) => { stdout += String(chunk); }); child.stderr.on('data', (chunk) => { stderr += String(chunk); }); child.on('error', reject); child.on('close', (code) => code === 0 ? resolve(stdout.split(/\r?\n/)) : reject(new Error(stderr.slice(-2000)))); });
}

export async function extractCagedText(vintage: CagedSourceVintage, storage: CagedArtifactStorageAdapter): Promise<{ directory: string; textPath: string; extractMs: number }> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'politixos-caged-extract-'));
  const started = performance.now();
  const materialized = await storage.materialize(vintage);
  try {
    validateCagedArchiveEntries(await listArchive(materialized.path));
    await run('/usr/bin/bsdtar', ['-xf', materialized.path, '-C', directory]);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const textFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'));
    if (textFiles.length !== 1) throw new Error(`esperado exatamente 1 TXT; encontrados ${textFiles.length}`);
    const textPath = path.join(directory, textFiles[0].name);
    if ((await fs.stat(textPath)).size <= 0) throw new Error('TXT extraído vazio');
    return { directory, textPath, extractMs: performance.now() - started };
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw new CagedError('CAGED_EXTRACT_FAILED', `Falha ao extrair ${vintage.kind} ${vintage.declarationMonth}: ${error instanceof Error ? error.message : String(error)}`);
  } finally { await materialized.cleanup(); }
}
