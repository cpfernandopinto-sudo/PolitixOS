import React from 'react';
import { DemographyNotebook } from '@/lib/territorios/types';
import { Map, Users, Building2, TrendingUp } from 'lucide-react';

export default function PanoramaSection({ data }: { data: DemographyNotebook }) {
  const isDemo = data.mode === 'demo';

  return (
    <div className="surface-primary rounded-xl p-5 md:p-6 border border-white/5 relative h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Panorama Territorial
          {isDemo && <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-white/5 uppercase">Demo</span>}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MiniCard icon={Users} label="População" value={String(data.population.value)} />
        <MiniCard icon={Map} label="Densidade" value={String(data.density.value)} />
        <MiniCard icon={Building2} label="Urbanização" value={String(data.urbanization.value)} />
      </div>

      <div className="mt-auto">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribuição Etária</h4>
        <div className="flex items-end gap-2 h-20 items-stretch">
          {data.ageGroupDistrib.map((item: { group: string; percentage: number }, idx: number) => (
            <div key={idx} className="flex-1 flex flex-col justify-end gap-1 group relative">
              <div 
                className="w-full bg-blue-500/20 hover:bg-cyan-400/50 rounded-t transition-colors relative"
                style={{ height: `${item.percentage}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded transition-opacity">
                  {item.percentage}%
                </div>
              </div>
              <span className="text-[10px] text-center font-medium text-slate-400">{item.group}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-[#111726]/50 rounded-lg p-3 border border-white/[0.02]">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        <Icon size={14} className="opacity-70" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-200">
        {value}
      </div>
    </div>
  );
}
