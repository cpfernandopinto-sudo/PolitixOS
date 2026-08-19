import { Suspense } from 'react';
import { computeXKPIs, computeXChartData, computeXAlert, fetchXData, cleanFilter, getXFiltersOptions } from '@/lib/queries/x';
import XDashboard from '@/components/dashboard/XDashboard';
import XFilterBar from '@/components/dashboard/XFilterBar';
import { getAllowedTargetIds } from '@/lib/auth/dal';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';

export const metadata = {
  title: "Radar X | PolitixOS"
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function XPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const allowedTargetIds = await getAllowedTargetIds();
  const globalFilters = parseGlobalFilters(searchParamsToURLSearchParams(params));
  const candidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);
  const filters = {
    period: globalFilters.period === 'all' ? null : globalFilters.period,
    sentiment: cleanFilter(params.sentiment),
    risk: cleanFilter(params.risk),
    topic: cleanFilter(params.topic),
    candidateIds,
    search: cleanFilter(params.search),
    allowedTargetIds,
  };

  // Antes, getXKPIs/getXChartData/fetchXData/getXAlert eram chamadas
  // separadas aqui — cada uma repetia a MESMA busca completa
  // (targets+posts+IA+replies) com o mesmo `filters`, 4 execuções idênticas
  // por carregamento (ver docs/AUDITORIA_PERFORMANCE_OVERVIEW.md, Sprint 3).
  // Agora busca uma vez e deriva KPIs/gráficos/alerta localmente — mesmo
  // resultado, 1 execução em vez de 4. `getXFiltersOptions` continua
  // separada de propósito: mostra as opções de filtro para TODO o escopo
  // permitido, não apenas os filtros já aplicados.
  const [data, options] = await Promise.all([
    fetchXData(filters),
    getXFiltersOptions(allowedTargetIds),
  ]);
  const kpis = computeXKPIs(data.posts, data.replies);
  const charts = computeXChartData(data.posts, data.replies);
  const alert = computeXAlert(data.posts);

  return (
    <div className="space-y-6 pb-12">
      <Suspense fallback={<div className="h-14 bg-[#12192A] rounded-xl animate-pulse mb-6" />}>
        <XFilterBar options={options} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-[#12192A] rounded-xl animate-pulse" />}>
        <XDashboard kpis={kpis} charts={charts} posts={data.posts} replies={data.replies} alert={alert} />
      </Suspense>
    </div>
  );
}
