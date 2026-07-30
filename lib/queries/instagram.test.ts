import { describe, it, expect } from 'vitest';
import { computeInstagramKPIs, computeInstagramChartData } from './instagram';

function post(overrides: Partial<{ like_count: number; comment_count: number; sentiment: string; risk: string; text: string }> = {}) {
  return {
    id: 'p1',
    target_id: null,
    candidate_name: '—',
    text: '',
    created_at: '2026-01-01T00:00:00.000Z',
    like_count: 0,
    comment_count: 0,
    url: '#',
    image_url: null,
    video_url: null,
    thumbnail_url: null,
    media_type: null,
    sentiment: 'neutro',
    risk: 'baixo',
    topic: 'Sem análise',
    topics: [] as string[],
    riskReason: 'Sem análise',
    summary: 'Sem análise',
    recommendedAction: 'Sem análise',
    ...overrides,
  };
}

function comment(overrides: Partial<{ like_count: number; created_at: string }> = {}) {
  return {
    id: 'c1',
    text: '',
    created_at: '2026-01-01T00:00:00.000Z',
    like_count: 0,
    post_id: 'p1',
    post_url: '#',
    post_caption: '',
    ...overrides,
  };
}

describe('computeInstagramKPIs — núcleo puro extraído de getInstagramKPIs (Sprint 3)', () => {
  it('conta posts/comentários e soma engajamento (likes+comments de posts, likes de comentários)', () => {
    const posts = [post({ like_count: 10, comment_count: 2 }), post({ like_count: 5, comment_count: 1 })];
    const comments = [comment({ like_count: 3 }), comment({ like_count: 1 })];

    const kpis = computeInstagramKPIs(posts, comments);

    expect(kpis.find((k) => k.title === 'Posts Monitorados')?.value).toBe(2);
    expect(kpis.find((k) => k.title === 'Total Comentários')?.value).toBe(2);
    // (10+2) + (5+1) + 3 + 1 = 22
    expect(kpis.find((k) => k.title === 'Engajamento Total')?.value).toBe(22);
  });

  it('classifica sentimento e risco corretamente', () => {
    const posts = [
      post({ sentiment: 'positivo' }),
      post({ sentiment: 'negativo' }),
      post({ sentiment: 'negativo' }),
      post({ risk: 'alto' }),
    ];
    const kpis = computeInstagramKPIs(posts, []);
    expect(kpis.find((k) => k.title === 'Posts Positivos')?.value).toBe(1);
    expect(kpis.find((k) => k.title === 'Posts Negativos')?.value).toBe(2);
    expect(kpis.find((k) => k.title === 'Posts c/ Risco Alto')?.value).toBe(1);
  });

  it('lida com listas vazias sem lançar erro', () => {
    const kpis = computeInstagramKPIs([], []);
    expect(kpis.every((k) => k.value === 0)).toBe(true);
  });
});

describe('computeInstagramChartData — núcleo puro extraído de getInstagramChartData (Sprint 3)', () => {
  it('agrupa sentimento (neutro e misto somados) e risco', () => {
    const posts = [
      post({ sentiment: 'positivo' }),
      post({ sentiment: 'neutro' }),
      post({ sentiment: 'misto' }),
      post({ sentiment: 'positivo', risk: 'alto' }),
    ];
    const chart = computeInstagramChartData(posts, []);
    expect(chart.sentimentData.find((s) => s.name === 'Positivo')?.value).toBe(2);
    expect(chart.sentimentData.find((s) => s.name === 'Neutro')?.value).toBe(2);
    expect(chart.riskData.find((r) => r.name === 'Alto')?.value).toBe(1);
  });

  it('top 5 por engajamento vem ordenado desc por like+comment', () => {
    const posts = [post({ like_count: 1, comment_count: 0, text: 'baixo' }), post({ like_count: 100, comment_count: 0, text: 'alto' })];
    const chart = computeInstagramChartData(posts, []);
    expect(chart.topEng[0].name).toBe('alto');
  });

  it('sem posts retorna placeholders, não lista vazia', () => {
    const chart = computeInstagramChartData([], []);
    expect(chart.topEng).toEqual([{ name: 'Sem posts', value: 0 }]);
    expect(chart.byDay).toEqual([{ date: 'Sem dados', count: 0 }]);
  });
});
