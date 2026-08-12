import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { buildElectionTerritoryAnalysis, buildElectoralSampleBenchmarks, type ElectoralAnalyticsEvidence, type ElectoralAnalyticsIndicator, type ElectoralAnalyticsTerritory } from '../lib/territorios/electoral-analytics';
import { buildElectoralTerritoryIntelligence } from '../lib/territorios/electoral-intelligence';
import { buildElectoralInterpretationContext, canonicalizeElectoralInterpretationContext } from '../lib/territorios/electoral-interpretation-context';
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

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');

export async function auditElectoralInterpretationContext() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const started = performance.now();
  const memorySamples = [process.memoryUsage().rss];
  const { data: rows, error } = await client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', HISTORY_SAMPLE.map((item) => item.codigoIbge));
  if (error) throw error;
  if ((rows ?? []).length !== HISTORY_SAMPLE.length) throw new Error('Amostra territorial incompleta.');
  const territories: ElectoralAnalyticsTerritory[] = (rows ?? []).map((row) => ({ id: String(row.id), codigoIbge: String(row.codigo_ibge), municipio: String(row.municipio), uf: String(row.uf) })).sort((a, b) => a.codigoIbge.localeCompare(b.codigoIbge));
  const ids = territories.map((item) => item.id);
  const readInventory = async () => ({
    indicators: await paginated<ElectoralAnalyticsIndicator>((start, end) => client.from('territory_indicators').select('territory_id,indicador,valor,unidade,source_dataset,source_record_id,periodo_inicio,periodo_fim,metadata').in('territory_id', ids).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end)),
    evidence: await paginated<ElectoralAnalyticsEvidence>((start, end) => client.from('territory_evidence').select('territory_id,source_hash,source_external_id').in('territory_id', ids).eq('tema', 'eleicoes').eq('source_name', 'TSE').range(start, end)),
  });
  const before = await readInventory();
  const analyses = territories.map((territory) => buildElectionTerritoryAnalysis(territory, before.indicators.filter((item) => item.territory_id === territory.id), before.evidence.filter((item) => item.territory_id === territory.id)));
  const benchmarks = buildElectoralSampleBenchmarks(analyses);
  const intelligence = analyses.map((analysis) => buildElectoralTerritoryIntelligence(analysis, benchmarks));
  const execute = () => {
    const timings: Array<{ municipio: string; ms: number; jsonBytes: number; facts: number; signals: number; keyChanges: number }> = [];
    const contexts = intelligence.map((item) => {
      const start = performance.now();
      const context = buildElectoralInterpretationContext(item);
      timings.push({ municipio: item.territory.municipio, ms: performance.now() - start, jsonBytes: bytes(context), facts: context.elections.length, signals: context.signals.length, keyChanges: context.keyChanges.length });
      memorySamples.push(process.memoryUsage().rss);
      return context;
    });
    return { contexts, timings };
  };
  const first = execute();
  const firstCanonical = JSON.stringify(first.contexts.map(canonicalizeElectoralInterpretationContext));
  const second = execute();
  const secondCanonical = JSON.stringify(second.contexts.map(canonicalizeElectoralInterpretationContext));
  const after = await readInventory();
  memorySamples.push(process.memoryUsage().rss);
  const sourceBytes = bytes(before.indicators) + bytes(before.evidence);
  const contextBytes = bytes(first.contexts);
  const files = ['lib/territorios/electoral-interpretation-context.ts', 'lib/territorios/electoral-interpretation-context.test.ts', 'scripts/audit-electoral-interpretation-context.ts'];
  const sourceText = files.map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')).join('\n').toLocaleLowerCase('pt-BR');
  const calls = { openai: (sourceText.match(/openai\s*\(/g) ?? []).length, anthropic: (sourceText.match(/anthropic\s*\(/g) ?? []).length, perplexity: (sourceText.match(/perplexity\s*\(/g) ?? []).length };
  return {
    inventory: { indicatorsBefore: before.indicators.length, indicatorsAfter: after.indicators.length, evidenceBefore: before.evidence.length, evidenceAfter: after.evidence.length, mutations: Math.abs(before.indicators.length - after.indicators.length) + Math.abs(before.evidence.length - after.evidence.length) },
    sourceSignals: intelligence.reduce((sum, item) => sum + item.signals.length, 0),
    selectedFacts: first.contexts.reduce((sum, item) => sum + item.elections.length, 0),
    selectedKeyChanges: first.contexts.reduce((sum, item) => sum + item.keyChanges.length, 0),
    selectedSignals: first.contexts.reduce((sum, item) => sum + item.signals.length, 0),
    size: { sourceBytes, contextBytes, reductionPercent: sourceBytes === 0 ? 0 : (1 - contextBytes / sourceBytes) * 100 },
    execution1: { hash: hash(firstCanonical), timings: first.timings },
    execution2: { hash: hash(secondCanonical), timings: second.timings },
    deterministic: firstCanonical === secondCanonical,
    contexts: first.contexts,
    calls: { ...calls, llm: calls.openai + calls.anthropic + calls.perplexity },
    performance: { totalMs: performance.now() - started, memoryInitial: memorySamples[0], memoryAverage: memorySamples.reduce((sum, item) => sum + item, 0) / memorySamples.length, memoryPeak: Math.max(...memorySamples), memoryFinal: memorySamples.at(-1) },
  };
}

if (process.argv[1]?.endsWith('audit-electoral-interpretation-context.ts')) {
  auditElectoralInterpretationContext().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
}
