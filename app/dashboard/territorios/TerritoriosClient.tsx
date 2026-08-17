'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, FolderOpen, Info, ShieldCheck } from 'lucide-react';
import TerritorySelector from '@/components/territorios/TerritorySelector';
import TerritoryEmptyState from '@/components/territorios/TerritoryEmptyState';
import TerritoryAsyncProgress, { type AsyncProcessingPhase } from '@/components/territorios/TerritoryAsyncProgress';
import TerritoryDossierPreviewCard from '@/components/territorios/TerritoryDossierPreviewCard';
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

// Pilot municipalities with real or demo dossier data
const PILOT_DOSSIER_IBGES = new Set(['3118601', '3106200', '3106705']);

export default function TerritoriosClient({ initialUfs }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Territory | null>(null);
  const [request, setRequest] = useState<RequestState>({ phase: 'idle' });
  const [asyncPhase, setAsyncPhase] = useState<AsyncProcessingPhase>('idle');

  if (initialUfs.length === 0) {
    return <TerritoryEmptyState />;
  }

  const handleGenerate = async () => {
    if (!selected) return;
    setRequest({ phase: 'submitting' });
    setAsyncPhase('collecting');

    try {
      const result = await createTerritoryBriefingRequest({ codigo_ibge: selected.codigo_ibge });

      if (result.success && result.briefing) {
        setRequest({ phase: 'created', status: 'nao_iniciado' });
        setAsyncPhase('processing');
      } else {
        const errorMsg = result.message ?? 'Não foi possível criar a solicitação de briefing.';
        setRequest({ phase: 'error', message: errorMsg });
        setAsyncPhase('failed');
      }
    } catch (err) {
      console.error('[TerritoriosClient] Erro ao gerar briefing:', err);
      setRequest({ phase: 'error', message: 'Erro inesperado ao gerar o briefing.' });
      setAsyncPhase('failed');
    }
  };

  const handleOpen = () => {
    if (!selected) return;
    router.push(`/dashboard/territorios/${selected.codigo_ibge}`);
  };

  const hasDossier = selected ? PILOT_DOSSIER_IBGES.has(selected.codigo_ibge) : false;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Box de Seleção Territorial */}
      <div className="bg-[#12192A] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Seleção do Território</span>
              <ShieldCheck size={18} className="text-cyan-400" />
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Escolha a UF e pesquise o município para carregar ou sintetizar a inteligência territorial.
            </p>
          </div>

          {selected && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B0F19] border border-cyan-500/20 text-xs font-mono text-cyan-300 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{selected.municipio} / {selected.uf}</span>
              <span className="text-gray-500 text-[10px]">(IBGE: {selected.codigo_ibge})</span>
            </div>
          )}
        </div>

        {/* Componente Autocomplete de Seleção Territorial */}
        <TerritorySelector
          ufs={initialUfs}
          selectedTerritory={selected}
          onSelect={(territory) => {
            setSelected(territory);
            setRequest({ phase: 'idle' });
            setAsyncPhase('idle');
          }}
        />
      </div>

      {/* Área de Contexto Territorial e Status do Município Selecionado */}
      {selected && (
        <div className="space-y-6 animate-fade-in">
          {/* Dossiê Carregado ou Briefing Não Preparado */}
          {hasDossier ? (
            <TerritoryDossierPreviewCard territory={selected} onOpenDossier={handleOpen} />
          ) : (
            <div className="bg-[#12192A] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-start gap-3.5 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                <Info size={20} className="text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Briefing ainda não preparado
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    Os dados territoriais deste município serão coletados e consolidados na primeira análise.
                  </p>
                  <span className="sr-only">Dados ainda não disponíveis.</span>
                </div>
              </div>

              {/* Botões de Ação Principal */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={request.phase === 'submitting'}
                  className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0B0F19] font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  {request.phase === 'submitting' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                  )}
                  <span>Gerar Inteligência Territorial</span>
                </button>

                <button
                  onClick={handleOpen}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#1A233A] border border-white/10 text-gray-300 hover:text-white font-semibold text-sm transition-all"
                >
                  <FolderOpen size={18} />
                  <span>Explorar Cadernos</span>
                </button>
              </div>
            </div>
          )}

          {/* Painel de Status Assíncrono Real */}
          <TerritoryAsyncProgress
            phase={asyncPhase}
            municipio={selected.municipio}
            uf={selected.uf}
          />
        </div>
      )}
    </div>
  );
}
