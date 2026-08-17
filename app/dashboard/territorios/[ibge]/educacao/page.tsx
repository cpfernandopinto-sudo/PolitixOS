import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, GraduationCap, Users, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function EducacaoPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.education;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Educação Pública — ${cityName}`}
      description="Indicadores do IDEB, matrículas por etapa, taxa de aprovação/abandono e distorção idade-série."
      engineName="Motor Educação"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'INEP / MEC (Demonstrativo — Fixture Contagem)' : 'INEP / MEC (Censo Escolar)'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados educacionais demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader
            title="Educação Pública"
            summary={data.executiveSummary}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="IDEB Anos Iniciais" indicator={data.idebElementary} icon={GraduationCap} />
            <ContextualKPI label="IDEB Anos Finais" indicator={data.ideb} icon={GraduationCap} />
            <ContextualKPI label="Matrículas" indicator={data.enrollments} icon={Users} />
            <ContextualKPI label="Aprovação" indicator={data.approvalRate} icon={TrendingUp} />
            <ContextualKPI label="Abandono" indicator={data.dropoutRate} icon={TrendingDown} />
            <ContextualKPI label="Distorção I-S" indicator={data.ageDistortionRate} icon={Clock} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução: IDEB (Anos Finais)</h3>
              <div className="h-[220px]">
                <LineChart
                  data={data.historicalIdeb ?? []}
                  xAxisKey="period"
                  lineKeys={[
                    { key: 'value', name: 'Contagem', color: '#8b5cf6' },
                    { key: 'mg', name: 'Minas Gerais', color: '#94a3b8' }
                  ]}
                  height={220}
                />
              </div>
            </div>
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução: Matrículas</h3>
              <div className="h-[220px]">
                <LineChart
                  data={data.historicalEnrollments ?? []}
                  xAxisKey="period"
                  lineKeys={[{ key: 'value', name: 'Matrículas', color: '#10b981' }]}
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
          engineName="Motor Educação"
          title="Dados de Educação Ainda Não Consolidados"
          description={`As informações de matrículas e IDEB para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
