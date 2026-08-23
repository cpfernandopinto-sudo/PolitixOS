import 'server-only';
import { createAdminClient } from '@/lib/supabaseClient';
import { fetchFacebookData } from './facebook';
import { shouldReturnEmptyForAccess } from './alerts';
import { toFacebookAnalyticsContract, computeFacebookEngagementTotal, type FacebookAnalyticsSourceRow } from '@/lib/facebook/analytics-contract';

/**
 * Achata o modelo de leitura do Facebook (`{ post, analysis }`, nomes
 * próprios como `caption`/`taken_at`/`risk_level`) para o MESMO formato
 * plano que Instagram/X já expõem à Visão Geral (`text`/`created_at`/
 * `sentiment`/`risk`/`topic`/`candidate_name`) — ver lib/queries/instagram.ts
 * (mapeamento de posts) para o precedente exato reaproveitado aqui.
 *
 * Propositalmente um arquivo próprio, em vez de estender lib/queries/facebook.ts
 * (que a frente do Codex está evoluindo em paralelo — comentários, sentimento
 * de audiência) ou lib/facebook/* (normalizer/prompt/contrato de IA do
 * Facebook): este adapter só CONSOME o contrato público já existente
 * (fetchFacebookData, toFacebookAnalyticsContract), nunca reimplementa
 * coleta, persistência ou análise.
 */
export interface FacebookOverviewPost {
  id: string;
  target_id: string | null;
  candidate_name: string;
  text: string;
  created_at: string | null;
  /** Sempre null — Facebook não tem uma métrica de "curtidas" isolada e semanticamente equivalente às demais redes (ver lib/facebook/analytics-contract.ts). Nunca converter em 0 aqui. */
  like_count: null;
  comment_count: number;
  share_count: number;
  /** reactionsTotal + comments + shares (computeFacebookEngagementTotal) — usado como proxy de engajamento onde o restante do pipeline soma like_count+comment_count. */
  engagement_total: number;
  url: string;
  sentiment: string;
  risk: string;
  topic: string;
  recommendedAction: string;
}

export interface FacebookOverviewFilters {
  candidateIds?: string[] | null;
  period?: string | null;
  allowedTargetIds?: string[] | null;
}

/**
 * Busca e achata os posts Facebook para consumo pela Visão Geral, com o
 * mesmo escopo de tenant/candidato/período já aplicado por
 * fetchFacebookData (que por sua vez delega a fetchFacebookPosts —
 * nenhuma nova lógica de filtro é criada aqui).
 */
export async function fetchFacebookOverviewPosts(filters: FacebookOverviewFilters): Promise<FacebookOverviewPost[]> {
  // Defesa em profundidade: `resolveFacebookTargetScope` (lib/queries/facebook.ts)
  // já retorna `[]` para allowedTargetIds=[] (negação explícita) e
  // `fetchFacebookPosts`/`fetchFacebookData` já encerram a leitura antes de
  // qualquer I/O nesse caso — verificado nesta auditoria. Este check é
  // redundante com aquela proteção, não uma correção de um bug ali; mantido
  // aqui pelo mesmo motivo que Instagram/X usam `shouldReturnEmptyForAccess`
  // (lib/queries/alerts.ts) neste módulo: a Visão Geral não deve depender de
  // detalhes de implementação de um módulo que evolui em paralelo.
  if (shouldReturnEmptyForAccess(filters.allowedTargetIds)) return [];

  const { items } = await fetchFacebookData({
    candidateIds: filters.candidateIds,
    period: filters.period ?? undefined,
    allowedTargetIds: filters.allowedTargetIds,
  });

  if (items.length === 0) return [];

  const client = createAdminClient();
  const { data: targetsData } = await client.from('targets').select('id, candidate_name');
  const targetsMap = new Map<string, string>();
  for (const t of targetsData || []) targetsMap.set(t.id, t.candidate_name);

  return items.map(({ post, analysis }) => {
    const contract = toFacebookAnalyticsContract(post as unknown as FacebookAnalyticsSourceRow);
    const engagementTotal = computeFacebookEngagementTotal(contract) ?? 0;

    return {
      id: post.id,
      target_id: post.target_id,
      candidate_name: (post.target_id && targetsMap.get(post.target_id)) || '—',
      text: post.caption || '',
      created_at: post.taken_at,
      like_count: null,
      comment_count: post.comment_count ?? 0,
      share_count: post.share_count ?? 0,
      engagement_total: engagementTotal,
      url: post.post_url || '#',
      sentiment: analysis?.sentiment || 'Sem análise',
      risk: analysis?.risk_level || 'Sem análise',
      topic: analysis?.ai_topic || 'Sem análise',
      recommendedAction: analysis?.recommended_action || 'Sem análise',
    };
  });
}
