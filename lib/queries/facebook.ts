import 'server-only';
import { createAdminClient } from '@/lib/supabaseClient';
import { toFacebookAnalyticsContract, type FacebookAnalyticsPost } from '@/lib/facebook/analytics-contract';

export interface FacebookPostsQuery {
  clientId: string;
  targetId: string;
  socialAccountId: string;
  startDate: string;
  endDate: string;
}

export async function fetchFacebookPosts(input: FacebookPostsQuery) {
  if (!input.clientId || !input.targetId || !input.socialAccountId || !input.startDate || !input.endDate || input.startDate >= input.endDate) {
    throw new Error('FACEBOOK_READ_SCOPE_INVALID');
  }
  const client = createAdminClient();
  const { data, error } = await client
    .from('social_posts')
    .select('*')
    .eq('platform', 'facebook')
    .eq('client_id', input.clientId)
    .eq('target_id', input.targetId)
    .eq('social_account_id', input.socialAccountId)
    .gte('taken_at', input.startDate)
    .lt('taken_at', input.endDate)
    .order('taken_at', { ascending: false });
  if (error) throw new Error(`FACEBOOK_BACKEND_READ_FAILED: ${error.message}`);
  return data ?? [];
}

export interface FacebookPostWithAnalysis {
  post: FacebookAnalyticsPost;
  analysis: Record<string, unknown> | null;
}

/**
 * Backend readiness (Bloco 4, Fase 12): recupera posts Facebook já com o
 * contrato analítico normalizado e a linha de `ai_analysis` correspondente,
 * pelo mesmo padrão multi-tenant e o mesmo join (`content_type='post'` +
 * `content_id in (...)`) já usado por `fetchInstagramData`/`fetchXData`.
 * Não é um endpoint/dashboard novo — apenas a leitura, para consumo futuro.
 */
export async function fetchFacebookPostsWithAnalysis(input: FacebookPostsQuery): Promise<FacebookPostWithAnalysis[]> {
  const posts = await fetchFacebookPosts(input);
  if (posts.length === 0) return [];

  const client = createAdminClient();
  const postIds = posts.map((post) => (post as { id: string }).id);
  const { data: analysisRows, error } = await client
    .from('ai_analysis')
    .select('*')
    .eq('content_type', 'post')
    .in('content_id', postIds);
  if (error) throw new Error(`FACEBOOK_BACKEND_READ_FAILED: ${error.message}`);

  const analysisByPostId = new Map<string, Record<string, unknown>>();
  for (const row of (analysisRows ?? []) as Array<Record<string, unknown>>) {
    analysisByPostId.set(row.content_id as string, row);
  }

  return posts.map((post) => ({
    post: toFacebookAnalyticsContract(post as { id: string }),
    analysis: analysisByPostId.get((post as { id: string }).id) ?? null,
  }));
}
