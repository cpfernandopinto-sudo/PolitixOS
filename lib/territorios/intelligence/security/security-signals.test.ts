import { describe, expect, it } from 'vitest';
import { buildSecurityFacts, type SecurityIndicatorSeries } from './security-facts';
import { buildSecurityCategoryShiftSignal, buildSecurityIndicatorSignals } from './security-signals';
import type { SecuritySeriesPoint } from '../../seguranca-analytics';

function point(period: string, value: number): SecuritySeriesPoint {
  return { period, value };
}

const RISING_SERIES: SecuritySeriesPoint[] = [
  point('2025-01', 10), point('2025-02', 8), point('2025-03', 12), point('2025-04', 9),
  point('2025-05', 15), point('2025-06', 20), point('2025-07', 5), point('2025-08', 30),
  point('2025-09', 35), point('2025-10', 60), point('2025-11', 100),
];

// Últimas 3 variações consecutivas negativas: 08->09 (-5), 09->10 (-10), 10->11 (-15) -> "caindo".
const FALLING_SERIES: SecuritySeriesPoint[] = [
  point('2025-01', 10), point('2025-02', 8), point('2025-03', 12), point('2025-04', 9),
  point('2025-05', 15), point('2025-06', 20), point('2025-07', 5), point('2025-08', 35),
  point('2025-09', 30), point('2025-10', 20), point('2025-11', 5),
];

describe('buildSecurityIndicatorSignals — INTEL-DOMAIN-02 Missão C', () => {
  it('produz VIOLENCE_RISING quando o fact de tendência é "subindo"', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES);
    const signals = buildSecurityIndicatorSignals('t1', 'Índice de crimes violentos', facts);
    expect(signals.some((s) => s.id.includes('violence_rising'))).toBe(true);
    expect(signals.some((s) => s.id.includes('violence_falling'))).toBe(false);
  });

  it('produz VIOLENCE_FALLING quando o fact de tendência é "caindo"', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', FALLING_SERIES);
    const signals = buildSecurityIndicatorSignals('t1', 'Índice de crimes violentos', facts);
    expect(signals.some((s) => s.id.includes('violence_falling'))).toBe(true);
    expect(signals.some((s) => s.id.includes('violence_rising'))).toBe(false);
  });

  it('todo signal produzido tem confidence DIRECTLY_SUPPORTED, evidenceRefs não-vazio e period real', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES);
    const signals = buildSecurityIndicatorSignals('t1', 'Índice de crimes violentos', facts);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.confidence).toBe('DIRECTLY_SUPPORTED');
      expect(signal.evidenceRefs.length).toBeGreaterThan(0);
      expect(signal.period).toBe('2025-11');
      expect(signal.status).toBe('ACTIVE');
    }
  });

  it('produz RECENT_SPIKE só quando o valor atual é literalmente o pico E supera a média pelo multiplicador definido', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES);
    const signals = buildSecurityIndicatorSignals('t1', 'Índice de crimes violentos', facts);
    expect(signals.some((s) => s.id.includes('recent_spike'))).toBe(true);
  });

  it('CASO NEGATIVO — sem desvio real (série estável), nenhum RECENT_SPIKE/RECENT_IMPROVEMENT é fabricado', () => {
    const stable = Array.from({ length: 11 }, (_, i) => point(`2025-${String(i + 1).padStart(2, '0')}`, 20));
    const facts = buildSecurityFacts('t1', 'roubo_consumado', 'Roubo consumado', stable);
    const signals = buildSecurityIndicatorSignals('t1', 'Roubo consumado', facts);
    expect(signals.some((s) => s.id.includes('recent_spike'))).toBe(false);
    expect(signals.some((s) => s.id.includes('recent_improvement'))).toBe(false);
  });

  it('produz PERSISTENT_HIGH_LEVEL quando os últimos 3 períodos estão todos acima da média', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES);
    const signals = buildSecurityIndicatorSignals('t1', 'Índice de crimes violentos', facts);
    expect(signals.some((s) => s.id.includes('persistent_high_level'))).toBe(true);
  });

  it('CASO NEGATIVO — insufficient periods: com 1 único ponto, nenhum sinal de tendência é fabricado', () => {
    const facts = buildSecurityFacts('t1', 'roubo_consumado', 'Roubo consumado', [point('2025-01', 10)]);
    const signals = buildSecurityIndicatorSignals('t1', 'Roubo consumado', facts);
    expect(signals).toHaveLength(0);
  });

  it('CASO NEGATIVO — missing evidence: array de facts vazio produz zero sinais, nunca um sinal sem lastro', () => {
    expect(buildSecurityIndicatorSignals('t1', 'Roubo consumado', [])).toHaveLength(0);
  });
});

describe('buildSecurityCategoryShiftSignal — INTEL-DOMAIN-02 Missão C', () => {
  it('produz CATEGORY_SHIFT quando a natureza dominante muda entre os dois últimos períodos avaliados', () => {
    const peerSeries: SecurityIndicatorSeries[] = [
      { indicatorKey: 'roubo_consumado', label: 'Roubo consumado', points: [point('2025-10', 200), point('2025-11', 50)] },
      { indicatorKey: 'homicidio_consumado', label: 'Homicídio consumado', points: [point('2025-10', 10), point('2025-11', 300)] },
    ];
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES, { peerSeries });
    const signals = buildSecurityCategoryShiftSignal('t1', facts);
    expect(signals).toHaveLength(1);
    expect(signals[0].summary).toContain('Roubo consumado');
    expect(signals[0].summary).toContain('Homicídio consumado');
  });

  it('CASO NEGATIVO — mesma natureza dominante nos dois períodos, nenhum CATEGORY_SHIFT fabricado', () => {
    const peerSeries: SecurityIndicatorSeries[] = [
      { indicatorKey: 'roubo_consumado', label: 'Roubo consumado', points: [point('2025-10', 200), point('2025-11', 250)] },
      { indicatorKey: 'homicidio_consumado', label: 'Homicídio consumado', points: [point('2025-10', 10), point('2025-11', 5)] },
    ];
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES, { peerSeries });
    expect(buildSecurityCategoryShiftSignal('t1', facts)).toHaveLength(0);
  });

  it('CASO NEGATIVO — sem natureza dominante em pelo menos 2 períodos (peerSeries ausente), nenhum CATEGORY_SHIFT', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', RISING_SERIES);
    expect(buildSecurityCategoryShiftSignal('t1', facts)).toHaveLength(0);
  });
});
