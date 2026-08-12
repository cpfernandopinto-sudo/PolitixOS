import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  buildElectionTerritoryAnalysis,
  buildElectoralSampleBenchmarks,
  type ElectoralAnalyticsEvidence,
  type ElectoralAnalyticsIndicator,
  type ElectoralAnalyticsTerritory,
} from '../lib/territorios/electoral-analytics';
import { HISTORY_SAMPLE } from './load-rmbh-tse-history-sample';

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function paginated<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function memory() {
  return process.memoryUsage().rss;
}

export async function auditRmbhElectoralAnalytics(options: { verbose?: boolean } = {}) {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const started = performance.now();
  const memorySamples = [memory()];
  const { data: territoryRows, error } = await client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', HISTORY_SAMPLE.map((item) => item.codigoIbge));
  if (error) throw error;
  if ((territoryRows ?? []).length !== HISTORY_SAMPLE.length) throw new Error('Amostra territorial incompleta.');
  const territories: ElectoralAnalyticsTerritory[] = (territoryRows ?? []).map((row) => ({ id: String(row.id), codigoIbge: String(row.codigo_ibge), municipio: String(row.municipio), uf: String(row.uf) })).sort((a, b) => a.codigoIbge.localeCompare(b.codigoIbge));
  const ids = territories.map((item) => item.id);
  const readInventory = async () => {
    const indicators = await paginated<ElectoralAnalyticsIndicator>((start, end) => client.from('territory_indicators').select('territory_id,indicador,valor,unidade,source_dataset,source_record_id,periodo_inicio,periodo_fim,metadata').in('territory_id', ids).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end));
    const evidence = await paginated<ElectoralAnalyticsEvidence>((start, end) => client.from('territory_evidence').select('territory_id,source_hash,source_external_id').in('territory_id', ids).eq('tema', 'eleicoes').eq('source_name', 'TSE').range(start, end));
    return { indicators, evidence };
  };
  const before = await readInventory();
  memorySamples.push(memory());
  const execute = () => {
    const timings: Array<{ municipio: string; ms: number; indicators: number }> = [];
    const analyses = territories.map((territory) => {
      const territoryRows = before.indicators.filter((row) => row.territory_id === territory.id);
      const territoryEvidence = before.evidence.filter((row) => row.territory_id === territory.id);
      const start = performance.now();
      const analysis = buildElectionTerritoryAnalysis(territory, territoryRows, territoryEvidence);
      timings.push({ municipio: territory.municipio, ms: performance.now() - start, indicators: territoryRows.length });
      memorySamples.push(memory());
      return analysis;
    });
    const benchmarks = buildElectoralSampleBenchmarks(analyses);
    return { analyses, benchmarks, timings };
  };
  const first = execute();
  const firstHash = hash({ analyses: first.analyses, benchmarks: first.benchmarks });
  const second = execute();
  const secondHash = hash({ analyses: second.analyses, benchmarks: second.benchmarks });
  const after = await readInventory();
  memorySamples.push(memory());
  const matrix = first.analyses.flatMap((analysis) => analysis.elections.map((item) => ({ municipio: analysis.territory.municipio, codigoIbge: analysis.territory.codigoIbge, ...item })));
  const result = {
    inventory: {
      indicatorsBefore: before.indicators.length,
      indicatorsAfter: after.indicators.length,
      evidenceBefore: before.evidence.length,
      evidenceAfter: after.evidence.length,
      mutations: Math.abs(after.indicators.length - before.indicators.length) + Math.abs(after.evidence.length - before.evidence.length),
    },
    execution1: { hash: firstHash, territories: first.analyses.length, elections: matrix.length },
    execution2: { hash: secondHash, territories: second.analyses.length, elections: second.analyses.reduce((sum, item) => sum + item.elections.length, 0) },
    idempotent: firstHash === secondHash,
    matrix,
    benchmarks: first.benchmarks,
    performance: {
      totalMs: performance.now() - started,
      firstByTerritory: first.timings,
      secondByTerritory: second.timings,
      indicatorsRead: before.indicators.length,
      memoryInitial: memorySamples[0],
      memoryAverage: memorySamples.reduce((sum, value) => sum + value, 0) / memorySamples.length,
      memoryPeak: Math.max(...memorySamples),
      memoryFinal: memorySamples.at(-1),
    },
  };
  if (options.verbose !== false) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.endsWith('audit-rmbh-electoral-analytics.ts')) {
  auditRmbhElectoralAnalytics().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
