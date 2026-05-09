// ---------------------------------------------------------------------------
// n8n Webhook Trigger — PolitixOS
// ---------------------------------------------------------------------------
// URLs de produção definidas como fallback direto.
// Para sobrescrever em outros ambientes, defina as variáveis de ambiente
// NEXT_PUBLIC_WEBHOOK_* no .env.local ou nas configurações da Vercel.
// ---------------------------------------------------------------------------

export const WEBHOOKS = {
  noticias:        process.env.NEXT_PUBLIC_WEBHOOK_NOTICIAS        ?? 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-noticias',
  posts:           process.env.NEXT_PUBLIC_WEBHOOK_POSTS           ?? 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-posts',
  comentarios:     process.env.NEXT_PUBLIC_WEBHOOK_COMENTARIOS     ?? 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-comentarios',
  analise:         process.env.NEXT_PUBLIC_WEBHOOK_ANALISE         ?? 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-analise',
  reprocessamento: process.env.NEXT_PUBLIC_WEBHOOK_REPROCESSAMENTO ?? 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-reprocessamento',
} as const;

export type WebhookKey = keyof typeof WEBHOOKS;

/**
 * Dispara um webhook POST no n8n e aguarda a resposta.
 * Lança erro se a resposta HTTP não for 2xx.
 */
export async function triggerN8nWebhook(url: string): Promise<true> {
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

// Alias para compatibilidade com o spec original
export const triggerWebhook = triggerN8nWebhook;
