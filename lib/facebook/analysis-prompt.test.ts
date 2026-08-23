import { describe, expect, it } from 'vitest';
import { toFacebookAnalyticsContract } from './analytics-contract';
import { buildFacebookAnalysisPrompt, FacebookAnalysisOutputSchema } from './analysis-prompt';

const row = {
  id: 'post-1',
  client_id: 'client-1',
  target_id: 'target-1',
  content_origin: 'OWNED',
  content_type: 'IMAGE',
  caption: 'URGENTE: texto do post',
  taken_at: '2026-08-22T16:21:18Z',
  post_url: 'https://facebook.com/post-1',
  raw_json: {
    reactions_count: 19,
    reactions: { like: 17, love: 2, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    comments_count: 24,
  },
};

describe('buildFacebookAnalysisPrompt', () => {
  it('nunca envia "curtidas" nem like_count=0 para o modelo', () => {
    const { user, system } = buildFacebookAnalysisPrompt(toFacebookAnalyticsContract(row));
    expect(user).not.toMatch(/curtidas/i);
    expect(user).not.toMatch(/like_count/i);
    expect(system + user).not.toMatch(/likes?:\s*0\b/i);
  });

  it('envia reactions_total e o breakdown completo, rotulado como facebook', () => {
    const { user } = buildFacebookAnalysisPrompt(toFacebookAnalyticsContract(row));
    expect(user).toContain('platform: facebook');
    expect(user).toContain('reactions_total: 19');
    expect(user).toContain('reaction_like: 17');
    expect(user).toContain('reaction_angry: 0');
  });

  it('declara explicitamente que o texto dos comentários não está disponível', () => {
    const { user } = buildFacebookAnalysisPrompt(toFacebookAnalyticsContract(row));
    expect(user).toContain('comments_text: unavailable');
    expect(user).toContain('comments_count: 24');
  });

  it('instrui o modelo a não tratar reações como sentimento determinístico', () => {
    expect(FacebookAnalysisOutputSchema).toBeDefined();
    const { system } = buildFacebookAnalysisPrompt(toFacebookAnalyticsContract(row));
    expect(system).toMatch(/não é sentimento|não são sentimento/i);
    expect(system).toMatch(/haha/i);
    expect(system).toMatch(/angry/i);
  });

  it('mostra "não disponível" em vez de zero quando um campo de engagement é desconhecido', () => {
    const { user } = buildFacebookAnalysisPrompt(toFacebookAnalyticsContract({ ...row, raw_json: {} }));
    expect(user).toContain('reactions_total: não disponível');
    expect(user).toContain('comments_count: não disponível');
  });
});

describe('FacebookAnalysisOutputSchema', () => {
  it('aceita um output completo e válido', () => {
    const result = FacebookAnalysisOutputSchema.safeParse({
      sentiment: 'neutro', risk_level: 'baixo', risk_reason: 'sem indícios de crise',
      ai_topic: 'tema', ai_topics: ['a'], ai_entities: ['b'], ai_keywords: ['c'],
      summary: 'resumo', recommended_action: 'monitorar', author_tone: 'institucional',
      public_reaction: 'moderada', polarization_level: 'baixa', crisis_temperature: 'fria',
      strategic_reading: 'leitura', engagement_quality: 'organico', confidence_score: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita confidence_score fora do intervalo 0-1', () => {
    const result = FacebookAnalysisOutputSchema.safeParse({
      sentiment: 'neutro', risk_level: 'baixo', risk_reason: 'x', ai_topic: 'x',
      summary: 'x', recommended_action: 'x', author_tone: 'x', public_reaction: 'x',
      polarization_level: 'x', crisis_temperature: 'x', strategic_reading: 'x',
      engagement_quality: 'x', confidence_score: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita output sem os campos obrigatórios', () => {
    const result = FacebookAnalysisOutputSchema.safeParse({ sentiment: 'neutro' });
    expect(result.success).toBe(false);
  });
});
