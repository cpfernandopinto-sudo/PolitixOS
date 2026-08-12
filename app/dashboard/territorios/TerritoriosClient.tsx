'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, FolderOpen, AlertCircle } from 'lucide-react';
import TerritorySelector from '@/components/territorios/TerritorySelector';
import TerritoryEmptyState from '@/components/territorios/TerritoryEmptyState';
import BriefingStatus from '@/components/territorios/BriefingStatus';
import { createTerritoryBriefingRequest } from '@/lib/actions/territories';
import type { Territory } from '@/lib/types/territories';

interface Props {
  initialUfs: string[];
}

type RequestState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'created'; status: 'nao_iniciado' }
  | { phase: 'error'; message: string };

export default function TerritoriosClient({ initialUfs }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Territory | null>(null);
  const [request, setRequest] = useState<RequestState>({ phase: 'idle' });

  if (initialUfs.length === 0) {
    return <TerritoryEmptyState />;
  }

  const handleGenerate = async () => {
    if (!selected) return;
    setRequest({ phase: 'submitting' });
    try {
      const result = await createTerritoryBriefingRequest({ codigo_ibge: selected.codigo_ibge });
      if (result.success && result.briefing) {
        setRequest({ phase: 'created', status: 'nao_iniciado' });
      } else {
        setRequest({ phase: 'error', message: result.message ?? 'Não foi possível criar a solicitação de briefing.' });
      }
    } catch (err) {
      console.error('[TerritoriosClient] Erro ao gerar briefing:', err);
      setRequest({ phase: 'error', message: 'Erro inesperado ao gerar o briefing.' });
    }
  };

  const handleOpen = () => {
    if (!selected) return;
    router.push(`/dashboard/territorios/${selected.codigo_ibge}`);
  };

  // Regra temporária para MVP: Contagem possui dossiê. Outros requerem coleta futura.
  const hasDossier = selected?.codigo_ibge === '3118601';

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-6 max-w-2xl">
      <TerritorySelector ufs={initialUfs} onSelect={setSelected} />

      {selected && (
        <div className="pt-2">
          {hasDossier ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleOpen}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0B0F19] font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
              >
                <FolderOpen size={18} />
                Abrir Dossiê
              </button>
              <button
                onClick={handleGenerate}
                disabled={request.phase === 'submitting'}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1A233A] hover:bg-[#222E4A] border border-white/10 text-slate-300 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {request.phase === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Atualizar Análise
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400/90 leading-relaxed">
                  <strong>Dados ainda não disponíveis.</strong> O dossiê deste município não está pré-carregado no cache executivo. Uma nova coleta via Motor IBGE será necessária.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={request.phase === 'submitting'}
                className="flex w-full items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1A233A] hover:bg-[#222E4A] border border-white/10 text-slate-300 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {request.phase === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Gerar Análise
              </button>
            </div>
          )}
        </div>
      )}

      {request.phase === 'created' && (
        <div className="mt-4">
          <BriefingStatus
            status={request.status}
            detail={`Solicitação registrada para ${selected?.municipio}/${selected?.uf}. A coleta será executada em background.`}
          />
        </div>
      )}

      {request.phase === 'error' && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {request.message}
        </div>
      )}
    </div>
  );
}
