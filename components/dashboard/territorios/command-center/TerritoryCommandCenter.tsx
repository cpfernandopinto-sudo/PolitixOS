'use client';

import React, { useState } from 'react';
import ExecutiveTerritoryHeader from './ExecutiveTerritoryHeader';
import TerritorySituationSummary from './TerritorySituationSummary';
import CommandCenterKpiStrip, { ExecutiveKpiItem } from './CommandCenterKpiStrip';
import PrioritySignalsSection from './PrioritySignalsSection';
import RiskOpportunitySummary, { RiskItem, OpportunityItem } from './RiskOpportunitySummary';
import TerritoryAgendaSummary from './TerritoryAgendaSummary';
import TerritoryNotebookNavigator from './TerritoryNotebookNavigator';
import AnalysisStatusSummary from './AnalysisStatusSummary';
import EvidencePanel, { EvidenceDetail } from '../intelligence/EvidencePanel';
import { PrioritizedSignal } from '../intelligence/PoliticalSignalStack';
import { DomainCoverage } from '../intelligence/AnalysisCoveragePanel';
import { TerritoryAgendaItem } from '../intelligence/TerritoryAgendaPanel';

export interface TerritoryCommandCenterViewModel {
  cityName: string;
  uf: string;
  regionName?: string;
  ibge: string;
  statusLabel?: string;
  statusType?: 'CONCLUIDO' | 'PARCIAL' | 'PROCESSANDO' | 'COLETA_NECESSARIA' | 'STALE' | 'ERRO';
  lastUpdated?: string;
  headline: string;
  situationSummaryText: string;
  keyFinding?: string;
  kpiStrip?: ExecutiveKpiItem[];
  signals: PrioritizedSignal[];
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  agendaItems: TerritoryAgendaItem[];
  domains: DomainCoverage[];
  evidences?: EvidenceDetail[];
}

export interface TerritoryCommandCenterProps {
  viewModel: TerritoryCommandCenterViewModel;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function TerritoryCommandCenter({
  viewModel,
  onRefresh,
  isRefreshing,
}: TerritoryCommandCenterProps) {
  const [selectedSignal, setSelectedSignal] = useState<PrioritizedSignal | null>(null);

  const availableDomainsCount = viewModel.domains.filter((d) => d.status === 'DISPONIVEL').length;
  const coverageText = `${availableDomainsCount} de ${viewModel.domains.length} Domínios`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in pb-12">
      {/* 1. Territory Executive Header */}
      <ExecutiveTerritoryHeader
        cityName={viewModel.cityName}
        uf={viewModel.uf}
        regionName={viewModel.regionName}
        statusLabel={viewModel.statusLabel}
        statusType={viewModel.statusType}
        lastUpdated={viewModel.lastUpdated}
        coverageText={coverageText}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Situation Summary (30-Second Executive Reading) */}
      <TerritorySituationSummary
        headline={viewModel.headline}
        summaryText={viewModel.situationSummaryText}
        keyFinding={viewModel.keyFinding}
        statusText={viewModel.statusLabel}
      />

      {/* 3. Executive Real KPI Strip (Multi-Engine Mini Sparklines & Deltas) */}
      {viewModel.kpiStrip && viewModel.kpiStrip.length > 0 && (
        <CommandCenterKpiStrip kpis={viewModel.kpiStrip} />
      )}

      {/* 4. Engine Coverage Summary Bar */}
      <AnalysisStatusSummary domains={viewModel.domains} />

      {/* 5. Priority Signals */}
      {viewModel.signals.length > 0 && (
        <PrioritySignalsSection
          signals={viewModel.signals}
          ibge={viewModel.ibge}
          onOpenEvidence={(sig) => setSelectedSignal(sig)}
        />
      )}

      {/* 6. Risks vs Opportunities */}
      <RiskOpportunitySummary risks={viewModel.risks} opportunities={viewModel.opportunities} />

      {/* 7. Territory Agenda Summary */}
      {viewModel.agendaItems.length > 0 && (
        <TerritoryAgendaSummary
          municipioName={viewModel.cityName}
          ibge={viewModel.ibge}
          items={viewModel.agendaItems}
        />
      )}

      {/* 8. Thematic Notebooks Navigator */}
      <TerritoryNotebookNavigator ibge={viewModel.ibge} />

      {/* Evidence Trace Drawer Modal */}
      <EvidencePanel
        isOpen={selectedSignal !== null}
        onClose={() => setSelectedSignal(null)}
        title={selectedSignal?.title ?? 'Evidências do Sinal'}
        evidences={viewModel.evidences ?? []}
      />
    </div>
  );
}
