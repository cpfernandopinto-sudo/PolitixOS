// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GapEleitoral } from './GapEleitoral';
import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';

function baseMetrics(overrides: Partial<ExecutiveCockpitMetrics> = {}): ExecutiveCockpitMetrics {
  return {
    intencaoMaisRecente: { candidateName: 'Cleitinho', percentage: 35, pollDate: '2026-07-22', instituto: 'QUAEST', cenario: 'Cenário 1 (com Cleitinho)', tseRegistrationNumber: 'MG034902026' },
    runnerUpResult: { candidateName: 'Alexandre Kalil', percentage: 12 },
    referenceCandidate: null,
    analyzedCandidateResult: null,
    gapConcorrente: { gap: 23, leader: 'Cleitinho', runnerUp: 'Alexandre Kalil' },
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

describe('GapEleitoral', () => {
  it('CASO OBRIGATÓRIO 5: GAP atual continua visível mesmo sem série comparável (caso real MG/Cleitinho)', () => {
    render(<GapEleitoral metrics={baseMetrics()} temporalSeries={[]} />);

    expect(screen.getByText('Cleitinho')).toBeInTheDocument();
    expect(screen.getByText('Alexandre Kalil')).toBeInTheDocument();
    expect(screen.getByText(/\+23/)).toBeInTheDocument();
    // Evolução do GAP (dependente de série) fica indisponível, mas isso não esconde o GAP atual acima.
    expect(screen.getByText(/Evolução indisponível/)).toBeInTheDocument();
  });

  it('sem líder+2º na pesquisa de referência: GAP atual mostra estado explícito, nunca quebra', () => {
    render(<GapEleitoral metrics={baseMetrics({ gapConcorrente: null })} temporalSeries={[]} />);
    expect(screen.getByText(/menos de 2 candidatos reais/i)).toBeInTheDocument();
  });
});
