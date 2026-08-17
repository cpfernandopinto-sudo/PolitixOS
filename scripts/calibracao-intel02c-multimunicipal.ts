/**
 * INTEL-02C — Calibração multi-municipal (seção 2/3/6 do gate).
 *
 * Contagem: lida do banco real (ECO-01 + ECO-02B já persistidos).
 * Betim/Belo Horizonte: fetch -> normalize -> Evidence em memória, via
 * client/normalizer ECO-02B homologados (`economia-pib-client.ts`,
 * `economia-pib-normalizer.ts`), SEM persistir e SEM alterar esses arquivos.
 *
 * SOMENTE LEITURA. Não persiste Betim/BH. Não chama LLM. Não gera L4-L6.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { fetchOfficialPibPerCapita, fetchPibMunicipalSidra } from '../lib/territorios/economia-pib-client';
import { normalizePibMunicipal } from '../lib/territorios/economia-pib-normalizer';
import { runEconomicIntelligenceEngine } from '../lib/territorios/intelligence/economy/engine';
import type { Evidence } from '../lib/territorios/intelligence/contracts';

function loadLocalEnv(): void {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const MUNICIPALITIES: Array<{ codigoIbge: string; nome: string }> = [
  { codigoIbge: '3118601', nome: 'Contagem' },
  { codigoIbge: '3106705', nome: 'Betim' },
  { codigoIbge: '3106200', nome: 'Belo Horizonte' },
];

async function fetchPibEvidenceLive(territoryId: string, codigoIbge: string): Promise<Evidence[]> {
  const sidra = await fetchPibMunicipalSidra(codigoIbge);
  const perCapita = await fetchOfficialPibPerCapita(codigoIbge).catch(() => []);
  const normalized = normalizePibMunicipal(codigoIbge, sidra.payload, perCapita, sidra.sourceUrl);
  return normalized.indicators.map((item, index) => ({
    id: `live:${territoryId}:${item.indicator}:${item.sourceDataset}:${item.periodStart.slice(0, 4)}:${index}`,
    territoryId, domain: 'economia' as const, indicator: item.indicator, value: item.value,
    unit: item.unit === 'BRL/habitante' ? 'BRL' : item.unit, period: item.periodStart.slice(0, 4),
    source: 'IBGE', dataset: item.sourceDataset, evidenceHash: null, metadata: { ...item.metadata, live_fetch: true },
  }));
}

async function fetchSiconfiEvidenceFromDb(client: ReturnType<typeof createAdminClient>, territoryId: string): Promise<Evidence[]> {
  const { data: rows } = await client.from('territory_indicators')
    .select('indicador, valor, periodo_inicio, source_dataset')
    .eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'SICONFI');
  return (rows ?? []).map((row, index) => ({
    id: `db:${territoryId}:${row.indicador}:${row.source_dataset}:${String(row.periodo_inicio).slice(0, 4)}:${index}`,
    territoryId, domain: 'economia' as const, indicator: row.indicador, value: Number(row.valor), unit: 'BRL',
    period: String(row.periodo_inicio).slice(0, 4), source: 'Tesouro/SICONFI', dataset: row.source_dataset ?? 'SICONFI_DCA',
    evidenceHash: null, metadata: {},
  }));
}

async function fetchPibEvidenceFromDb(client: ReturnType<typeof createAdminClient>, territoryId: string): Promise<Evidence[]> {
  const { data: rows } = await client.from('territory_indicators')
    .select('indicador, valor, periodo_inicio, source_dataset')
    .eq('territory_id', territoryId).eq('categoria', 'economia').eq('fonte', 'IBGE');
  return (rows ?? []).map((row, index) => ({
    id: `db:${territoryId}:${row.indicador}:${row.source_dataset}:${String(row.periodo_inicio).slice(0, 4)}:${index}`,
    territoryId, domain: 'economia' as const, indicator: row.indicador, value: Number(row.valor),
    unit: row.indicador.startsWith('participacao_') ? '%' : 'BRL', period: String(row.periodo_inicio).slice(0, 4),
    source: 'IBGE', dataset: row.source_dataset ?? 'IBGE_SIDRA_5938', evidenceHash: null, metadata: {},
  }));
}

interface MunicipalityRun {
  nome: string;
  codigoIbge: string;
  evidenceCount: number;
  derivedIndicatorCount: number;
  signalCount: number;
  signalsByType: Record<string, number>;
  signalsByFamily: Record<string, number>;
  signalsByIndicator: Record<string, number>;
  signalsByPeriod: Record<string, number>;
  evidence: Evidence[];
  result: ReturnType<typeof runEconomicIntelligenceEngine>;
}

function familyOfIndicator(indicator: string): string {
  if (indicator.startsWith('participacao_')) return 'OFFICIAL_SHARE';
  if (indicator.startsWith('pib_') || indicator.startsWith('vab_') || indicator.startsWith('impostos_')) return 'PIB_VAB_MONETARY';
  return 'FISCAL';
}

function analyze(nome: string, codigoIbge: string, territoryId: string, evidence: Evidence[]): MunicipalityRun {
  const start = performance.now();
  const result = runEconomicIntelligenceEngine(territoryId, evidence);
  const elapsed = performance.now() - start;
  const signalsByType: Record<string, number> = {};
  const signalsByFamily: Record<string, number> = {};
  const signalsByIndicator: Record<string, number> = {};
  const signalsByPeriod: Record<string, number> = {};
  for (const signal of result.signals) {
    signalsByType[signal.type] = (signalsByType[signal.type] ?? 0) + 1;
    const indicatorGuess = signal.title.match(/de ([a-z_]+)/)?.[1] ?? signal.derivedIndicatorRefs[0]?.split(':')[2] ?? 'desconhecido';
    signalsByIndicator[indicatorGuess] = (signalsByIndicator[indicatorGuess] ?? 0) + 1;
    signalsByFamily[familyOfIndicator(indicatorGuess)] = (signalsByFamily[familyOfIndicator(indicatorGuess)] ?? 0) + 1;
    signalsByPeriod[signal.period] = (signalsByPeriod[signal.period] ?? 0) + 1;
  }
  console.log(`\n=== ${nome} (${codigoIbge}) — ${elapsed.toFixed(2)}ms ===`);
  console.log(`Evidence: ${evidence.length} | DerivedIndicators: ${result.derivedIndicators.length} | Signals: ${result.signals.length}`);
  console.log('Signals por tipo:', JSON.stringify(signalsByType));
  console.log('Signals por family (aprox.):', JSON.stringify(signalsByFamily));
  return { nome, codigoIbge, evidenceCount: evidence.length, derivedIndicatorCount: result.derivedIndicators.length, signalCount: result.signals.length, signalsByType, signalsByFamily, signalsByIndicator, signalsByPeriod, evidence, result };
}

function yoyDistribution(evidence: Evidence[], indicator: string): number[] {
  const series = evidence.filter((e) => e.indicator === indicator && typeof e.value === 'number').map((e) => ({ year: Number(e.period), value: e.value as number })).sort((a, b) => a.year - b.year);
  const variations: number[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i].year !== series[i - 1].year + 1) continue;
    if (series[i - 1].value === 0) continue;
    variations.push(((series[i].value - series[i - 1].value) / Math.abs(series[i - 1].value)) * 100);
  }
  return variations;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function describeDistribution(label: string, values: number[]): void {
  if (values.length === 0) { console.log(`  ${label}: N=0 (sem observações)`); return; }
  const sorted = [...values].sort((a, b) => a - b);
  const p25 = percentile(sorted, 0.25);
  const p75 = percentile(sorted, 0.75);
  console.log(`  ${label}: N=${sorted.length} min=${sorted[0].toFixed(2)} P25=${p25.toFixed(2)} mediana=${percentile(sorted, 0.5).toFixed(2)} P75=${p75.toFixed(2)} P90=${percentile(sorted, 0.9).toFixed(2)} P95=${percentile(sorted, 0.95).toFixed(2)} max=${sorted.at(-1)!.toFixed(2)} IQR=${(p75 - p25).toFixed(2)}`);
}

async function main() {
  loadLocalEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;

  const runs: MunicipalityRun[] = [];
  for (const { codigoIbge, nome } of MUNICIPALITIES) {
    const { data: territory } = await client.from('territories').select('id').eq('codigo_ibge', codigoIbge).single();
    const territoryId = territory!.id;
    let pibEvidence: Evidence[];
    let siconfiEvidence: Evidence[] = [];
    if (codigoIbge === '3118601') {
      pibEvidence = await fetchPibEvidenceFromDb(client, territoryId);
      siconfiEvidence = await fetchSiconfiEvidenceFromDb(client, territoryId);
    } else {
      console.log(`\nBuscando ${nome} ao vivo (SIDRA + base oficial), read-only, sem persistir...`);
      pibEvidence = await fetchPibEvidenceLive(territoryId, codigoIbge);
    }
    const run = analyze(nome, codigoIbge, territoryId, [...siconfiEvidence, ...pibEvidence]);
    runs.push(run);
  }

  console.log('\n\n########## DISTRIBUIÇÃO REAL DE VARIAÇÃO INTERANUAL (CHANGE PIB/VAB) — seção 8/19 do gate ##########');
  const pibVabIndicators = [
    'pib_municipal_precos_correntes', 'pib_per_capita_precos_correntes', 'vab_total_precos_correntes',
    'vab_agropecuaria_precos_correntes', 'vab_industria_precos_correntes', 'vab_servicos_exceto_setor_publico_ampliado_precos_correntes',
    'vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes', 'impostos_liquidos_subsidios_produtos_precos_correntes',
  ];
  for (const indicator of pibVabIndicators) {
    const allValues = runs.flatMap((run) => yoyDistribution(run.evidence, indicator));
    describeDistribution(indicator, allValues);
  }

  console.log('\n\n########## DISTRIBUIÇÃO DE MUDANÇA EM P.P. — OFFICIAL SHARE — seção 14/28 do gate ##########');
  function ppDistribution(evidence: Evidence[], indicator: string): number[] {
    const series = evidence.filter((e) => e.indicator === indicator && typeof e.value === 'number').map((e) => ({ year: Number(e.period), value: e.value as number })).sort((a, b) => a.year - b.year);
    const changes: number[] = [];
    for (let i = 1; i < series.length; i++) {
      if (series[i].year !== series[i - 1].year + 1) continue;
      changes.push(series[i].value - series[i - 1].value);
    }
    return changes;
  }
  const shareIndicators = ['participacao_vab_agropecuaria', 'participacao_vab_industria', 'participacao_vab_servicos_exceto_setor_publico_ampliado', 'participacao_vab_administracao_defesa_educacao_saude_publicas_seguridade'];
  let allShareChanges: number[] = [];
  for (const indicator of shareIndicators) {
    const values = runs.flatMap((run) => ppDistribution(run.evidence, indicator));
    describeDistribution(indicator, values);
    allShareChanges = allShareChanges.concat(values);
  }
  describeDistribution('TODOS OS SETORES COMBINADOS', allShareChanges);

  console.log('\n\n########## CONCENTRATION 50% — quantos setores/anos disparam por município — seção 16 do gate ##########');
  for (const run of runs) {
    for (const indicator of shareIndicators) {
      const series = run.evidence.filter((e) => e.indicator === indicator && typeof e.value === 'number').map((e) => ({ year: Number(e.period), value: e.value as number })).sort((a, b) => a.year - b.year);
      const above50 = series.filter((s) => s.value >= 50);
      if (above50.length > 0) console.log(`  ${run.nome} / ${indicator}: ${above50.length}/${series.length} anos com participação >=50% (${above50[0].year}-${above50.at(-1)!.year})`);
    }
  }

  console.log('\n\n########## HHI — avaliação conceitual (seção 18 do gate, NÃO implementado) ##########');
  for (const run of runs) {
    const latestYear = Math.max(...run.evidence.filter((e) => shareIndicators.includes(e.indicator)).map((e) => Number(e.period)));
    const shares = shareIndicators.map((ind) => run.evidence.find((e) => e.indicator === ind && Number(e.period) === latestYear)?.value as number | undefined).filter((v): v is number => typeof v === 'number');
    const hhi = shares.reduce((sum, s) => sum + (s / 100) ** 2, 0);
    console.log(`  ${run.nome} (${latestYear}): shares=${shares.map((s) => s.toFixed(1)).join(',')} HHI=${hhi.toFixed(4)}`);
  }

  console.log('\n\nEncerrado. Nenhum dado de Betim/BH foi persistido. Nenhuma Interpretation/Implication/Recommendation foi gerada.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
