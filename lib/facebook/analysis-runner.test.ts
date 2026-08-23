import { describe, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { runFacebookAnalysis, type FacebookAnalysisDbClient } from './analysis-runner';

const validOutput = {
  sentiment: 'neutro', risk_level: 'baixo', risk_reason: 'sem indícios de crise',
  ai_topic: 'tema', ai_topics: ['a'], ai_entities: [], ai_keywords: [],
  summary: 'resumo', recommended_action: 'monitorar', author_tone: 'institucional',
  public_reaction: 'moderada', polarization_level: 'baixa', crisis_temperature: 'fria',
  strategic_reading: 'leitura', engagement_quality: 'organico', confidence_score: 0.9,
};

function geminiStub(output: unknown, finishReason: string = 'STOP') {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: output === null ? undefined : JSON.stringify(output),
        candidates: [{ finishReason }],
      }),
    },
  } as unknown as GoogleGenAI;
}

function dbStub(rows: Array<Record<string, unknown>>, existingAnalysisIds: string[] = []) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === 'facebook_posts_pending_analysis') {
      const chain = { eq: vi.fn(), limit: vi.fn().mockResolvedValue({ data: rows, error: null }) };
      chain.eq.mockReturnValue(chain);
      return { select: vi.fn().mockReturnValue(chain) };
    }
    if (table === 'ai_analysis') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, value: string) => ({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: existingAnalysisIds.includes(value) ? { id: 'existing' } : null, error: null }),
            }),
          })),
        })),
        insert,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { db: { from } as unknown as FacebookAnalysisDbClient, insert };
}

const post1 = {
  id: 'post-1', client_id: 'client-1', target_id: 'target-1', content_origin: 'OWNED', content_type: 'IMAGE',
  caption: 'texto', taken_at: '2026-08-22T00:00:00Z', post_url: 'https://facebook.com/post-1',
  raw_json: { reactions_count: 19, reactions: { like: 17 }, comments_count: 24 }, comment_count: 24, share_count: 0,
};

describe('runFacebookAnalysis', () => {
  it('processa post elegível e persiste em ai_analysis com content_type=post e platform=facebook', async () => {
    const { db, insert } = dbStub([post1]);
    const geminiClient = geminiStub(validOutput);

    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    expect(summary).toMatchObject({ eligible: 1, processed: 1, success: 1, failed: 0, skipped: 0 });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      content_id: 'post-1', content_type: 'post', platform: 'facebook', client_id: 'client-1', target_id: 'target-1',
      sentiment: 'neutro', risk_level: 'baixo', confidence_score: 0.9,
      raw_ai_response: expect.objectContaining({ provider: 'gemini', model: 'gemini-2.5-flash' }),
    }));
  });

  it('nunca envia like_count nem trata reactionsTotal como likes — verificado via o prompt efetivamente enviado', async () => {
    const { db } = dbStub([post1]);
    const generateContent = vi.fn().mockResolvedValue({ text: JSON.stringify(validOutput), candidates: [{ finishReason: 'STOP' }] });
    const geminiClient = { models: { generateContent } } as unknown as GoogleGenAI;

    await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    const sentPrompt = generateContent.mock.calls[0][0].contents as string;
    expect(sentPrompt).not.toMatch(/like_count/i);
    expect(sentPrompt).toContain('reactions_total: 19');
  });

  it('usa structured output com JSON Schema (output_config) para o modelo nunca fugir do formato', async () => {
    const { db } = dbStub([post1]);
    const generateContent = vi.fn().mockResolvedValue({ text: JSON.stringify(validOutput), candidates: [{ finishReason: 'STOP' }] });
    const geminiClient = { models: { generateContent } } as unknown as GoogleGenAI;

    await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    const call = generateContent.mock.calls[0][0];
    expect(call.model).toBe('gemini-2.5-flash');
    expect(call.config.responseMimeType).toBe('application/json');
    expect(call.config.responseJsonSchema.properties.risk_level.enum).toEqual(['baixo', 'medio', 'alto', 'critico']);
    expect(call.config.responseJsonSchema.properties.sentiment.enum).toEqual(['positivo', 'negativo', 'neutro', 'misto']);
    expect(call.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('é idempotente: pula posts que já têm ai_analysis, sem reprocessar nem duplicar', async () => {
    const { db, insert } = dbStub([post1], ['post-1']);
    const geminiClient = geminiStub(validOutput);

    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    expect(summary).toMatchObject({ eligible: 1, processed: 1, success: 0, skipped: 1, failed: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  it('falha fechada (sem persistir) quando o output não passa na validação zod (rede de segurança além do JSON Schema)', async () => {
    const { db, insert } = dbStub([post1]);
    const geminiClient = geminiStub({ sentiment: 'neutro' });

    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    expect(summary).toMatchObject({ success: 0, failed: 1 });
    expect(summary.items[0]).toMatchObject({ outcome: 'failed', reason: 'SCHEMA_VALIDATION_FAILED' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('falha fechada quando o modelo não produz output estruturado (parsed_output null)', async () => {
    const { db, insert } = dbStub([post1]);
    const geminiClient = geminiStub(null);

    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    expect(summary).toMatchObject({ success: 0, failed: 1 });
    expect(summary.items[0]).toMatchObject({ outcome: 'failed', reason: 'MODEL_RESPONSE_NOT_JSON' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('falha fechada quando o Gemini recusa por safety', async () => {
    const { db, insert } = dbStub([post1]);
    const geminiClient = geminiStub(null, 'SAFETY');

    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    expect(summary).toMatchObject({ success: 0, failed: 1 });
    expect(summary.items[0]).toMatchObject({ outcome: 'failed', reason: 'FACEBOOK_ANALYSIS_MODEL_REFUSAL' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('isola falha de um post sem abortar o restante do lote', async () => {
    const post2 = { ...post1, id: 'post-2' };
    const { db } = dbStub([post1, post2]);
    const generateContent = vi.fn()
      .mockResolvedValueOnce({ text: undefined, candidates: [{ finishReason: 'STOP' }] })
      .mockResolvedValueOnce({ text: JSON.stringify(validOutput), candidates: [{ finishReason: 'STOP' }] });
    const geminiClient = { models: { generateContent } } as unknown as GoogleGenAI;

    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });

    expect(summary).toMatchObject({ eligible: 2, processed: 2, success: 1, failed: 1 });
  });

  it('exige escopo de tenant/target explícito', async () => {
    const { db } = dbStub([]);
    await expect(runFacebookAnalysis({ clientId: '', targetId: 'target-1', db })).rejects.toThrow('FACEBOOK_ANALYSIS_SCOPE_INVALID');
  });

  it('falha fechada quando não há credencial de IA disponível', async () => {
    const { db } = dbStub([post1]);
    await expect(runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, apiKey: '' })).rejects.toThrow('FACEBOOK_ANALYSIS_PROVIDER_CREDENTIAL_MISSING');
  });

  it('respeita maxPosts para conter custo', async () => {
    const { db } = dbStub([post1]);
    const limitSpy = vi.fn().mockResolvedValue({ data: [post1], error: null });
    (db.from as ReturnType<typeof vi.fn>).mockImplementationOnce((table: string) => {
      if (table !== 'facebook_posts_pending_analysis') throw new Error('unexpected');
      const chain = { eq: vi.fn(), limit: limitSpy };
      chain.eq.mockReturnValue(chain);
      return { select: vi.fn().mockReturnValue(chain) };
    });
    const geminiClient = geminiStub(validOutput);

    await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient, maxPosts: 3 });
    expect(limitSpy).toHaveBeenCalledWith(3);
  });

  it.each([
    [{ ...validOutput, risk_level: 'extremo' }],
    [{ ...validOutput, sentiment: 'negative' }],
  ])('rejeita enums incompatíveis com o banco e consumidores', async (output) => {
    const { db, insert } = dbStub([post1]);
    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient: geminiStub(output) });
    expect(summary).toMatchObject({ success: 0, failed: 1 });
    expect(summary.items[0]).toMatchObject({ outcome: 'failed', reason: 'SCHEMA_VALIDATION_FAILED' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('classifica erro do Gemini e preserva isolamento por post', async () => {
    const post2 = { ...post1, id: 'post-2' };
    const { db } = dbStub([post1, post2]);
    const generateContent = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ text: JSON.stringify(validOutput), candidates: [{ finishReason: 'STOP' }] });
    const geminiClient = { models: { generateContent } } as unknown as GoogleGenAI;
    const summary = await runFacebookAnalysis({ clientId: 'client-1', targetId: 'target-1', db, geminiClient });
    expect(summary).toMatchObject({ eligible: 2, success: 1, failed: 1 });
    expect(summary.items[0].reason).toContain('Erro de rede na chamada ao provider Gemini');
  });
});
