import { Suspense } from 'react';
import {
  fetchFacebookData,
  computeFacebookKPIs,
  computeFacebookCharts,
  computeFacebookAlert,
  cleanFilter,
  getFacebookFilterOptions,
} from '@/lib/queries/facebook';
import FacebookDashboard from '@/components/dashboard/FacebookDashboard';
import FacebookFilterBar from '@/components/dashboard/FacebookFilterBar';
import { getActiveClientId, getAllowedTargetIds } from '@/lib/auth/dal';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';

export const metadata = {
  title: 'Facebook — Inteligência e Monitoramento | PolitixOS',
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FacebookPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [allowedTargetIds, activeClientId] = await Promise.all([
    getAllowedTargetIds(),
    getActiveClientId(),
  ]);

  const globalFilters = parseGlobalFilters(searchParamsToURLSearchParams(params));
  const candidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);

  const filters = {
    period: globalFilters.period === 'all' ? null : globalFilters.period,
    sentiment: cleanFilter(params.sentiment),
    risk: cleanFilter(params.risk),
    topic: cleanFilter(params.topic),
    search: cleanFilter(params.search),
    candidateIds,
    allowedTargetIds,
    clientId: activeClientId,
  };

  const [data, options] = await Promise.all([
    fetchFacebookData(filters),
    getFacebookFilterOptions(allowedTargetIds, activeClientId),
  ]);

  const kpis = computeFacebookKPIs(data.items);
  const charts = computeFacebookCharts(data.items);
  const alert = computeFacebookAlert(data.items);

  const lastPostDate = data.items.length > 0 ? data.items[0].post.taken_at : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Ultra-Compacto */}
      <header className="flex items-center gap-3 border-b border-white/[0.08] pb-3 mb-1">
        <span className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-400 shrink-0">Social Intelligence</span>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">Facebook</h1>
        <span className="text-[10px] text-slate-500 leading-none hidden sm:inline">Monitoramento de páginas, engajamento e inteligência reputacional.</span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono shrink-0">
          {lastPostDate
            ? `Última pub.: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastPostDate))}`
            : 'Sem atualizações recentes'}
        </span>
      </header>

      {/* Filters Bar */}
      <Suspense fallback={<div className="h-14 surface-primary rounded-xl animate-pulse" />}>
        <FacebookFilterBar options={options} />
      </Suspense>

      {/* Dashboard Executive Body */}
      <Suspense fallback={<div className="h-64 surface-primary rounded-xl animate-pulse" />}>
        <FacebookDashboard
          kpis={kpis}
          charts={charts}
          items={data.items}
          alert={alert}
          completeness={data.completeness}
        />
      </Suspense>
    </div>
  );
}
