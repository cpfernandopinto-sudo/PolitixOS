/**
 * INTEL-03C — Camada de configuração única (seção 3-8 do gate).
 *
 * Ponto ÚNICO que resolve provider + model + prompt. Nenhum outro arquivo deste módulo
 * deve ler `INTEL_LLM_PROVIDER`/`INTEL_LLM_MODEL`/`INTEL_LLM_PROMPT` diretamente — os
 * providers continuam aceitando essas env vars como fallback individual (compatibilidade
 * retroativa com o INTEL-03B, testável isoladamente), mas o caminho recomendado para
 * qualquer código novo (scripts, futura rota de API, futura fila) é `createInterpretationProvider()`.
 *
 * Contrato pensado para ser compatível com uma futura tela de configuração
 * (`CONFIG-LLM-01`, seção 8 do gate) sem exigir mudança de shape — `InterpretationRuntimeConfig`
 * é exatamente o que um formulário "provider / model / prompt version" salvaria. Nenhuma
 * UI é implementada neste gate.
 */

import { RuleBasedMockProvider } from './provider';
import { AnthropicInterpretationProvider, type AnthropicInterpretationProviderOptions } from './anthropic-provider';
import { GeminiInterpretationProvider, type GeminiInterpretationProviderOptions } from './gemini-provider';
import { isValidPromptVersion, type InterpretationPromptVersion } from './prompt-registry';
import type { InterpretationProvider } from './types';

export type InterpretationProviderId = 'anthropic' | 'gemini' | 'mock';

const VALID_PROVIDER_IDS = new Set<InterpretationProviderId>(['anthropic', 'gemini', 'mock']);

const DEFAULT_MODEL_BY_PROVIDER: Record<InterpretationProviderId, string> = {
  anthropic: 'claude-opus-5',
  gemini: 'gemini-2.5-flash',
  mock: 'rule-based-mock-v1',
};

/** DEFAULT=Gemini/FALLBACK=Anthropic — homologado no INTEL-03C.2 (100% aceitação vs. 43% Anthropic, benchmark real, Prompt V3). */
const DEFAULT_PROVIDER_ID: InterpretationProviderId = 'gemini';

export interface InterpretationRuntimeConfig {
  providerId: InterpretationProviderId;
  model: string;
  promptVersion: InterpretationPromptVersion;
}

function isValidProviderId(value: string | undefined): value is InterpretationProviderId {
  return value !== undefined && VALID_PROVIDER_IDS.has(value as InterpretationProviderId);
}

/**
 * Resolve provider/model/prompt a partir de overrides explícitos > env vars > defaults —
 * nunca lança para um valor inválido, sempre cai no default (mesma política defensiva
 * usada em `resolveEffort`/`resolvePromptModule`, nunca um 500 por env mal configurada).
 */
export function resolveInterpretationConfig(overrides: Partial<InterpretationRuntimeConfig> = {}): InterpretationRuntimeConfig {
  const providerId = overrides.providerId ?? (isValidProviderId(process.env.INTEL_LLM_PROVIDER) ? process.env.INTEL_LLM_PROVIDER : DEFAULT_PROVIDER_ID);
  const promptVersion = overrides.promptVersion ?? (isValidPromptVersion(process.env.INTEL_LLM_PROMPT) ? process.env.INTEL_LLM_PROMPT : 'v3');
  const model = overrides.model ?? process.env.INTEL_LLM_MODEL ?? DEFAULT_MODEL_BY_PROVIDER[providerId];
  return { providerId, model, promptVersion };
}

export interface CreateInterpretationProviderOptions {
  now?: () => string;
  maxAttempts?: number;
  timeoutMs?: number;
  anthropic?: Omit<AnthropicInterpretationProviderOptions, 'model' | 'promptVersion' | 'now' | 'maxAttempts' | 'timeoutMs'>;
  gemini?: Omit<GeminiInterpretationProviderOptions, 'model' | 'promptVersion' | 'now' | 'maxAttempts' | 'timeoutMs'>;
}

/** Único ponto de instanciação de provider (seção 3, 7 do gate) — factory, nunca `new AnthropicInterpretationProvider()`/`new GeminiInterpretationProvider()` espalhado pelo código novo. */
export function createInterpretationProvider(config: InterpretationRuntimeConfig = resolveInterpretationConfig(), options: CreateInterpretationProviderOptions = {}): InterpretationProvider {
  switch (config.providerId) {
    case 'anthropic':
      return new AnthropicInterpretationProvider({ model: config.model, promptVersion: config.promptVersion, now: options.now, maxAttempts: options.maxAttempts, timeoutMs: options.timeoutMs, ...options.anthropic });
    case 'gemini':
      return new GeminiInterpretationProvider({ model: config.model, promptVersion: config.promptVersion, now: options.now, maxAttempts: options.maxAttempts, timeoutMs: options.timeoutMs, ...options.gemini });
    case 'mock':
      return new RuleBasedMockProvider();
  }
}
