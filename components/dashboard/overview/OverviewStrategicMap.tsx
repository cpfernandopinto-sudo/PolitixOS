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
    <div className="surface-primary p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Brain className="text-cyan-400" size={20} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base tracking-tight">Mapa de Ação Estratégica</h3>
          <p className="text-slate-500 text-xs tracking-wide uppercase font-bold">Recomendações baseadas em IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, i) => (
          <div key={i} className="bg-blue-400/[0.05] border border-blue-300/10 rounded-lg p-4 hover:border-cyan-500/30 transition-colors flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {i === 0 ? <Shield className="text-red-400" size={18} /> :
                  i === 1 ? <Target className="text-orange-400" size={18} /> :
                    <Lightbulb className="text-yellow-400" size={18} />}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{action.canal}</span>
              </div>
            </div>

            <h4 className="text-white font-bold text-base mb-2 group-hover:text-cyan-400 transition-colors">
              {action.ação}
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              {action.justificativa}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
