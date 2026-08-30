'use client';

import { MessageSquare, Users, ShieldAlert, TrendingDown, Sparkles, UserCheck } from 'lucide-react';
import type { WhatsAppSummaryDTO } from '@/lib/types/whatsapp';

interface Props {
  summary: WhatsAppSummaryDTO;
}

const nf = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

function formatVal(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return nf.format(val);
}

export default function WhatsAppKPIsComponent({ summary }: Props) {
  const { totals, sentiment, top_themes } = summary;
  const hasAlerts = totals.high_or_critical_risk > 0;

  const negativeItem = sentiment.find((s) => s.key === 'NEGATIVE');
  const negativePct = negativeItem ? negativeItem.percentage : 0;
  const negativeCount = negativeItem ? negativeItem.count : 0;
  const isHighNegative = negativePct >= 25;

  const dominantTheme = top_themes[0] ? `${top_themes[0].theme} (${top_themes[0].count})` : 'Nenhum';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* 1. Mensagens Monitoradas */}
      <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4 flex flex-col justify-between transition hover:border-cyan-500/30">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Mensagens
          </span>
          <MessageSquare size={14} className="text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-white">{formatVal(totals.messages)}</span>
          <span className="text-[10px] font-medium text-slate-400">{totals.analyzed} analisadas</span>
        </div>
      </div>

      {/* 2. Grupos Monitorados */}
      <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4 flex flex-col justify-between transition hover:border-cyan-500/30">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Grupos
          </span>
          <Users size={14} className="text-blue-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-blue-400">{formatVal(totals.groups)}</span>
          <span className="text-[10px] font-medium text-slate-400">ativos</span>
        </div>
      </div>

      {/* 3. Remetentes Únicos */}
      <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4 flex flex-col justify-between transition hover:border-cyan-500/30">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Remetentes
          </span>
          <UserCheck size={14} className="text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-black text-emerald-400">{formatVal(totals.unique_senders)}</span>
          <span className="text-[10px] font-medium text-slate-400">únicos</span>
        </div>
      </div>

      {/* 4. Alertas Detectados (Risco Alto/Crítico) */}
      <div
        className={`surface-primary rounded-xl border p-4 flex flex-col justify-between transition ${
          hasAlerts
            ? 'border-rose-500/40 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
            : 'border-[#2D3748] bg-[#161B26]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Alertas Críticos
          </span>
          <ShieldAlert size={14} className={hasAlerts ? 'text-rose-400 animate-pulse' : 'text-slate-500'} />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className={`text-xl font-black ${hasAlerts ? 'text-rose-400' : 'text-white'}`}>
            {formatVal(totals.high_or_critical_risk)}
          </span>
          {hasAlerts ? (
            <span className="rounded bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
              Risco Alto
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">normalidade</span>
          )}
        </div>
      </div>

      {/* 5. Sentimento Negativo */}
      <div
        className={`surface-primary rounded-xl border p-4 flex flex-col justify-between transition ${
          isHighNegative
            ? 'border-amber-500/30 bg-amber-950/15'
            : 'border-[#2D3748] bg-[#161B26]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sentimento Negativo
          </span>
          <TrendingDown size={14} className={isHighNegative ? 'text-amber-400' : 'text-slate-400'} />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className={`text-xl font-black ${isHighNegative ? 'text-amber-400' : 'text-white'}`}>
            {totals.analyzed > 0 ? `${negativePct}%` : '—'}
          </span>
          <span className="text-[10px] font-medium text-slate-400">{negativeCount} msgs</span>
        </div>
      </div>

      {/* 6. Temas Emergentes */}
      <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4 flex flex-col justify-between transition hover:border-cyan-500/30">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tema Líder
          </span>
          <Sparkles size={14} className="text-purple-400" />
        </div>
        <div className="mt-2 flex flex-col">
          <span className="text-xs font-bold text-purple-300 truncate" title={dominantTheme}>
            {dominantTheme}
          </span>
          <span className="text-[10px] font-medium text-slate-400 mt-0.5">
            {top_themes.length} temas ativos
          </span>
        </div>
      </div>
    </div>
  );
}
