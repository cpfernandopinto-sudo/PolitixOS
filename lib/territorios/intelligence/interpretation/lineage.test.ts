import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { runInterpretationPipeline } from './pipeline';
import { RuleBasedMockProvider } from './provider';
import { assertInterpretationLineageResolves, BrokenLineageError } from './lineage';
import type { InterpretationPipelineResult } from './types';

describe('assertInterpretationLineageResolves — seções 84-86 do gate', () => {
  const result = buildFixtureEconomicIntelligenceResult();
  const provider = new RuleBasedMockProvider();
  let pipeline: Extract<InterpretationPipelineResult, { status: 'COMPLETED' }>;
  let resolvableSignalIds: Set<string>;

  beforeAll(async () => {
    const outcome = await runInterpretationPipeline(result, provider);
    if (outcome.status !== 'COMPLETED') throw new Error('fixture inesperadamente sem interpretações');
    pipeline = outcome;
    resolvableSignalIds = new Set(pipeline.context.units.flatMap((unit) => [unit.id, ...unit.constituentRawSignalRefs]));
  });

  it('resolve sem lançar para toda Interpretation real aceita', () => {
    for (const interpretation of pipeline.accepted) {
      expect(() => assertInterpretationLineageResolves(interpretation, resolvableSignalIds, pipeline.context.evidenceIndex)).not.toThrow();
    }
  });

  it('lança BrokenLineageError quando basedOnSignals tem ref quebrada', () => {
    const broken = { ...pipeline.accepted[0], basedOnSignals: ['signal:inexistente'] };
    expect(() => assertInterpretationLineageResolves(broken, resolvableSignalIds, pipeline.context.evidenceIndex)).toThrow(BrokenLineageError);
  });

  it('lança BrokenLineageError quando evidenceRefs tem ref quebrada', () => {
    const broken = { ...pipeline.accepted[0], evidenceRefs: ['evidence:inexistente'] };
    expect(() => assertInterpretationLineageResolves(broken, resolvableSignalIds, pipeline.context.evidenceIndex)).toThrow(BrokenLineageError);
  });

  it('resolve Consolidated -> Raw: constituentRawSignalRefs das unidades consolidadas são refs válidas para claims', () => {
    const consolidatedUnit = pipeline.context.units.find((unit) => unit.kind === 'CONSOLIDATED_SIGNAL');
    expect(consolidatedUnit).toBeDefined();
    expect(consolidatedUnit!.constituentRawSignalRefs.length).toBeGreaterThan(0);
    for (const rawRef of consolidatedUnit!.constituentRawSignalRefs) expect(resolvableSignalIds.has(rawRef)).toBe(true);
  });

  it('lança BrokenLineageError quando um claim individual tem ref quebrada', () => {
    const interpretation = pipeline.accepted[0];
    const broken = { ...interpretation, claims: [{ ...interpretation.claims[0], signalRefs: ['signal:inexistente'] }, ...interpretation.claims.slice(1)] };
    expect(() => assertInterpretationLineageResolves(broken, resolvableSignalIds, pipeline.context.evidenceIndex)).toThrow(BrokenLineageError);
  });
});
