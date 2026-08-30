'use client';

import {
  Mic,
  FileText,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  Link2,
  Share2,
  Users,
  User,
  MapPin,
  Tag,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Clock,
  AlertCircle,
  Clock3,
} from 'lucide-react';
import type { WhatsAppMessageDTO, WhatsAppMessageType, WhatsAppSentiment, WhatsAppRiskLevel } from '@/lib/types/whatsapp';

interface Props {
  item: WhatsAppMessageDTO;
  onSelect: (item: WhatsAppMessageDTO) => void;
}

const sentimentColors: Record<WhatsAppSentiment, { bg: string; text: string; border: string }> = {
  POSITIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  NEUTRAL: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  MIXED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  NEGATIVE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  UNKNOWN: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

function formatTypeBadge(type: WhatsAppMessageType) {
  switch (type) {
    case 'AUDIO':
      return { label: 'Áudio', icon: Mic, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    case 'IMAGE':
      return { label: 'Imagem', icon: ImageIcon, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    case 'VIDEO':
      return { label: 'Vídeo', icon: Video, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    case 'DOCUMENT':
      return { label: 'Documento', icon: FileSpreadsheet, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    default:
      return { label: 'Texto', icon: FileText, color: 'text-slate-300 bg-white/5 border-white/10' };
  }
}

export default function WhatsAppMessageCard({ item, onSelect }: Props) {
  const { text, caption, media, chat, sender, message_type, occurred_at, analysis_status, analysis } = item;

  const sentiment = analysis?.sentiment ?? 'UNKNOWN';
  const sentimentStyle = sentimentColors[sentiment] ?? sentimentColors.UNKNOWN;

  const risk = analysis?.risk_level ?? 'NONE';
  const isHighRisk = risk === 'CRITICAL' || risk === 'HIGH';

  const typeInfo = formatTypeBadge(message_type);
  const TypeIcon = typeInfo.icon;

  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(occurred_at));

  const displayContent = text || caption || (media?.file_name ? `Arquivo: ${media.file_name}` : 'Sem conteúdo textual');

  return (
    <div
      onClick={() => onSelect(item)}
      className={`surface-primary cursor-pointer rounded-xl border bg-[#161B26] p-4 shadow-sm transition flex flex-col justify-between space-y-3.5 hover:border-cyan-500/50 hover:bg-[#1A202C] ${
        isHighRisk ? 'border-rose-500/40' : 'border-[#2D3748]'
      }`}
    >
      {/* 1. Header: Group, Sender, Type & Timestamp */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
            <Users size={13} className="text-cyan-400 shrink-0" />
            <span className="truncate" title={chat.name || 'Grupo sem nome'}>
              {chat.name || 'Grupo WhatsApp'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Media Type Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeInfo.color}`}
            >
              <TypeIcon size={10} />
              <span>{typeInfo.label}</span>
            </span>

            {/* High-Risk Badge if applicable */}
            {isHighRisk && (
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-300 animate-pulse">
                {risk === 'CRITICAL' ? 'Crítico' : 'Alto Risco'}
              </span>
            )}
          </div>
        </div>

        {/* Sender and Time */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 truncate">
            <User size={11} className="text-slate-500 shrink-0" />
            <span className="font-medium text-slate-300 truncate">
              {sender.name || sender.id || 'Remetente Anônimo'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono shrink-0">
            <Clock size={10} />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* 2. Media thumbnail if image/video */}
      {media?.url && (message_type === 'IMAGE' || message_type === 'VIDEO') && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <img
            src={media.url}
            alt="Mídia WhatsApp"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* 3. Message Content & Status State */}
      <div className="space-y-2">
        <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
          {displayContent}
        </p>

        {/* Status: COMPLETED with AI Summary */}
        {analysis_status === 'COMPLETED' && analysis?.summary && (
          <div className="rounded-lg bg-[#0F131C] p-2.5 border border-white/5 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles size={11} />
              <span>Resumo IA</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Status: PROCESSING */}
        {analysis_status === 'PROCESSING' && (
          <div className="rounded-lg bg-cyan-950/20 border border-cyan-500/20 p-2 flex items-center gap-2 text-[11px] text-cyan-300">
            <Sparkles size={12} className="animate-spin text-cyan-400" />
            <span>Análise de IA em processamento...</span>
          </div>
        )}

        {/* Status: PENDING */}
        {analysis_status === 'PENDING' && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-2 flex items-center gap-2 text-[11px] text-slate-400">
            <Clock3 size={12} className="text-slate-500" />
            <span>Análise de IA pendente na fila de processamento</span>
          </div>
        )}

        {/* Status: FAILED */}
        {analysis_status === 'FAILED' && (
          <div className="rounded-lg bg-rose-950/20 border border-rose-500/20 p-2 flex items-center gap-2 text-[11px] text-rose-300">
            <AlertCircle size={12} className="text-rose-400" />
            <span>Falha na análise IA (aguardando retry automático)</span>
          </div>
        )}

        {/* Status: SKIPPED */}
        {analysis_status === 'SKIPPED' && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-[11px] text-slate-500">
            Mensagem própria / Fora do escopo analítico
          </div>
        )}
      </div>

      {/* 4. Tags & Metadata Footer */}
      <div className="pt-2.5 border-t border-white/5 space-y-2">
        {/* Pills row */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {/* Sentiment Badge (only if COMPLETED) */}
          {analysis_status === 'COMPLETED' && analysis?.sentiment && (
            <span
              className={`rounded border px-1.5 py-0.5 font-bold capitalize ${sentimentStyle.bg} ${sentimentStyle.border} ${sentimentStyle.text}`}
            >
              {analysis.sentiment.toLowerCase()}
            </span>
          )}

          {/* Theme Badge */}
          {analysis?.theme && (
            <span className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 font-medium text-slate-300">
              <Tag size={9} className="text-cyan-400" />
              <span className="truncate max-w-[130px]">{analysis.theme}</span>
            </span>
          )}

          {/* Relevance Badge */}
          {analysis?.relevance && analysis.relevance !== 'NONE' && (
            <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-slate-400">
              Rel.: <span className="text-slate-200 capitalize font-medium">{analysis.relevance.toLowerCase()}</span>
            </span>
          )}

          {/* Location Badge */}
          {analysis?.mentioned_locations && analysis.mentioned_locations.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-slate-300 truncate max-w-[140px]">
              <MapPin size={9} className="text-emerald-400 shrink-0" />
              <span className="truncate">{analysis.mentioned_locations[0].name}</span>
            </span>
          )}

          {/* Candidate Badge */}
          {analysis?.mentioned_candidates && analysis.mentioned_candidates.length > 0 && (
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 font-medium text-cyan-300 truncate max-w-[130px]">
              {analysis.mentioned_candidates[0].name}
            </span>
          )}
        </div>

        {/* Read More link */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="text-[10px] text-slate-500">
            {analysis?.confidence
              ? `Confiança: ${Math.round(analysis.confidence * 100)}%`
              : ''}
          </span>
          <div className="flex items-center gap-1 text-cyan-400 font-medium text-xs">
            <span>Ver análise</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>
    </div>
  );
}
