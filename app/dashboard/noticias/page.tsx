import { Suspense } from 'react';
import FilterBar from '@/components/FilterBar';
import DashboardContent from './DashboardContent';
import { getCandidateOptions, getCityOptions, getSourceOptions, getCrisisAlerts } from '@/lib/queries/noticias';
import type { NoticiasFilters } from '@/lib/types/noticias';
import CrisisAlert from '@/components/dashboard/CrisisAlert';
import { getAllowedTargetIds } from '@/lib/auth/dal';

export const metadata = {
  title: "Radar de Notícias"
};

// Next.js 15+: searchParams é uma Promise
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Valores que NÃO devem ser tratados como filtro real
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
    candidate: str(params.candidate),
    city: str(params.city),
    source: str(params.source),
    sentiment: str(params.sentiment),
    period: str(params.period),
    search: str(params.search),
  };
}

// Skeleton mostrado enquanto DashboardContent carrega
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${i === 0 ? 'lg:col-span-2' : ''} h-24 rounded-xl bg-white/5`} />
        ))}
      </div>
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-white/5" />
        ))}
      </div>
      {/* Feed */}
      <div className="h-64 rounded-xl bg-white/5" />
    </div>
  );
}

// Skeleton do FilterBar enquanto useSearchParams hidrata
function FilterBarSkeleton() {
  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 h-14 animate-pulse mb-6" />
  );
}

async function CrisisAlertsSection({ filters }: { filters: NoticiasFilters }) {
  const alerts = await getCrisisAlerts(filters);
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

  // Opções de filtro: candidatos respeitam allowedTargetIds do usuário
  const [candidates, cities, sources] = await Promise.all([
    getCandidateOptions(allowedTargetIds),
    getCityOptions(),
    getSourceOptions(),
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Radar de Notícias</h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitoramento em tempo real de citações, sentimento e risco político.
          </p>
        </div>
      </div>

      {/* Alertas de Crise */}
      <Suspense fallback={null}>
        <CrisisAlertsSection filters={filters} />
      </Suspense>

      {/* FilterBar precisa de Suspense por usar useSearchParams() internamente */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar candidates={candidates} cities={cities} sources={sources} />
      </Suspense>

      {/* DashboardContent suspende enquanto busca dados filtrados */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent filters={filters} />
      </Suspense>
    </div>
  );
}
