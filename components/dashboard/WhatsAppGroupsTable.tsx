'use client';

import { Users, Clock, ArrowUpRight, MessageSquare, UserCheck } from 'lucide-react';
import type { WhatsAppGroupItemDTO } from '@/lib/types/whatsapp';

interface Props {
  groups: WhatsAppGroupItemDTO[];
  onSelectGroup?: (groupId: string) => void;
}

function formatLastActivity(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 5) return 'Agora há pouco';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function WhatsAppGroupsTable({ groups, onSelectGroup }: Props) {
  if (groups.length === 0) {
    return (
      <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-8 text-center text-slate-400">
        Nenhum grupo monitorado encontrado no período.
      </div>
    );
  }

  return (
    <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Grupos Monitorados ({groups.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Clique no grupo para filtrar o feed de mensagens
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-3">Nome do Grupo</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Total Mensagens</th>
              <th className="py-2.5 px-3 text-center">Remetentes Únicos</th>
              <th className="py-2.5 px-3">Última Atividade</th>
              <th className="py-2.5 px-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {groups.map((group) => {
              return (
                <tr
                  key={group.id}
                  onClick={() => onSelectGroup?.(group.id)}
                  className="group cursor-pointer hover:bg-white/[0.03] transition text-slate-300"
                >
                  {/* Nome do Grupo */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-500 group-hover:text-cyan-400 transition shrink-0" />
                      <span className="font-bold text-white group-hover:text-cyan-300 transition">
                        {group.name}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ativo
                    </span>
                  </td>

                  {/* Total Mensagens */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1 font-bold text-slate-200">
                      <MessageSquare size={11} className="text-cyan-400" />
                      <span>{group.message_count}</span>
                    </div>
                  </td>

                  {/* Remetentes Únicos */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1 text-slate-300">
                      <UserCheck size={11} className="text-emerald-400" />
                      <span>{group.unique_senders}</span>
                    </div>
                  </td>

                  {/* Última Atividade */}
                  <td className="py-3 px-3 text-slate-400">
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock size={11} className="text-slate-500" />
                      <span>{formatLastActivity(group.last_message_at)}</span>
                    </div>
                  </td>

                  {/* Ação */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-cyan-400 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition"
                    >
                      <span>Ver feed</span>
                      <ArrowUpRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
