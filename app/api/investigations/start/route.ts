import { NextRequest, NextResponse } from 'next/server';
import type { StartInvestigationPayload } from '@/lib/types/investigations';

const N8N_TIMEOUT_MS = 120000;
const RESPONSE_LOG_LIMIT = 1000;
const SENSITIVE_LOG_KEYS = ['api_key', 'apikey', 'authorization', 'password', 'secret', 'token'];

function redactUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'URL inválida';
  }
}

function getWebhookUrlKind(url: string) {
  if (url.includes('/webhook-test/')) return 'test';
  if (url.includes('/webhook/')) return 'production';
  return 'unknown';
}

function hasPlaceholderHost(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('seu-n8n') || hostname.includes('seu-dominio');
  } catch {
    return false;
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
  if (status === 401) return 'Erro HTTP 401: API key inválida';
  if (status === 404) return 'Erro HTTP 404: webhook não encontrado';
  if (status >= 500) return `Erro HTTP ${status}: erro no n8n`;
  return `Erro HTTP do n8n: ${status}`;
}

function isSuccessResponse(data: unknown): data is { success: true } {
  return Boolean(
    data &&
    typeof data === 'object' &&
    'success' in data &&
    (data as Record<string, unknown>).success === true
  );
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
  const webhookUrl = process.env.N8N_INVESTIGATION_WEBHOOK_URL;
  const apiKey = process.env.N8N_INVESTIGATION_API_KEY;
  const missingEnv = [
    !webhookUrl ? 'N8N_INVESTIGATION_WEBHOOK_URL' : null,
    !apiKey ? 'N8N_INVESTIGATION_API_KEY' : null,
  ].filter(Boolean) as string[];

  if (missingEnv.length > 0) {
    console.error('[Investigação] Configuração n8n:', {
      hasWebhookUrl: Boolean(webhookUrl),
      hasApiKey: Boolean(apiKey),
      missingEnv,
    });
    return NextResponse.json(
      {
        success: false,
        error: `Serviço de investigação não configurado. Variáveis ausentes: ${missingEnv.join(', ')}.`,
        code: 'INVESTIGATION_ENV_MISSING',
        missing_env: missingEnv,
      },
      { status: 503 }
    );
  }
  const configuredWebhookUrl = webhookUrl as string;
  const webhookUrlKind = getWebhookUrlKind(configuredWebhookUrl);

  console.info('[Investigação] Configuração n8n:', {
    hasWebhookUrl: true,
    hasApiKey: true,
    webhookUrl: redactUrl(configuredWebhookUrl),
    webhookUrlKind,
  });
  console.log('Webhook URL:', process.env.N8N_INVESTIGATION_WEBHOOK_URL);

  if (hasPlaceholderHost(configuredWebhookUrl)) {
    console.error('[Investigação] URL do webhook n8n ainda usa placeholder:', {
      webhookUrl: redactUrl(configuredWebhookUrl),
      webhookUrlKind,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'URL do webhook n8n inválida ou placeholder',
        code: 'N8N_WEBHOOK_URL_INVALID',
      },
      { status: 503 }
    );
  }

  let payload: StartInvestigationPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const required: (keyof StartInvestigationPayload)[] = [
    'mention_id', 'candidate_id', 'candidate_name', 'source_url',
    'original_title', 'original_summary', 'published_at', 'source', 'city',
  ];
  for (const field of required) {
    if (!payload[field]) {
      return NextResponse.json(
        { success: false, error: `Campo obrigatório ausente: ${field}` },
        { status: 400 }
      );
    }
  }

  console.info('[Investigação] Payload recebido pela API local:', {
    keys: Object.keys(payload),
    requiredFieldsPresent: required.every((field) => Boolean(payload[field])),
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
    try {
      const n8nRes = await fetch(process.env.N8N_INVESTIGATION_WEBHOOK_URL as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.N8N_INVESTIGATION_API_KEY as string,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawResponse = await n8nRes.text();
      const data = parseN8nResponse(rawResponse);

      console.info('[Investigação] Resposta do n8n:', {
        status: n8nRes.status,
        statusText: n8nRes.statusText,
        raw: rawResponse.slice(0, RESPONSE_LOG_LIMIT),
        success: isSuccessResponse(data),
        body: sanitizeForLog(data),
      });

      if (!n8nRes.ok) {
        const error = getN8nErrorMessage(n8nRes.status);
        return NextResponse.json(
          {
            success: false,
            error,
            message: 'Erro no fluxo n8n',
            code: 'N8N_HTTP_ERROR',
            statusCode: n8nRes.status,
            n8n_status: n8nRes.status,
            n8n_status_text: n8nRes.statusText,
            details: sanitizeForLog(data),
            n8n_response: sanitizeForLog(data),
          },
          { status: n8nRes.status }
        );
      }

      if (!isSuccessResponse(data)) {
        console.warn('[Investigação] n8n respondeu sem success=true:', {
          status: n8nRes.status,
          statusText: n8nRes.statusText,
          raw: rawResponse.slice(0, RESPONSE_LOG_LIMIT),
          body: sanitizeForLog(data),
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Resposta do n8n não confirmou sucesso',
            message: 'Resposta do n8n não confirmou sucesso',
            code: 'N8N_UNSUCCESSFUL_RESPONSE',
            statusCode: n8nRes.status,
            n8n_status: n8nRes.status,
            n8n_status_text: n8nRes.statusText,
            details: sanitizeForLog(data),
          },
          { status: 502 }
        );
      }

      return NextResponse.json(data, { status: 200 });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.error('[Investigação] Webhook n8n inacessível:', {
      isTimeout,
      message,
      webhookUrl: redactUrl(configuredWebhookUrl),
      webhookUrlKind,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook inacessível',
        code: isTimeout ? 'N8N_TIMEOUT' : 'N8N_FETCH_FAILED',
        details: message,
      },
      { status: 502 }
    );
  }
}
