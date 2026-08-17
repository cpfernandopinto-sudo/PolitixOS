/**
 * INTEL-03B — POC real com LLM: Contagem + Betim + Belo Horizonte (Parte E do gate).
 *
 * Mesma seleção EXATA do INTEL-03A (`scripts/poc-intel03a-interpretation-3-municipios.ts`)
 * — mesmos municípios, mesmas fontes, mesmo `EconomicIntelligenceResult` — trocando
 * apenas o provider: `AnthropicInterpretationProvider` em vez de `RuleBasedMockProvider`.
 * Isso permite comparação direta mock vs LLM (Parte F do gate). Não persiste nada.
 *
 * Gated: só executa a chamada real se `RUN_REAL_INTEL_LLM=1` E `ANTHROPIC_API_KEY`
 * estiverem presentes (seção 12, 96-97 do gate). Sem isso, imprime BLOCKED_BY_CREDENTIAL
 * e encerra sem qualquer chamada de rede ao provider — nunca inventa resultado.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { fetchOfficialPibPerCapita, fetchPibMunicipalSidra } from '../lib/territorios/economia-pib-client';
import { normalizePibMunicipal } from '../lib/territorios/economia-pib-normalizer';
import { runEconomicIntelligenceEngine } from '../lib/territorios/intelligence/economy/engine';
import { runInterpretationPipeline } from '../lib/territorios/intelligence/interpretation/pipeline';
import { AnthropicInterpretationProvider } from '../lib/territorios/intelligence/interpretation/anthropic-provider';
import { assertInterpretationLineageResolves } from '../lib/territorios/intelligence/interpretation/lineage';
import type { Evidence } from '../lib/territorios/intelligence/contracts';
import type { InterpretationExecutionMetadata, ValidatedInterpretation } from '../lib/territorios/intelligence/interpretation/types';

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

function printInterpretation(interpretation: ValidatedInterpretation): void {
  console.log(`\n  [${interpretation.id}]`);
  console.log(`  statement: ${interpretation.statement}`);
  console.log(`  confidence: ${interpretation.confidence} | claims: ${interpretation.claims.length} | basedOnSignals: ${interpretation.basedOnSignals.length} | evidenceRefs: ${interpretation.evidenceRefs.length}`);
  console.log(`  caveats: ${interpretation.caveats.join(' | ')}`);
  console.log(`  temporalScope: ${interpretation.temporalScope.label}`);
  console.log(`  modelProvenance: ${JSON.stringify(interpretation.modelProvenance)}`);
  for (const claim of interpretation.claims) console.log(`    claim [${claim.claimType}]: ${claim.text}`);
}

function printExecutionMetadata(metadata: InterpretationExecutionMetadata[]): { totalCostUsd: number; totalInputTokens: number; totalOutputTokens: number } {
  let totalCostUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const meta of metadata) {
    console.log(`  [execução] modelo=${meta.model} attempts=${meta.attempts} latencyMs=${meta.latencyMs.toFixed(0)} tokens=${JSON.stringify(meta.tokenUsage)} custoEstimadoUsd=${meta.estimatedCostUsd?.toFixed(6) ?? 'null'} contextHash=${meta.contextHash.slice(0, 12)}...`);
    if (meta.tokenUsage) { totalInputTokens += meta.tokenUsage.inputTokens; totalOutputTokens += meta.tokenUsage.outputTokens; }
    if (meta.estimatedCostUsd) totalCostUsd += meta.estimatedCostUsd;
  }
  return { totalCostUsd, totalInputTokens, totalOutputTokens };
}

/** Consistência estrutural entre duas execuções sobre o MESMO contexto (Parte H do gate) — nunca exige texto idêntico, só fatos/refs/direção semântica estáveis. */
function consistencyScore(a: ValidatedInterpretation[], b: ValidatedInterpretation[]): { sameRefSets: boolean; sameClaimTypeSets: boolean; sameEvidenceSets: boolean; sameCount: boolean } {
  const refSet = (list: ValidatedInterpretation[]) => new Set(list.flatMap((i) => i.basedOnSignals));
  const evSet = (list: ValidatedInterpretation[]) => new Set(list.flatMap((i) => i.evidenceRefs));
  const claimTypeSet = (list: ValidatedInterpretation[]) => new Set(list.flatMap((i) => i.claims.map((c) => c.claimType)));
  const setsEqual = <T,>(x: Set<T>, y: Set<T>) => x.size === y.size && [...x].every((item) => y.has(item));
  return {
    sameCount: a.length === b.length,
    sameRefSets: setsEqual(refSet(a), refSet(b)),
    sameEvidenceSets: setsEqual(evSet(a), evSet(b)),
    sameClaimTypeSets: setsEqual(claimTypeSet(a), claimTypeSet(b)),
  };
}

async function main() {
  loadLocalEnv();

  const runRealFlag = process.env.RUN_REAL_INTEL_LLM === '1';
  const hasCredential = Boolean(process.env.ANTHROPIC_API_KEY);

  if (!runRealFlag || !hasCredential) {
    console.log('=== INTEL-03B POC real (LLM) — BLOCKED_BY_CREDENTIAL ===');
    console.log(`RUN_REAL_INTEL_LLM=${process.env.RUN_REAL_INTEL_LLM ?? '(ausente)'} (esperado "1")`);
    console.log(`ANTHROPIC_API_KEY presente: ${hasCredential}`);
    console.log('Nenhuma chamada de rede foi feita. Nenhum resultado foi inventado. Para executar de verdade:');
    console.log('  RUN_REAL_INTEL_LLM=1 ANTHROPIC_API_KEY=sk-... npx tsx scripts/poc-intel03b-interpretation-llm-3-municipios.ts');
    return;
  }

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const provider = new AnthropicInterpretationProvider();
  const sequentialStart = performance.now();
  let grandTotalCostUsd = 0;
  let grandTotalInputTokens = 0;
  let grandTotalOutputTokens = 0;

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
    const evidence = [...siconfiEvidence, ...pibEvidence];
    const engineResult = runEconomicIntelligenceEngine(territoryId, evidence);

    console.log(`\n=== ${nome} (${codigoIbge}) ===`);

    let pipeline;
    try {
      pipeline = await runInterpretationPipeline(engineResult, provider);
    } catch (error) {
      console.log(`ERRO DE PROVIDER (nunca inventado, classificado): ${error instanceof Error ? error.message : String(error)}`);
      const code = (error as { code?: string }).code;
      if (code) console.log(`  code: ${code}`);
      continue;
    }

    if (pipeline.status === 'NO_INTERPRETATION') {
      console.log('NO_INTERPRETATION:', pipeline.reason);
      continue;
    }

    const context = pipeline.context;
    const byFamily: Record<string, number> = {};
    for (const unit of context.units) byFamily[unit.family] = (byFamily[unit.family] ?? 0) + 1;
    console.log(`Unidades selecionadas: ${context.units.length} | por família: ${JSON.stringify(byFamily)}`);
    console.log(`Interpretations aceitas: ${pipeline.accepted.length} | rejeitadas: ${pipeline.rejected.length}`);
    if (pipeline.rejected.length > 0) {
      console.log('REJEITADAS:');
      for (const rejected of pipeline.rejected) console.log('  ', rejected.draft.id, JSON.stringify(rejected.errors));
    }

    for (const interpretation of pipeline.accepted) printInterpretation(interpretation);

    const { totalCostUsd, totalInputTokens, totalOutputTokens } = printExecutionMetadata(pipeline.executionMetadata);
    grandTotalCostUsd += totalCostUsd;
    grandTotalInputTokens += totalInputTokens;
    grandTotalOutputTokens += totalOutputTokens;

    const resolvableSignalIds = new Set(context.units.flatMap((unit) => [unit.id, ...unit.constituentRawSignalRefs]));
    let brokenLineage = 0;
    for (const interpretation of pipeline.accepted) {
      try {
        assertInterpretationLineageResolves(interpretation, resolvableSignalIds, context.evidenceIndex);
      } catch (error) {
        brokenLineage++;
        console.log('  LINEAGE QUEBRADO:', error instanceof Error ? error.message : String(error));
      }
    }
    console.log(`Lineage quebrado (deveria ser 0): ${brokenLineage}`);

    // Parte H — teste de consistência: reexecuta o mesmo contexto (mesma engineResult) e compara estrutura.
    console.log(`\n-- Teste de consistência (2ª execução sobre o mesmo contexto) --`);
    const secondRun = await runInterpretationPipeline(engineResult, provider);
    if (secondRun.status === 'COMPLETED') {
      const score = consistencyScore(pipeline.accepted, secondRun.accepted);
      console.log(`  consistencyScore: ${JSON.stringify(score)}`);
    } else {
      console.log(`  2ª execução: ${secondRun.status}`);
    }
  }

  console.log(`\nTempo sequencial total (3 municípios): ${(performance.now() - sequentialStart).toFixed(2)}ms`);
  console.log(`Tokens totais: input=${grandTotalInputTokens} output=${grandTotalOutputTokens} | custo estimado total: US$ ${grandTotalCostUsd.toFixed(6)}`);
  if (grandTotalInputTokens + grandTotalOutputTokens > 0) {
    const avgCostPerMunicipio = grandTotalCostUsd / MUNICIPALITIES.length;
    console.log(`\nEstimativa de custo em escala (linear, NÃO é um compromisso de execução):`);
    for (const n of [1, 100, 1000, 5570]) console.log(`  ${n} município(s): US$ ${(avgCostPerMunicipio * n).toFixed(2)}`);
  }
  console.log('\nEncerrado. Nenhuma Interpretation foi persistida.');
}

main().catch((error) => { console.error(error); process.exit(1); });
