import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeMunicipio,
  fetchEstadoBySigla,
  fetchMunicipiosByUf,
  fetchPopulacaoByUfId,
  fetchPopulacaoByCodigo,
  IbgeApiError,
  type IbgeMunicipioRaw,
} from './ibge-client';

function contagemRaw(): IbgeMunicipioRaw {
  return {
    id: 3118601,
    nome: 'Contagem',
    microrregiao: {
      id: 31030,
      nome: 'Belo Horizonte',
      mesorregiao: {
        id: 3107,
        nome: 'Metropolitana de Belo Horizonte',
        UF: { id: 31, sigla: 'MG', nome: 'Minas Gerais', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } },
      },
    },
    'regiao-imediata': {
      id: 310001,
      nome: 'Belo Horizonte',
      'regiao-intermediaria': { id: 3101, nome: 'Belo Horizonte', UF: { id: 31, sigla: 'MG', nome: 'Minas Gerais' } },
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('normalizeMunicipio', () => {
  it('normaliza um município completo para o contrato Territory', () => {
    const normalized = normalizeMunicipio(contagemRaw());
    expect(normalized).toEqual({
      codigo_ibge: '3118601',
      uf: 'MG',
      municipio: 'Contagem',
      regiao: 'Sudeste',
      metadata: {
        microrregiao: { id: 31030, nome: 'Belo Horizonte' },
        mesorregiao: { id: 3107, nome: 'Metropolitana de Belo Horizonte' },
        regiao_imediata: { id: 310001, nome: 'Belo Horizonte' },
        regiao_intermediaria: { id: 3101, nome: 'Belo Horizonte' },
      },
    });
  });

  it('não guarda o payload bruto inteiro em metadata (só os campos úteis)', () => {
    const normalized = normalizeMunicipio(contagemRaw());
    const metadataKeys = Object.keys(normalized.metadata);
    expect(metadataKeys).toEqual(['microrregiao', 'mesorregiao', 'regiao_imediata', 'regiao_intermediaria']);
  });

  it('rejeita item incompleto (sem UF) em vez de persistir dado inválido', () => {
    const incompleto: IbgeMunicipioRaw = { id: 123, nome: 'Município Sem UF' };
    expect(() => normalizeMunicipio(incompleto)).toThrow(IbgeApiError);
  });
});

describe('cliente IBGE — rede', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('fetchEstadoBySigla lança IbgeApiError para UF inexistente', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse([{ id: 31, sigla: 'MG', nome: 'Minas Gerais', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } }])
    );
    await expect(fetchEstadoBySigla('ZZ')).rejects.toThrow(IbgeApiError);
  });

  it('fetchMunicipiosByUf lança IbgeApiError (invalid_response) quando o IBGE retorna lista vazia', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse([]));
    await expect(fetchMunicipiosByUf('MG')).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('classifica timeout (AbortError) corretamente e não trava esperando indefinidamente', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    vi.useFakeTimers();
    const promise = fetchMunicipiosByUf('MG');
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' });
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('faz retry em 429 e 5xx, mas desiste após o número máximo de tentativas (não é infinito)', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(jsonResponse({ error: 'rate limited' }, 429));

    vi.useFakeTimers();
    const promise = fetchMunicipiosByUf('MG');
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'rate_limited', status: 429 });
    await vi.runAllTimersAsync();
    await assertion;

    // MAX_RETRIES=3 → 4 tentativas no total (1 original + 3 retries)
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('não faz retry para 4xx que não seja 429 (erro definitivo do chamador)', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(jsonResponse({ error: 'not found' }, 404));

    await expect(fetchMunicipiosByUf('MG')).rejects.toMatchObject({ kind: 'http_error', status: 404 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('trata resposta não-JSON como invalid_response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected token');
      },
    } as unknown as Response);

    await expect(fetchMunicipiosByUf('MG')).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('fetchPopulacaoByUfId converte a resposta SIDRA em um Map por codigo_ibge', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse([
        {
          id: '9324',
          variavel: 'População residente estimada',
          unidade: 'Pessoas',
          resultados: [
            {
              classificacoes: [],
              series: [
                { localidade: { id: '3118601', nome: 'Contagem (MG)' }, serie: { '2025': '651718' } },
                { localidade: { id: '3106200', nome: 'Belo Horizonte (MG)' }, serie: { '2025': '2315560' } },
              ],
            },
          ],
        },
      ])
    );

    const mapa = await fetchPopulacaoByUfId(31);
    expect(mapa.size).toBe(2);
    expect(mapa.get('3118601')).toEqual({ codigoIbge: '3118601', valor: 651718, periodo: '2025', unidade: 'Pessoas' });
  });

  it('fetchPopulacaoByCodigo retorna null (não lança) quando a série vem vazia', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse([{ id: '9324', variavel: 'x', unidade: 'Pessoas', resultados: [] }])
    );
    const populacao = await fetchPopulacaoByCodigo('0000000');
    expect(populacao).toBeNull();
  });
});
