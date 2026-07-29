'use client';

import { Brain, Lightbulb, Target, Shield } from 'lucide-react';

interface StrategicAction {
  ação: string;
  justificativa: string;
  canal: string;
  count?: number;
}

interface Props {
  actions: StrategicAction[];
}

export default function OverviewStrategicMap({ actions }: Props) {
  const consolidated = actions.reduce<StrategicAction[]>((result, action) => {
    const normalized = action.ação.trim().toLocaleLowerCase('pt-BR');
    const existing = result.find((item) => item.ação.trim().toLocaleLowerCase('pt-BR') === normalized);
    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
      if (!existing.canal.split(' · ').includes(action.canal)) {
        existing.canal = `${existing.canal} · ${action.canal}`;
      }
      return result;
    }
    result.push({ ...action, count: 1 });
    return result;
  }, []);

  return (
    <div className="bg-[#0E1727] border border-blue-300/10 rounded-2xl p-6 h-full flex flex-col shadow-[0_18px_45px_rgba(0,0,0,.18)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Brain className="text-cyan-400" size={24} />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Mapa de Ação Estratégica</h3>
          <p className="text-gray-500 text-xs tracking-wide uppercase font-bold">Recomendações baseadas em IA</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${consolidated.length > 1 ? 'md:grid-cols-2 xl:grid-cols-3' : ''}`}>
        {consolidated.map((action, i) => (
          <div key={i} className="bg-[#131F33] border border-blue-300/10 rounded-xl p-5 hover:border-cyan-500/30 transition-all flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {i === 0 ? <Shield className="text-red-400" size={18} /> :
                  i === 1 ? <Target className="text-orange-400" size={18} /> :
                    <Lightbulb className="text-yellow-400" size={18} />}
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{action.canal}</span>
              </div>
              {(action.count ?? 1) > 1 && (
                <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                  {action.count} evidências
                </span>
              )}
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
