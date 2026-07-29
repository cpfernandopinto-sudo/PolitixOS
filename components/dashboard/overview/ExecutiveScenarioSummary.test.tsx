// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExecutiveScenarioSummary from './ExecutiveScenarioSummary';
import { classifyPoliticalStatus } from '@/lib/analytics/political-status';
import { composeExecutiveSynthesis } from '@/lib/analytics/executive-summary';

describe('ExecutiveScenarioSummary', () => {
  it('exibe "Dados insuficientes para síntese" em todos os campos no cenário sem dados', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 0,
      volumeTotal: 0,
      criticalAlertCount: 0,
      highAlertCount: 0,
      predominantSentiment: null,
      predominantRisk: null,
      volumeTrend: null,
    });
    const synthesis = composeExecutiveSynthesis({
      politicalStatus: status,
      risks: [],
      opportunities: [],
      themes: [],
      entities: [],
      keyChanges: [],
    });
    render(<ExecutiveScenarioSummary synthesis={synthesis} />);

    expect(screen.getAllByText('Dados insuficientes para síntese')).toHaveLength(6);
  });

  it('exibe os 6 rótulos de campo da síntese', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 10,
      volumeTotal: 5,
      criticalAlertCount: 0,
      highAlertCount: 0,
      predominantSentiment: 'neutro',
      predominantRisk: 'baixo',
      volumeTrend: null,
    });
    const synthesis = composeExecutiveSynthesis({
      politicalStatus: status,
      risks: [],
      opportunities: [],
      themes: [{ tema: 'Educação', frequencia: 3, sentimento: 0 }],
      entities: [{ nome: 'Candidato A', volume: 5, sentimentoPredominante: 'neutro', riscoPredominante: 'baixo', alertas: 0, temaPrincipal: null, targetId: null }],
      keyChanges: [],
    });
    render(<ExecutiveScenarioSummary synthesis={synthesis} />);

    expect(screen.getByText('Estado Geral')).toBeInTheDocument();
    expect(screen.getByText('Principal Risco')).toBeInTheDocument();
    expect(screen.getByText('Principal Oportunidade')).toBeInTheDocument();
    expect(screen.getByText('Tema em Destaque')).toBeInTheDocument();
    expect(screen.getByText('Maior Exposição')).toBeInTheDocument();
    expect(screen.getByText('Mudança Relevante')).toBeInTheDocument();
    expect(screen.getByText('Educação')).toBeInTheDocument();
    expect(screen.getByText('Candidato A')).toBeInTheDocument();
  });
});
