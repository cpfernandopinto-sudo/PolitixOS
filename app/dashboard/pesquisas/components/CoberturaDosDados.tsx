'use client';

import { useMemo, useState } from 'react';
import type { ElectoralPoll, ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import type { TemporalSeriesEntry } from '@/lib/pesquisas/results-repository';
import { classifyPollIntegrationStatus } from '@/lib/pesquisas/integrationStatus';
import { Database } from 'lucide-react';

interface Props {
  registeredPolls: ElectoralPoll[];
  resultsPollIds: Set<string>;
  metrics: ExecutiveCockpitMetrics;
  temporalSeries: TemporalSeriesEntry[];
}

function Stat({ label, value, tone = 'default', testId }: { label: string; value: string | number; tone?: 'default' | 'warn' | 'accent'; testId: string }) {
  const cls = tone === 'warn' ? 'text-amber-400' : tone === 'accent' ? 'text-cyan-400' : 'text-white';
  return (
    <div className="space-y-0.5">
      <div className={`text-lg font-bold font-mono ${cls}`} data-testid={testId}>{value}</div>
      <div className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

/**
 * Bloco 10 do briefing Sprint 2B — "COBERTURA DOS DADOS". Todos os números
 * vêm do domínio real (electoral_polls/electoral_poll_results já
 * carregados), nada hardcoded. Reaproveita `classifyPollIntegrationStatus`
 * (Sprint 1) e o funil já calculado em `metrics`/`temporalSeries` (Sprint
 * 2A) — nenhuma contagem nova é inventada aqui.
 */
export function CoberturaDosDados({ registeredPolls, resultsPollIds, metrics, temporalSeries }: Props) {
  const { aguardandoDivulgacao, naoIntegradas, institutos } = useMemo(() => {
    let aguardando = 0;
    let naoIntegrada = 0;
    const instSet = new Set<string>();

    for (const p of registeredPolls) {
      if (p.instituto) instSet.add(p.instituto);
      if (resultsPollIds.has(p.id)) continue;
      const dtDivulgacao = (p.rawSourceRow as Record<string, string> | null)?.DT_DIVULGACAO ?? null;
      const status = classifyPollIntegrationStatus(false, dtDivulgacao).status;
      if (status === 'AGUARDANDO_DIVULGACAO') aguardando += 1;
      else naoIntegrada += 1;
    }

    return { aguardandoDivulgacao: aguardando, naoIntegradas: naoIntegrada, institutos: instSet.size };
  }, [registeredPolls, resultsPollIds]);

  const usadasNaSerie = useMemo(
    () => new Set(temporalSeries.flatMap((e) => e.points.map((p) => p.pollId))).size,
    [temporalSeries]
  );

  // Data.now() capturada uma vez no mount (inicializador "lazy" de useState) — nunca chamada
  // diretamente no corpo do componente, o que violaria a regra de pureza de render do React.
  const [now] = useState(() => Date.now());
  const idadeDias = useMemo(() => {
    if (!metrics.lastUpdateDate) return null;
    const d = new Date(metrics.lastUpdateDate);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24)));
  }, [metrics.lastUpdateDate, now]);

  return (
    <section className="surface-primary p-3.5 space-y-2">
      <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
        <Database size={13} className="text-cyan-400" /> Cobertura dos Dados
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
        <Stat testId="cov-registradas" label="Registradas" value={metrics.totalPollsInSlice} />
        <Stat testId="cov-com-resultado" label="Com Resultado" value={metrics.pollsWithResultsCount} tone="accent" />
        <Stat testId="cov-aguardando" label="Aguard. Divulgação" value={aguardandoDivulgacao} />
        <Stat testId="cov-nao-integradas" label="Não Integradas" value={naoIntegradas} tone={naoIntegradas > 0 ? 'warn' : 'default'} />
        <Stat testId="cov-comparaveis" label="Comparáveis" value={metrics.comparableOtherPollsCount} />
        <Stat testId="cov-usadas-serie" label="Usadas na Série" value={usadasNaSerie} />
        <Stat testId="cov-institutos" label="Institutos" value={institutos} />
        <Stat testId="cov-idade" label="Idade Últ. Pesquisa" value={idadeDias !== null ? `${idadeDias}d` : '—'} />
      </div>
    </section>
  );
}
