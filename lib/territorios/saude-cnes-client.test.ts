import { describe, expect, it, vi } from 'vitest';
import { CNES_PAGE_SIZE, codigoIbgeToCnesMunicipio, fetchCnesEstablishments, type CnesEstablishment } from './saude-cnes-client';

function row(cnes: number, municipio = 311860): CnesEstablishment {
  return {
    codigo_cnes: cnes, codigo_municipio: municipio, codigo_tipo_unidade: 2,
    estabelecimento_faz_atendimento_ambulatorial_sus: 'SIM', estabelecimento_possui_centro_cirurgico: 0,
    estabelecimento_possui_centro_obstetrico: 0, estabelecimento_possui_centro_neonatal: 0,
    estabelecimento_possui_atendimento_hospitalar: 0, estabelecimento_possui_servico_apoio: 1,
    estabelecimento_possui_atendimento_ambulatorial: 1, data_atualizacao: '2026-07-25',
  };
}

describe('cliente CNES', () => {
  it('converte o código IBGE de sete dígitos para o código municipal CNES de seis', () => {
    expect(codigoIbgeToCnesMunicipio('3118601')).toBe('311860');
    expect(() => codigoIbgeToCnesMunicipio('311860')).toThrow('INVALID_CODIGO_IBGE');
  });

  it('pagina, restringe ao município e deduplica pelo código CNES', async () => {
    const first = Array.from({ length: CNES_PAGE_SIZE }, (_, index) => row(index + 1));
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ estabelecimentos: first }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ estabelecimentos: [row(1), row(21), row(99, 310620)] }), { status: 200 }));
    const result = await fetchCnesEstablishments('3118601', fetcher);
    expect(result.pages).toBe(2);
    expect(result.rows).toHaveLength(21);
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get('codigo_municipio')).toBe('311860');
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('offset')).toBe('20');
  });

  it('rejeita resposta oficial inválida', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(fetchCnesEstablishments('3118601', fetcher)).rejects.toThrow('CNES_INVALID_PAYLOAD');
  });

  it('propaga HTTP determinístico sem retry', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(fetchCnesEstablishments('3118601', fetcher, { sleep: vi.fn() })).rejects.toThrow('CNES_HTTP_404');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('aceita página vazia como fonte sem registros', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ estabelecimentos: [] }), { status: 200 }));
    await expect(fetchCnesEstablishments('3118601', fetcher)).resolves.toMatchObject({ rows: [], pages: 1 });
  });

  it('interrompe paginação acima do limite configurado', async () => {
    const fullPage = Array.from({ length: CNES_PAGE_SIZE }, (_, index) => row(index + 1));
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ estabelecimentos: fullPage }), { status: 200 }));
    await expect(fetchCnesEstablishments('3118601', fetcher, { maxPages: 1 })).rejects.toThrow('CNES_PAGINATION_LIMIT');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('repete erro transitório da página e prossegue após sucesso', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ estabelecimentos: [row(1)] }), { status: 200 }));
    const result = await fetchCnesEstablishments('3118601', fetcher, { sleep, retryBaseDelayMs: 10 });
    expect(result.rows).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('encerra após esgotar as tentativas transitórias', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(fetchCnesEstablishments('3118601', fetcher, { sleep, maxAttemptsPerPage: 3 })).rejects.toThrow('CNES_HTTP_503');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('não consulta a API para município inválido', async () => {
    const fetcher = vi.fn();
    await expect(fetchCnesEstablishments('311860', fetcher)).rejects.toThrow('INVALID_CODIGO_IBGE');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
