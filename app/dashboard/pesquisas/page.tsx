import { redirect } from 'next/navigation';
import { requireAuth, getAllowedTargetIds } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabaseClient';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';
import {
  listPolls,
  getPesquisasKpis,
  getAvailableFilterOptions,
  listPollResultsWithPoll,
} from '@/lib/pesquisas/repository';
import { getPesquisasSourceDescriptor } from '@/lib/pesquisas/source';
import { PesquisasCockpitView, type GlobalCandidateContext } from './components/PesquisasCockpitView';

export const metadata = {
  title: 'Pesquisas Eleitorais | Cockpit Executivo | PolitixOS',
  description: 'Cockpit executivo de inteligência eleitoral e pesquisas registradas no TSE/PesqEle.',
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Sprint 2B, P0.1 — resolve o candidato do CONTEXTO GLOBAL do PolitixOS
 * (mesmo contrato de lib/filters/global.ts já usado por Visão Geral/
 * Notícias/Instagram/X — nenhum estado novo, nenhum provider novo). "Existe
 * candidato global" = exatamente 1 id efetivo após interseção com as
 * permissões do usuário (mesma regra de app/dashboard/overview/page.tsx).
 * Também resolve `state`/`poll_monitoring_office` do target (quando
 * existirem) para que a corrida (UF/cargo) inicial do Cockpit já seja a do
 * candidato selecionado — sem isso, "abrir em modo Cleitinho" seria inútil
 * sempre que o candidato não pertencesse à corrida padrão (DF/Governador).
 */
async function resolveGlobalCandidateContext(
  searchParams: Record<string, string | string[] | undefined>
): Promise<GlobalCandidateContext | null> {
  const urlParams = searchParamsToURLSearchParams(searchParams);
  const globalFilters = parseGlobalFilters(urlParams);
  if (globalFilters.candidateMode !== 'SELECTED') return null;

  const allowedTargetIds = await getAllowedTargetIds();
  const effectiveCandidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);
  if (!effectiveCandidateIds || effectiveCandidateIds.length !== 1) return null;

  const client = createAdminClient();
  const { data } = await client
    .from('targets')
    .select('candidate_name, state, poll_monitoring_office')
    .eq('id', effectiveCandidateIds[0])
    .maybeSingle();

  if (!data?.candidate_name) return null;

  return {
    candidateName: data.candidate_name,
    uf: data.state ?? null,
    cargo: data.poll_monitoring_office ?? null,
  };
}

export default async function PesquisasPage({ searchParams }: Props) {
  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('pesquisas')) {
    redirect('/dashboard/sem-permissao');
  }

  const resolvedSearchParams = await searchParams;

  const [kpis, registeredPolls, results, filterOptions, globalCandidate] = await Promise.all([
    getPesquisasKpis(),
    listPolls(),
    listPollResultsWithPoll(),
    getAvailableFilterOptions(),
    resolveGlobalCandidateContext(resolvedSearchParams),
  ]);

  const source = getPesquisasSourceDescriptor();

  return (
    <PesquisasCockpitView
      registeredPolls={registeredPolls}
      allResults={results}
      filterOptions={filterOptions}
      kpis={kpis}
      source={{ portalUrl: source.portalUrl, sourceUrl: source.sourceUrl }}
      isAdmin={session.role === 'admin'}
      globalCandidate={globalCandidate}
    />
  );
}
