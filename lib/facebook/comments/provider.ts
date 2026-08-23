import 'server-only';
import { facebookProviderConfigFromEnv, FacebookProviderError, type FacebookProviderConfig } from '../provider';
import type { FacebookCommentsPage, FacebookProviderComment } from './types';

export interface FacebookCommentsProviderConfig extends Pick<FacebookProviderConfig, 'apiKey' | 'host' | 'timeoutMs' | 'maxRetries'> {
  commentsPath?: string;
}

export function facebookCommentsProviderConfigFromEnv(): FacebookCommentsProviderConfig {
  const base = facebookProviderConfigFromEnv();
  return { apiKey: base.apiKey, host: base.host, commentsPath: process.env.FACEBOOK_SCRAPER_COMMENTS_PATH ?? '/post/comments' };
}

export class FacebookCommentsProvider {
  private readonly host: string;
  private readonly path: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly config: FacebookCommentsProviderConfig, private readonly fetcher: typeof fetch = fetch) {
    if (!config.apiKey) throw new Error('FACEBOOK_PROVIDER_CONFIG_INVALID');
    this.host = config.host ?? 'facebook-scraper3.p.rapidapi.com';
    this.path = config.commentsPath ?? '/post/comments';
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.maxRetries = config.maxRetries ?? 2;
  }

  async getPostComments(input: { postId: string; cursor?: string | null }): Promise<FacebookCommentsPage> {
    if (!input.postId.trim()) throw new Error('FACEBOOK_COMMENT_POST_ID_MISSING');
    const url = new URL(this.path, `https://${this.host}`);
    url.searchParams.set('post_id', input.postId);
    if (input.cursor) url.searchParams.set('cursor', input.cursor);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetcher(url, { headers: { 'X-RapidAPI-Key': this.config.apiKey, 'X-RapidAPI-Host': this.host }, signal: controller.signal });
        if (!response.ok) {
          if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) continue;
          throw new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_HTTP_ERROR', response.status);
        }
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_INVALID_RESPONSE');
        const raw = body as Record<string, unknown>;
        const comments = Array.isArray(raw.results) ? raw.results.filter((item): item is FacebookProviderComment => Boolean(item) && typeof item === 'object') : [];
        const cursor = typeof raw.cursor === 'string' && raw.cursor.trim() ? raw.cursor : null;
        return { comments, cursor, raw };
      } catch (error) {
        if (error instanceof FacebookProviderError) throw error;
        if (attempt >= this.maxRetries) {
          if (error instanceof Error && error.name === 'AbortError') throw new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_TIMEOUT');
          throw new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_NETWORK_ERROR');
        }
      } finally { clearTimeout(timeout); }
    }
    throw new FacebookProviderError('FACEBOOK_COMMENTS_PROVIDER_UNKNOWN_ERROR');
  }
}
