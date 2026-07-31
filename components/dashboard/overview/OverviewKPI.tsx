'use client';

import { Activity, AlertTriangle, BarChart3, Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIProps {
  score_geral: number;
  temperatura_geral: string;
  tendencia: string;
  alertas_ativos: number;
  volume_total: number;
}

/**
 * Faixa compacta de 5 cards executivos (Sprint 6 — reintegração analítica).
 * Cada card tem um papel distinto e não redundante com o Estado Político:
 * - Score de Saúde: consolidação sintética operacional (inverso do risco
 *   consolidado usado no Estado Político/Termômetro — aqui "mais alto" é bom).
 * - Temperatura: nível atual de tensão (rótulo qualitativo, não numérico).
 * - Tendência: direção temporal do volume monitorado.
 * - Alertas Ativos: volume de ocorrências relevantes (contagem, não severidade).
 * - Volume Total: dimensão bruta da base monitorada no período.
 */
export default function OverviewKPI({ score_geral, temperatura_geral, tendencia, alertas_ativos, volume_total }: KPIProps) {
  const getTempColor = (t: string) => {
    switch (t) {
      case 'crítica': return 'text-red-500';
      case 'quente': return 'text-orange-500';
      case 'morna': return 'text-yellow-500';
      default: return 'text-cyan-400';
    }
  };

  const getTrendIcon = (t: string) => {
    switch (t) {
      case 'subindo': return <TrendingUp className="text-green-500" size={18} />;
      case 'caindo': return <TrendingDown className="text-red-500" size={18} />;
      default: return <Minus className="text-slate-400" size={18} />;
    }
  };

  return (
    // sm: 2 colunas (mobile grande); md/tablet: 3+2 (evita o 2º card sozinho
    // numa linha, que acontecia indo direto de 2 para 5 colunas); lg+: 5
    // numa única fileira.
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Score Geral */}
      <div
        className="surface-primary px-4 py-3 h-[84px] flex flex-col justify-between group hover:border-cyan-400/20 transition-colors"
        title="Consolidação sintética operacional — inverso do risco consolidado usado no Estado Político e no Termômetro de Crise (100 − risco)."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Score de Saúde</span>
          <Activity className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className="text-2xl font-bold text-white leading-none">{score_geral}<span className="text-xs text-slate-500 ml-1 font-normal">/100</span></div>
        <div className="text-[10px] text-cyan-400/70 font-medium truncate">Consolidação sintética operacional</div>
      </div>

      {/* Temperatura */}
      <div
        className="surface-primary px-4 py-3 h-[84px] flex flex-col justify-between group hover:border-orange-400/20 transition-colors"
        title="Nível atual de tensão — rótulo qualitativo derivado do mesmo score de crise, sem a classificação executiva do Estado Político."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Temperatura</span>
          <Thermometer className="text-orange-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className={`text-2xl font-bold capitalize leading-none ${getTempColor(temperatura_geral)}`}>
          {temperatura_geral}
        </div>
        <div className="text-[10px] text-slate-500 font-medium truncate">Nível atual de tensão</div>
      </div>

      {/* Tendência */}
      <div
        className="surface-primary px-4 py-3 h-[84px] flex flex-col justify-between group hover:border-blue-400/20 transition-colors"
        title="Direção temporal do volume monitorado no período, comparado ao período imediatamente anterior."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Tendência</span>
          {getTrendIcon(tendencia)}
        </div>
        <div className="text-2xl font-bold text-white capitalize leading-none">
          {tendencia}
        </div>
        <div className="text-[10px] text-slate-500 font-medium truncate">Direção temporal do volume</div>
      </div>

      {/* Alertas */}
      <div
        className="surface-primary px-4 py-3 h-[84px] flex flex-col justify-between group hover:border-red-400/20 transition-colors"
        title="Volume de ocorrências relevantes (contagem) — a leitura de severidade fica em Riscos Prioritários e Alertas Prioritários."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Alertas Ativos</span>
          <AlertTriangle className="text-red-500 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className="text-2xl font-bold text-white leading-none">{alertas_ativos}</div>
        <div className="text-[10px] text-red-500/70 font-medium truncate">Volume de ocorrências relevantes</div>
      </div>

      {/* Volume */}
      <div
        className="surface-primary px-4 py-3 h-[84px] flex flex-col justify-between group hover:border-purple-400/20 transition-colors"
        title="Dimensão bruta da base monitorada (notícias + posts) no período selecionado."
      >
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Volume Total</span>
          <BarChart3 className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
        </div>
        <div className="text-2xl font-bold text-white leading-none">{volume_total.toLocaleString('pt-BR')}</div>
        <div className="text-[10px] text-slate-500 font-medium truncate">Dimensão da base monitorada</div>
      </div>
    </div>
  );
}
