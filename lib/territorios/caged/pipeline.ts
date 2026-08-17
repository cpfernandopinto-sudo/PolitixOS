import fs from 'node:fs/promises';
import path from 'node:path';
import { CagedArtifactStorage, SupabaseCagedArtifactStorage, type CagedArtifactStorageAdapter } from './artifact-storage';
import { CagedError } from './core';
import { loadOfficialMunicipalityResolver } from './municipality-resolver';
import { mergeCagedAggregates, parseCagedFile } from './parser';
import { mergeCagedSectorAggregates } from './sectors';
import { acquireCagedVintage, extractCagedText } from './source';
import type { CagedFailureStage, CagedMunicipalAggregate, CagedParseSummary, CagedSectorAggregate, CagedSourceFailure, CagedSourceKind, CagedSourceVintage } from './types';

export interface CagedPipelineResult { declarationMonth: string; status: 'completed' | 'partial'; vintages: CagedSourceVintage[]; summaries: CagedParseSummary[]; failures: CagedSourceFailure[]; currentAggregates: CagedMunicipalAggregate[]; revisionDeltas: CagedMunicipalAggregate[]; currentSectorAggregates: CagedSectorAggregate[]; sectorRevisionDeltas: CagedSectorAggregate[]; timings: Record<string, number>; cacheHits: number; }

export function resolveCagedRunStatus(requestedKinds: CagedSourceKind[], processedKinds: CagedSourceKind[]): 'completed' | 'partial' {
  return requestedKinds.length === 3 && requestedKinds.every((kind) => processedKinds.includes(kind)) ? 'completed' : 'partial';
}

function failureStage(error: unknown): CagedFailureStage { const code = error instanceof CagedError ? error.code : ''; if (/LAYOUT/.test(code)) return 'LAYOUT'; if (/EXTRACT|ARCHIVE/.test(code)) return 'EXTRACTION'; if (/RECONCILIATION/.test(code)) return 'RECONCILIATION'; if (/STORAGE/.test(code)) return 'STORAGE'; if (/DOWNLOAD|SOURCE/.test(code)) return 'DOWNLOAD'; return 'PARSE'; }
export function createCagedStorage(options: { dataRoot: string; storageAdapter?: CagedArtifactStorageAdapter; supabaseClient?: ConstructorParameters<typeof SupabaseCagedArtifactStorage>[0] }) { if (options.storageAdapter) return options.storageAdapter; const mode = process.env.CAGED_STORAGE_MODE ?? 'local'; if (mode === 'local') return new CagedArtifactStorage(options.dataRoot); if (mode === 'supabase' && options.supabaseClient) return new SupabaseCagedArtifactStorage(options.supabaseClient, options.dataRoot); throw new CagedError('CAGED_STORAGE_FAILED', `Configuração de storage inválida: mode=${mode}`); }

export async function runCagedPipeline(options: { declarationMonth: string; dataRoot: string; kinds?: CagedSourceKind[]; forceSourceCheck?: boolean; storageAdapter?: CagedArtifactStorageAdapter; supabaseClient?: ConstructorParameters<typeof SupabaseCagedArtifactStorage>[0] }): Promise<CagedPipelineResult> {
  const started = performance.now();
  const kinds = options.kinds ?? ['MOV', 'FOR', 'EXC'];
  const storage = createCagedStorage(options);
  const resolver = await loadOfficialMunicipalityResolver(options.dataRoot);
  const vintages: CagedSourceVintage[] = [], summaries: CagedParseSummary[] = [];
  let downloadMs = 0, extractMs = 0, cacheHits = 0;
  const failures: CagedSourceFailure[] = [];
  for (const kind of kinds) {
    let extractedDirectory: string | null = null;
    try {
      const acquired = await acquireCagedVintage(storage, kind, options.declarationMonth, options.forceSourceCheck);
      vintages.push(acquired.vintage); downloadMs += acquired.downloadMs; if (acquired.cacheHit) cacheHits++;
      const extracted = await extractCagedText(acquired.vintage, storage); extractedDirectory = extracted.directory; extractMs += extracted.extractMs;
      const summary = await parseCagedFile(extracted.textPath, kind, resolver); summaries.push(summary);
      acquired.vintage.status = 'processed'; acquired.vintage.layoutVersion = summary.layoutHash; acquired.vintage.processedAt = new Date().toISOString(); await storage.writeManifest(acquired.vintage);
    } catch (error) { failures.push({ kind, code: error instanceof CagedError ? error.code : 'CAGED_UNKNOWN', message: error instanceof Error ? error.message : String(error), stage: failureStage(error) }); }
    finally { if (extractedDirectory) await fs.rm(extractedDirectory, { recursive: true, force: true }); }
  }
  if (summaries.length === 0) throw new CagedError(failures[0]?.code ?? 'CAGED_SOURCE_NOT_FOUND', failures[0]?.message ?? 'Nenhuma fonte CAGED processada.');
  const mov = summaries.filter((item) => item.kind === 'MOV');
  const revisions = summaries.filter((item) => item.kind !== 'MOV');
  const currentAggregates = mergeCagedAggregates(mov).filter((item) => item.referenceMonth === options.declarationMonth);
  const revisionDeltas = mergeCagedAggregates(revisions);
  const currentSectorAggregates = mergeCagedSectorAggregates(mov.map((item) => item.sectors)).filter((item) => item.referenceMonth === options.declarationMonth);
  const sectorRevisionDeltas = mergeCagedSectorAggregates(revisions.map((item) => item.sectors));
  const curatedDirectory = path.join(options.dataRoot, 'caged', 'curated', options.declarationMonth);
  await fs.mkdir(curatedDirectory, { recursive: true });
  await fs.writeFile(path.join(curatedDirectory, 'municipal-current.ndjson'), currentAggregates.map((row) => JSON.stringify(row)).join('\n') + '\n');
  await fs.writeFile(path.join(curatedDirectory, 'revision-deltas.ndjson'), revisionDeltas.map((row) => JSON.stringify(row)).join('\n') + '\n');
  await fs.writeFile(path.join(curatedDirectory, 'municipal-sector-current.ndjson'), currentSectorAggregates.map((row) => JSON.stringify(row)).join('\n') + '\n');
  await fs.writeFile(path.join(curatedDirectory, 'sector-revision-deltas.ndjson'), sectorRevisionDeltas.map((row) => JSON.stringify(row)).join('\n') + '\n');
  return { declarationMonth: options.declarationMonth, status: resolveCagedRunStatus(kinds, summaries.map((item) => item.kind)), vintages, summaries, failures, currentAggregates, revisionDeltas, currentSectorAggregates, sectorRevisionDeltas, cacheHits, timings: { downloadMs, extractMs, parseMs: summaries.reduce((sum, item) => sum + item.elapsedMs, 0), totalMs: performance.now() - started } };
}
