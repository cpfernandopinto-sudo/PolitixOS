import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { runInterpretationPipeline } from './pipeline';
import { RuleBasedMockProvider } from './provider';
import { assertInterpretationLineageResolves } from './lineage';

describe('runInterpretationPipeline — seções 76-77, 91 do gate', () => {
  const result = buildFixtureEconomicIntelligenceResult();
  const provider = new RuleBasedMockProvider();

  it('pipeline completo aceita todos os drafts do mock provider (nenhum rejeitado)', async () => {
    const pipeline = await runInterpretationPipeline(result, provider);
    expect(pipeline.status).toBe('COMPLETED');
    if (pipeline.status === 'COMPLETED') {
      expect(pipeline.accepted.length).toBeGreaterThan(0);
      expect(pipeline.rejected).toEqual([]);
      expect(pipeline.executionMetadata).toEqual([]);
    }
  });

  it('NO_INTERPRETATION quando não há unidades elegíveis (seção 27, 91)', async () => {
    const insufficient = { ...result, signals: result.signals.map((signal) => ({ ...signal, status: 'INSUFFICIENT_EVIDENCE' as const })), consolidatedSignals: [] };
    const pipeline = await runInterpretationPipeline(insufficient, provider);
    expect(pipeline.status).toBe('NO_INTERPRETATION');
  });

  it('draft inválido nunca vira Interpretation — fica em rejected, com errors preservados (seção 77)', async () => {
    const rejectingProvider = { id: 'rejecting-test-provider', generateInterpretations: async (context: Parameters<typeof provider.generateInterpretations>[0]) => ({ drafts: [{
      id: 'interpretation-draft:invalid', territoryId: context.territoryId, domains: ['economia'] as const,
      statement: 'O prefeito causou a variação observada.',
      claims: [{ id: 'c1', text: 'O prefeito causou a variação observada.', signalRefs: [context.units[0].id], evidenceRefs: context.units[0].evidenceRefs, claimType: 'OBSERVED_PATTERN' as const, supportStatus: 'SUPPORTED' as const }],
      caveats: [], temporalScope: { periodStart: '2020', periodEnd: '2024', label: 'teste' }, origin: 'rule' as const, methodVersion: 'test-v1',
    }], executionMetadata: [] }) };
    const pipeline = await runInterpretationPipeline(result, rejectingProvider);
    expect(pipeline.status).toBe('COMPLETED');
    if (pipeline.status === 'COMPLETED') {
      expect(pipeline.accepted).toEqual([]);
      expect(pipeline.rejected).toHaveLength(1);
      expect(pipeline.rejected[0].errors.some((error) => error.code === 'POLITICAL_ATTRIBUTION_CLAIM')).toBe(true);
    }
  });

  it('lineage: toda Interpretation aceita resolve até Evidence, incluindo Consolidated -> Raw (seção 84-86)', async () => {
    const pipeline = await runInterpretationPipeline(result, provider);
    expect(pipeline.status).toBe('COMPLETED');
    if (pipeline.status !== 'COMPLETED') return;
    const resolvableSignalIds = new Set(pipeline.context.units.flatMap((unit) => [unit.id, ...unit.constituentRawSignalRefs]));
    for (const interpretation of pipeline.accepted) {
      expect(() => assertInterpretationLineageResolves(interpretation, resolvableSignalIds, pipeline.context.evidenceIndex)).not.toThrow();
    }
  });

  it('interpretations ficam em memória — pipeline não tem nenhum efeito colateral de persistência (seção 61)', async () => {
    const before = JSON.stringify(result);
    await runInterpretationPipeline(result, provider);
    expect(JSON.stringify(result)).toBe(before);
  });

  it('determinístico: mesmo EconomicIntelligenceResult produz sempre o mesmo conjunto de accepted/rejected (seção 92)', async () => {
    const pipelineA = await runInterpretationPipeline(result, provider, { now: () => '2026-01-01T00:00:00Z' });
    const pipelineB = await runInterpretationPipeline(result, provider, { now: () => '2026-01-01T00:00:00Z' });
    expect(pipelineA).toEqual(pipelineB);
  });
});
