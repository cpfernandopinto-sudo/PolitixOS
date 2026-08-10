import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import type { KeyChange } from '@/lib/analytics/executive-summary';

interface Props {
  changes: KeyChange[];
}

const INTERPRETATION_COLOR: Record<KeyChange['interpretacao'], string> = {
  favoravel: 'text-green-400',
  desfavoravel: 'text-red-400',
  neutro: 'text-slate-300',
};

function ChangeCard({ change }: { change: KeyChange }) {
  const Icon = change.diferencaAbsoluta > 0 ? ArrowUpRight : change.diferencaAbsoluta < 0 ? ArrowDownRight : ArrowLeftRight;
  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{change.label}</span>
        <Icon size={14} className={INTERPRETATION_COLOR[change.interpretacao]} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-xl font-black ${INTERPRETATION_COLOR[change.interpretacao]}`}>
          {change.diferencaAbsoluta > 0 ? '+' : ''}
          {change.diferencaAbsoluta}
        </span>
        <span className="text-[10px] text-slate-500">{change.metrica}</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <span>Anterior: {change.valorAnterior}</span>
        <span>Atual: {change.valorAtual}</span>
      </div>
      <p className="text-[10px] text-slate-600">{change.periodo}</p>
    </div>
  );
}

/**
 * Mudanças mais relevantes do período — só exibe métricas com comparação
 * temporal REAL (ver lib/analytics/executive-summary.ts#selectKeyChanges).
 * Quando não há nenhuma, mostra estado vazio explícito em vez de zerar
 * cards artificialmente.
 */
export default function KeyChanges({ changes }: Props) {
  return (
    <div className="surface-primary p-5">
      <h3 className="text-white font-bold text-base tracking-tight mb-3">Mudanças Mais Relevantes</h3>
      {changes.length === 0 ? (
        <p className="text-sm text-slate-500 italic py-4 text-center">
          Sem comparação temporal real disponível para o período e filtros selecionados.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {changes.map((c) => <ChangeCard key={c.id} change={c} />)}
        </div>
      )}
    </div>
  );
}
