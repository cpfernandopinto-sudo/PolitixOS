// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoberturaDosDados } from './CoberturaDosDados';
import type { ElectoralPoll, ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';

function poll(id: string, overrides: Partial<ElectoralPoll> = {}): ElectoralPoll {
  return {
    id,
    tseRegistrationNumber: `REG-${id}`,
    source: 'TSE/PesqEle',
    sourceUrl: null,
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'MG',
    municipio: null,
    cargo: 'Governador, Senador',
    abrangencia: 'MINAS GERAIS',
    instituto: 'QUAEST',
    contratante: null,
    pagante: null,
    valor: null,
    metodologia: null,
    dataRegistro: '2026-07-22',
    campoInicio: '2026-07-22',
    campoFim: '2026-07-26',
    amostra: 1482,
    margemErro: null,
    nivelConfianca: null,
    rawSourceRow: null,
    ingestedAt: '2026-08-19T00:00:00Z',
    createdAt: '2026-08-19T00:00:00Z',
    updatedAt: '2026-08-19T00:00:00Z',
    ...overrides,
  };
}

function baseMetrics(overrides: Partial<ExecutiveCockpitMetrics> = {}): ExecutiveCockpitMetrics {
  return {
    intencaoMaisRecente: { candidateName: 'Cleitinho', percentage: 35, pollDate: '2026-07-22', instituto: 'QUAEST', cenario: 'Cenário 1 (com Cleitinho)', tseRegistrationNumber: 'MG034902026' },
    runnerUpResult: null,
    referenceCandidate: null,
    analyzedCandidateResult: null,
    gapConcorrente: null,
    variacaoAnterior: null,
    maximoPeriodo: null,
    minimoPeriodo: null,
    totalPollsInSlice: 28,
    pollsWithResultsCount: 2,
    pesquisasComparaveisCount: 1,
    comparableOtherPollsCount: 0,
    trendPollsCount: 1,
    lastUpdateDate: '2026-07-22',
    hasSufficientSeries: false,
    leaderMovement: 'UNAVAILABLE',
    runnerUpMovement: 'UNAVAILABLE',
    gapBehavior: 'UNAVAILABLE',
    volatility: 'UNAVAILABLE',
    instituteConsistency: 'UNAVAILABLE',
    ...overrides,
  };
}

describe('CoberturaDosDados', () => {
  it('CASO REAL MG/Governador: 28 registradas, 2 com resultado, 1 aguardando divulgação, 25 não integradas', () => {
    const polls: ElectoralPoll[] = [
      poll('com-resultado-1'),
      poll('com-resultado-2'),
      poll('aguardando-divulgacao', { rawSourceRow: { DT_DIVULGACAO: '2999-01-01' } as never }),
      ...Array.from({ length: 25 }, (_, i) => poll(`nao-integrada-${i}`, { rawSourceRow: { DT_DIVULGACAO: '2020-01-01' } as never })),
    ];
    const resultsPollIds = new Set(['com-resultado-1', 'com-resultado-2']);

    render(
      <CoberturaDosDados
        registeredPolls={polls}
        resultsPollIds={resultsPollIds}
        metrics={baseMetrics({ totalPollsInSlice: 28 })}
        temporalSeries={[]}
      />
    );

    expect(screen.getByTestId('cov-registradas')).toHaveTextContent('28');
    expect(screen.getByTestId('cov-com-resultado')).toHaveTextContent('2');
    expect(screen.getByTestId('cov-aguardando')).toHaveTextContent('1');
    expect(screen.getByTestId('cov-nao-integradas')).toHaveTextContent('25');
  });

  it('conta institutos distintos entre as pesquisas registradas no recorte', () => {
    const polls = [poll('a', { instituto: 'QUAEST' }), poll('b', { instituto: 'DATAFOLHA' }), poll('c', { instituto: 'QUAEST' })];
    render(
      <CoberturaDosDados registeredPolls={polls} resultsPollIds={new Set()} metrics={baseMetrics()} temporalSeries={[]} />
    );
    expect(screen.getByTestId('cov-institutos')).toHaveTextContent('2');
  });

  it('sem pesquisas no recorte, nunca quebra', () => {
    render(
      <CoberturaDosDados registeredPolls={[]} resultsPollIds={new Set()} metrics={baseMetrics({ totalPollsInSlice: 0, pollsWithResultsCount: 0 })} temporalSeries={[]} />
    );
    expect(screen.getByText('Cobertura dos Dados')).toBeInTheDocument();
  });
});
