'use client';

import type { ElectoralPoll, ExtractedPollMetadata } from '@/lib/pesquisas/types';
import { Sliders } from 'lucide-react';

interface Props {
  poll: ElectoralPoll;
  metadata: ExtractedPollMetadata;
}

export function PollQualityRepresentativeness({ poll, metadata }: Props) {
  const margin = metadata.marginError;
  const confidence = metadata.confidenceLevel;
  const weighting = metadata.weightingInfo?.value;
  const sampling = metadata.samplingMethod?.value;

  const demoSource = 'Censo IBGE / TSE (Padrão Oficial)';

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Qualidade & Representatividade</h3>
          </div>
          <span className="text-[10px] bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded font-medium">
            Características Técnicas
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400">Tamanho da Amostra</span>
            <span className="font-semibold text-white">
              {poll.amostra ? `${poll.amostra.toLocaleString('pt-BR')} entrevistas` : 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400">Margem de Erro Estimada</span>
            <span className="font-semibold text-white">
              {margin ? `±${margin.value}%` : 'Não disponível no registro'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400">Nível de Confiança</span>
            <span className="font-semibold text-white">
              {confidence ? `${confidence.value}%` : 'Não disponível no registro'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400">Variáveis de Ponderação</span>
            <span className="font-semibold text-white text-right max-w-[180px] truncate">
              {weighting?.used && weighting.variables.length > 0
                ? weighting.variables.join(', ')
                : weighting?.used
                ? 'Sim (especificadas)'
                : 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400">Método de Seleção</span>
            <span className="font-semibold text-white text-right max-w-[180px] truncate">
              {sampling ?? 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-gray-400">Unidade de Registro</span>
            <span className="font-semibold text-white">
              {poll.abrangencia ?? poll.uf ?? 'Brasil'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-gray-400">Fonte Demográfica</span>
            <span className="font-semibold text-white">{demoSource}</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-gray-400">
        <strong className="text-gray-300">Nota de Isenção:</strong> O PolitixOS apresenta exclusivamente os dados descritivos declarados pelo instituto junto ao TSE, sem emissão de scores ou avaliações morais de qualidade.
      </div>
    </div>
  );
}
