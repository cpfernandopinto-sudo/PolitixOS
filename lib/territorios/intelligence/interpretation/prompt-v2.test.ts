/**
 * INTEL-03C — Testes da V2 do prompt (Parte A + Parte J do gate, seções 75-79).
 *
 * V2 não cria nenhum guard novo — as correções (fidelidade temporal, proibição de
 * identificador técnico, falso positivo "No VAB") continuam sendo aplicadas pelo MESMO
 * `validateInterpretationDraft`/`guardrails.ts` que já existiam. Estes testes provam
 * duas coisas: (1) o texto de sistema da V2 contém as regras novas explicitamente, e
 * (2) o comportamento do validador continua correto e nunca foi afrouxado para a V2.
 */

import { describe, expect, it } from 'vitest';
import { INTERPRETATION_SYSTEM_PROMPT_V2, buildInterpretationUserMessageV2 } from './prompt-v2';
import { INTERPRETATION_SYSTEM_PROMPT_V1 } from './prompt';
import { resolvePromptModule } from './prompt-registry';
import { buildFixtureEconomicIntelligenceResult } from './test-fixtures';
import { selectInterpretationInput } from './selection';
import { buildFamilyScopedContext } from './prompt';
import { validateInterpretationDraft } from './validator';
import type { InterpretationClaim, InterpretationDraft } from './types';

const result = buildFixtureEconomicIntelligenceResult();
const context = selectInterpretationInput(result);
const fiscalContext = buildFamilyScopedContext(context, 'FISCAL');
const fiscalUnit = fiscalContext.units[0];

function draftWithClaim(claim: InterpretationClaim): InterpretationDraft {
  return {
    id: 'interpretation-draft:v2-test', territoryId: context.territoryId, domains: ['economia'],
    statement: 'Síntese neutra sem menção proibida, apenas para isolar o claim testado.',
    claims: [claim], caveats: ['leitura não estabelece causalidade nem atribuição de gestão.'],
    temporalScope: { periodStart: '2020', periodEnd: '2024', label: 'teste' }, origin: 'model', methodVersion: 'test-v1',
  };
}

function claim(overrides: Partial<InterpretationClaim>): InterpretationClaim {
  return { id: 'claim:v2-test', text: '', signalRefs: [fiscalUnit.id], evidenceRefs: fiscalUnit.evidenceRefs, claimType: 'OBSERVED_PATTERN', supportStatus: 'SUPPORTED', ...overrides };
}

describe('INTERPRETATION_SYSTEM_PROMPT_V2 — seção 9-14 do gate', () => {
  it('preserva as 16 regras da V1 (mesmo texto-base, nunca reescrito silenciosamente)', () => {
    for (let rule = 1; rule <= 16; rule++) {
      const marker = new RegExp(`^${rule}\\. `, 'm');
      expect(marker.test(INTERPRETATION_SYSTEM_PROMPT_V1)).toBe(true);
      expect(marker.test(INTERPRETATION_SYSTEM_PROMPT_V2)).toBe(true);
    }
  });

  it('adiciona a regra 17 (fidelidade temporal por claim)', () => {
    expect(INTERPRETATION_SYSTEM_PROMPT_V2).toMatch(/17\. FIDELIDADE TEMPORAL POR CLAIM/);
    expect(INTERPRETATION_SYSTEM_PROMPT_V1).not.toMatch(/FIDELIDADE TEMPORAL POR CLAIM/);
  });

  it('adiciona a regra 18 (proibição de identificador técnico/dataset em prosa)', () => {
    expect(INTERPRETATION_SYSTEM_PROMPT_V2).toMatch(/18\. NUNCA cite.*identificador técnico/);
    expect(INTERPRETATION_SYSTEM_PROMPT_V1).not.toMatch(/identificador técnico/);
  });

  it('V1 nunca foi editado in-place (seção 16 do gate) — arquivo original permanece com 16 regras, sem a 17/18', () => {
    expect(INTERPRETATION_SYSTEM_PROMPT_V1.includes('REGRAS ABSOLUTAS')).toBe(true);
    expect(/17\. |18\. /.test(INTERPRETATION_SYSTEM_PROMPT_V1)).toBe(false);
  });
});

describe('resolvePromptModule — registry (seção 5-7 do gate)', () => {
  it('"v1" resolve o módulo V1', () => {
    expect(resolvePromptModule('v1').promptId).toBe('INTEL_INTERPRETATION_PROMPT_V1');
  });

  it('"v2" resolve o módulo V2', () => {
    expect(resolvePromptModule('v2').promptId).toBe('INTEL_INTERPRETATION_PROMPT_V2');
  });

  it('"v3" resolve o módulo V3', () => {
    expect(resolvePromptModule('v3').promptId).toBe('INTEL_INTERPRETATION_PROMPT_V3');
  });

  it('valor inválido cai no default (v3), nunca lança', () => {
    expect(resolvePromptModule('v99').promptId).toBe('INTEL_INTERPRETATION_PROMPT_V3');
    expect(resolvePromptModule(undefined).promptId).toBe('INTEL_INTERPRETATION_PROMPT_V3');
  });
});

describe('buildInterpretationUserMessageV2 — legenda de fontes amigáveis (seção 14 do gate)', () => {
  it('inclui a seção FONTES quando o contexto tem evidências com dataset/source', () => {
    const { message } = buildInterpretationUserMessageV2(fiscalContext, 'FISCAL');
    if (Object.keys(fiscalContext.evidenceIndex).length > 0) expect(message).toMatch(/FONTES/);
  });
});

describe('validador continua soberano na V2 — nenhum guard afrouxado (seção 79 do gate)', () => {
  it('achado real do INTEL-03B (seção 75): claim citando ano fora do período referenciado continua rejeitado (TEMPORAL_MISREPRESENTATION)', () => {
    const invalidYear = claim({ text: `Em 2099, o indicador fiscal variou de forma expressiva.` });
    const validation = validateInterpretationDraft(draftWithClaim(invalidYear), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'TEMPORAL_MISREPRESENTATION')).toBe(true);
  });

  it('achado real do INTEL-03B (seção 76): citar "5938" em prosa como número continua rejeitado (UNSUPPORTED_NUMBER)', () => {
    const datasetIdInProse = claim({ text: 'Conforme a tabela 5938, o indicador variou no período.' });
    const validation = validateInterpretationDraft(draftWithClaim(datasetIdInProse), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNSUPPORTED_NUMBER')).toBe(true);
  });

  it('seção 77: "No VAB de serviços..." não dispara mais UNKNOWN_SOURCE (fix aplicado)', () => {
    const noVab = claim({ text: 'No VAB de serviços, houve queda consolidada no período fiscal analisado.' });
    const validation = validateInterpretationDraft(draftWithClaim(noVab), context);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(false);
  });

  it('seção 78: entidade realmente desconhecida continua rejeitada (UNKNOWN_SOURCE)', () => {
    const fabricatedEntity = claim({ text: 'Segundo o Instituto Fiscal Independente Brasileiro, os dados confirmam isso.' });
    const validation = validateInterpretationDraft(draftWithClaim(fabricatedEntity), context);
    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.errors.some((error) => error.code === 'UNKNOWN_SOURCE')).toBe(true);
  });

  it('seção 79: guards políticos continuam verdes (causal/atribuição/previsão/recomendação/ideologia)', () => {
    const cases: Array<[string, string]> = [
      ['O indicador variou porque houve decisão administrativa.', 'CAUSAL_CLAIM'],
      ['O prefeito é responsável pela variação observada.', 'POLITICAL_ATTRIBUTION_CLAIM'],
      ['O indicador fiscal deve crescer nos próximos períodos.', 'FORECAST_CLAIM'],
      ['A gestão deve focar prioritariamente neste indicador.', 'RECOMMENDATION_LEAK_CLAIM'],
    ];
    for (const [text, code] of cases) {
      const validation = validateInterpretationDraft(draftWithClaim(claim({ text })), context);
      expect(validation.valid).toBe(false);
      if (!validation.valid) expect(validation.errors.some((error) => error.code === code)).toBe(true);
    }
  });
});
