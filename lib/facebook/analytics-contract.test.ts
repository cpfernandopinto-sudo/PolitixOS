import { describe, expect, it } from 'vitest';
import { computeFacebookEngagementTotal, toFacebookAnalyticsContract } from './analytics-contract';

const baseRow = {
  id: 'post-1',
  client_id: 'client-1',
  target_id: 'target-1',
  content_origin: 'OWNED',
  content_type: 'IMAGE',
  caption: 'Texto do post',
  taken_at: '2026-08-22T00:00:00Z',
  post_url: 'https://facebook.com/post-1',
  raw_json: {
    reactions_count: 19,
    reactions: { like: 17, love: 2, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    comments_count: 24,
  },
};

describe('toFacebookAnalyticsContract', () => {
  it('nunca converte like_count ausente em zero: likes é sempre null', () => {
    const contract = toFacebookAnalyticsContract(baseRow);
    expect(contract.engagement.likes).toBeNull();
  });

  it('mapeia reactionsTotal para raw_json.reactions_count, nunca para likes', () => {
    const contract = toFacebookAnalyticsContract(baseRow);
    expect(contract.engagement.reactionsTotal).toBe(19);
  });

  it('preserva o breakdown completo de reações', () => {
    const contract = toFacebookAnalyticsContract(baseRow);
    expect(contract.engagement.reactionsBreakdown).toEqual({ like: 17, love: 2, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 });
  });

  it('marca texto de comentário como indisponível mesmo com contagem conhecida', () => {
    const contract = toFacebookAnalyticsContract(baseRow);
    expect(contract.engagement.comments).toEqual({ count: 24, textAvailable: false });
  });

  it('não simula reações/comentários quando raw_json não tem os campos', () => {
    const contract = toFacebookAnalyticsContract({ ...baseRow, raw_json: {} });
    expect(contract.engagement.reactionsTotal).toBeNull();
    expect(contract.engagement.comments.count).toBeNull();
    expect(contract.engagement.reactionsBreakdown).toEqual({ like: null, love: null, care: null, haha: null, wow: null, sad: null, angry: null });
  });
});

describe('computeFacebookEngagementTotal', () => {
  it('soma reactionsTotal + comments + shares', () => {
    const contract = toFacebookAnalyticsContract({ ...baseRow, share_count: 4 } as never);
    expect(computeFacebookEngagementTotal(contract)).toBe(19 + 24 + 4);
  });

  it('retorna null somente quando todas as parcelas são desconhecidas', () => {
    const contract = toFacebookAnalyticsContract({ ...baseRow, raw_json: {} });
    expect(computeFacebookEngagementTotal(contract)).toBeNull();
  });

  it('trata parcela ausente individual como zero na soma, sem ocultar a ausência do contrato', () => {
    const contract = toFacebookAnalyticsContract({ ...baseRow, raw_json: { reactions_count: 10 } });
    expect(contract.engagement.comments.count).toBeNull();
    expect(computeFacebookEngagementTotal(contract)).toBe(10);
  });

  it('nunca soma engagementTotal como se fosse sentimento — é apenas número agregado', () => {
    const contract = toFacebookAnalyticsContract(baseRow);
    const total = computeFacebookEngagementTotal(contract);
    expect(typeof total).toBe('number');
  });
});
