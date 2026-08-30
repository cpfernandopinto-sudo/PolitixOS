'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Tag,
  Mic,
  FileText,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  RefreshCw,
  SearchX,
  ChevronDown,
} from 'lucide-react';
import type {
  WhatsAppMessageDTO,
  WhatsAppGroupItemDTO,
  WhatsAppSummaryDTO,
  WhatsAppFiltersResponseDTO,
  WhatsAppSentiment,
  WhatsAppMessageType,
} from '@/lib/types/whatsapp';
import WhatsAppKPIsComponent from './WhatsAppKPIs';
import WhatsAppMessageCard from './WhatsAppMessageCard';
import WhatsAppGroupsTable from './WhatsAppGroupsTable';
import WhatsAppMessageDrawer from './WhatsAppMessageDrawer';

interface Props {
  summary: WhatsAppSummaryDTO;
  items: WhatsAppMessageDTO[];
  groups: WhatsAppGroupItemDTO[];
  filterOptions: WhatsAppFiltersResponseDTO;
  criticalAlert: WhatsAppMessageDTO | null;
  nextCursor: string | null;
  hasMore: boolean;
  completeness: string;
}

const sentimentColors: Record<WhatsAppSentiment, { bg: string; text: string; border: string }> = {
  POSITIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  NEUTRAL: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  MIXED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  NEGATIVE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  UNKNOWN: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const mediaTypeLabels: Record<WhatsAppMessageType, { label: string; icon: any }> = {
  TEXT: { label: 'Texto', icon: FileText },
  AUDIO: { label: 'Áudio', icon: Mic },
  IMAGE: { label: 'Imagem', icon: ImageIcon },
  VIDEO: { label: 'Vídeo', icon: Video },
  DOCUMENT: { label: 'Documento', icon: FileSpreadsheet },
  STICKER: { label: 'Figurinha', icon: MessageSquare },
  LOCATION: { label: 'Localização', icon: MessageSquare },
  CONTACT: { label: 'Contato', icon: MessageSquare },
  SYSTEM: { label: 'Sistema', icon: MessageSquare },
  UNKNOWN: { label: 'Outro', icon: MessageSquare },
};

export default function WhatsAppDashboard({
  summary,
  items,
  groups,
  filterOptions,
  criticalAlert,
  nextCursor,
  hasMore,
  completeness,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'feed' | 'groups'>('feed');
  const [selectedMessage, setSelectedMessage] = useState<WhatsAppMessageDTO | null>(null);

  const hasItems = items.length > 0;
  const hasActiveFilters = searchParams.toString().length > 0;

  function handleSelectGroupFilter(groupId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('chat_id', groupId);
    params.delete('cursor');
    router.push(`/dashboard/whatsapp?${params.toString()}`);
    setActiveTab('feed');
  }

  function handleClearFilters() {
    router.push('/dashboard/whatsapp');
  }

  function handleLoadMore() {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('cursor', nextCursor);
    router.push(`/dashboard/whatsapp?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* 1. Critical Alert Banner */}
      {criticalAlert && criticalAlert.analysis && (
        <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-[#161B26] p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
              <ShieldAlert size={16} className="text-rose-400 animate-pulse" />
              <span>Alerta de Risco Reputacional no WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-300 border border-rose-500/30">
                {criticalAlert.analysis.risk_level}
              </span>
              <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                {criticalAlert.chat.name}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-white leading-snug">
              {criticalAlert.analysis.summary || criticalAlert.text || criticalAlert.caption}
            </p>
            {criticalAlert.analysis.risk_reason && (
              <p className="text-xs text-rose-200/90 leading-relaxed">
                {criticalAlert.analysis.risk_reason}
              </p>
            )}
          </div>

          {criticalAlert.analysis.recommended_action && (
            <div className="rounded-lg bg-rose-900/30 p-3 border border-rose-500/20 text-xs text-rose-100 flex items-start gap-2">
              <span className="font-bold text-amber-300 shrink-0">Recomendação:</span>
              <span>{criticalAlert.analysis.recommended_action}</span>
            </div>
          )}
        </div>
      )}

      {/* 2. Executive KPIs Bar */}
      <WhatsAppKPIsComponent summary={summary} />

      {/* 3. Analytics Summary Cards (Sentimento, Tipos e Temas) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Distribuição de Sentimento */}
        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Distribuição de Sentimento</h3>
            <span className="text-xs text-slate-400">{summary.totals.analyzed} analisadas</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(['POSITIVE', 'NEUTRAL', 'MIXED', 'NEGATIVE'] as WhatsAppSentiment[]).map((sent) => {
              const item = summary.sentiment.find((s) => s.key === sent);
              const count = item?.count ?? 0;
              const pct = item?.percentage ?? 0;
              const style = sentimentColors[sent];

              return (
                <div key={sent} className={`rounded-xl border p-3 ${style.bg} ${style.border}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 capitalize">
                    {sent.toLowerCase()}
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className={`text-lg font-black ${style.text}`}>{count}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tipos de Conteúdo */}
        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Formatos Monitorados</h3>
            <span className="text-xs text-slate-400">Mix de mídias</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['TEXT', 'AUDIO', 'IMAGE', 'VIDEO', 'DOCUMENT'] as WhatsAppMessageType[]).map((t) => {
              const item = filterOptions.message_types.find((m) => m.value === t);
              const count = item?.count ?? 0;
              const info = mediaTypeLabels[t];
              const Icon = info.icon;

              return (
                <div
                  key={t}
                  className="rounded-lg bg-[#0F131C] p-2 border border-white/5 text-center flex flex-col items-center justify-center space-y-0.5"
                >
                  <Icon size={13} className="text-cyan-400 mb-0.5" />
                  <span className="text-[10px] text-slate-400">{info.label}</span>
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Temas Emergentes */}
        <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Temas Emergentes</h3>
            <span className="text-xs text-slate-400">{summary.top_themes.length} ativos</span>
          </div>

          {summary.top_themes.length > 0 ? (
            <div className="space-y-2">
              {summary.top_themes.slice(0, 4).map((topic) => (
                <div
                  key={topic.theme}
                  className="flex items-center justify-between rounded-lg bg-[#0F131C] p-2 border border-white/5"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Tag size={12} className="text-cyan-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200 truncate">{topic.theme}</span>
                  </div>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300 shrink-0">
                    {topic.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Nenhum tema identificado ainda.
            </div>
          )}
        </div>
      </div>

      {/* 4. Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'feed'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <MessageSquare size={14} />
            <span>Feed de Monitoramento</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'groups'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Users size={14} />
            <span>Grupos Monitorados</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
              {groups.length}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          {completeness}
        </span>
      </div>

      {/* 5. Main Content by Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {hasItems ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <WhatsAppMessageCard
                    key={item.id}
                    item={item}
                    onSelect={(selected) => setSelectedMessage(selected)}
                  />
                ))}
              </div>

              {/* Cursor pagination button if has_more */}
              {hasMore && nextCursor && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#161B26] px-5 py-2.5 text-xs font-bold text-slate-200 hover:border-cyan-500/40 hover:bg-[#1E2532] hover:text-cyan-400 transition"
                  >
                    <span>Carregar próximas mensagens</span>
                    <ChevronDown size={14} />
                  </button>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Paginação por cursor ativo
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <SearchX size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {hasActiveFilters
                    ? 'Nenhuma mensagem encontrada para os filtros selecionados'
                    : 'Nenhuma mensagem de WhatsApp monitorada'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {hasActiveFilters
                    ? 'Tente remover alguns filtros ou selecionar um período maior para visualizar mensagens.'
                    : 'As mensagens capturadas pelos canais do WhatsApp aparecerão automaticamente aqui.'}
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition"
                >
                  <RefreshCw size={13} />
                  <span>Limpar todos os filtros</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <WhatsAppGroupsTable
          groups={groups}
          onSelectGroup={handleSelectGroupFilter}
        />
      )}

      {/* 6. Message Detail Drawer */}
      <WhatsAppMessageDrawer
        item={selectedMessage}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  );
}
