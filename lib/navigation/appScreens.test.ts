import { describe, it, expect } from 'vitest';
import { APP_SCREENS, findAppScreen, findAppScreenByRoute, NAV_GROUP_ORDER } from './appScreens';

describe('APP_SCREENS — catálogo canônico', () => {
  it('cada screen_key é único', () => {
    const keys = APP_SCREENS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('cada rota é única', () => {
    const routes = APP_SCREENS.map((s) => s.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('todo grupo referenciado está em NAV_GROUP_ORDER', () => {
    const groups = new Set(APP_SCREENS.map((s) => s.group));
    for (const g of groups) {
      expect(NAV_GROUP_ORDER).toContain(g);
    }
  });

  it('screens adminOnly não são "implemented: false" ao mesmo tempo que showInNav (não há tela fantasma admin)', () => {
    // Guarda de sanidade — não há requisito de negócio aqui, só evita drift silencioso.
    for (const s of APP_SCREENS) {
      if (s.adminOnly) expect(s.implemented).toBe(true);
    }
  });

  it('telas não implementadas não têm dimensões globais habilitadas (nada para filtrar em página inexistente)', () => {
    for (const s of APP_SCREENS.filter((s) => !s.implemented)) {
      expect(s.supportsGlobalCandidate).toBe(false);
      expect(s.supportsGlobalPeriod).toBe(false);
    }
  });

  it('regressão do gap original: "x" está no catálogo e implemented=true (antes, proxy.ts não tinha entrada para /dashboard/x)', () => {
    const x = findAppScreen('x');
    expect(x).toBeDefined();
    expect(x?.implemented).toBe(true);
    expect(x?.route).toBe('/dashboard/x');
  });
});

describe('findAppScreenByRoute', () => {
  it('casa a rota exata', () => {
    expect(findAppScreenByRoute('/dashboard/noticias')?.key).toBe('noticias');
  });

  it('casa sub-rotas por prefixo (ex.: investigações com id, território com ibge)', () => {
    expect(findAppScreenByRoute('/dashboard/investigacoes/abc-123')?.key).toBe('investigacoes');
    expect(findAppScreenByRoute('/dashboard/territorios/3118601/economia')?.key).toBe('territorios');
  });

  it('não faz match parcial de segmento (ex.: /dashboard/x não deveria casar algo tipo /dashboard/xyz)', () => {
    expect(findAppScreenByRoute('/dashboard/xyz')).toBeUndefined();
  });

  it('rota desconhecida não casa nada', () => {
    expect(findAppScreenByRoute('/dashboard/rota-que-nao-existe')).toBeUndefined();
  });
});
