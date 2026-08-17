/**
 * INTEL-03B — Taxonomia de erro de provider (seção 38-40 do gate).
 *
 * Distingue falha operacional do provider (rede, auth, rate limit, timeout, output
 * estruturalmente inválido) de draft semanticamente inválido — este último NUNCA passa
 * por aqui, é tratado pelo `validateInterpretationDraft` normal (mesmo pipeline do
 * INTEL-03A, sem bypass). `classifyAnthropicError` é o único lugar que conhece o SDK
 * `@anthropic-ai/sdk` — nenhum outro arquivo do harness importa a SDK diretamente,
 * preservando o isolamento por `InterpretationProvider` (seção 8 do gate).
 */

import Anthropic from '@anthropic-ai/sdk';
import { ApiError as GoogleApiError } from '@google/genai';
import type { InterpretationProviderErrorCode } from './types';

export class InterpretationProviderError extends Error {
  readonly code: InterpretationProviderErrorCode;
  readonly cause?: unknown;

  constructor(code: InterpretationProviderErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'InterpretationProviderError';
    this.code = code;
    this.cause = cause;
  }
}

/** Classifica qualquer erro lançado por `client.messages.parse()` na taxonomia interna — nunca deixa um erro de SDK cru escapar para o pipeline. */
export function classifyAnthropicError(error: unknown): InterpretationProviderError {
  if (error instanceof InterpretationProviderError) return error;

  if (error instanceof Anthropic.AuthenticationError) return new InterpretationProviderError('PROVIDER_AUTH_ERROR', `Falha de autenticação no provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.RateLimitError) return new InterpretationProviderError('PROVIDER_RATE_LIMIT', `Rate limit do provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new InterpretationProviderError('PROVIDER_TIMEOUT', `Timeout na chamada ao provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.APIConnectionError) return new InterpretationProviderError('PROVIDER_NETWORK_ERROR', `Erro de rede na chamada ao provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.InternalServerError) return new InterpretationProviderError('PROVIDER_OVERLOADED', `Erro interno/sobrecarga do provider Anthropic (5xx): ${error.message}`, error);
  if (error instanceof Anthropic.PermissionDeniedError) return new InterpretationProviderError('PROVIDER_AUTH_ERROR', `Permissão negada pelo provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.NotFoundError) return new InterpretationProviderError('PROVIDER_UNAVAILABLE', `Recurso não encontrado no provider Anthropic (modelo inválido?): ${error.message}`, error);
  if (error instanceof Anthropic.UnprocessableEntityError) return new InterpretationProviderError('PROVIDER_INVALID_OUTPUT', `Entidade não processável pelo provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.BadRequestError) return new InterpretationProviderError('PROVIDER_INVALID_OUTPUT', `Requisição inválida ao provider Anthropic: ${error.message}`, error);
  if (error instanceof Anthropic.APIError) return new InterpretationProviderError('PROVIDER_UNKNOWN_ERROR', `Erro de API do provider Anthropic: ${error.message}`, error);

  return new InterpretationProviderError('PROVIDER_UNKNOWN_ERROR', error instanceof Error ? error.message : String(error), error);
}

/** Classifica qualquer erro lançado por `ai.models.generateContent()` (Gemini) na mesma taxonomia interna (seção 29 do gate INTEL-03C) — reusa os mesmos códigos `InterpretationProviderErrorCode` do Anthropic, nunca uma taxonomia paralela por provider. */
export function classifyGeminiError(error: unknown): InterpretationProviderError {
  if (error instanceof InterpretationProviderError) return error;

  if (error instanceof GoogleApiError) {
    const status = error.status;
    if (status === 401 || status === 403) return new InterpretationProviderError('PROVIDER_AUTH_ERROR', `Falha de autenticação no provider Gemini: ${error.message}`, error);
    if (status === 429) return new InterpretationProviderError('PROVIDER_RATE_LIMIT', `Rate limit do provider Gemini: ${error.message}`, error);
    if (status === 404) return new InterpretationProviderError('PROVIDER_UNAVAILABLE', `Recurso não encontrado no provider Gemini (modelo inválido?): ${error.message}`, error);
    if (status === 400 || status === 422) return new InterpretationProviderError('PROVIDER_INVALID_OUTPUT', `Requisição inválida ao provider Gemini: ${error.message}`, error);
    if (status === 408 || status === 504) return new InterpretationProviderError('PROVIDER_TIMEOUT', `Timeout na chamada ao provider Gemini: ${error.message}`, error);
    if (status >= 500) return new InterpretationProviderError('PROVIDER_OVERLOADED', `Erro interno/sobrecarga do provider Gemini (5xx): ${error.message}`, error);
    return new InterpretationProviderError('PROVIDER_UNKNOWN_ERROR', `Erro de API do provider Gemini (status ${status}): ${error.message}`, error);
  }

  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return new InterpretationProviderError('PROVIDER_TIMEOUT', `Timeout na chamada ao provider Gemini: ${error.message}`, error);
  if (error instanceof Error && /ECONNREFUSED|ENOTFOUND|ECONNRESET|network/i.test(error.message)) return new InterpretationProviderError('PROVIDER_NETWORK_ERROR', `Erro de rede na chamada ao provider Gemini: ${error.message}`, error);

  return new InterpretationProviderError('PROVIDER_UNKNOWN_ERROR', error instanceof Error ? error.message : String(error), error);
}
