'use server';

import { createAdminClient } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import {
  TargetInput,
  SocialAccountInput,
  Target,
  TargetWithAccounts
} from '@/lib/queries/candidatos';

/**
 * Server Action para cadastrar um novo candidato e suas contas sociais.
 * Usa createAdminClient para bypass de RLS.
 */
export async function createCandidateAction(
  target: TargetInput,
  accounts: SocialAccountInput[]
) {
  const adminClient = createAdminClient();

  // 1. Inserir candidato (target)
  const { data: targetData, error: targetError } = await adminClient
    .from('targets')
    .insert({
      candidate_name: target.candidate_name,
      city: target.city || null,
      state: target.state || null,
      keywords: target.keywords || null,
      is_active: target.is_active,
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

  // 2. Deletar contas removidas
  if (deletedAccountIds.length > 0) {
    const { error: deleteError } = await adminClient
      .from('social_accounts')
      .delete()
      .in('id', deletedAccountIds);

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
 * Server Action para buscar todos os candidatos e suas contas sociais.
 * Usa createAdminClient para bypass de RLS.
 */
export async function fetchTargetsAction(): Promise<TargetWithAccounts[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
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
        is_active
      )
    `)
    .order('candidate_name', { ascending: true });

  if (error) {
    console.error('[fetchTargetsAction] Error:', error.message);
    throw new Error(error.message);
  }

  return (data || []) as TargetWithAccounts[];
}
