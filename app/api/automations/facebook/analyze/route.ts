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
import { createAdminClient } from '@/lib/supabaseClient';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_POSTS = 20;
const rateLimitBuckets = new Map<string, number>();

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

function consumeRateLimit(key: string, now = Date.now()): boolean {
  const previous = rateLimitBuckets.get(key);
  if (previous && now - previous < RATE_LIMIT_WINDOW_MS) return false;
  rateLimitBuckets.set(key, now);
  return true;
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

export function __resetFacebookAnalyzeRateLimitForTests() {
  rateLimitBuckets.clear();
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
    };
    console.info('[FacebookAnalyze]', {
      correlationId, clientId, targetId, platform: 'facebook', status,
      eligible: summary.eligible, success: summary.success, failed: summary.failed,
      skipped: summary.skipped, durationMs: Date.now() - startedAt,
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
