import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';
import type { ExecutiveNarrativeResult } from '@/lib/analytics/executive-narrative';

interface Props {
  narrative: ExecutiveNarrativeResult;
}

/**
 * Camada narrativa da Visão Geral (Sprint 5, nível 1 — hero executivo).
 * Puramente apresentacional: todo o texto já vem pronto de
 * `buildExecutiveNarrative` (determinístico, sem IA). Server Component —
 * os links de âncora (`#riscos-oportunidades` etc.) funcionam sem JS.
 */
export default function ExecutiveNarrative({ narrative }: Props) {
  if (narrative.semDados) {
    return (
      <div className="surface-hero p-6 flex items-start gap-4">
        <Compass size={22} className="text-gray-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-narrative text-gray-300">{narrative.fraseGeral}</p>
          <p className="text-sm text-gray-500 mt-1">{narrative.fraseContexto}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-hero p-6">
      <div className="flex items-start gap-4">
        <Compass size={22} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-2">
          <p className="text-narrative text-white font-semibold">{narrative.fraseGeral}</p>
          <p className="text-narrative text-gray-400">{narrative.fraseContexto}</p>
          {narrative.fraseAtencao && (
            <p className="text-narrative text-amber-300/90">{narrative.fraseAtencao}</p>
          )}
        </div>
      </div>

      {narrative.acoes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
          {narrative.acoes.map((acao) => (
            <Link
              key={`${acao.label}:${acao.href}`}
              href={acao.href}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-full px-3 py-1.5 transition-colors"
            >
              {acao.label} <ArrowRight size={12} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
