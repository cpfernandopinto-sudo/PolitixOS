/**
 * INTEL-03A — Fixture compartilhada de teste: Evidence sintética multi-família,
 * rodada pelo motor econômico real (`runEconomicIntelligenceEngine`, já homologado em
 * INTEL-02/02B/02C) para produzir um `EconomicIntelligenceResult` realista com boa
 * diversidade de tipos de sinal (TREND, CHANGE/consolidated, PRESSURE, CONCENTRATION,
 * DIVERGENCE, ANOMALY, ATTENTION) nas 3 famílias.
 *
 * Não é uma fixture de produção nem usa dado real — apenas Evidence sintética,
 * seguindo a mesma convenção de `economy/fixtures.ts`. Município fictício.
 */

import { runEconomicIntelligenceEngine } from '../economy/engine';
import type { EconomicIntelligenceResult } from '../economy/types';
import type { Evidence } from '../contracts';

export const FIXTURE_INTERP_TERRITORY_ID = 'fixture-intel03a-municipio-demonstrativo';

function fiscal(id: string, indicator: string, value: number, period: string): Evidence {
  return { id, territoryId: FIXTURE_INTERP_TERRITORY_ID, domain: 'economia', indicator, value, unit: 'BRL', period, source: 'fixture', dataset: 'FIXTURE_SICONFI', evidenceHash: `hash-${id}`, metadata: { fixture: true } };
}

function activity(id: string, indicator: string, value: number, period: string): Evidence {
  return { id, territoryId: FIXTURE_INTERP_TERRITORY_ID, domain: 'economia', indicator, value, unit: 'BRL', period, source: 'fixture', dataset: 'FIXTURE_IBGE_SIDRA_5938', evidenceHash: `hash-${id}`, metadata: { fixture: true } };
}

function share(id: string, indicator: string, value: number, period: string): Evidence {
  return { id, territoryId: FIXTURE_INTERP_TERRITORY_ID, domain: 'economia', indicator, value, unit: '%', period, source: 'fixture', dataset: 'FIXTURE_IBGE_SIDRA_5938', evidenceHash: `hash-${id}`, metadata: { fixture: true, official_share: true } };
}

function buildFixtureEvidence(): Evidence[] {
  const evidence: Evidence[] = [];

  // FISCAL — receita crescendo devagar, despesa crescendo rápido (PRESSURE + TREND + CHANGE).
  const receita = [1_000_000, 1_050_000, 1_100_000, 1_155_000, 1_210_000];
  const despesa = [900_000, 1_100_000, 1_350_000, 1_650_000, 2_000_000]; // ~20-22%/ano -> CHANGE todo ano
  ['2020', '2021', '2022', '2023', '2024'].forEach((year, index) => {
    evidence.push(fiscal(`fiscal-receita-${year}`, 'receita_corrente_bruta_realizada', receita[index], year));
    evidence.push(fiscal(`fiscal-despesa-${year}`, 'despesa_corrente_empenhada', despesa[index], year));
  });

  // PIB_VAB — pib_municipal crescendo, vab_industria caindo no mesmo intervalo (DIVERGENCE),
  // mais um outlier isolado (ANOMALY) numa série majoritariamente estável.
  const pib = [10_000_000, 10_500_000, 11_000_000, 11_500_000, 12_000_000];
  const vabIndustria = [4_000_000, 3_700_000, 4_050_000, 4_100_000, 4_150_000, 4_200_000, 9_500_000, 4_300_000];
  ['2019', '2020', '2021', '2022', '2023'].forEach((year, index) => {
    evidence.push(activity(`pib-${year}`, 'pib_municipal_precos_correntes', pib[index], year));
  });
  ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'].forEach((year, index) => {
    evidence.push(activity(`vab-ind-${year}`, 'vab_industria_precos_correntes', vabIndustria[index], year));
  });

  // OFFICIAL_SHARE — serviços dominante com folga (CONCENTRATION), indústria caindo bruscamente
  // no último ano observável para ficar fora da janela histórica própria (ATTENTION).
  const servicos = [55, 56, 57, 58, 60];
  const industriaShare = [30, 29, 28, 27, 12]; // último ano bem abaixo do histórico -> ATTENTION
  ['2019', '2020', '2021', '2022', '2023'].forEach((year, index) => {
    evidence.push(share(`share-serv-${year}`, 'participacao_vab_servicos_exceto_setor_publico_ampliado', servicos[index], year));
    evidence.push(share(`share-ind-${year}`, 'participacao_vab_industria', industriaShare[index], year));
  });

  return evidence;
}

export const FIXTURE_INTERP_EVIDENCE: Evidence[] = buildFixtureEvidence();

export const FIXTURE_INTERP_CONFIG = {
  fiscalMonetaryIndicators: ['receita_corrente_bruta_realizada', 'despesa_corrente_empenhada'],
  activityMonetaryIndicators: ['pib_municipal_precos_correntes', 'vab_industria_precos_correntes'],
  officialShareIndicators: ['participacao_vab_servicos_exceto_setor_publico_ampliado', 'participacao_vab_industria'],
  sharePairs: [],
  pressurePair: { revenue: 'receita_corrente_bruta_realizada', expense: 'despesa_corrente_empenhada' },
  divergencePairs: [{ a: 'pib_municipal_precos_correntes', b: 'vab_industria_precos_correntes' }],
} as const;

export function buildFixtureEconomicIntelligenceResult(): EconomicIntelligenceResult {
  return runEconomicIntelligenceEngine(FIXTURE_INTERP_TERRITORY_ID, FIXTURE_INTERP_EVIDENCE, FIXTURE_INTERP_CONFIG);
}
