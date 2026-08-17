'use client';

import { useState } from 'react';
import { MapPin, Clock, Database, RefreshCw, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { TerritoryDossier, DataSourceMode } from '@/lib/territorios/types';
import { createTerritoryBriefingRequest } from '@/lib/actions/territories';

interface Props {
  dossier: TerritoryDossier;
}

export default function DossierHeader({ dossier }: Props) {
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const dateObj = new Date(dossier.lastUpdated);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(dateObj);

  const handleRefreshClick = async () => {
    setUpdating(true);
    setUpdateMessage(null);
    try {
      const res = await createTerritoryBriefingRequest({ codigo_ibge: dossier.ibgeCode });
      if (res.success) {
        setUpdateMessage('Solicitação de reprocessamento registrada com sucesso.');
      } else {
        setUpdateMessage(res.message ?? 'Não foi possível solicitar reprocessamento.');
      }
    } catch {
      setUpdateMessage('Erro ao solicitar reprocessamento.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-[#0B0F19] border border-white/10 rounded-xl p-3 md:p-4 space-y-2 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* NOME DO TERRITÓRIO E METADADOS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Building2 size={18} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {dossier.cityName} <span className="text-cyan-400 font-semibold">— {dossier.uf}</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 uppercase">
                Dossiê Territorial
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-0.5 font-medium">
              <span className="flex items-center gap-1 font-mono">
                <MapPin size={12} className="text-gray-500" /> IBGE: {dossier.ibgeCode}
              </span>
              <span className="text-gray-600">·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-500" /> Última atualização: {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* COBERTURA E AÇÃO */}
        <div className="flex flex-wrap items-center gap-3">
          {/* COBERTURA DOS MOTORES */}
          <div className="flex flex-wrap items-center gap-1 bg-[#12192A] p-1.5 rounded-lg border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1.5 mr-1 hidden xl:inline">
              Motores:
            </span>
            <CoverageBadge label="IBGE" status={dossier.coverage.ibge} />
            <CoverageBadge label="TSE" status={dossier.coverage.electoral} />
            <CoverageBadge label="Segurança" status={dossier.coverage.security} />
            <CoverageBadge label="Saúde" status={dossier.coverage.health} />
            <CoverageBadge label="Economia" status={dossier.coverage.economy} />
          </div>

          {/* BOTÃO ATUALIZAR REPROCESSAMENTO REAL */}
          <button
            onClick={handleRefreshClick}
            disabled={updating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-200 transition-colors disabled:opacity-40"
            title="Registrar solicitação de atualização do Dossiê"
          >
            {updating ? <Loader2 size={13} className="animate-spin text-cyan-400" /> : <RefreshCw size={13} className="text-gray-400" />}
            <span>{updating ? 'Solicitando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {updateMessage && (
        <div className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
          <span>{updateMessage}</span>
        </div>
      )}
    </div>
  );
}

function CoverageBadge({ label, status }: { label: string; status: DataSourceMode }) {
  const isAvailable = status === 'real' || status === 'demo';

  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
        isAvailable
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-slate-500/10 text-slate-400 border-white/5'
      }`}
      title={isAvailable ? `${label}: Ativo/Disponível` : `${label}: Pendente`}
    >
      <Database size={9} className="opacity-70" />
      <span>{label}</span>
    </div>
  );
}
