/**
 * INTEL-DOMAIN-02 (Missão A) — Signals do CAGED (L3), a partir dos Facts de `caged-facts.ts`.
 *
 * Cada signal exige, por construção do tipo `Fact[]` de entrada, `facts`/`evidenceRefs`/
 * `confidence`/`period` (seção "Economia — Signals" do gate). Thresholds são
 * DETERMINÍSTICOS e documentados aqui (nunca "achismo" de LLM). Nenhum signal é
 * produzido quando o(s) fact(s) que o sustentam têm `supported: false` — a ausência de
 * dado suficiente nunca vira um signal fabricado.
 *
 * Threshold único e explícito desta versão (documentado para auditoria futura):
 * BROAD_BASED exige que TODOS os setores com dado disponível estejam no mesmo sentido
 * (nenhum setor divergente) — é o critério mais conservador possível, não uma maioria.
 */

import type { AnalyticalSignal, Fact } from '../contracts';

const CAGED_SIGNAL_METHOD_ID = 'CAGED_EMPLOYMENT_SIGNALS_V1';
const CAGED_SIGNAL_METHOD_VERSION = 'intel-domain-02-v1';

export type CagedEmploymentSignalType =
  | 'EMPLOYMENT_ACCELERATING'
  | 'EMPLOYMENT_DECELERATING'
  | 'EMPLOYMENT_REVERSAL'
  | 'SECTOR_CONCENTRATION'
  | 'BROAD_BASED_EXPANSION'
  | 'BROAD_BASED_CONTRACTION'
  | 'RECENT_RECOVERY'
  | 'RECENT_DETERIORATION';

function findFact(facts: Fact[], key: string): Fact | undefined {
  return facts.find((item) => item.key === key && item.supported);
}

function baseSignal(type: CagedEmploymentSignalType, territoryId: string, period: string, title: string, summary: string, evidenceRefs: string[], derivedIndicatorRefs: string[]): AnalyticalSignal {
  return {
    id: `signal:economia:${type.toLowerCase()}:${territoryId}:${period}`,
    territoryId,
    domains: ['economia'],
    type: 'TREND',
    priority: null,
    severity: null,
    title,
    summary,
    evidenceRefs,
    derivedIndicatorRefs,
    period,
    status: 'ACTIVE',
    confidence: 'DIRECTLY_SUPPORTED',
    limitations: [],
    methodId: CAGED_SIGNAL_METHOD_ID,
    methodVersion: CAGED_SIGNAL_METHOD_VERSION,
  };
}

/**
 * Deriva os sinais de emprego formal a partir de `Fact[]` já calculados (nunca recalcula
 * a série bruta). Puro, determinístico, sem chamada de rede/LLM.
 */
export function buildCagedEmploymentSignals(territoryId: string, facts: Fact[]): AnalyticalSignal[] {
  const signals: AnalyticalSignal[] = [];
  const current = findFact(facts, 'current_balance');
  const acceleration = findFact(facts, 'acceleration');
  const reversal = findFact(facts, 'direction_reversal');
  const sectorsPositive = findFact(facts, 'sectors_positive');
  const sectorsNegative = findFact(facts, 'sectors_negative');
  const sectorLeader = findFact(facts, 'sector_leader');
  const period = current?.period ?? facts[0]?.period;
  if (!period) return signals;

  // EMPLOYMENT_ACCELERATING / EMPLOYMENT_DECELERATING — a partir do fact 'acceleration'.
  if (acceleration && (acceleration.value === 'acelerando' || acceleration.value === 'desacelerando')) {
    const isAccelerating = acceleration.value === 'acelerando';
    signals.push(baseSignal(
      isAccelerating ? 'EMPLOYMENT_ACCELERATING' : 'EMPLOYMENT_DECELERATING',
      territoryId, period,
      isAccelerating ? 'Saldo de emprego formal acelerando' : 'Saldo de emprego formal desacelerando',
      isAccelerating ? 'A variação mensal do saldo de emprego formal aumentou de magnitude no mesmo sentido do mês anterior.' : 'A variação mensal do saldo de emprego formal perdeu magnitude ou mudou de sentido em relação ao mês anterior.',
      acceleration.evidenceRefs, acceleration.derivedIndicatorRefs,
    ));
  }

  // EMPLOYMENT_REVERSAL — quando o fact de reversão de sinal é 'sim' (ver caged-facts.ts).
  if (reversal && reversal.value === 'sim') {
    signals.push(baseSignal('EMPLOYMENT_REVERSAL', territoryId, period, 'Reversão de sinal no saldo de emprego formal', 'O saldo do mês mais recente inverteu de sinal (positivo->negativo ou negativo->positivo) frente ao mês anterior.', reversal.evidenceRefs, reversal.derivedIndicatorRefs));
  }

  // RECENT_RECOVERY / RECENT_DETERIORATION — reversão + direção do saldo atual.
  if (reversal && reversal.value === 'sim' && current) {
    const isRecovery = Number(current.value) > 0;
    signals.push(baseSignal(
      isRecovery ? 'RECENT_RECOVERY' : 'RECENT_DETERIORATION',
      territoryId, period,
      isRecovery ? 'Recuperação recente do saldo de emprego formal' : 'Deterioração recente do saldo de emprego formal',
      isRecovery ? 'O saldo passou a positivo após um mês de saldo negativo.' : 'O saldo passou a negativo após um mês de saldo positivo.',
      [...new Set([...reversal.evidenceRefs, ...current.evidenceRefs])], [],
    ));
  }

  // SECTOR_CONCENTRATION — só um setor positivo entre os avaliados (concentração extrema).
  if (sectorsPositive && sectorLeader && Number(sectorsPositive.value) === 1) {
    signals.push(baseSignal('SECTOR_CONCENTRATION', territoryId, period, 'Concentração setorial do saldo positivo', `Apenas um setor (${sectorLeader.label.replace('Setor com maior saldo no mês (', '').replace(')', '')}) responde pelo saldo positivo do mês entre os setores avaliados.`, [...new Set([...sectorsPositive.evidenceRefs, ...sectorLeader.evidenceRefs])], []));
  }

  // BROAD_BASED_EXPANSION / BROAD_BASED_CONTRACTION — todos os setores avaliados no mesmo sentido (critério conservador, ver cabeçalho).
  if (sectorsPositive && sectorsNegative) {
    const totalSectors = Number(sectorsPositive.value) + Number(sectorsNegative.value);
    if (totalSectors > 0 && Number(sectorsPositive.value) === totalSectors) {
      signals.push(baseSignal('BROAD_BASED_EXPANSION', territoryId, period, 'Expansão disseminada entre os setores', 'Todos os setores com dado disponível no mês apresentaram saldo positivo.', sectorsPositive.evidenceRefs, []));
    } else if (totalSectors > 0 && Number(sectorsNegative.value) === totalSectors) {
      signals.push(baseSignal('BROAD_BASED_CONTRACTION', territoryId, period, 'Contração disseminada entre os setores', 'Todos os setores com dado disponível no mês apresentaram saldo negativo.', sectorsNegative.evidenceRefs, []));
    }
  }

  return signals;
}
