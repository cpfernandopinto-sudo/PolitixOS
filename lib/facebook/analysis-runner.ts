import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { classifyGeminiError } from '@/lib/territorios/intelligence/interpretation/provider-errors';
import { toFacebookAnalyticsContract, type FacebookAnalyticsSourceRow } from './analytics-contract';
import { buildFacebookAnalysisPrompt, FacebookAnalysisOutputSchema, FACEBOOK_ANALYSIS_PROMPT_VERSION, type FacebookAnalysisOutput } from './analysis-prompt';

const FACEBOOK_ANALYSIS_JSON_SCHEMA = z.toJSONSchema(FacebookAnalysisOutputSchema) as Record<string, unknown>;
const MODEL = 'gemini-2.5-flash';
const MAX_TOKENS = 2048;
const DEFAULT_MAX_POSTS = 20;
const REFUSAL_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'RECITATION', 'SPII']);

interface SelectChainResult {
  data: FacebookAnalyticsSourceRow[] | null;
  error: { message: string } | null;
}

interface SingleResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

export interface FacebookAnalysisSelectChain {
  eq(column: string, value: unknown): FacebookAnalysisSelectChain;
  limit(n: number): Promise<SelectChainResult>;
  maybeSingle(): Promise<SingleResult>;
}

export interface FacebookAnalysisTableClient {
  select(columns: string): FacebookAnalysisSelectChain;
  insert(row: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

export interface FacebookAnalysisDbClient {
  from(table: string): FacebookAnalysisTableClient;
}

export type FacebookAnalysisOutcome = 'success' | 'failed' | 'skipped';

export interface FacebookAnalysisResultItem {
  postId: string;
  outcome: FacebookAnalysisOutcome;
  reason?: string;
}

export interface FacebookAnalysisRunSummary {
  eligible: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  items: FacebookAnalysisResultItem[];
}

export interface RunFacebookAnalysisOptions {
  clientId: string;
  targetId: string;
  maxPosts?: number;
  db: FacebookAnalysisDbClient;
  geminiClient?: GoogleGenAI;
  apiKey?: string;
}

async function fetchPendingFacebookPosts(db: FacebookAnalysisDbClient, clientId: string, targetId: string, limit: number): Promise<FacebookAnalyticsSourceRow[]> {
  const { data, error } = await db
    .from('facebook_posts_pending_analysis')
    .select('*')
    .eq('client_id', clientId)
    .eq('target_id', targetId)
    .limit(limit);
  if (error) throw new Error(`FACEBOOK_PENDING_ANALYSIS_QUERY_FAILED: ${error.message}`);
  return data ?? [];
}

async function hasExistingAnalysis(db: FacebookAnalysisDbClient, contentId: string): Promise<boolean> {
  const { data, error } = await db
    .from('ai_analysis')
    .select('id')
    .eq('content_id', contentId)
    .eq('content_type', 'post')
    .maybeSingle();
  if (error) throw new Error(`FACEBOOK_ANALYSIS_IDEMPOTENCY_CHECK_FAILED: ${error.message}`);
  return data !== null;
}

async function callGemini(client: GoogleGenAI, system: string, user: string): Promise<FacebookAnalysisOutput | null> {
  let response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>;
  try {
    response = await client.models.generateContent({
      model: MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: FACEBOOK_ANALYSIS_JSON_SCHEMA,
        maxOutputTokens: MAX_TOKENS,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  } catch (error) {
    throw classifyGeminiError(error);
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) throw new Error('FACEBOOK_ANALYSIS_MODEL_REFUSAL');
  if (!response.text) return null;
  try {
    return JSON.parse(response.text) as FacebookAnalysisOutput;
  } catch {
    return null;
  }
}

/**
 * Processa até `maxPosts` posts Facebook pendentes de análise para um
 * client/target específico. Idempotente (a view já exclui posts já
 * analisados; uma checagem extra é feita antes de cada insert). Nunca lança
 * para abortar o lote inteiro por causa de um post — cada falha é isolada e
 * registrada em `items`.
 */
export async function runFacebookAnalysis(options: RunFacebookAnalysisOptions): Promise<FacebookAnalysisRunSummary> {
  const { clientId, targetId, db, maxPosts = DEFAULT_MAX_POSTS } = options;
  if (!clientId || !targetId) throw new Error('FACEBOOK_ANALYSIS_SCOPE_INVALID');

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const geminiClient = options.geminiClient ?? (apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: 60_000 } }) : null);
  if (!geminiClient) throw new Error('FACEBOOK_ANALYSIS_PROVIDER_CREDENTIAL_MISSING');

  const rows = await fetchPendingFacebookPosts(db, clientId, targetId, maxPosts);
  const items: FacebookAnalysisResultItem[] = [];

  for (const row of rows) {
    try {
      if (await hasExistingAnalysis(db, row.id)) {
        items.push({ postId: row.id, outcome: 'skipped', reason: 'ALREADY_ANALYZED' });
        continue;
      }

      const contract = toFacebookAnalyticsContract(row);
      const { system, user } = buildFacebookAnalysisPrompt(contract);
      const parsedOutput = await callGemini(geminiClient, system, user);
      if (parsedOutput === null) {
        items.push({ postId: row.id, outcome: 'failed', reason: 'MODEL_RESPONSE_NOT_JSON' });
        continue;
      }

      const validated = FacebookAnalysisOutputSchema.safeParse(parsedOutput);
      if (!validated.success) {
        items.push({ postId: row.id, outcome: 'failed', reason: 'SCHEMA_VALIDATION_FAILED' });
        continue;
      }

      const output = validated.data;
      const { error: insertError } = await db.from('ai_analysis').insert({
        target_id: (row as { target_id?: string | null }).target_id,
        client_id: clientId,
        content_id: row.id,
        content_type: 'post',
        platform: 'facebook',
        sentiment: output.sentiment,
        risk_level: output.risk_level,
        risk_reason: output.risk_reason,
        ai_topic: output.ai_topic,
        ai_topics: output.ai_topics,
        ai_entities: output.ai_entities,
        ai_keywords: output.ai_keywords,
        summary: output.summary,
        recommended_action: output.recommended_action,
        author_tone: output.author_tone,
        public_reaction: output.public_reaction,
        polarization_level: output.polarization_level,
        crisis_temperature: output.crisis_temperature,
        strategic_reading: output.strategic_reading,
        engagement_quality: output.engagement_quality,
        confidence_score: output.confidence_score,
        raw_ai_response: { provider: 'gemini', prompt_version: FACEBOOK_ANALYSIS_PROMPT_VERSION, model: MODEL, output },
      });
      if (insertError) {
        items.push({ postId: row.id, outcome: 'failed', reason: `PERSIST_FAILED: ${insertError.message}` });
        continue;
      }

      items.push({ postId: row.id, outcome: 'success' });
    } catch (error) {
      items.push({ postId: row.id, outcome: 'failed', reason: error instanceof Error ? error.message : String(error) });
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
