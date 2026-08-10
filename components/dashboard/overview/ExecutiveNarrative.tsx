import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';
import type { ExecutiveNarrativeResult } from '@/lib/analytics/executive-narrative';

interface Props {
  narrative: ExecutiveNarrativeResult;
}

/**
 * Leitura Executiva — coluna direita da linha Síntese + Leitura Executiva
 * (Sprint UX — Etapa 2, ~58% da largura). Puramente apresentacional: todo o
 * texto já vem pronto de `buildExecutiveNarrative` (determinístico, sem IA).
 * Server Component — os links de âncora (`#riscos-oportunidades` etc.)
 * funcionam sem JS.
 *
 * Estrutura em 4 partes (A-D):
 * A. Frase principal (`fraseGeral`) — elemento de maior destaque do card.
 * B. Contexto (`fraseContexto`) — mudança/comparação mais relevante.
 * C. Atenção prioritária (`fraseAtencao`, opcional) — semântica, sem
 *    aparência de alerta exagerado (âmbar discreto, não vermelho sólido).
 * D. Ações (`acoes`) — só destinos funcionais reais, nunca fabricados.
 *
 * Continua em `surface-hero` (nível 1 do design system — mesmo nível de
 * antes) com um acento ciano discreto na borda esquerda, para ter mais
 * presença visual que a Síntese ao lado (que usa `surface-primary`, nível 2).
 */
export default function ExecutiveNarrative({ narrative }: Props) {
  if (narrative.semDados) {
    return (
      <div className="surface-hero border-l-2 border-l-cyan-400 p-6 h-full flex items-start gap-4">
        <Compass size={22} className="text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p role="heading" aria-level={2} className="text-white font-bold text-lg tracking-tight mb-2">Leitura Executiva</p>
          <p className="text-narrative text-slate-300">{narrative.fraseGeral}</p>
          <p className="text-sm text-slate-500 mt-1">{narrative.fraseContexto}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-hero border-l-2 border-l-cyan-400 p-6 h-full flex flex-col">
      <div className="flex items-start gap-4">
        <Compass size={22} className="text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 space-y-2">
          <p role="heading" aria-level={2} className="text-white font-bold text-lg tracking-tight">Leitura Executiva</p>
          {/* A. Frase principal */}
          <p className="text-narrative text-white font-semibold">{narrative.fraseGeral}</p>
          {/* B. Contexto */}
          <p className="text-narrative text-slate-400">{narrative.fraseContexto}</p>
          {/* C. Atenção prioritária — âmbar discreto, não vermelho sólido nem ícone de alerta duplicado. */}
          {narrative.fraseAtencao && (
            <p className="text-narrative text-amber-300/90">{narrative.fraseAtencao}</p>
          )}
        </div>
      </div>

      {/* D. Ações — só destinos funcionais reais (âncoras/filtros existentes). */}
      {narrative.acoes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.08]">
          {narrative.acoes.map((acao) => (
            <Link
              key={`${acao.label}:${acao.href}`}
              href={acao.href}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 rounded px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60"
            >
              {acao.label} <ArrowRight size={12} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
