import { describe, it, expect, vi } from 'vitest';
import { resolveTerritoryBySejuspCode, resolveTerritoriesMapForUf } from './seguranca-territory-resolver';

function likeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.like = vi.fn(() => Promise.resolve(result));
  return c;
}

function eqChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve(result));
  return c;
}

describe('resolveTerritoryBySejuspCode', () => {
  it('resolve o código SEJUSP 311860 (Contagem) para o território 3118601', async () => {
    const chain = likeChain({
      data: [{ id: 'territory-contagem', codigo_ibge: '3118601', municipio: 'Contagem', uf: 'MG' }],
      error: null,
    });
    const client = { from: vi.fn(() => chain) } as never;

    const result = await resolveTerritoryBySejuspCode(client, '311860');

    expect(result).toEqual({
      status: 'found',
      territory: { id: 'territory-contagem', codigo_ibge: '3118601', municipio: 'Contagem', uf: 'MG' },
    });
    expect(chain.like).toHaveBeenCalledWith('codigo_ibge', '311860%');
  });

  it('retorna "unmatched" quando nenhum território corresponde ao código', async () => {
    const chain = likeChain({ data: [], error: null });
    const client = { from: vi.fn(() => chain) } as never;

    const result = await resolveTerritoryBySejuspCode(client, '999999');
    expect(result).toEqual({ status: 'unmatched' });
  });

  it('retorna "ambiguous" (nunca escolhe arbitrariamente) quando mais de um território corresponde', async () => {
    const chain = likeChain({
      data: [
        { id: 't1', codigo_ibge: '3118601', municipio: 'Contagem', uf: 'MG' },
        { id: 't2', codigo_ibge: '3118609', municipio: 'Duplicata Hipotética', uf: 'MG' },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => chain) } as never;

    const result = await resolveTerritoryBySejuspCode(client, '311860');
    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.candidates).toHaveLength(2);
    }
  });

  it('propaga erro de banco como exceção', async () => {
    const chain = likeChain({ data: null, error: { message: 'erro de conexão' } });
    const client = { from: vi.fn(() => chain) } as never;
    await expect(resolveTerritoryBySejuspCode(client, '311860')).rejects.toThrow(/erro de conexão/);
  });
});

describe('resolveTerritoriesMapForUf', () => {
  it('constrói o mapa cod6 → território para todos os territórios da UF', async () => {
    const chain = eqChain({
      data: [
        { id: 't-contagem', codigo_ibge: '3118601', municipio: 'Contagem', uf: 'MG' },
        { id: 't-bh', codigo_ibge: '3106200', municipio: 'Belo Horizonte', uf: 'MG' },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => chain) } as never;

    const { map, ambiguous } = await resolveTerritoriesMapForUf(client, 'MG');
    expect(map.size).toBe(2);
    expect(map.get('311860')?.municipio).toBe('Contagem');
    expect(map.get('310620')?.municipio).toBe('Belo Horizonte');
    expect(ambiguous.size).toBe(0);
  });

  it('detecta prefixos colidentes como ambíguos, sem escolher um arbitrariamente', async () => {
    const chain = eqChain({
      data: [
        { id: 't1', codigo_ibge: '3118601', municipio: 'A', uf: 'MG' },
        { id: 't2', codigo_ibge: '3118609', municipio: 'B (mesmo prefixo)', uf: 'MG' },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => chain) } as never;

    const { map, ambiguous } = await resolveTerritoriesMapForUf(client, 'MG');
    expect(map.has('311860')).toBe(false);
    expect(ambiguous.get('311860')).toHaveLength(2);
  });
});
