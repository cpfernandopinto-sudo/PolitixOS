'use client';

import React, { useState } from 'react';
import { use } from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { getTerritoryDossierContext } from '@/lib/territorios/dossier-helpers';
import PoliticalIntelligenceSummary from '@/components/dashboard/territorios/intelligence/PoliticalIntelligenceSummary';
import PoliticalSignalStack, { PrioritizedSignal } from '@/components/dashboard/territorios/intelligence/PoliticalSignalStack';
import EvidencePanel, { EvidenceDetail } from '@/components/dashboard/territorios/intelligence/EvidencePanel';
import AnalysisCoveragePanel from '@/components/dashboard/territorios/intelligence/AnalysisCoveragePanel';
import TemporalCoveragePanel from '@/components/dashboard/territorios/intelligence/TemporalCoveragePanel';
import StrategicRecommendationCard from '@/components/dashboard/territorios/intelligence/StrategicRecommendationCard';
import TerritoryAgendaPanel from '@/components/dashboard/territorios/intelligence/TerritoryAgendaPanel';
import ExecutiveBriefing from '@/components/dashboard/territorios/intelligence/ExecutiveBriefing';
import IntelligenceExplicabilityPanel from '@/components/dashboard/territorios/intelligence/IntelligenceExplicabilityPanel';
import CrossDomainPanel from '@/components/dashboard/territorios/analytical/CrossDomainPanel';
import InterpretationCard from '@/components/dashboard/territorios/intelligence/InterpretationCard';
import {
  pocEvidence,
  pocSignal,
  pocInterpretation,
  pocImplication,
  pocRecommendation,
} from '@/lib/territorios/intelligence/poc-fixture';
import {
  toEvidenceDetail,
  toPoliticalSignalViewModel,
  toInterpretationViewModel,
} from '@/lib/territorios/intelligence/frontend-adapters';

export default function InteligenciaPoliticaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = use(params);
  const dossier = getTerritoryDossierContext(ibge);
  // Achado RELEASE-GATE-TERRITORIOS-1.0 (P0): esta página renderizava o pocEvidence/pocSignal/
  // pocInterpretation/pocRecommendation (fixture explicitamente documentada como "SEM município
  // real") de forma incondicional, para qualquer ibge — sem gate, sem selo de transparência.
  // Corrigido para o mesmo padrão já usado em economia/demografia/segurança/briefing/inteligencia-ia:
  // conteúdo demonstrativo só aparece para o município-fixture (Contagem), com selo visível;
  // qualquer outro município recebe o estado honesto de "ainda não coletado".
  const isDemo = ibge === '3118601';

  const [selectedSignal, setSelectedSignal] = useState<PrioritizedSignal | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);

  if (!isDemo) {
    return (
      <DossierNotebookContainer
        title="Inteligência Política: Síntese e Apoio à Decisão"
        description="Síntese intersetorial, rastreabilidade de evidências, leitura de sinais prioritários e pautas para atuação no território."
        engineName="Motor Inteligência Política / Claude"
        status="SEM_DADOS"
        sourceName="Arquitetura Multi-Motor PolitixOS (INTEL-01 L0-L6)"
      >
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Inteligência Política"
          title="Síntese de Inteligência Política Ainda Não Disponível"
          description="A síntese intersetorial (L4-L6) para este município ainda não foi gerada pelos motores territoriais."
        />
      </DossierNotebookContainer>
    );
  }

  const cityName = dossier?.cityName ?? 'Município';
  const uf = dossier?.uf ?? 'MG';
  const hasBriefingData = dossier?.aiRecommendation !== undefined && dossier?.aiRecommendation !== null;

  // Use adapted POC Evidence Details for Traceability Modal
  const sampleEvidences: EvidenceDetail[] = pocEvidence.map(toEvidenceDetail);

  // Domain Coverage Status
  const domainCoverages = [
    { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
    { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
    { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP MG' },
    { domain: 'Saúde', status: 'PARCIAL' as const, engineName: 'Motor DATASUS / CNES' },
    { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI / IBGE' },
  ];

  // Temporal Coverage Matrix
  const temporalInfo = [
    { domain: 'Demografia', referenceYear: '2022-2024', source: 'Censo / IBGE' },
    { domain: 'Eleitoral', referenceYear: '2024', source: 'TSE Result' },
    { domain: 'Segurança', referenceYear: '2024 (12m)', source: 'SEJUSP MG' },
    { domain: 'Saúde', referenceYear: '2024', source: 'DATASUS' },
    { domain: 'Economia', referenceYear: '2025', source: 'SICONFI DCA', lagNote: 'Exercício mais recente' },
  ];

  // Signals List: Canonical Signal Adapted + Contextual Signal
  const prioritizedSignals: PrioritizedSignal[] = [
    toPoliticalSignalViewModel(pocSignal, [pocInterpretation], [pocImplication]),
    {
      id: 'sig-2',
      category: 'atencao',
      priority: 'CRÍTICO',
      title: 'Pressão Assistencial na Atenção Especializada e Leitos UTI',
      description: 'Capacidade de leitos UTI operando no limite de taxa de ocupação nos horários de pico assistencial.',
      domains: ['Saúde', 'Demografia'],
      evidenceText: 'CNES/DATASUS 2024 (Taxa de ocupação > 88%).',
      sourceNotebookHref: `/dashboard/territorios/${ibge}/saude`,
      sourceNotebookLabel: 'Abrir Caderno Saúde',
    },
  ];

  // Adapted POC Interpretation (L4)
  const interpretationViewModel = toInterpretationViewModel(pocInterpretation);

  // Agenda for Field Visit
  const agendaItems = [
    {
      type: 'pauta_prioritaria' as const,
      title: 'Ampliação do Atendimento Básico de Saúde',
      detail: 'Abordar os investimentos necessários para ampliação do tempo de atendimento das UBSs centrais.',
      sourceDomain: 'Saúde',
    },
    {
      type: 'pergunta_chave' as const,
      title: 'Composição das Transferências e Autonomia Fiscal',
      detail: 'Qual a dependência das transferências correntes estaduais e federais no orçamento municipal?',
      sourceDomain: 'Economia',
    },
  ];

  return (
    <DossierNotebookContainer
      title="Inteligência Política: Síntese e Apoio à Decisão"
      description="Síntese intersetorial, rastreabilidade de evidências, leitura de sinais prioritários e pautas para atuação no território."
      engineName="Motor Inteligência Política / Claude"
      status={hasBriefingData ? 'PARCIAL' : 'COLETA_NECESSARIA'}
      sourceName="Inteligência Política (Demonstrativo — Fixture Contagem)"
      lastUpdated={dossier?.lastUpdated}
    >
      <div className="space-y-8">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Síntese de inteligência política demonstrativa pré-carregada (Fixture Contagem) — sinais, interpretações e recomendações abaixo não são gerados por município real.</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>

        {/* Toggle Briefing Executivo Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowBriefing(!showBriefing)}
            className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30 font-mono text-xs font-semibold transition-all"
          >
            {showBriefing ? 'Exibir Caderno Completo' : 'Exibir Briefing Executivo Rápido'}
          </button>
        </div>

        {showBriefing ? (
          <ExecutiveBriefing
            municipioName={`${cityName} / ${uf}`}
            synthesisHeadline={`Síntese Estratégica Territorial: ${cityName}`}
            criticalSignals={prioritizedSignals}
            topRecommendations={[
              {
                id: pocRecommendation.id,
                title: 'Aprofundamento da Composição Fiscal',
                action: pocRecommendation.action,
                rationale: pocRecommendation.justification,
                priority: 'MÉDIO',
                domains: ['Economia'],
              },
            ]}
          />
        ) : (
          <>
            {/* Top Synthesis */}
            <PoliticalIntelligenceSummary
              headline={dossier?.aiRecommendation?.priorityTheme?.text ?? `Síntese de Inteligência Política: ${cityName} / ${uf}`}
              summaryParagraphs={
                dossier?.aiRecommendation?.listenTo?.[0]?.text
                  ? [dossier.aiRecommendation.listenTo[0].text]
                  : [
                      `O município de ${cityName} apresenta uma dinâmica territorial marcada por sólida base econômica e dependência monitorada de transferências.`,
                      `A leitura intersetorial aponta para a importância de equilibrar a expansão produtiva com investimentos direcionados na atenção especializada de saúde e segurança comunitária.`,
                    ]
              }
              coverageRatio="5 de 5 domínios"
              confidenceLevel="ALTA"
              analyzedAt={dossier?.lastUpdated}
            />

            {/* Coverage & Temporal Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalysisCoveragePanel domains={domainCoverages} />
              <TemporalCoveragePanel temporalDomains={temporalInfo} />
            </div>

            {/* Prioritized Signal Stack */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono border-b border-white/10 pb-2">
                Sinais Prioritários do Território
              </h3>
              <PoliticalSignalStack
                signals={prioritizedSignals}
                onOpenEvidence={(sig) => setSelectedSignal(sig)}
              />
            </div>

            {/* Interpretation (L4) Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono border-b border-white/10 pb-2">
                Leitura Analítica Qualitativa (L4)
              </h3>
              <InterpretationCard
                interpretation={interpretationViewModel}
                onOpenEvidence={() => setSelectedSignal(prioritizedSignals[0])}
              />
            </div>

            {/* Cross Domain Relationship */}
            <CrossDomainPanel
              title="Relação Intersetorial: Economia x Saúde x Eleições"
              domains={['Economia', 'Saúde', 'Eleitoral']}
              description="A expansão do polo de serviços atraiu contingente populacional para as zonas perimetrais, elevando a demanda sobre as UBSs locais e posicionando a infraestrutura de saúde no topo das preocupações locais."
              finding="Crescimento populacional em vetor desprovido de leitos de retaguarda."
              impact="Pauta estratégica central para comunicação e presença em campo."
            />

            {/* Strategic Recommendation & Territory Agenda */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StrategicRecommendationCard
                recommendation={{
                  id: pocRecommendation.id,
                  title: 'Aprofundamento da Composição das Transferências Correntes',
                  action: pocRecommendation.action,
                  rationale: pocRecommendation.justification,
                  priority: 'MÉDIO',
                  domains: ['Economia'],
                  caveat: pocRecommendation.caveats[0],
                }}
                onOpenEvidence={() => setSelectedSignal(prioritizedSignals[0])}
              />

              <TerritoryAgendaPanel municipioName={`${cityName} / ${uf}`} items={agendaItems} />
            </div>

            {/* Explicability Panel */}
            <IntelligenceExplicabilityPanel
              sourcesCount={5}
              evidenceCount={12}
              coverageRatio="5 de 5 domínios"
            />
          </>
        )}
      </div>

      {/* Evidence Trace Drawer Modal */}
      <EvidencePanel
        isOpen={selectedSignal !== null}
        onClose={() => setSelectedSignal(null)}
        title={selectedSignal?.title ?? 'Rastreabilidade de Evidências'}
        evidences={sampleEvidences}
      />
    </DossierNotebookContainer>
  );
}
