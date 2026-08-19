import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockDecrypt } = vi.hoisted(() => ({ mockDecrypt: vi.fn() }));
vi.mock('@/lib/auth/token', () => ({
  decryptSessionToken: mockDecrypt,
}));

import { proxy } from './proxy';
import { APP_SCREENS } from '@/lib/navigation/appScreens';

function requestFor(pathname: string, hasCookie = true) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: hasCookie ? { cookie: 'politixos_session=faketoken' } : {},
  });
}

describe('proxy — proteção da rota /dashboard/territorios (screen_key: territorios)', () => {
  it('sem sessão, redireciona para /login', async () => {
    mockDecrypt.mockResolvedValue(null);
    const res = await proxy(requestFor('/dashboard/territorios', false));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('gestor sem permissão "territorios" é redirecionado para /dashboard/sem-permissao', async () => {
    mockDecrypt.mockResolvedValue({
      userId: 'u1',
      name: 'Teste',
      email: 't@politixos.com',
      role: 'gestor',
      permissions: ['noticias'],
      allowedTargetIds: [],
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const res = await proxy(requestFor('/dashboard/territorios'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard/sem-permissao');
  });

  it('gestor com permissão "territorios" concedida passa direto', async () => {
    mockDecrypt.mockResolvedValue({
      userId: 'u1',
      name: 'Teste',
      email: 't@politixos.com',
      role: 'gestor',
      permissions: ['territorios'],
      allowedTargetIds: [],
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const res = await proxy(requestFor('/dashboard/territorios'));
    expect(res.status).toBe(200);
  });

  it('admin passa direto independente de permissions (bypass existente)', async () => {
    mockDecrypt.mockResolvedValue({
      userId: 'u1',
      name: 'Admin',
      email: 'admin@politixos.com',
      role: 'admin',
      permissions: [],
      allowedTargetIds: [],
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const res = await proxy(requestFor('/dashboard/territorios'));
    expect(res.status).toBe(200);
  });
});

describe('proxy — regressão: /dashboard/x tinha um gap de enforcement (SCREEN_MAP não incluía a rota)', () => {
  it('gestor SEM permissão "x" é bloqueado ao acessar /dashboard/x diretamente por URL', async () => {
    mockDecrypt.mockResolvedValue({
      userId: 'u1',
      name: 'Teste',
      email: 't@politixos.com',
      role: 'gestor',
      permissions: ['noticias'],
      allowedTargetIds: [],
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const res = await proxy(requestFor('/dashboard/x'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard/sem-permissao');
  });

  it('gestor COM permissão "x" concedida passa direto', async () => {
    mockDecrypt.mockResolvedValue({
      userId: 'u1',
      name: 'Teste',
      email: 't@politixos.com',
      role: 'gestor',
      permissions: ['x'],
      allowedTargetIds: [],
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const res = await proxy(requestFor('/dashboard/x'));
    expect(res.status).toBe(200);
  });
});

describe('proxy — cobertura estrutural: toda tela implementada do catálogo é enforced', () => {
  it('toda AppScreen com implemented=true (exceto "dashboard", tratada por caso especial de rota raiz) bloqueia um gestor sem a permissão correspondente', async () => {
    for (const screen of APP_SCREENS.filter((s) => s.implemented && s.key !== 'dashboard')) {
      mockDecrypt.mockResolvedValue({
        userId: 'u1',
        name: 'Teste',
        email: 't@politixos.com',
        role: 'gestor',
        permissions: [], // nenhuma permissão concedida
        allowedTargetIds: [],
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
      const res = await proxy(requestFor(screen.route));
      expect(res.status, `esperava bloqueio em ${screen.route} (screen_key=${screen.key})`).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard/sem-permissao');
    }
  });
});
