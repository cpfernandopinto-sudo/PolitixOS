// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildInstagramUiContract } from '@/lib/instagram/ui-contract';
import InstagramIntelligenceDashboard from './InstagramIntelligenceDashboard';

vi.mock('@/components/charts/DonutChart', () => ({ default: () => <div data-testid="donut" /> }));

const post = {
  id: 'post-1', target_id: 'target-a', platform: 'instagram', caption: 'Prestação de contas', content_type: 'REEL', media_type: 'video', media_url: null,
  post_url: 'https://instagram.com/p/1', taken_at: '2026-08-20T12:00:00Z', collected_at: '2026-08-21T12:00:00Z', like_count: 25, comment_count: 4,
  raw_json: { product_type: 'clips', play_count: 100 },
};

describe('InstagramIntelligenceDashboard', () => {
  it('renderiza dados reais, indisponibilidade e abre/fecha o drawer por teclado', () => {
    const contract = buildInstagramUiContract({
      posts: [post], targetNames: new Map([['target-a', 'Candidata A']]),
      analyses: [{ content_id: 'post-1', sentiment: 'positivo', risk_level: 'alto', summary: 'Resumo', recommended_action: 'Responder' }],
      comments: [{ id: 'c1', instagram_comment_id: 'ig-1', post_id: 'post-1', comment_user: 'eleitor', comment_text: 'Comentário', like_count: 8, collected_at: '2026-08-21T11:00:00Z' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    expect(screen.getByText('25 likes')).toBeInTheDocument();
    expect(screen.getByText('Métricas separadas; ausências não são convertidas em zero')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Prestação de contas'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Responder')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra empty state sem fabricar indicadores', () => {
    render(<InstagramIntelligenceDashboard contract={buildInstagramUiContract({ posts: [], comments: [], analyses: [] })} />);
    expect(screen.getByText('Nenhuma publicação encontrada')).toBeInTheDocument();
  });
});
