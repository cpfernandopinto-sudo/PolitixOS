// ---------------------------------------------------------------------------
// n8n Webhook Trigger — PolitixOS
// ---------------------------------------------------------------------------
// URLs de produção definidas como fallback direto.
// Para sobrescrever em outros ambientes, defina as variáveis de ambiente
// NEXT_PUBLIC_WEBHOOK_* no .env.local ou nas configurações da Vercel.
// ---------------------------------------------------------------------------

// NOTA (hardening P0 — bloco de segurança Instagram):
// As 4 entradas de Instagram (posts/comentarios/analise/reprocessamento)
// abaixo NÃO são mais usadas para disparar o webhook a partir do browser —
// isso agora passa por /api/automations/instagram/trigger (ver
// triggerInstagramAutomation abaixo), que roda no servidor e nunca expõe o
// segredo do n8n ao cliente. Elas viram um sentinela fixo (não a URL real do
// n8n) só para o AutomationPanel saber que o "canal" existe neste ambiente
// (checagem de UI, não de segurança) — isso também tira a URL real do n8n do
// bundle JS do browser para esses 4 fluxos. Notícias e X/Twitter NÃO foram
// alterados nesta etapa — continuam disparando o webhook n8n diretamente do
// browser via triggerN8nWebhook, com a URL real exposta como antes.
const INSTAGRAM_SERVER_SIDE_SENTINEL = 'instagram-server-side' as const;

export const WEBHOOKS = {
  noticias: process.env.NEXT_PUBLIC_WEBHOOK_NOTICIAS ?? 'https://n8n.srv1271569.hstgr.cloud/webhook/trigger-noticias',
  posts: INSTAGRAM_SERVER_SIDE_SENTINEL,
  comentarios: INSTAGRAM_SERVER_SIDE_SENTINEL,
  analise: INSTAGRAM_SERVER_SIDE_SENTINEL,
  reprocessamento: INSTAGRAM_SERVER_SIDE_SENTINEL,
  xPosts: process.env.NEXT_PUBLIC_WEBHOOK_X_POSTS,
  xReplies: process.env.NEXT_PUBLIC_WEBHOOK_X_REPLIES,
  xAiAnalysis: process.env.NEXT_PUBLIC_WEBHOOK_X_AI_ANALYSIS,
  xReprocess: process.env.NEXT_PUBLIC_WEBHOOK_X_REPROCESS,
} as const;

export type WebhookKey = keyof typeof WEBHOOKS;

/**
 * Dispara um webhook POST no n8n e aguarda a resposta.
 * Lança erro se a resposta HTTP não for 2xx.
 * Usado hoje só por Notícias e X/Twitter — Instagram usa
 * triggerInstagramAutomation (rota server-side autenticada).
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

// ---------------------------------------------------------------------------
// Instagram — trigger server-side (hardening P0)
// ---------------------------------------------------------------------------

export type InstagramFlowKey = 'posts' | 'comentarios' | 'analise' | 'reprocessamento';

export const INSTAGRAM_FLOW_KEYS: readonly InstagramFlowKey[] = [
  'posts',
  'comentarios',
  'analise',
  'reprocessamento',
];

export function isInstagramFlowKey(key: WebhookKey): key is InstagramFlowKey {
  return (INSTAGRAM_FLOW_KEYS as readonly string[]).includes(key);
}

/**
 * Dispara um fluxo de automação do Instagram via rota interna do PolitixOS
 * (/api/automations/instagram/trigger), que valida sessão/permissão e só
 * então chama o n8n no servidor, com o segredo server-to-server. O browser
 * nunca vê a URL real do n8n nem o segredo.
 */
export async function triggerInstagramAutomation(flow: InstagramFlowKey): Promise<true> {
  const res = await fetch('/api/automations/instagram/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flow }),
  });

  if (!res.ok) {
    throw new Error(`Erro ao acionar fluxo (HTTP ${res.status})`);
  }

  return true;
}
