'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Flame, Filter } from 'lucide-react';
import type { EntityRankItem, ThemeRankItem } from '@/lib/analytics/executive-summary';

interface Props {
  entities: EntityRankItem[];
  themes: ThemeRankItem[];
}

function EntityCard({ entity, onFilter }: { entity: EntityRankItem; onFilter: (targetId: string) => void }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white truncate">{entity.nome}</span>
        {entity.targetId && (
          <button
            type="button"
            onClick={() => onFilter(entity.targetId!)}
            className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
          >
            <Filter size={10} /> Filtrar
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
        <span>{entity.volume} menções</span>
        {entity.sentimentoPredominante && <span>Sentimento: {entity.sentimentoPredominante}</span>}
        {entity.riscoPredominante && <span>Risco: {entity.riscoPredominante}</span>}
        {entity.alertas > 0 && <span className="text-red-400 font-bold">{entity.alertas} alerta(s)</span>}
      </div>
      {entity.temaPrincipal && <p className="text-[10px] text-gray-600">Tema principal: {entity.temaPrincipal}</p>}
    </div>
  );
}

function ThemeCard({ theme }: { theme: ThemeRankItem }) {
  const sentimentLabel = theme.sentimento > 0.2 ? 'positivo' : theme.sentimento < -0.2 ? 'negativo' : 'neutro';
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4 space-y-2">
      <span className="text-sm font-semibold text-white truncate block">{theme.tema}</span>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span>{theme.frequencia} menções</span>
        <span>Sentimento: {sentimentLabel}</span>
      </div>
    </div>
  );
}

/**
 * Entidades e temas em atenção — dois painéis lado a lado (empilhados em
 * mobile), calculados sem consulta nova (ver rankEntities/rankThemes em
 * lib/analytics/executive-summary.ts).
 */
export default function AttentionEntitiesThemes({ entities, themes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterByEntity = (targetId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('candidate', targetId);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-bold text-base tracking-tight mb-4 flex items-center gap-2">
          <Users size={16} className="text-purple-400" /> Entidades em Atenção
        </h3>
        {entities.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-4 text-center">Nenhuma entidade identificada no período.</p>
        ) : (
          <div className="space-y-3">
            {entities.map((e) => <EntityCard key={e.nome} entity={e} onFilter={filterByEntity} />)}
          </div>
        )}
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <h3 className="text-white font-bold text-base tracking-tight mb-4 flex items-center gap-2">
          <Flame size={16} className="text-orange-400" /> Temas em Atenção
        </h3>
        {themes.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-4 text-center">Nenhum tema identificado no período.</p>
        ) : (
          <div className="space-y-3">
            {themes.map((t) => <ThemeCard key={t.tema} theme={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
