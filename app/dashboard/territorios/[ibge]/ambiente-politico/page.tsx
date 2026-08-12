import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, UserCircle2, Building2, Tag, CalendarClock, MessageCircle } from 'lucide-react';

export default async function AmbientePoliticoPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.politicalEnvironment;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* DEMO BADGE AND WARNING */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold text-amber-400 tracking-widest bg-amber-500/20 gap-1.5 uppercase">
          <AlertTriangle size={14} /> MVP • DADOS DEMONSTRATIVOS
        </span>
        <span className="text-amber-400/90 text-sm font-medium">
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
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <UserCircle2 size={18} className="text-indigo-400" />
            Executivo Municipal
          </h3>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Chefe do Executivo</span>
              <span className="text-lg font-bold text-white">{data.executiveName}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Filiação Partidária</span>
              <span className="inline-flex px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-sm font-semibold text-slate-300">
                {data.executiveParty}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Mandato Atual</span>
              <span className="text-sm text-slate-400">{data.executiveTerm}</span>
            </div>
          </div>
        </div>

        {/* Legislativo */}
        <div className="lg:col-span-2 surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2">
            <Building2 size={18} className="text-fuchsia-400" />
            Composição — Câmara Municipal
          </h3>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-6">Distribuição Demonstrativa (Vagas)</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Institucional */}
        <div className="surface-primary rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <CalendarClock size={18} className="text-cyan-400" />
            Cronologia Institucional
          </h3>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300/10 before:to-transparent">
            {(data.institutionalTimeline ?? []).map((item, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-900 text-slate-300 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  <span className="text-[10px] font-bold">{item.year}</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#111726]/[0.04] transition-colors">
                  <h4 className="font-bold text-white text-sm mb-1">{item.event}</h4>
                  <p className="text-xs text-slate-400">{item.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Temas Dominantes */}
          <div className="surface-primary rounded-xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-emerald-400" />
              Temas Dominantes no Debate Local
            </h3>
            <div className="flex flex-wrap gap-2">
              {(data.dominantThemes ?? []).map((theme, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
                  <Tag size={12} /> {theme}
                </span>
              ))}
            </div>
          </div>

          {/* Agenda Prioritária */}
          <div className="surface-primary rounded-xl p-6 border border-white/5 flex-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Agenda Prioritária do Executivo</h3>
            <div className="space-y-3">
              {(data.agendaPriorities ?? []).map((agenda, i) => (
                <div key={i} className="flex gap-3 items-start bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-300 pt-0.5">{agenda}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
