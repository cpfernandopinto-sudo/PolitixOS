import React from 'react';
import { MapPin, Clock, Database, RefreshCw, Sparkles } from 'lucide-react';
import { TerritoryDossier, DataSourceMode } from '@/lib/territorios/types';

interface Props {
  dossier: TerritoryDossier;
}

export default function DossierHeader({ dossier }: Props) {
  const isDemo = Object.values(dossier.coverage).some(v => v === 'demo');
  
  // Format data
  const dateObj = new Date(dossier.lastUpdated);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dateObj);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {dossier.cityName} <span className="text-slate-400 font-medium">— {dossier.uf}</span>
            </h1>
            {isDemo && (
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mt-1">
                <Sparkles size={12} className="text-cyan-400" /> MVP • Ambiente demonstrativo
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm flex items-center gap-3">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-500" /> IBGE: {dossier.ibgeCode}</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-500" /> Atualizado em {formattedDate}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <button 
            className="group flex items-center gap-2 px-3 py-1.5 bg-[#111726] hover:bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors"
            title="Atualização automática será conectada ao Motor Territorial."
          >
            <RefreshCw size={14} className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
            <span className="font-medium">Atualizar análise</span>
          </button>
          
          {/* Coverage Badges Discretas */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <CoverageBadge label="IBGE" status={dossier.coverage.ibge} />
            <CoverageBadge label="Segurança" status={dossier.coverage.security} />
            <CoverageBadge label="Saúde" status={dossier.coverage.health} />
            <CoverageBadge label="TSE" status={dossier.coverage.electoral} />
            <CoverageBadge label="Economia" status={dossier.coverage.economy} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverageBadge({ label, status }: { label: string; status: DataSourceMode }) {
  const isDemo = status === 'demo';
  const isAvailable = status === 'real';
  const isUnavailable = status === 'unavailable' || status === 'error';

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide border ${
        isAvailable ? 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/10' :
        isDemo ? 'bg-blue-500/5 text-blue-400/80 border-blue-500/10' :
        'bg-slate-500/5 text-slate-400/80 border-white/5'
      }`}
      title={isDemo ? 'Fonte Demonstrativa' : isAvailable ? 'Fonte Real' : 'Indisponível'}
    >
      <Database size={10} className="opacity-60" />
      {label}
    </div>
  );
}
