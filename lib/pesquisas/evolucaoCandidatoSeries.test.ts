import { describe, it, expect } from 'vitest';
import { buildEvolucaoCandidatoSeries } from './evolucaoCandidatoSeries';
import type { ObservedHistoryResult } from './observedHistory';
import type { TemporalSeriesEntry } from './results-repository';

function history(overrides: Partial<ObservedHistoryResult> = {}): ObservedHistoryResult {
  return {
    points: [
      { pollId: 'mg-abr', cenario: 'Cenário 1 (Cleitinho x Kalil x Pacheco)', turno: 1, tipoPergunta: 'estimulada', office: 'Governador', candidateName: 'Cleitinho', percentage: 30, instituto: 'QUAEST', tseRegistrationNumber: 'MG086462026', date: '2026-04-22', amostra: 1482, comparability: 'NAO_COMPARAVEL', comparabilityReason: 'Cenário com conjunto de candidatos diferente' },
      { pollId: 'mg-jul', cenario: 'Cenário 1 (com Cleitinho)', turno: 1, tipoPergunta: 'estimulada', office: 'Governador', candidateName: 'Cleitinho', percentage: 35, instituto: 'QUAEST', tseRegistrationNumber: 'MG034902026', date: '2026-07-22', amostra: 1482, comparability: 'REFERENCIA', comparabilityReason: 'Pesquisa/cenário de referência (leitura mais recente).' },
    ],
    referencePollId: 'mg-jul',
    referenceCenario: 'Cenário 1 (com Cleitinho)',
    minPercentage: 30,
    maxPercentage: 35,
    ...overrides,
  };
}

describe('buildEvolucaoCandidatoSeries', () => {
  it('CASO OBRIGATÓRIO 3: histórico observado continua visível (scatterData) mesmo sem série comparável', () => {
    const series = buildEvolucaoCandidatoSeries(history(), [], 'Cleitinho');
    expect(series.scatterData).toEqual([30, 35]);
    expect(series.categories).toHaveLength(2);
  });

  it('CASO OBRIGATÓRIO 8: ponto não pertencente à série comparável real (buildTemporalSeries) nunca recebe valor de linha, mesmo com só 1 pesquisa na série', () => {
    // buildTemporalSeries real, com só 1 ponto para Cleitinho (não forma linha de 2+ pontos, mas
    // ainda assim testamos que o abril NUNCA aparece na linha mesmo que observedHistory não marque
    // explicitamente "NAO_COMPARAVEL" corretamente — a linha usa exclusivamente pollId presente em
    // temporalSeries, nunca o campo `comparability` de observedHistory).
    const temporalSeries: TemporalSeriesEntry[] = [
      { candidateName: 'Cleitinho', points: [{ pollId: 'mg-jul', date: '2026-07-22', percentage: 35 }] },
    ];
    const series = buildEvolucaoCandidatoSeries(history(), temporalSeries, 'Cleitinho');

    expect(series.lineData).toEqual([null, 35]);
    expect(series.comparablePollCount).toBe(1);
  });

  it('quando há 2+ pontos comparáveis reais, a linha conecta exatamente esses pontos e ignora o resto', () => {
    const temporalSeries: TemporalSeriesEntry[] = [
      {
        candidateName: 'Cleitinho',
        points: [
          { pollId: 'mg-mar', date: '2026-03-01', percentage: 28 },
          { pollId: 'mg-jul', date: '2026-07-22', percentage: 35 },
        ],
      },
    ];
    // observedHistory tem 3 pontos: mg-abr (fora da série), mg-mar (na série), mg-jul (referência, na série).
    const obs = history({
      points: [
        { pollId: 'mg-abr', cenario: 'X', turno: 1, tipoPergunta: 'estimulada', office: 'Governador', candidateName: 'Cleitinho', percentage: 30, instituto: 'Q', tseRegistrationNumber: 'A', date: '2026-04-22', amostra: null, comparability: 'NAO_COMPARAVEL', comparabilityReason: '' },
        { pollId: 'mg-mar', cenario: 'Cenário 1', turno: 1, tipoPergunta: 'estimulada', office: 'Governador', candidateName: 'Cleitinho', percentage: 28, instituto: 'Q', tseRegistrationNumber: 'B', date: '2026-03-01', amostra: null, comparability: 'COMPARAVEL', comparabilityReason: '' },
        { pollId: 'mg-jul', cenario: 'Cenário 1 (com Cleitinho)', turno: 1, tipoPergunta: 'estimulada', office: 'Governador', candidateName: 'Cleitinho', percentage: 35, instituto: 'Q', tseRegistrationNumber: 'C', date: '2026-07-22', amostra: null, comparability: 'REFERENCIA', comparabilityReason: '' },
      ],
    });

    const series = buildEvolucaoCandidatoSeries(obs, temporalSeries, 'Cleitinho');
    expect(series.lineData).toEqual([null, 28, 35]);
    expect(series.comparablePollCount).toBe(2);
  });

  it('candidato sem entrada em temporalSeries: linha inteira nula, scatter continua completo', () => {
    const series = buildEvolucaoCandidatoSeries(history(), [], 'Cleitinho');
    expect(series.lineData).toEqual([null, null]);
    expect(series.scatterData).toEqual([30, 35]);
  });

  it('sem pontos observados: tudo vazio', () => {
    const series = buildEvolucaoCandidatoSeries({ points: [], referencePollId: null, referenceCenario: null, minPercentage: null, maxPercentage: null }, [], 'Cleitinho');
    expect(series.categories).toEqual([]);
    expect(series.scatterData).toEqual([]);
    expect(series.lineData).toEqual([]);
  });
});
