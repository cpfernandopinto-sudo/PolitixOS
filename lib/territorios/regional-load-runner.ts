import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CanonicalTerritoryRegion } from './regional-registry';

export type RegionalMunicipalityStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'PENDING';

export interface RegionalMunicipalityCheckpoint {
  name: string;
  ibgeCode: string;
  status: RegionalMunicipalityStatus;
  years: number[];
  indicatorsProcessed: number;
  evidenceProcessed: number;
  errors: string[];
  durationMs: number | null;
  completedAt: string | null;
}

export interface RegionalLoadCheckpoint {
  schemaVersion: 1;
  runId: string;
  region: string;
  regionVersion: string;
  status: 'RUNNING' | 'COMPLETED' | 'INTERRUPTED';
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  lastCompletedIbge: string | null;
  municipalities: RegionalMunicipalityCheckpoint[];
}

export interface RegionalCollectionOutcome {
  status: 'completed' | 'partial';
  years: number[];
  indicatorsProcessed: number;
  evidenceProcessed: number;
  errors: string[];
  durationMs: number;
}

export interface RunRegionalLoadOptions {
  checkpointPath: string;
  collect: (ibgeCode: string, runId: string) => Promise<RegionalCollectionOutcome>;
  stopAfter?: number;
  now?: () => string;
}

export function validateCanonicalRegionForLoad(region: CanonicalTerritoryRegion): void {
  if (region.code !== 'RMBH') throw new Error(`Região não autorizada neste bloco: ${region.code}.`);
  if (region.territories.length !== 34) throw new Error(`Gate RMBH inválido: esperados 34, recebidos ${region.territories.length}.`);
  const codes = region.territories.map((item) => item.ibgeCode);
  if (new Set(codes).size !== codes.length) throw new Error('Gate RMBH inválido: código IBGE duplicado.');
  if (!codes.includes('3106200')) throw new Error('Gate RMBH inválido: Belo Horizonte ausente.');
  if (!codes.includes('3118601')) throw new Error('Gate RMBH inválido: Contagem ausente.');
  if (region.territories.some((item) => item.uf !== 'MG' || !/^31\d{5}$/.test(item.ibgeCode))) {
    throw new Error('Gate RMBH inválido: município externo ou IBGE inválido.');
  }
}

export function createRegionalCheckpoint(region: CanonicalTerritoryRegion, now = new Date().toISOString()): RegionalLoadCheckpoint {
  validateCanonicalRegionForLoad(region);
  return {
    schemaVersion: 1,
    runId: randomUUID(),
    region: region.code,
    regionVersion: region.version,
    status: 'RUNNING',
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    lastCompletedIbge: null,
    municipalities: region.territories.map((item) => ({
      name: item.name,
      ibgeCode: item.ibgeCode,
      status: 'PENDING',
      years: [],
      indicatorsProcessed: 0,
      evidenceProcessed: 0,
      errors: [],
      durationMs: null,
      completedAt: null,
    })),
  };
}

export function readRegionalCheckpoint(file: string): RegionalLoadCheckpoint | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as RegionalLoadCheckpoint;
}

export function writeRegionalCheckpoint(file: string, checkpoint: RegionalLoadCheckpoint): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function validateCheckpoint(checkpoint: RegionalLoadCheckpoint, region: CanonicalTerritoryRegion): void {
  if (checkpoint.region !== region.code || checkpoint.regionVersion !== region.version) {
    throw new Error('Checkpoint pertence a outra região ou versão territorial.');
  }
  const canonical = region.territories.map((item) => item.ibgeCode);
  const checkpointCodes = checkpoint.municipalities.map((item) => item.ibgeCode);
  if (checkpointCodes.length !== 34 || checkpointCodes.some((code, index) => code !== canonical[index])) {
    throw new Error('Checkpoint não corresponde exatamente ao registro canônico da RMBH.');
  }
}

export async function runRegionalLoad(
  region: CanonicalTerritoryRegion,
  options: RunRegionalLoadOptions
): Promise<RegionalLoadCheckpoint> {
  validateCanonicalRegionForLoad(region);
  const clock = options.now ?? (() => new Date().toISOString());
  const checkpoint = readRegionalCheckpoint(options.checkpointPath) ?? createRegionalCheckpoint(region, clock());
  validateCheckpoint(checkpoint, region);
  checkpoint.status = 'RUNNING';
  checkpoint.finishedAt = null;
  writeRegionalCheckpoint(options.checkpointPath, checkpoint);
  let attempted = 0;

  for (const municipality of checkpoint.municipalities) {
    if (municipality.status === 'COMPLETED') continue;
    if (options.stopAfter !== undefined && attempted >= options.stopAfter) {
      checkpoint.status = 'INTERRUPTED';
      checkpoint.updatedAt = clock();
      writeRegionalCheckpoint(options.checkpointPath, checkpoint);
      return checkpoint;
    }
    attempted++;
    try {
      const outcome = await options.collect(municipality.ibgeCode, checkpoint.runId);
      municipality.status = outcome.status === 'completed' ? 'COMPLETED' : 'PARTIAL';
      municipality.years = outcome.years;
      municipality.indicatorsProcessed = outcome.indicatorsProcessed;
      municipality.evidenceProcessed = outcome.evidenceProcessed;
      municipality.errors = outcome.errors;
      municipality.durationMs = outcome.durationMs;
      municipality.completedAt = clock();
      if (municipality.status === 'COMPLETED') checkpoint.lastCompletedIbge = municipality.ibgeCode;
    } catch (error) {
      municipality.status = 'FAILED';
      municipality.errors = [error instanceof Error ? error.message : String(error)];
      municipality.completedAt = clock();
    }
    checkpoint.updatedAt = clock();
    writeRegionalCheckpoint(options.checkpointPath, checkpoint);
  }

  checkpoint.status = checkpoint.municipalities.every((item) => item.status === 'COMPLETED') ? 'COMPLETED' : 'INTERRUPTED';
  checkpoint.updatedAt = clock();
  checkpoint.finishedAt = clock();
  writeRegionalCheckpoint(options.checkpointPath, checkpoint);
  return checkpoint;
}

