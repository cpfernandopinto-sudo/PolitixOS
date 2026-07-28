import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { ALL_SCREENS } from '@/lib/auth/types';

/**
 * Rota EXCLUSIVA de desenvolvimento para validação visual manual.
 *
 * Cria uma sessão sintética (não grava nada no banco — não cria usuário em
 * `app_users`, não usa seed, não altera senha real) apenas para permitir
 * abrir o dashboard autenticado localmente quando não há credencial de
 * teste disponível. Os DADOS exibidos continuam vindo do Supabase real
 * configurado em `.env.local` — só a sessão é sintética.
 *
 * Dupla trava de segurança:
 * 1. `NODE_ENV === 'production'` → sempre 404, incondicionalmente.
 * 2. Requer `ENABLE_DEV_LOGIN=true` explícito em `.env.local` (nunca
 *    commitado, nunca configurado nas variáveis de ambiente da Vercel).
 *
 * Sem esta rota nunca seria possível validar visualmente os componentes
 * autenticados sem rodar `scripts/seed-admin.mjs` (que grava no banco de
 * produção) — algo que as sessões anteriores desta auditoria já haviam
 * decidido não fazer sem autorização explícita.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_LOGIN !== 'true') {
    return new NextResponse('Not found', { status: 404 });
  }

  await createSession({
    userId: 'dev-preview-user',
    name: 'Usuário de Demonstração (dev)',
    email: 'dev-preview@local.test',
    role: 'admin',
    permissions: ALL_SCREENS,
    allowedTargetIds: [],
    expiresAt: '',
  });

  return NextResponse.redirect(new URL('/dashboard/overview', req.nextUrl.origin));
}
