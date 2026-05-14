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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Score Geral */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 flex flex-col justify-between group hover:border-cyan-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Score de Saúde</span>
          <Activity className="text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className="text-3xl font-bold text-white mb-1">{score_geral}<span className="text-sm text-gray-500 ml-1">/100</span></div>
          <div className="text-xs text-cyan-400/70 font-medium">Consolidado estratégica</div>
        </div>
      </div>

      {/* Temperatura */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 flex flex-col justify-between group hover:border-orange-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Temperatura</span>
          <Thermometer className="text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className={`text-2xl font-bold capitalize mb-1 ${getTempColor(temperatura_geral)}`}>
            {temperatura_geral}
          </div>
          <div className="text-xs text-gray-500 font-medium">Nível de tensão atual</div>
        </div>
      </div>

      {/* Tendência */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Tendência</span>
          {getTrendIcon(tendencia)}
        </div>
        <div>
          <div className="text-2xl font-bold text-white mb-1 capitalize">
            {tendencia}
          </div>
          <div className="text-xs text-gray-500 font-medium">Evolução do engajamento</div>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 flex flex-col justify-between group hover:border-red-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Alertas Ativos</span>
          <AlertTriangle className="text-red-500 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className="text-3xl font-bold text-white mb-1">{alertas_ativos}</div>
          <div className="text-xs text-red-500/70 font-medium">Itens prioritários</div>
        </div>
      </div>

      {/* Volume */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 flex flex-col justify-between group hover:border-purple-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Volume Total</span>
          <BarChart3 className="text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" size={20} />
        </div>
        <div>
          <div className="text-3xl font-bold text-white mb-1">{volume_total.toLocaleString()}</div>
          <div className="text-xs text-gray-500 font-medium">Menções + Posts</div>
        </div>
      </div>
    </div>
  );
}
