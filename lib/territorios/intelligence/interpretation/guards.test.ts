import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { validateEconomyGuards } from './guards';
import type { InterpretationClaim, InterpretationUnit } from './types';

function claim(overrides: Partial<InterpretationClaim>): InterpretationClaim {
  return { id: 'claim:test', text: '', signalRefs: [], evidenceRefs: [], claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED', ...overrides };
}

function rawUnit(overrides: Partial<InterpretationUnit> & { id: string; family: InterpretationUnit['family'] }): InterpretationUnit {
  return {
    kind: 'RAW_SIGNAL',
    signal: {
      id: overrides.id, territoryId: 'fixture', domains: ['economia'], type: 'CHANGE', priority: null, severity: 'MODERATE',
      title: 't', summary: 's', evidenceRefs: [], derivedIndicatorRefs: [], period: '2020-2021', status: 'ACTIVE', confidence: 'DIRECTLY_SUPPORTED',
      limitations: [{ code: 'NOMINAL_VALUE', description: 'Valores nominais.' }], methodId: 'm', methodVersion: 'v1',
    },
    constituentRawSignalRefs: [overrides.id],
    evidenceRefs: [],
    derivedIndicatorRefs: [],
    period: '2020-2021',
    ...overrides,
  } as InterpretationUnit;
}

describe('validateEconomyGuards — seções 19, 20, 32, 33, 30-31 do gate', () => {
  const result = buildFixtureEconomicIntelligenceResult();
  const context = selectInterpretationInput(result);
  const fiscalUnit = context.units.find((unit) => unit.family === 'FISCAL')!;
  const officialShareUnit = context.units.find((unit) => unit.family === 'OFFICIAL_SHARE')!;

  it('NORMATIVE_CLAIM: bloqueia juízo de valor sem metodologia (seção 19)', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'A gestão fiscal foi ruim neste período.', signalRefs: [fiscalUnit.id] })]);
    expect(errors.some((error) => error.code === 'NORMATIVE_CLAIM')).toBe(true);
  });

  it('NORMATIVE_CLAIM: não dispara para texto puramente descritivo', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'A despesa corrente variou de forma persistente acima da receita corrente.', signalRefs: [fiscalUnit.id] })]);
    expect(errors.some((error) => error.code === 'NORMATIVE_CLAIM')).toBe(false);
  });

  it('POLITICAL_ATTRIBUTION_CLAIM: bloqueia atribuição ao prefeito/gestão/partido (seção 20)', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'O prefeito causou o aumento da despesa corrente.', signalRefs: [fiscalUnit.id] })]);
    expect(errors.some((error) => error.code === 'POLITICAL_ATTRIBUTION_CLAIM')).toBe(true);
  });

  it('NOMINALITY_VIOLATION: bloqueia "crescimento real" sobre indicador nominal (seção 32)', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'A despesa corrente teve crescimento real expressivo.', signalRefs: [fiscalUnit.id] })]);
    expect(errors.some((error) => error.code === 'NOMINALITY_VIOLATION')).toBe(true);
  });

  it('NOMINALITY_VIOLATION: não dispara quando não há menção a termos reais', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'A despesa corrente variou nominalmente no período.', signalRefs: [fiscalUnit.id] })]);
    expect(errors.some((error) => error.code === 'NOMINALITY_VIOLATION')).toBe(false);
  });

  it('PIB_PER_CAPITA_SEMANTIC_VIOLATION: bloqueia equivalência a renda/salário individual (seção 33)', () => {
    const pibPerCapitaUnit = rawUnit({ id: 'signal:test:pib-per-capita', family: 'PIB_VAB_MONETARY', derivedIndicatorRefs: [`derived:fixture:pib_per_capita_precos_correntes:ECON_VAR_YOY_V1:2020-2021`] });
    const testContext = { ...context, units: [...context.units, pibPerCapitaUnit] };
    const errors = validateEconomyGuards(testContext, [claim({ text: 'O PIB per capita mostra que a renda média da população aumentou.', signalRefs: [pibPerCapitaUnit.id] })]);
    expect(errors.some((error) => error.code === 'PIB_PER_CAPITA_SEMANTIC_VIOLATION')).toBe(true);
  });

  it('PIB_PER_CAPITA_SEMANTIC_VIOLATION: permite afirmação sobre o valor oficial em si', () => {
    const pibPerCapitaUnit = rawUnit({ id: 'signal:test:pib-per-capita', family: 'PIB_VAB_MONETARY', derivedIndicatorRefs: [`derived:fixture:pib_per_capita_precos_correntes:ECON_VAR_YOY_V1:2020-2021`] });
    const testContext = { ...context, units: [...context.units, pibPerCapitaUnit] };
    const errors = validateEconomyGuards(testContext, [claim({ text: 'O PIB per capita oficial aumentou nominalmente no período.', signalRefs: [pibPerCapitaUnit.id] })]);
    expect(errors.some((error) => error.code === 'PIB_PER_CAPITA_SEMANTIC_VIOLATION')).toBe(false);
  });

  it('TEMPORAL_MISREPRESENTATION: bloqueia imediatismo ("atualmente"/"hoje") sobre dado defasado (seção 30-31)', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'Atualmente, a participação de serviços é dominante.', signalRefs: [officialShareUnit.id] })]);
    expect(errors.some((error) => error.code === 'TEMPORAL_MISREPRESENTATION')).toBe(true);
  });

  it('TEMPORAL_MISREPRESENTATION: bloqueia ano citado fora do período das unidades referenciadas', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'Em 2026, a participação de serviços era dominante.', signalRefs: [officialShareUnit.id] })]);
    expect(errors.some((error) => error.code === 'TEMPORAL_MISREPRESENTATION')).toBe(true);
  });

  it('TEMPORAL_MISREPRESENTATION: não dispara para ano coerente com o período da unidade', () => {
    const year = officialShareUnit.period.match(/\d{4}/)?.[0];
    const errors = validateEconomyGuards(context, [claim({ text: `Em ${year}, a participação de serviços foi identificada como concentrada.`, signalRefs: [officialShareUnit.id] })]);
    expect(errors.some((error) => error.code === 'TEMPORAL_MISREPRESENTATION')).toBe(false);
  });

  it('claim METHODOLOGICAL_CAVEAT sem menção proibida não dispara nenhum guard econômico', () => {
    const errors = validateEconomyGuards(context, [claim({ text: 'Valores nominais, sem deflator.', claimType: 'METHODOLOGICAL_CAVEAT' })]);
    expect(errors).toHaveLength(0);
  });

  // INTEL-ELECTORAL-01 — achado: período mensal YYYYMM (CAGED) nunca produzia um token
  // de 4 dígitos no split original, então `validYears` ficava vazio e o guard de
  // TEMPORAL_MISREPRESENTATION-por-ano nunca disparava para essas unidades.
  it('TEMPORAL_MISREPRESENTATION: bloqueia ano citado fora do período de uma unidade mensal YYYYMM (achado CAGED)', () => {
    const monthlyUnit = rawUnit({ id: 'signal:test:caged-monthly', family: 'GENERAL', period: '202506' });
    const testContext = { ...context, units: [...context.units, monthlyUnit] };
    const errors = validateEconomyGuards(testContext, [claim({ text: 'Em 2020, o saldo de emprego formal subiu.', signalRefs: [monthlyUnit.id] })]);
    expect(errors.some((error) => error.code === 'TEMPORAL_MISREPRESENTATION')).toBe(true);
  });

  it('TEMPORAL_MISREPRESENTATION: não dispara para ano coerente com uma unidade mensal YYYYMM (achado CAGED)', () => {
    const monthlyUnit = rawUnit({ id: 'signal:test:caged-monthly', family: 'GENERAL', period: '202506' });
    const testContext = { ...context, units: [...context.units, monthlyUnit] };
    const errors = validateEconomyGuards(testContext, [claim({ text: 'Em 2025, o saldo de emprego formal subiu.', signalRefs: [monthlyUnit.id] })]);
    expect(errors.some((error) => error.code === 'TEMPORAL_MISREPRESENTATION')).toBe(false);
  });
});
