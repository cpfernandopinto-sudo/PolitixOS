import React from 'react';
import { AIRecommendationData, FieldBriefingItem } from '@/lib/territorios/types';
import { Sparkles, Map, Ear, AlertTriangle, MessageSquare, Calendar, ChevronRight } from 'lucide-react';

export default function AIRecommendation({ data }: { data: AIRecommendationData }) {
  const isDemo = data.mode === 'demo';

  return (
    <div className="surface-primary rounded-xl p-6 md:p-10 border border-violet-500/30 shadow-[0_0_40px_-15px_rgba(139,92,246,0.2)] relative overflow-hidden">
      {/* Decoração bg */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 border-b border-violet-500/20 pb-6">
        <div>
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block mb-2">Recomendação Estratégica</span>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Map className="text-violet-400" size={28} />
            Briefing de Campo
          </h2>
          <p className="text-slate-300 mt-2 text-[15px]">
            Se a visita fosse hoje, estas são as diretrizes de ação da <span className="text-violet-400 font-semibold">Politix IA</span>.
          </p>
        </div>
        {isDemo && (
          <span className="text-[10px] font-semibold text-violet-400/80 bg-violet-400/10 px-3 py-1 rounded border border-violet-400/20 uppercase tracking-wider">
            MVP • Ambiente demonstrativo
          </span>
        )}
      </div>

      <div className="relative z-10">
        {/* Destaque Principal */}
        <div className="bg-violet-950/30 border border-violet-500/20 p-6 rounded-xl mb-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-violet-500/20 rounded-lg">
              <Sparkles className="text-violet-400" size={24} />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-violet-400 uppercase tracking-widest mb-2">Abra falando sobre</h3>
              <p className="text-lg font-medium text-white leading-relaxed">{data.priorityTheme.text}</p>
              {data.priorityTheme.traceability && (
                <div className="mt-3 text-[11px] font-medium text-violet-300/70 flex items-center gap-1.5">
                  <ChevronRight size={12} />
                  <span>Por que:</span> <span className="text-violet-300">{data.priorityTheme.traceability}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          <div className="space-y-10">
            <Section 
              title="Escute Principalmente" 
              items={data.listenTo} 
              icon={Ear} 
              color="text-amber-400" 
              bgColor="bg-amber-500/10" 
              borderColor="border-amber-500/20"
            />
            <Section 
              title="Perguntas Poderosas para Fazer" 
              items={data.powerfulQuestions} 
              icon={MessageSquare} 
              color="text-blue-400" 
              bgColor="bg-blue-500/10" 
              borderColor="border-blue-500/20"
            />
          </div>

          <div className="space-y-10">
            <Section 
              title="Não Caia Nesta Armadilha" 
              items={data.avoidPitfalls} 
              icon={AlertTriangle} 
              color="text-rose-400" 
              bgColor="bg-rose-500/10" 
              borderColor="border-rose-500/20"
            />
            <Section 
              title="Mensagens com Potencial" 
              items={data.tractionMessages} 
              icon={Sparkles} 
              color="text-emerald-400" 
              bgColor="bg-emerald-500/10" 
              borderColor="border-emerald-500/20"
            />
            <Section 
              title="Oportunidades de Agenda" 
              items={data.agendaOpportunities} 
              icon={Calendar} 
              color="text-cyan-400" 
              bgColor="bg-cyan-500/10" 
              borderColor="border-cyan-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, icon: Icon, color, bgColor, borderColor }: any) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-[14px] font-bold text-white mb-5 flex items-center gap-3 tracking-wide uppercase">
        <span className={`p-2 rounded-lg ${bgColor} ${borderColor} border shadow-lg`}>
          <Icon size={16} className={color} />
        </span>
        {title}
      </h3>
      <ul className="space-y-5">
        {items.map((item: FieldBriefingItem, idx: number) => (
          <li key={idx} className="flex items-start gap-4 group">
            <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${bgColor} border ${borderColor} group-hover:scale-150 transition-transform`} />
            <div>
              <span className="text-[15px] text-slate-300 leading-relaxed font-medium">{item.text}</span>
              {item.traceability && (
                <div className="mt-1.5 text-[10px] font-semibold text-slate-500 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={10} />
                  <span>{item.traceability}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
