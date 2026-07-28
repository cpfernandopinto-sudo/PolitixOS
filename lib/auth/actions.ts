'use server';

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabaseClient';
import { createSession, deleteSession } from '@/lib/auth/session';
import { loadUserPermissions, loadUserTargets } from '@/lib/auth/dal';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import type { UserRole, AppUser, UserFormState } from '@/lib/auth/types';

// ─── Login ───────────────────────────────────────────────────────────────────

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Preencha email e senha.' };
  }

  try {
    const client = createAdminClient();
    const { data: user, error } = await client
      .from('app_users')
      .select('id, name, email, role, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error) {
      console.error('[Auth] Erro do Supabase ao buscar usuário:', error.message);
      return { error: 'E-mail ou senha inválidos.' };
    }

    if (!user) {
      return { error: 'E-mail ou senha inválidos.' };
    }

    if (!user.is_active) {
      return { error: 'Usuário inativo. Entre em contato com o administrador.' };
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return { error: 'E-mail ou senha inválidos.' };
    }

    const [permissions, allowedTargetIds] = await Promise.all([
      loadUserPermissions(user.id),
      loadUserTargets(user.id),
    ]);

    await createSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      permissions,
      allowedTargetIds,
      expiresAt: '',
    });
  } catch (err) {
    console.error('[Auth] Erro crítico no loginAction:', err);
    return { error: 'Erro interno ao processar login.' };
  }

  // Redireciona APENAS após o sucesso completo
  redirect('/dashboard/overview');
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/login');
}

// ─── Criar usuário ───────────────────────────────────────────────────────────

export async function createUserAction(
  _prev: UserFormState | undefined,
  formData: FormData
): Promise<UserFormState> {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const role = formData.get('role') as UserRole;
  const isActive = formData.get('is_active') === 'true';
  const targetIds = formData.getAll('target_ids') as string[];
  const screenKeys = formData.getAll('screen_keys') as string[];

  if (!name || !email || !password || !role) {
    return { error: 'Preencha todos os campos obrigatórios.' };
  }

  if (!['admin', 'gestor', 'visualizador'].includes(role)) {
    return { error: 'Perfil inválido.' };
  }

  const password_hash = await hashPassword(password);
  const client = createAdminClient();

  // 1. Inserir usuário
  const { data: userRow, error: userErr } = await client
    .from('app_users')
    .insert({ name, email, password_hash, role, is_active: isActive })
    .select('id')
    .single();

  if (userErr) {
    const msg = userErr.message.includes('unique')
      ? 'Email já cadastrado.'
      : userErr.message;
    return { error: msg };
  }

  const userId = userRow.id;

  // 2. Targets
  if (targetIds.length > 0) {
    await client.from('app_user_targets').insert(
      targetIds.map((tid) => ({ user_id: userId, target_id: tid }))
    );
  }

  // 3. Permissões de tela
  if (screenKeys.length > 0) {
    await client.from('app_user_permissions').insert(
      screenKeys.map((key) => ({ user_id: userId, screen_key: key, can_access: true }))
    );
  }

  return { success: true };
}

// ─── Atualizar usuário ────────────────────────────────────────────────────────

export async function updateUserAction(
  _prev: UserFormState | undefined,
  formData: FormData
): Promise<UserFormState> {
  const userId = formData.get('user_id') as string;
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = formData.get('role') as UserRole;
  const isActive = formData.get('is_active') === 'true';
  const targetIds = formData.getAll('target_ids') as string[];
  const screenKeys = formData.getAll('screen_keys') as string[];
  const newPassword = formData.get('password') as string | null;

  if (!userId || !name || !email || !role) {
    return { error: 'Preencha todos os campos obrigatórios.' };
  }

  const client = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { name, email, role, is_active: isActive };
  if (newPassword && newPassword.length >= 6) {
    updateData.password_hash = await hashPassword(newPassword);
  }

  const { error: updateErr } = await client
    .from('app_users')
    .update(updateData)
    .eq('id', userId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  // Substituir targets e permissões
  await client.from('app_user_targets').delete().eq('user_id', userId);
  await client.from('app_user_permissions').delete().eq('user_id', userId);

  if (targetIds.length > 0) {
    await client.from('app_user_targets').insert(
      targetIds.map((tid) => ({ user_id: userId, target_id: tid }))
    );
  }

  if (screenKeys.length > 0) {
    await client.from('app_user_permissions').insert(
      screenKeys.map((key) => ({ user_id: userId, screen_key: key, can_access: true }))
    );
  }

  return { success: true };
}

// ─── Toggle ativo/inativo ─────────────────────────────────────────────────────

export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const client = createAdminClient();
  const { error } = await client
    .from('app_users')
    .update({ is_active: isActive })
    .eq('id', userId);
  if (error) return { error: error.message };
  return {};
}

// ─── Alterar senha ────────────────────────────────────────────────────────────

export async function changePasswordAction(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Senha deve ter no mínimo 6 caracteres.' };
  }
  const password_hash = await hashPassword(newPassword);
  const client = createAdminClient();
  const { error } = await client
    .from('app_users')
    .update({ password_hash })
    .eq('id', userId);
  if (error) return { error: error.message };
  return {};
}

// ─── Listar usuários (re-exported para server components) ─────────────────────

export async function listUsers(): Promise<AppUser[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('app_users')
    .select('id, name, email, role, is_active, created_at')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[listUsers]', error.message);
    return [];
  }
  return (data || []) as AppUser[];
}

// ─── Carregar usuário com relações (Server Action — pode ser chamado do cliente)

export async function getUserWithRelations(userId: string): Promise<{
  user: AppUser;
  targetIds: string[];
  permissionKeys: string[];
} | null> {
  const client = createAdminClient();
  const { data: user, error } = await client
    .from('app_users')
    .select('id, name, email, role, is_active, created_at')
    .eq('id', userId)
    .single();
  if (error || !user) return null;

  const [{ data: targets }, { data: perms }] = await Promise.all([
    client.from('app_user_targets').select('target_id').eq('user_id', userId),
    client.from('app_user_permissions').select('screen_key').eq('user_id', userId).eq('can_access', true),
  ]);

  return {
    user: user as AppUser,
    targetIds: (targets || []).map((r: { target_id: string }) => r.target_id),
    permissionKeys: (perms || []).map((r: { screen_key: string }) => r.screen_key),
  };
}
