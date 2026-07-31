// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PriorityAlertsCenter from './PriorityAlertsCenter';
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

describe('PriorityAlertsCenter — consolidação de Riscos e Alertas Prioritários (Sprint UX — Etapa 4)', () => {
  it('usa a descrição executiva (formatExecutiveRisk), nunca o título bruto do item de origem', () => {
    render(<PriorityAlertsCenter risks={[makeRisk()]} />);
    expect(screen.getByText('Notícia de risco crítico envolvendo Flávio Bolsonaro')).toBeInTheDocument();
    expect(screen.queryByText('Título bruto da notícia de origem')).not.toBeInTheDocument();
  });

  it('mostra canal e severidade, sem linguagem técnica (ex. nome de campo bruto)', () => {
    render(<PriorityAlertsCenter risks={[makeRisk()]} />);
    expect(screen.getByText('Notícias')).toBeInTheDocument();
    expect(screen.getByText('Crítico')).toBeInTheDocument();
    expect(screen.queryByText('local_relevance = 90')).not.toBeInTheDocument();
  });

  it('estado vazio é honesto, sem fabricar alertas', () => {
    render(<PriorityAlertsCenter risks={[]} />);
    expect(screen.getByText('Nenhum alerta crítico no momento.')).toBeInTheDocument();
  });

  it('limita a exibição inicial a 3 e permite expandir com "Ver todos"', () => {
    const many = Array.from({ length: 10 }, (_, i) => makeRisk({ id: `r${i}`, descricao: `Risco ${i}` }));
    render(<PriorityAlertsCenter risks={many} />);
    expect(screen.getAllByText(/^Risco \d$/).length).toBe(3);

    fireEvent.click(screen.getByRole('button', { name: /Ver todos \(10\)/ }));
    expect(screen.getAllByText(/^Risco \d$/).length).toBe(10);
  });

  it('ação primária é um deep link interno para Notícias, casando por candidate_name (parâmetro real)', () => {
    render(<PriorityAlertsCenter risks={[makeRisk({ origem: 'noticias', entidade: 'Flávio Bolsonaro' })]} />);
    const link = screen.getByRole('link', { name: /Ver análise no PolitixOS/ });
    expect(link).toHaveAttribute('href', '/dashboard/noticias?candidate=Fl%C3%A1vio+Bolsonaro');
  });

  it('ação secundária "Fonte original" aponta para a URL real da evidência quando disponível', () => {
    render(<PriorityAlertsCenter risks={[makeRisk()]} />);
    const link = screen.getByRole('link', { name: /Fonte original/ });
    expect(link).toHaveAttribute('href', 'https://example.com/noticia');
  });

  it('não fabrica candidate_id para Instagram/X quando a Visão Geral não está filtrada por nenhuma entidade', () => {
    render(<PriorityAlertsCenter risks={[makeRisk({ origem: 'instagram' })]} activeCandidateId={null} />);
    const link = screen.getByRole('link', { name: /Ver análise no PolitixOS/ });
    expect(link).toHaveAttribute('href', '/dashboard/instagram');
  });

  it('reaproveita o candidate_id já filtrado na Visão Geral para deep link de Instagram/X', () => {
    render(<PriorityAlertsCenter risks={[makeRisk({ origem: 'instagram' })]} activeCandidateId="target-123" />);
    const link = screen.getByRole('link', { name: /Ver análise no PolitixOS/ });
    expect(link).toHaveAttribute('href', '/dashboard/instagram?candidate=target-123');
  });

  it('inclui o período ativo no deep link quando diferente de "all"', () => {
    render(<PriorityAlertsCenter risks={[makeRisk({ origem: 'x', entidade: 'Geral' })]} activeCandidateId="target-9" period="7" />);
    const link = screen.getByRole('link', { name: /Ver análise no PolitixOS/ });
    expect(link).toHaveAttribute('href', '/dashboard/x?candidate=target-9&period=7');
  });
});
