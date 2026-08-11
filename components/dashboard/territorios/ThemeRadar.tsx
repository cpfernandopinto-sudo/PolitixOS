import React from 'react';
import { ThemeRadarData } from '@/lib/territorios/types';
import { Radio } from 'lucide-react';

export default function ThemeRadar({ data }: { data: ThemeRadarData }) {
  const isDemo = data.mode === 'demo';

  // Sort by intensity descending
  const sortedThemes = [...data.themes].sort((a, b) => b.intensity - a.intensity);

  return (
    <div className="surface-primary rounded-xl p-5 md:p-6 border border-white/5 relative h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Radio size={18} className="text-cyan-400" />
          Radar de Temas
          {isDemo && <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded border border-white/5 uppercase">Demo</span>}
        </h3>
      </div>

      <div className="space-y-5 flex-1 mt-2">
        {sortedThemes.map((item, idx) => (
          <div key={idx} className="space-y-2 group">
            <div className="flex justify-between items-end">
              <span className="text-[14px] font-bold text-slate-200 group-hover:text-white transition-colors">{item.theme}</span>
              <span className="text-[11px] font-black text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">{item.intensity} / 100</span>
            </div>
            
            <div className="h-2 w-full bg-[#111726] rounded-full overflow-hidden border border-white/[0.05]">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-300 rounded-full group-hover:brightness-110 transition-all"
                style={{ width: `${item.intensity}%` }}
              />
            </div>
            
            <div className="flex gap-4 pt-0.5">
              <span className="text-[11px] text-slate-500"><span className="text-slate-400 font-medium">Relevância:</span> {item.relevance}</span>
              <span className="text-[11px] text-slate-500"><span className="text-slate-400 font-medium">Presença:</span> {item.presence}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
