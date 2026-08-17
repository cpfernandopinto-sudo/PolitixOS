/**
 * INTEL-03C — Testes do resolvedor de config única (Parte J do gate, seções 70-71).
 * Cobre provider selector (anthropic/gemini/mock/inválido) e prompt selector (v1/v2/inválido).
 */

import { describe, expect, it } from 'vitest';
import { resolveInterpretationConfig, createInterpretationProvider } from './config';
import { AnthropicInterpretationProvider } from './anthropic-provider';
import { GeminiInterpretationProvider } from './gemini-provider';
import { RuleBasedMockProvider } from './provider';

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) previous[key] = process.env[key];
  for (const [key, value] of Object.entries(vars)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

describe('resolveInterpretationConfig — seção 3-8, 70-71 do gate', () => {
  it('default: provider gemini (homologado INTEL-03C.2), prompt v3, model default do provider', () => {
    withEnv({ INTEL_LLM_PROVIDER: undefined, INTEL_LLM_MODEL: undefined, INTEL_LLM_PROMPT: undefined }, () => {
      const config = resolveInterpretationConfig();
      expect(config.providerId).toBe('gemini');
      expect(config.promptVersion).toBe('v3');
      expect(config.model).toBe('gemini-2.5-flash');
    });
  });

  it('providerId=anthropic continua disponível como fallback explícito', () => {
    withEnv({ INTEL_LLM_PROVIDER: 'anthropic', INTEL_LLM_MODEL: undefined }, () => {
      const config = resolveInterpretationConfig();
      expect(config.providerId).toBe('anthropic');
      expect(config.model).toBe('claude-opus-5');
    });
  });

  it('INTEL_LLM_PROVIDER=gemini resolve provider gemini com model default gemini-2.5-flash', () => {
    withEnv({ INTEL_LLM_PROVIDER: 'gemini', INTEL_LLM_MODEL: undefined }, () => {
      const config = resolveInterpretationConfig();
      expect(config.providerId).toBe('gemini');
      expect(config.model).toBe('gemini-2.5-flash');
    });
  });

  it('INTEL_LLM_PROVIDER inválido cai no default (gemini), nunca lança', () => {
    withEnv({ INTEL_LLM_PROVIDER: 'nao-existe' }, () => {
      const config = resolveInterpretationConfig();
      expect(config.providerId).toBe('gemini');
    });
  });

  it('INTEL_LLM_PROMPT inválido cai no default (v3), nunca lança', () => {
    withEnv({ INTEL_LLM_PROMPT: 'v99' }, () => {
      const config = resolveInterpretationConfig();
      expect(config.promptVersion).toBe('v3');
    });
  });

  it('INTEL_LLM_PROMPT=v1 é respeitado', () => {
    withEnv({ INTEL_LLM_PROMPT: 'v1' }, () => {
      const config = resolveInterpretationConfig();
      expect(config.promptVersion).toBe('v1');
    });
  });

  it('overrides explícitos têm prioridade sobre env vars', () => {
    withEnv({ INTEL_LLM_PROVIDER: 'gemini' }, () => {
      const config = resolveInterpretationConfig({ providerId: 'anthropic' });
      expect(config.providerId).toBe('anthropic');
    });
  });

  it('INTEL_LLM_MODEL sempre tem prioridade sobre o default do provider', () => {
    withEnv({ INTEL_LLM_PROVIDER: 'anthropic', INTEL_LLM_MODEL: 'claude-sonnet-5' }, () => {
      const config = resolveInterpretationConfig();
      expect(config.model).toBe('claude-sonnet-5');
    });
  });
});

describe('createInterpretationProvider — factory única (seção 3, 7 do gate)', () => {
  it('providerId=anthropic instancia AnthropicInterpretationProvider', () => {
    const provider = createInterpretationProvider({ providerId: 'anthropic', model: 'claude-opus-5', promptVersion: 'v2' });
    expect(provider).toBeInstanceOf(AnthropicInterpretationProvider);
  });

  it('providerId=gemini instancia GeminiInterpretationProvider', () => {
    const provider = createInterpretationProvider({ providerId: 'gemini', model: 'gemini-2.5-flash', promptVersion: 'v2' });
    expect(provider).toBeInstanceOf(GeminiInterpretationProvider);
  });

  it('providerId=mock instancia RuleBasedMockProvider', () => {
    const provider = createInterpretationProvider({ providerId: 'mock', model: 'rule-based-mock-v1', promptVersion: 'v2' });
    expect(provider).toBeInstanceOf(RuleBasedMockProvider);
  });
});
