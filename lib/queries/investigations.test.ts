import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { getInvestigations, getInvestigationById } from './investigations';

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.order = vi.fn(self);
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

const investigation = (overrides: Partial<{ id: string; candidate_id: string | null }> = {}) => ({
  id: 'inv-1',
  mention_id: null,
  candidate_id: 'target-a',
  candidate_name: 'Ana',
  original_title: null,
  original_summary: null,
  investigation_topic: null,
  source_url: null,
  source: null,
  city: null,
  published_at: null,
  status: 'completed' as const,
  risk_level: null,
  crisis_potential: null,
  executive_summary: null,
  strategic_reading: null,
  recommended_actions: null,
  full_report: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getInvestigations — filtragem por allowedTargetIds', () => {
  it('admin (null) — não filtra', async () => {
    const c = chain({ data: [investigation()], error: null });
    mockFrom.mockReturnValue(c);

    const result = await getInvestigations(null);

    expect(c.in).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('não-admin — aplica .in(candidate_id, allowedTargetIds)', async () => {
    const c = chain({ data: [investigation()], error: null });
    mockFrom.mockReturnValue(c);

    await getInvestigations(['target-a']);

    expect(c.in).toHaveBeenCalledWith('candidate_id', ['target-a']);
  });

  it('não-admin sem nenhum candidato permitido → [] sem aplicar .in() nem retornar dados de outros candidatos', async () => {
    const c = chain({ data: [investigation()], error: null });
    mockFrom.mockReturnValue(c);

    const result = await getInvestigations([]);

    expect(result).toEqual([]);
    expect(c.in).not.toHaveBeenCalled();
  });
});

describe('getInvestigationById — nega acesso a investigação fora do escopo (fail-closed)', () => {
  it('admin (null) — sempre retorna o registro', async () => {
    mockFrom.mockReturnValue(chain({ data: investigation({ candidate_id: 'target-x' }), error: null }));

    const result = await getInvestigationById('inv-1', null);

    expect(result?.id).toBe('inv-1');
  });

  it('não-admin com candidate_id permitido — retorna o registro', async () => {
    mockFrom.mockReturnValue(chain({ data: investigation({ candidate_id: 'target-a' }), error: null }));

    const result = await getInvestigationById('inv-1', ['target-a']);

    expect(result?.id).toBe('inv-1');
  });

  it('não-admin com candidate_id FORA do escopo — nega (retorna null, não os dados)', async () => {
    mockFrom.mockReturnValue(chain({ data: investigation({ candidate_id: 'target-b' }), error: null }));

    const result = await getInvestigationById('inv-1', ['target-a']);

    expect(result).toBeNull();
  });

  it('não-admin com investigação sem candidate_id (null) — nega (fail-closed, não dá para verificar a quem pertence)', async () => {
    mockFrom.mockReturnValue(chain({ data: investigation({ candidate_id: null }), error: null }));

    const result = await getInvestigationById('inv-1', ['target-a']);

    expect(result).toBeNull();
  });
});
