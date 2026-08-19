'use client';

import type { ElectoralPoll } from '@/lib/pesquisas/types';
import { parsePollMetadata } from '@/lib/pesquisas/parser';
import { Users2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Props {
  poll: ElectoralPoll | null;
}

export function PerfilAmostralCard({ poll }: Props) {
  if (!poll) {
    return (
      <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Users2 size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Perfil da Amostra</h3>
          </div>
        </div>
        <p className="text-xs text-gray-500 italic py-4 text-center">
          Nenhuma pesquisa selecionada para exibição do perfil da amostra.
        </p>
      </div>
    );
  }

  const meta = parsePollMetadata(poll);

  const sampleSize = poll.amostra ? `${poll.amostra.toLocaleString('pt-BR')} entrevistas` : 'Não informado';
  const marginStr = meta.marginError ? `±${meta.marginError.value}%` : 'Não disponível';
  const confidenceStr = meta.confidenceLevel ? `${meta.confidenceLevel.value}%` : 'Não disponível';
  const methodStr = meta.collectionType?.value ?? poll.metodologia ?? 'Não especificado';
  const instituteStr = poll.instituto ?? 'Instituto não informado';

  const genderStr = meta.genderDistribution?.value ? meta.genderDistribution.value.map((g) => `${g.label} (${g.percentage}%)`).join(', ') : 'Texto corrido no registro';
  const ageStr = meta.ageDistribution?.value ? `${meta.ageDistribution.value.length} faixas registradas` : 'Texto corrido no registro';
  const eduStr = meta.educationDistribution?.value ? meta.educationDistribution.value.map((e) => e.label).join(', ') : 'Texto corrido no registro';
  const incomeStr = meta.incomeDistribution?.value ? `${meta.incomeDistribution.value.length} faixas salariais` : 'Texto corrido no registro';

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
          <div className="flex items-center gap-2">
            <Users2 size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Perfil da Amostra (Pesquisa Ativa)
            </h3>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
            TSE: {poll.tseRegistrationNumber}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Instituto</span>
            <span className="font-semibold text-white truncate block" title={instituteStr}>{instituteStr}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Amostra</span>
            <span className="font-semibold text-white block">{sampleSize}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Margem / Confiança</span>
            <span className="font-semibold text-white block">{marginStr} ({confidenceStr})</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Método de Coleta</span>
            <span className="font-semibold text-white truncate block" title={methodStr}>{methodStr}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Sexo / Gênero</span>
            <span className="font-semibold text-white truncate block" title={genderStr}>{genderStr}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Faixa Etária</span>
            <span className="font-semibold text-white truncate block" title={ageStr}>{ageStr}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Escolaridade</span>
            <span className="font-semibold text-white truncate block" title={eduStr}>{eduStr}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Renda</span>
            <span className="font-semibold text-white truncate block" title={incomeStr}>{incomeStr}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-[11px] text-gray-400">
          *Estes metadados definem a <strong>amostra da população pesquisada</strong>, não a intenção de voto cruzada por demografia.
        </span>
        <Link
          href={`/dashboard/pesquisas/${poll.id}`}
          className="text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold text-xs shrink-0"
        >
          Ver Ficha Completa <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}
