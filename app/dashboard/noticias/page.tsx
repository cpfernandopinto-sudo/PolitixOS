import { Suspense } from 'react';
import NewsGlobalFilters from './NewsGlobalFilters';
import DashboardContent from './DashboardContent';
import { getCandidateOptions, getCityOptions, getSourceOptions, getCrisisAlerts, fetchMencoes } from '@/lib/queries/noticias';
import type { NoticiasFilters } from '@/lib/types/noticias';
import CrisisAlert from '@/components/dashboard/CrisisAlert';
import { getAllowedTargetIds } from '@/lib/auth/dal';

export const metadata = {
  title: "Radar de Notícias"
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY_VALUES = new Set([
  '', 'todos', 'todas', 'all', 'null', 'undefined',
]);

function str(v: string | string[] | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = Array.isArray(v) ? (v[0] ?? '') : v;
  if (EMPTY_VALUES.has(s.toLowerCase())) return null;
  return s || null;
}

function buildFilters(
  params: Record<string, string | string[] | undefined>
): NoticiasFilters {
  return {
    candidateId: str(params.candidateId),
    candidate: str(params.candidate),
    city: str(params.city),
    source: str(params.source),
    sentiment: str(params.sentiment),
    period: str(params.period),
    startDate: str(params.startDate),
    endDate: str(params.endDate),
    search: str(params.search),
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-[400px] rounded-xl bg-white/5" />
        <div className="lg:col-span-5 h-[400px] rounded-xl bg-white/5" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-white/5" />
        <div className="h-64 rounded-xl bg-white/5" />
      </div>
      <div className="h-32 rounded-xl bg-white/5" />
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 h-14 animate-pulse mb-6" />
  );
}

async function CrisisAlertsSection({ filters }: { filters: NoticiasFilters }) {
  const rows = await fetchMencoes(filters);
  const alerts = await getCrisisAlerts(rows);
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 mb-6">
      {alerts.map((alert, i) => (
        <CrisisAlert key={i} alert={alert} />
      ))}
    </div>
  );
}

export default async function NoticiasDashboard({ searchParams }: PageProps) {
  const params = await searchParams;
  const allowedTargetIds = await getAllowedTargetIds();
  const filters = { ...buildFilters(params), allowedTargetIds };

  const [candidates, cities, sources] = await Promise.all([
    getCandidateOptions(allowedTargetIds),
    getCityOptions(),
    getSourceOptions(),
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div className="pb-4 border-b border-white/[0.08] mb-6">
        <h1 className="text-2xl md:text-[28px] font-bold text-white tracking-tight leading-tight">Radar de Notícias</h1>
        <p className="text-cyan-400 text-[11px] font-semibold uppercase tracking-widest mt-1">
          Monitoramento e análise de risco em notícias e mídia
        </p>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
          Arquitetura profissional de monitoramento e análise de risco.
        </p>
      </div>

      <Suspense fallback={null}>
        <CrisisAlertsSection filters={filters} />
      </Suspense>

      <Suspense fallback={<FilterBarSkeleton />}>
        <NewsGlobalFilters candidates={candidates} cities={cities} sources={sources} />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent filters={filters} />
      </Suspense>
    </div>
  );
}
