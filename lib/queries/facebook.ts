import 'server-only';
import { createAdminClient } from '@/lib/supabaseClient';

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
