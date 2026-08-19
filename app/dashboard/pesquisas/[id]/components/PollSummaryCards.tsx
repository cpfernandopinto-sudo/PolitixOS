'use client';

import type { ElectoralPoll, ExtractedPollMetadata } from '@/lib/pesquisas/types';
import { Users, Calendar, DollarSign, Percent, Shield, Clock } from 'lucide-react';

interface Props {
  poll: ElectoralPoll;
  metadata: ExtractedPollMetadata;
}

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return 'Não informado';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'Não informado';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[2];
    const month = parts[1];
    const year = parts[0];
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${day} ${months[mIdx]} ${year}`;
    }
  }
  return dateStr;
}

function formatCampoRange(startStr: string | null, endStr: string | null): string {
  if (!startStr && !endStr) return 'Não informado';
  if (startStr && !endStr) return formatDateShort(startStr);
  if (!startStr && endStr) return formatDateShort(endStr);

  const startFormatted = formatDateShort(startStr);
  const endFormatted = formatDateShort(endStr);

  if (startFormatted === endFormatted) return startFormatted;
  return `${startFormatted.replace(/\s\d{4}$/, '')} – ${endFormatted}`;
}

export function PollSummaryCards({ poll, metadata }: Props) {
  const margin = metadata.marginError;
  const confidence = metadata.confidenceLevel;

  const rawDivulgacao = poll.rawSourceRow?.DT_DIVULGACAO;
  const divulgacaoDateStr = rawDivulgacao ? rawDivulgacao.split(' ')[0] : poll.dataRegistro;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Amostra */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Amostra</span>
          <Users size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">
            {poll.amostra ? `${poll.amostra.toLocaleString('pt-BR')}` : <span className="text-gray-500 text-sm font-normal">Não informado</span>}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">entrevistados</p>
        </div>
      </div>

      {/* Campo */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Campo</span>
          <Calendar size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white truncate">
            {formatCampoRange(poll.campoInicio, poll.campoFim)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">período de coleta</p>
        </div>
      </div>

      {/* Divulgação */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Divulgação</span>
          <Clock size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white truncate">
            {formatDateShort(divulgacaoDateStr)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">data de publicação</p>
        </div>
      </div>

      {/* Valor */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Valor</span>
          <DollarSign size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white truncate">
            {formatCurrency(poll.valor)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">custo oficial</p>
        </div>
      </div>

      {/* Margem de Erro */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Margem de Erro</span>
          <Percent size={14} className="text-blue-400" />
        </div>
        <div>
          {margin ? (
            <div>
              <p className="text-lg font-bold text-white">±{margin.value}%</p>
              <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                margin.isExtracted ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {margin.isExtracted ? 'Extraído do texto' : 'Dado estruturado'}
              </span>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Não disponível</p>
              <p className="text-[9px] text-gray-600 mt-0.5">no registro TSE</p>
            </div>
          )}
        </div>
      </div>

      {/* Confiança */}
      <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-400 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider">Confiança</span>
          <Shield size={14} className="text-blue-400" />
        </div>
        <div>
          {confidence ? (
            <div>
              <p className="text-lg font-bold text-white">{confidence.value}%</p>
              <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                confidence.isExtracted ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {confidence.isExtracted ? 'Extraído do texto' : 'Dado estruturado'}
              </span>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 italic">Não disponível</p>
              <p className="text-[9px] text-gray-600 mt-0.5">no registro TSE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
