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
      <header className="flex items-center gap-3 border-b border-white/[0.08] pb-3 mb-1">
        <span className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-400 shrink-0">Social Intelligence</span>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">Instagram</h1>
        <span className="text-[10px] text-slate-500 leading-none">Desempenho editorial, pressão social e sinais de risco.</span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono shrink-0">
          {contract.collectionFreshness.lastCollectedAt
            ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(contract.collectionFreshness.lastCollectedAt))
            : '—'}
        </span>
      </header>
      <Suspense fallback={<div className="h-16 animate-pulse rounded-md bg-white/5" />}><InstagramUiFilters options={contract.filterOptions} /></Suspense>
      <InstagramIntelligenceDashboard contract={contract} />
    </main>
  );
}
