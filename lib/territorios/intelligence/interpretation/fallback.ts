/**
 * INTEL-03C — Política de fallback DEFAULT/FALLBACK (Parte G do gate, seções 58-63).
 *
 * REGRA ÚNICA E ABSOLUTA (seção 60-62 do gate): fallback só ocorre quando o provider
 * DEFAULT lança um `InterpretationProviderError` (falha operacional — credencial
 * ausente, auth, rede, timeout, rate limit, refusal, output inválido). Isso é garantido
 * estruturalmente: `InterpretationProvider.generateInterpretations()` NUNCA lança por
 * rejeição semântica — um draft rejeitado pelo validador simplesmente vira
 * `RejectedInterpretationDraft` dentro de `InterpretationGenerationResult.drafts`,
 * tratado normalmente por `pipeline.ts`. Não existe, portanto, um caminho de código em
 * que "o validador rejeitou o draft" acione fallback — a seção 41 do gate
 * ("não otimizar segurança... nunca fallback por causa de rejeição semântica") é
 * garantida pelo próprio formato do erro, não por uma checagem manual que poderia ser
 * esquecida.
 *
 * Todo fallback é reportado com `fallbackReason` explícito (seção 61) — nunca um
 * fallback silencioso que esconde custo/latência extra.
 */

import { InterpretationProviderError } from './provider-errors';
import type { InterpretationGenerationResult, InterpretationInputContext, InterpretationProvider, InterpretationProviderErrorCode } from './types';

export type InterpretationProviderRole = 'default' | 'fallback';

export interface FallbackInterpretationResult extends InterpretationGenerationResult {
  /** Qual provider efetivamente respondeu. */
  usedProvider: InterpretationProviderRole;
  /** Motivo do fallback (código de erro do provider DEFAULT) — null quando o DEFAULT respondeu normalmente. */
  fallbackReason: InterpretationProviderErrorCode | null;
}

/**
 * Chama `primary`; se e somente se ele lançar `InterpretationProviderError`, chama
 * `fallback` (quando configurado) UMA vez — nunca uma cadeia de fallbacks, nunca um
 * retry automático do próprio primary aqui (isso já é responsabilidade interna de cada
 * provider). Se `fallback` também falhar, o erro do fallback é o que se propaga (nunca
 * mascarado pelo erro original do primary).
 */
export async function generateWithFallback(context: InterpretationInputContext, primary: InterpretationProvider, fallback: InterpretationProvider | null): Promise<FallbackInterpretationResult> {
  try {
    const result = await primary.generateInterpretations(context);
    return { ...result, usedProvider: 'default', fallbackReason: null };
  } catch (error) {
    if (!(error instanceof InterpretationProviderError)) throw error;
    if (!fallback) throw error;
    const result = await fallback.generateInterpretations(context);
    return { ...result, usedProvider: 'fallback', fallbackReason: error.code };
  }
}
