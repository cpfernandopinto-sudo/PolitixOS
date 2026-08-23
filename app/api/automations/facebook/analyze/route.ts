import 'server-only';

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import {
  runFacebookAnalysis,
  type FacebookAnalysisDbClient,
  type FacebookAnalysisRunSummary,
} from '@/lib/facebook/analysis-runner';
import {
  runFacebookCommentsForClient,
  type FacebookCommentsClientRunSummary,
  type FacebookCommentsRunnerDb,
} from '@/lib/facebook/comments/runner';
import { FacebookCommentsProvider, facebookCommentsProviderConfigFromEnv } from '@/lib/facebook/comments/provider';
import { createAdminClient } from '@/lib/supabaseClient';

import { consumeRateLimit } from '@/lib/facebook/analyze-rate-limit';

const MAX_POSTS = 20;
function boundedEnvInteger(name: string, fallback: number, maximum: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

const COMMENTS_MAX_POSTS_PER_RUN = boundedEnvInteger('FACEBOOK_COMMENTS_MAX_POSTS_PER_RUN', 5, 20);
const COMMENTS_MAX_PER_POST = boundedEnvInteger('FACEBOOK_COMMENTS_MAX_PER_POST', 50, 100);
const COMMENTS_MAX_PAGES = boundedEnvInteger('FACEBOOK_COMMENTS_MAX_PAGES', 5, 10);
const COMMENTS_STAGE_TIMEOUT_MS = boundedEnvInteger('FACEBOOK_COMMENTS_STAGE_TIMEOUT_MS', 45_000, 120_000);

type CommentsStatus = 'SUCCESS' | 'SUCCESS_WITH_FAILURES' | 'NOTHING_TO_PROCESS' | 'SKIPPED_PROVIDER_CREDENTIAL_MISSING' | 'FAILED';

/**
 * Coleta/analisa comentários (audience intelligence) para posts do client/target
 * já elegíveis (ver facebook_posts_pending_audience — independente do estado
 * de análise de sentimento do post). Isolada da análise de sentimento: uma
 * falha aqui NUNCA derruba a resposta principal de `/analyze` (mesmo
 * princípio de isolamento por etapa já usado em runFacebookAnalysis/
 * runFacebookOwnedCollection). Sem credencial RapidAPI configurada, pula de
 * forma explícita e não vaza detalhe de configuração ao chamador.
 */
async function runCommentsAudienceStage(db: FacebookCommentsRunnerDb, clientId: string, targetId: string): Promise<{ status: CommentsStatus; summary?: FacebookCommentsClientRunSummary; code?: string }> {
  let source: FacebookCommentsProvider;
  try {
    source = new FacebookCommentsProvider(facebookCommentsProviderConfigFromEnv());
  } catch {
    return { status: 'SKIPPED_PROVIDER_CREDENTIAL_MISSING' };
  }
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('FACEBOOK_COMMENTS_STAGE_TIMEOUT')), COMMENTS_STAGE_TIMEOUT_MS);
    });
    const summary = await Promise.race([
      runFacebookCommentsForClient({
        source,
        db,
        clientId,
        targetId,
        maxPosts: COMMENTS_MAX_POSTS_PER_RUN,
        maxComments: COMMENTS_MAX_PER_POST,
        maxPages: COMMENTS_MAX_PAGES,
      }),
      deadline,
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
    const status: CommentsStatus = summary.eligible === 0 ? 'NOTHING_TO_PROCESS' : summary.failed > 0 ? 'SUCCESS_WITH_FAILURES' : 'SUCCESS';
    return { status, summary };
  } catch (error) {
    return { status: 'FAILED', code: error instanceof Error ? error.message : 'FACEBOOK_COMMENTS_AUDIENCE_FAILED' };
  }
}

const payloadSchema = z.object({
  clientId: z.string().uuid(),
  targetId: z.string().uuid(),
  maxPosts: z.number().int().min(1).max(MAX_POSTS).optional(),
}).strict();

type OperationalStatus = 'SUCCESS' | 'SUCCESS_WITH_FAILURES' | 'NOTHING_TO_PROCESS';

function validServiceSecret(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

function correlationIdFrom(request: NextRequest): string {
  const received = request.headers.get('x-correlation-id');
  return received && /^[A-Za-z0-9._:-]{1,128}$/.test(received) ? received : randomUUID();
}

function operationalStatus(summary: FacebookAnalysisRunSummary): OperationalStatus {
  if (summary.eligible === 0) return 'NOTHING_TO_PROCESS';
  if (summary.failed > 0) return 'SUCCESS_WITH_FAILURES';
  return 'SUCCESS';
}

function safeItemReason(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  if (reason === 'ALREADY_ANALYZED') return reason;
  if (reason === 'MODEL_RESPONSE_NOT_JSON' || reason === 'SCHEMA_VALIDATION_FAILED') return reason;
  if (reason === 'FACEBOOK_ANALYSIS_MODEL_REFUSAL') return reason;
  if (reason.startsWith('PERSIST_FAILED:')) return 'PERSIST_FAILED';
  return 'ANALYSIS_FAILED';
}

function safeFailure(error: unknown): { code: string; status: number } {
  const code = error instanceof Error ? error.message : '';
  if (code === 'FACEBOOK_ANALYSIS_PROVIDER_CREDENTIAL_MISSING') return { code, status: 503 };
  if (code === 'FACEBOOK_ANALYSIS_SCOPE_INVALID') return { code, status: 400 };
  if (code.startsWith('FACEBOOK_PENDING_ANALYSIS_QUERY_FAILED')) return { code: 'FACEBOOK_PENDING_ANALYSIS_QUERY_FAILED', status: 502 };
  return { code: 'FACEBOOK_ANALYSIS_FAILED', status: 500 };
}



export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const correlationId = correlationIdFrom(request);
  const receivedSecret = request.headers.get('x-webhook-secret');
  const serviceAuthenticated = validServiceSecret(receivedSecret, process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET);

  if (receivedSecret && !serviceAuthenticated) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'INVALID_WEBHOOK_SECRET', correlationId }, { status: 401 });
  }

  const session = serviceAuthenticated ? null : await getSession();
  if (!serviceAuthenticated && !session) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'UNAUTHENTICATED', correlationId }, { status: 401 });
  }
  if (!serviceAuthenticated && !sameOrigin(request)) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'ORIGIN_MISMATCH', correlationId }, { status: 403 });
  }
  if (session && !(session.role === 'admin' || (session.role === 'gestor' && session.permissions.includes('automacoes')))) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'FORBIDDEN', correlationId }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'INVALID_PAYLOAD', correlationId }, { status: 400 });
  }

  const { clientId, targetId, maxPosts } = parsed.data;
  if (session?.role === 'gestor' && (session.clientId !== clientId || !session.allowedTargetIds.includes(targetId))) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'TENANT_SCOPE_FORBIDDEN', correlationId }, { status: 403 });
  }

  const rateLimitKey = `${serviceAuthenticated ? 'service' : `user:${session!.userId}`}:${clientId}:${targetId}`;
  if (!consumeRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { ok: false, status: 'FAILED', code: 'RATE_LIMITED', correlationId },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const db = createAdminClient();
  const target = await db.from('targets').select('id').eq('id', targetId).eq('client_id', clientId).eq('is_active', true).maybeSingle();
  if (target.error) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'TARGET_SCOPE_CHECK_FAILED', correlationId }, { status: 502 });
  }
  if (!target.data) {
    return NextResponse.json({ ok: false, status: 'FAILED', code: 'TARGET_SCOPE_INVALID', correlationId }, { status: 403 });
  }

  try {
    const summary = await runFacebookAnalysis({
      clientId,
      targetId,
      maxPosts,
      db: db as unknown as FacebookAnalysisDbClient,
    });
    const status = operationalStatus(summary);
    const items = summary.items.map((item) => ({ ...item, reason: safeItemReason(item.reason) }));

    const commentsAudience = await runCommentsAudienceStage(db as unknown as FacebookCommentsRunnerDb, clientId, targetId);

    const response = {
      ok: true,
      status,
      platform: 'facebook' as const,
      clientId,
      targetId,
      correlationId,
      eligible: summary.eligible,
      processed: summary.processed,
      success: summary.success,
      failed: summary.failed,
      skipped: summary.skipped,
      analysisComplete: summary.failed === 0,
      termination: status === 'NOTHING_TO_PROCESS' ? 'NOTHING_TO_PROCESS' : status === 'SUCCESS' ? 'COMPLETED' : 'COMPLETED_WITH_FAILURES',
      items,
      commentsAudience: {
        status: commentsAudience.status,
        eligible: commentsAudience.summary?.eligible ?? 0,
        processed: commentsAudience.summary?.processed ?? 0,
        success: commentsAudience.summary?.success ?? 0,
        failed: commentsAudience.summary?.failed ?? 0,
        skipped: commentsAudience.summary?.skipped ?? 0,
        commentsCollected: commentsAudience.summary?.items.reduce((sum, item) => sum + (item.commentsCollected ?? 0), 0) ?? 0,
        commentsAnalyzed: commentsAudience.summary?.items.reduce((sum, item) => sum + (item.commentsAnalyzed ?? 0), 0) ?? 0,
      },
    };
    console.info('[FacebookAnalyze]', {
      correlationId, clientId, targetId, platform: 'facebook', status,
      eligible: summary.eligible, success: summary.success, failed: summary.failed,
      skipped: summary.skipped, durationMs: Date.now() - startedAt,
      commentsAudienceStatus: commentsAudience.status,
      commentsAudienceEligible: commentsAudience.summary?.eligible ?? 0,
      commentsCollected: response.commentsAudience.commentsCollected,
      commentsAnalyzed: response.commentsAudience.commentsAnalyzed,
    });
    return NextResponse.json(response);
  } catch (error) {
    const safe = safeFailure(error);
    console.error('[FacebookAnalyze]', {
      correlationId, clientId, targetId, platform: 'facebook', status: 'FAILED',
      code: safe.code, durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: false, status: 'FAILED', code: safe.code, correlationId }, { status: safe.status });
  }
}
