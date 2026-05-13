import { Suspense } from 'react';
import { getXKPIs, getXChartData, fetchXData, getXAlert, cleanFilter, getXFiltersOptions } from '@/lib/queries/x';
import XDashboard from '@/components/dashboard/XDashboard';
import XFilterBar from '@/components/dashboard/XFilterBar';
import { getAllowedTargetIds } from '@/lib/auth/dal';

export const metadata = {
  title: "Radar X | PolitixOS"
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function XPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const allowedTargetIds = await getAllowedTargetIds();
  const filters = {
    period: cleanFilter(params.period),
    sentiment: cleanFilter(params.sentiment),
    risk: cleanFilter(params.risk),
    topic: cleanFilter(params.topic),
    candidate: cleanFilter(params.candidate),
    search: cleanFilter(params.search),
    allowedTargetIds,
  };

  const [kpis, charts, data, alert, options] = await Promise.all([
    getXKPIs(filters),
    getXChartData(filters),
    fetchXData(filters),
    getXAlert(filters),
    getXFiltersOptions(allowedTargetIds),
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Radar X</h2>
        <p className="text-gray-400 text-sm mt-1">Monitoramento em tempo real de discurso político e reação pública no X (Twitter).</p>
      </div>

      <Suspense fallback={<div className="h-14 bg-[#12192A] rounded-xl animate-pulse mb-6" />}>
        <XFilterBar options={options} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-[#12192A] rounded-xl animate-pulse" />}>
        <XDashboard kpis={kpis} charts={charts} posts={data.posts} replies={data.replies} alert={alert} />
      </Suspense>
    </div>
  );
}
