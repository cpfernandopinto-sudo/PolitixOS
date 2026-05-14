'use client';

import { Brain, Lightbulb, Target, Shield } from 'lucide-react';

interface StrategicAction {
  ação: string;
  justificativa: string;
  canal: string;
}

interface Props {
  actions: StrategicAction[];
}

export default function OverviewStrategicMap({ actions }: Props) {
  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Brain className="text-cyan-400" size={24} />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Mapa de Ação Estratégica</h3>
          <p className="text-gray-500 text-xs tracking-wide uppercase font-bold">Recomendações baseadas em IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-5 hover:border-cyan-500/30 transition-all flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {i === 0 ? <Shield className="text-red-400" size={18} /> :
                  i === 1 ? <Target className="text-orange-400" size={18} /> :
                    <Lightbulb className="text-yellow-400" size={18} />}
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{action.canal}</span>
              </div>
            </div>

            <h4 className="text-white font-bold text-base mb-2 group-hover:text-cyan-400 transition-colors">
              {action.ação}
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {action.justificativa}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
