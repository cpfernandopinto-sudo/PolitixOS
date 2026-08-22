import { describe, expect, it } from 'vitest';
import { deduplicateXPosts, mapXPost, mapXReply, pageOf } from './v2-contract';
import { planXV2Query } from '@/lib/queries/x-v2';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1', platform_post_id: 'x-123', client_id: 'client-1', target_id: 'target-1',
  caption: 'texto', taken_at: '2026-08-20T12:00:00Z', like_count: null, comment_count: null,
  share_count: null, view_count: null, ...overrides,
});

describe('contrato X V2', () => {
  it('não fabrica origem para legado e aceita OWNED/EXTERNAL', () => {
    expect(mapXPost(row()).origin).toBe('UNKNOWN');
    expect(mapXPost(row({ content_origin: 'OWNED' })).origin).toBe('OWNED');
    expect(mapXPost(row({ content_origin: 'EXTERNAL' })).origin).toBe('EXTERNAL');
  });

  it('representa múltiplos targets e matchedTerms sem duplicar entidade', () => {
    const post = mapXPost(row(), null, [
      { targetId: 'target-1', matchedTerm: 'Ana' }, { targetId: 'target-2', matchedTerm: 'Bruno' },
    ]);
    expect(post.targetIds).toEqual(['target-1', 'target-2']);
    expect(post.matchedTerms).toEqual(['Ana', 'Bruno']);
  });

  it('preserva métricas ausentes como unavailable e métricas completas, inclusive zero real', () => {
    expect(mapXPost(row()).metrics.likes).toEqual({ value: null, available: false });
    const post = mapXPost(row({ like_count: 0, comment_count: 2, share_count: 3, view_count: 4, raw_json: { legacy: { quote_count: 5, bookmark_count: 6 } } }));
    expect(post.metrics.likes).toEqual({ value: 0, available: true });
    expect(post.metrics.quotes.value).toBe(5);
    expect(post.metrics.bookmarks.value).toBe(6);
    expect(post.quotePosts).toBeNull();
  });

  it('mapeia autor externo e IA completa, mantendo IA ausente como null', () => {
    const raw_json = { core: { user_results: { result: { rest_id: 'u1', is_blue_verified: true, legacy: { screen_name: 'ana', name: 'Ana', followers_count: 12 } } } } };
    expect(mapXPost(row({ raw_json })).author).toEqual({ externalUserId: 'u1', username: 'ana', displayName: 'Ana', followers: 12, verified: true });
    expect(mapXPost(row()).analysis).toBeNull();
    const analysis = mapXPost(row(), { sentiment: 'negativo', risk_level: 'alto', risk_reason: 'r', ai_topics: ['saúde'], summary: 's', recommended_action: 'a', public_reaction: 'contrária', author_tone: 'duro', polarization_level: 'alto', crisis_temperature: 8, strategic_reading: 'l', engagement_quality: 'orgânico', confidence_score: 0.9 }).analysis;
    expect(analysis).toMatchObject({ sentiment: 'negativo', risk: 'alto', topics: ['saúde'], confidenceScore: 0.9 });
  });

  it('mapeia replies com e sem parent e herda escopo do post', () => {
    const base = { id: 'r1', tweet_reply_id: 'xr1', post_id: 'post-1', reply_text: 'oi' };
    expect(mapXReply(base).parentReplyId).toBeNull();
    const reply = mapXReply({ ...base, parent_reply_id: 'xr0', conversation_id: 'c1' }, { clientId: 'client-1', targetIds: ['t1', 't2'] });
    expect(reply).toMatchObject({ parentReplyId: 'xr0', conversationId: 'c1', clientId: 'client-1', targetIds: ['t1', 't2'] });
  });

  it('deduplica somente pela identidade externa e agrega associações', () => {
    const a = mapXPost(row(), null, [{ targetId: 't1', matchedTerm: 'a' }]);
    const b = mapXPost(row({ id: 'post-2', caption: 'texto diferente' }), null, [{ targetId: 't2', matchedTerm: 'b' }]);
    expect(deduplicateXPosts([a, b])).toHaveLength(1);
    expect(deduplicateXPosts([a, b])[0].targetIds).toEqual(['target-1', 't1', 't2']);
  });

  it('separa página visual de total analítico e cobre volume maior que o limite', () => {
    const page = pageOf(Array.from({ length: 120 }, (_, i) => i), 120, 0, 25);
    expect(page).toMatchObject({ totalAvailable: 120, totalLoaded: 25, isComplete: false, limit: 25 });
    expect(pageOf(Array.from({ length: 120 }, (_, i) => i), 120, 100, 25).isComplete).toBe(true);
  });

  it('intersecta targets com o escopo tenant e expõe filtros bloqueados pelo schema', () => {
    const plan = planXV2Query({ clientId: 'c1', allowedTargetIds: ['t1'], targetIds: ['t1', 't2'], origin: 'EXTERNAL', matchedTerm: 'ana', limit: 1000 });
    expect(plan.targetIds).toEqual(['t1']);
    expect(plan.limit).toBe(100);
    expect(plan.unsupportedFilters).toEqual(['origin', 'matchedTerm']);
  });
});
