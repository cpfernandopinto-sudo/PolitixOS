'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function WhatsAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro no módulo WhatsApp Intelligence:', error);
  }, [error]);

  return (
    <div className="surface-primary rounded-xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-4 my-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
        <AlertCircle size={24} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-white">Falha ao carregar WhatsApp Intelligence</h3>
        <p className="text-xs text-rose-200/80 max-w-md mx-auto">
          Ocorreu um erro inesperado ao sincronizar os dados do WhatsApp. Tente atualizar a página.
        </p>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-lg bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition"
      >
        <RefreshCw size={14} />
        <span>Tentar novamente</span>
      </button>
    </div>
  );
}
