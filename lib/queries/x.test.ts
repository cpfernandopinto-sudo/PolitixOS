import { describe, it, expect } from 'vitest';
import { computeXKPIs, computeXChartData, computeXAlert } from './x';

function post(overrides: Partial<{
  totalEngagement: number; sentiment: string; risk: string; created_at: string; crisisTemperature: number; polarizationLevel: string; topic: string;
}> = {}) {
  return {
    id: 'p1',
    source: 'x',
    target_id: null,
    candidate_name: '—',
    text: '',
    created_at: '2026-01-01T00:00:00.000Z',
    like_count: 0,
    reply_count: 0,
    share_count: 0,
    retweet_count: 0,
    url: '#',
    sentiment: 'neutro',
    risk: 'baixo',
    topic: 'Sem análise',
    ai_topic: 'Sem análise',
    keywords: 'Sem análise',
    recommendedAction: 'Sem análise',
    authorTone: 'Neutro',
    publicReaction: 'Neutro',
    public_reaction: 'Neutro',
    crisisTemperature: 0,
    crisis_temperature: 0,
    polarizationLevel: 'Baixo',
    polarization_level: 'Baixo',
    strategicReading: 'Sem análise',
    totalEngagement: 0,
    engagement: 0,
    impactScore: 0,
    crisisScore: 0,
    divergenceFlag: false,
    divergenceType: 'Nenhum',
    priorityLevel: 'Baixa',
    ...overrides,
  };
}

describe('computeXKPIs — núcleo puro extraído de getXKPIs (Sprint 3)', () => {
  it('conta posts/replies e soma engajamento total', () => {
    const posts = [post({ totalEngagement: 10 }), post({ totalEngagement: 5 })];
    const replies = [{ id: 'r1' } as any];
    const kpis = computeXKPIs(posts as any, replies);
    expect(kpis.find((k) => k.title === 'Posts Monitorados')?.value).toBe(2);
    expect(kpis.find((k) => k.title === 'Replies Coletadas')?.value).toBe(1);
    expect(kpis.find((k) => k.title === 'Engajamento Total')?.value).toBe(15);
  });

  it('risco alto conta "alto" e "critico"', () => {
    const posts = [post({ risk: 'alto' }), post({ risk: 'critico' }), post({ risk: 'baixo' })];
    const kpis = computeXKPIs(posts as any, []);
    expect(kpis.find((k) => k.title === 'Posts c/ Risco Alto')?.value).toBe(2);
  });
});

describe('computeXChartData — núcleo puro extraído de getXChartData (Sprint 3)', () => {
  it('distribui os 4 buckets de sentimento (incl. Misto)', () => {
    const posts = [post({ sentiment: 'positivo' }), post({ sentiment: 'misto' }), post({ sentiment: 'misto' })];
    const chart = computeXChartData(posts as any, []);
    expect(chart.sentimentData.find((s) => s.name === 'Misto')?.value).toBe(2);
  });

  it('top temas ordenado por frequência, limitado a 10', () => {
    const posts = [
      post({ topic: 'economia' }),
      post({ topic: 'economia' }),
      post({ topic: 'saude' }),
    ];
    const chart = computeXChartData(posts as any, []);
    expect(chart.themes[0]).toEqual({ name: 'economia', value: 2 });
  });
});

describe('computeXAlert — núcleo puro extraído de getXAlert (Sprint 3)', () => {
  it('retorna o post de maior engajamento entre os de risco alto/crítico', () => {
    const posts = [
      post({ risk: 'baixo', totalEngagement: 999 }),
      post({ risk: 'alto', totalEngagement: 10 }),
      post({ risk: 'critico', totalEngagement: 50 }),
    ];
    const alert = computeXAlert(posts as any);
    expect(alert?.risk).toBe('critico');
  });

  it('retorna null quando não há posts de risco alto/crítico', () => {
    const posts = [post({ risk: 'baixo' }), post({ risk: 'medio' })];
    expect(computeXAlert(posts as any)).toBeNull();
  });
});
