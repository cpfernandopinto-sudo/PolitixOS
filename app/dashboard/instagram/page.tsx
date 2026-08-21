import { Suspense } from 'react';
import InstagramUiFilters from '@/components/dashboard/instagram/InstagramUiFilters';
import InstagramIntelligenceDashboard from '@/components/dashboard/instagram/InstagramIntelligenceDashboard';
import { getAllowedTargetIds } from '@/lib/auth/dal';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';
import { getInstagramUiContract } from '@/lib/queries/instagram-ui';

export const metadata = {
  title: 'Inteligência Instagram | PolitixOS'
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function InstagramPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const allowedTargetIds = await getAllowedTargetIds();
  const globalFilters = parseGlobalFilters(searchParamsToURLSearchParams(params));
  const candidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);
  const format = first(params.format)?.toUpperCase();
  const page = Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1);
  const contract = await getInstagramUiContract({
    candidateIds: candidateIds ?? undefined,
    periodDays: globalFilters.period === 'all' ? null : Number(globalFilters.period),
    contentTypes: format && ['IMAGE', 'REEL', 'CAROUSEL'].includes(format) ? [format as 'IMAGE' | 'REEL' | 'CAROUSEL'] : undefined,
    risk: first(params.risk) ?? null,
    sentiment: first(params.sentiment) ?? null,
    topic: first(params.topic) ?? null,
    page,
    pageSize: 20,
  });

  return (
    <main className="space-y-6">
      <header className="border-b border-white/10 pb-5"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-400">Social Intelligence</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight text-white">Instagram</h1><p className="mt-1 text-sm text-slate-500">Desempenho editorial, pressão social e sinais de risco.</p></div><p className="text-xs text-slate-500">Atualizado {contract.collectionFreshness.lastCollectedAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(contract.collectionFreshness.lastCollectedAt)) : '—'}</p></div></header>
      <Suspense fallback={<div className="h-16 animate-pulse rounded-md bg-white/5" />}><InstagramUiFilters options={contract.filterOptions} /></Suspense>
      <InstagramIntelligenceDashboard contract={contract} />
    </main>
  );
}
