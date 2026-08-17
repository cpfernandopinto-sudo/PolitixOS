/**
 * FRONT-03 / FRONT-04 — Frontend Adapters Layer
 *
 * Conecta o Contrato Canônico da Inteligência Política (INTEL-01 L0–L6 em `contracts.ts`)
 * às interfaces visuais de apresentação do Antigravity (FRONT-02.6, FRONT-02.7, FRONT-04).
 *
 * Regra Arquitetural Absoluta:
 *   CANONICAL DOMAIN CONTRACT -> FRONTEND ADAPTER -> VIEW MODEL -> REACT COMPONENT
 *
 * O adapter é um conjunto de funções puras, determinísticas e testáveis:
 * - Não altera os tipos canônicos em `contracts.ts`
 * - Preserva explicitamente Evidence.id e evidenceHash sem dependência de regex
 * - Adapta Sinais L3 e Interpretações L4 com estado de Zero Interpretations
 * - Estrutura a dinâmica do emprego formal CAGED 5 setores sem inventar estoque/salário
 * - Não importa React
 * - Não faz fetch nem acessa banco
 * - Não inventa dados de produção
 */

import type {
  AnalyticalSignal,
  ConfidenceClass,
  Coverage,
  Evidence,
  Implication,
  Interpretation,
  TemporalCoverage,
  TerritorialAgendaItem as CanonicalAgendaItem,
  TerritorialPoliticalIntelligenceBriefing,
} from './contracts';
import type { EvidenceDetail } from '@/components/dashboard/territorios/intelligence/EvidencePanel';
import type { PrioritizedSignal } from '@/components/dashboard/territorios/intelligence/PoliticalSignalStack';
import type { DomainCoverage } from '@/components/dashboard/territorios/intelligence/AnalysisCoveragePanel';
import type { TemporalDomainCoverage } from '@/components/dashboard/territorios/intelligence/TemporalCoveragePanel';
import type { RiskItem, OpportunityItem } from '@/components/dashboard/territorios/command-center/RiskOpportunitySummary';
import type { TerritoryAgendaItem as TerritoryAgendaItemUI } from '@/components/dashboard/territorios/intelligence/TerritoryAgendaPanel';
import type { TerritoryCommandCenterViewModel } from '@/components/dashboard/territorios/command-center/TerritoryCommandCenter';

// ---------------------------------------------------------------------------
// 1. Confidence & Status Translation
// ---------------------------------------------------------------------------

export interface ConfidenceViewModel {
  label: string;
  level: 'ALTA' | 'MÉDIA' | 'BAIXA';
  description: string;
}

export function translateConfidence(confidence: ConfidenceClass | null): ConfidenceViewModel {
  switch (confidence) {
    case 'DIRECTLY_SUPPORTED':
      return {
        label: 'Evidência Direta',
        level: 'ALTA',
        description: 'Sustentado por indicadores primários das fontes oficiais.',
      };
    case 'MULTI_SIGNAL_SUPPORTED':
      return {
        label: 'Múltiplos Sinais',
        level: 'MÉDIA',
        description: 'Sustentado pelo cruzamento de múltiplos sinais independentes.',
      };
    case 'LIMITED_CONTEXT':
    default:
      return {
        label: 'Contexto Limitado',
        level: 'BAIXA',
        description: 'Sustentação parcial por indisponibilidade de contexto completo.',
      };
  }
}

// ---------------------------------------------------------------------------
// 2. Evidence Adapter (Preserva explicitamente id e evidenceHash)
// ---------------------------------------------------------------------------

export function toEvidenceDetail(evidence: Evidence): EvidenceDetail {
  return {
    id: evidence.id,
    evidenceHash: evidence.evidenceHash,
    label: evidence.indicator.replace(/_/g, ' ').toUpperCase(),
    value: evidence.value !== null ? String(evidence.value) : '—',
    unit: evidence.unit ?? undefined,
    period: evidence.period,
    source: evidence.source,
    dataset: evidence.dataset,
    domain: evidence.domain,
    description: evidence.metadata?.description ? String(evidence.metadata.description) : undefined,
  };
}

export function toEvidenceDetailList(
  refs: string[],
  evidenceIndex: Record<string, Evidence>
): EvidenceDetail[] {
  return refs
    .map((ref) => evidenceIndex[ref])
    .filter((ev): ev is Evidence => Boolean(ev))
    .map(toEvidenceDetail);
}

// ---------------------------------------------------------------------------
// 3. Coverage & Temporal Adapters
// ---------------------------------------------------------------------------

export function toDomainCoverageList(coverage: Coverage): DomainCoverage[] {
  const domainLabels: Record<string, string> = {
    demografia: 'Demografia',
    eleitoral: 'Eleitoral',
    seguranca: 'Segurança',
    saude: 'Saúde',
    economia: 'Economia',
  };

  const domainEngines: Record<string, string> = {
    demografia: 'Motor IBGE',
    eleitoral: 'Motor TSE',
    seguranca: 'Motor SEJUSP MG',
    saude: 'Motor CNES / DATASUS',
    economia: 'Motor SICONFI / CAGED',
  };

  return Object.entries(coverage.byDomain).map(([domain, status]) => {
    let uiStatus: DomainCoverage['status'] = 'DISPONIVEL';
    if (status === 'partial') uiStatus = 'PARCIAL';
    if (status === 'unavailable') uiStatus = 'INDISPONIVEL';

    return {
      domain: domainLabels[domain] ?? domain,
      status: uiStatus,
      engineName: domainEngines[domain] ?? `Motor ${domain}`,
    };
  });
}

export function toTemporalCoverageList(temporal: TemporalCoverage): TemporalDomainCoverage[] {
  const domainLabels: Record<string, string> = {
    demografia: 'Demografia',
    eleitoral: 'Eleitoral',
    seguranca: 'Segurança',
    saude: 'Saúde',
    economia: 'Economia',
  };

  const domainSources: Record<string, string> = {
    demografia: 'IBGE Censo / Estimativa',
    eleitoral: 'TSE Eleições',
    seguranca: 'SEJUSP MG Ocorrências',
    saude: 'DATASUS / CNES',
    economia: 'SICONFI DCA / CAGED',
  };

  return Object.entries(temporal.sourceReferencePeriods).map(([domain, refYear]) => ({
    domain: domainLabels[domain] ?? domain,
    referenceYear: refYear ?? 'Indisponível',
    source: domainSources[domain] ?? 'Fonte Oficial',
    lagNote: refYear && refYear < '2025' ? `Defasagem estatística de ${refYear}` : undefined,
  }));
}

// ---------------------------------------------------------------------------
// 4. Signal Composite Adapter (Signal + Interpretation + Implication)
// ---------------------------------------------------------------------------

export function toPoliticalSignalViewModel(
  signal: AnalyticalSignal,
  interpretations: Interpretation[] = [],
  implications: Implication[] = []
): PrioritizedSignal {
  let uiPriority: PrioritizedSignal['priority'] = 'MÉDIO';
  if (signal.priority === 'CRITICAL') uiPriority = 'CRÍTICO';
  if (signal.priority === 'HIGH') uiPriority = 'ALTO';
  if (signal.priority === 'LOW') uiPriority = 'BAIXO';

  let category: PrioritizedSignal['category'] = 'mudanca';
  if (signal.type === 'PRESSURE') category = 'atencao';
  if (signal.type === 'ANOMALY') category = 'risco';
  if (signal.type === 'TREND') category = 'tendencia';
  if (signal.type === 'CHANGE') category = 'mudanca';

  const relatedImplications = implications.filter((imp) =>
    interpretations.some(
      (interp) =>
        interp.basedOnSignals.includes(signal.id) &&
        imp.basedOnInterpretations.includes(interp.id)
    )
  );

  if (relatedImplications.some((imp) => imp.dimension === 'gestao' || imp.dimension === 'percepcao')) {
    category = 'atencao';
  }

  return {
    id: signal.id,
    category,
    priority: uiPriority,
    title: signal.title,
    description: signal.summary,
    domains: signal.domains.map((d) => d.toUpperCase()),
    evidenceText: `Período de Referência: ${signal.period} · ${signal.evidenceRefs.length} evidências primárias`,
    sourceNotebookHref: `/dashboard/territorios/${signal.territoryId}/${signal.domains[0] ?? 'inteligencia-politica'}`,
    sourceNotebookLabel: `Abrir Caderno ${signal.domains[0] ?? 'Inteligência'}`,
  };
}

// ---------------------------------------------------------------------------
// 5. Interpretation Adapter (L4)
// ---------------------------------------------------------------------------

export interface InterpretationViewModel {
  id: string;
  statement: string;
  domains: string[];
  confidence: ConfidenceViewModel;
  originLabel: string;
  modelProvenanceText?: string;
  basedOnSignalsCount: number;
  evidenceRefs: string[];
  caveats: string[];
}

export function toInterpretationViewModel(interp: Interpretation): InterpretationViewModel {
  const confidence = translateConfidence(interp.confidence);

  let originLabel = 'Regra Determinística';
  if (interp.origin === 'model') originLabel = 'Provedor IA';
  if (interp.origin === 'human') originLabel = 'Auditoria Especialista';
  if (interp.origin === 'hybrid') originLabel = 'Síntese Híbrida';

  let modelProvenanceText: string | undefined = undefined;
  if (interp.modelProvenance) {
    modelProvenanceText = `Provedor: ${interp.modelProvenance.provider} · Modelo: ${interp.modelProvenance.model} · Prompt: ${interp.modelProvenance.promptId}`;
  }

  return {
    id: interp.id,
    statement: interp.statement,
    domains: interp.domains.map((d) => d.toUpperCase()),
    confidence,
    originLabel,
    modelProvenanceText,
    basedOnSignalsCount: interp.basedOnSignals.length,
    evidenceRefs: interp.evidenceRefs,
    caveats: interp.caveats,
  };
}

export function toInterpretationViewModelList(
  interpretations: Interpretation[]
): InterpretationViewModel[] {
  return interpretations.map(toInterpretationViewModel);
}

// ---------------------------------------------------------------------------
// 6. CAGED Employment Dynamics Adapter
// ---------------------------------------------------------------------------

export interface CagedSectorItem {
  sector: string;
  admissions: number;
  dismissals: number;
  balance: number;
}

export interface CagedEmploymentViewModel {
  period: string;
  totalAdmissions: number;
  totalDismissals: number;
  totalBalance: number;
  sectors: CagedSectorItem[];
  pendingMetrics: Array<{ name: string; status: 'METHODOLOGY_PENDING' }>;
}

export function toCagedEmploymentViewModel(economyData: any): CagedEmploymentViewModel {
  // Extract or fallback cleanly without mock data
  const totalAdmissions = economyData?.cagedAdmissions ?? 0;
  const totalDismissals = economyData?.cagedDismissals ?? 0;
  const totalBalance = economyData?.cagedBalance ?? (totalAdmissions - totalDismissals);

  const defaultSectors: CagedSectorItem[] = [
    { sector: 'Agropecuária', admissions: 0, dismissals: 0, balance: 0 },
    { sector: 'Indústria', admissions: 0, dismissals: 0, balance: 0 },
    { sector: 'Construção', admissions: 0, dismissals: 0, balance: 0 },
    { sector: 'Comércio', admissions: 0, dismissals: 0, balance: 0 },
    { sector: 'Serviços', admissions: 0, dismissals: 0, balance: 0 },
  ];

  const sectors: CagedSectorItem[] = economyData?.cagedSectors
    ? economyData.cagedSectors
    : defaultSectors;

  return {
    period: economyData?.cagedPeriod ?? '2024 (Acumulado 12m)',
    totalAdmissions,
    totalDismissals,
    totalBalance,
    sectors,
    pendingMetrics: [
      { name: 'Estoque Formal de Empregos', status: 'METHODOLOGY_PENDING' },
      { name: 'Variação Relativa de Estoque', status: 'METHODOLOGY_PENDING' },
      { name: 'Salário Médio de Admissão', status: 'METHODOLOGY_PENDING' },
    ],
  };
}

// ---------------------------------------------------------------------------
// 7. Risk & Opportunity Adapters
// ---------------------------------------------------------------------------

export function extractRisksAndOpportunities(
  implications: Implication[]
): { risks: RiskItem[]; opportunities: OpportunityItem[] } {
  const risks: RiskItem[] = [];
  const opportunities: OpportunityItem[] = [];

  implications.forEach((imp, idx) => {
    if (imp.dimension === 'gestao' || imp.dimension === 'percepcao' || imp.dimension === 'politica_publica') {
      risks.push({
        id: imp.id || `risk-${idx}`,
        title: `Ponto de Atenção em ${imp.dimension.replace(/_/g, ' ').toUpperCase()}`,
        detail: imp.statement,
        domain: imp.dimension,
        priority: imp.confidence === 'DIRECTLY_SUPPORTED' ? 'CRÍTICO' : 'ALTO',
      });
    } else {
      opportunities.push({
        id: imp.id || `opp-${idx}`,
        title: `Oportunidade Estratégica em ${imp.dimension.replace(/_/g, ' ').toUpperCase()}`,
        detail: imp.statement,
        domain: imp.dimension,
        priority: imp.confidence === 'DIRECTLY_SUPPORTED' ? 'ALTO' : 'MÉDIO',
      });
    }
  });

  return { risks, opportunities };
}

// ---------------------------------------------------------------------------
// 8. Territorial Agenda Adapter
// ---------------------------------------------------------------------------

export function toTerritoryAgendaUIList(agendaItems: CanonicalAgendaItem[]): TerritoryAgendaItemUI[] {
  return agendaItems.map((item, idx) => ({
    type: idx % 2 === 0 ? 'pauta_prioritaria' : 'pergunta_chave',
    title: item.title,
    detail: item.rationale,
    sourceDomain: 'Inteligência Territorial',
  }));
}

// ---------------------------------------------------------------------------
// 9. Full Briefing -> Command Center ViewModel Adapter
// ---------------------------------------------------------------------------

export function toCommandCenterViewModel(
  briefing: TerritorialPoliticalIntelligenceBriefing,
  cityName: string = 'Território',
  uf: string = 'MG'
): TerritoryCommandCenterViewModel {
  const evidences: EvidenceDetail[] = Object.values(briefing.evidenceIndex).map(toEvidenceDetail);

  const signals: PrioritizedSignal[] = briefing.signals.map((sig) =>
    toPoliticalSignalViewModel(sig, briefing.interpretations, briefing.implications)
  );

  const { risks, opportunities } = extractRisksAndOpportunities(briefing.implications);

  const agendaItems = toTerritoryAgendaUIList(briefing.agenda);
  const domains = toDomainCoverageList(briefing.coverage);

  let statusType: TerritoryCommandCenterViewModel['statusType'] = 'CONCLUIDO';
  let statusLabel = 'Dossiê Consolidado';

  if (briefing.freshnessStatus === 'stale') {
    statusType = 'STALE';
    statusLabel = 'Análise Desatualizada';
  } else if (briefing.freshnessStatus === 'partial') {
    statusType = 'PARCIAL';
    statusLabel = 'Análise Parcial';
  } else if (briefing.coverage.domainsAvailable < briefing.coverage.domainsExpected) {
    statusType = 'PARCIAL';
    statusLabel = 'Leitura Parcial de Domínios';
  }

  const keyFinding =
    briefing.executiveSummary.headline ||
    briefing.interpretations[0]?.statement ||
    'Análise consolidada a partir dos dados das fontes oficiais.';

  return {
    cityName,
    uf,
    ibge: briefing.territoryId,
    statusLabel,
    statusType,
    lastUpdated: briefing.generatedAt,
    headline: briefing.executiveSummary.headline || `Análise Territorial: ${cityName} / ${uf}`,
    situationSummaryText:
      briefing.executiveSummary.summary.join(' ') ||
      'Leitura territorial gerada com base nos indicadores oficiais disponíveis.',
    keyFinding,
    signals,
    risks,
    opportunities,
    agendaItems,
    domains,
    evidences,
  };
}
