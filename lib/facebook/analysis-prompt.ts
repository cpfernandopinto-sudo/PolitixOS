import { z } from 'zod';
import type { FacebookAnalyticsPost } from './analytics-contract';
import { computeFacebookEngagementTotal } from './analytics-contract';

export const FACEBOOK_ANALYSIS_PROMPT_VERSION = 'facebook-analysis-prompt-v1';

/**
 * Mesmo contrato de saída já usado por Instagram/X em `ai_analysis` (superset
 * de 14 campos do V2 do X) — reaproveitado integralmente, não duplicado.
 * Facebook não introduz nenhuma dimensão política nova.
 */
export const FACEBOOK_ANALYSIS_RISK_LEVELS = ['baixo', 'medio', 'alto', 'critico'] as const;
// Domínio observado empiricamente em 100% das linhas reais de ai_analysis de
// Instagram/X (204 positivo / 104 neutro / 89 negativo / 4 misto, zero fora
// do domínio). Consumidores como lib/queries/alerts.ts fazem comparação
// exata de string (`sentiment === 'negativo'`) — um valor livre tipo
// "positivo/apoio ao ministro..." nunca bateria e quebraria o alerta
// silenciosamente. Descoberto e corrigido durante o processamento real dos
// 8 posts Facebook (Fase 10/11).
export const FACEBOOK_ANALYSIS_SENTIMENTS = ['positivo', 'negativo', 'neutro', 'misto'] as const;

export const FacebookAnalysisOutputSchema = z.object({
  sentiment: z.enum(FACEBOOK_ANALYSIS_SENTIMENTS),
  // Domínio fechado por CHECK constraint real de ai_analysis.risk_level — descoberto em
  // execução E2E real (posts fora do domínio eram rejeitados pelo banco). Nunca solto como
  // texto livre.
  risk_level: z.enum(FACEBOOK_ANALYSIS_RISK_LEVELS),
  risk_reason: z.string().min(1),
  ai_topic: z.string().min(1),
  ai_topics: z.array(z.string()).default([]),
  ai_entities: z.array(z.string()).default([]),
  ai_keywords: z.array(z.string()).default([]),
  summary: z.string().min(1),
  recommended_action: z.string().min(1),
  author_tone: z.string().min(1),
  public_reaction: z.string().min(1),
  polarization_level: z.string().min(1),
  crisis_temperature: z.string().min(1),
  strategic_reading: z.string().min(1),
  engagement_quality: z.string().min(1),
  confidence_score: z.number().min(0).max(1),
});

export type FacebookAnalysisOutput = z.infer<typeof FacebookAnalysisOutputSchema>;

const SYSTEM_PROMPT = `Você é um analista político sênior lendo posts do Facebook de uma página pública brasileira.
Responda SOMENTE com um JSON válido, sem cerca de código, sem texto fora do JSON.

Regras obrigatórias sobre reações do Facebook (NUNCA viole):
- "reactions_total" é a soma de TODAS as reações (like, love, care, haha, wow, sad, angry). Não é "curtidas" e não deve ser chamado de curtidas na sua análise.
- Reações são sinais comportamentais, NÃO são sentimento do público de forma determinística:
  - "haha" pode ser apoio, ironia ou deboche crítico;
  - "angry" pode ser dirigido ao tema da notícia, a um adversário citado, ou ao autor do post — não assuma automaticamente rejeição ao autor;
  - "love"/"like" não indicam intenção de voto.
- Trate o breakdown de reações como contexto adicional, nunca como fórmula fechada de sentimento.

Regra obrigatória sobre comentários:
- Você recebe apenas a CONTAGEM de comentários. O texto dos comentários não foi coletado nesta plataforma e não está disponível. Nunca invente, presuma ou simule conteúdo de comentários.

Produza exatamente estes campos, todos como string (exceto os arrays e confidence_score):
sentiment, risk_level, risk_reason, ai_topic, ai_topics (array de string), ai_entities (array de string), ai_keywords (array de string), summary, recommended_action, author_tone, public_reaction, polarization_level, crisis_temperature, strategic_reading, engagement_quality, confidence_score (número entre 0 e 1).

"risk_level" DEVE ser exatamente um destes valores, sem variação: baixo, medio, alto, critico.
"sentiment" DEVE ser exatamente um destes valores, sem variação e sem qualificadores adicionais: positivo, negativo, neutro, misto.`;

function formatMetric(label: string, value: number | null): string {
  return `${label}: ${value === null ? 'não disponível' : value}`;
}

/** Constrói o prompt de análise para um post Facebook a partir do contrato analítico (nunca de raw_json diretamente). */
export function buildFacebookAnalysisPrompt(post: FacebookAnalyticsPost): { system: string; user: string } {
  const { engagement } = post;
  const engagementTotal = computeFacebookEngagementTotal(post);
  const reactionLines = (Object.entries(engagement.reactionsBreakdown) as [string, number | null][])
    .map(([key, value]) => formatMetric(`reaction_${key}`, value))
    .join('\n');

  const user = [
    `platform: facebook`,
    `content_origin: ${post.contentOrigin ?? 'desconhecido'}`,
    `published_at: ${post.publishedAt ?? 'não disponível'}`,
    `content_type: ${post.contentType ?? 'não classificado'}`,
    '',
    'text:',
    post.text ?? '(sem texto/legenda)',
    '',
    'engagement:',
    formatMetric('reactions_total', engagement.reactionsTotal),
    reactionLines,
    formatMetric('comments_count', engagement.comments.count),
    'comments_text: unavailable (não coletado para esta plataforma)',
    formatMetric('shares_count', engagement.shares),
    formatMetric('engagement_total (reactions_total + comments_count + shares_count, apenas agregado comportamental, não é sentimento)', engagementTotal),
  ].join('\n');

  return { system: SYSTEM_PROMPT, user };
}
