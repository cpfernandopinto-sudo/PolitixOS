import { createBrowserClient } from '@supabase/ssr'

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
