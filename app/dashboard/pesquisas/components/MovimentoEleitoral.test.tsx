// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovimentoEleitoral } from './MovimentoEleitoral';
import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';

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

describe('MovimentoEleitoral', () => {
  it('sem série comparável: nunca mostra ESTÁVEL, mostra INCONCLUSIVO com motivo (caso real MG)', () => {
    render(<MovimentoEleitoral metrics={baseMetrics()} />);
    expect(screen.getByText('Movimento Eleitoral')).toBeInTheDocument();
    expect(screen.getByText('INCONCLUSIVA')).toBeInTheDocument();
    expect(screen.queryByText(/ESTÁVEL/)).not.toBeInTheDocument();
    expect(screen.getByText(/não há levantamentos metodologicamente comparáveis/)).toBeInTheDocument();
  });

  it('Sprint 12, P4: a cor do status nunca é o fundo do card inteiro — só badge/ícone', () => {
    const { container } = render(<MovimentoEleitoral metrics={baseMetrics()} />);
    const card = container.querySelector('section');
    // O card raiz usa só a classe compartilhada do design system — nunca ganha bg-amber-*/border-amber-*
    // (a cor do status vira badge, não fundo do card inteiro).
    expect(card?.className).toContain('surface-primary');
    expect(card?.className).not.toMatch(/bg-amber|border-amber/);
  });

  it('com série suficiente: mostra última variação, movimento e período em dias', () => {
    render(
      <MovimentoEleitoral
        metrics={baseMetrics({
          hasSufficientSeries: true,
          variacaoAnterior: { diff: 2.0, candidateName: 'Cleitinho', previousPollDate: '2026-06-22' },
          lastUpdateDate: '2026-07-22',
        })}
      />
    );
    expect(screen.getByText(/\+2/)).toBeInTheDocument();
    expect(screen.getByText('CRESCIMENTO')).toBeInTheDocument();
    expect(screen.getByText('30 dias')).toBeInTheDocument();
  });
});
