// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResumoEleitoral } from './ResumoEleitoral';
import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import type { ObservedHistoryResult } from '@/lib/pesquisas/observedHistory';
import type { AnalyticalStatusResult } from '@/lib/pesquisas/analyticsEngine';

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

const emptyHistory: ObservedHistoryResult = {
  points: [],
  referencePollId: null,
  referenceCenario: null,
  minPercentage: null,
  maxPercentage: null,
};

const inconclusivoStatus: AnalyticalStatusResult = {
  status: 'INCONCLUSIVO',
  reason: 'Lidera com 35%, mas não há levantamentos metodologicamente comparáveis suficientes para confirmar estabilidade.',
  candidateName: 'Cleitinho',
  gap: 23,
  previousGap: null,
  diff: null,
};

describe('ResumoEleitoral', () => {
  it('CASO OBRIGATÓRIO 1 — Todos os Candidatos: mostra líder, 2º, gap e tendência da corrida', () => {
    render(
      <ResumoEleitoral
        metrics={baseMetrics()}
        observedHistory={emptyHistory}
        analyticalStatus={inconclusivoStatus}
        referenceCandidate={null}
      />
    );

    expect(screen.getByText('Cleitinho')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Alexandre Kalil')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText(/\+23/)).toBeInTheDocument();
    expect(screen.getByText('INCONCLUSIVA')).toBeInTheDocument();
    expect(screen.getByText(/QUAEST/)).toBeInTheDocument();
  });

  it('CASO OBRIGATÓRIO 2 — Candidato Selecionado (líder): mostra percentual, posição, gap e faixa observada com contexto de fonte', () => {
    render(
      <ResumoEleitoral
        metrics={baseMetrics({ referenceCandidate: 'Cleitinho' })}
        observedHistory={{ points: [], referencePollId: 'p1', referenceCenario: 'Cenário 1', minPercentage: 30, maxPercentage: 37 }}
        analyticalStatus={inconclusivoStatus}
        referenceCandidate="Cleitinho"
      />
    );

    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('Na última pesquisa')).toBeInTheDocument();
    expect(screen.getByText(/QUAEST · 2026-07-22/)).toBeInTheDocument();
    expect(screen.getByText('1º')).toBeInTheDocument();
    expect(screen.getByText('Posição atual')).toBeInTheDocument();
    expect(screen.getByText('30% – 37%')).toBeInTheDocument();
    expect(screen.getByText('Faixa observada')).toBeInTheDocument();
    expect(screen.getByText('INCONCLUSIVA')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Pesquisas com resultado')).toBeInTheDocument();
  });

  it('candidato não-líder: mostra posição/gap em relação ao líder, não ao 2º colocado', () => {
    render(
      <ResumoEleitoral
        metrics={baseMetrics({
          referenceCandidate: 'Alexandre Kalil',
          analyzedCandidateResult: { candidateName: 'Alexandre Kalil', percentage: 12, rank: 2, gapToLeader: 23 },
        })}
        observedHistory={emptyHistory}
        analyticalStatus={inconclusivoStatus}
        referenceCandidate="Alexandre Kalil"
      />
    );

    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('2º')).toBeInTheDocument();
    expect(screen.getByText(/−23/)).toBeInTheDocument();
    expect(screen.getByText(/para Cleitinho/)).toBeInTheDocument();
  });

  it('candidato selecionado que não aparece no cenário de referência: nunca mostra "Sem dados" genérico, explica o motivo', () => {
    render(
      <ResumoEleitoral
        metrics={baseMetrics({ referenceCandidate: null, analyzedCandidateResult: null })}
        observedHistory={emptyHistory}
        analyticalStatus={inconclusivoStatus}
        referenceCandidate="Candidato Fora Do Cenário"
      />
    );

    expect(screen.queryByText('Sem dados')).not.toBeInTheDocument();
    expect(screen.getByText(/não aparece no cenário de referência/)).toBeInTheDocument();
  });

  it('sem resultado algum na corrida: estado vazio explícito, nunca quebra', () => {
    render(
      <ResumoEleitoral
        metrics={baseMetrics({ intencaoMaisRecente: null, runnerUpResult: null, gapConcorrente: null })}
        observedHistory={emptyHistory}
        analyticalStatus={{ status: 'SEM CLASSIFICAÇÃO', reason: 'Aguardando dados de resultados integrados nesta corrida.', candidateName: null, gap: null, previousGap: null, diff: null }}
        referenceCandidate={null}
      />
    );

    expect(screen.getByText(/ainda não há resultados integrados/i)).toBeInTheDocument();
  });
});
