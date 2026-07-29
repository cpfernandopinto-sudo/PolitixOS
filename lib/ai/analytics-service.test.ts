import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import {
  getOrGenerateInsight,
  extractJsonFromModelText,
  stripUnknownEvidenceIds,
  checkRateLimit,
  clearInsightCacheForTests,
  resetRateLimitForTests,
  type RateLimitState,
} from './analytics-service';
import { buildAnalyticsContext } from './analytics-context';
import { classifyPoliticalStatus } from '@/lib/analytics/political-status';
import { composeExecutiveSynthesis } from '@/lib/analytics/executive-summary';
import type { AnalyticsInsightOutput } from './analytics-schema';

function makeContext(overrides: { candidate?: string | null; period?: string } = {}) {
  const politicalStatus = classifyPoliticalStatus({
    crisisScore: 60,
    volumeTotal: 40,
    criticalAlertCount: 2,
    highAlertCount: 1,
    predominantSentiment: 'negativo',
    predominantRisk: 'alto',
    volumeTrend: { direcao: 'up', variacaoPercentual: 20 },
  });
  const risks = [
    {
      id: 'risk-1',
      tipo: 'Notícia de risco alto',
      entidade: 'Candidato A',
      descricao: 'Notícia de teste',
      metricaAtual: 'local_relevance = 90',
      referencia: '> 80',
      periodo: 'p',
      severidade: 'alto' as const,
      evidencia: { tipo: 'alerta' as const, id: 'risk-1', url: 'https://example.com', descricao: 'Notícia de teste' },
      origem: 'noticias' as const,
    },
  ];
  const synthesis = composeExecutiveSynthesis({ politicalStatus, risks, opportunities: [], themes: [], entities: [], keyChanges: [] });
  return buildAnalyticsContext({
    filters: { candidate: overrides.candidate ?? null, period: overrides.period ?? 'all' },
    politicalStatus,
    risks,
    opportunities: [],
    keyChanges: [],
    entities: [],
    themes: [],
    synthesis,
  });
}

function validOutput(overrides: Partial<AnalyticsInsightOutput> = {}): AnalyticsInsightOutput {
  return {
    resumo: 'Resumo de teste do período analisado.',
    pontosPrincipais: ['Ponto principal 1'],
    riscosInterpretados: [{ texto: 'Risco interpretado', evidenciaIds: ['risk-1'] }],
    oportunidadesInterpretadas: [],
    hipoteses: [],
    naoEpossivelConcluir: ['Não é possível concluir X com os dados atuais.'],
    evidenciasCitadas: ['risk-1'],
    confianca: 'media',
    ...overrides,
  };
}

function mockAnthropicResponse(output: unknown) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(output) }],
  });
}

const ORIGINAL_ENV = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  mockCreate.mockReset();
  clearInsightCacheForTests();
  resetRateLimitForTests();
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV;
});

describe('extractJsonFromModelText', () => {
  it('faz parse de JSON simples', () => {
    expect(extractJsonFromModelText('{"a":1}')).toEqual({ a: 1 });
  });

  it('faz parse de JSON dentro de cercas de código markdown', () => {
    expect(extractJsonFromModelText('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('retorna null para texto que não é JSON válido', () => {
    expect(extractJsonFromModelText('isto não é json')).toBeNull();
  });
});

describe('stripUnknownEvidenceIds', () => {
  it('remove IDs de evidência que não estão no conjunto conhecido', () => {
    const output = validOutput({
      riscosInterpretados: [{ texto: 't', evidenciaIds: ['risk-1', 'invented-id'] }],
      evidenciasCitadas: ['risk-1', 'invented-id'],
    });
    const result = stripUnknownEvidenceIds(output, new Set(['risk-1']));
    expect(result.riscosInterpretados[0].evidenciaIds).toEqual(['risk-1']);
    expect(result.evidenciasCitadas).toEqual(['risk-1']);
  });
});

describe('checkRateLimit', () => {
  it('permite chamadas dentro do limite', () => {
    const state: RateLimitState = { calls: [] };
    const { allowed } = checkRateLimit(state, Date.now(), 60_000, 3);
    expect(allowed).toBe(true);
  });

  it('bloqueia ao atingir o limite dentro da janela', () => {
    const now = Date.now();
    const state: RateLimitState = { calls: [now, now, now] };
    const { allowed } = checkRateLimit(state, now, 60_000, 3);
    expect(allowed).toBe(false);
  });

  it('libera novamente após a janela expirar', () => {
    const now = Date.now();
    const state: RateLimitState = { calls: [now - 120_000, now - 120_000, now - 120_000] };
    const { allowed } = checkRateLimit(state, now, 60_000, 3);
    expect(allowed).toBe(true);
  });
});

describe('getOrGenerateInsight — sem provedor configurado', () => {
  it('retorna status "indisponivel" quando ANTHROPIC_API_KEY não está definida, sem chamar o modelo', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await getOrGenerateInsight(makeContext());
    expect(result.status).toBe('indisponivel');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('getOrGenerateInsight — dados insuficientes', () => {
  it('retorna "dados_insuficientes" sem chamar o modelo quando o estado político está semDados', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const semDadosStatus = classifyPoliticalStatus({
      crisisScore: 0,
      volumeTotal: 0,
      criticalAlertCount: 0,
      highAlertCount: 0,
      predominantSentiment: null,
      predominantRisk: null,
      volumeTrend: null,
    });
    const synthesis = composeExecutiveSynthesis({ politicalStatus: semDadosStatus, risks: [], opportunities: [], themes: [], entities: [], keyChanges: [] });
    const context = buildAnalyticsContext({
      filters: { candidate: null, period: 'all' },
      politicalStatus: semDadosStatus,
      risks: [],
      opportunities: [],
      keyChanges: [],
      entities: [],
      themes: [],
      synthesis,
    });
    const result = await getOrGenerateInsight(context);
    expect(result.status).toBe('dados_insuficientes');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('getOrGenerateInsight — geração e cache', () => {
  it('gera, valida e retorna a leitura quando a resposta do modelo é válida', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockAnthropicResponse(validOutput());
    const result = await getOrGenerateInsight(makeContext());
    expect(result.status).toBe('disponivel');
    expect(result.output?.resumo).toContain('Resumo de teste');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('reaproveita o cache por hash — não chama o modelo de novo para o mesmo contexto', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockAnthropicResponse(validOutput());
    const context = makeContext();
    const first = await getOrGenerateInsight(context);
    const second = await getOrGenerateInsight(context);
    expect(first.status).toBe('disponivel');
    expect(second.status).toBe('disponivel');
    expect(second.contextHash).toBe(first.contextHash);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('forceRefresh gera novamente mesmo com cache disponível', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockAnthropicResponse(validOutput());
    mockAnthropicResponse(validOutput({ resumo: 'Segundo resumo.' }));
    const context = makeContext();
    await getOrGenerateInsight(context);
    const second = await getOrGenerateInsight(context, { forceRefresh: true });
    expect(second.output?.resumo).toBe('Segundo resumo.');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('remove evidenciaIds inventados da resposta do modelo antes de retornar', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockAnthropicResponse(
      validOutput({
        riscosInterpretados: [{ texto: 'x', evidenciaIds: ['risk-1', 'evidencia-inexistente'] }],
        evidenciasCitadas: ['risk-1', 'evidencia-inexistente'],
      })
    );
    const result = await getOrGenerateInsight(makeContext());
    expect(result.output?.riscosInterpretados[0].evidenciaIds).toEqual(['risk-1']);
    expect(result.output?.evidenciasCitadas).toEqual(['risk-1']);
  });

  it('rejeita e retorna "erro" quando a resposta do modelo não passa no schema (sem naoEpossivelConcluir)', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const invalid = { ...validOutput(), naoEpossivelConcluir: [] }; // schema exige min(1)
    mockAnthropicResponse(invalid);
    const result = await getOrGenerateInsight(makeContext());
    expect(result.status).toBe('erro');
    expect(result.output).toBeNull();
  });

  it('rejeita e retorna "erro" quando a resposta não é JSON', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'não é json' }] });
    const result = await getOrGenerateInsight(makeContext());
    expect(result.status).toBe('erro');
  });

  it('trata falha/exceção do provedor sem lançar — retorna status "erro"', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockRejectedValueOnce(new Error('network down'));
    const result = await getOrGenerateInsight(makeContext());
    expect(result.status).toBe('erro');
    expect(result.error).toBeTruthy();
  });
});
