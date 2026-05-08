import { Suspense } from 'react';
import InstagramDashboard from '@/components/dashboard/InstagramDashboard';
import InstagramFilterBar from '@/components/dashboard/InstagramFilterBar';
import { getInstagramKPIs, getInstagramChartData, fetchInstagramData, getInstagramAlerts, cleanFilter, getInstagramFiltersOptions } from '@/lib/queries/instagram';
import CrisisAlert from '@/components/dashboard/CrisisAlert';

export const metadata = {
  title: "Dashboard Instagram | PolitixOS"
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InstagramPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    period: cleanFilter(params.period),
    sentiment: cleanFilter(params.sentiment),
    risk: cleanFilter(params.risk),
    topic: cleanFilter(params.topic),
    post: cleanFilter(params.post),
  };

  const [kpis, charts, feed, alerts, options] = await Promise.all([
    getInstagramKPIs(filters),
    getInstagramChartData(filters),
    fetchInstagramData(filters),
    getInstagramAlerts(filters),
    getInstagramFiltersOptions(),
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Radar Instagram</h2>
        <p className="text-gray-400 text-sm mt-1">Análise de IA de comentários e interações na rede social.</p>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {alerts.map((a, i) => (
            <CrisisAlert key={i} alert={a} />
          ))}
        </div>
      )}

      <Suspense fallback={<div className="h-14 bg-[#12192A] rounded-xl animate-pulse mb-6" />}>
        <InstagramFilterBar options={options} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-[#12192A] rounded-xl animate-pulse" />}>
        <InstagramDashboard kpis={kpis} charts={charts} feed={feed} />
      </Suspense>
    </div>
  );
}
