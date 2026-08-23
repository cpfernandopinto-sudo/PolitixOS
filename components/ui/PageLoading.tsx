/**
 * Feedback visual imediato de navegação entre módulos do dashboard.
 * Usado como `loading.tsx` de rota — o Next.js renderiza isto assim que a
 * navegação começa, antes mesmo do Server Component da página iniciar,
 * substituindo apenas a área de conteúdo (`<main>`), preservando sidebar e
 * header. Indicador indeterminado (sem progresso percentual falso).
 */
export default function PageLoading({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 text-center"
    >
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{message}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
