import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

// Sprint 12 — diagnóstico temporário (RELATORIO_SPRINT12_DIAGNOSTICO_CARD_PESQUISAS_PRODUCAO.md):
// fingerprint irreversível (SHA-256 truncado) da URL do projeto Supabase, só para comparar
// LOCAL × PRODUÇÃO sem nunca expor a URL/chave reais. Loga uma única vez por processo.
let supabaseFingerprintLogged = false;
function logSupabaseFingerprintOnce() {
  if (supabaseFingerprintLogged) return;
  supabaseFingerprintLogged = true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const fingerprint = url ? createHash('sha256').update(url).digest('hex').slice(0, 12) : 'AUSENTE';
  console.log('[Overview/Pesquisas][SupabaseFingerprint]', { fingerprint });
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('placeholder')) {
    // Em produção: configure as variáveis na Vercel → Settings → Environment Variables
    console.error(
      '[PolitixOS] Variáveis de ambiente Supabase não configuradas.\n' +
      'Adicione na Vercel:\n' +
      '  NEXT_PUBLIC_SUPABASE_URL\n' +
      '  NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createBrowserClient(
    url ?? 'https://placeholder.supabase.co',
    key ?? 'placeholder-anon-key'
  )
}

/**
 * Cliente para uso exclusivo no servidor (Server Actions / Server Components).
 * Ignora RLS usando a Service Role Key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    console.error('[PolitixOS] SUPABASE_SERVICE_ROLE_KEY não configurada');
  }

  logSupabaseFingerprintOnce();

  // Usa createSupabaseClient direto do supabase-js para bypass de RLS mais robusto no server
  return createSupabaseClient(
    url ?? 'https://placeholder.supabase.co',
    key ?? 'placeholder-service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
