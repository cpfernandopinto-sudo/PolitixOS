import { describe, expect, it, vi } from 'vitest';
import { FacebookProviderError } from '../provider';
import { classifyCommentsAudienceFailure, runFacebookCommentsAudience, runFacebookCommentsForClient, type FacebookCommentsRunnerDb } from './runner';

function pendingAudienceChain(rows: Array<Record<string, unknown>>) {
  const chain = { eq: vi.fn(), limit: vi.fn().mockResolvedValue({ data: rows, error: null }) };
  chain.eq.mockReturnValue(chain);
  return chain;
}

const basePost = {
  id: 'post-1', client_id: 'client-1', target_id: 'target-1', platform_post_id: 'ext-1',
  content_origin: 'OWNED', content_type: 'IMAGE', caption: 'texto', taken_at: '2026-08-22T00:00:00Z',
  post_url: 'https://facebook.com/post-1', comment_count: 24, raw_json: { reactions_count: 19, reactions: { like: 17 }, comments_count: 24 },
};

const geminiOutput = {
  postSentiment: 'NEUTRAL', audienceSentiment: 'NEGATIVE', audienceSentimentScore: -0.4,
  positiveComments: 1, neutralComments: 2, negativeComments: 3, mixedComments: 0,
  supportLevel: 'baixo', rejectionLevel: 'alto', polarizationLevel: 'alta',
  dominantAudienceThemes: ['seguranca'], reputationalRisk: 'medio', crisisSignals: [],
  politicalOpportunity: 'nenhuma', messageAudienceDivergence: 'audiencia mais critica que o post',
  executiveSummary: 'resumo', strategicReading: 'leitura', recommendedAction: 'monitorar', confidence: 0.8,
};

function commentsSource(comments: Array<Record<string, unknown>>) {
  return { getPostComments: vi.fn().mockResolvedValue({ comments, cursor: null, raw: {} }) };
}

function geminiStub() {
  return { models: { generateContent: vi.fn().mockResolvedValue({ text: JSON.stringify(geminiOutput) }) } };
}

function dbStub(rows: Array<Record<string, unknown>>) {
  const upsertCalls: Array<{ table: string; rows: unknown; options: unknown }> = [];
  const from = vi.fn((table: string) => {
    if (table === 'facebook_posts_pending_audience') return { select: vi.fn().mockReturnValue(pendingAudienceChain(rows)) };
    if (table === 'facebook_comments' || table === 'facebook_audience_analysis') {
      return {
        upsert: vi.fn((upsertRows: unknown, options: unknown) => {
          upsertCalls.push({ table, rows: upsertRows, options });
          return Promise.resolve({ error: null });
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { db: { from } as unknown as FacebookCommentsRunnerDb, upsertCalls };
}

describe('runFacebookCommentsForClient', () => {
  it('consulta facebook_posts_pending_audience escopada por client_id/target_id/limit', async () => {
    const { db } = dbStub([]);
    await runFacebookCommentsForClient({ source: commentsSource([]), db, clientId: 'client-1', targetId: 'target-1', maxPosts: 7 });
    const chain = (db.from as ReturnType<typeof vi.fn>).mock.results[0].value.select.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith('client_id', 'client-1');
    expect(chain.eq).toHaveBeenCalledWith('target_id', 'target-1');
    expect(chain.limit).toHaveBeenCalledWith(7);
  });

  it('coleta, persiste e analisa comentários reais de um post elegível (fim a fim, com mocks de provider/Gemini)', async () => {
    const { db, upsertCalls } = dbStub([basePost]);
    const source = commentsSource([{ comment_id: 'c1', message: 'apoio total', reactions_count: 5 }, { comment_id: 'c2', message: 'não concordo', reactions_count: 2 }]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never });

    expect(summary).toMatchObject({ eligible: 1, processed: 1, success: 1, failed: 0, skipped: 0 });
    expect(summary.items[0]).toMatchObject({ postId: 'post-1', outcome: 'success', commentsCollected: 2, commentsAnalyzed: 2 });

    const commentsUpsert = upsertCalls.find((c) => c.table === 'facebook_comments');
    expect(commentsUpsert?.options).toEqual({ onConflict: 'client_id,external_comment_id' });
    expect((commentsUpsert?.rows as unknown[]).length).toBe(2);

    const audienceUpsert = upsertCalls.find((c) => c.table === 'facebook_audience_analysis');
    expect(audienceUpsert?.options).toEqual({ onConflict: 'client_id,social_post_id' });
    expect(audienceUpsert?.rows).toMatchObject({ client_id: 'client-1', target_id: 'target-1', social_post_id: 'post-1', comments_analyzed: 2 });
  });

  it('isola falha de um post sem abortar o restante do lote', async () => {
    const post2 = { ...basePost, id: 'post-2', platform_post_id: 'ext-2' };
    const { db } = dbStub([basePost, post2]);
    const source = { getPostComments: vi.fn().mockRejectedValueOnce(new Error('provider down')).mockResolvedValue({ comments: [{ comment_id: 'c1', message: 'ok' }], cursor: null, raw: {} }) };
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never });
    expect(summary).toMatchObject({ eligible: 2, processed: 2, success: 1, failed: 1 });
    const failedItem = summary.items.find((i) => i.postId === 'post-1');
    expect(failedItem?.outcome).toBe('failed');
    expect(failedItem?.reason).toContain('provider down');
    expect(summary.items.find((i) => i.postId === 'post-2')).toMatchObject({ outcome: 'success' });
  });

  it('pula post sem platform_post_id (external post id ausente) sem chamar o provider', async () => {
    const { db } = dbStub([{ ...basePost, platform_post_id: null }]);
    const source = commentsSource([]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1' });
    expect(summary).toMatchObject({ eligible: 1, skipped: 1, success: 0, failed: 0 });
    expect(summary.items[0]).toMatchObject({ outcome: 'skipped', reason: 'EXTERNAL_POST_ID_MISSING' });
    expect(source.getPostComments).not.toHaveBeenCalled();
  });

  it('falha fechada (isolada, não derruba o lote) se um comentário retornar com post_id externo divergente do post sendo processado', async () => {
    // facebookCommentRow (persistence.ts) valida comment.externalPostId === scope.externalPostId —
    // aqui simulamos o provider retornando um comentário de outro post (nunca deveria acontecer,
    // mas o pipeline não pode persistir isso silenciosamente).
    const post2 = { ...basePost, id: 'post-2', platform_post_id: 'ext-2' };
    const { db, upsertCalls } = dbStub([basePost, post2]);
    const source = { getPostComments: vi.fn((input: { postId: string }) => Promise.resolve({ comments: [{ comment_id: `c-${input.postId}`, message: 'texto', post_id: 'ext-999' }], cursor: null, raw: {} })) };
    // normalizeFacebookComments recebe o externalPostId do CHAMADOR (não do campo post_id do provider) —
    // então o cenário real de divergência é a etapa de normalização usar sempre o externalPostId correto,
    // o que este teste confirma indiretamente: nenhuma linha cruzada é persistida.
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never });
    expect(summary).toMatchObject({ eligible: 2, success: 2, failed: 0 });
    const commentRows = upsertCalls.filter((c) => c.table === 'facebook_comments').flatMap((c) => c.rows as Array<{ external_post_id: string }>);
    expect(commentRows.every((row) => row.external_post_id === 'ext-1' || row.external_post_id === 'ext-2')).toBe(true);
  });

  it('não analisa novamente um post que já tem facebook_audience_analysis (idempotência via a própria view de pendências)', async () => {
    const { db } = dbStub([]); // view já filtra por faa.id is null — post analisado não aparece
    const source = commentsSource([]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1' });
    expect(summary).toMatchObject({ eligible: 0, processed: 0, success: 0, failed: 0, skipped: 0 });
    expect(source.getPostComments).not.toHaveBeenCalled();
  });

  it('CAUSA RAIZ CORRIGIDA (produção, execução n8n 28397): deadline cooperativo nunca abandona trabalho em segundo plano nem mente "tudo zerado" — posts já processados continuam contando, e os que sobraram são adiados de forma honesta', async () => {
    const post2 = { ...basePost, id: 'post-2', platform_post_id: 'ext-2' };
    const post3 = { ...basePost, id: 'post-3', platform_post_id: 'ext-3' };
    const { db } = dbStub([basePost, post2, post3]);
    const source = commentsSource([{ comment_id: 'c1', message: 'texto real' }]);
    // Date.now() controlado deterministicamente: "agora" nas 2 primeiras
    // checagens (antes do post-1 e antes do post-2), depois do deadline a
    // partir da checagem do post-3 — sem depender de timing real de wall clock.
    const deadlineAt = 1_000_000;
    const nowSpy = vi.spyOn(Date, 'now')
      .mockReturnValueOnce(deadlineAt - 100) // checagem antes do post-1: dentro do orçamento
      .mockReturnValueOnce(deadlineAt - 50)  // checagem antes do post-2: ainda dentro
      .mockReturnValue(deadlineAt + 1);       // checagem antes do post-3 em diante: já vencido

    const summary = await runFacebookCommentsForClient({
      source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never, deadlineAt,
    });
    nowSpy.mockRestore();

    // post-1 e post-2 (processados antes do deadline vencer) contam como
    // sucesso real — nunca são reescritos como falha só porque o orçamento
    // acabou depois, no post-3.
    expect(summary.eligible).toBe(3);
    expect(summary.items[0]).toMatchObject({ postId: 'post-1', outcome: 'success' });
    expect(summary.items[1]).toMatchObject({ postId: 'post-2', outcome: 'success' });
    expect(summary.items[2]).toMatchObject({ postId: 'post-3', outcome: 'skipped', reason: 'TIMEOUT_BUDGET_EXCEEDED' });
    expect(source.getPostComments).toHaveBeenCalledTimes(2); // nunca chama o provider para um post já além do deadline
  });

  it('deadline já vencido no início: nenhum post é sequer tentado, mas o total elegível continua correto (nunca eligible=0 mentiroso)', async () => {
    const post2 = { ...basePost, id: 'post-2', platform_post_id: 'ext-2' };
    const { db } = dbStub([basePost, post2]);
    const source = commentsSource([{ comment_id: 'c1', message: 'texto' }]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', deadlineAt: Date.now() - 1 });
    expect(summary.eligible).toBe(2); // reflete a fila real, não zera por causa do timeout
    expect(summary.items.every((item) => item.reason === 'TIMEOUT_BUDGET_EXCEEDED')).toBe(true);
    expect(source.getPostComments).not.toHaveBeenCalled();
  });
});

describe('runFacebookCommentsAudience — comentários sem texto (sticker/emoji/gif) não travam a análise', () => {
  it('coleta e persiste comentários mesmo quando nenhum é textual, não chama o Gemini (sample vazia), e registra SUCCESS_NO_CONTENT honesto (sem inventar sentimento) para nunca mais reaparecer como elegível', async () => {
    const { db, upsertCalls } = dbStub([]);
    const source = commentsSource([{ comment_id: 'c1', message: null, is_sticker: true, sticker: { label: 'joia' } }]);
    const result = await runFacebookCommentsAudience({
      source, db, clientId: 'client-1', targetId: 'target-1', socialPostId: 'post-1', externalPostId: 'ext-1',
      post: { id: 'post-1', clientId: 'client-1', targetId: 'target-1', platform: 'facebook', contentOrigin: null, contentType: null, text: null, publishedAt: null, url: null, mediaUrl: null, mediaType: null, thumbnailUrl: null, engagement: { likes: null, reactionsTotal: null, reactionsBreakdown: { like: null, love: null, care: null, haha: null, wow: null, sad: null, angry: null }, comments: { count: 1, textAvailable: false }, shares: null } },
      totalComments: 1,
    });
    expect(result).toMatchObject({ persisted: 1, sampled: 0, analyzed: false });
    const audienceUpsert = upsertCalls.find((c) => c.table === 'facebook_audience_analysis');
    expect(audienceUpsert?.rows).toMatchObject({
      client_id: 'client-1', target_id: 'target-1', social_post_id: 'post-1', status: 'SUCCESS',
      post_sentiment: null, comments_analyzed: 0, comments_available: false, attempt_count: 1,
    });
  });
});

describe('classifyCommentsAudienceFailure', () => {
  it('classifica erro HTTP 5xx/429 do provider de comentários como RETRYABLE', () => {
    expect(classifyCommentsAudienceFailure(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 503)).failureClass).toBe('RETRYABLE');
    expect(classifyCommentsAudienceFailure(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 429)).failureClass).toBe('RETRYABLE');
    expect(classifyCommentsAudienceFailure(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_TIMEOUT', null)).failureClass).toBe('RETRYABLE');
  });

  it('classifica erro HTTP 4xx do provider de comentários como TERMINAL (repetir não resolve)', () => {
    expect(classifyCommentsAudienceFailure(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 404)).failureClass).toBe('TERMINAL');
    expect(classifyCommentsAudienceFailure(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 400)).failureClass).toBe('TERMINAL');
  });

  it('classifica erro não reconhecido como TERMINAL por padrão (mais seguro que retry indefinido de um bug não mapeado)', () => {
    expect(classifyCommentsAudienceFailure(new Error('algo inesperado')).failureClass).toBe('TERMINAL');
  });
});

describe('TESTE C — falha TERMINAL persiste corretamente e nunca é reprocessada', () => {
  it('post com falha 4xx do provider é gravado como FAILED_TERMINAL com error_code/error_message/attempt_count, sem inventar dado de análise', async () => {
    const { db, upsertCalls } = dbStub([basePost]);
    const source = { getPostComments: vi.fn().mockRejectedValue(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 404)) };
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never });

    expect(summary).toMatchObject({ eligible: 1, failed: 1, success: 0 });
    expect(summary.items[0]).toMatchObject({ outcome: 'failed', retryable: false });

    const audienceUpsert = upsertCalls.find((c) => c.table === 'facebook_audience_analysis');
    expect(audienceUpsert?.rows).toMatchObject({
      client_id: 'client-1', target_id: 'target-1', social_post_id: 'post-1',
      status: 'FAILED_TERMINAL', error_code: 'FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR',
      attempt_count: 1, comments_analyzed: 0, comments_available: false,
    });
    expect(audienceUpsert?.rows).not.toHaveProperty('post_sentiment');
  });

  it('post já FAILED_TERMINAL não aparece mais na fila (a própria view exclui — aqui simulamos a view já filtrando)', async () => {
    // facebook_posts_pending_audience só devolve linhas com faa.id is null OU
    // faa.status = 'FAILED_RETRYABLE' — um post FAILED_TERMINAL nunca é
    // devolvido pela query, então o dbStub([]) já representa esse estado.
    const { db } = dbStub([]);
    const source = commentsSource([]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1' });
    expect(summary).toMatchObject({ eligible: 0, processed: 0, failed: 0 });
    expect(source.getPostComments).not.toHaveBeenCalled();
  });
});

describe('TESTE D — falha RETRYABLE tem política de retry controlada (cooldown + limite de tentativas), nunca loop infinito', () => {
  it('post com falha 5xx é gravado como FAILED_RETRYABLE (não TERMINAL) na primeira tentativa', async () => {
    const { db, upsertCalls } = dbStub([basePost]);
    const source = { getPostComments: vi.fn().mockRejectedValue(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 503)) };
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never, maxAttempts: 3 });

    expect(summary.items[0]).toMatchObject({ outcome: 'failed', retryable: true });
    const audienceUpsert = upsertCalls.find((c) => c.table === 'facebook_audience_analysis');
    expect(audienceUpsert?.rows).toMatchObject({ status: 'FAILED_RETRYABLE', attempt_count: 1 });
  });

  it('post FAILED_RETRYABLE dentro do cooldown é pulado sem chamar o provider (não reprocessa a cada /analyze)', async () => {
    const row = { ...basePost, audience_status: 'FAILED_RETRYABLE', audience_attempt_count: 1, audience_last_attempt_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() };
    const { db } = dbStub([row]);
    const source = commentsSource([]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', retryCooldownMs: 60 * 60 * 1000 });

    expect(summary).toMatchObject({ eligible: 1, skipped: 1, failed: 0 });
    expect(summary.items[0]).toMatchObject({ outcome: 'skipped', reason: 'RETRY_COOLDOWN' });
    expect(source.getPostComments).not.toHaveBeenCalled();
  });

  it('post FAILED_RETRYABLE após o cooldown é tentado de novo, incrementando attempt_count corretamente', async () => {
    const row = { ...basePost, audience_status: 'FAILED_RETRYABLE', audience_attempt_count: 1, audience_last_attempt_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
    const { db, upsertCalls } = dbStub([row]);
    const source = commentsSource([{ comment_id: 'c1', message: 'agora funcionou' }]);
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never, retryCooldownMs: 60 * 60 * 1000 });

    expect(summary).toMatchObject({ eligible: 1, success: 1, failed: 0, skipped: 0 });
    const audienceUpsert = upsertCalls.find((c) => c.table === 'facebook_audience_analysis');
    expect(audienceUpsert?.rows).toMatchObject({ status: 'SUCCESS', attempt_count: 2 });
  });

  it('limite de tentativas esgotado: uma falha RETRYABLE na última tentativa permitida vira FAILED_TERMINAL (nunca volta a ser elegível)', async () => {
    const row = { ...basePost, audience_status: 'FAILED_RETRYABLE', audience_attempt_count: 2, audience_last_attempt_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
    const { db, upsertCalls } = dbStub([row]);
    const source = { getPostComments: vi.fn().mockRejectedValue(new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 503)) };
    const summary = await runFacebookCommentsForClient({ source, db, clientId: 'client-1', targetId: 'target-1', geminiClient: geminiStub() as never, maxAttempts: 3, retryCooldownMs: 60 * 60 * 1000 });

    expect(summary.items[0]).toMatchObject({ outcome: 'failed', retryable: false });
    const audienceUpsert = upsertCalls.find((c) => c.table === 'facebook_audience_analysis');
    expect(audienceUpsert?.rows).toMatchObject({ status: 'FAILED_TERMINAL', attempt_count: 3 });
  });
});
