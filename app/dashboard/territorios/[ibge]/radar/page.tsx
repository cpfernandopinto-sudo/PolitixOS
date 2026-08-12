import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import { BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, ActivitySquare } from 'lucide-react';

export default async function RadarPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;
  const data = dossier.radar;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <ActivitySquare className="text-indigo-400" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Radar Territorial</h1>
          <p className="text-slate-400 text-sm">{data.executiveSummary}</p>
        </div>
      </div>
      
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <AlertTriangle size={11} /> MVP • DADOS DEMONSTRATIVOS
        </span>
        <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[11px] font-bold text-slate-300 uppercase tracking-widest">
          CONTEÚDO DEMONSTRATIVO — Eventos são fictícios
        </span>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Intensidade por Tema</h3>
        <BarChart data={data.intensityByTheme ?? []} xAxisKey="theme" barKey="count" name="Ocorrências" color="#8b5cf6" height={200} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-2">Linha do Tempo</h3>
          <div className="space-y-4">
            {data.events?.map((event: any, idx: number) => {
              let catColor = "bg-white/50/10 text-slate-400 border-slate-500/30";
              if (event.category === "SEGURANÇA") catColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";
              else if (event.category === "SAÚDE") catColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
              else if (event.category === "ECONOMIA") catColor = "bg-blue-500/10 text-blue-400 border-blue-500/30";
              else if (event.category === "MOBILIDADE") catColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
              else if (event.category === "POLÍTICA") catColor = "bg-purple-500/10 text-purple-400 border-purple-500/30";
              else if (event.category === "EDUCAÇÃO") catColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
              
              let impColor = "bg-white/50/10 text-slate-400";
              if (event.impact === "ALTO") impColor = "bg-rose-500/10 text-rose-400";
              else if (event.impact === "MÉDIO") impColor = "bg-amber-500/10 text-amber-400";

              return (
                <div key={idx} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">{event.date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${catColor}`}>
                      {event.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ml-auto ${impColor}`}>
                      IMPACTO {event.impact}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-slate-200">{event.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{event.summary}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-800">
                    <span className="text-xs text-slate-500">Fonte: Demo</span>
                    <div className="flex gap-1.5">
                      {event.tags?.map((t: string, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Sinais Emergentes</h3>
            <ul className="space-y-3">
              {data.emergingSignals?.map((sig: string, idx: number) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-300">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{sig}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <PolitixInsight insight={data.insight} />
    </div>
  );
}
