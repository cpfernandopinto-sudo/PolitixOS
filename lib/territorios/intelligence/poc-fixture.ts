/**
 * INTEL-01 — Prova conceitual local (seção 48).
 *
 * Objeto fictício completo de Evidence → Signal → Interpretation → Implication →
 * Recommendation, para provar que a cadeia é rastreável até a fonte oficial.
 *
 * SEM LLM. SEM persistência. SEM município real — usa MUNICIPIO_DEMONSTRATIVO,
 * seguindo a mesma convenção já usada pelas fixtures de sandbox do frontend
 * (`lib/territorios/fixtures/sandbox-fixtures.ts`).
 */

import type { AnalyticalSignal, Evidence, Implication, Interpretation, Recommendation } from './contracts';

export const POC_TERRITORY_ID = 'fixture-municipio-demonstrativo';

export const pocEvidence: Evidence[] = [
  {
    id: 'evidence:eco:transferencias:2025',
    territoryId: POC_TERRITORY_ID,
    domain: 'economia',
    indicator: 'transferencias_correntes_brutas_realizadas',
    value: 2139220074.39,
    unit: 'BRL',
    period: '2025',
    source: 'Tesouro/SICONFI',
    dataset: 'SICONFI_DCA',
    evidenceHash: 'fixture-hash-transferencias-2025',
    metadata: { fixture: true },
  },
  {
    id: 'evidence:eco:receita-corrente:2025',
    territoryId: POC_TERRITORY_ID,
    domain: 'economia',
    indicator: 'receita_corrente_bruta_realizada',
    value: 4017044518.27,
    unit: 'BRL',
    period: '2025',
    source: 'Tesouro/SICONFI',
    dataset: 'SICONFI_DCA',
    evidenceHash: 'fixture-hash-receita-corrente-2025',
    metadata: { fixture: true },
  },
];

export const pocDerivedIndicatorResult = 0.5326; // transferencias / receita_corrente, arredondado

export const pocSignal: AnalyticalSignal = {
  id: 'signal:eco:dependencia-transferencias:2025',
  territoryId: POC_TERRITORY_ID,
  domains: ['economia'],
  type: 'PRESSURE',
  priority: 'MEDIUM',
  severity: 'MODERATE',
  title: 'Dependência de transferências correntes acima de metade da receita corrente',
  summary: 'A razão entre transferências correntes e receita corrente bruta é 0,53 no exercício de 2025.',
  evidenceRefs: [pocEvidence[0].id, pocEvidence[1].id],
  derivedIndicatorRefs: ['derived:eco:dependencia-transferencias:2025'],
  period: '2025',
  status: 'ACTIVE',
  confidence: 'DIRECTLY_SUPPORTED',
  limitations: [{ code: 'NOMINAL_VALUE', description: 'Valores nominais, sem deflator; não representa poder de compra real.' }],
  methodId: 'ratio-transferencias-receita-corrente',
  methodVersion: 'v1',
};

export const pocInterpretation: Interpretation = {
  id: 'interpretation:eco:dependencia-transferencias:2025',
  territoryId: POC_TERRITORY_ID,
  assertionClass: 'INTERPRETATION',
  statement: 'No exercício de 2025, mais da metade da receita corrente do Município Demonstrativo teve origem em transferências correntes, o que indica dependência relevante de repasses externos para a operação corrente.',
  domains: ['economia'],
  origin: 'rule',
  modelProvenance: null,
  basedOnSignals: [pocSignal.id],
  evidenceRefs: [pocEvidence[0].id, pocEvidence[1].id],
  confidence: 'DIRECTLY_SUPPORTED',
  caveats: ['não é possível concluir causalidade com o contexto disponível', 'valores nominais, sem deflator'],
  contradicts: [],
};

export const pocImplication: Implication = {
  id: 'implication:eco:dependencia-transferencias:2025',
  territoryId: POC_TERRITORY_ID,
  assertionClass: 'IMPLICATION',
  statement: 'Alta dependência de transferências correntes reduz a margem de manobra fiscal própria do município para decisões de curto prazo.',
  dimension: 'gestao',
  origin: 'rule',
  modelProvenance: null,
  basedOnInterpretations: [pocInterpretation.id],
  confidence: 'DIRECTLY_SUPPORTED',
  caveats: ['implicação de gestão, não é diagnóstico de causa'],
};

export const pocRecommendation: Recommendation = {
  id: 'recommendation:eco:dependencia-transferencias:2025',
  territoryId: POC_TERRITORY_ID,
  assertionClass: 'RECOMMENDATION',
  action: 'Aprofundar, no próximo ciclo de análise, a composição das transferências correntes por origem (federal/estadual) antes de qualquer leitura de agenda.',
  priority: 'MEDIUM',
  justification: 'A dependência identificada é relevante o suficiente para orientar aprofundamento metodológico, mas insuficiente, isoladamente, para qualquer conclusão de agenda político-territorial.',
  origin: 'rule',
  modelProvenance: null,
  basedOnImplications: [pocImplication.id],
  basedOnInterpretations: [pocInterpretation.id],
  evidenceRefs: [pocEvidence[0].id, pocEvidence[1].id],
  caveats: ['recomendação metodológica, não recomendação de campanha ou comunicação'],
  validUntil: null,
  reviewStatus: 'not_reviewed',
};

export const pocEvidenceIndex: Record<string, Evidence> = Object.fromEntries(pocEvidence.map((item) => [item.id, item]));
