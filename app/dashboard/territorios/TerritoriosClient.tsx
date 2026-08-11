'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
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

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-6 max-w-2xl">
      <TerritorySelector ufs={initialUfs} onSelect={setSelected} />

      <button
        id="gerar_briefing"
        onClick={handleGenerate}
        disabled={!selected || request.phase === 'submitting'}
        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0B0F19] font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
      >
        {request.phase === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        Gerar Briefing
      </button>

      {request.phase === 'created' && (
        <BriefingStatus
          status={request.status}
          detail={`Solicitação registrada para ${selected?.municipio}/${selected?.uf}. A coleta ainda não é executada neste bloco.`}
        />
      )}

      {request.phase === 'error' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {request.message}
        </div>
      )}
    </div>
  );
}
