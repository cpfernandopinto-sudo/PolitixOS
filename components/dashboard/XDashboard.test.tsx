// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import XDashboard from './XDashboard';

vi.mock('@/components/charts/DonutChart', () => ({ default: () => <div data-testid="donut" /> }));
vi.mock('@/components/charts/LineChart', () => ({ default: () => <div data-testid="line-chart" /> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const samplePostOwned = {
  id: 'post-owned-1',
  externalId: 'ext-1',
  origin: 'OWNED',
  candidate_name: 'Candidato A',
  author: { username: 'candidatoA', displayName: 'Candidato A' },
  text: 'Prestação de contas das obras públicas',
  created_at: '2026-08-20T12:00:00Z',
  url: 'https://x.com/candidatoA/status/1',
  metrics: {
    likes: { value: 120, available: true },
    replies: { value: 15, available: true },
    reposts: { value: 30, available: true },
    quotes: { value: 5, available: true },
    views: { value: 1500, available: true },
    bookmarks: { value: 8, available: true },
  },
  totalEngagement: 165,
  sentiment: 'positivo',
  risk: 'baixo',
  riskReason: null,
  topic: 'infraestrutura',
  ai_topics: ['infraestrutura'],
  summary: 'Resumo das realizações públicas',
  recommendedAction: 'Manter a divulgação transparente',
  authorTone: 'Factual',
  publicReaction: 'Favorável',
  crisisTemperature: 15,
  polarizationLevel: 'Baixo',
  strategicReading: 'Cenário favorável sem sobressaltos.',
  divergenceFlag: false,
};

const samplePostExternal = {
  id: 'post-ext-1',
  externalId: 'ext-2',
  origin: 'EXTERNAL',
  candidate_name: 'Candidato A',
  author: { username: 'critico_politico', displayName: 'Crítico Político' },
  text: 'Questionamentos sobre os custos da campanha',
  created_at: '2026-08-21T10:00:00Z',
  url: 'https://x.com/critico_politico/status/2',
  matchedTerms: ['custos de campanha'],
  targetAssociations: [{ targetId: 't1', matchTerm: 'custos de campanha', matchType: 'Keyword', discoverySource: 'Search' }],
  metrics: {
    likes: { value: 450, available: true },
    replies: { value: 80, available: true },
    reposts: { value: 110, available: true },
    quotes: { value: 20, available: true },
    views: { value: 5000, available: true },
    bookmarks: { value: 15, available: true },
  },
  totalEngagement: 640,
  sentiment: 'negativo',
  risk: 'alto',
  riskReason: 'Cobrança pública sobre transparência financeira',
  topic: 'finanças',
  ai_topics: ['finanças'],
  summary: 'Crítica viral sobre transparência de gastos',
  recommendedAction: 'Publicar nota oficial de esclarecimento',
  authorTone: 'Crítico',
  publicReaction: 'Dividida',
  crisisTemperature: 75,
  polarizationLevel: 'Alto',
  strategicReading: 'Possível escalada de crise se não houver resposta rápida.',
  divergenceFlag: true,
  divergenceType: 'Desconexão com o público',
};

const kpis = [
  { title: 'Posts Monitorados', value: 2 },
  { title: 'Replies Coletadas', value: 5 },
  { title: 'Engajamento Total', value: 805 },
  { title: 'Posts Positivos', value: 1 },
  { title: 'Posts Negativos', value: 1 },
  { title: 'Posts c/ Risco Alto', value: 1 },
];

const charts = {
  sentimentData: [
    { name: 'Positivo', value: 1 },
    { name: 'Negativo', value: 1 },
  ],
  riskData: [
    { name: 'Baixo', value: 1 },
    { name: 'Alto', value: 1 },
  ],
  themes: [{ name: 'infraestrutura', value: 1 }, { name: 'finanças', value: 1 }],
  crisisScore: 45,
};

describe('XDashboard', () => {
  it('renderiza os KPIs executivos, origem das publicações e badges PRÓPRIO/EXTERNO', () => {
    render(
      <XDashboard
        kpis={kpis}
        charts={charts}
        posts={[samplePostOwned, samplePostExternal]}
        analyticsPosts={[samplePostOwned, samplePostExternal]}
        replies={[]}
        analyticsReplies={[]}
        alert={samplePostExternal}
        completeness={{ posts: { totalAvailable: 2, totalLoaded: 2, isComplete: true } }}
      />
    );

    expect(screen.getByText('X — Inteligência e Monitoramento')).toBeInTheDocument();
    expect(screen.getAllByText('Próprio')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Externo')[0]).toBeInTheDocument();
    expect(screen.getByText('Prestação de contas das obras públicas')).toBeInTheDocument();
    expect(screen.getAllByText('Questionamentos sobre os custos da campanha')[0]).toBeInTheDocument();
  });

  it('exibe o banner de dados parciais quando a completeness é incompleta', () => {
    render(
      <XDashboard
        kpis={kpis}
        charts={charts}
        posts={[samplePostOwned]}
        analyticsPosts={[samplePostOwned]}
        replies={[]}
        analyticsReplies={[]}
        alert={null}
        completeness={{ posts: { totalAvailable: 50, totalLoaded: 10, isComplete: false } }}
      />
    );

    expect(screen.getByText(/Dados Parciais/)).toBeInTheDocument();
  });

  it('abre e fecha o PostDrawer investigativo ao clicar em um post', () => {
    render(
      <XDashboard
        kpis={kpis}
        charts={charts}
        posts={[samplePostOwned, samplePostExternal]}
        analyticsPosts={[samplePostOwned, samplePostExternal]}
        replies={[]}
        analyticsReplies={[]}
        alert={null}
        completeness={{ posts: { totalAvailable: 2, totalLoaded: 2, isComplete: true } }}
      />
    );

    fireEvent.click(screen.getAllByText('Investigar')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Investigação X')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra o estado vazio amigável quando não há posts no filtro', () => {
    render(
      <XDashboard
        kpis={[]}
        charts={{ sentimentData: [], riskData: [], themes: [], crisisScore: 0 }}
        posts={[]}
        analyticsPosts={[]}
        replies={[]}
        analyticsReplies={[]}
        alert={null}
        completeness={{ posts: { totalAvailable: 0, totalLoaded: 0, isComplete: true } }}
      />
    );

    expect(screen.getByText('Nenhuma atividade do X encontrada para os filtros selecionados')).toBeInTheDocument();
  });
});
