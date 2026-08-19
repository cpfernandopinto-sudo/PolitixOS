import { NextRequest, NextResponse } from 'next/server';
import { decryptSessionToken } from '@/lib/auth/token';
import { APP_SCREENS } from '@/lib/navigation/appScreens';

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ['/login', '/'];

/**
 * Mapeamento pathname prefix → screen_key, derivado do catálogo canônico
 * (`lib/navigation/appScreens.ts`) em vez de mantido à mão aqui — antes desta
 * unificação esta tabela não tinha entrada para `/dashboard/x`, deixando essa
 * tela sem NENHUMA checagem de permissão no middleware (bypass direto por
 * URL). Telas `implemented: false` (sem página real) não entram aqui — nada
 * a proteger. `dashboard` fica de fora do mapa por prefixo (ver
 * DASHBOARD_OVERVIEW_KEY abaixo) porque sua rota é `/dashboard/overview`, não
 * `/dashboard` — precisa do caso especial para a rota raiz.
 */
const SCREEN_MAP: Record<string, string> = Object.fromEntries(
  APP_SCREENS.filter((s) => s.implemented && s.key !== 'dashboard').map((s) => [s.route, s.key])
);

// dashboard raiz → screen 'dashboard'
const DASHBOARD_OVERVIEW_KEY = 'dashboard';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
  const token = req.cookies.get('politixos_session')?.value;

  let session = null;
  if (token) {
    try {
      session = await decryptSessionToken(token);
    } catch (err) {
      console.error('[Middleware] Erro ao descriptografar sessão:', err);
    }
  }

  // ── Não autenticado ────────────────────────────────────────────────────────
  if (!session) {
    if (isPublic) {
      return NextResponse.next();
    }
    console.log(`[Middleware] Acesso negado a ${pathname}. Redirecionando para /login`);
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // ── Autenticado em rota pública (ex: /login) → redirecionar para dashboard
  if (isPublic) {
    console.log(`[Middleware] Usuário autenticado acessando rota pública ${pathname}. Redirecionando para dashboard.`);
    return NextResponse.redirect(new URL('/dashboard/overview', req.nextUrl));
  }

  // ── Admin ignora todas as restrições ──────────────────────────────────────
  if (session.role === 'admin') {
    return NextResponse.next();
  }

  // ── Verificar permissão da tela ───────────────────────────────────────────
  let screenKey: string | null = null;

  if (pathname === '/dashboard' || pathname === '/dashboard/overview') {
    screenKey = DASHBOARD_OVERVIEW_KEY;
  } else {
    for (const [prefix, key] of Object.entries(SCREEN_MAP)) {
      if (pathname.startsWith(prefix)) {
        screenKey = key;
        break;
      }
    }
  }

  if (screenKey && !session.permissions.includes(screenKey)) {
    console.warn(`[Middleware] Usuário ${session.email} sem permissão para ${screenKey}. Redirecionando.`);
    return NextResponse.redirect(new URL('/dashboard/sem-permissao', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /brand/* (public assets)
     * - /api/* (API routes handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|brand|api).*)',
  ],
};
