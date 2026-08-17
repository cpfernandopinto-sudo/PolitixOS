'use client';

import {
  Building2,
  Vote,
  ShieldAlert,
  HeartPulse,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { Territory } from '@/lib/types/territories';

export type EngineStatusType =
  | 'disponivel'
  | 'coletado'
  | 'em_preparacao'
  | 'nao_coletado'
  | 'atualizacao_necessaria';

export interface TerritoryEngineStatusBoardProps {
  territory: Territory;
  hasDossier: boolean;
  customStatuses?: Partial<Record<'ibge' | 'tse' | 'seguranca' | 'saude' | 'economia', EngineStatusType>>;
}

interface EngineDefinition {
  id: 'ibge' | 'tse' | 'seguranca' | 'saude' | 'economia';
  name: string;
  category: string;
  icon: React.ElementType;
  description: string;
}

const ENGINES: EngineDefinition[] = [
  {
    id: 'ibge',
    name: 'Perfil Territorial / IBGE',
    category: 'Demografia & Território',
    icon: Building2,
    description: 'População, densidade demográfica, pirâmide etária e infraestrutura básica.',
  },
  {
    id: 'tse',
    name: 'Contexto Eleitoral / TSE',
    category: 'Eleições & Eleitorado',
    icon: Vote,
    description: 'Histórico eleitoral, comparecimento, abstenção e distribuição de votos.',
  },
  {
    id: 'seguranca',
    name: 'Segurança Pública',
    category: 'Indicadores de Segurança',
    icon: ShieldAlert,
    description: 'Evolução de ocorrências, crimes violentos, patrimoniais e índices.',
  },
  {
    id: 'saude',
    name: 'Saúde Pública / CNES',
    category: 'Infraestrutura de Saúde',
    icon: HeartPulse,
    description: 'Cobertura da atenção básica, leitos SUS, médicos e leitos UTI.',
  },
  {
    id: 'economia',
    name: 'Economia & Finanças',
    category: 'PIB & Trabalho',
    icon: TrendingUp,
    description: 'PIB municipal, renda per capita, composição setorial e empregos.',
  },
];

function getStatusBadge(status: EngineStatusType) {
  switch (status) {
    case 'disponivel':
    case 'coletado':
      return {
        label: 'Disponível',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        Icon: CheckCircle2,
      };
    case 'em_preparacao':
      return {
        label: 'Em preparação',
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        Icon: Clock,
      };
    case 'atualizacao_necessaria':
      return {
        label: 'Atualização pendente',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        Icon: AlertCircle,
      };
    case 'nao_coletado':
    default:
      return {
        label: 'Não coletado',
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/20',
        Icon: HelpCircle,
      };
  }
}

export default function TerritoryEngineStatusBoard({
  territory,
  hasDossier,
  customStatuses = {},
}: TerritoryEngineStatusBoardProps) {
  // Default rule for demo/pre-loaded: Contagem (3118601) has full dossier available, others show em_preparacao or nao_coletado
  const getEngineStatus = (id: 'ibge' | 'tse' | 'seguranca' | 'saude' | 'economia'): EngineStatusType => {
    if (customStatuses[id]) return customStatuses[id]!;
    if (hasDossier) {
      if (id === 'ibge' || id === 'tse' || id === 'seguranca') return 'disponivel';
      if (id === 'saude') return 'disponivel';
      return 'em_preparacao';
    }
    return 'nao_coletado';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            Disponibilidade dos Motores Territoriais
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Status da base de inteligência carregada para {territory.municipio}/{territory.uf} (IBGE {territory.codigo_ibge})
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono">
            PolitixOS Multi-Engine v1.0
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ENGINES.map((engine) => {
          const statusKey = getEngineStatus(engine.id);
          const badge = getStatusBadge(statusKey);
          const IconComp = engine.icon;
          const BadgeIcon = badge.Icon;

          return (
            <div
              key={engine.id}
              className="bg-[#0B0F19] border border-white/10 hover:border-cyan-500/30 rounded-xl p-3.5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-white/5 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 text-gray-300 transition-colors">
                    <IconComp size={16} />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    <BadgeIcon size={12} />
                    {badge.label}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  {engine.name}
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                  {engine.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                <span>{engine.category}</span>
                <span className="font-mono text-[10px] text-gray-400">
                  {statusKey === 'disponivel' || statusKey === 'coletado' ? 'Ativo' : 'Pendente'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
