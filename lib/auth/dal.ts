import 'server-only';
import { createClient, createAdminClient } from '@/lib/supabaseClient';
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

// ─── Bloco 2 — multi-tenant / client_id ──────────────────────────────────────

/**
 * Retorna o client_id ativo da sessão.
 * Admin retorna null (enxerga todos os clientes — mesma semântica de
 * getAllowedTargetIds()). Não-admin retorna o client_id gravado no login
 * (Modelo A: 1 usuário = 1 cliente).
 */
export async function getActiveClientId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role === 'admin') return null;
  return session.clientId;
}

/**
 * Cliente único usado como destino padrão ao criar/editar usuários
 * não-admin enquanto não existe seletor de cliente na UI (só há 1 cliente
 * operacional hoje — ver checkpoint do Bloco 2). Retorna null se não houver
 * nenhum cliente `active` cadastrado (não deve acontecer após o backfill).
 */
export async function getDefaultClientId(): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('clients')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[getDefaultClientId]', error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Filtra `targetIds` para os que realmente pertencem a `clientId`, usada
 * como guarda ao conceder targets a um usuário não-admin — impede que um
 * admin (sem querer) vincule um usuário do cliente A a um target do
 * cliente B. Retorna também a lista de ids rejeitados, para o chamador
 * poder avisar o admin em vez de falhar silenciosamente.
 */
export async function filterTargetIdsByClient(
  targetIds: string[],
  clientId: string
): Promise<{ allowed: string[]; rejected: string[] }> {
  if (targetIds.length === 0) return { allowed: [], rejected: [] };
  const client = createAdminClient();
  const { data, error } = await client
    .from('targets')
    .select('id')
    .in('id', targetIds)
    .eq('client_id', clientId);
  if (error) {
    console.error('[filterTargetIdsByClient]', error.message);
    return { allowed: [], rejected: targetIds };
  }
  const allowedSet = new Set((data || []).map((r: { id: string }) => r.id));
  return {
    allowed: targetIds.filter((id) => allowedSet.has(id)),
    rejected: targetIds.filter((id) => !allowedSet.has(id)),
  };
}

// ─── Carregar permissões e targets do DB ────────────────────────────────────

export async function loadUserPermissions(userId: string): Promise<string[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('app_user_permissions')
    .select('screen_key')
    .eq('user_id', userId)
    .eq('can_access', true);

  if (error) {
    console.error(`[loadUserPermissions] Erro para ${userId}:`, error.message);
    return [];
  }
  return (data || []).map((r: { screen_key: string }) => r.screen_key);
}

export async function loadUserTargets(userId: string): Promise<string[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('app_user_targets')
    .select('target_id')
    .eq('user_id', userId);

  if (error) {
    console.error(`[loadUserTargets] Erro para ${userId}:`, error.message);
    return [];
  }
  return (data || []).map((r: { target_id: string }) => r.target_id);
}

// ─── Listar usuários ─────────────────────────────────────────────────────────

export async function listUsers(): Promise<AppUser[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('app_users')
    .select('id, name, email, role, is_active, created_at, client_id')
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
  const client = createAdminClient();
  const { data: user, error } = await client
    .from('app_users')
    .select('id, name, email, role, is_active, created_at, client_id')
    .eq('id', userId)
    .single();
  if (error || !user) return null;

  const [targetIds, permissionKeys] = await Promise.all([
    loadUserTargets(userId),
    loadUserPermissions(userId),
  ]);

  return { user: user as AppUser, targetIds, permissionKeys };
}
