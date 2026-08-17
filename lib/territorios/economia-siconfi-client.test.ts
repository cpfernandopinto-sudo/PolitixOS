import { describe, expect, it, vi } from 'vitest';
import { fetchSiconfiDca, fetchSiconfiDcaHistory } from './economia-siconfi-client';

const row = (year = 2024, codigo = 3118601) => ({ exercicio: year, instituicao: 'Prefeitura Municipal de Contagem - MG', cod_ibge: codigo, uf: 'MG', anexo: 'DCA-Anexo I-C', rotulo: 'Receitas', coluna: 'Receitas Brutas Realizadas', cod_conta: 'TotalReceitas', conta: 'TOTAL DAS RECEITAS', valor: 10, populacao: 1 });

describe('SICONFI DCA client', () => {
  it('envia os parâmetros oficiais e filtra território/exercício defensivamente', async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('an_exercicio')).toBe('2024');
      expect(url.searchParams.get('id_ente')).toBe('3118601');
      expect(url.searchParams.get('offset')).toBe('0');
      return new Response(JSON.stringify({ items: [row(), row(2024, 3106200)], hasMore: false, count: 2, limit: 5000, offset: 0 }), { status: 200 });
    }) as typeof fetch;
    const result = await fetchSiconfiDca('3118601', 2024, fetcher);
    expect(result).toMatchObject({ pages: 1, rawRecords: 1, statusCodes: [200] });
    expect(result.rows[0].cod_ibge).toBe(3118601);
  });

  it('pagina por offset e respeita intervalo mínimo entre páginas', async () => {
    const sleep = vi.fn(async () => undefined);
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const offset = Number(new URL(String(input)).searchParams.get('offset'));
      return new Response(JSON.stringify({ items: [row()], hasMore: offset === 0, limit: 5000, offset }), { status: 200 });
    }) as typeof fetch;
    const result = await fetchSiconfiDca('3118601', 2024, fetcher, { sleep, requestIntervalMs: 1000 });
    expect(result.pages).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it('ordena/deduplica exercícios e limita a uma requisição por segundo', async () => {
    const sleep = vi.fn(async () => undefined);
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const year = Number(new URL(String(input)).searchParams.get('an_exercicio'));
      return new Response(JSON.stringify({ items: [row(year)], hasMore: false }), { status: 200 });
    }) as typeof fetch;
    const result = await fetchSiconfiDcaHistory('3118601', [2025, 2024, 2025], fetcher, { sleep });
    expect(result.map((item) => item.referenceYear)).toEqual([2024, 2025]);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it('rejeita entrada e payload inválidos', async () => {
    await expect(fetchSiconfiDca('311860', 2024)).rejects.toThrow('INVALID_CODIGO_IBGE');
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })) as typeof fetch;
    await expect(fetchSiconfiDca('3118601', 2024, fetcher)).rejects.toThrow('SICONFI_INVALID_PAYLOAD');
  });
});
