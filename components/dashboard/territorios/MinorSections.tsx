import React from 'react';
import { HealthNotebook, ElectoralNotebook, EconomyNotebook, LocalRadarData, RiskOpportunityBoardData } from '@/lib/territorios/types';
import { HeartPulse, Vote, Landmark, Newspaper, AlertTriangle, Lightbulb } from 'lucide-react';

export function HealthSection({ data }: { data: HealthNotebook }) {
  return (
    <GenericSection title="Saúde" icon={HeartPulse} isDemo={data.mode === 'demo'}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Metric label="Cobertura Básica" value={String(data.basicCoverage.value)} />
        <Metric label="Demanda Hospitalar" value={data.hospitalDemand} color="text-amber-400" />
      </div>
      <div className="mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Pontos de Pressão</span>
        <div className="flex flex-wrap gap-2">
          {data.mainPressurePoints.map((pt: string, i: number) => (
            <span key={i} className="px-2 py-1 bg-[#111726] border border-white/5 rounded text-xs text-slate-300">{pt}</span>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
        <span className="font-semibold text-slate-300">Status Qualitativo:</span> {data.statusQualitative}
      </p>
    </GenericSection>
  );
}

export function ElectoralSection({ data }: { data: ElectoralNotebook }) {
  return (
    <GenericSection title="Perfil Eleitoral" icon={Vote} isDemo={data.mode === 'demo'}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Metric label="Eleitorado" value={String(data.electorate.value)} />
        <Metric label="Comparecimento" value={String(data.participation.value)} />
        <Metric label="Abstenção" value={String(data.abstention.value)} />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
        <span className="font-semibold text-slate-300">Histórico:</span> {data.historicalTrend}
      </p>
    </GenericSection>
  );
}

export function EconomySection({ data }: { data: EconomyNotebook }) {
  return (
    <GenericSection title="Economia" icon={Landmark} isDemo={data.mode === 'demo'}>
      <div className="space-y-4">
        <Metric label="Atividade Principal" value={data.mainActivity} />
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Tendência Emprego" value={data.employmentTrend} color="text-emerald-400" />
          <Metric label="Dependência Setor Público" value={data.dependencyOnPublicServices} />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Setores Predominantes</span>
          <div className="flex flex-wrap gap-2">
            {data.predominantSectors.map((sec: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-[#111726] border border-white/5 rounded text-xs text-slate-300">{sec}</span>
            ))}
          </div>
        </div>
      </div>
    </GenericSection>
  );
}

export function LocalRadar({ data }: { data: LocalRadarData }) {
  return (
    <GenericSection title="Acontecimentos Recentes" icon={Newspaper} isDemo={data.mode === 'demo'}>
      <div className="space-y-4">
        {data.items.map((item) => (
          <div key={item.id} className="p-4 bg-[#111726]/40 rounded-lg border border-white/[0.04] hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">{item.theme}</span>
              <span className="text-[11px] text-slate-500 font-medium">{item.source} • {item.date}</span>
            </div>
            <p className="text-[15px] text-slate-200 font-semibold leading-relaxed">{item.title}</p>
          </div>
        ))}
      </div>
    </GenericSection>
  );
}

export function RiskOpportunityBoard({ data }: { data: RiskOpportunityBoardData }) {
  const isDemo = data.mode === 'demo';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="surface-primary rounded-xl p-6 md:p-8 border border-amber-500/10 relative shadow-[0_0_15px_-10px_rgba(245,158,11,0.1)]">
        <h3 className="text-xl font-bold text-amber-400 tracking-tight flex items-center gap-2 mb-6">
          <AlertTriangle size={20} />
          Riscos / Alertas
          {isDemo && <span className="text-[9px] font-semibold text-amber-500/60 uppercase ml-auto bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">Demo</span>}
        </h3>
        <div className="space-y-4">
          {data.risks.map(r => (
            <div key={r.id} className="bg-[#111726]/50 p-5 rounded-lg border border-amber-500/10 hover:border-amber-500/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-[15px] font-bold text-slate-200 leading-snug pr-4">{r.title}</h4>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded shrink-0">{r.priority}</span>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-3">{r.description}</p>
              <div className="text-[11px] text-slate-500 border-t border-white/5 pt-2.5 flex items-start gap-1.5 mt-2">
                <span className="font-semibold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Evidência:</span> 
                <span className="leading-relaxed">{r.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-primary rounded-xl p-6 md:p-8 border border-emerald-500/10 relative shadow-[0_0_15px_-10px_rgba(16,185,129,0.1)]">
        <h3 className="text-xl font-bold text-emerald-400 tracking-tight flex items-center gap-2 mb-6">
          <Lightbulb size={20} />
          Oportunidades
          {isDemo && <span className="text-[9px] font-semibold text-emerald-500/60 uppercase ml-auto bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Demo</span>}
        </h3>
        <div className="space-y-4">
          {data.opportunities.map(o => (
            <div key={o.id} className="bg-[#111726]/50 p-5 rounded-lg border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-[15px] font-bold text-slate-200 leading-snug pr-4">{o.title}</h4>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded shrink-0">{o.priority}</span>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-3">{o.description}</p>
              <div className="text-[11px] text-slate-500 border-t border-white/5 pt-2.5 flex items-start gap-1.5 mt-2">
                <span className="font-semibold uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Evidência:</span> 
                <span className="leading-relaxed">{o.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper components
function GenericSection({ title, icon: Icon, isDemo, children }: any) {
  return (
    <div className="surface-primary rounded-xl p-5 md:p-6 border border-white/5 relative h-full flex flex-col hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Icon size={18} className="text-cyan-400" />
          {title}
          {isDemo && <span className="text-[9px] font-semibold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase ml-1">Demo</span>}
        </h3>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value, color = "text-slate-200" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
