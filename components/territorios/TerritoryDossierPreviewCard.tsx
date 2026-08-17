'use client';

import {
  FolderOpen,
  LayoutDashboard,
  Users,
  Vote,
  ShieldAlert,
  HeartPulse,
  TrendingUp,
  BrainCircuit,
  ArrowRight,
} from 'lucide-react';
import type { Territory } from '@/lib/types/territories';

interface Props {
  territory: Territory;
  onOpenDossier: () => void;
}

const NOTEBOOK_PREVIEWS = [
  { id: 'cockpit', name: 'Visão Executiva', icon: LayoutDashboard, tag: 'Cockpit' },
  { id: 'demografia', name: 'Demografia & Território', icon: Users, tag: 'IBGE' },
  { id: 'eleitoral', name: 'Contexto Eleitoral', icon: Vote, tag: 'TSE' },
  { id: 'seguranca', name: 'Segurança Pública', icon: ShieldAlert, tag: 'SESP/IBGE' },
  { id: 'saude', name: 'Infraestrutura Saúde', icon: HeartPulse, tag: 'CNES' },
  { id: 'economia', name: 'Economia & Finanças', icon: TrendingUp, tag: 'CAGED/IBGE' },
  { id: 'inteligencia', name: 'Inteligência Política', icon: BrainCircuit, tag: 'Síntese IA' },
];

export default function TerritoryDossierPreviewCard({ territory, onOpenDossier }: Props) {
  return (
    <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Dossiê Carregado
            </span>
            <span className="text-xs text-gray-400 font-mono">IBGE: {territory.codigo_ibge}</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            Dossiê de Inteligência Territorial — {territory.municipio}/{territory.uf}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Cadernos temáticos consolidados para leitura de cenário, diagnóstico e preparação estratégica.
          </p>
        </div>

        <button
          onClick={onOpenDossier}
          className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0B0F19] font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 group"
        >
          <FolderOpen size={17} />
          <span>Abrir Briefing Territorial</span>
          <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Cadernos Temáticos Grid Preview */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
          Cadernos Temáticos Disponíveis no Dossiê:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {NOTEBOOK_PREVIEWS.map((nb) => {
            const IconComp = nb.icon;
            const isAI = nb.id === 'inteligencia';

            return (
              <button
                key={nb.id}
                onClick={onOpenDossier}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer ${
                  isAI
                    ? 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400 text-cyan-300'
                    : 'bg-white/[0.03] border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <IconComp size={16} className={isAI ? 'text-cyan-400' : 'text-gray-400'} />
                  <span className="text-[9px] font-mono text-gray-500 uppercase">{nb.tag}</span>
                </div>
                <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                  {nb.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
