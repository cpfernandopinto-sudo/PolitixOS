import 'server-only';
import type { GoogleGenAI } from '@google/genai';
import { InterpretationProviderError } from '@/lib/territorios/intelligence/interpretation/provider-errors';
import { toFacebookAnalyticsContract, type FacebookAnalyticsPost, type FacebookAnalyticsSourceRow } from '../analytics-contract';
import { FacebookProviderError } from '../provider';
import { analyzeFacebookAudience, FACEBOOK_AUDIENCE_PROMPT_VERSION } from './audience-intelligence';
import { normalizeFacebookComments } from './normalizer';
import { collectFacebookComments, type FacebookCommentsPageSource } from './pagination';
import { persistFacebookComments, type FacebookCommentsDb } from './persistence';
import { sampleFacebookComments } from './sampling';

interface AudienceTable { upsert(row: Record<string, unknown>, options: { onConflict: string }): Promise<{ error: { message: string } | null }>; }
export interface FacebookAudienceDb extends FacebookCommentsDb { from(table: string): ReturnType<FacebookCommentsDb['from']> & AudienceTable; }

export type FacebookAudienceFailureClass = 'RETRYABLE' | 'TERMINAL';

/**
 * Classifica uma falha do pipeline de comments audience como RETRYABLE
 * (transitória — vale tentar de novo mais tarde) ou TERMINAL (estrutural —
 * repetir a mesma chamada nunca vai resolver). Reaproveita a taxonomia já
 * existente no PolitixOS para erros de provider de IA
 * (InterpretationProviderError/classifyGeminiError, usada em
 * audience-intelligence.ts) em vez de inventar uma classificação paralela —
 * e usa o `status`/`code` já carregados por FacebookProviderError (provider
 * de comentários RapidAPI) para o mesmo julgamento (429/5xx/timeout/rede =
 * retryable; 4xx/resposta inválida = terminal).
 */
export function classifyCommentsAudienceFailure(error: unknown): { failureClass: FacebookAudienceFailureClass; code: string; message: string } {
  if (error instanceof InterpretationProviderError) {
    const retryableCodes = new Set(['PROVIDER_RATE_LIMIT', 'PROVIDER_TIMEOUT', 'PROVIDER_NETWORK_ERROR', 'PROVIDER_OVERLOADED', 'PROVIDER_CREDENTIAL_MISSING']);
    return { failureClass: retryableCodes.has(error.code) ? 'RETRYABLE' : 'TERMINAL', code: error.code, message: error.message };
  }
  if (error instanceof FacebookProviderError) {
    if (error.code === 'FACEBOOK_COMMENTS_PROVIDER_TIMEOUT' || error.code === 'FACEBOOK_COMMENTS_PROVIDER_NETWORK_ERROR') {
      return { failureClass: 'RETRYABLE', code: error.code, message: error.code };
    }
    if (error.status === 429 || (error.status !== null && error.status >= 500)) {
      return { failureClass: 'RETRYABLE', code: error.code, message: `${error.code} (HTTP ${error.status})` };
    }
    // 4xx (400/401/403/404) e resposta estruturalmente inválida: repetir a
    // mesma chamada ao mesmo post não muda o resultado.
    return { failureClass: 'TERMINAL', code: error.code, message: error.status ? `${error.code} (HTTP ${error.status})` : error.code };
  }
  const message = error instanceof Error ? error.message : String(error);
  const code = message.split(':')[0].trim();
  if (code === 'FACEBOOK_COMMENT_TENANT_CONTEXT_INVALID' || code === 'FACEBOOK_AUDIENCE_COMMENTS_REQUIRED') {
    return { failureClass: 'TERMINAL', code, message };
  }
  if (code === 'FACEBOOK_COMMENTS_PERSIST_FAILED' || code === 'FACEBOOK_AUDIENCE_PERSIST_FAILED' || code === 'FACEBOOK_PENDING_AUDIENCE_QUERY_FAILED' || code === 'FACEBOOK_AUDIENCE_GEMINI_KEY_MISSING') {
    return { failureClass: 'RETRYABLE', code, message };
  }
  // Erro não reconhecido: TERMINAL por padrão — mais seguro do que arriscar
  // retry indefinido de um bug real ainda não mapeado (o limite de tentativas
  // no chamador é a segunda camada de proteção, independente desta escolha).
  return { failureClass: 'TERMINAL', code: code || 'UNKNOWN_ERROR', message };
}

async function persistCommentsAudienceAttemptResult(
  db: FacebookAudienceDb,
  scope: { clientId: string; targetId: string; socialPostId: string },
  outcome:
    | { status: 'SUCCESS'; attemptCount: number; output: Awaited<ReturnType<typeof analyzeFacebookAudience>>; commentsAnalyzed: number }
    // Não é uma falha: o post foi coletado com sucesso, só não tinha comentário
    // textual/emoji suficiente para amostrar. Nunca fabricamos um resultado de
    // Gemini para esse caso — os campos de análise ficam null/vazios de
    // verdade, e `comments_available=false` já é o sinal existente no schema
    // para "sem conteúdo real para analisar".
    | { status: 'SUCCESS_NO_CONTENT'; attemptCount: number }
    | { status: 'FAILED_RETRYABLE' | 'FAILED_TERMINAL'; attemptCount: number; errorCode: string; errorMessage: string },
): Promise<void> {
  const base = {
    client_id: scope.clientId, target_id: scope.targetId, social_post_id: scope.socialPostId, platform: 'facebook',
    attempt_count: outcome.attemptCount, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  let row: Record<string, unknown>;
  if (outcome.status === 'SUCCESS') {
    row = {
      ...base, status: 'SUCCESS', error_code: null, error_message: null,
      post_sentiment: outcome.output.postSentiment, audience_sentiment: outcome.output.audienceSentiment, audience_sentiment_score: outcome.output.audienceSentimentScore,
      positive_comments: outcome.output.positiveComments, neutral_comments: outcome.output.neutralComments, negative_comments: outcome.output.negativeComments, mixed_comments: outcome.output.mixedComments,
      support_level: outcome.output.supportLevel, rejection_level: outcome.output.rejectionLevel, polarization_level: outcome.output.polarizationLevel,
      dominant_audience_themes: outcome.output.dominantAudienceThemes, reputational_risk: outcome.output.reputationalRisk, crisis_signals: outcome.output.crisisSignals,
      political_opportunity: outcome.output.politicalOpportunity, message_audience_divergence: outcome.output.messageAudienceDivergence,
      executive_summary: outcome.output.executiveSummary, strategic_reading: outcome.output.strategicReading, recommended_action: outcome.output.recommendedAction,
      confidence: outcome.output.confidence, comments_analyzed: outcome.commentsAnalyzed, comments_available: true,
      raw_ai_response: { provider: 'gemini', model: 'gemini-2.5-flash', prompt_version: FACEBOOK_AUDIENCE_PROMPT_VERSION, output: outcome.output },
    };
  } else if (outcome.status === 'SUCCESS_NO_CONTENT') {
    row = {
      ...base, status: 'SUCCESS', error_code: null, error_message: null,
      post_sentiment: null, audience_sentiment: null, audience_sentiment_score: null,
      positive_comments: 0, neutral_comments: 0, negative_comments: 0, mixed_comments: 0,
      support_level: null, rejection_level: null, polarization_level: null,
      dominant_audience_themes: [], reputational_risk: null, crisis_signals: [],
      political_opportunity: null, message_audience_divergence: null,
      executive_summary: null, strategic_reading: null, recommended_action: null,
      confidence: null, comments_analyzed: 0, comments_available: false, raw_ai_response: {},
    };
  } else {
    row = {
      ...base, status: outcome.status, error_code: outcome.errorCode, error_message: outcome.errorMessage,
      comments_analyzed: 0, comments_available: false, raw_ai_response: {},
    };
  }
  const { error } = await db.from('facebook_audience_analysis').upsert(row, { onConflict: 'client_id,social_post_id' });
  if (error) throw new Error(`FACEBOOK_AUDIENCE_PERSIST_FAILED: ${error.message}`);
}

export async function runFacebookCommentsAudience(input: {
  source: FacebookCommentsPageSource; db: FacebookAudienceDb; clientId: string; targetId: string; socialPostId: string;
  externalPostId: string; post: FacebookAnalyticsPost; totalComments: number; maxComments?: number; maxPages?: number;
  geminiApiKey?: string; geminiClient?: GoogleGenAI;
  /** Número desta tentativa (1 = primeira vez). Usado só para persistir attempt_count corretamente. */
  attemptNumber?: number;
  /** A partir de quantas tentativas uma falha RETRYABLE vira FAILED_TERMINAL (limite de tentativas esgotado). */
  maxAttempts?: number;
}) {
  const attemptNumber = input.attemptNumber ?? 1;
  const maxAttempts = input.maxAttempts ?? 3;
  try {
    const collection = await collectFacebookComments(input.source, { postId: input.externalPostId, maxComments: input.maxComments ?? 50, maxPages: input.maxPages ?? 5 });
    const normalized = normalizeFacebookComments(collection.comments, input.externalPostId);
    const persisted = await persistFacebookComments(input.db, normalized, input);
    const sample = sampleFacebookComments(normalized, 50);
    if (!sample.length) {
      // Não é uma falha: o post existe, foi coletado, só não tem comentário
      // textual/emoji suficiente para amostrar. Registrar como SUCCESS (com
      // comments_available refletindo a realidade) para nunca mais reaparecer
      // como elegível por essa razão.
      await persistCommentsAudienceAttemptResult(input.db, input, { status: 'SUCCESS_NO_CONTENT', attemptCount: attemptNumber });
      return { collection, normalized: normalized.length, persisted, sampled: 0, analyzed: false as const };
    }
    const output = await analyzeFacebookAudience({ post: input.post, comments: sample, totalComments: input.totalComments, apiKey: input.geminiApiKey, geminiClient: input.geminiClient });
    await persistCommentsAudienceAttemptResult(input.db, input, { status: 'SUCCESS', attemptCount: attemptNumber, output, commentsAnalyzed: sample.length });
    return { collection, normalized: normalized.length, persisted, sampled: sample.length, analyzed: true as const, output };
  } catch (rawError) {
    const { failureClass, code, message } = classifyCommentsAudienceFailure(rawError);
    const finalStatus: 'FAILED_RETRYABLE' | 'FAILED_TERMINAL' = failureClass === 'RETRYABLE' && attemptNumber < maxAttempts ? 'FAILED_RETRYABLE' : 'FAILED_TERMINAL';
    await persistCommentsAudienceAttemptResult(input.db, input, { status: finalStatus, attemptCount: attemptNumber, errorCode: code, errorMessage: message });
    throw new Error(`${code}: ${message} [${finalStatus}]`);
  }
}

interface PendingAudienceRow extends FacebookAnalyticsSourceRow {
  client_id: string | null;
  target_id: string | null;
  platform_post_id: string | null;
  comment_count: number | null;
  audience_status: 'FAILED_RETRYABLE' | null;
  audience_attempt_count: number | null;
  audience_last_attempt_at: string | null;
  audience_error_code: string | null;
}

interface PendingAudienceChain {
  eq(column: string, value: unknown): PendingAudienceChain;
  limit(n: number): Promise<{ data: PendingAudienceRow[] | null; error: { message: string } | null }>;
}

export interface FacebookCommentsRunnerDb extends FacebookAudienceDb {
  from(table: string): ReturnType<FacebookAudienceDb['from']> & { select(columns: string): PendingAudienceChain };
}

export type FacebookCommentsClientOutcome = 'success' | 'failed' | 'skipped';

export interface FacebookCommentsClientResultItem {
  postId: string;
  outcome: FacebookCommentsClientOutcome;
  reason?: string;
  commentsCollected?: number;
  commentsAnalyzed?: number;
  /** Presente só quando outcome='failed' — permite observabilidade sem reprocessar para descobrir. */
  retryable?: boolean;
}

export interface FacebookCommentsClientRunSummary {
  eligible: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  items: FacebookCommentsClientResultItem[];
}

/**
 * Processa até `maxPosts` posts Facebook pendentes de análise de audiência
 * (comentários) para um client/target específico, lendo de
 * `facebook_posts_pending_audience` — fila DELIBERADAMENTE independente de
 * `facebook_posts_pending_analysis` (sentimento do post): um post que já
 * teve seu sentimento analisado continua elegível aqui até ter comentários
 * coletados/analisados, cobrindo tanto "post novo" quanto "post recente já
 * existente ganhando comentários" com a mesma fila. Idempotente (a view já
 * exclui posts com `facebook_audience_analysis` existente). Nunca lança para
 * abortar o lote inteiro por causa de um post — cada falha é isolada.
 */
export async function runFacebookCommentsForClient(input: {
  source: FacebookCommentsPageSource;
  db: FacebookCommentsRunnerDb;
  clientId: string;
  targetId: string;
  maxPosts?: number;
  maxComments?: number;
  maxPages?: number;
  geminiApiKey?: string;
  geminiClient?: GoogleGenAI;
  /**
   * Epoch ms além do qual paramos de INICIAR novos posts. Checado
   * COOPERATIVAMENTE entre iterações do loop (nunca aborta um post já em
   * andamento) — deliberadamente diferente de um `Promise.race` com timeout
   * ao redor da função inteira: aquele padrão não cancela o trabalho real
   * (RapidAPI + Gemini + persistência continuam rodando em segundo plano,
   * sem coordenação), e a chamadora relata FAILED com tudo zerado mesmo
   * quando alguns posts já foram processados e persistidos com sucesso —
   * causa raiz real encontrada em produção (execução n8n 28397: 2 posts
   * analisados de verdade, resposta ainda assim reportou FAILED/eligible=0).
   */
  deadlineAt?: number;
  /** Máximo de tentativas antes de uma falha RETRYABLE virar FAILED_TERMINAL definitivamente. */
  maxAttempts?: number;
  /** Tempo mínimo entre tentativas de um mesmo post FAILED_RETRYABLE. */
  retryCooldownMs?: number;
}): Promise<FacebookCommentsClientRunSummary> {
  const maxPosts = input.maxPosts ?? 5;
  const maxAttempts = input.maxAttempts ?? 3;
  const retryCooldownMs = input.retryCooldownMs ?? 60 * 60 * 1000;
  const { data, error } = await input.db
    .from('facebook_posts_pending_audience')
    .select('*')
    .eq('client_id', input.clientId)
    .eq('target_id', input.targetId)
    .limit(maxPosts);
  if (error) throw new Error(`FACEBOOK_PENDING_AUDIENCE_QUERY_FAILED: ${error.message}`);

  const rows = data ?? [];
  const items: FacebookCommentsClientResultItem[] = [];

  for (const row of rows) {
    const externalPostId = row.platform_post_id;
    if (!externalPostId) {
      items.push({ postId: row.id, outcome: 'skipped', reason: 'EXTERNAL_POST_ID_MISSING' });
      continue;
    }
    if (!row.client_id || !row.target_id) {
      items.push({ postId: row.id, outcome: 'skipped', reason: 'SCOPE_MISSING' });
      continue;
    }
    // Máquina de estados de retry: um post FAILED_RETRYABLE só é tentado de
    // novo depois do cooldown (nunca imediatamente na próxima chamada de
    // /analyze, para não bater na mesma causa transitória em segundos).
    // FAILED_TERMINAL e SUCCESS já não aparecem aqui (filtrados pela própria
    // view facebook_posts_pending_audience).
    if (row.audience_status === 'FAILED_RETRYABLE' && row.audience_last_attempt_at) {
      const elapsedMs = Date.now() - new Date(row.audience_last_attempt_at).getTime();
      if (elapsedMs < retryCooldownMs) {
        items.push({ postId: row.id, outcome: 'skipped', reason: 'RETRY_COOLDOWN' });
        continue;
      }
    }
    if (input.deadlineAt !== undefined && Date.now() >= input.deadlineAt) {
      items.push({ postId: row.id, outcome: 'skipped', reason: 'TIMEOUT_BUDGET_EXCEEDED' });
      continue;
    }
    const attemptNumber = (row.audience_attempt_count ?? 0) + 1;
    try {
      const contract = toFacebookAnalyticsContract(row);
      const result = await runFacebookCommentsAudience({
        source: input.source,
        db: input.db,
        clientId: row.client_id,
        targetId: row.target_id,
        socialPostId: row.id,
        externalPostId,
        post: contract,
        totalComments: row.comment_count ?? 0,
        maxComments: input.maxComments,
        maxPages: input.maxPages,
        geminiApiKey: input.geminiApiKey,
        geminiClient: input.geminiClient,
        attemptNumber,
        maxAttempts,
      });
      items.push({ postId: row.id, outcome: 'success', commentsCollected: result.persisted, commentsAnalyzed: result.sampled });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      items.push({ postId: row.id, outcome: 'failed', reason, retryable: reason.endsWith('[FAILED_RETRYABLE]') });
    }
  }

  return {
    eligible: rows.length,
    processed: items.length,
    success: items.filter((item) => item.outcome === 'success').length,
    failed: items.filter((item) => item.outcome === 'failed').length,
    skipped: items.filter((item) => item.outcome === 'skipped').length,
    items,
  };
}
