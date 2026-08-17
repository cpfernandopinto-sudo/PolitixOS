import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, Briefcase, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function EmpregoRendaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.employment;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Emprego e Renda — ${cityName}`}
      description="Saldo de empregos formais, movimentação do Novo CAGED e remuneração média."
      engineName="Motor Economia / CAGED"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'MTE / CAGED (Demonstrativo — Fixture Contagem)' : 'MTE / Novo CAGED'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados de emprego demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader
            title="Emprego e Renda"
            summary={data.executiveSummary}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Empregos Formais" indicator={data.formalJobs} icon={Briefcase} />
            <ContextualKPI label="Saldo 12m" indicator={data.balance} icon={TrendingUp} />
            <ContextualKPI label="Admissões" indicator={{ value: data.admissions ?? 0 }} icon={TrendingUp} />
            <ContextualKPI label="Desligamentos" indicator={{ value: data.dismissals ?? 0 }} icon={TrendingDown} />
            <ContextualKPI label="Remuneração Média" indicator={data.averageSalary} icon={DollarSign} />
            <ContextualKPI label="Renda per Capita" indicator={data.incomePerCapita} icon={Wallet} />
          </div>

          <PolitixInsight insight={data.insight} />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Economia / CAGED"
          title="Dados de Emprego e Renda Ainda Não Consolidados"
          description={`As informações de emprego e renda para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
