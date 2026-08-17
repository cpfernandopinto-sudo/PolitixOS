import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { serializeInterpretationContext } from './serializer';

describe('serializeInterpretationContext — seções 50-53 do gate', () => {
  const result = buildFixtureEconomicIntelligenceResult();
  const context = selectInterpretationInput(result, { now: () => '2026-01-01T00:00:00Z' });

  it('determinístico: mesmo contexto produz o mesmo contextHash (seção 51)', () => {
    const serializedA = serializeInterpretationContext(context);
    const serializedB = serializeInterpretationContext(context);
    expect(serializedA.contextHash).toBe(serializedB.contextHash);
    expect(serializedA).toEqual(serializedB);
  });

  it('nunca corta lineage por truncamento de texto (seção 52) — todo evidenceRef/derivedIndicatorRef/constituentRawSignalRef sobrevive', () => {
    const serialized = serializeInterpretationContext(context);
    for (const unit of context.units) {
      const serializedUnit = serialized.units.find((item) => item.id === unit.id)!;
      expect(serializedUnit.derivedIndicatorRefs.sort()).toEqual([...unit.derivedIndicatorRefs].sort());
      expect(serializedUnit.constituentRawSignalRefs.sort()).toEqual([...unit.constituentRawSignalRefs].sort());
    }
  });

  it('ordenação canônica: units ordenadas por família e depois por id', () => {
    const serialized = serializeInterpretationContext(context);
    const sorted = [...serialized.units].sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id));
    expect(serialized.units).toEqual(sorted);
  });

  it('não é um prompt — nenhum campo de texto instrucional presente', () => {
    const serialized = serializeInterpretationContext(context);
    const json = JSON.stringify(serialized).toLowerCase();
    expect(json).not.toContain('you are');
    expect(json).not.toContain('instruções:');
    expect(json).not.toContain('system:');
  });

  it('contextHash muda quando o conjunto de unidades muda', () => {
    const serializedFull = serializeInterpretationContext(context);
    const reduced = { ...context, units: context.units.slice(1) };
    const serializedReduced = serializeInterpretationContext(reduced);
    expect(serializedReduced.contextHash).not.toBe(serializedFull.contextHash);
  });
});
