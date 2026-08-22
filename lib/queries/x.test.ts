import { describe, it, expect } from 'vitest';
import { buildXApplicationPosts, computeXKPIs, computeXChartData, computeXAlert, intersectXTargetScope } from './x';

let postSequence = 0;

function post(overrides: Partial<{
  totalEngagement: number; sentiment: string; risk: string; created_at: string; crisisTemperature: number; polarizationLevel: string; topic: string;
}> = {}) {
  return {
    id: `p${++postSequence}`,
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
    const replies = [{ id: 'r1' }] as unknown as Parameters<typeof computeXKPIs>[1];
    const kpis = computeXKPIs(posts as unknown as Parameters<typeof computeXKPIs>[0], replies);
    expect(kpis.find((k) => k.title === 'Posts Monitorados')?.value).toBe(2);
    expect(kpis.find((k) => k.title === 'Replies Coletadas')?.value).toBe(1);
    expect(kpis.find((k) => k.title === 'Engajamento Total')?.value).toBe(15);
  });

  it('risco alto conta "alto" e "critico"', () => {
    const posts = [post({ risk: 'alto' }), post({ risk: 'critico' }), post({ risk: 'baixo' })];
    const kpis = computeXKPIs(posts as unknown as Parameters<typeof computeXKPIs>[0], []);
    expect(kpis.find((k) => k.title === 'Posts c/ Risco Alto')?.value).toBe(2);
  });
});

const canonicalRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'external-1', platform_post_id: '2090982456199434308', platform: 'x', client_id: 'client-1',
  target_id: null, social_account_id: null, content_origin: 'EXTERNAL', caption: 'Michelle no texto',
  taken_at: '2026-08-22T02:00:40Z', like_count: 0, comment_count: 0, share_count: 0,
  raw_json: { core: { user_results: { result: { rest_id: 'u1', is_blue_verified: true, legacy: { screen_name: 'autor', name: 'Autor', followers_count: 10 } } } } },
  ...overrides,
});
const association = (overrides: Record<string, unknown> = {}) => ({ post_id: 'external-1', target_id: 'target-1', client_id: 'client-1', match_type: 'term_in_text', match_term: 'Michelle Bolsonaro', discovery_source: 'search', ...overrides });
const analysis = (overrides: Record<string, unknown> = {}) => ({ content_id: 'external-1', sentiment: 'neutro', risk_level: 'baixo', risk_reason: 'Baixo impacto', ai_topic: 'Política', ai_topics: ['Política'], summary: 'Resumo', recommended_action: 'Monitorar', public_reaction: 'dividida', author_tone: 'informativo', polarization_level: 'baixo', crisis_temperature: 'fria', strategic_reading: 'Leitura', engagement_quality: 'orgânico', confidence_score: 0, ...overrides });
const target = (overrides: Record<string, unknown> = {}) => ({ id: 'target-1', candidate_name: 'Michelle Bolsonaro', client_id: 'client-1', ...overrides });

describe('integração pura X V2 — OWNED + EXTERNAL', () => {
  it('inclui EXTERNAL com target_id e social_account_id nulos via associação', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [analysis()], targets: [target()] });
    expect(post).toMatchObject({ origin: 'EXTERNAL', targetIds: ['target-1'], candidate_name: 'Michelle Bolsonaro' });
  });

  it('preserva match type, term e discovery source', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [], targets: [target()] });
    expect(post.targetAssociations[0]).toEqual({ targetId: 'target-1', matchType: 'term_in_text', matchTerm: 'Michelle Bolsonaro', discoverySource: 'search' });
  });

  it('agrega duas associações no mesmo post sem duplicá-lo', () => {
    const posts = buildXApplicationPosts({ rows: [canonicalRow(), canonicalRow({ id: 'duplicate-row' })], associations: [association(), association({ target_id: 'target-2', match_term: 'Outra' })], analyses: [], targets: [target(), target({ id: 'target-2', candidate_name: 'Outra Pessoa' })] });
    expect(posts).toHaveLength(1);
    expect(posts[0].targetIds).toEqual(['target-1', 'target-2']);
  });

  it('mapeia autor externo defensivamente', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [], targets: [target()] });
    expect(post.author).toMatchObject({ username: 'autor', displayName: 'Autor', verified: true, followers: 10 });
  });

  it('entrega IA de EXTERNAL e mantém enums reais', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [analysis()], targets: [target()] });
    expect(post).toMatchObject({ sentiment: 'neutro', risk: 'baixo', summary: 'Resumo', recommendedAction: 'Monitorar', crisis_temperature: 'fria' });
  });

  it('mantém OWNED por target direto e IA', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow({ id: 'owned-1', platform_post_id: 'owned-x', target_id: 'target-1', content_origin: 'OWNED' })], associations: [], analyses: [analysis({ content_id: 'owned-1', sentiment: 'negativo', risk_level: 'alto' })], targets: [target()] });
    expect(post).toMatchObject({ origin: 'OWNED', targetIds: ['target-1'], sentiment: 'negativo', risk: 'alto' });
  });

  it('filtra por origem e matched term', () => {
    const posts = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [], targets: [target()], filters: { origin: 'EXTERNAL', matchedTerm: 'bolsonaro' } });
    expect(posts).toHaveLength(1);
    expect(buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [], targets: [target()], filters: { origin: 'OWNED' } })).toHaveLength(0);
  });

  it('busca texto, autor e matched term', () => {
    for (const search of ['michelle', 'autor', 'bolsonaro']) expect(buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [], targets: [target()], filters: { search } })).toHaveLength(1);
  });

  it('filtra sentimento, risco e tópico', () => {
    expect(buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [analysis()], targets: [target()], filters: { sentiment: 'neutro', risk: 'baixo', topic: 'política' } })).toHaveLength(1);
  });

  it('intersecta allowedTargetIds e bloqueia target não autorizado', () => {
    expect(intersectXTargetScope(['target-1', 'target-2'], ['target-1'])).toEqual(['target-1']);
    expect(intersectXTargetScope(undefined, [])).toEqual([]);
  });

  it('preserva métricas ausentes sem convertê-las em zero no contrato canônico', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow({ view_count: null })], associations: [association()], analyses: [], targets: [target()] });
    expect(post.metrics.views).toEqual({ value: null, available: false });
  });

  it('não fabrica sinais nem recomendação quando IA está ausente', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [], targets: [target()] });
    expect(post).toMatchObject({ aiCompleteness: 'MISSING', sentiment: null, risk: null, authorTone: null, publicReaction: null, polarizationLevel: null, crisisTemperature: null, recommendedAction: null, strategicReading: null });
  });

  it('expõe análise parcial sem tratá-la como completa', () => {
    const [post] = buildXApplicationPosts({ rows: [canonicalRow()], associations: [association()], analyses: [analysis({ recommended_action: null })], targets: [target()] });
    expect(post.aiCompleteness).toBe('PARTIAL');
    expect(post.recommendedAction).toBeNull();
  });
});

describe('computeXChartData — núcleo puro extraído de getXChartData (Sprint 3)', () => {
  it('distribui os 4 buckets de sentimento (incl. Misto)', () => {
    const posts = [post({ sentiment: 'positivo' }), post({ sentiment: 'misto' }), post({ sentiment: 'misto' })];
    const chart = computeXChartData(posts as unknown as Parameters<typeof computeXChartData>[0], []);
    expect(chart.sentimentData.find((s) => s.name === 'Misto')?.value).toBe(2);
  });

  it('top temas ordenado por frequência, limitado a 10', () => {
    const posts = [
      post({ topic: 'economia' }),
      post({ topic: 'economia' }),
      post({ topic: 'saude' }),
    ];
    const chart = computeXChartData(posts as unknown as Parameters<typeof computeXChartData>[0], []);
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
    const alert = computeXAlert(posts as unknown as Parameters<typeof computeXAlert>[0]);
    expect(alert?.risk).toBe('critico');
  });

  it('retorna null quando não há posts de risco alto/crítico', () => {
    const posts = [post({ risk: 'baixo' }), post({ risk: 'medio' })];
    expect(computeXAlert(posts as unknown as Parameters<typeof computeXAlert>[0])).toBeNull();
  });
});
