import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { RuleBasedMockProvider } from './provider';
import { validateInterpretationDraft } from './validator';
import type { InterpretationClaim, InterpretationDraft } from './types';

function baseDraft(context: ReturnType<typeof selectInterpretationInput>, claims: InterpretationClaim[], overrides: Partial<InterpretationDraft> = {}): InterpretationDraft {
  return {
    id: 'interpretation-draft:test',
    territoryId: context.territoryId,
    domains: ['economia'],
    statement: 'Síntese neutra sem menção proibida.',
    claims,
    caveats: ['leitura não estabelece causalidade nem atribuição de gestão.'],
    temporalScope: { periodStart: '2020', periodEnd: '2024', label: 'teste' },
    origin: 'rule',
    methodVersion: 'test-v1',
    ...overrides,
  };
}

describe('validateInterpretationDraft — seções 43-46, 62-93 do gate', () => {
  const result = buildFixtureEconomicIntelligenceResult();
  const context = selectInterpretationInput(result);
  const provider = new RuleBasedMockProvider();
  const fiscalUnit = context.units.find((unit) => unit.family === 'FISCAL')!;
  let realDrafts: InterpretationDraft[];

  beforeAll(async () => {
    realDrafts = (await provider.generateInterpretations(context)).drafts;
  });

  it('seção 62 — draft válido real do mock provider é aceito, com confidence não-nula', () => {
    for (const draft of realDrafts) {
      const validation = validateInterpretationDraft(draft, context);
      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);
      if (validation.valid) expect(validation.confidence).not.toBeNull();
    }
  });

  it('seção 63 — "A economia vai piorar." é rejeitado (forecast)', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'A economia vai piorar no próximo ano.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'FORECAST_CLAIM')).toBe(true);
  });

  it('seção 63 — "Isso prova má gestão." é rejeitado (normativo)', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Isso prova má gestão municipal.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
  });

  it('seção 63 — "O prefeito perdeu controle." é rejeitado (atribuição política)', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'O prefeito perdeu controle das contas.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'POLITICAL_ATTRIBUTION_CLAIM')).toBe(true);
  });

  it('seção 63 — "PIB cresceu 20% em termos reais." é rejeitado (nominalidade)', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'O indicador cresceu em termos reais no período.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'NOMINALITY_VIOLATION')).toBe(true);
  });

  it('seção 64 — número inventado (37,4%) é rejeitado quando não presente no contexto', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'O indicador variou 37,4% no período, valor exclusivo deste claim.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNSUPPORTED_NUMBER')).toBe(true);
  });

  it('seção 65 — signalRef inventada é rejeitada', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Leitura descritiva sem número.', signalRefs: ['signal:economia:change:inexistente:2020-2021'], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNSUPPORTED_SIGNAL_REF')).toBe(true);
  });

  it('seção 66 — evidenceRef inventada é rejeitada', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Leitura descritiva sem número.', signalRefs: [fiscalUnit.id], evidenceRefs: ['evidence:inexistente'], claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNSUPPORTED_EVIDENCE_REF')).toBe(true);
  });

  it('seção 67 — claim substantivo sem refs é UNSUPPORTED e rejeita o draft', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Leitura descritiva sem nenhuma referência.', signalRefs: [], evidenceRefs: [], claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'INSUFFICIENT_SUPPORT')).toBe(true);
  });

  it('seção 67 — caveat metodológico (METHODOLOGICAL_CAVEAT) pode não ter refs e não é rejeitado por isso', () => {
    const substantiveClaim: InterpretationClaim = { id: 'c1', text: 'Leitura descritiva do sinal.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const caveatClaim: InterpretationClaim = { id: 'c2', text: 'Valores nominais, sem deflator.', signalRefs: [], evidenceRefs: [], claimType: 'METHODOLOGICAL_CAVEAT', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [substantiveClaim, caveatClaim]), context);
    expect(validation.valid).toBe(true);
  });

  it('não confia no supportStatus fornecido pelo autor — recomputa sempre (seção 15)', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Leitura sem refs, rotulada como suportada pelo autor.', signalRefs: [], evidenceRefs: [], claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(false);
  });

  it('draft vazio (sem claims) é rejeitado com NO_CLAIMS', () => {
    const validation = validateInterpretationDraft(baseDraft(context, []), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'NO_CLAIMS')).toBe(true);
  });

  it('statement vazio é rejeitado com EMPTY_STATEMENT', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Leitura descritiva do sinal.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim], { statement: '   ' }), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'EMPTY_STATEMENT')).toBe(true);
  });

  it('statement de topo também é validado (seção 22-24) — número inventado no statement é rejeitado', () => {
    const claim: InterpretationClaim = { id: 'c1', text: 'Leitura descritiva do sinal.', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED' };
    const draft = baseDraft(context, [claim], { statement: 'Resumo executivo citando 999,9% que não existe em nenhum lugar do contexto.' });
    const validation = validateInterpretationDraft(draft, context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNSUPPORTED_NUMBER')).toBe(true);
  });

  it('seção 90 — evidência insuficiente (nenhuma unidade) produz NO_CLAIMS/INSUFFICIENT_SUPPORT, nunca texto forçado', () => {
    const emptyContext = { ...context, units: [], evidenceIndex: {} };
    const validation = validateInterpretationDraft(baseDraft(emptyContext, []), emptyContext);
    expect(validation.valid).toBe(false);
  });

  it('claim MIXED_SIGNAL_READING rebaixa confidence para LIMITED_CONTEXT (seção 28-29, 39-40)', () => {
    const divergenceUnit = context.units.find((unit) => unit.kind === 'RAW_SIGNAL' && (unit.signal as { type: string }).type === 'DIVERGENCE');
    expect(divergenceUnit).toBeDefined();
    const claim: InterpretationClaim = { id: 'c1', text: 'Dois indicadores apresentaram movimentos em sentidos opostos no mesmo intervalo.', signalRefs: [divergenceUnit!.id], evidenceRefs: divergenceUnit!.evidenceRefs, claimType: 'MIXED_SIGNAL_READING', supportStatus: 'SUPPORTED' };
    const validation = validateInterpretationDraft(baseDraft(context, [claim]), context);
    expect(validation.valid).toBe(true);
    if (validation.valid) expect(validation.confidence).toBe('LIMITED_CONTEXT');
  });

  it('determinístico: mesmo draft + mesmo contexto produz sempre o mesmo resultado (seção 92)', () => {
    const validationA = validateInterpretationDraft(realDrafts[0], context);
    const validationB = validateInterpretationDraft(realDrafts[0], context);
    expect(validationA).toEqual(validationB);
  });
});
