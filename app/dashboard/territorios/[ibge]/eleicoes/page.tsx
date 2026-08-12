import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { LineChart, HorizontalBarChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { Vote, UserCheck, UserX, AlertTriangle, GitBranch, Target, Info, AlertCircle } from 'lucide-react';
import { createAdminClient } from '@/lib/supabaseClient';
import { loadElectoralNotebook } from '@/lib/territorios/tse-notebook-repository';

export default async function EleicoesPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier || !dossier.electoral) return null;
  const resolved = await loadElectoralNotebook(createAdminClient(), ibge, dossier.electoral);
  const data = resolved.notebook;
  const isReal = data.mode === 'real';

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <NotebookHeader
        title="Perfil Eleitoral e Competitividade"
        summary={data.executiveSummary}
      />

      <div className="mb-6 flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isReal ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
          <AlertTriangle size={11} /> {isReal ? `TSE OFICIAL • ${resolved.realCoveragePercent.toFixed(0)}% REAL` : 'MVP • DADOS DEMONSTRATIVOS'}
        </span>
        <span className="text-[11px] text-slate-500">{isReal ? `Pleitos municipais oficiais. Campos sem cobertura permanecem identificados como DEMO (${resolved.demoCoveragePercent.toFixed(0)}%).` : 'Resultados abaixo são fictícios para demonstração da arquitetura.'}</span>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 mb-8">
        <ContextualKPI label="Eleitorado" indicator={data.electorate} icon={Vote} />
        <ContextualKPI label="Comparecimento" indicator={data.participation} icon={UserCheck} />
        <ContextualKPI label="Abstenção" indicator={data.abstention} icon={UserX} />

        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Votos Válidos</span>
            <Target size={16} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-3 mb-2 mt-auto">
            <span className="text-2xl font-bold text-white">{data.validVotes?.value}</span>
          </div>
          <div className="pt-4 border-t border-white/5 mt-auto flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Brancos: {data.blankVotes?.value}</span>
            <span className="text-[11px] font-semibold text-slate-400">Nulos: {data.nullVotes?.value}</span>
          </div>
        </div>

        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margem 1º×2º</span>
            <GitBranch size={16} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-3 mb-2 mt-auto">
            <span className="text-xl font-bold text-emerald-400">{data.margin?.value}</span>
          </div>
          <div className="pt-4 border-t border-white/5 mt-auto">
            <span className="text-[11px] font-semibold text-slate-400">Último Pleito Municipal ({resolved.latestMunicipalYear ?? '—'})</span>
          </div>
        </div>

        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full group relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Concentração {resolved.fieldModes.concentration === 'DEMO' ? '• DEMO' : ''}</span>
            <Info size={16} className="text-slate-500" />
          </div>
          <div className="absolute top-full right-0 mt-2 w-52 bg-[#0B0F19] border border-white/10 p-2 rounded text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl pointer-events-none">
            Medido pelo Índice de Fragmentação Laakso-Taagepera. Quanto menor, mais concentrado o voto.
          </div>
          <div className="flex items-end gap-3 mb-2 mt-auto">
            <span className="text-[15px] font-bold text-amber-400 uppercase tracking-widest">{data.concentration}</span>
          </div>
          <div className="pt-4 border-t border-white/5 mt-auto">
            <span className="text-[11px] font-semibold text-slate-400">{data.fragmentation}</span>
          </div>
        </div>
      </div>

      {!isReal && <>
      <div className="mb-8 bg-[#111726] border border-white/5 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Benchmark — Participação Eleitoral</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Contagem', part: '78,4%', abst: '21,6%', color: 'text-cyan-400' },
            { label: 'RMBH', part: '78,8%', abst: '21,2%', color: 'text-white' },
            { label: 'MG', part: '79,1%', abst: '20,9%', color: 'text-white' },
          ].map(b => (
            <div key={b.label} className="p-3 bg-[#0B0F19]/60 rounded-lg">
              <span className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${b.color}`}>{b.label}</span>
              <div className="flex justify-center gap-4">
                <div><span className="block text-[10px] text-slate-500">Comparec.</span><span className="text-sm font-bold text-emerald-400">{b.part}</span></div>
                <div><span className="block text-[10px] text-slate-500">Abstenção</span><span className="text-sm font-bold text-rose-400">{b.abst}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {!isReal && <>
        <div className="lg:col-span-1 surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Histórico Eleitoral</h3>
          <div className="space-y-5">
            {[
              { year: '2024', type: 'Municipal', desc: 'Reeleição com margem de 15 p.p. Comparecimento 78,4%.', color: 'bg-cyan-500' },
              { year: '2022', type: 'Geral', desc: 'Alta polarização nacional com reflexos no eleitorado local.', color: 'bg-white/50' },
              { year: '2020', type: 'Municipal', desc: 'Impacto da pandemia: pior comparecimento histórico (75%).', color: 'bg-amber-500' },
              { year: '2018', type: 'Geral', desc: 'Eleição de renovação com maior participação do período (82%).', color: 'bg-white/50' },
            ].map(h => (
              <div key={h.year} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full ${h.color} shrink-0 mt-1.5`} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white">{h.year}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-semibold text-slate-400 uppercase">{h.type}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>}

        {/* Evoluções temporais */}
        <div className={`${isReal ? 'lg:col-span-3' : 'lg:col-span-2'} grid grid-rows-3 gap-4`}>
          <div className="surface-primary rounded-xl p-4 border border-white/5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Evolução do Eleitorado</h3>
            {data.historicalElectorate && (
              <LineChart data={data.historicalElectorate} xAxisKey="period" lineKeys={[{ key: 'value', name: 'Eleitores', color: '#22d3ee' }]} height={90} />
            )}
          </div>
          <div className="surface-primary rounded-xl p-4 border border-white/5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Evolução do Comparecimento (%)</h3>
            {data.historicalParticipation && (
              <LineChart data={data.historicalParticipation} xAxisKey="period" lineKeys={[{ key: 'value', name: 'Comparecimento', color: '#10b981' }]} height={90} />
            )}
          </div>
          <div className="surface-primary rounded-xl p-4 border border-white/5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Evolução da Abstenção (%)</h3>
            {data.historicalAbstention && (
              <LineChart data={data.historicalAbstention} xAxisKey="period" lineKeys={[{ key: 'value', name: 'Abstenção', color: '#f43f5e' }]} height={90} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Resultado Último Pleito */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Resultado — Último Pleito ({resolved.latestMunicipalYear ?? '—'})</h3>
          <p className="text-[11px] text-slate-500 mb-5 uppercase tracking-widest">{isReal ? 'TSE oficial • 1º turno • votos válidos' : 'Dados demonstrativos — candidatos fictícios'}</p>
          {data.candidateResults && data.candidateResults.length > 0 ? (
            <HorizontalBarChart
              data={data.candidateResults}
              yAxisKey="name"
              barKey="percentage"
              name="Votos %"
              color="#3b82f6"
              height={220}
            />
          ) : null}
        </div>

        {/* Partidos com maior participação */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Composição Partidária — Câmara Municipal</h3>
          <p className="text-[11px] text-slate-500 mb-5 uppercase tracking-widest">{isReal ? 'TSE oficial • candidatos eleitos' : 'Estrutura demonstrativa'}</p>
          {data.topParties && data.topParties.length > 0 ? (
            <BarChart
              data={data.topParties}
              xAxisKey="party"
              barKey="seats"
              name="Vagas"
              color="#8b5cf6"
              height={220}
            />
          ) : null}
        </div>
      </div>

      {!isReal && <>
      <div className="mb-8 surface-primary rounded-xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">O Que Mudou no Eleitorado?</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{data.whatChangedInElectorate}</p>
      </div>

      <PolitixInsight insight={data.insight} />
      </>}
    </div>
  );
}
