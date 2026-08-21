// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildInstagramUiContract } from '@/lib/instagram/ui-contract';
import InstagramIntelligenceDashboard from './InstagramIntelligenceDashboard';

vi.mock('@/components/charts/DonutChart', () => ({ default: () => <div data-testid="donut" /> }));
vi.mock('@/components/charts/LineChart', () => ({ default: () => <div data-testid="line-chart" /> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const post = {
  id: 'post-1', target_id: 'target-a', platform: 'instagram', caption: 'Prestação de contas', content_type: 'REEL', media_type: 'video', media_url: null,
  post_url: 'https://instagram.com/p/1', taken_at: '2026-08-20T12:00:00Z', collected_at: '2026-08-21T12:00:00Z', like_count: 25, comment_count: 4,
  raw_json: { product_type: 'clips', play_count: 100 },
};

describe('InstagramIntelligenceDashboard', () => {
  it('renderiza dados reais, indisponibilidade e abre/fecha o drawer por teclado', () => {
    const contract = buildInstagramUiContract({
      posts: [post], targetNames: new Map([['target-a', 'Candidata A']]),
      analyses: [{ content_id: 'post-1', sentiment: 'positivo', risk_level: 'alto', summary: 'Resumo', recommended_action: 'Responder', ai_topics: ['iluminação'] }],
      comments: [{ id: 'c1', instagram_comment_id: 'ig-1', post_id: 'post-1', comment_user: 'eleitor', comment_text: 'Comentário', like_count: 8, collected_at: '2026-08-21T11:00:00Z' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    expect(screen.getByText('25 likes')).toBeInTheDocument();
    expect(screen.getByText('Métricas desagregadas por formato; dados ausentes não são convertidos em zero')).toBeInTheDocument();
    expect(screen.getAllByText('iluminação')[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('Análise de IA')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Responder')[0]).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe a mesma recommended_action na tabela de prioridade, no drawer e na análise estratégica', () => {
    const contract = buildInstagramUiContract({
      posts: [post], comments: [], targetNames: new Map([['target-a', 'Candidata A']]),
      analyses: [{ content_id: 'post-1', sentiment: 'positivo', risk_level: 'alto', summary: 'Resumo executivo', recommended_action: 'Reforçar atendimento público' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    const matches = screen.getAllByText('Reforçar atendimento público');
    expect(matches.length).toBeGreaterThanOrEqual(2); // Priority table & Strategic table
    fireEvent.click(screen.getAllByText('Análise de IA')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Reforçar atendimento público').length).toBeGreaterThanOrEqual(3); // Drawer included
  });

  it('exibe ANÁLISE PENDENTE para posts sem análise e RECOMENDAÇÃO INDISPONÍVEL para análise sem recomendação', () => {
    const postSemAnalise = { ...post, id: 'post-sem-analise' };
    const postSemRecomendacao = { ...post, id: 'post-sem-rec' };
    const contract = buildInstagramUiContract({
      posts: [postSemAnalise, postSemRecomendacao],
      comments: [],
      analyses: [{ content_id: 'post-sem-rec', sentiment: 'neutro', risk_level: 'baixo', summary: 'Apenas resumo' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    expect(screen.getAllByText('ANÁLISE PENDENTE')[0]).toBeInTheDocument();
    expect(screen.getAllByText('RECOMENDAÇÃO INDISPONÍVEL')[0]).toBeInTheDocument();
  });

  it('mostra empty state sem fabricar indicadores', () => {
    render(<InstagramIntelligenceDashboard contract={buildInstagramUiContract({ posts: [], comments: [], analyses: [] })} />);
    expect(screen.getByText('Nenhuma publicação encontrada')).toBeInTheDocument();
  });
});
