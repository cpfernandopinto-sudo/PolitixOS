import React from 'react';
import { Target, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { TerritoryDiagnostic } from '@/lib/territorios/types';

export default function StrategicSynthesis({ data }: { data: TerritoryDiagnostic }) {
  const isDemo = data.mode === 'demo';

  return (
    <div className="surface-primary rounded-xl p-6 md:p-8 border border-white/10 relative overflow-hidden group shadow-[0_0_20px_-10px_rgba(255,255,255,0.05)] hover:border-white/20 transition-colors">
      {/* Decoração bg */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-[60px] group-hover:bg-cyan-500/20 transition-colors" />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles size={22} className="text-cyan-400" />
            Síntese Politix IA
            {isDemo && <span className="text-[10px] font-semibold text-cyan-400/80 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 ml-2">DEMO</span>}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 lg:col-span-9">
          <p className="text-slate-300 leading-relaxed text-[15px] max-w-4xl">
            {data.diagnosis}
          </p>
        </div>
        
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-3">
          <Badge label="Prioridade estratégica" value={data.politicalPriority} icon={Target} color="blue" />
          <Badge label="Nível de atenção" value={data.attentionLevel} icon={AlertTriangle} color="amber" />
          <Badge label="Tendência" value={data.trend} icon={TrendingUp} color="emerald" />
        </div>
      </div>
    </div>
  );
}

function Badge({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: 'blue' | 'amber' | 'emerald' | 'rose' }) {
  const colorStyles = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
        <Icon size={14} className="opacity-70" />
        {label}
      </div>
      <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${colorStyles[color]}`}>
        {value}
      </div>
    </div>
  );
}
