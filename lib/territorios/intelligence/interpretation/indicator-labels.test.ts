/**
 * INTEL-03C.2 — Testes obrigatórios da correção de `UNKNOWN_SOURCE` (Etapa 2/Guardrails
 * do gate).
 *
 * Prova duas coisas simultaneamente: (1) nomes de indicador por extenso, DERIVADOS do
 * próprio contexto, deixam de ser sinalizados como fonte desconhecida; (2) entidades
 * externas fabricadas — presentes ou não na evidência — continuam sendo rejeitadas
 * normalmente. O objetivo não é permitir qualquer entidade econômica, é reconhecer
 * apenas o catálogo fechado de indicadores do motor.
 */

import { describe, expect, it } from 'vitest';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { deriveKnownEntitiesFromContext } from './guards';
import { friendlyNameForIndicator, INDICATOR_FRIENDLY_NAMES } from './indicator-labels';
import { validateInterpretationDraft } from './validator';
import type { InterpretationClaim, InterpretationDraft, InterpretationInputContext, InterpretationUnit } from './types';

const result = buildFixtureEconomicIntelligenceResult();
const context = selectInterpretationInput(result);
const pibVabUnit = context.units.find((unit) => unit.family === 'PIB_VAB_MONETARY')!;

function rawUnit(overrides: Partial<InterpretationUnit> & { id: string; family: InterpretationUnit['family']; derivedIndicatorRefs: string[] }): InterpretationUnit {
  return {
    kind: 'RAW_SIGNAL',
    signal: {
      id: overrides.id, territoryId: 'fixture', domains: ['economia'], type: 'CHANGE', priority: null, severity: 'MODERATE',
      title: 't', summary: 's', evidenceRefs: [], derivedIndicatorRefs: overrides.derivedIndicatorRefs, period: '2020-2021', status: 'ACTIVE', confidence: 'DIRECTLY_SUPPORTED',
      limitations: [], methodId: 'm', methodVersion: 'v1',
    },
    constituentRawSignalRefs: [overrides.id],
    evidenceRefs: [],
    period: '2020-2021',
    ...overrides,
  } as InterpretationUnit;
}

function draftWithClaim(territoryId: string, claim: InterpretationClaim): InterpretationDraft {
  return {
    id: 'interpretation-draft:allowlist-test', territoryId, domains: ['economia'],
    statement: 'Síntese neutra sem menção proibida, apenas para isolar o claim testado.',
    claims: [claim], caveats: ['leitura não estabelece causalidade nem atribuição de gestão.'],
    temporalScope: { periodStart: '2020', periodEnd: '2024', label: 'teste' }, origin: 'model', methodVersion: 'test-v1',
  };
}

function claim(overrides: Partial<InterpretationClaim>, refs: { signalRefs: string[]; evidenceRefs: string[] }): InterpretationClaim {
  return { id: 'claim:allowlist-test', text: '', signalRefs: refs.signalRefs, evidenceRefs: refs.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED', ...overrides };
}

describe('INDICATOR_FRIENDLY_NAMES — catálogo fechado (Etapa 2 do gate)', () => {
  it('cobre exatamente os 19 indicadores definidos em economy/engine.ts (7 FISCAL + 8 PIB_VAB + 4 OFFICIAL_SHARE)', () => {
    expect(Object.keys(INDICATOR_FRIENDLY_NAMES)).toHaveLength(19);
  });

  it('indicador desconhecido (fora do catálogo) retorna null, nunca inventa um nome', () => {
    expect(friendlyNameForIndicator('indicador_que_nao_existe')).toBeNull();
  });
});

describe('deriveKnownEntitiesFromContext — allowlist derivada só do contexto real', () => {
  it('nunca inclui uma entidade externa fabricada', () => {
    const entities = deriveKnownEntitiesFromContext(context);
    for (const fake of ['Instituto Fiscal Independente', 'Banco Mundial', 'Fundação Getulio Vargas', 'Universidade Federal de Minas Gerais']) {
      expect(entities).not.toContain(fake);
    }
  });

  it('lista vazia para um contexto sem unidades', () => {
    const empty: InterpretationInputContext = { ...context, units: [] };
    expect(deriveKnownEntitiesFromContext(empty)).toEqual([]);
  });
});

describe('validateInterpretationDraft — termos econômicos por extenso não disparam mais UNKNOWN_SOURCE (achado real do INTEL-03C.1)', () => {
  it('"Produto Interno Bruto" não dispara UNKNOWN_SOURCE quando o indicador pib_municipal_precos_correntes está no contexto', () => {
    const unit = rawUnit({ id: 'signal:test:pib', family: 'PIB_VAB_MONETARY', derivedIndicatorRefs: ['derived:fixture:pib_municipal_precos_correntes:ECON_VAR_YOY_V1:2020-2021'] });
    const testContext = { ...context, units: [...context.units, unit] };
    const validation = validateInterpretationDraft(draftWithClaim(context.territoryId, claim({ text: 'O Produto Interno Bruto registrou alta no período.' }, { signalRefs: [unit.id], evidenceRefs: [] })), testContext);
    expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(false);
  });

  it('"Valor Adicionado Bruto" não dispara UNKNOWN_SOURCE quando vab_total_precos_correntes está no contexto', () => {
    const unit = rawUnit({ id: 'signal:test:vab', family: 'PIB_VAB_MONETARY', derivedIndicatorRefs: ['derived:fixture:vab_total_precos_correntes:ECON_VAR_YOY_V1:2020-2021'] });
    const testContext = { ...context, units: [...context.units, unit] };
    const validation = validateInterpretationDraft(draftWithClaim(context.territoryId, claim({ text: 'O Valor Adicionado Bruto cresceu no período.' }, { signalRefs: [unit.id], evidenceRefs: [] })), testContext);
    expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(false);
  });

  it('"Saúde Públicas" e "Seguridade Social" (fragmentos do nome composto) não disparam UNKNOWN_SOURCE (achado real de BH no INTEL-03C.1)', () => {
    const unit = rawUnit({ id: 'signal:test:saude', family: 'PIB_VAB_MONETARY', derivedIndicatorRefs: ['derived:fixture:vab_administracao_defesa_educacao_saude_publicas_seguridade_precos_correntes:ECON_VAR_YOY_V1:2020-2021'] });
    const testContext = { ...context, units: [...context.units, unit] };
    const claimSaude = claim({ id: 'c1', text: 'A participação de Saúde Públicas variou no período.' }, { signalRefs: [unit.id], evidenceRefs: [] });
    const claimSeguridade = claim({ id: 'c2', text: 'A Seguridade Social também apresentou variação.' }, { signalRefs: [unit.id], evidenceRefs: [] });
    const validation = validateInterpretationDraft({ ...draftWithClaim(context.territoryId, claimSaude), claims: [claimSaude, claimSeguridade] }, testContext);
    expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(false);
  });

  it('"Produto Interno Bruto" AINDA dispara UNKNOWN_SOURCE quando NENHUM indicador de PIB está presente no contexto (allowlist é escopada, não global)', () => {
    const fiscalOnlyContext: InterpretationInputContext = { ...context, units: context.units.filter((unit) => unit.family === 'FISCAL') };
    const fiscalUnit = fiscalOnlyContext.units[0];
    const validation = validateInterpretationDraft(draftWithClaim(context.territoryId, claim({ text: 'O Produto Interno Bruto registrou alta no período.' }, { signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs })), fiscalOnlyContext);
    expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(true);
  });
});

describe('validateInterpretationDraft — entidades externas fabricadas continuam rejeitadas (nunca afrouxado)', () => {
  const cases = ['Instituto Fiscal Independente', 'Banco Mundial', 'Fundação Getulio Vargas', 'Universidade Federal de Minas Gerais'];

  for (const entity of cases) {
    it(`"${entity}" continua rejeitada quando ausente da evidência`, () => {
      const validation = validateInterpretationDraft(
        draftWithClaim(context.territoryId, claim({ text: `Segundo o ${entity}, os dados confirmam esta leitura.` }, { signalRefs: [pibVabUnit.id], evidenceRefs: pibVabUnit.evidenceRefs })),
        context,
      );
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(true);
    });
  }

  it('uma entidade fabricada que contém um indicador real como substring continua rejeitada (proteção contra padding)', () => {
    const validation = validateInterpretationDraft(
      draftWithClaim(context.territoryId, claim({ text: 'Segundo o Instituto Produto Interno Bruto Nacional, os dados confirmam isso.' }, { signalRefs: [pibVabUnit.id], evidenceRefs: pibVabUnit.evidenceRefs })),
      context,
    );
    expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(true);
  });
});
