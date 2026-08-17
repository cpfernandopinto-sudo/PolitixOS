/**
 * INTEL-02 — POC técnico real (seção 51/83 do gate).
 *
 * Lê Evidence real e já persistida do ECO-01/SICONFI para Contagem/MG (3118601) e
 * executa o Motor Determinístico de Inteligência Econômica.
 *
 * SOMENTE LEITURA — não persiste nenhum DerivedIndicator/Signal no banco.
 * NÃO gera Interpretation/Implication/Recommendation. NÃO chama LLM.
 *
 * O motor não conhece Contagem: qualquer codigo_ibge com evidência ECO-01 funciona
 * (seção 52 do gate — não hardcode). Contagem é usada aqui apenas como teste real.
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

async function main() {
  loadLocalEnv();
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: territory, error: territoryError } = await client.from('territories').select('id, codigo_ibge, municipio, uf').eq('codigo_ibge', CODIGO_IBGE).single();
  if (territoryError || !territory) throw new Error(`Território ${CODIGO_IBGE} não encontrado: ${territoryError?.message}`);

  const { data: indicators, error: indicatorsError } = await client
    .from('territory_indicators')
    .select('indicador, valor, periodo_inicio, periodo_fim, fonte, source_dataset')
    .eq('territory_id', territory.id).eq('categoria', 'economia').eq('fonte', 'SICONFI').eq('source_dataset', 'SICONFI_DCA')
    .order('periodo_inicio', { ascending: true });
  if (indicatorsError) throw new Error(indicatorsError.message);

  const { data: evidenceRows, error: evidenceError } = await client
    .from('territory_evidence')
    .select('source_external_id, source_hash')
    .eq('territory_id', territory.id).eq('source_name', 'Tesouro/SICONFI');
  if (evidenceError) throw new Error(evidenceError.message);
  const hashByYear = new Map((evidenceRows ?? []).map((row) => [row.source_external_id.split(':').at(-1)!, row.source_hash]));

  const evidence: Evidence[] = (indicators ?? []).map((row, index) => {
    const year = String(row.periodo_inicio).slice(0, 4);
    return {
      id: `evidence:${territory.id}:${row.indicador}:${year}:${index}`,
      territoryId: territory.id,
      domain: 'economia',
      indicator: row.indicador,
      value: Number(row.valor),
      unit: 'BRL',
      period: year,
      source: row.fonte,
      dataset: row.source_dataset ?? 'SICONFI_DCA',
      evidenceHash: hashByYear.get(year) ?? null,
      metadata: { real_data: true, territory: `${territory.municipio}/${territory.uf}` },
    };
  });

  console.log(`=== INTEL-02 POC — ${territory.municipio}/${territory.uf} (${CODIGO_IBGE}) ===`);
  console.log(`Evidence real carregada: ${evidence.length} itens (${new Set(evidence.map((e) => e.period)).size} exercícios)`);

  const result = runEconomicIntelligenceEngine(territory.id, evidence);

  console.log(`\n--- Coverage ---`);
  console.log(JSON.stringify(result.coverage, null, 2));
  console.log(`\n--- TemporalCoverage ---`);
  console.log(JSON.stringify(result.temporalCoverage, null, 2));
  console.log(`\n--- DerivedIndicators (${result.derivedIndicators.length}) ---`);
  for (const item of result.derivedIndicators) console.log(`  ${item.indicator} [${item.period}] = ${item.result}${item.unit} (${item.methodId}/${item.methodVersion})`);
  console.log(`\n--- Signals (${result.signals.length}) ---`);
  for (const signal of result.signals) console.log(`  [${signal.type}/${signal.status}/${signal.severity ?? '—'}] ${signal.title} :: ${signal.summary}`);
  console.log(`\n--- Limitations (${result.limitations.length}) ---`);
  for (const item of result.limitations) console.log(`  ${item.code}: ${item.description}`);
  console.log(`\nNenhum dado foi persistido. Nenhuma Interpretation/Implication/Recommendation foi gerada. Nenhum LLM foi chamado.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
