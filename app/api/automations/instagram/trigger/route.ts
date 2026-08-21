import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Trigger server-side para as automações de Instagram (hardening P0).
// ---------------------------------------------------------------------------
// Antes: o browser chamava o webhook do n8n diretamente (lib/n8n.ts,
// triggerN8nWebhook), sem autenticação e com a URL exposta via
// NEXT_PUBLIC_WEBHOOK_*. Agora: o browser chama esta rota (que valida sessão
// e permissão do PolitixOS) e é ESTA rota, rodando no servidor, que fala com
// o n8n — carregando um segredo server-to-server que o browser nunca vê.
//
// Padrão de tratamento de erro/timeout/log espelha
// app/api/investigations/start/route.ts (referência arquitetural mais madura
// já existente no projeto para chamadas server-side ao n8n).
// ---------------------------------------------------------------------------

const N8N_TIMEOUT_MS = 120000;
const RESPONSE_LOG_LIMIT = 1000;
const SENSITIVE_LOG_KEYS = ['api_key', 'apikey', 'authorization', 'password', 'secret', 'token'];

const INSTAGRAM_FLOWS = ['posts', 'comentarios', 'analise', 'reprocessamento'] as const;
type InstagramFlow = (typeof INSTAGRAM_FLOWS)[number];

function isInstagramFlow(value: unknown): value is InstagramFlow {
  return typeof value === 'string' && (INSTAGRAM_FLOWS as readonly string[]).includes(value);
}

// Uma env var dedicada por fluxo (server-only, sem NEXT_PUBLIC_). O fallback
// aponta para a MESMA URL de produção que já era pública em lib/n8n.ts hoje —
// não é uma exposição nova, só evita quebrar o ambiente enquanto as env vars
// dedicadas não estiverem configuradas na Vercel.
const FLOW_WEBHOOK_ENV: Record<InstagramFlow, string> = {
  posts: 'N8N_WEBHOOK_URL_INSTAGRAM_POSTS',
  comentarios: 'N8N_WEBHOOK_URL_INSTAGRAM_COMENTARIOS',
  analise: 'N8N_WEBHOOK_URL_INSTAGRAM_ANALISE',
  reprocessamento: 'N8N_WEBHOOK_URL_INSTAGRAM_REPROCESSAMENTO',
};

const FLOW_WEBHOOK_FALLBACK: Record<InstagramFlow, string> = {
  posts: 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-posts',
  comentarios: 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-comentarios',
  analise: 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-analise',
  reprocessamento: 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-reprocessamento',
};

function redactUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'URL inválida';
  }
}

function parseN8nResponse(rawResponse: string) {
  if (!rawResponse) return {};
  try {
    return JSON.parse(rawResponse);
  } catch {
    return { raw: rawResponse.slice(0, RESPONSE_LOG_LIMIT) };
  }
}

function getN8nErrorMessage(status: number) {
  if (status === 401 || status === 403) return `Erro HTTP ${status}: segredo do webhook rejeitado pelo n8n`;
  if (status === 404) return 'Erro HTTP 404: webhook não encontrado';
  if (status >= 500) return `Erro HTTP ${status}: erro no n8n`;
  return `Erro HTTP do n8n: ${status}`;
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.slice(0, RESPONSE_LOG_LIMIT);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const normalizedKey = key.toLowerCase().replaceAll('-', '_');
      const isSensitive = SENSITIVE_LOG_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
      return [key, isSensitive ? '[redacted]' : sanitizeForLog(item, depth + 1)];
    })
  );
}

export async function POST(req: NextRequest) {
  // 1. Sessão do PolitixOS (rotas /api/** não passam pelo middleware — ver
  //    proxy.ts, matcher exclui /api — então a checagem tem que ser feita aqui).
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Não autenticado.', code: 'UNAUTHENTICATED' }, { status: 401 });
  }

  // 2. Permissão da tela Instagram (admin ignora restrições, igual ao middleware).
  const hasPermission = session.role === 'admin' || session.permissions.includes('instagram');
  if (!hasPermission) {
    console.warn(`[Instagram Trigger] Usuário ${session.email} sem permissão 'instagram'.`);
    return NextResponse.json({ success: false, error: 'Sem permissão para esta ação.', code: 'FORBIDDEN' }, { status: 403 });
  }

  // 3. Fluxo permitido (whitelist fechada — nunca repassar uma URL arbitrária).
  let body: { flow?: unknown; clientId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!isInstagramFlow(body.flow)) {
    return NextResponse.json(
      { success: false, error: `Fluxo inválido. Use um de: ${INSTAGRAM_FLOWS.join(', ')}.` },
      { status: 400 }
    );
  }
  const flow = body.flow;

  // 4. client_id (Bloco 2 — multi-tenant). NUNCA confiar no valor vindo do
  //    browser para um usuário não-admin: o cliente efetivo é sempre o da
  //    própria sessão (calculado no login). Se o body tentar informar um
  //    client_id diferente do da sessão, é tratado como forjado -> 403,
  //    mesmo que seja um UUID de cliente real (Teste D do checkpoint).
  //    Admin pode informar um client_id explícito (é confiável só porque
  //    admin já enxerga todos os clientes por definição — não é "pular" a
  //    validação, é a própria regra de admin) ou omitir (= todos os
  //    clientes, igual ao comportamento anterior ao Bloco 2).
  const requestedClientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
  let effectiveClientId: string | null;
  if (session.role === 'admin') {
    effectiveClientId = requestedClientId;
  } else {
    const sessionClientId = session.clientId;
    if (requestedClientId && requestedClientId !== sessionClientId) {
      console.warn('[Instagram Trigger] client_id forjado rejeitado:', {
        userId: session.userId,
        userEmail: session.email,
        sessionClientId,
        requestedClientId,
      });
      return NextResponse.json(
        { success: false, error: 'client_id não corresponde ao cliente do usuário.', code: 'CLIENT_ID_MISMATCH' },
        { status: 403 }
      );
    }
    effectiveClientId = sessionClientId;
  }

  const webhookUrl = process.env[FLOW_WEBHOOK_ENV[flow]] || FLOW_WEBHOOK_FALLBACK[flow];
  const secret = process.env.N8N_INSTAGRAM_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Instagram Trigger] N8N_INSTAGRAM_WEBHOOK_SECRET não configurado.');
    return NextResponse.json(
      {
        success: false,
        error: 'Automação não configurada neste ambiente.',
        code: 'INSTAGRAM_WEBHOOK_SECRET_MISSING',
      },
      { status: 503 }
    );
  }

  console.info('[Instagram Trigger] Disparo recebido:', {
    flow,
    userId: session.userId,
    userEmail: session.email,
    clientId: effectiveClientId,
    webhookUrl: redactUrl(webhookUrl),
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
    try {
      const n8nRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Nome do header definido pela credencial "Header Auth" criada no n8n
          // (N8N_INSTAGRAM_WEBHOOK_SECRET) — não é "Authorization" porque foi
          // assim que a credencial foi cadastrada lá.
          N8N_INSTAGRAM_WEBHOOK_SECRET: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          source: 'politixos_manual',
          flow,
          triggeredAt: new Date().toISOString(),
          triggeredBy: session.email,
          // null = todos os clientes (só possível para admin, sem client_id
          // informado) — o n8n trata ausência/null como "sem filtro de
          // cliente", igual ao comportamento anterior ao Bloco 2.
          clientId: effectiveClientId,
        }),
        signal: controller.signal,
      });

      const rawResponse = await n8nRes.text();
      const data = parseN8nResponse(rawResponse);

      console.info('[Instagram Trigger] Resposta do n8n:', {
        flow,
        status: n8nRes.status,
        body: sanitizeForLog(data),
      });

      if (!n8nRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: getN8nErrorMessage(n8nRes.status),
            code: 'N8N_HTTP_ERROR',
            statusCode: n8nRes.status,
          },
          { status: n8nRes.status }
        );
      }

      return NextResponse.json({ success: true, flow }, { status: 200 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.error('[Instagram Trigger] Webhook n8n inacessível:', {
      flow,
      isTimeout,
      message,
      webhookUrl: redactUrl(webhookUrl),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook inacessível',
        code: isTimeout ? 'N8N_TIMEOUT' : 'N8N_FETCH_FAILED',
      },
      { status: 502 }
    );
  }
}
