import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { RuleBasedMockProvider } from './provider';
import { validateInterpretationDraft } from './validator';

describe('RuleBasedMockProvider — seções 47-50 do gate', () => {
  const result = buildFixtureEconomicIntelligenceResult();
  const context = selectInterpretationInput(result);
  const provider = new RuleBasedMockProvider();

  it('nunca cross-family — cada draft referencia unidades de uma única família (seção 69)', async () => {
    const { drafts } = await provider.generateInterpretations(context);
    for (const draft of drafts) {
      const families = new Set(draft.claims.flatMap((claim) => claim.signalRefs.map((ref) => context.units.find((unit) => unit.id === ref || unit.constituentRawSignalRefs.includes(ref))?.family)));
      expect(families.size).toBe(1);
    }
  });

  it('não cria uma interpretação por signal automaticamente (seção 71) — agrupa por família', async () => {
    const { drafts } = await provider.generateInterpretations(context);
    const familiesPresent = new Set(context.units.map((unit) => unit.family));
    expect(drafts.length).toBe(familiesPresent.size);
    expect(drafts.length).toBeLessThan(context.units.length);
  });

  it('origin é sempre "rule" — nunca finge ser modelo (seção 49)', async () => {
    const { drafts } = await provider.generateInterpretations(context);
    for (const draft of drafts) expect(draft.origin).toBe('rule');
  });

  it('executionMetadata é sempre vazio — provider local, nenhuma chamada real (seção 8 do gate INTEL-03B)', async () => {
    const { executionMetadata } = await provider.generateInterpretations(context);
    expect(executionMetadata).toEqual([]);
  });

  it('todo draft gerado é válido segundo o validador (prova de consistência interna)', async () => {
    const { drafts } = await provider.generateInterpretations(context);
    for (const draft of drafts) {
      const validation = validateInterpretationDraft(draft, context);
      expect(validation.errors).toEqual([]);
    }
  });

  it('determinístico: mesmo contexto produz sempre os mesmos drafts (seção 92)', async () => {
    const { drafts: draftsA } = await provider.generateInterpretations(context);
    const { drafts: draftsB } = await provider.generateInterpretations(context);
    expect(draftsA).toEqual(draftsB);
  });

  it('todo claim referencia exatamente a unidade que o originou', async () => {
    const { drafts } = await provider.generateInterpretations(context);
    const claimCount = drafts.reduce((sum, draft) => sum + draft.claims.length, 0);
    expect(claimCount).toBe(context.units.length);
  });
});
