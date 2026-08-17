/**
 * INTEL-03B — Testes do `AnthropicInterpretationProvider` com cliente Anthropic
 * mockado (Parte M do gate). NUNCA chama a rede real — `client` é sempre injetado via
 * `vi.fn()`. Cobre: output válido de primeira, retry de schema, retry semântico,
 * esgotamento de tentativas (schema e semântico), taxonomia de erro de provider
 * (auth/rate limit/timeout/rede/5xx/refusal), credencial ausente, e observabilidade
 * (tokens/custo/latência/attempts/contextHash).
 */

import { describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { buildFamilyScopedContext, type RawInterpretationDraftPayload } from './prompt';
import { AnthropicInterpretationProvider } from './anthropic-provider';
import { InterpretationProviderError } from './provider-errors';
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

function fakeMessage(overrides: { model?: string; inputTokens?: number; outputTokens?: number; stopReason?: Anthropic.Messages.StopReason; parsedOutput?: RawInterpretationDraftPayload | null } = {}) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: overrides.model ?? 'claude-opus-5',
    content: [{ type: 'text', text: 'ok' }],
    stop_reason: overrides.stopReason ?? 'end_turn',
    stop_sequence: null,
    container: null,
    usage: { input_tokens: overrides.inputTokens ?? 500, output_tokens: overrides.outputTokens ?? 120, cache_creation: null, cache_creation_input_tokens: null, cache_read_input_tokens: null, inference_geo: null, output_tokens_details: null, server_tool_use: null, service_tier: null },
    parsed_output: overrides.parsedOutput ?? null,
  } as unknown as Anthropic.Messages.Message & { parsed_output: RawInterpretationDraftPayload | null };
}

function clientWithParse(parse: (...args: unknown[]) => Promise<unknown>): Anthropic {
  return { messages: { parse: vi.fn(parse) } } as unknown as Anthropic;
}

describe('AnthropicInterpretationProvider — Parte A-D, M do gate INTEL-03B', () => {
  it('draft válido na 1ª tentativa: attempts=1, origin "model", modelProvenance real, executionMetadata completa', async () => {
    const parse = vi.fn().mockResolvedValue(fakeMessage({ parsedOutput: VALID_PAYLOAD }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic, now: () => '2026-08-16T00:00:00Z', promptVersion: 'v1' });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts).toHaveLength(1);
    expect(drafts[0].origin).toBe('model');
    expect(drafts[0].statement).toBe(VALID_PAYLOAD.statement);
    expect(drafts[0].modelProvenance).toEqual({ provider: 'anthropic', model: 'claude-opus-5', modelVersion: 'claude-opus-5', promptId: 'INTEL_INTERPRETATION_PROMPT_V1', promptVersion: 'v1', generatedAt: '2026-08-16T00:00:00Z' });
    expect(executionMetadata).toHaveLength(1);
    expect(executionMetadata[0].attempts).toBe(1);
    expect(executionMetadata[0].tokenUsage).toEqual({ inputTokens: 500, outputTokens: 120, totalTokens: 620 });
    expect(executionMetadata[0].estimatedCostUsd).toBeCloseTo((500 / 1e6) * 5 + (120 / 1e6) * 25, 10);
    expect(executionMetadata[0].contextHash).toEqual(expect.any(String));
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('caveats determinísticos (defasagem/nominalidade) são mesclados aos caveats do modelo, nunca substituídos', async () => {
    const client = clientWithParse(async () => fakeMessage({ parsedOutput: VALID_PAYLOAD }));
    const provider = new AnthropicInterpretationProvider({ client });
    const { drafts } = await provider.generateInterpretations(fiscalOnlyContext);
    expect(drafts[0].caveats).toContain('nota metodológica gerada pelo modelo.');
    expect(drafts[0].caveats.some((caveat) => caveat.includes('causalidade'))).toBe(true);
  });

  it('parsed_output null na 1ª tentativa, válido na 2ª — retry de schema, attempts=2, mensagem de retry pede JSON válido', async () => {
    const parse = vi.fn().mockResolvedValueOnce(fakeMessage({ parsedOutput: null })).mockResolvedValueOnce(fakeMessage({ parsedOutput: VALID_PAYLOAD }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe(VALID_PAYLOAD.statement);
    expect(executionMetadata[0].attempts).toBe(2);
    expect(parse).toHaveBeenCalledTimes(2);
    // `messages` é mutado após a captura da chamada — filtra por role 'user' em vez de usar índice fixo/`.at(-1)`.
    const secondCallMessages = (parse.mock.calls[1]![0] as { messages: Array<{ role: string; content: unknown }> }).messages;
    const lastUserMessage = [...secondCallMessages].reverse().find((message) => message.role === 'user');
    expect(String(lastUserMessage!.content)).toMatch(/JSON válido/);
  });

  it('draft inválido (atribuição política) na 1ª tentativa, corrigido na 2ª — retry semântico reenvia só códigos de validação', async () => {
    const parse = vi.fn().mockResolvedValueOnce(fakeMessage({ parsedOutput: POLITICAL_ATTRIBUTION_PAYLOAD })).mockResolvedValueOnce(fakeMessage({ parsedOutput: VALID_PAYLOAD }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe(VALID_PAYLOAD.statement);
    expect(executionMetadata[0].attempts).toBe(2);
    const secondCallMessages = (parse.mock.calls[1]![0] as { messages: Array<{ role: string; content: unknown }> }).messages;
    const lastUserMessage = [...secondCallMessages].reverse().find((message) => message.role === 'user');
    const retryText = String(lastUserMessage!.content);
    expect(retryText).toMatch(/POLITICAL_ATTRIBUTION_CLAIM/);
    expect(retryText).not.toMatch(/raciocínio|chain.of.thought/i);
  });

  it('esgota tentativas por falha de schema (JSON sempre nulo) — draft final vazio, nunca aceitação forçada', async () => {
    const parse = vi.fn().mockResolvedValue(fakeMessage({ parsedOutput: null }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic, maxAttempts: 2 });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe('');
    expect(drafts[0].claims).toEqual([]);
    expect(executionMetadata[0].attempts).toBe(2);
    const validation = validateInterpretationDraft(drafts[0], fiscalOnlyContext);
    expect(validation.valid).toBe(false);
  });

  it('esgota tentativas por falha semântica persistente — draft final é o último inválido, nunca forçado a válido', async () => {
    const parse = vi.fn().mockResolvedValue(fakeMessage({ parsedOutput: POLITICAL_ATTRIBUTION_PAYLOAD }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic, maxAttempts: 2 });

    const { drafts, executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);

    expect(drafts[0].statement).toBe(POLITICAL_ATTRIBUTION_PAYLOAD.statement);
    expect(executionMetadata[0].attempts).toBe(2);
    const validation = validateInterpretationDraft(drafts[0], fiscalOnlyContext);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'POLITICAL_ATTRIBUTION_CLAIM')).toBe(true);
  });

  it('stop_reason "refusal" lança PROVIDER_REFUSAL imediatamente, sem retry', async () => {
    const parse = vi.fn().mockResolvedValue(fakeMessage({ stopReason: 'refusal', parsedOutput: null }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic });

    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_REFUSAL' });
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('erro de autenticação (401) é classificado como PROVIDER_AUTH_ERROR', async () => {
    const authError = Anthropic.APIError.generate(401, { error: { message: 'invalid x-api-key' } }, 'invalid x-api-key', new Headers());
    const provider = new AnthropicInterpretationProvider({ client: clientWithParse(async () => { throw authError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toBeInstanceOf(InterpretationProviderError);
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_AUTH_ERROR' });
  });

  it('rate limit (429) é classificado como PROVIDER_RATE_LIMIT', async () => {
    const rateLimitError = Anthropic.APIError.generate(429, { error: { message: 'rate limited' } }, 'rate limited', new Headers());
    const provider = new AnthropicInterpretationProvider({ client: clientWithParse(async () => { throw rateLimitError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMIT' });
  });

  it('timeout é classificado como PROVIDER_TIMEOUT', async () => {
    const timeoutError = new Anthropic.APIConnectionTimeoutError({ message: 'Request timed out.' });
    const provider = new AnthropicInterpretationProvider({ client: clientWithParse(async () => { throw timeoutError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT' });
  });

  it('erro de rede é classificado como PROVIDER_NETWORK_ERROR', async () => {
    const networkError = new Anthropic.APIConnectionError({ message: 'network down' });
    const provider = new AnthropicInterpretationProvider({ client: clientWithParse(async () => { throw networkError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_NETWORK_ERROR' });
  });

  it('erro 5xx é classificado como PROVIDER_OVERLOADED', async () => {
    const serverError = Anthropic.APIError.generate(529, { error: { message: 'overloaded' } }, 'overloaded', new Headers());
    const provider = new AnthropicInterpretationProvider({ client: clientWithParse(async () => { throw serverError; }) });
    await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_OVERLOADED' });
  });

  it('credencial ausente (sem client e sem ANTHROPIC_API_KEY) lança PROVIDER_CREDENTIAL_MISSING (seção 12 do gate — BLOCKED_BY_CREDENTIAL)', async () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const provider = new AnthropicInterpretationProvider();
      await expect(provider.generateInterpretations(fiscalOnlyContext)).rejects.toMatchObject({ code: 'PROVIDER_CREDENTIAL_MISSING' });
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it('modelo fora da tabela de preço: tokenUsage presente, estimatedCostUsd null (nunca custo inventado)', async () => {
    const parse = vi.fn().mockResolvedValue(fakeMessage({ parsedOutput: VALID_PAYLOAD, model: 'claude-modelo-futuro-desconhecido' }));
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic, model: 'claude-modelo-futuro-desconhecido' });
    const { executionMetadata } = await provider.generateInterpretations(fiscalOnlyContext);
    expect(executionMetadata[0].tokenUsage).not.toBeNull();
    expect(executionMetadata[0].estimatedCostUsd).toBeNull();
  });

  it('nunca cross-family: uma chamada por família presente, cada chamada só recebe unidades da própria família', async () => {
    const seenFamilies: string[] = [];
    const parse = vi.fn().mockImplementation(async (params: { messages: Array<{ content: string }> }) => {
      const payload = JSON.parse(params.messages[0]!.content.match(/\n\n(\{[\s\S]*\})\n\n/)![1]!) as { units: Array<{ family: string }> };
      const families = new Set(payload.units.map((unit) => unit.family));
      seenFamilies.push([...families].join(','));
      expect(families.size).toBe(1);
      return fakeMessage({ parsedOutput: VALID_PAYLOAD });
    });
    const provider = new AnthropicInterpretationProvider({ client: { messages: { parse } } as unknown as Anthropic });
    await provider.generateInterpretations(fullContext);
    const familiesPresent = new Set(fullContext.units.map((unit) => unit.family));
    expect(parse).toHaveBeenCalledTimes(familiesPresent.size);
  });
});
