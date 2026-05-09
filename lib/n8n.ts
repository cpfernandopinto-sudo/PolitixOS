// ---------------------------------------------------------------------------
// n8n Webhook Trigger
// ---------------------------------------------------------------------------
// URLs são lidas de variáveis de ambiente para não expor endpoints em código.
// Configure no .env.local e na Vercel → Settings → Environment Variables.
// ---------------------------------------------------------------------------

export const WEBHOOKS = {
  noticias:        process.env.NEXT_PUBLIC_WEBHOOK_NOTICIAS        ?? 'URL_WEBHOOK_1',
  posts:           process.env.NEXT_PUBLIC_WEBHOOK_POSTS           ?? 'URL_WEBHOOK_2',
  comentarios:     process.env.NEXT_PUBLIC_WEBHOOK_COMENTARIOS     ?? 'URL_WEBHOOK_3',
  analise:         process.env.NEXT_PUBLIC_WEBHOOK_ANALISE         ?? 'URL_WEBHOOK_4',
  reprocessamento: process.env.NEXT_PUBLIC_WEBHOOK_REPROCESSAMENTO ?? 'URL_WEBHOOK_5',
} as const;

export type WebhookKey = keyof typeof WEBHOOKS;

/**
 * Dispara um webhook POST no n8n.
 * Lança erro se a resposta não for ok (2xx).
 */
export async function triggerN8nWebhook(url: string): Promise<true> {
  if (!url || url.startsWith('URL_WEBHOOK')) {
    throw new Error('URL do webhook não configurada. Adicione a variável de ambiente correspondente.');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'politixos_manual', triggeredAt: new Date().toISOString() }),
  });

  if (!res.ok) {
    throw new Error(`Erro ao acionar fluxo (HTTP ${res.status})`);
  }

  return true;
}
