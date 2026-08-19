import { describe, it, expect } from 'vitest';
import { APP_SCREENS } from '@/lib/navigation/appScreens';

/**
 * O picker "Telas Permitidas" (UsuariosClient.tsx) não mantém mais seu
 * próprio mapa de rótulos (`SCREEN_LABELS`) — deriva diretamente de
 * `APP_SCREENS`, o catálogo canônico único também usado por `proxy.ts` e
 * `dashboardNavigation.tsx`. Estes testes cobrem a regra de filtragem que o
 * componente aplica sobre o catálogo, não mais um mapa próprio.
 */
describe('Picker "Telas Permitidas" — telas grantáveis derivadas de APP_SCREENS', () => {
  const grantable = APP_SCREENS.filter((s) => s.implemented && !s.adminOnly);

  it('"territorios" está entre as telas grantáveis com rótulo "Territórios"', () => {
    const territorios = grantable.find((s) => s.key === 'territorios');
    expect(territorios?.label).toBe('Territórios');
  });

  it('toda tela grantável tem um rótulo não-vazio', () => {
    const semRotulo = grantable.filter((s) => !s.label);
    expect(semRotulo).toEqual([]);
  });

  it('"usuarios" (adminOnly) não aparece — não há "Candidatos Permitidos" a conceder para uma tela administrativa', () => {
    expect(grantable.some((s) => s.key === 'usuarios')).toBe(false);
  });

  it('telas ainda não implementadas (gestao_crise/apoiadores/configuracoes) não aparecem — conceder acesso a uma página inexistente confundiria o admin', () => {
    const keys = grantable.map((s) => s.key);
    expect(keys).not.toContain('gestao_crise');
    expect(keys).not.toContain('apoiadores');
    expect(keys).not.toContain('configuracoes');
  });

  it('"x" aparece como grantável (regressão: antes o gap era só no proxy.ts, aqui já estava correto — cobertura de não-regressão)', () => {
    expect(grantable.some((s) => s.key === 'x')).toBe(true);
  });
});
