"use client";

import React, { useState } from 'react';
import { IntegratedTerritoryAnalysis, DataSourceMode } from '@/lib/territorios/types';
import { BrainCircuit, Sparkles, ChevronDown, ChevronUp, Database } from 'lucide-react';

export default function IntegratedAnalysis({ data }: { data: IntegratedTerritoryAnalysis }) {
  const isDemo = data.mode === 'demo';
  const dateObj = new Date(data.generatedAt);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dateObj);

  return (
    <div className="surface-primary rounded-xl border border-white/5 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* HEADER EDITORIAL */}
      <div className="p-6 md:p-8 lg:p-10 border-b border-white/10 bg-[#0B0F19]/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mb-3">
              <BrainCircuit className="text-cyan-400" size={32} />
              Análise Integrada Politix IA
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Leitura transversal do território cruzando Demografia, Economia, Segurança e Comportamento Político.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            {isDemo && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold uppercase tracking-wider self-start md:self-end">
                <Sparkles size={12} className="text-cyan-400" />
                MVP • Dados demonstrativos
              </div>
            )}
            
            <div className="text-[11px] text-slate-500 font-medium md:text-right mt-2 md:mt-0">
              Gerado em {formattedDate}
            </div>

            <div className="flex flex-col gap-1.5 mt-2 bg-black/20 p-3 rounded-lg border border-white/5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cobertura da análise</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <MiniSourceBadge label="IBGE" status={data.sourcesCoverage.ibge} />
                <MiniSourceBadge label="Segurança" status={data.sourcesCoverage.security} />
                <MiniSourceBadge label="Saúde" status={data.sourcesCoverage.health} />
                <MiniSourceBadge label="Economia" status={data.sourcesCoverage.economy} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NÍVEL 1: 60 SEGUNDOS & LEITURA RÁPIDA */}
      <div className="bg-[#0f172a] border-b border-white/5">
        <div className="max-w-4xl mx-auto p-6 md:p-8 lg:p-12 space-y-10">
          
          {/* Contagem em 60 segundos */}
          <div className="space-y-4 relative">
            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-cyan-500 rounded-r" />
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} />
              {/* No modo real a IA passará o nome, aqui simulamos Contagem */}
              Contagem em 60 segundos
            </h3>
            <div className="space-y-4 text-xl md:text-2xl font-medium text-slate-200 leading-snug tracking-tight">
              {data.executiveSummary.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}
            </div>
          </div>

          {/* Faixa Leitura Rápida */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickReadBox label="Humor do Território" value={data.quickRead.mood} color="text-amber-400" />
            <QuickReadBox label="Maior Pressão" value={data.quickRead.pressure} color="text-rose-400" />
            <QuickReadBox label="Maior Ativo" value={data.quickRead.asset} color="text-emerald-400" />
            <QuickReadBox label="Oportunidade" value={data.quickRead.opportunity} color="text-blue-400" />
          </div>
        </div>
      </div>

      {/* NÍVEL 2: IMPLICAÇÕES POLÍTICAS E ANÁLISE DETALHADA */}
      <div className="p-6 md:p-8 lg:p-12 space-y-16 max-w-4xl mx-auto">
        
        {/* O que isso significa politicamente */}
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
          <h3 className="text-lg font-bold text-white tracking-wide mb-6 flex items-center gap-3">
            <BrainCircuit size={20} className="text-cyan-400" />
            {data.politicalImplications.title}
          </h3>
          <div className="space-y-4 text-[16px] text-slate-300 leading-relaxed font-medium relative z-10">
            {data.politicalImplications.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

        {/* Análise Temática e Cruzamento */}
        {data.sections.map((section, idx) => (
          <div key={idx} className="space-y-8">
            <h3 className="text-xl font-bold text-slate-200 border-b border-white/5 pb-3">
              {section.title}
            </h3>
            
            <div className="space-y-5 text-[16px] leading-relaxed text-slate-300">
              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}
            </div>

            {section.visualization && (
              <div className="mt-8 mb-6">
                <VisualizationRenderer viz={section.visualization} />
              </div>
            )}

            {section.insight && (
              <div className="mt-6 mb-2">
                <InsightBox insight={section.insight} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickReadBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#111726]/80 border border-white/5 p-4 rounded-xl flex flex-col justify-between h-full hover:bg-[#111726] transition-colors">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{label}</span>
      <span className={`text-[15px] font-bold ${color} leading-tight`}>{value}</span>
    </div>
  );
}

function InsightBox({ insight }: { insight: { text: string; evidence: string[]; confidence?: 'ALTA' | 'MÉDIA' | 'BAIXA' } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-cyan-950/20 border-l-2 border-cyan-500 p-5 rounded-r-lg">
      <div className="flex items-start gap-3">
        <Sparkles className="text-cyan-500 shrink-0 mt-0.5" size={18} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider block">Insight Estratégico</span>
            {insight.confidence && (
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border 
                ${insight.confidence === 'ALTA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  insight.confidence === 'MÉDIA' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                Confiança: {insight.confidence}
              </span>
            )}
          </div>
          <p className="text-[15px] font-medium text-cyan-50/90 leading-relaxed mb-4">
            {insight.text}
          </p>
          
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-400 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Ocultar evidências' : 'Ver evidências'}
          </button>
          
          {expanded && (
            <div className="mt-4 pt-3 border-t border-cyan-900/50">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Evidências utilizadas</span>
              <ul className="space-y-2">
                {insight.evidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-cyan-600 shrink-0" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSourceBadge({ label, status }: { label: string; status: DataSourceMode }) {
  const isAvailable = status === 'real';
  const isDemo = status === 'demo';

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : isDemo ? 'bg-blue-500' : 'bg-slate-500'}`} />
      <span className="text-[10px] text-slate-400 font-medium w-12">{label}</span>
      <span className="text-[9px] text-slate-500 font-bold uppercase">{isAvailable ? 'REAL' : isDemo ? 'DEMO' : 'N/A'}</span>
    </div>
  );
}

function VisualizationRenderer({ viz }: { viz: any }) {
  const maxVal = Math.max(...viz.data.map((d: any) => d.value));

  return (
    <div className="bg-[#111726]/50 border border-white/5 rounded-xl p-6">
      <h4 className="text-sm font-bold text-slate-300 mb-6">{viz.title}</h4>
      <div className="w-full">
        {viz.type === 'trend' && (
          <div className="flex items-end justify-between h-40 gap-2">
            {viz.data.map((item: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group relative h-full">
                <div className="w-full max-w-[2rem] bg-cyan-500/20 group-hover:bg-cyan-400/50 rounded-t transition-colors relative flex items-end justify-center pb-2" style={{ height: `${(item.value / maxVal) * 100}%` }}>
                  <span className="text-[10px] font-bold text-cyan-400">{item.value}</span>
                </div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{item.label}</span>
              </div>
            ))}
          </div>
        )}
        {viz.type === 'bar' && (
          <div className="space-y-4">
            {viz.data.map((item: any, i: number) => (
              <div key={i} className="space-y-1.5 group">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-300">{item.label}</span>
                  <span className="text-xs font-black text-blue-400">{item.value}</span>
                </div>
                <div className="h-2.5 w-full bg-[#0B0F19] rounded-full overflow-hidden border border-white/[0.02]">
                  <div className="h-full bg-blue-500 rounded-full group-hover:brightness-110 transition-all" style={{ width: `${(item.value / maxVal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5 text-[9px] text-slate-500 uppercase tracking-wider text-right">
        Gráfico gerado a partir dos dados do Dossiê
      </div>
    </div>
  );
}
