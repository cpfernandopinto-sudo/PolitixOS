/**
 * INTEL-DOMAIN-02 (Missão B) — Facts eleitorais (L1/L2 -> L3), PROJEÇÃO pura sobre
 * `ElectoralTerritoryIntelligence` (já determinístico e testado em
 * `electoral-intelligence.ts`/`electoral-analytics.ts`). NUNCA recalcula comparecimento,
 * abstenção, margem, eleitorado ou histórico — apenas traduz o resultado já homologado
 * para o contrato cross-domain `Fact` (`../contracts.ts`), do mesmo jeito que
 * `../economy/caged-adapter.ts` projeta o motor CAGED sem recalcular MoM/YoY/Rolling12.
 *
 * NÃO substitui `electoral-briefing.ts`/`electoral-interpretation.ts` (a leitura
 * executiva "de verdade" do domínio eleitoral, com classes
 * DIRECTLY_SUPPORTED/MULTI_SIGNAL_SUPPORTED/LIMITED_CONTEXT e guardrails próprios) —
 * serve exclusivamente para alimentar o contrato cross-domain do Command Center
 * (Missão D) com o mesmo formato usado por Economia/Segurança.
 *
 * Limitação real e documentada (nunca fabricação): a fonte eleitoral (TSE, via
 * `electoral-analytics.ts`) nunca carrega votos brancos/nulos — apenas
 * `validVotes`/`electorate`/`turnout`/`abstention`. Nenhum fact de brancos/nulos é
 * produzido aqui porque o dado não existe no pipeline determinístico.
 */

import type { ElectionTerritoryYearAnalysis, ElectoralProvenance } from '../../electoral-analytics';
import type { ElectoralTerritoryIntelligence } from '../../electoral-intelligence';
import type { Fact, Limitation } from '../contracts';

const EVIDENCE_DATASET = 'TSE';

function evidenceRef(territoryId: string, metric: string, year: number): string {
  return `db:${territoryId}:eleitoral_${metric}:${EVIDENCE_DATASET}:${year}`;
}

function provenanceComplete(provenance: ElectoralProvenance): boolean {
  return Boolean(provenance.territoryId && provenance.metricKeys.length && provenance.datasets.length && provenance.evidenceHashes.length);
}

function numericFact(territoryId: string, election: ElectionTerritoryYearAnalysis, key: string, label: string, value: number | null, unit: string | null): Fact {
  const supported = value !== null && provenanceComplete(election.provenance);
  const limitations: Limitation[] = supported ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: `Dado de "${label}" indisponível ou sem proveniência completa para ${election.year}.`, domain: 'eleitoral' }];
  return {
    id: `fact:${territoryId}:eleitoral:${key}:${election.year}`, territoryId, domain: 'eleitoral', key, label,
    value: supported ? value : null, unit, period: String(election.year),
    evidenceRefs: supported ? [evidenceRef(territoryId, key, election.year)] : [],
    derivedIndicatorRefs: [], supported, limitations,
  };
}

function identityFact(territoryId: string, election: ElectionTerritoryYearAnalysis, key: string, label: string, value: string | null): Fact {
  const supported = value !== null && provenanceComplete(election.provenance);
  const limitations: Limitation[] = supported ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: `Dado de "${label}" indisponível ou sem proveniência completa para ${election.year}.`, domain: 'eleitoral' }];
  return {
    id: `fact:${territoryId}:eleitoral:${key}:${election.year}`, territoryId, domain: 'eleitoral', key, label,
    value: supported ? value : null, unit: null, period: String(election.year),
    evidenceRefs: supported ? [evidenceRef(territoryId, key, election.year)] : [],
    derivedIndicatorRefs: [], supported, limitations,
  };
}

/**
 * Deriva `Fact[]` a partir de um `ElectoralTerritoryIntelligence` já construído
 * (`buildElectoralTerritoryIntelligence`). Puro, determinístico, sem chamada de
 * rede/LLM — apenas tradução de formato.
 */
export function buildElectoralFacts(intelligence: ElectoralTerritoryIntelligence): Fact[] {
  const territoryId = intelligence.territory.id;
  const facts: Fact[] = [];

  for (const election of intelligence.facts) {
    facts.push(numericFact(territoryId, election, 'electorate', 'Eleitorado apto', election.electorate, 'eleitores'));
    facts.push(numericFact(territoryId, election, 'turnout', 'Comparecimento (absoluto)', election.turnout, 'eleitores'));
    facts.push(numericFact(territoryId, election, 'turnout_rate', 'Taxa de comparecimento', election.turnoutRate, '%'));
    facts.push(numericFact(territoryId, election, 'abstention', 'Abstenção (absoluta)', election.abstention, 'eleitores'));
    facts.push(numericFact(territoryId, election, 'abstention_rate', 'Taxa de abstenção', election.abstentionRate, '%'));
    facts.push(numericFact(territoryId, election, 'valid_votes', 'Votos válidos', election.validVotes, 'votos'));
    facts.push(numericFact(territoryId, election, 'margin_votes', 'Margem de vitória (votos)', election.marginVotes, 'votos'));
    facts.push(numericFact(territoryId, election, 'margin_percentage_points', 'Margem de vitória (pontos percentuais)', election.marginPercentagePoints, 'p.p.'));
    facts.push(numericFact(territoryId, election, 'decisive_round', 'Turno decisivo', election.decisiveRound, null));
    facts.push(identityFact(territoryId, election, 'winner', 'Candidato vencedor', election.winner));
    facts.push(identityFact(territoryId, election, 'winner_party', 'Partido vencedor', election.winnerParty));
  }

  // Mudanças entre eleições — projeta `comparisons` já calculado por electoral-intelligence.ts
  // (nunca recalcula MoM/delta aqui).
  for (const change of intelligence.comparisons) {
    facts.push({
      id: `fact:${territoryId}:eleitoral:${change.metric}_change:${change.fromYear}_${change.toYear}`,
      territoryId, domain: 'eleitoral', key: `${change.metric}_change`,
      label: `Mudança de ${change.metric} entre ${change.fromYear} e ${change.toYear}`,
      value: change.absoluteDelta, unit: null, period: `${change.fromYear}-${change.toYear}`,
      evidenceRefs: [evidenceRef(territoryId, change.metric, change.fromYear), evidenceRef(territoryId, change.metric, change.toYear)],
      derivedIndicatorRefs: [], supported: true, limitations: [],
    });
  }

  return facts;
}
