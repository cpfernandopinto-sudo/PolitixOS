import { describe, expect, it } from 'vitest';
import { calculatePercentagePointChanges, officialShareSeries, ECON_OFFICIAL_SHARE_SERIES_V1, ECON_SHARE_V1 } from './derived-indicators';
import {
  detectOfficialShareAttention, detectOfficialShareChange, detectOfficialShareConcentration, detectOfficialShareTrend,
} from './signals';
import {
  FIXTURE_M_SHARE_STABLE, FIXTURE_N_SHARE_GROWING, FIXTURE_O_SHARE_DECLINING, FIXTURE_P_SHARE_ABRUPT_CHANGE,
  FIXTURE_Q_SHARE_DOMINANT, FIXTURE_R_SHARE_NOT_DOMINANT, FIXTURE_R2_SHARE_CLOSE_RUNNER_UP, FIXTURE_S_SHARE_SUM_100_01, FIXTURE_T_SHARE_SUM_99_99,
  FIXTURE_TERRITORY_ID, FIXTURE_U_SHARE_MISSING_RECENT_YEARS,
} from './fixtures';

describe('INTEL-02B — participação oficial: consumo direto, nunca ECON_SHARE_V1 (seção 44 do gate)', () => {
  it('officialShareSeries usa ECON_OFFICIAL_SHARE_SERIES_V1, nunca ECON_SHARE_V1', () => {
    const series = officialShareSeries(FIXTURE_M_SHARE_STABLE, 'participacao_setor_m');
    expect(series.length).toBeGreaterThan(0);
    for (const item of series) {
      expect(item.methodId).toBe(ECON_OFFICIAL_SHARE_SERIES_V1);
      expect(item.methodId).not.toBe(ECON_SHARE_V1);
    }
  });

  it('o valor persistido é exatamente o valor bruto da Evidence, sem nenhuma divisão', () => {
    const series = officialShareSeries(FIXTURE_M_SHARE_STABLE, 'participacao_setor_m');
    expect(series.map((item) => item.sharePct)).toEqual([40.0, 40.5, 39.8, 40.2]);
  });

  it('toda observação carrega a limitation OFFICIAL_SHARE', () => {
    const series = officialShareSeries(FIXTURE_M_SHARE_STABLE, 'participacao_setor_m');
    for (const item of series) expect(item.limitations.some((l) => l.code === 'OFFICIAL_SHARE')).toBe(true);
  });
});

describe('mudança em pontos percentuais (seção 9 do gate) — nunca variação relativa', () => {
  it('30% -> 35% é "+5 p.p.", nunca "+16,67%"', () => {
    const evidence = [
      { id: 'x1', territoryId: FIXTURE_TERRITORY_ID, domain: 'economia' as const, indicator: 'x', value: 30, unit: '%', period: '2020', source: 'fixture', dataset: 'FIXTURE', evidenceHash: 'h1', metadata: {} },
      { id: 'x2', territoryId: FIXTURE_TERRITORY_ID, domain: 'economia' as const, indicator: 'x', value: 35, unit: '%', period: '2021', source: 'fixture', dataset: 'FIXTURE', evidenceHash: 'h2', metadata: {} },
    ];
    const [change] = calculatePercentagePointChanges(evidence, 'x');
    expect(change.changePp).toBe(5);
    expect(change.changePp).not.toBeCloseTo(16.67, 1);
  });
});

describe('TREND de participação setorial (seção 43 fixtures M/N/O)', () => {
  it('estrutura estável (fixture M) não produz TREND', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_M_SHARE_STABLE, 'participacao_setor_m');
    expect(detectOfficialShareTrend(FIXTURE_TERRITORY_ID, changes)).toHaveLength(0);
  });

  it('setor crescente em p.p. (fixture N) produz TREND crescente', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_N_SHARE_GROWING, 'participacao_setor_n');
    const signals = detectOfficialShareTrend(FIXTURE_TERRITORY_ID, changes);
    expect(signals).toHaveLength(1);
    expect(signals[0].title).toContain('crescente');
  });

  it('setor decrescente em p.p. (fixture O) produz TREND decrescente', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_O_SHARE_DECLINING, 'participacao_setor_o');
    const signals = detectOfficialShareTrend(FIXTURE_TERRITORY_ID, changes);
    expect(signals).toHaveLength(1);
    expect(signals[0].title).toContain('decrescente');
  });
});

describe('CHANGE de participação setorial em p.p. (seção 10 do gate, fixture P)', () => {
  it('mudança abrupta de +14pp produz CHANGE', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_P_SHARE_ABRUPT_CHANGE, 'participacao_setor_p');
    const signals = detectOfficialShareChange(FIXTURE_TERRITORY_ID, changes);
    expect(signals.some((s) => s.period === '2020-2021')).toBe(true);
  });

  it('mudança de +1pp (abaixo do threshold de 3pp) não produz CHANGE', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_P_SHARE_ABRUPT_CHANGE, 'participacao_setor_p');
    expect(detectOfficialShareChange(FIXTURE_TERRITORY_ID, changes).some((s) => s.period === '2019-2020')).toBe(false);
  });

  it('nunca reutiliza threshold percentual fiscal — usa threshold próprio em p.p.', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_P_SHARE_ABRUPT_CHANGE, 'participacao_setor_p');
    const signals = detectOfficialShareChange(FIXTURE_TERRITORY_ID, changes);
    expect(signals[0].summary).toContain('p.p.');
    expect(signals[0].summary).not.toContain('16,');
  });
});

describe('CONCENTRATION setorial — threshold preliminar 50% + distância ao segundo (INTEL-02C, fixtures Q/R/R2)', () => {
  it('setor dominante (fixture Q, >=50%) com segundo distante (fixture R) produz CONCENTRATION com THRESHOLD_PRELIMINARY', () => {
    const seriesQ = officialShareSeries(FIXTURE_Q_SHARE_DOMINANT, 'participacao_setor_q');
    const seriesR = officialShareSeries(FIXTURE_R_SHARE_NOT_DOMINANT, 'participacao_setor_r');
    const signals = detectOfficialShareConcentration(FIXTURE_TERRITORY_ID, [seriesQ, seriesR]);
    expect(signals).toHaveLength(1);
    expect(signals[0].limitations.some((l) => l.code === 'THRESHOLD_PRELIMINARY')).toBe(true);
  });

  it('nenhum setor dominante (fixture R vs. M, ambos <50%) não produz CONCENTRATION', () => {
    const seriesR = officialShareSeries(FIXTURE_R_SHARE_NOT_DOMINANT, 'participacao_setor_r');
    const seriesM = officialShareSeries(FIXTURE_M_SHARE_STABLE, 'participacao_setor_m');
    expect(detectOfficialShareConcentration(FIXTURE_TERRITORY_ID, [seriesR, seriesM])).toHaveLength(0);
  });

  it('menos de 2 setores informados não produz CONCENTRATION (não há segundo colocado para calcular distância)', () => {
    const seriesQ = officialShareSeries(FIXTURE_Q_SHARE_DOMINANT, 'participacao_setor_q');
    expect(detectOfficialShareConcentration(FIXTURE_TERRITORY_ID, [seriesQ])).toHaveLength(0);
  });

  it('setor líder >=50% mas com segundo colocado próximo (fixture R2, gap 12pp < 15pp) não produz CONCENTRATION (seção 17 do gate)', () => {
    const seriesQ = officialShareSeries(FIXTURE_Q_SHARE_DOMINANT, 'participacao_setor_q');
    const seriesR2 = officialShareSeries(FIXTURE_R2_SHARE_CLOSE_RUNNER_UP, 'participacao_setor_r2');
    expect(detectOfficialShareConcentration(FIXTURE_TERRITORY_ID, [seriesQ, seriesR2])).toHaveLength(0);
  });

  it('não reutiliza automaticamente o threshold fiscal de 80% (seção 11 do gate)', () => {
    // fixture Q tem 60% -- abaixo de 80% (fiscal) mas acima de 50% (setorial preliminar).
    const seriesQ = officialShareSeries(FIXTURE_Q_SHARE_DOMINANT, 'participacao_setor_q');
    const seriesR = officialShareSeries(FIXTURE_R_SHARE_NOT_DOMINANT, 'participacao_setor_r');
    const signals = detectOfficialShareConcentration(FIXTURE_TERRITORY_ID, [seriesQ, seriesR], 80);
    expect(signals).toHaveLength(0); // se usasse 80%, não dispararia -- confirma que o threshold é parametrizável e distinto
    const signalsDefault = detectOfficialShareConcentration(FIXTURE_TERRITORY_ID, [seriesQ, seriesR]);
    expect(signalsDefault).toHaveLength(1); // com o threshold OFFICIAL_SHARE (50%) e distância 22pp, dispara
  });
});

describe('ATTENTION setorial — janela histórica (fixture Q como caso simples)', () => {
  it('série curta (< janela+1) não produz ATTENTION (insuficiente)', () => {
    const series = officialShareSeries(FIXTURE_Q_SHARE_DOMINANT, 'participacao_setor_q');
    expect(detectOfficialShareAttention(FIXTURE_TERRITORY_ID, series)).toHaveLength(0);
  });
});

describe('soma de participações — arredondamento oficial legítimo (fixtures S/T, seção 24 do gate)', () => {
  it('soma 100,01% é preservada como está — motor não corrige nem rejeita (fixture S)', () => {
    const indicators = ['participacao_setor_s_agro', 'participacao_setor_s_ind', 'participacao_setor_s_serv', 'participacao_setor_s_pub'];
    const values = indicators.map((ind) => officialShareSeries(FIXTURE_S_SHARE_SUM_100_01, ind)[0]?.sharePct ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100.01, 2);
  });

  it('soma 99,99% é preservada como está (fixture T)', () => {
    const indicators = ['participacao_setor_t_agro', 'participacao_setor_t_ind', 'participacao_setor_t_serv', 'participacao_setor_t_pub'];
    const values = indicators.map((ind) => officialShareSeries(FIXTURE_T_SHARE_SUM_99_99, ind)[0]?.sharePct ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(99.99, 2);
  });
});

describe('missing 2022/2023 (fixture U, seção 51 do gate) — nunca zero, nunca interpolado', () => {
  it('série sem 2022/2023 produz apenas as observações reais, sem preenchimento', () => {
    const series = officialShareSeries(FIXTURE_U_SHARE_MISSING_RECENT_YEARS, 'participacao_setor_u');
    expect(series.map((item) => item.year)).toEqual([2019, 2020, 2021]);
    expect(series.every((item) => item.sharePct !== 0)).toBe(true);
  });

  it('nenhuma mudança calculada envolve um ano ausente como se fosse consecutivo', () => {
    const changes = calculatePercentagePointChanges(FIXTURE_U_SHARE_MISSING_RECENT_YEARS, 'participacao_setor_u');
    expect(changes.every((c) => c.toYear === c.fromYear + 1)).toBe(true);
    expect(changes.some((c) => c.toYear === 2022 || c.toYear === 2023)).toBe(false);
  });
});
