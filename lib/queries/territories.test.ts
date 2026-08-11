import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { getTerritories, getTerritoriesByUf, getAvailableUfs, getTerritoryByIbgeCode } from './territories';

function orderChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.order = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.ilike = vi.fn(() => c);
  c.then = (resolve: (value: typeof result) => unknown) => resolve(result);
  return c;
}
function selectMaybeSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.eq = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTerritories / getTerritoriesByUf — estado vazio (base ainda não inicializada)', () => {
  it('retorna [] quando a base territorial está vazia (sem lançar erro)', async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => orderChain({ data: [], error: null })) });

    const territories = await getTerritories();
    expect(territories).toEqual([]);
  });

  it('retorna [] (não lança) quando o Supabase retorna erro — ex.: tabela ainda não existe', async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => orderChain({ data: null, error: { message: 'relation "territories" does not exist' } })) });

    const territories = await getTerritoriesByUf('MG');
    expect(territories).toEqual([]);
  });
});

describe('getTerritories / getTerritoriesByUf — estado carregado', () => {
  it('retorna os municípios reais quando a base está populada', async () => {
    const rows = [
      { id: 't1', codigo_ibge: '3106200', uf: 'MG', municipio: 'Belo Horizonte' },
      { id: 't2', codigo_ibge: '3118601', uf: 'MG', municipio: 'Contagem' },
    ];
    mockFrom.mockReturnValue({ select: vi.fn(() => orderChain({ data: rows, error: null })) });

    const territories = await getTerritoriesByUf('MG');
    expect(territories).toHaveLength(2);
    expect(territories.map((t) => t.municipio)).toContain('Contagem');
  });
});

describe('getAvailableUfs', () => {
  it('retorna [] com base vazia', async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => orderChain({ data: [], error: null })) });
    expect(await getAvailableUfs()).toEqual([]);
  });

  it('retorna UFs distintas presentes na base (sem lista hardcoded)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => orderChain({ data: [{ uf: 'MG' }, { uf: 'MG' }, { uf: 'SP' }], error: null })),
    });
    expect(await getAvailableUfs()).toEqual(['MG', 'SP']);
  });
});

describe('getTerritoryByIbgeCode', () => {
  it('retorna null quando o código não existe na base', async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => selectMaybeSingleChain({ data: null, error: null })) });
    expect(await getTerritoryByIbgeCode('9999999')).toBeNull();
  });

  it('retorna o território real quando encontrado', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => selectMaybeSingleChain({ data: { id: 't2', codigo_ibge: '3118601', municipio: 'Contagem' }, error: null })),
    });
    const territory = await getTerritoryByIbgeCode('3118601');
    expect(territory?.municipio).toBe('Contagem');
  });
});
