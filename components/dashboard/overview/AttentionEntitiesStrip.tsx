'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Filter } from 'lucide-react';
import type { EntityRankItem } from '@/lib/analytics/executive-summary';
import { getInitials, getAvatarColorClass } from '@/lib/ui/avatar';

interface Props {
  entities: EntityRankItem[];
}

const HIGH_RISK = new Set(['alto', 'critico']);
const MAX_VISIBLE = 5;

function chipTitle(entity: EntityRankItem) {
  const parts = [`${entity.volume} menções`];
  if (entity.sentimentoPredominante) parts.push(`sentimento predominante: ${entity.sentimentoPredominante}`);
  if (entity.temaPrincipal) parts.push(`tema principal: ${entity.temaPrincipal}`);
  return `${entity.nome} — ${parts.join(', ')}`;
}

function EntityChip({ entity, onFilter }: { entity: EntityRankItem; onFilter: (targetId: string) => void }) {
  const highRisk = entity.riscoPredominante ? HIGH_RISK.has(entity.riscoPredominante.toLowerCase()) : false;
  const border = highRisk ? 'border-red-500/25' : 'border-white/[0.08]';

  const inner = (
    <>
      <span
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColorClass(entity.nome)}`}
        aria-hidden="true"
      >
        {getInitials(entity.nome)}
      </span>
      <span className="text-xs font-semibold text-white truncate max-w-[120px]">{entity.nome}</span>
      <span className="text-[10px] text-slate-500 shrink-0">
        {entity.alertas} alerta{entity.alertas === 1 ? '' : 's'}
      </span>
      {entity.riscoPredominante && (
        <span
          className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${
            highRisk ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.06] text-slate-400'
          }`}
        >
          {entity.riscoPredominante}
        </span>
      )}
    </>
  );

  if (!entity.targetId) {
    return (
      <div
        className={`flex items-center gap-2 rounded border px-2.5 py-1 bg-white/[0.02] ${border}`}
        title={chipTitle(entity)}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onFilter(entity.targetId!)}
      aria-label={`Filtrar por ${entity.nome}`}
      title={chipTitle(entity)}
      className={`group flex items-center gap-2 rounded border px-2.5 py-1 bg-white/[0.02] hover:bg-white/[0.05] transition-colors ${border} ${
        highRisk ? 'hover:border-red-500/40' : 'hover:border-cyan-400/30'
      }`}
    >
      {inner}
      <Filter size={10} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
    </button>
  );
}

/**
 * Faixa compacta de Entidades em Atenção (Sprint UX — Etapa 1). Substitui o
 * antigo card grande de 2 colunas (Entidades + Temas em Atenção): o painel de
 * Temas foi removido por ser duplicado de Temas Dominantes
 * (OverviewTopics.tsx) — mesma fonte (getDominantTopics), mesmo critério de
 * ranking (frequência), sem informação exclusiva (o sentimento por tema já
 * aparece via cor da barra em Temas Dominantes).
 *
 * Não faz nenhuma consulta nova — `entities` já vem calculado por
 * `rankEntities` em `getExecutiveOverviewData` (Sprint 3, cacheado).
 */
export default function AttentionEntitiesStrip({ entities }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterByEntity = (targetId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('candidate', targetId);
    router.push(`?${params.toString()}`);
  };

  const visible = entities.slice(0, MAX_VISIBLE);

  return (
    <div className="surface-primary px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Users size={14} className="text-purple-400 shrink-0" aria-hidden="true" />
        <h3 className="text-white font-bold text-xs uppercase tracking-wider">Entidades em Atenção</h3>
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Nenhuma entidade identificada no período.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visible.map((e) => (
            <EntityChip key={e.nome} entity={e} onFilter={filterByEntity} />
          ))}
        </div>
      )}
    </div>
  );
}
