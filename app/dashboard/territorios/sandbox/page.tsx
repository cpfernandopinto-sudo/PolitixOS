'use client';

import React, { useState } from 'react';
import { Compass, Building2, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import MetricCard from '@/components/dashboard/territorios/analytical/MetricCard';
import TimeSeriesPanel from '@/components/dashboard/territorios/analytical/TimeSeriesPanel';
import CompositionPanel from '@/components/dashboard/territorios/analytical/CompositionPanel';
import ComparisonPanel from '@/components/dashboard/territorios/analytical/ComparisonPanel';
import AnalyticalTable from '@/components/dashboard/territorios/analytical/AnalyticalTable';
import SourceMetadataPanel from '@/components/dashboard/territorios/analytical/SourceMetadataPanel';
import DefasagemStatusBadge from '@/components/dashboard/territorios/analytical/DefasagemStatusBadge';
import SignalCard from '@/components/dashboard/territorios/analytical/SignalCard';
import AIInsightPanel from '@/components/dashboard/territorios/analytical/AIInsightPanel';
import CrossDomainPanel from '@/components/dashboard/territorios/analytical/CrossDomainPanel';
import TrendIndicator from '@/components/dashboard/territorios/analytical/TrendIndicator';
import RankingPositionPanel from '@/components/dashboard/territorios/analytical/RankingPositionPanel';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import AnalyticalSkeleton from '@/components/dashboard/territorios/analytical/AnalyticalSkeleton';
import CagedEmploymentSection from '@/components/dashboard/territorios/analytical/CagedEmploymentSection';
import PoliticalIntelligenceSummary from '@/components/dashboard/territorios/intelligence/PoliticalIntelligenceSummary';
import PoliticalSignalStack, { PrioritizedSignal } from '@/components/dashboard/territorios/intelligence/PoliticalSignalStack';
import EvidencePanel from '@/components/dashboard/territorios/intelligence/EvidencePanel';
import AnalysisCoveragePanel from '@/components/dashboard/territorios/intelligence/AnalysisCoveragePanel';
import TemporalCoveragePanel from '@/components/dashboard/territorios/intelligence/TemporalCoveragePanel';
import StrategicRecommendationCard from '@/components/dashboard/territorios/intelligence/StrategicRecommendationCard';
import TerritoryAgendaPanel from '@/components/dashboard/territorios/intelligence/TerritoryAgendaPanel';
import IntelligenceExplicabilityPanel from '@/components/dashboard/territorios/intelligence/IntelligenceExplicabilityPanel';
import InterpretationCard from '@/components/dashboard/territorios/intelligence/InterpretationCard';
import TerritoryCommandCenter, { TerritoryCommandCenterViewModel } from '@/components/dashboard/territorios/command-center/TerritoryCommandCenter';
import {
  DEV_SANDBOX_METRICS,
  DEV_SANDBOX_TIME_SERIES,
  DEV_SANDBOX_COMPOSITION,
  DEV_SANDBOX_COMPARISON,
  DEV_SANDBOX_SIGNALS,
  DEV_INTELLIGENCE_SCENARIOS,
} from '@/lib/territorios/fixtures/sandbox-fixtures';
import {
  pocEvidence,
  pocSignal,
  pocInterpretation,
  pocImplication,
  pocRecommendation,
  pocEvidenceIndex,
  POC_TERRITORY_ID,
} from '@/lib/territorios/intelligence/poc-fixture';
import {
  toCommandCenterViewModel,
  toInterpretationViewModel,
  toCagedEmploymentViewModel,
} from '@/lib/territorios/intelligence/frontend-adapters';
import type { TerritorialPoliticalIntelligenceBriefing } from '@/lib/territorios/intelligence/contracts';

export default function AnalyticalSandboxPage() {
  const [activeTab, setActiveTab] = useState<'command_center' | 'intel01_poc' | 'intelligence' | 'library'>('command_center');
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<keyof typeof DEV_INTELLIGENCE_SCENARIOS>('scenarioA');
  const [selectedSignal, setSelectedSignal] = useState<PrioritizedSignal | null>(null);
  const [zeroInterpretationDemo, setZeroInterpretationDemo] = useState(false);

  const scenario = DEV_INTELLIGENCE_SCENARIOS[selectedScenarioKey];

  // Construct Command Center ViewModel for Active Scenario
  const commandCenterViewModel: TerritoryCommandCenterViewModel = {
    cityName: scenario.territoryName,
    uf: 'MG',
    ibge: '3100000',
    regionName: 'Região Metropolitana Demonstrativa',
    statusLabel: scenario.coverageRatio === '5 de 5 domínios' ? 'Dossiê Consolidado' : 'Leitura Parcial',
    statusType: scenario.coverageRatio === '5 de 5 domínios' ? 'CONCLUIDO' : 'PARCIAL',
    lastUpdated: '2026-08-16T12:00:00Z',
    headline: scenario.headline,
    situationSummaryText: scenario.summaryParagraphs.join(' '),
    keyFinding: 'Leitura intersetorial gerada para validação de experiência executiva.',
    signals: scenario.signals,
    risks: [
      {
        id: 'r-dev',
        title: 'Pontos de Pressão em Serviços Públicos',
        detail: 'Capacidade operacional em monitoramento continuo.',
        domain: 'Saúde',
        priority: 'ALTO',
      },
    ],
    opportunities: [
      {
        id: 'o-dev',
        title: 'Atração de Novos Centros Logísticos',
        detail: 'Crescimento continuado das vagas formais de emprego.',
        domain: 'Economia',
        priority: 'ALTO',
      },
    ],
    agendaItems: [
      {
        type: 'pauta_prioritaria',
        title: 'Pauta de Infraestrutura de Saúde e Transporte',
        detail: 'Assunto estratégico recomendado para visita institucional.',
        sourceDomain: 'Economia + Saúde',
      },
    ],
    domains: scenario.domains,
    evidences: [
      {
        id: 'ev-demo-1',
        evidenceHash: 'demo-hash-12345',
        label: 'Métrica Demonstrativa DEV',
        value: '100%',
        unit: '%',
        period: '2024',
        source: 'Fonte DEV',
        domain: 'Geral',
      },
    ],
  };

  // Construct Canonical INTEL-01 Briefing & Adapted ViewModel
  const canonicalPocBriefing: TerritorialPoliticalIntelligenceBriefing = {
    schemaVersion: '1.0',
    id: 'briefing-poc-intel01',
    territoryId: POC_TERRITORY_ID,
    generatedAt: '2026-08-16T12:00:00Z',
    referenceDate: '2025-12-31',
    coverage: {
      byDomain: {
        demografia: 'available',
        eleitoral: 'available',
        seguranca: 'available',
        saude: 'available',
        economia: 'available',
      },
      domainsAvailable: 5,
      domainsExpected: 5,
      missingData: [],
    },
    temporalCoverage: {
      periodStart: '2024',
      periodEnd: '2025',
      referencePeriodLabel: '2024-2025',
      sourceReferencePeriods: {
        demografia: '2025',
        eleitoral: '2024',
        seguranca: '2025',
        saude: '2024',
        economia: '2025',
      },
    },
    freshnessStatus: 'fresh',
    executiveSummary: {
      headline: 'Síntese Executiva do Contrato Canônico INTEL-01',
      summary: [
        'Análise da razão de dependência de transferências correntes em relação à receita corrente bruta.',
        'Constatação determinística de dependência fiscal com rastreabilidade às fontes do SICONFI.',
      ],
      keySignals: [pocSignal.id],
      risks: [pocImplication.id],
      opportunities: [],
      attentionPoints: [],
      coverage: {
        byDomain: {
          demografia: 'available',
          eleitoral: 'available',
          seguranca: 'available',
          saude: 'available',
          economia: 'available',
        },
        domainsAvailable: 5,
        domainsExpected: 5,
        missingData: [],
      },
      limitations: [],
    },
    signals: [pocSignal],
    crossDomainSignals: [],
    interpretations: [pocInterpretation],
    implications: [pocImplication],
    recommendations: [pocRecommendation],
    agenda: [
      {
        id: 'agenda-poc',
        title: 'Análise de Composição das Transferências',
        rationale: 'Aprofundamento da origem das transferências correntes antes da definição da pauta.',
        basedOnRecommendations: [pocRecommendation.id],
        basedOnImplications: [pocImplication.id],
      },
    ],
    limitations: [
      { code: 'NOMINAL_VALUE', description: 'Valores nominais de 2025 sem deflator de inflação.' },
    ],
    evidenceIndex: pocEvidenceIndex,
    methodology: {
      methodId: 'ratio-transferencias-receita-corrente',
      methodVersion: 'v1',
      description: 'Cálculo determinístico L2 e ilação fiscal rastreável L3->L6',
    },
    explainability: {
      evidenceRefs: [pocEvidence[0].id, pocEvidence[1].id],
      sourceRefs: ['Tesouro/SICONFI'],
      methodology: 'INTEL-01 Canonical Lineage',
      coverage: {
        byDomain: {
          demografia: 'available',
          eleitoral: 'available',
          seguranca: 'available',
          saude: 'available',
          economia: 'available',
        },
        domainsAvailable: 5,
        domainsExpected: 5,
        missingData: [],
      },
      limitations: [],
    },
    reviewStatus: 'not_reviewed',
    guardrails: { mode: 'FAIL_CLOSED', assertionClassesUsed: ['FACT', 'SIGNAL', 'INTERPRETATION', 'IMPLICATION', 'RECOMMENDATION'] },
  };

  const intel01ViewModel = toCommandCenterViewModel(canonicalPocBriefing, 'MUNICÍPIO DEMONSTRATIVO (INTEL-01)', 'MG');
  const interpretationViewModel = toInterpretationViewModel(pocInterpretation);

  const cagedDevData = toCagedEmploymentViewModel({
    cagedAdmissions: 14250,
    cagedDismissals: 11830,
    cagedBalance: 2420,
    cagedPeriod: '2024 (Acumulado 12m)',
    cagedSectors: [
      { sector: 'Agropecuária', admissions: 420, dismissals: 310, balance: 110 },
      { sector: 'Indústria', admissions: 4850, dismissals: 3920, balance: 930 },
      { sector: 'Construção', admissions: 2100, dismissals: 1850, balance: 250 },
      { sector: 'Comércio', admissions: 3400, dismissals: 2950, balance: 450 },
      { sector: 'Serviços', admissions: 3480, dismissals: 2800, balance: 680 },
    ],
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-fade-in max-w-[1400px] mx-auto">
      {/* DEV Preview Warning Banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5">
            <Compass size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                DEMO / DEV VISUAL PREVIEW
              </span>
              <span className="text-xs text-slate-400 font-mono">FRONT-02.5 · FRONT-02.6 · FRONT-02.7 · FRONT-03 · FRONT-04</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight mt-1">
              Politix Territórios — Paridade Funcional & Sandbox Visual
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-0.5">
              Ambiente de desenvolvimento para validação visual das Interpretações L4, Dinâmica do Emprego CAGED (5 Setores) e Estado de Zero Interpretations.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0B0F19] p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('command_center')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
              activeTab === 'command_center' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Command Center (Visão 30s)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('intel01_poc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
              activeTab === 'intel01_poc' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Contrato Canônico INTEL-01
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('intelligence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
              activeTab === 'intelligence' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Inteligência Política (10 Cenários)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
              activeTab === 'library' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Biblioteca Analítica & CAGED
          </button>
        </div>
      </div>

      {activeTab === 'command_center' ? (
        <div className="space-y-6">
          {/* Scenario Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Selecione o Cenário DEV para o Command Center (A a J):
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(DEV_INTELLIGENCE_SCENARIOS).map((key) => {
                const scKey = key as keyof typeof DEV_INTELLIGENCE_SCENARIOS;
                const sc = DEV_INTELLIGENCE_SCENARIOS[scKey];
                const isSelected = selectedScenarioKey === scKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedScenarioKey(scKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg'
                        : 'bg-[#111726] text-slate-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {sc.title.split('—')[0]?.trim()}
                  </button>
                );
              })}
            </div>
          </div>

          <TerritoryCommandCenter viewModel={commandCenterViewModel} />
        </div>
      ) : activeTab === 'intel01_poc' ? (
        /* FRONT-03 / FRONT-04 Canonical INTEL-01 Integration Sandbox */
        <div className="space-y-8">
          <div className="p-4 bg-[#111726] border border-cyan-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Ponte L0-L6: Canonical Domain Contract &rarr; Frontend Adapter &rarr; ViewModel &rarr; UI
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck size={14} />
                Lineage 100% Rastreável
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Demonstração do POC Canônico INTEL-01 no Command Center
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Exibição dos dados adaptados do <code>poc-fixture.ts</code> (Evidence L1, Signal L3, Interpretation L4, Implication L5, Recommendation L6) através do <code>frontend-adapters.ts</code> sem alteração do contrato canônico.
            </p>
          </div>

          {/* Demonstration of L4 Interpretation Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
                Demostrativo da Camada de Interpretação (L4)
              </h3>
              <button
                type="button"
                onClick={() => setZeroInterpretationDemo(!zeroInterpretationDemo)}
                className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/20"
              >
                {zeroInterpretationDemo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                <span>{zeroInterpretationDemo ? 'Modo: Zero Interpretations (Ativado)' : 'Modo: Com Interpretação L4'}</span>
              </button>
            </div>

            <InterpretationCard
              interpretation={zeroInterpretationDemo ? undefined : interpretationViewModel}
              onOpenEvidence={() => setSelectedSignal(intel01ViewModel.signals[0] ?? null)}
            />
          </div>

          {/* Render Command Center with Adapted INTEL-01 ViewModel */}
          <TerritoryCommandCenter viewModel={intel01ViewModel} />
        </div>
      ) : activeTab === 'intelligence' ? (
        <div className="space-y-8">
          {/* Scenario Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Selecione o Cenário DEV de Inteligência Política (A a J):
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(DEV_INTELLIGENCE_SCENARIOS).map((key) => {
                const scKey = key as keyof typeof DEV_INTELLIGENCE_SCENARIOS;
                const sc = DEV_INTELLIGENCE_SCENARIOS[scKey];
                const isSelected = selectedScenarioKey === scKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedScenarioKey(scKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg'
                        : 'bg-[#111726] text-slate-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {sc.title.split('—')[0]?.trim()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Scenario Title */}
          <div className="p-4 bg-[#111726] border border-white/5 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">
                {scenario.title}
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {scenario.territoryName}
              </h2>
            </div>

            <span className="text-xs font-mono text-slate-400 bg-white/5 px-3 py-1 rounded border border-white/10">
              {scenario.coverageRatio}
            </span>
          </div>

          <PoliticalIntelligenceSummary
            headline={scenario.headline}
            summaryParagraphs={scenario.summaryParagraphs}
            coverageRatio={scenario.coverageRatio}
            confidenceLevel={scenario.confidenceLevel}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalysisCoveragePanel domains={scenario.domains} />
            <TemporalCoveragePanel
              temporalDomains={[
                { domain: 'Demografia', referenceYear: '2022', source: 'IBGE' },
                { domain: 'Eleitoral', referenceYear: '2024', source: 'TSE' },
                { domain: 'Segurança', referenceYear: '2026', source: 'SEJUSP MG' },
                { domain: 'Saúde', referenceYear: '2024', source: 'DATASUS' },
                { domain: 'Economia', referenceYear: '2023', source: 'IBGE Contas Regionais', lagNote: 'Defasagem estatística' },
              ]}
            />
          </div>

          {scenario.signals.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono border-b border-white/10 pb-2">
                Sinais Prioritários do Cenário
              </h3>
              <PoliticalSignalStack
                signals={scenario.signals}
                onOpenEvidence={(sig) => setSelectedSignal(sig)}
              />
            </div>
          ) : (
            <AnalyticalEmptyState reason="dados_parciais" title="Evidências Primárias Insuficientes" description="Este cenário demonstra o comportamento gracioso da interface quando não há evidências suficientes para inferência." />
          )}

          {/* L4 Interpretation Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono border-b border-white/10 pb-2">
              Leitura Analítica Qualitativa (L4)
            </h3>
            <InterpretationCard
              interpretation={interpretationViewModel}
              onOpenEvidence={() => setSelectedSignal(scenario.signals[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StrategicRecommendationCard
              recommendation={{
                id: 'rec-dev',
                title: 'Reestruturação Territorial e Alinhamento Estratégico',
                action: 'Definir prioridade de investimento nos vetores de maior impacto social.',
                rationale: 'Sinais analíticos indicam janela de oportunidade nos próximos 12 meses.',
                priority: 'ALTO',
                domains: ['Economia', 'Saúde'],
                caveat: 'Recomendação demonstrativa isolada para ambiente de sandbox DEV.',
              }}
              onOpenEvidence={() => setSelectedSignal(scenario.signals[0] ?? null)}
            />

            <TerritoryAgendaPanel
              municipioName={scenario.territoryName}
              items={[
                {
                  type: 'pauta_prioritaria',
                  title: 'Alinhamento com Lideranças Regionais',
                  detail: 'Pauta prioritária de desenvolvimento econômico sustentável.',
                  sourceDomain: 'Economia',
                },
                {
                  type: 'pergunta_chave',
                  title: 'Capacidade Assistencial da Rede Básica',
                  detail: 'Qual a previsão de ampliação do atendimento em horários de pico?',
                  sourceDomain: 'Saúde',
                },
              ]}
            />
          </div>

          <IntelligenceExplicabilityPanel
            sourcesCount={5}
            evidenceCount={8}
            coverageRatio={scenario.coverageRatio}
          />
        </div>
      ) : (
        /* FRONT-02.5 / FRONT-04 Library Sandbox & CAGED 5 Sectors */
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              1. Subseção Executiva CAGED — 5 Setores & Métricas Pendentes (FRONT-04)
            </h2>
            <CagedEmploymentSection cagedData={cagedDevData} />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              2. Componentes de Métrica, Tendência & Defasagem
            </h2>

            <div className="flex flex-wrap items-center gap-3 bg-[#0B0F19] p-3 rounded-xl border border-white/5">
              <DefasagemStatusBadge type="atual" referenceYear="2024" />
              <DefasagemStatusBadge type="defasado_oficial" referenceYear="2023" collectionYear="2026" />
              <DefasagemStatusBadge type="serie_historica" referenceYear="2019-2024" />
              <DefasagemStatusBadge type="parcial" />
              <DefasagemStatusBadge type="indisponivel" />
              <TrendIndicator direction="up" value="+3,2%" label="2024" />
              <TrendIndicator direction="down" value="-4,5%" label="2024" />
              <TrendIndicator direction="stable" value="0,0%" />
              <TrendIndicator direction="unknown" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DEV_SANDBOX_METRICS.map((m, idx) => (
                <MetricCard key={idx} {...m} icon={Building2} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              3. Séries Temporais & Composição Setorial
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TimeSeriesPanel
                title="Evolução do PIB e Empregos Formais"
                subtitle="Série histórica consolidada"
                data={DEV_SANDBOX_TIME_SERIES}
                xAxisKey="period"
                series={[
                  { key: 'pib', name: 'PIB (Bi R$)', color: '#22d3ee' },
                  { key: 'empregos', name: 'Empregos (mil)', color: '#f59e0b' },
                ]}
                source="IBGE / SICONFI / CAGED"
                period="2020-2024"
              />

              <CompositionPanel
                title="Composição do Valor Adicionado por Setor"
                subtitle="Distribuição percentual da matriz produtiva"
                items={DEV_SANDBOX_COMPOSITION}
                unit="mi R$"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              4. Comparativo de Benchmarks & Posição Relativa
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ComparisonPanel
                  title="Comparativo de Benchmarks Territoriais"
                  subtitle="Indicadores municipais vs médias regionais e estaduais"
                  rows={DEV_SANDBOX_COMPARISON}
                  municipioName="Município Exemplo"
                />
              </div>

              <div className="space-y-4">
                <RankingPositionPanel
                  title="Posição no PIB Estadual"
                  position={3}
                  totalItems={853}
                  cohortName="Minas Gerais"
                  indicatorValue="34,5 Bi"
                  unit="R$"
                  contextNote="3º maior PIB do estado de Minas Gerais."
                />
                <RankingPositionPanel
                  title="Índice de Segurança Metropolitana"
                  position={2}
                  totalItems={34}
                  cohortName="RMBH"
                  indicatorValue="199,4"
                  unit="crimes/100k"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              5. Tabela Analítica Compacta & Transparência da Fonte
            </h2>

            <AnalyticalTable
              title="Principais Ocorrências por Categoria"
              subtitle="Tabela ordenável de indicadores de segurança"
              columns={[
                { key: 'natureza', header: 'Natureza da Ocorrência', sortable: true },
                { key: 'total', header: 'Total Ocorrências', sortable: true, align: 'right' },
                { key: 'variacao', header: 'Variação %', sortable: true, align: 'right' },
              ]}
              data={[
                { natureza: 'Roubos Comerciais', total: 420, variacao: '-5.2%' },
                { natureza: 'Furtos de Veículos', total: 680, variacao: '+1.8%' },
                { natureza: 'Crimes Violentos', total: 1240, variacao: '-3.5%' },
              ]}
              source="SEJUSP-MG"
              period="2024"
            />

            <SourceMetadataPanel
              source="SEJUSP MG / IBGE / SICONFI"
              dataset="Sistema de Informações de Segurança e Contas Regionais"
              period="2023-2024"
              lastUpdated="2026-08-16T10:00:00Z"
              unit="Ocorrências / Reais / Percentual"
              methodology="Consolidação mensal com dados primários apurados das fontes oficiais."
              notes="PIB de 2023 é a versão oficial mais recente disponibilizada pelo IBGE."
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              6. Sinais Analíticos, Síntese IA & Cruzamento de Cadernos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEV_SANDBOX_SIGNALS.map((sig, idx) => (
                <SignalCard key={idx} {...sig} />
              ))}
            </div>

            <CrossDomainPanel
              title="Cruzamento Intersetorial: Economia x Saúde x Eleições"
              domains={['Economia', 'Saúde', 'Eleitoral']}
              description="O crescimento do polo industrial gerou fluxo populacional para a zona norte, elevando a pressão sobre as UPAs centrais e tornando o tema de infraestrutura o assunto prioritário do eleitorado."
              finding="Forte aceleração do setor logístico."
              impact="Pauta prioritária para a agenda política local."
            />

            <AIInsightPanel
              title="Síntese Executiva de Leitura Territorial"
              paragraphs={[
                'O município apresenta sólida estrutura econômica sustentada pelo setor industrial e de serviços, com saldos positivos de emprego.',
                'Entretanto, a defasagem nos leitos de atenção especializada e a retenção de investimentos viários constituem gargalos estratégicos a serem abordados na agenda oficial.',
              ]}
              evidences={[
                { dataset: 'Censo 2022', source: 'IBGE', period: '2022' },
                { dataset: 'Ocorrências SEJUSP', source: 'SEJUSP MG', period: '2024' },
              ]}
              sources={['IBGE', 'SEJUSP MG', 'DATASUS', 'CAGED']}
              analyzedAt="2026-08-16T11:00:00Z"
              phase="Consolidada"
              typeBadge="Síntese IA"
              confidenceLevel="ALTA"
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">
              7. Estados de Dados (Empty States & Skeletons)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnalyticalEmptyState reason="nao_coletado" engineName="Motor IBGE" />
              <AnalyticalEmptyState reason="em_processamento" engineName="Motor Economia" />
              <AnalyticalEmptyState reason="fonte_indisponivel" engineName="Motor Saúde" />
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Skeleton Loaders:</h3>
              <AnalyticalSkeleton type="card" count={3} />
              <AnalyticalSkeleton type="chart" height={180} />
            </div>
          </section>
        </div>
      )}

      {/* Evidence Drawer Modal for Sandbox */}
      <EvidencePanel
        isOpen={selectedSignal !== null}
        onClose={() => setSelectedSignal(null)}
        title={selectedSignal?.title ?? 'Evidências do Sinal'}
        evidences={[
          {
            id: 'ev-sandbox-modal-1',
            evidenceHash: 'hash-demo-999',
            label: 'Evidência Demonstrativa DEV',
            value: '8,4%',
            unit: '%',
            period: '2024',
            source: 'Fonte Oficial DEV',
            dataset: 'Dataset Demonstrativo',
            domain: 'Economia',
            description: 'Métrica primária isolada de teste para ambiente de sandbox DEV.',
          },
        ]}
      />
    </div>
  );
}
