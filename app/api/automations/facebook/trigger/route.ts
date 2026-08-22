import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { runFacebookCollectionForSocialAccount } from '@/lib/facebook/operational';
import { createAdminClient } from '@/lib/supabaseClient';

const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, number>();
const payloadSchema = z.object({
  socialAccountId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxPagesSafety: z.number().int().min(1).max(100).optional(),
}).strict();

function validServiceSecret(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function consumeRateLimit(key: string, now = Date.now()): boolean {
  const previous = rateLimitBuckets.get(key);
  if (previous && now - previous < RATE_LIMIT_WINDOW_MS) return false;
  rateLimitBuckets.set(key, now);
  return true;
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

function safeOperationalError(error: unknown): { code: string; status: number } {
  const code = error instanceof Error ? error.message : 'FACEBOOK_OPERATIONAL_FAILED';
  if (code === 'FACEBOOK_PAGE_ID_REQUIRED') return { code, status: 409 };
  if (code.includes('CONTEXT_INVALID') || code.includes('ACCOUNT_ID_REQUIRED')) return { code, status: 403 };
  if (code.includes('WINDOW_INVALID') || code.includes('INVALID_DATE') || code.includes('MAX_PAGES')) return { code, status: 400 };
  if (code.includes('PROVIDER_KEY_MISSING')) return { code, status: 503 };
  if (code.includes('PROVIDER_')) return { code, status: 502 };
  if (code === 'FACEBOOK_CROSS_TENANT_POST_CONFLICT' || code === 'FACEBOOK_POST_CONTEXT_CONFLICT') return { code, status: 409 };
  return { code: 'FACEBOOK_OPERATIONAL_FAILED', status: 500 };
}

export function __resetFacebookTriggerRateLimitForTests() {
  rateLimitBuckets.clear();
}

export async function POST(request: NextRequest) {
  const receivedSecret = request.headers.get('x-webhook-secret');
  const serviceAuthenticated = validServiceSecret(receivedSecret, process.env.FACEBOOK_COLLECTION_WEBHOOK_SECRET);
  if (receivedSecret && !serviceAuthenticated) {
    return NextResponse.json({ ok: false, code: 'INVALID_WEBHOOK_SECRET' }, { status: 401 });
  }

  const session = serviceAuthenticated ? null : await getSession();
  if (!serviceAuthenticated && !session) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (!serviceAuthenticated && !sameOrigin(request)) {
    return NextResponse.json({ ok: false, code: 'ORIGIN_MISMATCH' }, { status: 403 });
  }
  if (session && !(session.role === 'admin' || (session.role === 'gestor' && session.permissions.includes('automacoes')))) {
    return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.startDate >= parsed.data.endDate) {
    return NextResponse.json({ ok: false, code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const rateLimitKey = serviceAuthenticated
    ? `service:${parsed.data.socialAccountId}`
    : `user:${session!.userId}:${parsed.data.socialAccountId}`;
  if (!consumeRateLimit(rateLimitKey)) {
    return NextResponse.json({ ok: false, code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  try {
    const result = await runFacebookCollectionForSocialAccount(createAdminClient(), {
      ...parsed.data,
      expectedClientId: serviceAuthenticated || session!.role === 'admin' ? null : session!.clientId,
      allowedTargetIds: serviceAuthenticated || session!.role === 'admin' ? null : session!.allowedTargetIds,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const safe = safeOperationalError(error);
    return NextResponse.json({ ok: false, code: safe.code }, { status: safe.status });
  }
}
