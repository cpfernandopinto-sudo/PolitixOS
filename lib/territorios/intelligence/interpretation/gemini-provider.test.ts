/**
 * INTEL-03C — Testes do `GeminiInterpretationProvider` com cliente `@google/genai`
 * mockado (Parte J do gate). Nunca chama a rede real. Espelha a cobertura de
 * `anthropic-provider.test.ts` (INTEL-03B) para o segundo provider: sucesso, retry de
 * schema, retry semântico, esgotamento (schema/semântico), refusal (finishReason de
 * bloqueio), taxonomia de erro, credencial ausente, modelo fora da tabela de preço,
 * nunca-cross-family.
 */

import { describe, expect, it, vi } from 'vitest';
import { GoogleGenAI, ApiError } from '@google/genai';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { buildFamilyScopedContext, type RawInterpretationDraftPayload } from './prompt';
import { GeminiInterpretationProvider } from './gemini-provider';
import { validateInterpretationDraft } from './validator';
import type { InterpretationInputContext } from './types';

const result = buildFixtureEconomicIntelligenceResult();
const fullContext = selectInterpretationInput(result);
const fiscalOnlyContext: InterpretationInputContext = buildFamilyScopedContext(fullContext, 'FISCAL');
const fiscalUnit = fiscalOnlyContext.units[0];
const fiscalEvidenceRef = fiscalUnit.evidenceRefs[0];

const VALID_PAYLOAD: RawInterpretationDraftPayload = {
  statement: 'Para a família finanças públicas, a leitura descritiva do sinal disponível é apresentada a seguir.',
  claims: [{ text: 'Leitura descritiva do indicador fiscal, sem causalidade nem juízo de valor.', claimType: 'OBSERVED_PATTERN', signalRefs: [fiscalUnit.id], evidenceRefs: [fiscalEvidenceRef] }],
  caveats: ['nota metodológica gerada pelo modelo.'],
};

const POLITICAL_ATTRIBUTION_PAYLOAD: RawInterpretationDraftPayload = {
  statement: 'O prefeito causou a variação do indicador fiscal observada no período.',
  claims: [{ text: 'O prefeito causou a variação do indicador fiscal.', claimType: 'OBSERVED_PATTERN', signalRefs: [fiscalUnit.id], evidenceRefs: [fiscalEvidenceRef] }],
  caveats: [],
};

function fakeResponse(overrides: { modelVersion?: string; promptTokenCount?: number; candidatesTokenCount?: number; finishReason?: string; text?: string | null } = {}) {
  return {
    modelVersion: overrides.modelVersion ?? 'gemini-2.5-flash',
    usageMetadata: { promptTokenCount: overrides.promptTokenCount ?? 400, candidatesTokenCount: overrides.candidatesTokenCount ?? 90 },
    candidates: [{ finishReason: overrides.finishReason ?? 'STOP' }],
    text: overrides.text === undefined ? JSON.stringify(VALID_PAYLOAD) : (overrides.text ?? undefined),
  } as unknown as Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>;
}

function clientWithGenerateContent(generateContent: (...args: unknown[]) => Promise<unknown>): GoogleGenAI {
  return { models: { generateContent: vi.fn(generateContent) } } as unknown as GoogleGenAI;
}

describe('GeminiInterpretationProvider — Parte C, J do gate INTEL-03C', () => {
  it('draft válido na 1ª tentativa: attempts=1, origin "model", modelProvenance real, executionMetadata completa', async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ text: JSON.stringify(VALID_PAYLOAD) }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI, now: () => '2026-08-16T00:00:00Z', promptVersion: 'v2' });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts).toHaveLength(1);
    expect(drafts[0].origin).toBe('model');
    expect(drafts[0].statement).toBe(VALID_PAYLOAD.statement);
    expect(drafts[0].modelProvenance).toEqual({ provider: 'gemini', model: 'gemini-2.5-flash', modelVersion: 'gemini-2.5-flash', promptId: 'INTEL_INTERPRETATION_PROMPT_V2', promptVersion: 'v2', generatedAt: '2026-08-16T00:00:00Z' });
    expect(executionMetadata).toHaveLength(1);
    expect(executionMetadata[0].attempts).toBe(1);
    expect(executionMetadata[0].tokenUsage).toEqual({ inputTokens: 400, outputTokens: 90, totalTokens: 490 });
    expect(executionMetadata[0].estimatedCostUsd).toBeCloseTo((400 / 1e6) * 0.3 + (90 / 1e6) * 2.5, 10);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('JSON malformado na 1ª tentativa, válido na 2ª — retry de schema, attempts=2', async () => {
    const generateContent = vi.fn()
      .mockResolvedValueOnce(fakeResponse({ text: '{not valid json' }))
      .mockResolvedValueOnce(fakeResponse({ text: JSON.stringify(VALID_PAYLOAD) }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe(VALID_PAYLOAD.statement);
    expect(executionMetadata[0].attempts).toBe(2);
    expect(generateContent).toHaveBeenCalledTimes(2);
    const secondCallContents = (generateContent.mock.calls[1]![0] as { contents: Array<{ role: string; parts: Array<{ text: string }> }> }).contents;
    const lastUser = [...secondCallContents].reverse().find((c) => c.role === 'user');
    expect(lastUser!.parts[0]!.text).toMatch(/JSON válido/);
  });

  it('draft inválido (atribuição política) na 1ª tentativa, corrigido na 2ª — retry semântico reenvia só códigos de validação', async () => {
    const generateContent = vi.fn()
      .mockResolvedValueOnce(fakeResponse({ text: JSON.stringify(POLITICAL_ATTRIBUTION_PAYLOAD) }))
      .mockResolvedValueOnce(fakeResponse({ text: JSON.stringify(VALID_PAYLOAD) }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe(VALID_PAYLOAD.statement);
    expect(executionMetadata[0].attempts).toBe(2);
    const secondCallContents = (generateContent.mock.calls[1]![0] as { contents: Array<{ role: string; parts: Array<{ text: string }> }> }).contents;
    const lastUser = [...secondCallContents].reverse().find((c) => c.role === 'user');
    expect(lastUser!.parts[0]!.text).toMatch(/POLITICAL_ATTRIBUTION_CLAIM/);
  });

  it('esgota tentativas por falha de schema (JSON sempre malformado) — draft final vazio, nunca aceitação forçada', async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ text: 'not json at all' }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI, maxAttempts: 2 });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe('');
    expect(drafts[0].claims).toEqual([]);
    expect(executionMetadata[0].attempts).toBe(2);
    expect(validateInterpretationDraft(drafts[0], fiscalOnlyContext).valid).toBe(false);
  });

  it('esgota tentativas por falha semântica persistente — draft final é o último inválido, nunca forçado a válido', async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ text: JSON.stringify(POLITICAL_ATTRIBUTION_PAYLOAD) }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI, maxAttempts: 2 });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe(POLITICAL_ATTRIBUTION_PAYLOAD.statement);
    expect(executionMetadata[0].attempts).toBe(2);
    const validation = validateInterpretationDraft(drafts[0], fiscalOnlyContext);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'POLITICAL_ATTRIBUTION_CLAIM')).toBe(true);
  });

  it('finishReason de bloqueio (SAFETY) lança PROVIDER_REFUSAL imediatamente, sem retry', async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ finishReason: 'SAFETY', text: null }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI });

    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_REFUSAL' });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('erro de autenticação (401) é classificado como PROVIDER_AUTH_ERROR', async () => {
    const authError = new ApiError({ message: 'API key not valid', status: 401 });
    const provider = new GeminiInterpretationProvider({ client: clientWithGenerateContent(async () => { throw authError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_AUTH_ERROR' });
  });

  it('rate limit (429) é classificado como PROVIDER_RATE_LIMIT', async () => {
    const rateLimitError = new ApiError({ message: 'rate limited', status: 429 });
    const provider = new GeminiInterpretationProvider({ client: clientWithGenerateContent(async () => { throw rateLimitError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMIT' });
  });

  it('erro 5xx é classificado como PROVIDER_OVERLOADED', async () => {
    const serverError = new ApiError({ message: 'internal error', status: 503 });
    const provider = new GeminiInterpretationProvider({ client: clientWithGenerateContent(async () => { throw serverError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_OVERLOADED' });
  });

  it('erro de rede (sem ApiError, mensagem ECONNREFUSED) é classificado como PROVIDER_NETWORK_ERROR', async () => {
    const networkError = new Error('fetch failed: ECONNREFUSED');
    const provider = new GeminiInterpretationProvider({ client: clientWithGenerateContent(async () => { throw networkError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_NETWORK_ERROR' });
  });

  it('credencial ausente (sem client e sem GEMINI_API_KEY) lança PROVIDER_CREDENTIAL_MISSING', async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const provider = new GeminiInterpretationProvider();
      await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_CREDENTIAL_MISSING' });
    } finally {
      if (previous !== undefined) process.env.GEMINI_API_KEY = previous;
    }
  });

  it('modelo fora da tabela de preço: tokenUsage presente, estimatedCostUsd null (nunca custo inventado)', async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ text: JSON.stringify(VALID_PAYLOAD), modelVersion: 'gemini-modelo-futuro-desconhecido' }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI, model: 'gemini-modelo-futuro-desconhecido' });
    const { executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);
    expect(executionMetadata[0].tokenUsage).not.toBeNull();
    expect(executionMetadata[0].estimatedCostUsd).toBeNull();
  });

  it('nunca cross-family: uma chamada por família presente, cada chamada só recebe unidades da própria família', async () => {
    const generateContent = vi.fn().mockImplementation(async (params: { contents: Array<{ parts: Array<{ text: string }> }> }) => {
      const text = params.contents[0]!.parts[0]!.text;
      const payload = JSON.parse(text.match(/\n\n(\{[\s\S]*\})\n\n/)![1]!) as { units: Array<{ family: string }> };
      const families = new Set(payload.units.map((unit) => unit.family));
      expect(families.size).toBe(1);
      return fakeResponse({ text: JSON.stringify(VALID_PAYLOAD) });
    });
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI });
    await provider.generateInterpretations(fullContext);
    const familiesPresent = new Set(fullContext.units.map((unit) => unit.family));
    expect(generateContent).toHaveBeenCalledTimes(familiesPresent.size);
  });

  it('thinkingConfig.thinkingBudget = 0 por padrão (seção 32 do gate)', async () => {
    const generateContent = vi.fn().mockResolvedValue(fakeResponse({ text: JSON.stringify(VALID_PAYLOAD) }));
    const provider = new GeminiInterpretationProvider({ client: { models: { generateContent } } as unknown as GoogleGenAI });
    await provider.generateInterpretations(fiscalOnlyContext);
    const callConfig = (generateContent.mock.calls[0]![0] as { config: { thinkingConfig: { thinkingBudget: number } } }).config;
    expect(callConfig.thinkingConfig.thinkingBudget).toBe(0);
  });
});
