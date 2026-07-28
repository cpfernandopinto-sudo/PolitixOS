import { Info, Trophy } from 'lucide-react';

export interface RankingItem {
  id: string;
  label: string;
  value: number;
  sublabel?: string;
}

export interface RankingBlock {
  title: string;
  formula: string;
  items: RankingItem[];
  valueLabel?: string;
}

/**
 * Rankings executivos compartilhados entre Instagram e X. Recebe os blocos
 * já calculados a partir dos dados que o módulo já buscou (sem nova
 * consulta). Mostra apenas volume absoluto — não normaliza por
 * seguidores/alcance porque essa métrica não existe nos dados atuais, então
 * não é exibida uma "taxa" fabricada.
 */
export default function SocialRankings({ blocks }: { blocks: RankingBlock[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {blocks.map((block) => (
        <div key={block.title} className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Trophy size={14} className="text-[#00FFFF]" />
              {block.title}
            </h3>
            <span title={block.formula} className="text-gray-600 hover:text-gray-400 transition-colors cursor-help">
              <Info size={13} />
            </span>
          </div>

          {block.items.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-4 text-center">Sem dados suficientes no período.</p>
          ) : (
            <ol className="space-y-2.5">
              {block.items.map((item, i) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="w-5 text-[11px] font-black text-gray-600 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-medium truncate">{item.label}</p>
                    {item.sublabel && <p className="text-[10px] text-gray-500 truncate">{item.sublabel}</p>}
                  </div>
                  <span className="text-xs font-black text-[#00FFFF] shrink-0">
                    {item.value.toLocaleString()}{block.valueLabel ? ` ${block.valueLabel}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
