'use client';

import {
  Users,
  User,
  Sparkles,
  MapPin,
  FileSpreadsheet,
  Mic,
  Tag,
  ShieldAlert,
  AlertCircle,
  Building,
  Target,
  Clock3,
  Lightbulb,
} from 'lucide-react';
import type { WhatsAppMessageDTO, WhatsAppSentiment } from '@/lib/types/whatsapp';
import Drawer from '@/components/ui/Drawer';

interface Props {
  item: WhatsAppMessageDTO | null;
  onClose: () => void;
}

const sentimentColors: Record<WhatsAppSentiment, { bg: string; text: string; border: string }> = {
  POSITIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  NEUTRAL: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  MIXED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  NEGATIVE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  UNKNOWN: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export default function WhatsAppMessageDrawer({ item, onClose }: Props) {
  if (!item) return null;

  const { text, caption, media, chat, sender, message_type, occurred_at, analysis_status, analysis } = item;

  const sentiment = analysis?.sentiment ?? 'UNKNOWN';
  const sentimentStyle = sentimentColors[sentiment] ?? sentimentColors.UNKNOWN;

  const risk = analysis?.risk_level ?? 'NONE';
  const isHighRisk = risk === 'CRITICAL' || risk === 'HIGH';
  const isMediumRisk = risk === 'MEDIUM';

  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(occurred_at));

  const displayContent = text || caption || (media?.file_name ? `Arquivo: ${media.file_name}` : 'Sem conteúdo textual');

  const badge = (
    <span className="rounded-md bg-emerald-600/20 px-2 py-0.5 text-emerald-400 border border-emerald-500/30 font-bold text-xs uppercase tracking-wider">
      WhatsApp
    </span>
  );

  return (
    <Drawer
      open={Boolean(item)}
      onClose={onClose}
      title="Detalhamento da Mensagem WhatsApp"
      subtitle={formattedTime}
      badge={badge}
    >
      <div className="space-y-6">
        {/* 1. Origem e Mensagem */}
        <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 truncate">
              <Users size={14} className="text-cyan-400 shrink-0" />
              <span className="truncate">{chat.name || 'Grupo WhatsApp'}</span>
            </div>
            <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-400 uppercase">
              {message_type}
            </span>
          </div>

          {/* Dados do Remetente */}
          <div className="flex items-center gap-2 text-xs bg-white/[0.02] p-3 rounded-lg border border-white/5">
            <User size={13} className="text-slate-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Remetente</span>
              <span className="font-semibold text-slate-200">{sender.name || sender.id || 'Remetente Anônimo'}</span>
            </div>
          </div>

          {/* Mídia se houver */}
          {media?.url && (message_type === 'IMAGE' || message_type === 'VIDEO') && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/60">
              <img
                src={media.url}
                alt="Mídia da mensagem"
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          )}

          {message_type === 'AUDIO' && media && (
            <div className="rounded-lg bg-purple-950/20 border border-purple-500/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-purple-300">
                <Mic size={16} className="text-purple-400" />
                <span className="font-semibold">Mensagem de Áudio</span>
              </div>
              <span className="text-[10px] font-mono text-purple-300/80">{media.file_name || 'audio.ogg'}</span>
            </div>
          )}

          {message_type === 'DOCUMENT' && media && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-500/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <FileSpreadsheet size={16} className="text-amber-400" />
                <span className="font-semibold">Documento Anexo</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300/80">{media.file_name || 'documento.pdf'}</span>
            </div>
          )}

          {/* Texto / Transcrição */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
              {message_type === 'AUDIO' ? 'Transcrição / Legenda' : 'Conteúdo da Mensagem'}
            </span>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-[#070b14] p-3 rounded-lg border border-white/5">
              {displayContent}
            </p>
          </div>
        </div>

        {/* 2. Análise de Inteligência Artificial */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Análise de IA (Codex / Gemini)</span>
            </div>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
              analysis_status === 'COMPLETED'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : analysis_status === 'PROCESSING'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : analysis_status === 'FAILED'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              {analysis_status}
            </span>
          </div>

          {analysis_status === 'COMPLETED' && analysis ? (
            <div className="space-y-4">
              {/* Badges de Sentimento, Risco e Relevância */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {/* Sentimento */}
                <div className={`rounded-xl border p-3 ${sentimentStyle.bg} ${sentimentStyle.border}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sentimento
                  </span>
                  <p className={`text-sm font-extrabold capitalize ${sentimentStyle.text}`}>
                    {analysis.sentiment?.toLowerCase()}
                  </p>
                  {analysis.sentiment_score !== null && (
                    <span className="text-[10px] text-slate-400">
                      Score: {analysis.sentiment_score}
                    </span>
                  )}
                </div>

                {/* Risco Reputacional */}
                <div
                  className={`rounded-xl border p-3 ${
                    isHighRisk
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : isMediumRisk
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Risco Reputacional
                  </span>
                  <p className="text-sm font-extrabold capitalize">
                    {analysis.risk_level?.toLowerCase()}
                  </p>
                </div>

                {/* Relevância */}
                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-3 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Relevância
                  </span>
                  <p className="text-sm font-extrabold text-white capitalize">
                    {analysis.relevance?.toLowerCase()}
                  </p>
                </div>
              </div>

              {/* Resumo Factual */}
              {analysis.summary && (
                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Resumo Factual (IA)
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* Orientação operacional interna; nunca representa envio automático. */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <Lightbulb size={13} />
                  <span>Ação Recomendada pela IA</span>
                </div>
                <p className={`text-xs leading-relaxed ${analysis.recommended_action ? 'text-amber-100/90' : 'text-slate-400 italic'}`}>
                  {analysis.recommended_action || 'Não disponível para esta análise.'}
                </p>
              </div>

              {/* Tema e Subtema */}
              <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tema Principal
                    </span>
                    <p className="text-xs font-bold text-cyan-300 mt-0.5">{analysis.theme || '—'}</p>
                  </div>
                  {analysis.subtheme && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Subtema
                      </span>
                      <p className="text-xs font-bold text-slate-200 mt-0.5">{analysis.subtheme}</p>
                    </div>
                  )}
                </div>

                {/* Intenção */}
                {analysis.intent && (
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Intenção:
                    </span>
                    <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      {analysis.intent}
                    </span>
                  </div>
                )}
              </div>

              {/* Motivo do Risco */}
              {analysis.risk_reason && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                    <ShieldAlert size={14} />
                    <span>Diagnóstico de Risco</span>
                  </div>
                  <p className="text-xs text-rose-100/90 leading-relaxed">{analysis.risk_reason}</p>
                </div>
              )}

              {/* Candidatos e Localidades */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Candidatos */}
                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Target size={12} className="text-cyan-400" />
                    <span>Candidatos Citados</span>
                  </div>
                  {analysis.mentioned_candidates && analysis.mentioned_candidates.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {analysis.mentioned_candidates.map((c) => (
                        <span
                          key={c.name}
                          className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-300"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Nenhum candidato citado.</span>
                  )}
                </div>

                {/* Localidades */}
                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <MapPin size={12} className="text-emerald-400" />
                    <span>Localidades</span>
                  </div>
                  {analysis.mentioned_locations && analysis.mentioned_locations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {analysis.mentioned_locations.map((loc) => (
                        <span
                          key={loc.name}
                          className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
                        >
                          {loc.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Localidade não identificada.</span>
                  )}
                </div>
              </div>

              {/* Entidades */}
              {analysis.mentioned_entities && analysis.mentioned_entities.length > 0 && (
                <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Building size={12} className="text-blue-400" />
                    <span>Entidades e Instituições</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.mentioned_entities.map((ent) => (
                      <span
                        key={ent.name}
                        className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-300"
                      >
                        {ent.name} ({ent.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Auditoria / Metadados */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Versão do Contrato: {analysis.schema_version || '1.0'}</span>
                <span>Prompt: {analysis.prompt_version || 'whatsapp_mvp_v1'}</span>
                <span>Analisado em: {analysis.analyzed_at ? new Date(analysis.analyzed_at).toLocaleTimeString('pt-BR') : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#2D3748] bg-[#0F131C] p-6 text-center text-slate-400 space-y-2">
              <Clock3 size={24} className="mx-auto text-slate-500" />
              <p className="text-xs font-medium">
                {analysis_status === 'PROCESSING'
                  ? 'A esteira de Inteligência Artificial está processando esta mensagem.'
                  : analysis_status === 'FAILED'
                  ? 'A análise da IA falhou para esta mensagem e aguarda retry.'
                  : analysis_status === 'SKIPPED'
                  ? 'Esta mensagem foi ignorada das análises de IA (ex: mensagem própria).'
                  : 'Análise de IA pendente na fila de processamento.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
