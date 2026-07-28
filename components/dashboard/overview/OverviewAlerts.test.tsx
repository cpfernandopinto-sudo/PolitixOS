// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewAlerts from './OverviewAlerts';
import type { RiskCard } from '@/lib/analytics/executive-summary';

function makeRisk(overrides: Partial<RiskCard> = {}): RiskCard {
  return {
    id: 'r1',
    tipo: 'Notícia de risco crítico',
    entidade: 'Flávio Bolsonaro',
    descricao: 'Notícia de risco crítico envolvendo Flávio Bolsonaro',
    metricaAtual: 'local_relevance = 90',
    referencia: '> 85',
    periodo: 'Período selecionado',
    severidade: 'critico',
    evidencia: { tipo: 'alerta', id: 'r1', url: 'https://example.com/noticia', descricao: 'Título bruto da notícia de origem' },
    origem: 'noticias',
    ...overrides,
  };
}

describe('OverviewAlerts — resumo operacional (reintegração Sprint 6)', () => {
  it('usa a descrição executiva (formatExecutiveRisk), nunca o título bruto do item de origem', () => {
    render(<OverviewAlerts risks={[makeRisk()]} />);
    expect(screen.getByText('Notícia de risco crítico envolvendo Flávio Bolsonaro')).toBeInTheDocument();
    expect(screen.queryByText('Título bruto da notícia de origem')).not.toBeInTheDocument();
  });

  it('mostra canal, severidade e métrica', () => {
    render(<OverviewAlerts risks={[makeRisk()]} />);
    expect(screen.getByText('Notícias')).toBeInTheDocument();
    expect(screen.getByText('CRÍTICO')).toBeInTheDocument();
    expect(screen.getByText('local_relevance = 90')).toBeInTheDocument();
  });

  it('mostra ação real "Ver evidência" apontando para a URL real quando disponível', () => {
    render(<OverviewAlerts risks={[makeRisk()]} />);
    const link = screen.getByRole('link', { name: /VER EVIDÊNCIA/ });
    expect(link).toHaveAttribute('href', 'https://example.com/noticia');
  });

  it('estado vazio é honesto, sem fabricar alertas', () => {
    render(<OverviewAlerts risks={[]} />);
    expect(screen.getByText('Nenhum alerta crítico no momento.')).toBeInTheDocument();
  });

  it('limita a exibição aos itens mais relevantes (não lista dezenas de alertas)', () => {
    const many = Array.from({ length: 10 }, (_, i) => makeRisk({ id: `r${i}`, descricao: `Risco ${i}` }));
    render(<OverviewAlerts risks={many} />);
    expect(screen.getAllByText(/^Risco \d$/).length).toBeLessThanOrEqual(5);
  });
});
