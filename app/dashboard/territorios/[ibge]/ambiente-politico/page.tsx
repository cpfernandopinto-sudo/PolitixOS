import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, UserCircle2, Building2, Tag, CalendarClock, MessageCircle } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function AmbientePoliticoPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.politicalEnvironment;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Ambiente Político Institucional — ${cityName}`}
      description="Composição do executivo e legislativo, histórico de mandatos e temas do debate local."
      engineName="Motor Ambiente Político"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'Fontes Locais (Demonstrativo — Fixture Contagem)' : 'Fontes Institucionais Oficiais'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          {/* DEMO BADGE AND WARNING */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl font-mono">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold text-amber-400 tracking-widest bg-amber-500/20 gap-1.5 uppercase">
              <AlertTriangle size={14} /> MVP • DADOS DEMONSTRATIVOS (Contagem)
            </span>
            <span className="text-amber-400/90 text-xs font-medium">
              ESTRUTURA DEMONSTRATIVA — Não atribui posições reais ou intenção de voto a agentes públicos.
            </span>
          </div>

          <NotebookHeader
            title="Ambiente Político Institucional"
            summary={data.executiveSummary}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Executivo */}
            <div className="lg:col-span-1 surface-primary rounded-xl p-6 border border-white/5 flex flex-col h-full">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
                <UserCircle2 size={18} className="text-indigo-400" />
                Executivo Municipal
              </h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-mono">Chefe do Executivo</span>
                  <span className="text-lg font-bold text-white">{data.executiveName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-mono">Filiação Partidária</span>
                  <span className="inline-flex px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-sm font-semibold text-slate-300 font-mono">
                    {data.executiveParty}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-mono">Mandato Atual</span>
                  <span className="text-sm text-slate-400 font-mono">{data.executiveTerm}</span>
                </div>
              </div>
            </div>

            {/* Legislativo */}
            <div className="lg:col-span-2 surface-primary rounded-xl p-6 border border-white/5 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2 font-mono">
                <Building2 size={18} className="text-fuchsia-400" />
                Composição — Câmara Municipal
              </h3>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-6 font-mono">Distribuição Demonstrativa (Vagas)</p>
              <div className="h-[220px]">
                <BarChart
                  data={data.chamberComposition ?? []}
                  xAxisKey="party"
                  barKey="seats"
                  name="Vagas"
                  color="#d946ef"
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
          engineName="Motor Ambiente Político"
          title="Dados de Ambiente Político Ainda Não Consolidados"
          description={`As informações de ambiente político institucional para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
