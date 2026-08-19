import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { Vote, UserCheck, UserX, Target, GitBranch, Info, Calendar } from 'lucide-react';
import { createAdminClient } from '@/lib/supabaseClient';
import { loadElectoralNotebook } from '@/lib/territorios/tse-notebook-repository';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

export default async function EleicoesPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  // Try real TSE data load without mandatory demo fallback
  let data = null;
  let isDemo = false;

  try {
    const resolved = await loadElectoralNotebook(createAdminClient(), ibge, null);
    if (resolved.notebook && resolved.notebook.mode === 'real') {
      data = resolved.notebook;
    }
  } catch {
    // DB query failed or uninitialized
  }

  // Explicit DEMONSTRATIVO fallback ONLY for Contagem (3118601)
  if (!data && ibge === '3118601') {
    data = CONTAGEM_DEMO.electoral;
    isDemo = true;
  }

  const statusKey = data ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  // Comparative Matrix Rows for 2016 x 2020 x 2024
  const hasHistoricalSeries = Boolean(data?.historicalElectorate && data.historicalElectorate.length > 0);

  return (
    <DossierNotebookContainer
      title={`Perfil Eleitoral e Competitividade — ${cityName}`}
      description="Evolução do eleitorado, abstenção, participação, margens de votação e composição partidária."
      engineName="Motor TSE"
      status={statusKey}
      sourceName={isDemo ? 'TSE (Demonstrativo — Fixture Contagem)' : 'TSE (Tribunal Superior Eleitoral — Dados Oficiais)'}
    >
      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Dados demonstrativos pré-carregados (Fixture Contagem).</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>
      )}

      {data ? (
        <div className="space-y-8">
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Eleitorado" indicator={data.electorate} icon={Vote} />
            <ContextualKPI label="Comparecimento" indicator={data.participation} icon={UserCheck} />
            <ContextualKPI label="Abstenção" indicator={data.abstention} icon={UserX} />

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Votos Válidos</span>
                <Target size={16} className="text-slate-500" />
              </div>
              <div className="flex items-end gap-3 mb-2 mt-auto">
                <span className="text-2xl font-bold text-white font-mono">{data.validVotes?.value ?? '—'}</span>
              </div>
              <div className="pt-4 border-t border-white/5 mt-auto flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Brancos: {data.blankVotes?.value ?? '—'}</span>
                <span>Nulos: {data.nullVotes?.value ?? '—'}</span>
              </div>
            </div>

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Margem 1º×2º</span>
                <GitBranch size={16} className="text-slate-500" />
              </div>
              <div className="flex items-end gap-3 mb-2 mt-auto">
                <span className="text-xl font-bold text-emerald-400 font-mono">{data.margin?.value ?? '—'}</span>
              </div>
              <div className="pt-4 border-t border-white/5 mt-auto">
                <span className="text-[11px] font-semibold text-slate-400 font-mono">Pleito Municipal</span>
              </div>
            </div>

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Concentração</span>
                <Info size={16} className="text-slate-500" />
              </div>
              <div className="flex items-end gap-3 mb-2 mt-auto">
                <span className="text-[15px] font-bold text-amber-400 uppercase tracking-widest font-mono">{data.concentration ?? '—'}</span>
              </div>
              <div className="pt-4 border-t border-white/5 mt-auto">
                <span className="text-[11px] font-semibold text-slate-400 font-mono">{data.fragmentation ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Comparative Election Matrix (2016 x 2020 x 2024) */}
          {hasHistoricalSeries && (
            <div className="surface-primary rounded-xl p-5 border border-white/5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
                <Calendar size={14} className="text-cyan-400" />
                <span>Matriz Comparativa de Pleitos Municipais</span>
              </h3>

              <div className="overflow-x-auto border border-white/5 rounded-lg">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0B0F19] text-slate-400 text-[10px] uppercase border-b border-white/5">
                    <tr>
                      <th className="p-3">Pleito</th>
                      <th className="p-3 text-right">Eleitorado Apto</th>
                      <th className="p-3 text-right">Comparecimento (%)</th>
                      <th className="p-3 text-right">Abstenção (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {data.historicalElectorate.map((el: any, idx: number) => {
                      const part = data.historicalParticipation?.[idx];
                      const abs = data.historicalAbstention?.[idx];
                      return (
                        <tr key={el.period} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-bold text-cyan-300">{el.period}</td>
                          <td className="p-3 text-right font-bold text-white">{Number(el.value).toLocaleString('pt-BR')}</td>
                          <td className="p-3 text-right text-emerald-400">{part ? `${part.value}%` : '—'}</td>
                          <td className="p-3 text-right text-rose-400">{abs ? `${abs.value}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gráficos de Evolução Temporais */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="surface-primary rounded-xl p-4 border border-white/5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">Evolução do Eleitorado</h3>
              {data.historicalElectorate && data.historicalElectorate.length > 0 ? (
                <LineChart data={data.historicalElectorate} xAxisKey="period" lineKeys={[{ key: 'value', name: 'Eleitores', color: '#22d3ee' }]} height={120} />
              ) : (
                <div className="h-[120px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem série histórica de eleitorado</div>
              )}
            </div>
            <div className="surface-primary rounded-xl p-4 border border-white/5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">Comparecimento (%)</h3>
              {data.historicalParticipation && data.historicalParticipation.length > 0 ? (
                <LineChart data={data.historicalParticipation} xAxisKey="period" lineKeys={[{ key: 'value', name: 'Comparecimento', color: '#10b981' }]} height={120} />
              ) : (
                <div className="h-[120px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem série de comparecimento</div>
              )}
            </div>
            <div className="surface-primary rounded-xl p-4 border border-white/5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">Abstenção (%)</h3>
              {data.historicalAbstention && data.historicalAbstention.length > 0 ? (
                <LineChart data={data.historicalAbstention} xAxisKey="period" lineKeys={[{ key: 'value', name: 'Abstenção', color: '#f43f5e' }]} height={120} />
              ) : (
                <div className="h-[120px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem série de abstenção</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resultado Último Pleito */}
            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Resultado — Último Pleito Municipal</h3>
              {data.candidateResults && data.candidateResults.length > 0 ? (
                <HorizontalBarChart
                  data={data.candidateResults}
                  yAxisKey="name"
                  barKey="percentage"
                  name="Votos %"
                  color="#3b82f6"
                  height={220}
                />
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem resultados de candidatos</div>
              )}
            </div>

            {/* Composição Partidária */}
            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Composição Partidária — Câmara Municipal</h3>
              {data.topParties && data.topParties.length > 0 ? (
                <BarChart
                  data={data.topParties}
                  xAxisKey="party"
                  barKey="seats"
                  name="Vagas"
                  color="#8b5cf6"
                  height={220}
                />
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem composição de partidos</div>
              )}
            </div>
          </div>

          {data.insight && <PolitixInsight insight={data.insight} />}
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor TSE"
          title="Dados Eleitorais do TSE Ainda Não Consolidados"
          description={`Os dados das eleições municipais para ${cityName} ainda não foram carregados do repositório oficial do TSE. Execute a primeira solicitação para consolidar os resultados.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
