/**
 * INTEL-02 — Fixtures sintéticas de teste (seção 53 do gate).
 * Município fictício, nunca usado em produção nem em POC real.
 */

import type { Evidence } from '../contracts';

export const FIXTURE_TERRITORY_ID = 'fixture-intel02-municipio-demonstrativo';

function evidence(id: string, indicator: string, value: number | null, period: string): Evidence {
  return { id, territoryId: FIXTURE_TERRITORY_ID, domain: 'economia', indicator, value, unit: 'BRL', period, source: 'fixture', dataset: 'FIXTURE_DATASET', evidenceHash: `hash-${id}`, metadata: { fixture: true } };
}

// A — crescimento nominal persistente (4 intervalos, mesmo sentido)
export const FIXTURE_A_GROWTH: Evidence[] = [
  evidence('a-2020', 'indicador_a', 1000, '2020'),
  evidence('a-2021', 'indicador_a', 1100, '2021'),
  evidence('a-2022', 'indicador_a', 1210, '2022'),
  evidence('a-2023', 'indicador_a', 1330, '2023'),
  evidence('a-2024', 'indicador_a', 1460, '2024'),
];

// B — queda nominal persistente
export const FIXTURE_B_DECLINE: Evidence[] = [
  evidence('b-2020', 'indicador_b', 2000, '2020'),
  evidence('b-2021', 'indicador_b', 1800, '2021'),
  evidence('b-2022', 'indicador_b', 1600, '2022'),
  evidence('b-2023', 'indicador_b', 1400, '2023'),
];

// C — série estável (variação ~0%)
export const FIXTURE_C_STABLE: Evidence[] = [
  evidence('c-2020', 'indicador_c', 1000, '2020'),
  evidence('c-2021', 'indicador_c', 1001, '2021'),
  evidence('c-2022', 'indicador_c', 999, '2022'),
  evidence('c-2023', 'indicador_c', 1000, '2023'),
];

// D — mudança abrupta (um único salto grande, acima do threshold de CHANGE)
export const FIXTURE_D_ABRUPT_CHANGE: Evidence[] = [
  evidence('d-2020', 'indicador_d', 1000, '2020'),
  evidence('d-2021', 'indicador_d', 1020, '2021'),
  evidence('d-2022', 'indicador_d', 2500, '2022'), // +145%
];

// E — dados insuficientes (uma única observação, nenhuma variação calculável)
export const FIXTURE_E_INSUFFICIENT: Evidence[] = [
  evidence('e-2023', 'indicador_e', 500, '2023'),
];

// F — ano do meio ausente (2020, 2021, 2023 — falta 2022)
export const FIXTURE_F_MISSING_MIDDLE_YEAR: Evidence[] = [
  evidence('f-2020', 'indicador_f', 1000, '2020'),
  evidence('f-2021', 'indicador_f', 1100, '2021'),
  evidence('f-2023', 'indicador_f', 1300, '2023'),
];

// G — zero legítimo (valor real igual a zero em um ano)
export const FIXTURE_G_LEGITIMATE_ZERO: Evidence[] = [
  evidence('g-2020', 'indicador_g', 0, '2020'),
  evidence('g-2021', 'indicador_g', 500, '2021'),
];

// H — outlier em série majoritariamente estável (para ANOMALY / IQR)
export const FIXTURE_H_OUTLIER: Evidence[] = [
  evidence('h-2019', 'indicador_h', 1000, '2019'),
  evidence('h-2020', 'indicador_h', 1030, '2020'),
  evidence('h-2021', 'indicador_h', 1050, '2021'),
  evidence('h-2022', 'indicador_h', 1080, '2022'),
  evidence('h-2023', 'indicador_h', 3500, '2023'), // salto muito acima do padrão da série
  evidence('h-2024', 'indicador_h', 1100, '2024'),
];

// I — períodos incompatíveis (um valor com período não anual, deve ser ignorado no cálculo de variação)
export const FIXTURE_I_INCOMPARABLE_PERIODS: Evidence[] = [
  evidence('i-2023', 'indicador_i', 1000, '2023'),
  evidence('i-2023-q1', 'indicador_i', 250, '2023-Q1'),
  evidence('i-2024', 'indicador_i', 1100, '2024'),
];

// J — cobertura parcial (indicador_j1 presente, indicador_j2 ausente)
export const FIXTURE_J_PARTIAL_COVERAGE: Evidence[] = [
  evidence('j1-2023', 'indicador_j1', 1000, '2023'),
  evidence('j1-2024', 'indicador_j1', 1100, '2024'),
];

// K — duas séries divergentes no mesmo período (para DIVERGENCE)
export const FIXTURE_K_DIVERGENT_A: Evidence[] = [
  evidence('k-a-2023', 'indicador_k_a', 1000, '2023'),
  evidence('k-a-2024', 'indicador_k_a', 1200, '2024'), // +20%
];
export const FIXTURE_K_DIVERGENT_B: Evidence[] = [
  evidence('k-b-2023', 'indicador_k_b', 1000, '2023'),
  evidence('k-b-2024', 'indicador_k_b', 800, '2024'), // -20%
];

// L — mesma série de A, ordem embaralhada (para teste de determinismo/ordem — seção 57)
export const FIXTURE_L_SHUFFLED_ORDER: Evidence[] = [
  FIXTURE_A_GROWTH[3],
  FIXTURE_A_GROWTH[0],
  FIXTURE_A_GROWTH[4],
  FIXTURE_A_GROWTH[1],
  FIXTURE_A_GROWTH[2],
];

// ===========================================================================
// INTEL-02B — Fixtures de participação setorial oficial (seção 43 do gate).
// ===========================================================================

function shareEvidence(id: string, indicator: string, value: number, period: string): Evidence {
  return { id, territoryId: FIXTURE_TERRITORY_ID, domain: 'economia', indicator, value, unit: '%', period, source: 'fixture', dataset: 'FIXTURE_IBGE_SIDRA_5938', evidenceHash: `hash-${id}`, metadata: { fixture: true, official_share: true } };
}

// M — estrutura estável (participação quase constante, variações < threshold de 3pp)
export const FIXTURE_M_SHARE_STABLE: Evidence[] = [
  shareEvidence('m-2018', 'participacao_setor_m', 40.0, '2018'),
  shareEvidence('m-2019', 'participacao_setor_m', 40.5, '2019'),
  shareEvidence('m-2020', 'participacao_setor_m', 39.8, '2020'),
  shareEvidence('m-2021', 'participacao_setor_m', 40.2, '2021'),
];

// N — setor crescendo persistentemente em p.p.
export const FIXTURE_N_SHARE_GROWING: Evidence[] = [
  shareEvidence('n-2018', 'participacao_setor_n', 20.0, '2018'),
  shareEvidence('n-2019', 'participacao_setor_n', 24.0, '2019'),
  shareEvidence('n-2020', 'participacao_setor_n', 28.0, '2020'),
  shareEvidence('n-2021', 'participacao_setor_n', 32.0, '2021'),
];

// O — setor decrescendo persistentemente em p.p.
export const FIXTURE_O_SHARE_DECLINING: Evidence[] = [
  shareEvidence('o-2018', 'participacao_setor_o', 65.0, '2018'),
  shareEvidence('o-2019', 'participacao_setor_o', 60.0, '2019'),
  shareEvidence('o-2020', 'participacao_setor_o', 55.0, '2020'),
  shareEvidence('o-2021', 'participacao_setor_o', 50.0, '2021'),
];

// P — mudança abrupta de participação em um único intervalo (>= threshold 3pp)
export const FIXTURE_P_SHARE_ABRUPT_CHANGE: Evidence[] = [
  shareEvidence('p-2019', 'participacao_setor_p', 30.0, '2019'),
  shareEvidence('p-2020', 'participacao_setor_p', 31.0, '2020'),
  shareEvidence('p-2021', 'participacao_setor_p', 45.0, '2021'), // +14pp em um único intervalo
];

// Q — setor dominante (>= 50%, threshold preliminar de concentração)
export const FIXTURE_Q_SHARE_DOMINANT: Evidence[] = [
  shareEvidence('q-2020', 'participacao_setor_q', 58.0, '2020'),
  shareEvidence('q-2021', 'participacao_setor_q', 60.0, '2021'),
];

// R — nenhum setor dominante (< 50%)
export const FIXTURE_R_SHARE_NOT_DOMINANT: Evidence[] = [
  shareEvidence('r-2020', 'participacao_setor_r', 35.0, '2020'),
  shareEvidence('r-2021', 'participacao_setor_r', 38.0, '2021'),
];

// R2 — segundo colocado PRÓXIMO do setor Q (INTEL-02C: exigência de distância ao segundo,
// ver CONCENTRATION_GAP_TO_SECOND_PCT_OFFICIAL_SHARE) — Q(60%) - R2(48%) = 12pp, abaixo do
// requisito de 15pp, mesmo com Q ultrapassando o threshold de share isoladamente.
export const FIXTURE_R2_SHARE_CLOSE_RUNNER_UP: Evidence[] = [
  shareEvidence('r2-2020', 'participacao_setor_r2', 46.0, '2020'),
  shareEvidence('r2-2021', 'participacao_setor_r2', 48.0, '2021'),
];

// S — soma das participações setoriais fecha em 100,01% (arredondamento oficial legítimo)
export const FIXTURE_S_SHARE_SUM_100_01: Evidence[] = [
  shareEvidence('s-agro-2021', 'participacao_setor_s_agro', 0.01, '2021'),
  shareEvidence('s-ind-2021', 'participacao_setor_s_ind', 30.81, '2021'),
  shareEvidence('s-serv-2021', 'participacao_setor_s_serv', 59.11, '2021'),
  shareEvidence('s-pub-2021', 'participacao_setor_s_pub', 10.08, '2021'), // soma = 100.01
];

// T — soma das participações setoriais fecha em 99,99% (arredondamento oficial legítimo)
export const FIXTURE_T_SHARE_SUM_99_99: Evidence[] = [
  shareEvidence('t-agro-2021', 'participacao_setor_t_agro', 0.01, '2021'),
  shareEvidence('t-ind-2021', 'participacao_setor_t_ind', 30.80, '2021'),
  shareEvidence('t-serv-2021', 'participacao_setor_t_serv', 59.11, '2021'),
  shareEvidence('t-pub-2021', 'participacao_setor_t_pub', 10.07, '2021'), // soma = 99.99
];

// U — missing 2022/2023 (participação setorial só disponível até 2021, como VAB real do ECO-02B)
export const FIXTURE_U_SHARE_MISSING_RECENT_YEARS: Evidence[] = [
  shareEvidence('u-2019', 'participacao_setor_u', 25.0, '2019'),
  shareEvidence('u-2020', 'participacao_setor_u', 26.0, '2020'),
  shareEvidence('u-2021', 'participacao_setor_u', 27.0, '2021'),
  // 2022/2023 deliberadamente ausentes — nunca zero, nunca interpolado.
];

// ===========================================================================
// INTEL-02B — Fixtures de indicadores monetários de atividade econômica (PIB/VAB).
// ===========================================================================

function activityEvidence(id: string, indicator: string, value: number, period: string): Evidence {
  return { id, territoryId: FIXTURE_TERRITORY_ID, domain: 'economia', indicator, value, unit: 'BRL', period, source: 'fixture', dataset: 'FIXTURE_IBGE_SIDRA_5938', evidenceHash: `hash-${id}`, metadata: { fixture: true } };
}

// V — PIB e VAB indústria divergindo no mesmo intervalo (para DIVERGENCE intra-atividade)
export const FIXTURE_V_PIB: Evidence[] = [
  activityEvidence('v-pib-2020', 'pib_municipal_precos_correntes', 1_000_000, '2020'),
  activityEvidence('v-pib-2021', 'pib_municipal_precos_correntes', 1_100_000, '2021'), // +10%
];
export const FIXTURE_V_VAB_INDUSTRIA: Evidence[] = [
  activityEvidence('v-vab-ind-2020', 'vab_industria_precos_correntes', 400_000, '2020'),
  activityEvidence('v-vab-ind-2021', 'vab_industria_precos_correntes', 350_000, '2021'), // -12.5%
];
