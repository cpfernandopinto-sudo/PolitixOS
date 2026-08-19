import { describe, expect, it } from 'vitest';
import { buildCagedEmploymentSignals } from './caged-employment-signals';
import { buildCagedFacts, type CagedSectorSeries } from './caged-facts';
import type { CagedAdapterPoint } from './caged-adapter';

function point(referenceMonth: string, balance: number): CagedAdapterPoint {
  return { referenceMonth, admissions: 1000, dismissals: 1000 - balance, balance, metadata: { aggregate_hash: `hash-${referenceMonth}` } };
}

const ACCELERATING_SERIES: CagedAdapterPoint[] = [
  point('202506', 50), point('202507', -20), point('202508', 10), point('202509', 40),
  point('202510', 30), point('202511', -10), point('202512', -200), point('202601', 20),
  point('202602', 60), point('202603', 80), point('202604', 100), point('202605', 300), point('202606', 700),
];

// Sinal invertendo: 202511 negativo -> 202512 positivo (recuperação real).
const REVERSAL_SERIES: CagedAdapterPoint[] = [point('202511', -50), point('202512', 30)];

describe('buildCagedEmploymentSignals — INTEL-DOMAIN-02 Missão A', () => {
  it('produz EMPLOYMENT_ACCELERATING quando o fact de aceleração é "acelerando"', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('employment_accelerating'))).toBe(true);
  });

  it('todo signal produzido tem confidence DIRECTLY_SUPPORTED, evidenceRefs não-vazio e period real', () => {
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES);
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.confidence).toBe('DIRECTLY_SUPPORTED');
      expect(signal.evidenceRefs.length).toBeGreaterThan(0);
      expect(signal.period).toBe('202606');
      expect(signal.status).toBe('ACTIVE');
    }
  });

  it('produz EMPLOYMENT_REVERSAL e RECENT_RECOVERY quando o saldo inverte de negativo para positivo', () => {
    const facts = buildCagedFacts('t1', REVERSAL_SERIES);
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('employment_reversal'))).toBe(true);
    expect(signals.some((s) => s.id.includes('recent_recovery'))).toBe(true);
    expect(signals.some((s) => s.id.includes('recent_deterioration'))).toBe(false);
  });

  it('produz RECENT_DETERIORATION quando o saldo inverte de positivo para negativo', () => {
    const series = [point('202511', 40), point('202512', -30)];
    const facts = buildCagedFacts('t1', series);
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('recent_deterioration'))).toBe(true);
    expect(signals.some((s) => s.id.includes('recent_recovery'))).toBe(false);
  });

  it('CASO NEGATIVO — insufficient periods: com 1 único mês (sem MoM/aceleração/reversão calculáveis), nenhum sinal de tendência é fabricado', () => {
    const facts = buildCagedFacts('t1', [ACCELERATING_SERIES[0]]);
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals).toHaveLength(0);
  });

  it('CASO NEGATIVO — missing evidence: array de facts vazio produz zero sinais, nunca um sinal sem lastro', () => {
    expect(buildCagedEmploymentSignals('t1', [])).toHaveLength(0);
  });

  it('SECTOR_CONCENTRATION só dispara quando exatamente 1 setor é positivo entre os avaliados', () => {
    const sectorSeries: CagedSectorSeries[] = [
      { sector: 'servicos', label: 'Serviços', points: [point('202606', 500)] },
      { sector: 'comercio', label: 'Comércio', points: [point('202606', -50)] },
      { sector: 'construcao', label: 'Construção', points: [point('202606', -30)] },
    ];
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES, { sectorSeries });
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('sector_concentration'))).toBe(true);
    expect(signals.some((s) => s.id.includes('broad_based'))).toBe(false);
  });

  it('BROAD_BASED_EXPANSION dispara só quando TODOS os setores avaliados são positivos (critério conservador)', () => {
    const sectorSeries: CagedSectorSeries[] = [
      { sector: 'servicos', label: 'Serviços', points: [point('202606', 500)] },
      { sector: 'comercio', label: 'Comércio', points: [point('202606', 50)] },
    ];
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES, { sectorSeries });
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('broad_based_expansion'))).toBe(true);
    expect(signals.some((s) => s.id.includes('sector_concentration'))).toBe(false);
  });

  it('BROAD_BASED_CONTRACTION dispara só quando TODOS os setores avaliados são negativos', () => {
    const sectorSeries: CagedSectorSeries[] = [
      { sector: 'servicos', label: 'Serviços', points: [point('202606', -500)] },
      { sector: 'comercio', label: 'Comércio', points: [point('202606', -50)] },
    ];
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES, { sectorSeries });
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('broad_based_contraction'))).toBe(true);
  });

  it('CASO NEGATIVO — misto setorial (nem todos positivos, nem todos negativos, mais de 1 positivo) não gera BROAD_BASED nem SECTOR_CONCENTRATION', () => {
    const sectorSeries: CagedSectorSeries[] = [
      { sector: 'servicos', label: 'Serviços', points: [point('202606', 500)] },
      { sector: 'comercio', label: 'Comércio', points: [point('202606', 50)] },
      { sector: 'construcao', label: 'Construção', points: [point('202606', -30)] },
    ];
    const facts = buildCagedFacts('t1', ACCELERATING_SERIES, { sectorSeries });
    const signals = buildCagedEmploymentSignals('t1', facts);
    expect(signals.some((s) => s.id.includes('broad_based'))).toBe(false);
    expect(signals.some((s) => s.id.includes('sector_concentration'))).toBe(false);
  });
});
