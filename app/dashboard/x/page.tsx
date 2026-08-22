import { Suspense } from 'react';
import { computeXKPIs, computeXChartData, computeXAlert, fetchXData, cleanFilter, getXFiltersOptions } from '@/lib/queries/x';
import XDashboard from '@/components/dashboard/XDashboard';
import XFilterBar from '@/components/dashboard/XFilterBar';
import { getActiveClientId, getAllowedTargetIds } from '@/lib/auth/dal';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';
import type { XOrigin } from '@/lib/x/v2-contract';

export const metadata = {
  title: "X — Inteligência e Monitoramento | PolitixOS",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function XPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [allowedTargetIds, activeClientId] = await Promise.all([getAllowedTargetIds(), getActiveClientId()]);
  const globalFilters = parseGlobalFilters(searchParamsToURLSearchParams(params));
  const candidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);
  const filters = {
    period: globalFilters.period === 'all' ? null : globalFilters.period,
    sentiment: cleanFilter(params.sentiment),
    risk: cleanFilter(params.risk),
    topic: cleanFilter(params.topic),
    origin: cleanFilter(params.origin) as 'ALL' | XOrigin | null,
    candidateIds,
    search: cleanFilter(params.search),
    allowedTargetIds,
    clientId: activeClientId,
  };

  const [data, options] = await Promise.all([
    fetchXData(filters),
    getXFiltersOptions(allowedTargetIds, activeClientId),
  ]);

  const kpis = computeXKPIs(data.analyticsPosts, data.analyticsReplies);
  const charts = computeXChartData(data.analyticsPosts, data.analyticsReplies);
  const alert = computeXAlert(data.analyticsPosts);

  return (
    <div className="space-y-5 pb-12">
      <Suspense fallback={<div className="h-14 surface-primary rounded-xl animate-pulse" />}>
        <XFilterBar options={options} />
      </Suspense>

      <Suspense fallback={<div className="h-64 surface-primary rounded-xl animate-pulse" />}>
        <XDashboard
          kpis={kpis}
          charts={charts}
          posts={data.posts}
          analyticsPosts={data.analyticsPosts}
          replies={data.replies}
          analyticsReplies={data.analyticsReplies}
          alert={alert}
          completeness={data.completeness}
        />
      </Suspense>
    </div>
  );
}
