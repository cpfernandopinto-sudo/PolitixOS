import { describe, expect, it } from 'vitest';
import { buildSecurityFacts, type SecurityIndicatorSeries } from './security-facts';
import type { SecuritySeriesPoint } from '../../seguranca-analytics';

function point(period: string, value: number): SecuritySeriesPoint {
  return { period, value };
}

// 11 períodos consecutivos (mesma cardinalidade do baseline SEJUSP-MG do gate).
// Últimas 3 variações consecutivas positivas: 08->09 (+5), 09->10 (+25), 10->11 (+40) -> "subindo".
const ELEVEN_PERIODS: SecuritySeriesPoint[] = [
  point('2025-01', 10), point('2025-02', 8), point('2025-03', 12), point('2025-04', 9),
  point('2025-05', 15), point('2025-06', 20), point('2025-07', 5), point('2025-08', 30),
  point('2025-09', 35), point('2025-10', 60), point('2025-11', 100),
];

function fact(facts: ReturnType<typeof buildSecurityFacts>, key: string, period?: string) {
  return facts.find((item) => item.key === key && (period === undefined || item.period === period));
}

describe('buildSecurityFacts — INTEL-DOMAIN-02 Missão C', () => {
  it('array vazio produz nenhum fact, sem erro', () => {
    expect(buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', [])).toHaveLength(0);
  });

  it('current_value/previous_value/delta/delta_percent refletem o período mais recente', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS);
    expect(fact(facts, 'current_value')?.value).toBe(100);
    expect(fact(facts, 'previous_value')?.value).toBe(60);
    expect(fact(facts, 'delta')?.value).toBe(40);
    expect(fact(facts, 'delta_percent')?.value).toBeCloseTo(66.67, 1);
    expect(fact(facts, 'current_value')?.supported).toBe(true);
  });

  it('delta/delta_percent/previous_value são supported:false com 1 único ponto, nunca fabricam 0', () => {
    const facts = buildSecurityFacts('t1', 'roubo_consumado', 'Roubo consumado', [point('2025-01', 5)]);
    expect(fact(facts, 'previous_value')?.supported).toBe(false);
    expect(fact(facts, 'delta')?.supported).toBe(false);
    expect(fact(facts, 'delta')?.value).toBeNull();
    expect(fact(facts, 'delta_percent')?.value).toBeNull();
  });

  it('average/peak/low refletem o real máximo/mínimo/média da série', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS);
    expect(fact(facts, 'peak')?.value).toBe(100);
    expect(fact(facts, 'peak')?.period).toBe('2025-11');
    expect(fact(facts, 'low')?.value).toBe(5);
    expect(fact(facts, 'low')?.period).toBe('2025-07');
    const expectedAverage = Number((ELEVEN_PERIODS.reduce((s, p) => s + p.value, 0) / ELEVEN_PERIODS.length).toFixed(4));
    expect(fact(facts, 'average')?.value).toBe(expectedAverage);
  });

  it('trend detecta "subindo" só com pelo menos 3 variações consecutivas no mesmo sentido', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS);
    expect(fact(facts, 'trend')?.value).toBe('subindo');
    expect(fact(facts, 'trend')?.supported).toBe(true);
  });

  it('trend não é fabricada com menos de 3 variações disponíveis', () => {
    const facts = buildSecurityFacts('t1', 'roubo_consumado', 'Roubo consumado', ELEVEN_PERIODS.slice(0, 2));
    expect(fact(facts, 'trend')?.supported).toBe(false);
    expect(fact(facts, 'trend')?.value).toBeNull();
  });

  it('direction_change detecta "sim" só quando o sinal do delta realmente inverte', () => {
    // 2025-06 (20) -> 2025-07 (5): delta negativo; 2025-05 (15) -> 2025-06 (20): delta positivo -> inverte
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS.slice(0, 7));
    expect(fact(facts, 'direction_change')?.value).toBe('sim');
    // 2025-08 (30) -> 2025-09 (30): delta 0; 2025-07 (5) -> 2025-08 (30): delta positivo -> não inverte (nem sinal oposto, delta=0 não conta como inversão)
    const facts2 = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS.slice(0, 9));
    expect(fact(facts2, 'direction_change')?.value).toBe('nao');
  });

  it('persistent_high_level é "sim" só quando os últimos 3 períodos estão todos >= média', () => {
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS);
    // média ~27.2; últimos 3: 30, 60, 100 -> todos acima
    expect(fact(facts, 'persistent_high_level')?.value).toBe('sim');
  });

  it('persistent_high_level não é fabricado com menos de 3 períodos', () => {
    const facts = buildSecurityFacts('t1', 'roubo_consumado', 'Roubo consumado', ELEVEN_PERIODS.slice(0, 2));
    expect(fact(facts, 'persistent_high_level')?.supported).toBe(false);
  });

  it('facts cross-indicador (dominant_nature/natures_rising/natures_falling) só aparecem quando peerSeries é fornecida e compartilha o período mais recente', () => {
    const noPeers = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS);
    expect(fact(noPeers, 'dominant_nature')).toBeUndefined();

    const peerSeries: SecurityIndicatorSeries[] = [
      { indicatorKey: 'roubo_consumado', label: 'Roubo consumado', points: [point('2025-10', 50), point('2025-11', 200)] },
      { indicatorKey: 'homicidio_consumado', label: 'Homicídio consumado', points: [point('2025-10', 10), point('2025-11', 5)] },
    ];
    const withPeers = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS, { peerSeries });
    expect(fact(withPeers, 'dominant_nature', '2025-11')?.value).toBe('Roubo consumado');
    expect(fact(withPeers, 'natures_rising', '2025-11')?.value).toBe(1);
    expect(fact(withPeers, 'natures_falling', '2025-11')?.value).toBe(1);
  });

  it('CASO NEGATIVO — peerSeries cujo período mais recente não bate com o indicador principal é ignorada, nunca cruza períodos diferentes', () => {
    const peerSeries: SecurityIndicatorSeries[] = [{ indicatorKey: 'roubo_consumado', label: 'Roubo consumado', points: [point('2025-09', 50)] }];
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS, { peerSeries });
    expect(fact(facts, 'dominant_nature')).toBeUndefined();
  });

  it('todo fact tem ao menos 1 evidenceRef quando supported=true (rastreabilidade nunca vazia)', () => {
    const peerSeries: SecurityIndicatorSeries[] = [{ indicatorKey: 'roubo_consumado', label: 'Roubo consumado', points: [point('2025-10', 50), point('2025-11', 200)] }];
    const facts = buildSecurityFacts('t1', 'indice_crimes_violentos', 'Índice de crimes violentos', ELEVEN_PERIODS, { peerSeries });
    for (const item of facts) {
      if (item.supported) expect(item.evidenceRefs.length).toBeGreaterThan(0);
    }
  });
});
