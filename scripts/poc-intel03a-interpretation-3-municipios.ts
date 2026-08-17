/**
 * INTEL-03A — POC real: Contagem + Betim + Belo Horizonte, sem LLM (seções 58-60 do gate).
 *
 * Contagem: lida do banco real (ECO-01 + ECO-02B já persistidos, mesmo padrão do
 * INTEL-02C). Betim/Belo Horizonte: fetch -> normalize -> Evidence em memória, via
 * client/normalizer ECO-02B homologados, SEM persistir.
 *
 * EconomicIntelligenceResult -> runInterpretationPipeline (RuleBasedMockProvider,
 * SEM LLM) -> Interpretation[] em memória. Não persiste nada.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { fetchOfficialPibPerCapita, fetchPibMunicipalSidra } from '../lib/territorios/economia-pib-client';
import { normalizePibMunicipal } from '../lib/territorios/economia-pib-normalizer';
import { runEconomicIntelligenceEngine } from '../lib/territorios/intelligence/economy/engine';
import { runInterpretationPipeline } from '../lib/territorios/intelligence/interpretation/pipeline';
import { RuleBasedMockProvider } from '../lib/territorios/intelligence/interpretation/provider';
import { assertInterpretationLineageResolves } from '../lib/territorios/intelligence/interpretation/lineage';
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

async function main() {
  loadLocalEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const provider = new RuleBasedMockProvider();
  const sequentialStart = performance.now();

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

    const engineStart = performance.now();
    const engineResult = runEconomicIntelligenceEngine(territoryId, evidence);
    const engineMs = performance.now() - engineStart;

    const pipelineStart = performance.now();
    const pipeline = await runInterpretationPipeline(engineResult, provider);
    const pipelineMs = performance.now() - pipelineStart;

    console.log(`\n=== ${nome} (${codigoIbge}) — motor ${engineMs.toFixed(2)}ms | pipeline L4 ${pipelineMs.toFixed(2)}ms ===`);
    console.log(`Evidence: ${evidence.length} | Signals brutos: ${engineResult.signals.length} | Consolidated: ${engineResult.consolidatedSignals.length}`);

    if (pipeline.status === 'NO_INTERPRETATION') {
      console.log('NO_INTERPRETATION:', pipeline.reason);
      continue;
    }

    const context = pipeline.context;
    const byFamily: Record<string, number> = {};
    for (const unit of context.units) byFamily[unit.family] = (byFamily[unit.family] ?? 0) + 1;
    console.log(`Unidades selecionadas (INTEL_INPUT_SELECTION_V1): ${context.units.length} de ${context.units.length + context.excludedUnitIds.length} candidatas | por família: ${JSON.stringify(byFamily)}`);
    console.log(`Interpretations aceitas: ${pipeline.accepted.length} | rejeitadas: ${pipeline.rejected.length}`);
    if (pipeline.rejected.length > 0) {
      console.log('REJEITADAS (não deveria ocorrer com o mock provider — investigar):');
      for (const rejected of pipeline.rejected) console.log('  ', rejected.draft.id, JSON.stringify(rejected.errors));
    }

    for (const interpretation of pipeline.accepted) {
      console.log(`\n  [${interpretation.id}]`);
      console.log(`  statement: ${interpretation.statement}`);
      console.log(`  confidence: ${interpretation.confidence} | claims: ${interpretation.claims.length} | basedOnSignals: ${interpretation.basedOnSignals.length} | evidenceRefs: ${interpretation.evidenceRefs.length}`);
      console.log(`  caveats: ${interpretation.caveats.join(' | ')}`);
    }

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
  }

  console.log(`\nTempo sequencial total (3 municípios, motor + L4): ${(performance.now() - sequentialStart).toFixed(2)}ms`);
  console.log('\nEncerrado. Nenhuma Interpretation foi persistida. Nenhum LLM foi chamado. Nenhum dado de Betim/BH foi persistido.');
}

main().catch((error) => { console.error(error); process.exit(1); });
