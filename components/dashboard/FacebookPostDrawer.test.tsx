// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FacebookPostDrawer from './FacebookPostDrawer';
import type { FacebookPostWithAnalysis } from '@/lib/queries/facebook';

function item(overrides: Partial<FacebookPostWithAnalysis['post']> = {}, audience: FacebookPostWithAnalysis['audience'] = null): FacebookPostWithAnalysis {
  return {
    post: {
      id: 'post-1', client_id: 'c1', target_id: 't1', social_account_id: 'a1', platform: 'facebook',
      platform_post_id: 'ext-1', post_url: 'https://facebook.com/post-1', caption: 'Texto do post',
      media_type: null, media_url: null, thumbnail_url: null, taken_at: '2026-08-22T10:00:00Z',
      like_count: 10, comment_count: 0, share_count: 2, total_engagement: 12, raw_json: {},
      ...overrides,
    },
    audience,
    analysis: null,
  };
}

describe('FacebookPostDrawer — cobertura de comentários (transparência, não redesenho)', () => {
  it('não exibe o bloco de cobertura quando o post não tem comentários públicos', () => {
    render(<FacebookPostDrawer item={item({ comment_count: 0 })} onClose={() => {}} />);
    expect(screen.queryByText('Cobertura de Comentários')).not.toBeInTheDocument();
  });

  it('exibe públicos/coletados/analisados sem insinuar que 100% dos públicos foram analisados', () => {
    render(<FacebookPostDrawer item={item({ comment_count: 1114, comments_collected: 300 }, {
      audienceSentiment: 'NEGATIVE', audienceSentimentScore: -0.6, supportLevel: 'baixo', rejectionLevel: 'alto',
      polarizationLevel: 'alta', commentsAnalyzed: 50, dominantAudienceThemes: [], messageAudienceDivergence: 'audiência mais crítica que o post',
    })} onClose={() => {}} />);
    expect(screen.getByText('Cobertura de Comentários')).toBeInTheDocument();
    expect(screen.getByText('1.114')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('audiência mais crítica que o post')).toBeInTheDocument();
    expect(screen.getByText(/utiliza uma amostra dos comentários coletados/)).toBeInTheDocument();
  });

  it('avisa quando comentários públicos existem mas ainda não foram coletados (transparência de estado, não erro)', () => {
    render(<FacebookPostDrawer item={item({ comment_count: 89, comments_collected: 0 })} onClose={() => {}} />);
    expect(screen.getByText(/ainda não foram coletados/)).toBeInTheDocument();
  });
});
