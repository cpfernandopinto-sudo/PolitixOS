import { Suspense } from 'react';
import InstagramDashboard from '@/components/dashboard/InstagramDashboard';
import InstagramFilterBar from '@/components/dashboard/InstagramFilterBar';
import { computeInstagramKPIs, computeInstagramChartData, fetchInstagramData, cleanFilter, getInstagramFiltersOptions } from '@/lib/queries/instagram';
import { getAllowedTargetIds } from '@/lib/auth/dal';

export const metadata = {
  title: "Dashboard Instagram | PolitixOS"
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InstagramPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const allowedTargetIds = await getAllowedTargetIds();
  const filters = {
    period: cleanFilter(params.period),
    sentiment: cleanFilter(params.sentiment),
    risk: cleanFilter(params.risk),
    topic: cleanFilter(params.topic),
    post: cleanFilter(params.post),
    candidate: cleanFilter(params.candidate),
    allowedTargetIds,
  };


  // Antes, getInstagramKPIs/getInstagramChartData/fetchInstagramData eram
  // chamadas separadas aqui — cada uma repetia a MESMA busca completa
  // (targets+posts+comentários+IA) com o mesmo `filters`, 3 execuções
  // idênticas por carregamento (ver docs/AUDITORIA_PERFORMANCE_OVERVIEW.md,
  // Sprint 3). Agora busca uma vez e deriva KPIs/gráficos localmente — mesmo
  // resultado, 1 execução em vez de 3. `getInstagramFiltersOptions` continua
  // separada de propósito: mostra as opções de filtro (tópicos/candidatos)
  // para TODO o escopo permitido, não apenas os filtros já aplicados.
  const [data, options] = await Promise.all([
    fetchInstagramData(filters),
    // Passa allowedTargetIds para que o seletor de candidatos
    // mostre apenas os candidatos permitidos para este usuário
    getInstagramFiltersOptions(allowedTargetIds),
  ]);
  const kpis = computeInstagramKPIs(data.posts, data.comments);
  const charts = computeInstagramChartData(data.posts, data.comments);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Radar Instagram</h2>
        <p className="text-gray-400 text-sm mt-1">Análise de IA de comentários e interações na rede social.</p>
      </div>

      <Suspense fallback={<div className="h-14 bg-[#12192A] rounded-xl animate-pulse mb-6" />}>
        <InstagramFilterBar options={options} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-[#12192A] rounded-xl animate-pulse" />}>
        <InstagramDashboard kpis={kpis} charts={charts} posts={data.posts} comments={data.comments} />
      </Suspense>
    </div>
  );
}
