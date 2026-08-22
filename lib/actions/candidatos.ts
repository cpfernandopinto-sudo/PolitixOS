'use server';

import { createAdminClient } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { requireAuth, getAllowedTargetIds, getActiveClientId, getDefaultClientId } from '@/lib/auth/dal';
import {
  TargetInput,
  SocialAccountInput,
  Target,
  TargetWithAccounts
} from '@/lib/queries/candidatos';

/**
 * Verifica se o usuário atual pode operar sobre o candidato `targetId`.
 * Admin (allowedTargetIds === null) sempre pode. Demais perfis só podem
 * operar sobre candidatos em "Candidatos Permitidos" — RLS é "allow all"
 * nestas tabelas por design (ver supabase_migration_access_control.sql),
 * então esta checagem no servidor é a única barreira real.
 */
async function assertCandidateAllowed(targetId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowedTargetIds = await getAllowedTargetIds();
  if (allowedTargetIds === null) return { ok: true };
  if (allowedTargetIds.includes(targetId)) return { ok: true };
  return { ok: false, error: 'Você não tem permissão para este candidato.' };
}

/** Mesma checagem, mas a partir do id de uma conta social — resolve o target_id primeiro. */
async function assertSocialAccountAllowed(socialAccountId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowedTargetIds = await getAllowedTargetIds();
  if (allowedTargetIds === null) return { ok: true };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('social_accounts')
    .select('target_id')
    .eq('id', socialAccountId)
    .single();

  if (error || !data?.target_id || !allowedTargetIds.includes(data.target_id)) {
    return { ok: false, error: 'Você não tem permissão para esta conta social.' };
  }
  return { ok: true };
}

/**
 * Server Action para cadastrar um novo candidato e suas contas sociais.
 * Usa createAdminClient para bypass de RLS. Qualquer usuário autenticado
 * pode criar (política definida no UX-ACCESS-FILTERS-01) — não há
 * "Candidatos Permitidos" a checar para um candidato que ainda não existe.
 */
export async function createCandidateAction(
  target: TargetInput,
  accounts: SocialAccountInput[]
) {
  await requireAuth();
  const adminClient = createAdminClient();

  // Bloco 2 (multi-tenant): targets é a fonte da verdade de client_id — não
  // há trigger de derivação nela (as outras tabelas derivam de target_id).
  // Não-admin: sempre o próprio cliente. Admin: cliente único de hoje
  // (getDefaultClientId) até existir seletor de cliente na UI.
  const clientId = (await getActiveClientId()) ?? (await getDefaultClientId());

  // 1. Inserir candidato (target)
  const { data: targetData, error: targetError } = await adminClient
    .from('targets')
    .insert({
      candidate_name: target.candidate_name,
      city: target.city || null,
      state: target.state || null,
      keywords: target.keywords || null,
      is_active: target.is_active,
      client_id: clientId,
    })
    .select()
    .single();

  if (targetError) {
    console.error('[createCandidateAction] Error inserting target:', targetError.message);
    return { success: false, error: targetError.message };
  }

  const createdTarget = targetData as Target;

  // 2. Inserir contas sociais
  if (accounts.length > 0) {
    const accountsToInsert = accounts.map((a) => ({
      target_id: createdTarget.id,
      platform: a.platform,
      handle: a.handle.trim(),
      profile_url: a.profile_url || null,
      platform_account_id: a.platform_account_id?.trim() || null,
      is_active: a.is_active,
    }));

    const { error: accountsError } = await adminClient
      .from('social_accounts')
      .insert(accountsToInsert);

    if (accountsError) {
      console.error('[createCandidateAction] Error inserting social_accounts:', accountsError.message);

      // Cleanup: apagar o target criado para evitar candidatos órfãos sem contas ou em estado inconsistente
      // se a falha for crítica.
      await adminClient.from('targets').delete().eq('id', createdTarget.id);

      // Tratar erro de unique constraint (platform + handle)
      if (accountsError.code === '23505') {
        return { success: false, error: 'Esta conta social já está cadastrada.' };
      }

      return { success: false, error: accountsError.message };
    }
  }

  revalidatePath('/dashboard/candidatos');
  return { success: true, data: createdTarget };
}

/**
 * Server Action para atualizar um candidato existente e gerenciar suas contas sociais.
 */
export async function updateCandidateAction(
  id: string,
  target: TargetInput,
  accounts: SocialAccountInput[],
  deletedAccountIds: string[]
) {
  await requireAuth();
  const scope = await assertCandidateAllowed(id);
  if (!scope.ok) return { success: false, error: scope.error };

  const adminClient = createAdminClient();

  // 1. Atualizar target
  const { error: targetError } = await adminClient
    .from('targets')
    .update({
      candidate_name: target.candidate_name,
      city: target.city || null,
      state: target.state || null,
      keywords: target.keywords || null,
      is_active: target.is_active,
    })
    .eq('id', id);

  if (targetError) {
    console.error('[updateCandidateAction] Error updating target:', targetError.message);
    return { success: false, error: targetError.message };
  }

  // 2. Deletar contas removidas — restrito ao próprio target (id já
  // verificado acima) para que um deletedAccountIds malicioso não possa
  // apagar contas de OUTRO candidato fora do escopo permitido do usuário.
  if (deletedAccountIds.length > 0) {
    const { error: deleteError } = await adminClient
      .from('social_accounts')
      .delete()
      .in('id', deletedAccountIds)
      .eq('target_id', id);

    if (deleteError) {
      console.error('[updateCandidateAction] Error deleting social accounts:', deleteError.message);
      return { success: false, error: deleteError.message };
    }
  }

  // 3. Upsert contas sociais
  if (accounts.length > 0) {
    const rows = accounts.map((a) => ({
      target_id: id,
      platform: a.platform,
      handle: a.handle.trim(),
      profile_url: a.profile_url || null,
      platform_account_id: a.platform_account_id?.trim() || null,
      is_active: a.is_active,
    }));

    // Tenta upsert. O conflito pode ser na constraint unique do banco.
    const { error: upsertError } = await adminClient
      .from('social_accounts')
      .upsert(rows, { onConflict: 'target_id,platform,handle', ignoreDuplicates: false });

    if (upsertError) {
      console.error('[updateCandidateAction] Error upserting social accounts:', upsertError.message);
      if (upsertError.code === '23505') {
        return { success: false, error: 'Esta conta social já está cadastrada.' };
      }
      return { success: false, error: upsertError.message };
    }
  }

  revalidatePath('/dashboard/candidatos');
  return { success: true };
}

/**
 * Server Action para deletar uma conta social individualmente.
 */
export async function deleteSocialAccountAction(id: string) {
  await requireAuth();
  const scope = await assertSocialAccountAllowed(id);
  if (!scope.ok) return { success: false, error: scope.error };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from('social_accounts').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/candidatos');
  return { success: true };
}

/**
 * Server Action para alterar o status de um candidato.
 */
export async function toggleTargetActiveAction(id: string, isActive: boolean) {
  await requireAuth();
  const scope = await assertCandidateAllowed(id);
  if (!scope.ok) return { success: false, error: scope.error };

  const adminClient = createAdminClient();

  // 1. Atualiza o target
  const { error: targetError } = await adminClient
    .from('targets')
    .update({ is_active: isActive })
    .eq('id', id);

  if (targetError) {
    return { success: false, error: targetError.message };
  }

  // 2. Cascata: ao DESATIVAR, desativa todas as contas sociais vinculadas
  if (!isActive) {
    const { error: accountsError } = await adminClient
      .from('social_accounts')
      .update({ is_active: false })
      .eq('target_id', id);

    if (accountsError) {
      return { success: false, error: accountsError.message };
    }
  }

  revalidatePath('/dashboard/candidatos');
  return { success: true };
}

/**
 * Server Action para alterar o status de uma conta social.
 */
export async function toggleSocialAccountActiveAction(id: string, isActive: boolean) {
  await requireAuth();
  const scope = await assertSocialAccountAllowed(id);
  if (!scope.ok) return { success: false, error: scope.error };

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('social_accounts')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/candidatos');
  return { success: true };
}

/**
 * Server Action para buscar os candidatos e suas contas sociais.
 * Usa createAdminClient para bypass de RLS — a restrição de acesso é
 * aplicada aqui via `allowedTargetIds` (admin vê todos, demais perfis só os
 * candidatos em "Candidatos Permitidos").
 */
export async function fetchTargetsAction(): Promise<TargetWithAccounts[]> {
  await requireAuth();
  const allowedTargetIds = await getAllowedTargetIds();
  if (allowedTargetIds !== null && allowedTargetIds.length === 0) return [];

  const adminClient = createAdminClient();

  let query = adminClient
    .from('targets')
    .select(`
      id,
      candidate_id,
      candidate_name,
      city,
      state,
      keywords,
      is_active,
      social_accounts (
        id,
        target_id,
        platform,
        handle,
        profile_url,
        platform_account_id,
        is_active
      )
    `)
    .order('candidate_name', { ascending: true });

  if (allowedTargetIds !== null) {
    query = query.in('id', allowedTargetIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchTargetsAction] Error:', error.message);
    throw new Error(error.message);
  }

  return (data || []) as TargetWithAccounts[];
}
