'use client';

import { Loader2, CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';

export type AsyncProcessingPhase =
  | 'idle'
  | 'checking'
  | 'collecting'
  | 'processing'
  | 'analyzing'
  | 'completed'
  | 'partial'
  | 'failed';

export interface StepItem {
  id: string;
  name: string;
  engine: string;
  status: 'aguardando' | 'em_execucao' | 'concluido' | 'erro';
}

interface Props {
  phase: AsyncProcessingPhase;
  municipio: string;
  uf: string;
  steps?: StepItem[];
  errorMessage?: string;
}

const DEFAULT_STEPS: StepItem[] = [
  { id: 'ibge', name: 'Perfil Territorial', engine: 'Motor IBGE', status: 'concluido' },
  { id: 'tse', name: 'Contexto Eleitoral', engine: 'Motor TSE', status: 'em_execucao' },
  { id: 'seguranca', name: 'Segurança Pública', engine: 'Motor Segurança', status: 'aguardando' },
  { id: 'saude', name: 'Infraestrutura de Saúde', engine: 'Motor Saúde / CNES', status: 'aguardando' },
  { id: 'economia', name: 'Economia & Finanças', engine: 'Motor Economia', status: 'aguardando' },
];

export default function TerritoryAsyncProgress({
  phase,
  municipio,
  uf,
  steps = DEFAULT_STEPS,
  errorMessage,
}: Props) {
  if (phase === 'idle') return null;

  return (
    <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
      {/* Background glow overlay */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            {phase === 'completed' ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : phase === 'failed' ? (
              <AlertTriangle size={20} className="text-red-400" />
            ) : (
              <Loader2 size={20} className="animate-spin text-cyan-400" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {phase === 'completed'
                ? `Inteligência Territorial Consolidada — ${municipio}/${uf}`
                : phase === 'failed'
                ? `Falha no Processamento — ${municipio}/${uf}`
                : `Preparando Inteligência Territorial de ${municipio}/${uf}`}
              <Sparkles size={14} className="text-cyan-400 animate-pulse" />
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {phase === 'completed'
                ? 'Todos os motores territoriais foram processados e integrados com sucesso.'
                : phase === 'failed'
                ? errorMessage ?? 'Ocorreu um erro no processamento dos motores.'
                : 'Orquestrando coleta, normalização e síntese de inteligência dos motores.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300">
          Fase: {phase.toUpperCase()}
        </span>
      </div>

      {/* Engine Steps Progress */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        {steps.map((step) => {
          return (
            <div
              key={step.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                {step.status === 'concluido' ? (
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ) : step.status === 'em_execucao' ? (
                  <Loader2 size={14} className="text-cyan-400 animate-spin shrink-0" />
                ) : step.status === 'erro' ? (
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                ) : (
                  <Clock size={14} className="text-gray-500 shrink-0" />
                )}
                <span className="text-gray-200 font-medium">{step.name}</span>
                <span className="text-[10px] text-gray-500 font-mono">({step.engine})</span>
              </div>

              <div>
                {step.status === 'concluido' && (
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Concluído
                  </span>
                )}
                {step.status === 'em_execucao' && (
                  <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Processando...
                  </span>
                )}
                {step.status === 'aguardando' && (
                  <span className="text-[11px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                    Aguardando
                  </span>
                )}
                {step.status === 'erro' && (
                  <span className="text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    Erro
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
