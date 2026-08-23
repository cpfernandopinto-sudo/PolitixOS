import { describe, expect, it, vi } from 'vitest';
import { FacebookProviderError } from '../provider';
import { FacebookCommentsProvider } from './provider';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function config() {
  return { apiKey: 'key-123', host: 'facebook-scraper3.p.rapidapi.com' };
}

describe('FacebookCommentsProvider — retry/backoff em HTTP 429/5xx', () => {
  it('TESTE A — 429 com Retry-After válido (segundos): respeita o valor exato (sem exceder o teto), não faz retry imediato', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '3' }))
      .mockResolvedValueOnce(jsonResponse(200, { results: [{ comment_id: 'c1' }], cursor: null }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn);

    const result = await provider.getPostComments({ postId: 'ext-1' });

    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn).toHaveBeenCalledWith(3000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.comments).toHaveLength(1);
  });

  it('TESTE A2 — Retry-After maior que o teto máximo é truncado, nunca respeitado integralmente', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '9999' }))
      .mockResolvedValueOnce(jsonResponse(200, { results: [], cursor: null }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn);

    await provider.getPostComments({ postId: 'ext-1' });

    expect(sleepFn).toHaveBeenCalledWith(10_000); // teto documentado (MAX_BACKOFF_MS)
  });

  it('TESTE B — 429 sem Retry-After: usa backoff exponencial com jitter (determinístico via randomFn injetada), nunca retry imediato', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(200, { results: [], cursor: null }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const randomFn = vi.fn().mockReturnValue(0.5); // determinístico: 50% do cap exponencial da tentativa 0 (1000ms) = 500ms
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn, randomFn);

    await provider.getPostComments({ postId: 'ext-1' });

    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn).toHaveBeenCalledWith(500);
  });

  it('TESTE B2 — sem Retry-After, o cap exponencial cresce por tentativa mas nunca ultrapassa o teto', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(429, {}))
      .mockResolvedValueOnce(jsonResponse(200, { results: [], cursor: null }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const randomFn = vi.fn().mockReturnValue(1); // pior caso: jitter no topo do cap de cada tentativa
    const provider = new FacebookCommentsProvider({ ...config(), maxRetries: 2 }, fetcher, sleepFn, randomFn);

    await provider.getPostComments({ postId: 'ext-1' });

    expect(sleepFn.mock.calls[0][0]).toBe(1000); // tentativa 0: cap = 1000 * 2^0
    expect(sleepFn.mock.calls[1][0]).toBe(2000); // tentativa 1: cap = 1000 * 2^1
  });

  it('TESTE C — 429 repetido até esgotar os retries internos: lança FacebookProviderError(429), nunca excede maxRetries, nunca loop infinito', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(429, {}, { 'retry-after': '1' }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider({ ...config(), maxRetries: 2 }, fetcher, sleepFn);

    await expect(provider.getPostComments({ postId: 'ext-1' })).rejects.toMatchObject(
      new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 429),
    );
    expect(fetcher).toHaveBeenCalledTimes(3); // tentativa inicial + 2 retries = maxRetries+1, nunca mais
    expect(sleepFn).toHaveBeenCalledTimes(2); // um backoff entre cada retry, nunca após a última tentativa
  });

  it('TESTE D — 500 seguido de sucesso: aplica backoff (não é mais retry imediato) e recupera normalmente', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { results: [{ comment_id: 'c1' }], cursor: 'next' }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const randomFn = vi.fn().mockReturnValue(0.5);
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn, randomFn);

    const result = await provider.getPostComments({ postId: 'ext-1' });

    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn).toHaveBeenCalledWith(500); // mesma política de backoff do 429 (sem Retry-After, pois 5xx não é lido como tal)
    expect(result.cursor).toBe('next');
  });

  it('TESTE E — 500 repetido até falha: lança FacebookProviderError(5xx) após esgotar retries, com backoff em cada tentativa', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider({ ...config(), maxRetries: 1 }, fetcher, sleepFn);

    await expect(provider.getPostComments({ postId: 'ext-1' })).rejects.toMatchObject(
      new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 500),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
  });

  it('TESTE F — 400 (4xx normal) nunca faz retry, lança imediatamente sem qualquer espera', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(400, {}));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn);

    await expect(provider.getPostComments({ postId: 'ext-1' })).rejects.toMatchObject(
      new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 400),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it('TESTE G — sucesso normal (200) na primeira tentativa: nenhum delay, nenhum backoff', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, { results: [{ comment_id: 'c1' }], cursor: null }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn);

    const result = await provider.getPostComments({ postId: 'ext-1' });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
    expect(result.comments).toHaveLength(1);
  });

  it('TESTE H — garantia de que não existe retry infinito: número de chamadas HTTP é sempre maxRetries+1, mesmo com maxRetries=0', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(429, {}, { 'retry-after': '1' }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const provider = new FacebookCommentsProvider({ ...config(), maxRetries: 0 }, fetcher, sleepFn);

    await expect(provider.getPostComments({ postId: 'ext-1' })).rejects.toMatchObject(
      new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', 429),
    );
    expect(fetcher).toHaveBeenCalledTimes(1); // maxRetries=0 → só a tentativa inicial, nenhum retry, nenhum sleep
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it('Retry-After inválido (texto não numérico e não data) cai para o backoff exponencial em vez de travar', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': 'nao-e-um-numero-nem-data' }))
      .mockResolvedValueOnce(jsonResponse(200, { results: [], cursor: null }));
    const sleepFn = vi.fn().mockResolvedValue(undefined);
    const randomFn = vi.fn().mockReturnValue(0.5);
    const provider = new FacebookCommentsProvider(config(), fetcher, sleepFn, randomFn);

    await provider.getPostComments({ postId: 'ext-1' });

    expect(sleepFn).toHaveBeenCalledWith(500); // mesmo cálculo do TESTE B (fallback determinístico)
  });
});
