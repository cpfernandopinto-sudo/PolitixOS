'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles, Loader2, RefreshCw, Copy, Check, AlertTriangle, ShieldQuestion,
  TrendingUp, HelpCircle, Info, Clock,
} from 'lucide-react';
import { generateExecutiveInsight } from '@/lib/actions/analytics-insight';
import type { AssistedInsightResult } from '@/lib/ai/analytics-schema';
import Drawer from '@/components/ui/Drawer';

interface Props {
  candidate: string | null;
  period: string | null;
  /** Detalhe técnico (ex.: variável de ambiente ausente) só aparece para admin, em área secundária — nunca para usuários comuns. */
  isAdmin?: boolean;
}

const CONFIDENCE_LABEL: Record<'baixa' | 'media' | 'alta', string> = {
  baixa: 'Confiança baixa',
  media: 'Confiança média',
  alta: 'Confiança alta',
};
const CONFIDENCE_STYLE: Record<'baixa' | 'media' | 'alta', string> = {
  baixa: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  media: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  alta: 'bg-green-500/10 text-green-400 border-green-500/30',
};

function EvidenceChips({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {ids.map((id) => (
        <span key={id} className="text-[9px] font-mono bg-blue-500/5 text-slate-500 px-1.5 py-0.5 rounded border border-blue-300/10">
          {id}
        </span>
      ))}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2.5 w-full max-w-md" aria-hidden="true">
      <div className="h-3 rounded bg-blue-500/5 animate-pulse w-full" />
      <div className="h-3 rounded bg-blue-500/5 animate-pulse w-11/12" />
      <div className="h-3 rounded bg-blue-500/5 animate-pulse w-4/5" />
    </div>
  );
}

/**
 * Relatório Executivo com IA (Sprint 4/5; reposicionado como ação sob
 * demanda na Sprint UX — Etapa 5). Nunca chama o modelo automaticamente:
 * só quando o usuário clica no CTA "Gerar Relatório Executivo". A
 * metodologia determinística continua sendo a fonte primária — este bloco
 * apenas explica, nunca substitui, os cálculos de
 * lib/analytics/executive-summary.ts. Nenhum dado, análise ou relatório é
 * fabricado aqui: todo o conteúdo vem de `generateExecutiveInsight`
 * (inalterada nesta etapa).
 *
 * Etapa 5: o bloco deixou de ocupar espaço permanente na área principal —
 * antes era um card grande sempre visível (mesmo vazio, "nenhuma leitura
 * gerada ainda"); agora é um CTA compacto que abre o resultado em um
 * Drawer (mesmo componente acessível já usado por PoliticalStatusCard —
 * fecha com Esc, focus trap, devolve o foco ao fechar). O primeiro clique
 * no CTA já dispara a geração (se ainda não houver resultado) e abre o
 * Drawer no mesmo gesto; reabrir depois de fechado mostra o resultado já
 * em cache, sem gerar de novo.
 *
 * Sprint 5: estados mais amigáveis — "indisponível" explica o benefício em
 * vez de parecer um erro técnico (detalhe técnico só para admin), "gerando"
 * usa skeleton + mensagem de progresso, e um aviso de "desatualizado"
 * aparece quando os filtros mudam depois de uma geração já concluída.
 */
export default function AssistedInsight({ candidate, period, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<AssistedInsightResult | null>(null);
  const [generatedFor, setGeneratedFor] = useState<{ candidate: string | null; period: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showLimitationsInfo, setShowLimitationsInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = isPending ? 'gerando' : result?.status ?? 'nao_gerado';
  const isStale = status === 'disponivel' && generatedFor !== null && (generatedFor.candidate !== candidate || generatedFor.period !== period);

  const handleGenerate = (forceRefresh = false) => {
    startTransition(async () => {
      const res = await generateExecutiveInsight({ candidate, period, forceRefresh });
      setResult(res);
      setGeneratedFor({ candidate, period });
    });
  };

  const handleOpenCta = () => {
    setOpen(true);
    if (status === 'nao_gerado') handleGenerate(false);
  };

  const handleCopy = () => {
    if (!result?.output) return;
    const { output } = result;
    const text = [
      output.resumo,
      '',
      'Pontos principais:',
      ...output.pontosPrincipais.map((p) => `- ${p}`),
      '',
      'O que ainda não é possível concluir:',
      ...output.naoEpossivelConcluir.map((p) => `- ${p}`),
    ].join('\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasResult = status === 'disponivel';
  const ctaLabel = hasResult ? 'Ver Relatório Executivo' : 'Gerar Relatório Executivo';
  const ctaHint = hasResult
    ? isStale
      ? 'Os filtros mudaram desde a última geração — pode estar desatualizado.'
      : result?.generatedAt
        ? `Gerado em ${new Date(result.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`
        : 'Leitura já gerada para este período e filtros.'
    : 'Leitura interpretativa gerada por IA sob demanda, a partir dos dados já calculados acima.';

  return (
    <div className="surface-muted p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <Sparkles size={18} className="text-cyan-400 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-white font-bold text-sm tracking-tight">Relatório Executivo com IA</p>
          <p className="text-xs text-slate-500 truncate">{ctaHint}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleOpenCta}
        aria-disabled={isPending}
        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 aria-disabled:opacity-60 aria-disabled:cursor-wait transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
        {isPending ? 'Gerando…' : ctaLabel}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Relatório Executivo com IA"
        subtitle="Leitura interpretativa sob demanda — nunca substitui a síntese determinística"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <button
            type="button"
            onClick={() => setShowLimitationsInfo((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider ml-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 rounded"
          >
            <HelpCircle size={12} /> Entenda as limitações
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Explicação gerada por IA a partir da síntese determinística acima — nunca a substitui. Gerada somente sob demanda.
        </p>

        {showLimitationsInfo && (
          <div className="mb-4 bg-blue-500/5 border border-blue-300/15 rounded-lg p-4 text-xs text-slate-400 space-y-1.5">
            <p>• A leitura assistida só usa os dados já calculados na síntese determinística acima — nunca busca dados novos.</p>
            <p>• Hipóteses são possibilidades não confirmadas, nunca fatos.</p>
            <p>• Nenhuma conclusão aqui é previsão eleitoral, recomendação de voto ou opinião política.</p>
            <p>• Evidências citadas referenciam apenas itens já exibidos nesta tela (riscos, oportunidades, temas, entidades).</p>
          </div>
        )}

        {isStale && status === 'disponivel' && (
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs text-amber-300">
              <Clock size={13} /> Os filtros mudaram desde a última geração — esta leitura pode estar desatualizada.
            </span>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 hover:text-amber-200 uppercase tracking-wider"
            >
              <RefreshCw size={11} /> Atualizar
            </button>
          </div>
        )}

        {status === 'nao_gerado' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <p className="text-sm text-slate-500">Nenhuma leitura gerada para este período e filtros ainda.</p>
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-colors"
            >
              <Sparkles size={14} /> Gerar leitura analítica
            </button>
          </div>
        )}

        {status === 'gerando' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-400">
            <div className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin text-cyan-400" />
              <p className="text-sm">Organizando evidências e síntese…</p>
            </div>
            <SkeletonLines />
          </div>
        )}

        {status === 'dados_insuficientes' && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-slate-500">
            <ShieldQuestion size={22} />
            <p className="text-sm">Dados insuficientes no período selecionado para gerar uma leitura confiável.</p>
          </div>
        )}

        {status === 'indisponivel' && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center max-w-md mx-auto">
            <Sparkles size={22} className="text-slate-600" />
            <p className="text-sm text-slate-300 font-medium">Leitura analítica assistida ainda não está configurada neste ambiente.</p>
            <p className="text-xs text-slate-500">
              Quando ativada, esta função organiza os riscos, oportunidades e mudanças já calculados acima em um resumo executivo com hipóteses e limitações claras — sem substituir a metodologia determinística.
            </p>
            <p className="text-xs text-slate-600 mt-1">O restante da Visão Geral continua funcionando normalmente.</p>
            {isAdmin && result?.error && (
              <div className="mt-3 w-full text-left bg-blue-500/5 border border-blue-300/15 rounded-lg p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Detalhe técnico (visível só para admin)</p>
                <p className="text-[11px] font-mono text-slate-400 break-words">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {status === 'erro' && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center max-w-md mx-auto">
            <AlertTriangle size={22} className="text-red-500" />
            <p className="text-sm text-slate-400">Não foi possível gerar a leitura analítica agora.</p>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
            >
              <RefreshCw size={12} /> Tentar novamente
            </button>
            {isAdmin && result?.error && (
              <div className="mt-2 w-full text-left bg-blue-500/5 border border-blue-300/15 rounded-lg p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Detalhe técnico (visível só para admin)</p>
                <p className="text-[11px] font-mono text-slate-400 break-words">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {status === 'disponivel' && result?.output && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
                Gerado por IA com base em dados monitorados
              </span>
              <span className={`px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${CONFIDENCE_STYLE[result.output.confianca]}`}>
                {CONFIDENCE_LABEL[result.output.confianca]}
              </span>
              <span className="text-slate-600">
                {result.generatedAt && new Date(result.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Resumo</h4>
              <p className="text-sm text-slate-200 leading-relaxed">{result.output.resumo}</p>
            </div>

            {result.output.pontosPrincipais.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pontos principais</h4>
                <ul className="space-y-1">
                  {result.output.pontosPrincipais.map((p, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 mt-2 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.output.riscosInterpretados.length > 0 && (
              <div className="border-l-2 border-red-500/40 pl-3">
                <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Riscos interpretados</h4>
                {result.output.riscosInterpretados.map((r, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-sm text-slate-300">{r.texto}</p>
                    <EvidenceChips ids={r.evidenciaIds} />
                  </div>
                ))}
              </div>
            )}

            {result.output.oportunidadesInterpretadas.length > 0 && (
              <div className="border-l-2 border-green-500/40 pl-3">
                <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1.5">Oportunidades interpretadas</h4>
                {result.output.oportunidadesInterpretadas.map((o, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-sm text-slate-300">{o.texto}</p>
                    <EvidenceChips ids={o.evidenciaIds} />
                  </div>
                ))}
              </div>
            )}

            {result.output.hipoteses.length > 0 && (
              <div className="border-l-2 border-purple-500/40 border-dashed pl-3">
                <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <TrendingUp size={11} /> Hipóteses (não confirmadas)
                </h4>
                {result.output.hipoteses.map((h, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-sm text-slate-300 italic">{h.texto}</p>
                    <EvidenceChips ids={h.evidenciaIds} />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-500/5 border border-blue-300/10 rounded-lg p-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Info size={11} /> O que ainda não é possível concluir
              </h4>
              <ul className="space-y-1">
                {result.output.naoEpossivelConcluir.map((p, i) => (
                  <li key={i} className="text-xs text-slate-500">• {p}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-blue-300/10">
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
              >
                <RefreshCw size={11} /> Atualizar análise
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copiado' : 'Copiar síntese'}
              </button>
              <span className="text-[10px] text-slate-600 ml-auto">
                {result.output.evidenciasCitadas.length} evidência(s) citada(s) · metodologia {result.methodologyVersion}
              </span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
