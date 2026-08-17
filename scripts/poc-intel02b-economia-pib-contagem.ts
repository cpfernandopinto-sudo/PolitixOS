/**
 * INTEL-02B — POC técnico real (seção 40/41 do gate).
 *
 * Lê Evidence real e já persistida do ECO-01/SICONFI + ECO-02B/IBGE-PIB para
 * Contagem/MG (3118601) e executa o Motor Determinístico de Inteligência Econômica
 * expandido (FISCAL + PIB_VAB_MONETARY + OFFICIAL_SHARE).
 *
 * Executa em dois modos:
 *   1. ECO-01 + ECO-02B combinados (POC principal).
 *   2. ECO-02B isolado (prova que o motor não depende do SICONFI — seção 41).
 *
 * SOMENTE LEITURA — não persiste nenhum DerivedIndicator/Signal no banco.
 * NÃO gera Interpretation/Implication/Recommendation. NÃO chama LLM.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { runEconomicIntelligenceEngine } from '../lib/territorios/intelligence/economy/engine';
import type { Evidence } from '../lib/territorios/intelligence/contracts';

const CODIGO_IBGE = process.argv[2] ?? '3118601';

function loadLocalEnv(): void {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function summarize(result: ReturnType<typeof runEconomicIntelligenceEngine>) {
  console.log('Coverage:', JSON.stringify(result.coverage));
  console.log('CoverageByFamily:', JSON.stringify(result.coverageByFamily));
  console.log('TemporalCoverage:', JSON.stringify(result.temporalCoverage));
  console.log('TemporalCoverageByFamily:', JSON.stringify(result.temporalCoverageByFamily));
  console.log(`DerivedIndicators: ${result.derivedIndicators.length}`);
  console.log(`Signals: ${result.signals.length}`);
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const signal of result.signals) {
    byType[signal.type] = (byType[signal.type] ?? 0) + 1;
    byStatus[signal.status] = (byStatus[signal.status] ?? 0) + 1;
  }
  console.log('Signals por tipo:', JSON.stringify(byType));
  console.log('Signals por status:', JSON.stringify(byStatus));
  console.log('Limitations:', result.limitations.map((l) => l.code).join(', ') || '(nenhuma)');
  console.log('\nAmostra de signals (até 15):');
  for (const signal of result.signals.slice(0, 15)) {
    console.log(`  [${signal.type}/${signal.status}/${signal.severity ?? '—'}] ${signal.title}`);
  }
}

async function main() {
  loadLocalEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: territoryRow, error: territoryError } = await client.from('territories').select('id, codigo_ibge, municipio, uf').eq('codigo_ibge', CODIGO_IBGE).single();
  if (territoryError || !territoryRow) throw new Error(`Território ${CODIGO_IBGE} não encontrado: ${territoryError?.message}`);
  const territory = territoryRow;

  const { data: siconfiRows } = await client.from('territory_indicators')
    .select('indicador, valor, periodo_inicio, fonte, source_dataset')
    .eq('territory_id', territory.id).eq('categoria', 'economia').eq('fonte', 'SICONFI');
  const { data: siconfiEvidenceRows } = await client.from('territory_evidence')
    .select('source_external_id, source_hash').eq('territory_id', territory.id).eq('source_name', 'Tesouro/SICONFI');
  const siconfiHashByYear = new Map((siconfiEvidenceRows ?? []).map((row) => [row.source_external_id.split(':').at(-1)!, row.source_hash]));

  const { data: pibRows } = await client.from('territory_indicators')
    .select('indicador, valor, periodo_inicio, fonte, source_dataset')
    .eq('territory_id', territory.id).eq('categoria', 'economia').eq('fonte', 'IBGE');
  const { data: pibEvidenceRows } = await client.from('territory_evidence')
    .select('source_external_id, source_hash').eq('territory_id', territory.id).in('source_name', ['IBGE/SIDRA', 'IBGE/PIB dos Municípios']);
  const pibHashByYear = new Map((pibEvidenceRows ?? []).map((row) => [row.source_external_id.split(':').at(-1)!, row.source_hash]));

  function toEvidence(rows: typeof siconfiRows, hashByYear: Map<string, string>, source: string): Evidence[] {
    return (rows ?? []).map((row, index) => {
      const year = String(row.periodo_inicio).slice(0, 4);
      return {
        id: `evidence:${territory.id}:${row.indicador}:${row.source_dataset}:${year}:${index}`,
        territoryId: territory.id, domain: 'economia' as const, indicator: row.indicador, value: Number(row.valor),
        unit: row.indicador.startsWith('participacao_') ? '%' : 'BRL', period: year, source, dataset: row.source_dataset ?? 'UNKNOWN',
        evidenceHash: hashByYear.get(year) ?? null, metadata: { real_data: true, territory: `${territory.municipio}/${territory.uf}` },
      };
    });
  }

  const siconfiEvidence = toEvidence(siconfiRows, siconfiHashByYear, 'Tesouro/SICONFI');
  const pibEvidence = toEvidence(pibRows, pibHashByYear, 'IBGE');

  console.log(`=== INTEL-02B POC — ${territory.municipio}/${territory.uf} (${CODIGO_IBGE}) ===`);
  console.log(`Evidence real: ${siconfiEvidence.length} SICONFI (ECO-01) + ${pibEvidence.length} IBGE (ECO-02B)`);

  console.log('\n########## MODO 1: ECO-01 + ECO-02B combinados ##########');
  const combined = runEconomicIntelligenceEngine(territory.id, [...siconfiEvidence, ...pibEvidence]);
  summarize(combined);

  console.log('\n########## MODO 2: ECO-02B isolado (sem SICONFI) ##########');
  const pibOnly = runEconomicIntelligenceEngine(territory.id, pibEvidence, { fiscalMonetaryIndicators: [], sharePairs: [], pressurePair: null, divergencePairs: [{ a: 'pib_municipal_precos_correntes', b: 'vab_industria_precos_correntes' }, { a: 'pib_municipal_precos_correntes', b: 'vab_servicos_exceto_setor_publico_ampliado_precos_correntes' }] });
  summarize(pibOnly);

  console.log('\nNenhum dado foi persistido. Nenhuma Interpretation/Implication/Recommendation foi gerada. Nenhum LLM foi chamado.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
