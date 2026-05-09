import 'server-only';
import { createClient } from '@/lib/supabaseClient';
import { getSession } from '@/lib/auth/session';
import type { SessionPayload } from '@/lib/auth/session';
import type { AppUser, UserRole } from '@/lib/auth/types';

// Re-export for convenience in server components
export type { SessionPayload, UserRole };
export { getSession };

// ─── Verificar permissão de tela ─────────────────────────────────────────────

/**
 * Retorna a sessão atual. Redireciona para /login se não autenticado.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return session!;
}

/**
 * Retorna os target IDs permitidos para o usuário.
 * Admin retorna null (sem restrição). Outros retornam o array.
 */
export async function getAllowedTargetIds(): Promise<string[] | null> {
  const session = await getSession();
  if (!session) return [];
  if (session.role === 'admin') return null; // null = sem filtro
  return session.allowedTargetIds;
}

// ─── Carregar permissões e targets do DB ────────────────────────────────────

export async function loadUserPermissions(userId: string): Promise<string[]> {
  const client = createClient();
  const { data } = await client
    .from('app_user_permissions')
    .select('screen_key')
    .eq('user_id', userId)
    .eq('can_access', true);
  return (data || []).map((r: { screen_key: string }) => r.screen_key);
}

export async function loadUserTargets(userId: string): Promise<string[]> {
  const client = createClient();
  const { data } = await client
    .from('app_user_targets')
    .select('target_id')
    .eq('user_id', userId);
  return (data || []).map((r: { target_id: string }) => r.target_id);
}

// ─── Listar usuários ─────────────────────────────────────────────────────────

export async function listUsers(): Promise<AppUser[]> {
  const client = createClient();
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

export async function getUserWithRelations(userId: string): Promise<{
  user: AppUser;
  targetIds: string[];
  permissionKeys: string[];
} | null> {
  const client = createClient();
  const { data: user, error } = await client
    .from('app_users')
    .select('id, name, email, role, is_active, created_at')
    .eq('id', userId)
    .single();
  if (error || !user) return null;

  const [targetIds, permissionKeys] = await Promise.all([
    loadUserTargets(userId),
    loadUserPermissions(userId),
  ]);

  return { user: user as AppUser, targetIds, permissionKeys };
}
