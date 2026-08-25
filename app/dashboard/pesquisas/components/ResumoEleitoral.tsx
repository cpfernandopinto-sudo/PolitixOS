'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import type { ObservedHistoryResult } from '@/lib/pesquisas/observedHistory';
import { deriveTrendStatus, type AnalyticalStatusResult } from '@/lib/pesquisas/analyticsEngine';
import { Crown, Target, Activity, TrendingUp, TrendingDown, Minus, HelpCircle, ShieldAlert } from 'lucide-react';

interface Props {
  metrics: ExecutiveCockpitMetrics;
  observedHistory: ObservedHistoryResult;
  analyticalStatus: AnalyticalStatusResult;
  /** null = MODO A (Todos os Candidatos) — resumo da corrida. Preenchido = MODO B — resumo do candidato. */
  referenceCandidate: string | null;
}

function TrendBadge({ status }: { status: ReturnType<typeof deriveTrendStatus>['status'] }) {
  const map = {
    CRESCIMENTO: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: TrendingUp },
    QUEDA: { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20', Icon: TrendingDown },
    ESTABILIDADE: { cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', Icon: Minus },
    INCONCLUSIVA: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', Icon: HelpCircle },
  } as const;
  const { cls, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded border font-mono ${cls}`}>
      <Icon size={12} /> {status}
    </span>
  );
}

const analyticalStatusCls: Record<AnalyticalStatusResult['status'], string> = {
  ESTÁVEL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ATENÇÃO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CRÍTICO: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  INCONCLUSIVO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'SEM CLASSIFICAÇÃO': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/**
 * Bloco 3 do briefing Sprint 2B — "RESUMO ELEITORAL". Um único container
 * executivo com subdivisões, em vez da coleção anterior de cards
 * desconectados (ExecutiveSnapshotCards, aposentado). Nunca mostra um
 * percentual sem contexto (fonte + data), nunca infere ESTÁVEL sem série
 * suficiente (delega isso a `analyticalStatus`/`deriveTrendStatus`, ambos
 * já corrigidos na Sprint 2A — nenhuma matemática nova aqui).
 */
export function ResumoEleitoral({ metrics, observedHistory, analyticalStatus, referenceCandidate }: Props) {
  const trend = deriveTrendStatus(metrics);

  if (!metrics.intencaoMaisRecente) {
    return (
      <section className="surface-primary p-4 space-y-2">
        <h2 className="text-white font-bold text-sm uppercase tracking-wider">Resumo Eleitoral</h2>
        <p className="text-slate-400 text-xs py-4 text-center">
          Ainda não há resultados integrados para esta corrida (UF/cargo/turno/tipo selecionados).
        </p>
      </section>
    );
  }

  // Sprint 2B, P1 — nunca deixar o usuário interpretar o % como média/agregado: sempre junto do
  // instituto, data, cenário e registro TSE que o originaram.
  const pollSourceLabel = `${metrics.intencaoMaisRecente.instituto} · ${metrics.intencaoMaisRecente.pollDate ?? 'data não informada'}`;
  const pollSourceLabelFull = [
    metrics.intencaoMaisRecente.instituto,
    metrics.intencaoMaisRecente.pollDate ?? 'data não informada',
    `TSE ${metrics.intencaoMaisRecente.tseRegistrationNumber}`,
    metrics.intencaoMaisRecente.cenario,
  ]
    .filter(Boolean)
    .join(' · ');

  // MODO A — Todos os Candidatos: fotografia da corrida.
  if (!referenceCandidate) {
    return (
      <section className="surface-primary p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Resumo Eleitoral</h2>
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${analyticalStatusCls[analyticalStatus.status]}`}
            title={analyticalStatus.reason}
          >
            {analyticalStatus.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-0.5">
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Crown size={11} /> Líder
            </div>
            <div className="text-lg font-bold text-white truncate" title={metrics.intencaoMaisRecente.candidateName}>
              {metrics.intencaoMaisRecente.candidateName}
            </div>
            <div className="text-cyan-300 font-mono text-sm font-bold">{metrics.intencaoMaisRecente.percentage}%</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Target size={11} /> 2º Colocado
            </div>
            {metrics.runnerUpResult ? (
              <>
                <div className="text-lg font-bold text-white truncate" title={metrics.runnerUpResult.candidateName}>
                  {metrics.runnerUpResult.candidateName}
                </div>
                <div className="text-slate-300 font-mono text-sm font-bold">{metrics.runnerUpResult.percentage}%</div>
              </>
            ) : (
              <div className="text-slate-500 text-xs italic pt-2">Não disponível</div>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Activity size={11} /> Gap Atual
            </div>
            {metrics.gapConcorrente ? (
              <div className="text-lg font-bold text-cyan-400 font-mono">+{metrics.gapConcorrente.gap} <span className="text-xs font-normal text-slate-500">p.p.</span></div>
            ) : (
              <div className="text-slate-500 text-xs italic pt-2">Não disponível</div>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tendência da Corrida</div>
            <TrendBadge status={trend.status} />
          </div>
        </div>

        <p className="text-slate-500 text-[10px] font-mono pt-1 border-t border-white/5">
          Pesquisa de referência: {pollSourceLabelFull}
        </p>
      </section>
    );
  }

  // MODO B — Candidato Selecionado.
  const isLeader =
    metrics.referenceCandidate !== null &&
    metrics.intencaoMaisRecente.candidateName.toLowerCase() === metrics.referenceCandidate.toLowerCase();
  const foundInReferencePoll = isLeader || metrics.analyzedCandidateResult !== null;

  if (!foundInReferencePoll) {
    return (
      <section className="surface-primary p-4 space-y-2">
        <h2 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert size={14} className="text-amber-400" /> {referenceCandidate}
        </h2>
        <p className="text-slate-400 text-xs py-2">
          {referenceCandidate} não aparece no cenário de referência ({pollSourceLabel}). Veja o Histórico das Pesquisas para outros levantamentos deste candidato.
        </p>
      </section>
    );
  }

  const currentPct = isLeader ? metrics.intencaoMaisRecente.percentage : metrics.analyzedCandidateResult!.percentage;
  const rank = isLeader ? 1 : metrics.analyzedCandidateResult!.rank;
  const adversaryName = isLeader ? metrics.runnerUpResult?.candidateName ?? null : metrics.intencaoMaisRecente.candidateName;
  const gapToAdversary = isLeader ? metrics.gapConcorrente?.gap ?? null : metrics.analyzedCandidateResult!.gapToLeader;

  return (
    <section className="surface-primary p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white font-bold text-sm uppercase tracking-wider truncate">{referenceCandidate}</h2>
        <span
          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${analyticalStatusCls[analyticalStatus.status]}`}
          title={analyticalStatus.reason}
        >
          {analyticalStatus.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-cyan-300 font-mono">{currentPct}%</div>
          <div className="text-[10px] text-slate-400">Na última pesquisa</div>
          <div className="text-[9px] text-slate-500 font-mono truncate" title={pollSourceLabelFull}>{pollSourceLabel}</div>
        </div>

        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-white font-mono">{rank ?? '—'}º</div>
          <div className="text-[10px] text-slate-400">Posição atual</div>
        </div>

        <div className="space-y-0.5">
          {gapToAdversary !== null ? (
            <div className="text-2xl font-bold text-white font-mono">
              {isLeader ? '+' : '−'}{gapToAdversary} <span className="text-xs font-normal text-slate-500">p.p.</span>
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic pt-2">Não disponível</div>
          )}
          <div className="text-[10px] text-slate-400">
            {isLeader ? 'para o 2º colocado' : `para ${adversaryName ?? 'o líder'}`}
          </div>
        </div>

        <div className="space-y-0.5">
          {observedHistory.minPercentage !== null && observedHistory.maxPercentage !== null ? (
            <div className="text-lg font-bold text-white font-mono">
              {observedHistory.minPercentage}% – {observedHistory.maxPercentage}%
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic pt-2">Sem histórico</div>
          )}
          <div className="text-[10px] text-slate-400">Faixa observada</div>
        </div>

        <div className="space-y-0.5">
          <TrendBadge status={trend.status} />
          <div className="text-[10px] text-slate-400 pt-0.5">Tendência</div>
        </div>

        <div className="space-y-0.5">
          <div className="text-2xl font-bold text-white font-mono">{metrics.pollsWithResultsCount}</div>
          <div className="text-[10px] text-slate-400">Pesquisas com resultado</div>
        </div>
      </div>
    </section>
  );
}
