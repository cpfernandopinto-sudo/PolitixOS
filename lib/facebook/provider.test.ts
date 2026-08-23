import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacebookProviderError, FacebookScraperProvider, facebookProviderConfigFromEnv, validateFacebookDateWindow } from './provider';

describe('Facebook Scraper provider', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('usa host/path reais como defaults e mantém a chave obrigatória', () => {
    expect(() => facebookProviderConfigFromEnv()).toThrow('FACEBOOK_PROVIDER_KEY_MISSING');
    vi.stubEnv('FACEBOOK_SCRAPER_RAPIDAPI_KEY', 'secret-test');
    expect(facebookProviderConfigFromEnv()).toEqual({
      apiKey: 'secret-test',
      host: 'facebook-scraper3.p.rapidapi.com',
      pagePostsPath: '/page/posts',
    });
  });

  it('envia page, cursor e datas YYYY-MM-DD sem expor a chave na URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ post_id: '1' }], cursor: 'next' }), { status: 200 }));
    const provider = new FacebookScraperProvider({ apiKey: 'secret-test', pagePostsPath: '/page-posts', maxRetries: 0 }, fetcher);
    const page = await provider.getPagePosts({ pageId: '100064348075846', cursor: 'cursor-1', startDate: '2026-08-01', endDate: '2026-08-20' });
    const [url, init] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('page_id')).toBe('100064348075846');
    expect(url.searchParams.get('cursor')).toBe('cursor-1');
    expect(url.searchParams.get('start_date')).toBe('2026-08-01');
    expect(url.searchParams.get('end_date')).toBe('2026-08-20');
    expect(url.toString()).not.toContain('secret-test');
    expect(new Headers(init.headers).get('X-RapidAPI-Key')).toBe('secret-test');
    expect(page).toMatchObject({ cursor: 'next', posts: [{ post_id: '1' }] });
  });

  it('valida formato e ordem das datas', () => {
    expect(() => validateFacebookDateWindow({ startDate: '01/08/2026' })).toThrow('FACEBOOK_INVALID_DATE');
    expect(() => validateFacebookDateWindow({ startDate: '2026-08-20', endDate: '2026-08-01' })).toThrow('FACEBOOK_INVALID_DATE_RANGE');
  });

  it('classifica erro HTTP sem incluir corpo ou segredo', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider = new FacebookScraperProvider({ apiKey: 'secret-test', pagePostsPath: '/page-posts', maxRetries: 0 }, vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'AUTH_ERROR', message: 'invalid secret-test credential' }), { status: 401 })));
    await expect(provider.getPagePosts({ pageId: 'page-1' })).rejects.toMatchObject({ code: 'FACEBOOK_PROVIDER_HTTP_ERROR', status: 401 });
    expect(errorSpy).toHaveBeenCalledWith('FACEBOOK_PROVIDER_HTTP_ERROR', {
      provider_status: 401,
      provider_code: 'AUTH_ERROR',
      provider_message_sanitized: 'invalid [REDACTED] credential',
      provider_host: 'facebook-scraper3.p.rapidapi.com',
      provider_path: '/page-posts',
    });
    errorSpy.mockRestore();
  });

  it('classifica timeout após abort', async () => {
    const fetcher = vi.fn((_url: URL, init?: RequestInit) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    const provider = new FacebookScraperProvider({ apiKey: 'secret-test', pagePostsPath: '/page-posts', timeoutMs: 5, maxRetries: 0 }, fetcher as unknown as typeof fetch);
    await expect(provider.getPagePosts({ pageId: 'page-1' })).rejects.toEqual(expect.objectContaining<Partial<FacebookProviderError>>({ code: 'FACEBOOK_PROVIDER_TIMEOUT' }));
  });
});
