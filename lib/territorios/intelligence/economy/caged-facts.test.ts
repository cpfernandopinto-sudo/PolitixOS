import { describe, expect, it } from 'vitest';
import { buildCagedFacts, type CagedSectorSeries } from './caged-facts';
import type { CagedAdapterPoint } from './caged-adapter';

function point(referenceMonth: string, balance: number, admissions = 1000, dismissals = 1000 - balance): CagedAdapterPoint {
  return { referenceMonth, admissions, dismissals, balance, metadata: { aggregate_hash: `hash-${referenceMonth}` } };
}

// 13 meses consecutivos, saldo subindo nos últimos 3 (202604: 100, 202605: 300, 202606: 700 -> MoM 200, 400 -> acelerando e subindo).
const THIRTEEN_MONTHS: CagedAdapterPoint[] = [
  point('202506', 50), point('202507', -20), point('202508', 10), point('202509', 40),
  point('202510', 30), point('202511', -10), point('202512', -200), point('202601', 20),
  point('202602', 60), point('202603', 80), point('202604', 100), point('202605', 300), point('202606', 700),
];

function fact(facts: ReturnType<typeof buildCagedFacts>, key: string) {
  return facts.find((item) => item.key === key);
}

describe('buildCagedFacts — INTEL-DOMAIN-02 Missão A', () => {
  it('array vazio produz nenhum fact, sem erro', () => {
    expect(buildCagedFacts('t1', [])).toHaveLength(0);
  });

  it('current_balance/admissions/dismissals refletem o mês mais recente, sempre supported', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    expect(fact(facts, 'current_balance')?.value).toBe(700);
    expect(fact(facts, 'current_balance')?.supported).toBe(true);
    expect(fact(facts, 'current_admissions')?.value).toBe(1000);
    expect(fact(facts, 'current_dismissals')?.value).toBe(300);
  });

  it('mom_change é a diferença simples e nunca percentual', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    expect(fact(facts, 'mom_change')?.value).toBe(700 - 300);
    expect(fact(facts, 'mom_change')?.supported).toBe(true);
  });

  it('mom_change com 1 único ponto é supported:false, value:null, nunca 0 fabricado', () => {
    const facts = buildCagedFacts('t1', [THIRTEEN_MONTHS[0]]);
    const mom = fact(facts, 'mom_change');
    expect(mom?.supported).toBe(false);
    expect(mom?.value).toBeNull();
    expect(mom?.limitations.length).toBeGreaterThan(0);
  });

  it('yoy_change só é supported quando há 13 meses (mesmo mês do ano anterior)', () => {
    const facts13 = buildCagedFacts('t1', THIRTEEN_MONTHS);
    expect(fact(facts13, 'yoy_change')?.supported).toBe(true);
    expect(fact(facts13, 'yoy_change')?.value).toBe(700 - 50);

    const facts12 = buildCagedFacts('t1', THIRTEEN_MONTHS.slice(1));
    expect(fact(facts12, 'yoy_change')?.supported).toBe(false);
    expect(fact(facts12, 'yoy_change')?.value).toBeNull();
  });

  it('rolling12 soma exatamente os últimos 12 meses e só é supported com 12+ pontos', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    const expected = THIRTEEN_MONTHS.slice(1).reduce((sum, p) => sum + p.balance, 0);
    expect(fact(facts, 'rolling12')?.value).toBe(expected);

    const factsShort = buildCagedFacts('t1', THIRTEEN_MONTHS.slice(0, 11));
    expect(fact(factsShort, 'rolling12')?.supported).toBe(false);
  });

  it('best_month/worst_month identificam o real máximo e mínimo da série', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    expect(fact(facts, 'best_month')?.value).toBe(700);
    expect(fact(facts, 'best_month')?.period).toBe('202606');
    expect(fact(facts, 'worst_month')?.value).toBe(-200);
    expect(fact(facts, 'worst_month')?.period).toBe('202512');
  });

  it('trend_direction detecta "subindo" quando as últimas 3 variações MoM são todas positivas', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    // MoM(602->603)=20,(603->604)=20,(604->605)=200,(605->606)=400 -> últimos 3: 20,200,400 todos positivos
    expect(fact(facts, 'trend_direction')?.value).toBe('subindo');
    expect(fact(facts, 'trend_direction')?.supported).toBe(true);
  });

  it('trend_direction não é fabricada com menos de 3 variações MoM disponíveis', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS.slice(0, 2));
    expect(fact(facts, 'trend_direction')?.supported).toBe(false);
    expect(fact(facts, 'trend_direction')?.value).toBeNull();
  });

  it('acceleration detecta "acelerando" quando a magnitude do último MoM supera a do penúltimo, mesmo sinal', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    // penúltimo MoM = 604->605 = 200; último MoM = 605->606 = 400 -> |400|>|200|, mesmo sinal positivo
    expect(fact(facts, 'acceleration')?.value).toBe('acelerando');
  });

  it('direction_reversal é "sim" só quando o sinal do saldo realmente inverte frente ao mês anterior', () => {
    // 202511 (-10) -> 202512 (-200): mesmo sinal, não é reversão
    const noReversal = buildCagedFacts('t1', THIRTEEN_MONTHS.slice(0, 7));
    expect(fact(noReversal, 'direction_reversal')?.value).toBe('nao');
    // 202512 (-200) -> 202601 (20): sinal inverte
    const reversal = buildCagedFacts('t1', THIRTEEN_MONTHS.slice(0, 8));
    expect(fact(reversal, 'direction_reversal')?.value).toBe('sim');
  });

  it('facts setoriais só aparecem quando sectorSeries é fornecida, e identificam líder/pior real', () => {
    const noSectors = buildCagedFacts('t1', THIRTEEN_MONTHS);
    expect(fact(noSectors, 'sector_leader')).toBeUndefined();

    const sectorSeries: CagedSectorSeries[] = [
      { sector: 'servicos', label: 'Serviços', points: [point('202606', 500)] },
      { sector: 'comercio', label: 'Comércio', points: [point('202606', -50)] },
      { sector: 'construcao', label: 'Construção', points: [point('202606', 30)] },
    ];
    const withSectors = buildCagedFacts('t1', THIRTEEN_MONTHS, { sectorSeries });
    expect(fact(withSectors, 'sector_leader')?.value).toBe(500);
    expect(fact(withSectors, 'sector_leader')?.label).toContain('Serviços');
    expect(fact(withSectors, 'sector_worst')?.value).toBe(-50);
    expect(fact(withSectors, 'sector_worst')?.label).toContain('Comércio');
    expect(fact(withSectors, 'sectors_positive')?.value).toBe(2);
    expect(fact(withSectors, 'sectors_negative')?.value).toBe(1);
  });

  it('todo fact tem ao menos 1 evidenceRef quando supported=true (rastreabilidade nunca vazia)', () => {
    const facts = buildCagedFacts('t1', THIRTEEN_MONTHS);
    for (const item of facts) {
      if (item.supported) expect(item.evidenceRefs.length).toBeGreaterThan(0);
    }
  });
});
