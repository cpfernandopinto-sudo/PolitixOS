// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FacebookDashboard from './FacebookDashboard';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('FacebookDashboard component', () => {
  const mockKpis = {
    totalPosts: 10,
    analyzedPosts: 8,
    totalEngagement: 500,
    totalLikes: 350,
    totalComments: 100,
    totalShares: 50,
    dominantSentiment: 'positivo',
    highRiskCount: 1,
    avgEngagement: 50,
    sentimentMap: { positivo: 5, neutro: 2, misto: 1, negativo: 0 },
  };

  const mockCharts = {
    sentimentDistribution: { positivo: 5, neutro: 2, misto: 1, negativo: 0 },
    reactionsBreakdown: { Like: 350, Love: 50 },
    topTopics: [{ name: 'Saúde Pública', count: 4 }],
  };

  const mockItems = [
    {
      post: {
        id: 'post-1',
        client_id: 'client-1',
        target_id: 'target-1',
        social_account_id: 'acc-1',
        platform: 'facebook' as const,
        platform_post_id: 'pfbid101',
        post_url: 'https://facebook.com/101',
        caption: 'Publicação de teste sobre Saúde Pública',
        media_type: null,
        media_url: null,
        thumbnail_url: null,
        taken_at: '2026-08-22T14:00:00Z',
        like_count: 100,
        comment_count: 20,
        share_count: 5,
        total_engagement: 125,
      },
      analysis: {
        sentiment: 'positivo',
        risk_level: 'baixo',
        ai_topic: 'Saúde Pública',
        summary: 'Resumo sobre saúde pública.',
      },
    },
  ];

  it('renderiza os KPIs executivos e a lista de publicações', () => {
    render(
      <FacebookDashboard
        kpis={mockKpis}
        charts={mockCharts}
        items={mockItems}
        alert={null}
        completeness="COMPLETE"
      />
    );

    expect(screen.getByText('Publicações')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('Publicação de teste sobre Saúde Pública')).toBeDefined();
  });

  it('exibe empty state quando não há publicações', () => {
    render(
      <FacebookDashboard
        kpis={{ ...mockKpis, totalPosts: 0 }}
        charts={{ sentimentDistribution: {}, reactionsBreakdown: {}, topTopics: [] }}
        items={[]}
        alert={null}
        completeness="MISSING"
      />
    );

    expect(screen.getByText('Nenhuma publicação encontrada')).toBeDefined();
  });

  it('abre o drawer ao clicar no card de publicação', () => {
    render(
      <FacebookDashboard
        kpis={mockKpis}
        charts={mockCharts}
        items={mockItems}
        alert={null}
        completeness="COMPLETE"
      />
    );

    const card = screen.getByText('Publicação de teste sobre Saúde Pública');
    fireEvent.click(card);

    expect(screen.getByText('Detalhamento da Publicação Facebook')).toBeDefined();
    expect(screen.getByText('Resumo sobre saúde pública.')).toBeDefined();
  });
});
