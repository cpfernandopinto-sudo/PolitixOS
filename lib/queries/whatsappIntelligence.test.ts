import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }));

import {
  buildTextSearchOrFilter,
  decodeCursor,
  parseCommonFilters,
  resolveWhatsappSessionScope,
} from './whatsappIntelligence';
import { getSession } from '@/lib/auth/session';

describe('WhatsApp Intelligence read contract', () => {
  it('quotes PostgREST search values so commas and parentheses remain data', () => {
    expect(buildTextSearchOrFilter('saude, bairro (centro)')).toBe(
      'text.ilike."%saude, bairro (centro)%",caption.ilike."%saude, bairro (centro)%"',
    );
    expect(buildTextSearchOrFilter('rua "A" \\ centro')).toBe(
      'text.ilike."%rua \\"A\\" \\\\ centro%",caption.ilike."%rua \\"A\\" \\\\ centro%"',
    );
  });

  it('normalizes q and rejects control characters or oversized searches', () => {
    const valid = parseCommonFilters(new URLSearchParams({ q: '  saude  ' }));
    expect(valid.ok && valid.filters.q).toBe('saude');

    const control = parseCommonFilters(new URLSearchParams({ q: 'saude\ncentro' }));
    expect(control).toMatchObject({ ok: false, code: 'INVALID_FILTER' });

    const oversized = parseCommonFilters(new URLSearchParams({ q: 'a'.repeat(201) }));
    expect(oversized).toMatchObject({ ok: false, code: 'INVALID_FILTER' });
  });

  it('accepts only a fully valid occurred_at/id cursor', () => {
    const occurredAt = '2026-08-29T15:22:31.000Z';
    const id = '11111111-1111-4111-8111-111111111111';
    const valid = Buffer.from(`${occurredAt}|${id}`).toString('base64url');
    expect(decodeCursor(valid)).toEqual({ occurredAt, id });

    expect(decodeCursor(Buffer.from(`not-a-date|${id}`).toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from(`${occurredAt}|not-a-uuid`).toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from(`${occurredAt}|${id}|extra`).toString('base64url'))).toBeNull();
  });

  it('requires the whatsapp permission for authenticated non-admin users', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      name: 'Operador',
      email: 'operador@example.test',
      role: 'gestor',
      permissions: [],
      allowedTargetIds: [],
      clientId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });

    const denied = await resolveWhatsappSessionScope('request-1');
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.response.status).toBe(403);

    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      name: 'Operador',
      email: 'operador@example.test',
      role: 'gestor',
      permissions: ['whatsapp'],
      allowedTargetIds: [],
      clientId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });

    await expect(resolveWhatsappSessionScope('request-2')).resolves.toEqual({
      ok: true,
      clientId: '11111111-1111-4111-8111-111111111111',
    });
  });
});
