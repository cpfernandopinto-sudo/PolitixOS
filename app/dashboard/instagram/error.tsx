'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function InstagramError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <main className="flex min-h-[55vh] items-center justify-center"><div role="alert" className="max-w-md rounded-md border border-rose-400/25 bg-[#0d1423] p-8 text-center"><AlertTriangle className="mx-auto text-rose-400" size={34} /><h1 className="mt-4 text-lg font-semibold text-white">Não foi possível carregar o Instagram</h1><p className="mt-2 text-sm text-slate-400">Os dados permaneceram intactos. Tente novamente para refazer a leitura.</p>{error.digest ? <p className="mt-2 text-[10px] text-slate-600">Referência {error.digest}</p> : null}<button type="button" onClick={unstable_retry} className="mt-5 inline-flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"><RefreshCw size={15} /> Tentar novamente</button></div></main>;
}
