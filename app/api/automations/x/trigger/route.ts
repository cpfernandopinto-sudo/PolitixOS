import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabaseClient';

const X_PIPELINE_MODES = ['posts', 'replies', 'ai', 'reprocess', 'full'] as const;
export type XPipelineMode = (typeof X_PIPELINE_MODES)[number];

const N8N_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<XPipelineMode, number> = { posts: 5, replies: 5, ai: 1, reprocess: 1, full: 1 };
const rateLimitBuckets = new Map<string, number[]>();

function isXPipelineMode(value: unknown): value is XPipelineMode {
  return typeof value === 'string' && (X_PIPELINE_MODES as readonly string[]).includes(value);
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  return !origin || origin === req.nextUrl.origin;
}

function consumeRateLimit(userId: string, mode: XPipelineMode, now = Date.now()): boolean {
  const key = `${userId}:${mode}`;
  const recent = (rateLimitBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMITS[mode]) return false;
  rateLimitBuckets.set(key, [...recent, now]);
  return true;
}

async function getAuthorizedXHandles(targetIds: string[]): Promise<string[]> {
  if (targetIds.length === 0) return [];
  const client = createAdminClient();
  const result = await client
    .from('social_accounts')
    .select('handle,target_id')
    .in('target_id', targetIds)
    .in('platform', ['x', 'twitter'])
    .eq('is_active', true);
  if (result.error) throw new Error('AUTHORIZED_TARGET_LOOKUP_FAILED');
  return [...new Set((result.data ?? [])
    .map((account) => typeof account.handle === 'string' ? account.handle.trim().replace(/^@/, '') : '')
    .filter(Boolean))];
}

export function __resetXTriggerRateLimitForTests() {
  rateLimitBuckets.clear();
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', error: 'Não autenticado.' }, { status: 401 });
  }

  const canRunXAutomation = session.role === 'admin' || (session.role === 'gestor' && session.permissions.includes('x'));
  if (!canRunXAutomation) {
    return NextResponse.json({ ok: false, code: 'FORBIDDEN', error: 'Sem permissão para esta ação.' }, { status: 403 });
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, code: 'ORIGIN_MISMATCH', error: 'Origem da solicitação não permitida.' }, { status: 403 });
  }

  let body: { mode?: unknown; ai_enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_PAYLOAD', error: 'Payload inválido.' }, { status: 400 });
  }

  if (!isXPipelineMode(body.mode)) {
    return NextResponse.json({ ok: false, code: 'INVALID_MODE', error: `Mode inválido. Use um de: ${X_PIPELINE_MODES.join(', ')}.` }, { status: 400 });
  }
  const mode = body.mode;
  const aiEnabled = ['ai', 'reprocess', 'full'].includes(mode)
    ? body.ai_enabled === true
    : undefined;

  if (mode === 'full' && session.role !== 'admin') {
    return NextResponse.json({ ok: false, code: 'FULL_MODE_ADMIN_ONLY', error: 'Modo full restrito a administradores.' }, { status: 403 });
  }

  let targetAllowlist: string[] | null = null;
  if (session.role !== 'admin') {
    try {
      targetAllowlist = await getAuthorizedXHandles(session.allowedTargetIds ?? []);
    } catch {
      return NextResponse.json({ ok: false, code: 'TENANT_SCOPE_UNAVAILABLE', error: 'Não foi possível validar o escopo do usuário.' }, { status: 503 });
    }
    if (targetAllowlist.length === 0 || !session.clientId) {
      return NextResponse.json({ ok: false, code: 'NO_AUTHORIZED_X_TARGETS', error: 'Nenhum perfil X autorizado para este usuário.' }, { status: 403 });
    }
  }

  if (!consumeRateLimit(session.userId, mode)) {
    return NextResponse.json({ ok: false, code: 'RATE_LIMITED', error: 'Aguarde antes de enviar uma nova solicitação.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  const webhookUrl = process.env.N8N_X_PIPELINE_V2_WEBHOOK_URL;
  const secret = process.env.N8N_X_PIPELINE_WEBHOOK_SECRET;
  if (!webhookUrl) {
    return NextResponse.json({ ok: false, code: 'X_WEBHOOK_URL_MISSING', error: 'Automação X não configurada neste ambiente.' }, { status: 503 });
  }
  if (!secret) {
    return NextResponse.json({ ok: false, code: 'X_WEBHOOK_SECRET_MISSING', error: 'Automação X não configurada neste ambiente.' }, { status: 503 });
  }

  try {
    new URL(webhookUrl);
  } catch {
    return NextResponse.json({ ok: false, code: 'X_WEBHOOK_URL_INVALID', error: 'Automação X indisponível neste ambiente.' }, { status: 503 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': secret,
      },
      body: JSON.stringify({
        source: 'politixos_manual',
        mode,
        ...(aiEnabled !== undefined ? { ai_enabled: aiEnabled } : {}),
        clientId: session.clientId,
        ...(targetAllowlist ? { target_allowlist: targetAllowlist } : {}),
        triggeredAt: new Date().toISOString(),
        triggeredBy: session.email,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, code: response.status >= 500 ? 'N8N_UNAVAILABLE' : 'N8N_REJECTED', error: 'Pipeline X indisponível.' },
        { status: response.status >= 500 ? 502 : 502 }
      );
    }

    return NextResponse.json({ ok: true, status: 'accepted', mode }, { status: 202 });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { ok: false, code: isTimeout ? 'N8N_TIMEOUT' : 'N8N_UNAVAILABLE', error: isTimeout ? 'Tempo limite ao enviar solicitação.' : 'Pipeline X indisponível.' },
      { status: isTimeout ? 503 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
