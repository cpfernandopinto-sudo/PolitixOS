'use server';

import { createClient } from '@/lib/supabaseClient';
import { getAllowedTargetIds } from '@/lib/auth/dal';

export interface SearchCandidateResult {
  id: string;
  name: string;
  city: string | null;
}

/**
 * Busca candidatos (targets) pelo nome, respeitando os candidatos
 * permitidos para o usuário logado (allowedTargetIds). Usada pela busca
 * global (Ctrl+K / Cmd+K).
 */
export async function searchCandidatesAction(query: string): Promise<SearchCandidateResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const allowedTargetIds = await getAllowedTargetIds();
  if (allowedTargetIds !== null && allowedTargetIds.length === 0) return [];

  const client = createClient();
  const escaped = trimmed.replace(/%/g, '\\%').replace(/_/g, '\\_');
  let q = client
    .from('targets')
    .select('id, candidate_name, city')
    .ilike('candidate_name', `%${escaped}%`)
    .order('candidate_name')
    .limit(8);

  if (allowedTargetIds !== null) {
    q = q.in('id', allowedTargetIds);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[searchCandidatesAction]', error.message);
    return [];
  }

  return (data || []).map((row: { id: string; candidate_name: string; city: string | null }) => ({
    id: row.id,
    name: row.candidate_name,
    city: row.city,
  }));
}
