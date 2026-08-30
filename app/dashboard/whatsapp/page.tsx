import { Suspense } from 'react';
import {
  fetchWhatsAppDashboardData,
  cleanFilter,
} from '@/lib/queries/whatsapp';
import WhatsAppDashboard from '@/components/dashboard/WhatsAppDashboard';
import WhatsAppFilterBar from '@/components/dashboard/WhatsAppFilterBar';
import { getActiveClientId, getAllowedTargetIds } from '@/lib/auth/dal';
import { parseGlobalFilters, getEffectiveCandidateIds, searchParamsToURLSearchParams } from '@/lib/filters/global';

export const metadata = {
  title: 'WhatsApp Intelligence — Monitoramento e Inteligência | PolitixOS',
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WhatsAppPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [allowedTargetIds, activeClientId] = await Promise.all([
    getAllowedTargetIds(),
    getActiveClientId(),
  ]);

  const globalFilters = parseGlobalFilters(searchParamsToURLSearchParams(params));
  const candidateIds = getEffectiveCandidateIds(globalFilters, allowedTargetIds);

  const filters = {
    period: cleanFilter(params.period) || (globalFilters.period === 'all' ? null : globalFilters.period),
    chat_id: cleanFilter(params.chat_id) || cleanFilter(params.group),
    group: cleanFilter(params.group),
    sender: cleanFilter(params.sender),
    theme: cleanFilter(params.theme) || cleanFilter(params.topic),
    sentiment: cleanFilter(params.sentiment),
    risk_level: cleanFilter(params.risk_level) || cleanFilter(params.risk),
    relevance: cleanFilter(params.relevance),
    message_type: cleanFilter(params.message_type) || cleanFilter(params.type),
    analysis_status: cleanFilter(params.analysis_status),
    q: cleanFilter(params.q) || cleanFilter(params.search),
    candidate: cleanFilter(params.candidate),
    location: cleanFilter(params.location),
    cursor: cleanFilter(params.cursor),
    candidateIds,
    allowedTargetIds,
    clientId: activeClientId,
  };

  const data = await fetchWhatsAppDashboardData(filters);

  const lastMessageTime = data.summary.freshness.last_message_at;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Ultra-Compacto */}
      <header className="flex items-center gap-3 border-b border-white/[0.08] pb-3 mb-1">
        <span className="text-[9px] font-bold uppercase tracking-[.2em] text-emerald-400 shrink-0">
          WhatsApp Intelligence
        </span>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">
          WhatsApp
        </h1>
        <span className="text-[10px] text-slate-500 leading-none hidden sm:inline">
          Monitoramento de grupos, alertas em tempo real e inteligência comunitária.
        </span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono shrink-0">
          {lastMessageTime
            ? `Última coleta: ${new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(lastMessageTime))}`
            : 'Sem atualizações recentes'}
        </span>
      </header>

      {/* Filters Bar */}
      <Suspense fallback={<div className="h-24 surface-primary rounded-xl animate-pulse" />}>
        <WhatsAppFilterBar options={data.filterOptions} />
      </Suspense>

      {/* Dashboard Executive Body */}
      <Suspense fallback={<div className="h-96 surface-primary rounded-xl animate-pulse" />}>
        <WhatsAppDashboard
          summary={data.summary}
          items={data.items}
          groups={data.groups}
          filterOptions={data.filterOptions}
          criticalAlert={data.criticalAlert}
          nextCursor={data.nextCursor}
          hasMore={data.hasMore}
          completeness={data.completeness}
        />
      </Suspense>
    </div>
  );
}
