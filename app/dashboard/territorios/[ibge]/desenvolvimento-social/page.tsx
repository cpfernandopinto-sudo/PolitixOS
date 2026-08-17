import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, TrendingDown, Users, Coins, Percent } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function DesenvolvimentoSocialPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.socialDevelopment;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Desenvolvimento Social e Vulnerabilidade — ${cityName}`}
      description="Perfil de vulnerabilidade social, indicadores do CadÚnico, programas de transferência e índice de Gini."
      engineName="Motor Desenvolvimento Social"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'Fontes Sociais (Demonstrativo — Fixture Contagem)' : 'Ministério do Desenvolvimento Social / CadÚnico'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados sociais demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader
            title="Desenvolvimento Social"
            summary={data.executiveSummary}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Pobreza" indicator={data.povertyRate} icon={TrendingDown} />
            <ContextualKPI label="Extrema Pobreza" indicator={data.extremePovertyRate} />
            <ContextualKPI label="CadÚnico" indicator={data.cadUnico} icon={Users} />
            <ContextualKPI label="Transferências" indicator={data.transfers} icon={Coins} />
            <ContextualKPI label="Gini" indicator={data.giniIndex} icon={Percent} />
            <ContextualKPI label="Vulnerabilidade" indicator={data.socialVulnerability} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução: Taxa de Pobreza (%)</h3>
              <div className="h-[220px]">
                <LineChart
                  data={data.historicalPoverty ?? []}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Pobreza %', color: '#f43f5e' }]}
                  height={220}
                />
              </div>
            </div>
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução: CadÚnico (Famílias)</h3>
              <div className="h-[220px]">
                <LineChart
                  data={data.historicalCadUnico ?? []}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Famílias', color: '#f97316' }]}
                  height={220}
                />
              </div>
            </div>
          </div>

          <PolitixInsight insight={data.insight} />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Desenvolvimento Social"
          title="Dados Sociais Ainda Não Consolidados"
          description={`As informações de desenvolvimento social e CadÚnico para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
