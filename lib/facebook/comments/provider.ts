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

// Teto de espera por retry interno (429 respeitando Retry-After, ou backoff
// exponencial). Deliberadamente conservador: o retry interno existe para
// absorver rajadas curtas de rate limit dentro de UMA chamada HTTP, não para
// resolver esgotamento de cota do plano RapidAPI — isso é responsabilidade da
// máquina de estados externa (FAILED_RETRYABLE, cooldown de 1h, ver
// lib/facebook/comments/runner.ts), que já existe e não foi alterada aqui. Um
// Retry-After maior que este teto é truncado, nunca ignorado — evita que uma
// única página de um único post prenda o orçamento de tempo do estágio
// inteiro (COMMENTS_STAGE_TIMEOUT_MS, default 50s) esperando por um valor que
// o próprio provider RapidAPI pode enviar arbitrariamente alto.
const MAX_BACKOFF_MS = 10_000;
const BASE_BACKOFF_MS = 1_000;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry-After em segundos (formato mais comum) ou HTTP-date — nunca negativo, sempre truncado ao teto. */
function parseRetryAfterMs(headerValue: string | null, maxMs: number): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) return seconds >= 0 ? Math.min(seconds * 1000, maxMs) : null;
  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) return null;
  const deltaMs = dateMs - Date.now();
  return deltaMs > 0 ? Math.min(deltaMs, maxMs) : 0;
}

/** Backoff exponencial com "full jitter" (0..cap) — nunca imediato, nunca sem limite. */
function computeBackoffMs(attempt: number, maxMs: number, randomFn: () => number): number {
  const cap = Math.min(maxMs, BASE_BACKOFF_MS * 2 ** attempt);
  return Math.floor(randomFn() * cap);
}

export class FacebookCommentsProvider {
  private readonly host: string;
  private readonly path: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly config: FacebookCommentsProviderConfig,
    private readonly fetcher: typeof fetch = fetch,
    private readonly sleepFn: (ms: number) => Promise<void> = defaultSleep,
    private readonly randomFn: () => number = Math.random,
  ) {
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
          // 429/5xx: nunca retry imediato — 4xx normal (400/401/403/404) segue
          // lançando na hora, sem retry, exatamente como antes.
          if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
            const retryAfterMs = response.status === 429 ? parseRetryAfterMs(response.headers.get('retry-after'), MAX_BACKOFF_MS) : null;
            const delayMs = retryAfterMs ?? computeBackoffMs(attempt, MAX_BACKOFF_MS, this.randomFn);
            console.info('[FacebookCommentsProvider] backoff antes de nova tentativa (nunca API key/headers no log)', {
              status: response.status, attempt, delayMs, source: retryAfterMs !== null ? 'retry-after' : 'exponential-jitter',
            });
            await this.sleepFn(delayMs);
            continue;
          }
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
