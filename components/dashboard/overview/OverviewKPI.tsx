'use client';

import { Activity, AlertTriangle, BarChart3, Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIProps {
  score_geral: number;
  temperatura_geral: string;
  tendencia: string;
  alertas_ativos: number;
  volume_total: number;
}

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
      default: return <Minus className="text-gray-400" size={18} />;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Score Geral */}
      <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl px-4 py-3.5 flex flex-col justify-between group hover:border-cyan-500/30 transition-all shadow-[0_14px_35px_rgba(0,0,0,.16)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Score de Saúde</span>
          <Activity className="text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{score_geral}<span className="text-xs text-gray-500 ml-1">/100</span></div>
          <div className="text-[10px] text-cyan-400/70 font-medium">Consolidação estratégica</div>
        </div>
      </div>

      {/* Temperatura */}
      <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl px-4 py-3.5 flex flex-col justify-between group hover:border-orange-500/30 transition-all shadow-[0_14px_35px_rgba(0,0,0,.16)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Temperatura</span>
          <Thermometer className="text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className={`text-xl font-bold capitalize ${getTempColor(temperatura_geral)}`}>
            {temperatura_geral}
          </div>
          <div className="text-[10px] text-gray-500 font-medium">Nível de tensão atual</div>
        </div>
      </div>

      {/* Tendência */}
      <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl px-4 py-3.5 flex flex-col justify-between group hover:border-blue-500/30 transition-all shadow-[0_14px_35px_rgba(0,0,0,.16)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Tendência</span>
          {getTrendIcon(tendencia)}
        </div>
        <div>
          <div className="text-xl font-bold text-white capitalize">
            {tendencia}
          </div>
          <div className="text-[10px] text-gray-500 font-medium">Evolução do engajamento</div>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl px-4 py-3.5 flex flex-col justify-between group hover:border-red-500/30 transition-all shadow-[0_14px_35px_rgba(0,0,0,.16)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Alertas Ativos</span>
          <AlertTriangle className="text-red-500 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{alertas_ativos}</div>
          <div className="text-[10px] text-red-500/70 font-medium">Itens prioritários</div>
        </div>
      </div>

      {/* Volume */}
      <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl px-4 py-3.5 flex flex-col justify-between group hover:border-purple-500/30 transition-all shadow-[0_14px_35px_rgba(0,0,0,.16)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Volume Total</span>
          <BarChart3 className="text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{volume_total.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 font-medium">Menções + Posts</div>
        </div>
      </div>
    </div>
  );
}
