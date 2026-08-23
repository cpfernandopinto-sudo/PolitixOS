import 'server-only';
import type { GoogleGenAI } from '@google/genai';
import { toFacebookAnalyticsContract, type FacebookAnalyticsPost, type FacebookAnalyticsSourceRow } from '../analytics-contract';
import { analyzeFacebookAudience, FACEBOOK_AUDIENCE_PROMPT_VERSION } from './audience-intelligence';
import { normalizeFacebookComments } from './normalizer';
import { collectFacebookComments, type FacebookCommentsPageSource } from './pagination';
import { persistFacebookComments, type FacebookCommentsDb } from './persistence';
import { sampleFacebookComments } from './sampling';

interface AudienceTable { upsert(row: Record<string, unknown>, options: { onConflict: string }): Promise<{ error: { message: string } | null }>; }
export interface FacebookAudienceDb extends FacebookCommentsDb { from(table: string): ReturnType<FacebookCommentsDb['from']> & AudienceTable; }

export async function runFacebookCommentsAudience(input: {
  source: FacebookCommentsPageSource; db: FacebookAudienceDb; clientId: string; targetId: string; socialPostId: string;
  externalPostId: string; post: FacebookAnalyticsPost; totalComments: number; maxComments?: number; maxPages?: number;
  geminiApiKey?: string; geminiClient?: GoogleGenAI;
}) {
  const collection = await collectFacebookComments(input.source, { postId: input.externalPostId, maxComments: input.maxComments ?? 50, maxPages: input.maxPages ?? 5 });
  const normalized = normalizeFacebookComments(collection.comments, input.externalPostId);
  const persisted = await persistFacebookComments(input.db, normalized, input);
  const sample = sampleFacebookComments(normalized, 50);
  if (!sample.length) return { collection, normalized: normalized.length, persisted, sampled: 0, analyzed: false as const };
  const output = await analyzeFacebookAudience({ post: input.post, comments: sample, totalComments: input.totalComments, apiKey: input.geminiApiKey, geminiClient: input.geminiClient });
  const { error } = await input.db.from('facebook_audience_analysis').upsert({
    client_id: input.clientId, target_id: input.targetId, social_post_id: input.socialPostId, platform: 'facebook',
    post_sentiment: output.postSentiment, audience_sentiment: output.audienceSentiment, audience_sentiment_score: output.audienceSentimentScore,
    positive_comments: output.positiveComments, neutral_comments: output.neutralComments, negative_comments: output.negativeComments, mixed_comments: output.mixedComments,
    support_level: output.supportLevel, rejection_level: output.rejectionLevel, polarization_level: output.polarizationLevel,
    dominant_audience_themes: output.dominantAudienceThemes, reputational_risk: output.reputationalRisk, crisis_signals: output.crisisSignals,
    political_opportunity: output.politicalOpportunity, message_audience_divergence: output.messageAudienceDivergence,
    executive_summary: output.executiveSummary, strategic_reading: output.strategicReading, recommended_action: output.recommendedAction,
    confidence: output.confidence, comments_analyzed: sample.length, comments_available: true,
    raw_ai_response: { provider: 'gemini', model: 'gemini-2.5-flash', prompt_version: FACEBOOK_AUDIENCE_PROMPT_VERSION, output }, updated_at: new Date().toISOString(),
  }, { onConflict: 'client_id,social_post_id' });
  if (error) throw new Error(`FACEBOOK_AUDIENCE_PERSIST_FAILED: ${error.message}`);
  return { collection, normalized: normalized.length, persisted, sampled: sample.length, analyzed: true as const, output };
}

interface PendingAudienceRow extends FacebookAnalyticsSourceRow {
  client_id: string | null;
  target_id: string | null;
  platform_post_id: string | null;
  comment_count: number | null;
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
}): Promise<FacebookCommentsClientRunSummary> {
  const maxPosts = input.maxPosts ?? 5;
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
      });
      items.push({ postId: row.id, outcome: 'success', commentsCollected: result.persisted, commentsAnalyzed: result.sampled });
    } catch (err) {
      items.push({ postId: row.id, outcome: 'failed', reason: err instanceof Error ? err.message : String(err) });
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
