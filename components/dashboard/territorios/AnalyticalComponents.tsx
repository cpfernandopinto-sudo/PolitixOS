import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info, BrainCircuit, Activity, BarChart3, AlertCircle } from 'lucide-react';
import { TerritoryIndicator, TerritoryTopicInsight } from '@/lib/territorios/types';
import { ObservationTypeBadge, ConfidenceBadge } from './EditorialComponents';

// ---------------------------------------------------------
// NOTEBOOK HEADER
// ---------------------------------------------------------
export function NotebookHeader({ title, summary }: { title: string; summary?: string }) {
  return (
    <div className="bg-[#0f172a]/50 border border-white/5 rounded-xl p-4 md:p-6 mb-6 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
      <h2 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center gap-2">
        {title}
      </h2>
      {summary && (
        <div className="space-y-4 text-[13px] md:text-sm font-medium text-slate-300 leading-relaxed max-w-4xl">
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// CONTEXTUAL KPI
// ---------------------------------------------------------
export function ContextualKPI({ label, indicator, icon: Icon }: { label: string; indicator?: TerritoryIndicator; icon?: React.ElementType }) {
  if (!indicator) return null;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{indicator.label || label}</span>
        {Icon && <Icon size={16} className="text-slate-500" />}
      </div>
      
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 mb-4 mt-auto">
        <span className="font-bold text-white leading-none break-words" style={{ fontSize: 'clamp(20px, 2.5vw, 30px)' }}>
          {indicator.value}
        </span>
        
        {indicator.trend && (
          <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${
            indicator.trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' :
            indicator.trend === 'down' ? 'text-rose-400 bg-rose-500/10' :
            'text-slate-400 bg-slate-500/10'
          }`}>
            {indicator.trend === 'up' && <TrendingUp size={12} />}
            {indicator.trend === 'down' && <TrendingDown size={12} />}
            {indicator.trend === 'stable' && <Minus size={12} />}
            {indicator.variation || (indicator.trend === 'up' ? 'Alta' : indicator.trend === 'down' ? 'Baixa' : 'Estável')}
          </div>
        )}
      </div>

      {indicator.comparison && (
        <div className="pt-4 border-t border-white/5 space-y-2 mt-auto">
          {indicator.comparison.rmbh && (
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>Comparação RMBH</span>
              <span className="text-slate-300">{indicator.comparison.rmbh}</span>
            </div>
          )}
          {indicator.comparison.mg && (
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span>Comparação MG</span>
              <span className="text-slate-300">{indicator.comparison.mg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// POLITIX INSIGHT
// ---------------------------------------------------------
export function PolitixInsight({ insight }: { insight?: TerritoryTopicInsight }) {
  if (!insight) return null;

  return (
    <div className="bg-[#0f172a] border border-cyan-500/30 rounded-xl p-5 relative overflow-hidden mt-6">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <BrainCircuit size={64} />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <BrainCircuit size={16} />
            Leitura Politix IA
          </h3>
          {insight.type && (
            <ObservationTypeBadge type={insight.type} />
          )}
        </div>
        {insight.confidence && (
          <ConfidenceBadge level={insight.confidence} reasoning={insight.confidenceReasoning} />
        )}
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-bold text-white mb-3">{insight.title}</h4>
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          {insight.analysis.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </div>

      {insight.evidence && insight.evidence.length > 0 && (
        <div className="pt-4 border-t border-white/5">
          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <AlertCircle size={12} />
            Evidências Utilizadas
          </h5>
          <ul className="space-y-2">
            {insight.evidence.map((ev, idx) => (
              <li key={idx} className="text-xs font-medium text-slate-400 flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">•</span>
                {ev.dataset} ({ev.source}, {ev.period})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// TREND CHART (Nativo Tailwind para MVP)
// ---------------------------------------------------------
export function TrendChart({ data, title }: { data: Array<{ period: string; value: number }>; title: string }) {
  if (!data || data.length === 0) return null;
  
  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  // Evitar divisão por zero se max == min
  const range = max === min ? 1 : max - min;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Activity size={14} />
          {title}
        </h4>
      </div>

      <div className="relative h-48 flex items-end gap-2 md:gap-4 justify-between w-full pt-6">
        {data.map((item, idx) => {
          // Calcula a altura percentual da barra. Garante no mínimo 10% para não sumir visualmente.
          let heightPct = ((item.value - min) / range) * 90 + 10;
          if (max === min) heightPct = 50;

          const isLast = idx === data.length - 1;
          const isFirst = idx === 0;
          
          const trendColor = "bg-blue-500/20 hover:bg-blue-400/40";
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 group relative h-full">
              {/* Tooltip */}
              <div className="absolute -top-8 bg-[#0B0F19] border border-white/10 px-2 py-1 rounded text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                {item.value}
              </div>
              
              {/* Barra */}
              <div 
                className={`w-full rounded-t transition-all duration-300 ${isLast ? 'bg-cyan-500/40 border-t border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : trendColor}`}
                style={{ height: `${heightPct}%` }}
              />
              
              {/* Label */}
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isLast ? 'text-cyan-400' : 'text-slate-500'}`}>
                {item.period}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
