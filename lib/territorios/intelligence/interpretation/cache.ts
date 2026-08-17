/**
 * INTEL-03C — Contrato de cache L4 (Parte F do gate, seções 48-57).
 *
 * Decisão já homologada (seção 48): inteligência territorial é SOB DEMANDA — nenhum
 * processamento em massa de municípios. Este arquivo formaliza a CHAVE de cache e uma
 * implementação in-memory (para testes/demonstração), sem persistência real — persistir
 * de fato exigiria uma migration Supabase, fora do escopo deste gate (seção 54:
 * documentado como pendência para um futuro INTEL-03D, não implementado aqui).
 *
 * Regra central (seção 52-53): "mudança material" é o único gatilho técnico para gerar
 * de novo. `contextHash` já captura, por construção (INTEL-03A `serializeInterpretationContext`),
 * todo o conteúdo semântico relevante do contexto de uma família — se a fonte de dados
 * for consultada de novo mas produzir o MESMO `contextHash` (nenhum sinal/evidência
 * mudou de forma que afete a interpretação), não há mudança material e a Interpretation
 * cacheada permanece válida; se o `contextHash` mudar, é sempre uma mudança material e
 * uma nova geração é necessária — nunca o inverso (nunca gerar de novo só porque uma
 * fonte teve "algum" evento, e nunca reaproveitar um `contextHash` diferente).
 */

import type { ValidatedInterpretation } from './types';

export interface InterpretationCacheKeyParts {
  contextHash: string;
  provider: string;
  model: string;
  promptVersion: string;
}

/** Chave de cache canônica (seção 49 do gate) — string estável, ordem fixa dos componentes. */
export function buildInterpretationCacheKey(parts: InterpretationCacheKeyParts): string {
  return `${parts.contextHash}:${parts.provider}:${parts.model}:${parts.promptVersion}`;
}

/**
 * "Mudança material" (seção 52-53 do gate): o único critério é o `contextHash` mudar.
 * Uma atualização de fonte que não altera nenhum sinal/evidência relevante ao contexto
 * selecionado produz o MESMO `contextHash` — não é mudança material, não deve disparar
 * nova chamada de LLM.
 */
export function isMaterialChange(previousContextHash: string | null, currentContextHash: string): boolean {
  return previousContextHash !== currentContextHash;
}

export interface InterpretationCacheEntry {
  interpretations: ValidatedInterpretation[];
  cachedAt: string;
  key: InterpretationCacheKeyParts;
}

export interface InterpretationCache {
  get(key: InterpretationCacheKeyParts): InterpretationCacheEntry | undefined;
  set(key: InterpretationCacheKeyParts, interpretations: ValidatedInterpretation[], now?: () => string): void;
  has(key: InterpretationCacheKeyParts): boolean;
}

/**
 * Implementação in-memory (seção 54 do gate — "apenas cache contract e serviço
 * in-memory/test, se persistência exigir migration, documentar para INTEL-03D"). Nunca
 * usada para persistência real entre processos — perde tudo ao reiniciar, por design.
 */
export class InMemoryInterpretationCache implements InterpretationCache {
  private readonly store = new Map<string, InterpretationCacheEntry>();

  get(key: InterpretationCacheKeyParts): InterpretationCacheEntry | undefined {
    return this.store.get(buildInterpretationCacheKey(key));
  }

  has(key: InterpretationCacheKeyParts): boolean {
    return this.store.has(buildInterpretationCacheKey(key));
  }

  set(key: InterpretationCacheKeyParts, interpretations: ValidatedInterpretation[], now: () => string = () => new Date().toISOString()): void {
    this.store.set(buildInterpretationCacheKey(key), { interpretations, cachedAt: now(), key });
  }

  get size(): number {
    return this.store.size;
  }
}
