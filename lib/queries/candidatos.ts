import { createClient } from '@/lib/supabaseClient';

export interface Target {
  id: string;
  candidate_id: string | null;
  candidate_name: string;
  city: string | null;
  state: string | null;
  keywords: string | null;
  is_active: boolean;
  /** PESQUISAS-N8N-01 — liga a captura seletiva de pesquisas eleitorais (TSE/PesqEle) para este candidato. Default false. */
  poll_monitoring_enabled: boolean;
  /** Cargo específico monitorado (ex.: "Governador"). Só tem efeito quando poll_monitoring_enabled=true. */
  poll_monitoring_office: string | null;
}

export interface SocialAccount {
  id: string;
  target_id: string;
  platform: string;
  handle: string;
  profile_url: string | null;
  platform_account_id: string | null;
  is_active: boolean;
}

export interface TargetWithAccounts extends Target {
  social_accounts: SocialAccount[];
}

export interface SocialAccountInput {
  platform: string;
  handle: string;
  profile_url: string;
  platform_account_id?: string;
  is_active: boolean;
}

export interface TargetInput {
  candidate_name: string;
  city: string;
  state: string;
  keywords: string;
  is_active: boolean;
  poll_monitoring_enabled: boolean;
  poll_monitoring_office: string;
}

// ---------------------------------------------------------------------------
// Listar todos os candidatos com suas contas sociais
// ---------------------------------------------------------------------------
export async function fetchTargets(): Promise<TargetWithAccounts[]> {
  const client = createClient();
  const { data, error } = await client
    .from('targets')
    .select(`
      id,
      candidate_id,
      candidate_name,
      city,
      state,
      keywords,
      is_active,
      poll_monitoring_enabled,
      poll_monitoring_office,
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

  if (error) {
    console.error('[fetchTargets] Error:', error.message);
    throw new Error(error.message);
  }

  return (data || []) as TargetWithAccounts[];
}

// ---------------------------------------------------------------------------
// Buscar um candidato por ID com contas sociais
// ---------------------------------------------------------------------------
export async function fetchTargetById(id: string): Promise<TargetWithAccounts | null> {
  const client = createClient();
  const { data, error } = await client
    .from('targets')
    .select(`
      id,
      candidate_id,
      candidate_name,
      city,
      state,
      keywords,
      is_active,
      poll_monitoring_enabled,
      poll_monitoring_office,
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
    .eq('id', id)
    .single();

  if (error) {
    console.error('[fetchTargetById] Error:', error.message);
    return null;
  }

  return data as TargetWithAccounts;
}

// ---------------------------------------------------------------------------
// Criar candidato + contas sociais
// ---------------------------------------------------------------------------
export async function createTarget(
  target: TargetInput,
  accounts: SocialAccountInput[]
): Promise<{ target: Target; accounts: SocialAccount[] }> {
  const client = createClient();

  // 1. Inserir candidato
  const { data: targetData, error: targetError } = await client
    .from('targets')
    .insert({
      candidate_name: target.candidate_name,
      city: target.city || null,
      state: target.state || null,
      keywords: target.keywords || null,
      is_active: target.is_active,
      poll_monitoring_enabled: target.poll_monitoring_enabled,
      poll_monitoring_office: target.poll_monitoring_enabled ? target.poll_monitoring_office || null : null,
    })
    .select()
    .single();

  if (targetError) {
    console.error('[createTarget] Error inserting target:', targetError.message);
    throw new Error(targetError.message);
  }

  const createdTarget = targetData as Target;

  // 2. Inserir contas sociais
  let createdAccounts: SocialAccount[] = [];
  if (accounts.length > 0) {
    const accountsToInsert = accounts.map((a) => ({
      target_id: createdTarget.id,
      platform: a.platform,
      handle: a.handle,
      profile_url: a.profile_url || null,
      platform_account_id: a.platform_account_id?.trim() || null,
      is_active: a.is_active,
    }));

    const { data: accountsData, error: accountsError } = await client
      .from('social_accounts')
      .insert(accountsToInsert)
      .select();

    if (accountsError) {
      console.error('[createTarget] Error inserting social_accounts:', accountsError.message);
      throw new Error(accountsError.message);
    }

    createdAccounts = (accountsData || []) as SocialAccount[];
  }

  return { target: createdTarget, accounts: createdAccounts };
}

// ---------------------------------------------------------------------------
// Atualizar candidato
// ---------------------------------------------------------------------------
export async function updateTarget(
  id: string,
  target: TargetInput
): Promise<Target> {
  const client = createClient();

  const { data, error } = await client
    .from('targets')
    .update({
      candidate_name: target.candidate_name,
      city: target.city || null,
      state: target.state || null,
      keywords: target.keywords || null,
      is_active: target.is_active,
      poll_monitoring_enabled: target.poll_monitoring_enabled,
      poll_monitoring_office: target.poll_monitoring_enabled ? target.poll_monitoring_office || null : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateTarget] Error:', error.message);
    throw new Error(error.message);
  }

  return data as Target;
}

// ---------------------------------------------------------------------------
// Upsert contas sociais de um candidato
// (garante que não há duplicatas handle+platform para o mesmo target)
// ---------------------------------------------------------------------------
export async function upsertSocialAccounts(
  targetId: string,
  accounts: SocialAccountInput[]
): Promise<SocialAccount[]> {
  const client = createClient();

  if (accounts.length === 0) return [];

  const rows = accounts.map((a) => ({
    target_id: targetId,
    platform: a.platform,
    handle: a.handle,
    profile_url: a.profile_url || null,
    platform_account_id: a.platform_account_id?.trim() || null,
    is_active: a.is_active,
  }));

  const { data, error } = await client
    .from('social_accounts')
    .upsert(rows, { onConflict: 'target_id,platform,handle', ignoreDuplicates: false })
    .select();

  if (error) {
    console.error('[upsertSocialAccounts] Error:', error.message);
    throw new Error(error.message);
  }

  return (data || []) as SocialAccount[];
}

// ---------------------------------------------------------------------------
// Atualizar uma única conta social
// ---------------------------------------------------------------------------
export async function updateSocialAccount(
  id: string,
  account: Partial<SocialAccountInput>
): Promise<SocialAccount> {
  const client = createClient();

  const { data, error } = await client
    .from('social_accounts')
    .update(account)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateSocialAccount] Error:', error.message);
    throw new Error(error.message);
  }

  return data as SocialAccount;
}

// ---------------------------------------------------------------------------
// Deletar uma conta social
// ---------------------------------------------------------------------------
export async function deleteSocialAccount(id: string): Promise<void> {
  const client = createClient();

  const { error } = await client
    .from('social_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteSocialAccount] Error:', error.message);
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Toggle is_active de um candidato
// Regra de cascata: desativar o candidato desativa TODAS as contas sociais.
// Reativar o candidato NÃO reativa as contas — cada conta mantém seu estado
// individual para permitir controle granular.
// ---------------------------------------------------------------------------
export async function toggleTargetActive(id: string, isActive: boolean): Promise<void> {
  const client = createClient();

  // 1. Atualiza o target
  const { error: targetError } = await client
    .from('targets')
    .update({ is_active: isActive })
    .eq('id', id);

  if (targetError) {
    console.error('[toggleTargetActive] Error updating target:', targetError.message);
    throw new Error(targetError.message);
  }

  // 2. Cascata: ao DESATIVAR, desativa todas as contas sociais vinculadas
  if (!isActive) {
    const { error: accountsError } = await client
      .from('social_accounts')
      .update({ is_active: false })
      .eq('target_id', id);

    if (accountsError) {
      console.error('[toggleTargetActive] Error deactivating social_accounts:', accountsError.message);
      throw new Error(accountsError.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Toggle is_active de uma conta social
// ---------------------------------------------------------------------------
export async function toggleSocialAccountActive(id: string, isActive: boolean): Promise<void> {
  const client = createClient();

  const { error } = await client
    .from('social_accounts')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    console.error('[toggleSocialAccountActive] Error:', error.message);
    throw new Error(error.message);
  }
}
