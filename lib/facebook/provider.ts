import type { FacebookDateWindow, FacebookPagePostsResponse, FacebookProviderPage, FacebookProviderPost } from './types';

const DEFAULT_HOST = 'facebook-scraper3.p.rapidapi.com';
const DEFAULT_PAGE_POSTS_PATH = '/page/posts';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface FacebookProviderConfig {
  apiKey: string;
  pagePostsPath: string;
  host?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export function facebookProviderConfigFromEnv(): FacebookProviderConfig {
  const apiKey = process.env.FACEBOOK_SCRAPER_RAPIDAPI_KEY;
  if (!apiKey) throw new Error('FACEBOOK_PROVIDER_KEY_MISSING');
  return {
    apiKey,
    pagePostsPath: process.env.FACEBOOK_SCRAPER_PAGE_POSTS_PATH ?? DEFAULT_PAGE_POSTS_PATH,
    host: process.env.FACEBOOK_SCRAPER_RAPIDAPI_HOST ?? DEFAULT_HOST,
  };
}

export function validateFacebookDateWindow(window: FacebookDateWindow): void {
  for (const value of [window.startDate, window.endDate]) {
    if (value && (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)))) throw new Error('FACEBOOK_INVALID_DATE');
  }
  if (window.startDate && window.endDate && window.startDate > window.endDate) throw new Error('FACEBOOK_INVALID_DATE_RANGE');
}

export class FacebookProviderError extends Error {
  constructor(public readonly code: string, public readonly status: number | null = null) { super(code); }
}

export class FacebookScraperProvider {
  private readonly host: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly config: FacebookProviderConfig, private readonly fetcher: typeof fetch = fetch) {
    if (!config.apiKey || !config.pagePostsPath) throw new Error('FACEBOOK_PROVIDER_CONFIG_INVALID');
    this.host = config.host ?? DEFAULT_HOST;
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  async getPagePosts(input: { pageId: string; cursor?: string | null } & FacebookDateWindow): Promise<FacebookProviderPage> {
    if (!input.pageId.trim()) throw new Error('FACEBOOK_PAGE_ID_MISSING');
    validateFacebookDateWindow(input);
    const url = new URL(this.config.pagePostsPath, `https://${this.host}`);
    url.searchParams.set('page_id', input.pageId);
    if (input.cursor) url.searchParams.set('cursor', input.cursor);
    if (input.startDate) url.searchParams.set('start_date', input.startDate);
    if (input.endDate) url.searchParams.set('end_date', input.endDate);
    const raw = await this.request(url);
    const results = Array.isArray(raw.results) ? raw.results.filter((item): item is FacebookProviderPost => item !== null && typeof item === 'object') : [];
    const cursor = typeof raw.cursor === 'string' && raw.cursor.trim() ? raw.cursor : null;
    return { posts: results, cursor, raw };
  }

  private async request(url: URL): Promise<FacebookPagePostsResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(url, {
          headers: { 'X-RapidAPI-Key': this.config.apiKey, 'X-RapidAPI-Host': this.host },
          signal: controller.signal,
        });
        if (!response.ok) {
          if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) continue;
          throw new FacebookProviderError('FACEBOOK_PROVIDER_HTTP_ERROR', response.status);
        }
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new FacebookProviderError('FACEBOOK_PROVIDER_INVALID_RESPONSE');
        return body as FacebookPagePostsResponse;
      } catch (error) {
        lastError = error;
        if (error instanceof FacebookProviderError) throw error;
        if (attempt >= this.maxRetries) {
          if (error instanceof Error && error.name === 'AbortError') throw new FacebookProviderError('FACEBOOK_PROVIDER_TIMEOUT');
          throw new FacebookProviderError('FACEBOOK_PROVIDER_NETWORK_ERROR');
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError instanceof Error ? lastError : new FacebookProviderError('FACEBOOK_PROVIDER_UNKNOWN_ERROR');
  }
}
