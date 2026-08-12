import React from 'react';
import { MapPin, Clock, Database, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { TerritoryDossier, DataSourceMode } from '@/lib/territorios/types';

interface Props {
  dossier: TerritoryDossier;
}

export default function DossierHeader({ dossier }: Props) {
  const isDemo = Object.values(dossier.coverage).some(v => v === 'demo');
  const dateObj = new Date(dossier.lastUpdated);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dateObj);

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 py-1.5 px-1 bg-[var(--background)]">
      <div className="flex flex-wrap items-center gap-4">
        {/* NOME DO TERRITÓRIO E LABEL */}
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-slate-500 hidden sm:block" />
          <h1 className="text-[13px] font-bold text-white tracking-wide">
            {dossier.cityName} <span className="text-slate-500 font-medium">— {dossier.uf}</span>
          </h1>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest text-slate-500 uppercase bg-white/5 ml-1 border border-white/5">
            Território
          </span>
        </div>
        
        <div className="hidden sm:block w-px h-3.5 bg-white/10" />
        
        {/* METADADOS BÁSICOS */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1"><MapPin size={11} className="text-slate-500" /> IBGE: {dossier.ibgeCode}</span>
          <span className="flex items-center gap-1"><Clock size={11} className="text-slate-500" /> {formattedDate}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* BADGES */}
        {isDemo && (
          <span className="px-1.5 py-0.5 rounded-sm bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
            <Sparkles size={9} /> DEMO
          </span>
        )}

        <div className="hidden lg:flex items-center gap-1 border-l border-white/10 pl-3">
          <CoverageBadge label="IBGE" status={dossier.coverage.ibge} />
          <CoverageBadge label="Seg." status={dossier.coverage.security} />
          <CoverageBadge label="Saúde" status={dossier.coverage.health} />
          <CoverageBadge label="TSE" status={dossier.coverage.electoral} />
          <CoverageBadge label="Econ." status={dossier.coverage.economy} />
        </div>

        {/* ATUALIZAR */}
        <button 
          className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[10px] font-semibold text-slate-300 transition-colors uppercase tracking-widest ml-1"
          title="Atualização automática será conectada ao Motor Territorial."
        >
          <RefreshCw size={10} className="text-slate-400" />
          <span>Atualizar</span>
        </button>
      </div>
    </div>
  );
}

function CoverageBadge({ label, status }: { label: string; status: DataSourceMode }) {
  const isDemo = status === 'demo';
  const isAvailable = status === 'real';

  return (
    <div 
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-widest uppercase border ${
        isAvailable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
        isDemo ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
        'bg-slate-500/10 text-slate-400 border-white/5'
      }`}
      title={isDemo ? 'Fonte Demonstrativa' : isAvailable ? 'Fonte Real' : 'Indisponível'}
    >
      <Database size={8} className="opacity-70" />
      {label}
    </div>
  );
}
