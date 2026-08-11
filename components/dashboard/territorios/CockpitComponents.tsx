import React from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, MapPin } from 'lucide-react';

export function ChangeAnalysis({ 
  whatChanged, 
  improving, 
  worsening 
}: { 
  whatChanged?: Array<{theme: string; trend: 'up'|'down'|'stable'; description: string}>;
  improving?: string[];
  worsening?: string[];
}) {
  if (!whatChanged || whatChanged.length === 0) return null;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 mb-8 mt-8">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={16} className="text-cyan-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          O Que Mudou
        </h3>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5 uppercase ml-2">
          Últimos 12 Meses
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {whatChanged.map((item, idx) => (
          <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {item.trend === 'up' && <TrendingUp size={16} className="text-emerald-400" />}
              {item.trend === 'down' && <TrendingDown size={16} className="text-rose-400" />}
              {item.trend === 'stable' && <Minus size={16} className="text-slate-400" />}
              <span className="text-xs font-bold text-slate-300 uppercase">{item.theme}</span>
            </div>
            <p className="text-sm font-medium text-slate-400 leading-snug">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {(improving?.length || worsening?.length) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
          {improving && improving.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">O Que Está Melhorando</h4>
              <ul className="space-y-2">
                {improving.map((item, idx) => (
                  <li key={idx} className="text-xs font-medium text-slate-300 flex items-start gap-2">
                    <TrendingUp size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {worsening && worsening.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3">O Que Está Piorando</h4>
              <ul className="space-y-2">
                {worsening.map((item, idx) => (
                  <li key={idx} className="text-xs font-medium text-slate-300 flex items-start gap-2">
                    <TrendingDown size={12} className="text-rose-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TerritoryHeader({ 
  cityName, 
  uf, 
  ibgeCode, 
  population, 
  lastUpdated 
}: {
  cityName: string;
  uf: string;
  ibgeCode: string;
  population: string;
  lastUpdated: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="text-cyan-500" size={24} />
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
            {cityName}
            <span className="text-cyan-500 ml-2">— {uf}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-white/5">
            IBGE: {ibgeCode}
          </span>
          <span className="text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-white/5">
            População: {population}
          </span>
          <span className="text-slate-500 flex items-center gap-1">
            <Clock size={12} /> Atualizado em {new Date(lastUpdated).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  );
}
