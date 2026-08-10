'use client';

import { Activity, AlertTriangle, BarChart3, Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PoliticalStatusResult } from '@/lib/analytics/political-status';

interface KPIProps {
  score_geral: number;
  temperatura_geral: string;
  tendencia: string;
  alertas_ativos: number;
  volume_total: number;
  politicalStatus: PoliticalStatusResult;
}

const SEVERITY_TEXT: Record<PoliticalStatusResult['severidade'], string> = {
  baixo: 'text-green-400',
  medio: 'text-yellow-400',
  alto: 'text-orange-400',
  critico: 'text-red-400',
};

const SEVERITY_BAR: Record<PoliticalStatusResult['severidade'], string> = {
  baixo: 'bg-green-500',
  medio: 'bg-yellow-500',
  alto: 'bg-orange-500',
  critico: 'bg-red-500',
};

export default function OverviewKPI({
  score_geral,
  temperatura_geral,
  tendencia,
  alertas_ativos,
  volume_total,
  politicalStatus,
}: KPIProps) {
  const getTempColor = (t: string) => {
    switch (t) {
      case 'crítica': return 'text-red-500';
      case 'quente': return 'text-orange-500';
      case 'morna': return 'text-yellow-500';
      default: return 'text-cyan-400';
    }
  };

  const getTempBgColor = (t: string) => {
    switch (t) {
      case 'crítica': return 'bg-red-500';
      case 'quente': return 'bg-orange-500';
      case 'morna': return 'bg-yellow-500';
      default: return 'bg-cyan-500';
    }
  };

  const getTrendIcon = (t: string) => {
    switch (t) {
      case 'subindo': return <TrendingUp className="text-green-400" size={16} />;
      case 'caindo': return <TrendingDown className="text-red-400" size={16} />;
      default: return <Minus className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3.5">
      {/* 1. Estado Político — Destaque de Prioridade Visual (ocupa 2 colunas no desktop e mobile) */}
      <div
        className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-cyan-400/30 transition-colors relative overflow-hidden col-span-2 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-white/[0.04] to-transparent"
        title="Classificação executiva atual do Estado Político."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider truncate">Estado Político</span>
          <Activity className="text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 animate-pulse" size={16} />
        </div>
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-black uppercase tracking-tight leading-none ${SEVERITY_TEXT[politicalStatus.severidade]}`}>
            {politicalStatus.label}
          </div>
          <div className="text-[11px] text-slate-400 font-semibold bg-white/[0.05] px-1.5 py-0.5 rounded-sm">
            {politicalStatus.score}/100
          </div>
        </div>
        <div className="text-[9px] text-slate-500 font-medium truncate mb-1">Leitura executiva de war room</div>
        {/* Accent Solid Line */}
        <div className={`absolute bottom-0 left-0 h-1 w-full ${SEVERITY_BAR[politicalStatus.severidade]}`} />
      </div>

      {/* 2. Score de Saúde */}
      <div
        className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-cyan-400/30 transition-colors relative overflow-hidden col-span-1"
        title="Consolidação sintética operacional — inverso do risco consolidado usado no Estado Político e no Termômetro de Crise (100 − risco)."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Saúde</span>
          <Activity className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className="text-2xl font-bold text-white leading-none">
          {score_geral}
          <span className="text-xs text-slate-500 ml-1 font-normal">/100</span>
        </div>
        <div className="text-[10px] text-cyan-400/80 font-medium truncate mb-1">Consolidação sintética operacional</div>
        {/* Accent Progress Line */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-cyan-400/20">
          <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${score_geral}%` }} />
        </div>
      </div>

      {/* 3. Temperatura */}
      <div
        className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-orange-400/30 transition-colors relative overflow-hidden col-span-1"
        title="Nível atual de tensão — rótulo qualitativo derivado do mesmo score de crise, sem a classificação executiva do Estado Político."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Temperatura</span>
          <Thermometer className="text-orange-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className={`text-2xl font-bold capitalize leading-none ${getTempColor(temperatura_geral)}`}>
          {temperatura_geral}
        </div>
        <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Nível de tensão</div>
        {/* Accent Solid Line */}
        <div className={`absolute bottom-0 left-0 h-1 w-full ${getTempBgColor(temperatura_geral)}`} />
      </div>

      {/* 4. Tendência */}
      <div
        className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-blue-400/30 transition-colors relative overflow-hidden col-span-1"
        title="Direção temporal do volume monitorado no período, comparado ao período imediatamente anterior."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Tendência</span>
          {getTrendIcon(tendencia)}
        </div>
        <div className="text-2xl font-bold text-white capitalize leading-none">
          {tendencia}
        </div>
        <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Variação de volume</div>
      </div>

      {/* 5. Alertas */}
      <div
        className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-red-400/30 transition-colors relative overflow-hidden col-span-1"
        title="Volume de ocorrências relevantes (contagem) — a leitura de severidade fica em Riscos Prioritários e Alertas Prioritários."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Alertas</span>
          <AlertTriangle className="text-red-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className="text-2xl font-bold text-white leading-none">{alertas_ativos}</div>
        <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Ocorrências ativas</div>
      </div>

      {/* 6. Volume */}
      <div
        className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-purple-400/30 transition-colors relative overflow-hidden col-span-1"
        title="Dimensão bruta da base monitorada (notícias + posts) no período selecionado."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Volume</span>
          <BarChart3 className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className="text-2xl font-bold text-white leading-none">{volume_total.toLocaleString('pt-BR')}</div>
        <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Base monitorada</div>
      </div>
    </div>
  );
}
