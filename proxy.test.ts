import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockDecrypt } = vi.hoisted(() => ({ mockDecrypt: vi.fn() }));
vi.mock('@/lib/auth/token', () => ({
  decryptSessionToken: mockDecrypt,
}));

import { proxy } from './proxy';

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
