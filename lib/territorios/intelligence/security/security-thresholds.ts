/**
 * INTEL-DOMAIN-02 (Missão C) — thresholds DETERMINÍSTICOS para os signals de Segurança.
 * Cada constante é usada por exatamente um signal em `security-signals.ts` e documentada
 * aqui para auditoria futura (mesma disciplina de `../economy/caged-employment-signals.ts`:
 * nenhum threshold "achismo de LLM", todos explícitos e versionados neste arquivo).
 *
 * Este módulo NÃO chama LLM/rede — puramente constantes + funções puras de classificação.
 */

export const SECURITY_THRESHOLDS = {
  /** RECENT_SPIKE: valor atual precisa ser o pico da série E >= média * este multiplicador. */
  SPIKE_MULTIPLIER: 1.5,
  /** RECENT_IMPROVEMENT: valor atual precisa ser o mínimo da série E <= média / este divisor. */
  IMPROVEMENT_DIVISOR: 1.5,
  /** PERSISTENT_HIGH_LEVEL: quantidade mínima de períodos recentes consecutivos, todos >= média da série. */
  PERSISTENT_HIGH_MIN_PERIODS: 3,
  /** trend ('subindo'/'caindo'): quantidade mínima de variações (deltas) consecutivas no mesmo sentido. */
  TREND_MIN_CONSECUTIVE_DELTAS: 3,
} as const;

export type SecurityTrend = 'subindo' | 'caindo' | 'estavel';
