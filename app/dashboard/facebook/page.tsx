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
      {/* Header */}
      <header className="border-b border-white/10 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-400">Social Intelligence</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Facebook</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Monitoramento de páginas, engajamento e inteligência reputacional no Facebook.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            {lastPostDate
              ? `Última publicação: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastPostDate))}`
              : 'Sem atualizações recentes'}
          </p>
        </div>
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
