import React from 'react';
import { TerritoryKPIs as TerritoryKPIsData } from '@/lib/territorios/types';
import { Users, Activity, Target, AlertTriangle, ShieldAlert, HeartPulse } from 'lucide-react';

export default function TerritoryKPIs({ data }: { data: TerritoryKPIsData }) {
  const isDemo = data.mode === 'demo';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard 
        label="População" 
        value={data.population} 
        icon={Users} 
        isDemo={isDemo} 
      />
      <KPICard 
        label="Indicadores analisados" 
        value={data.analyzedIndicators.toString()} 
        icon={Activity} 
        isDemo={isDemo} 
      />
      <KPICard 
        label="Prioridade territorial" 
        value={data.priority} 
        icon={Target} 
        isDemo={isDemo} 
        colorClass="text-blue-400"
      />
      <KPICard 
        label="Risco geral" 
        value={data.generalRisk} 
        icon={AlertTriangle} 
        isDemo={isDemo} 
        colorClass="text-amber-400"
      />
      <KPICard 
        label="Segurança" 
        value={data.securityStatus} 
        icon={ShieldAlert} 
        isDemo={isDemo} 
        colorClass="text-amber-400"
      />
      <KPICard 
        label="Saúde" 
        value={data.healthStatus} 
        icon={HeartPulse} 
        isDemo={isDemo} 
        colorClass="text-rose-400"
      />
    </div>
  );
}

function KPICard({ label, value, icon: Icon, isDemo, colorClass = "text-white" }: { label: string; value: string; icon: any; isDemo: boolean; colorClass?: string }) {
  return (
    <div className="surface-primary rounded-xl p-4 md:p-5 border border-white/5 flex flex-col justify-between min-h-[104px] relative group hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-2xl font-black tracking-tight ${colorClass}`}>{value}</span>
      </div>
      {isDemo && (
        <div className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800/50 px-1.5 py-0.5 rounded">Demo</span>
        </div>
      )}
    </div>
  );
}
