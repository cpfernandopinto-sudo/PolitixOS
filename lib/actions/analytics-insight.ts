'use server';

import { requireAuth } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabaseClient';
import { getExecutiveOverviewData, type OverviewFilters } from '@/lib/queries/overview';
import { buildAnalyticsContext } from '@/lib/ai/analytics-context';
import { getOrGenerateInsight } from '@/lib/ai/analytics-service';
import type { AssistedInsightResult } from '@/lib/ai/analytics-schema';
import { getElectoralSignalsSummaryForCandidate, type ElectoralSignalSummary } from '@/lib/pesquisas/monitoring';

export interface AnalyticsInsightRequest {
  candidate: string | null;
  period: string | null;
  forceRefresh?: boolean;
}

/**
 * Server Action que gera (ou reaproveita do cache) a Leitura Analítica
 * Assistida para os filtros informados. Reaplica a MESMA lógica de
 * permissão da Visão Geral (requireAuth + allowedTargetIds) — a IA nunca
 * vê dados fora do escopo do usuário, porque o contexto vem inteiramente
 * de `getExecutiveOverviewData`, que já respeita esse escopo.
 */
export async function generateExecutiveInsight(request: AnalyticsInsightRequest): Promise<AssistedInsightResult> {
  const session = await requireAuth();
  const allowedTargetIds = session.role === 'admin' ? null : session.allowedTargetIds ?? [];

  const period = ['all', '1', '7', '30'].includes(request.period || '') ? request.period : 'all';
  const filters: OverviewFilters = {
    candidate: request.candidate,
    period,
    allowedTargetIds,
  };

  const data = await getExecutiveOverviewData(filters);

  // PESQUISAS-N8N-01 — só busca sinais eleitorais quando há candidato
  // filtrado; getElectoralSignalsSummaryForCandidate já devolve [] quando o
  // candidato não é um target monitorado ou não há pesquisa com resultado
  // real na corrida dele (nunca inventa dado eleitoral).
  let electoralSignals: ElectoralSignalSummary[] = [];
  if (filters.candidate) {
    try {
      electoralSignals = await getElectoralSignalsSummaryForCandidate(createAdminClient(), filters.candidate);
    } catch (error) {
      // Falha na busca de sinais eleitorais nunca derruba a Leitura Analítica Assistida (Fase 27/TESTE L) — segue sem esse bloco.
      console.error('[analytics-insight] Falha ao buscar sinais eleitorais:', error);
    }
  }

  const context = buildAnalyticsContext({
    filters: { candidate: filters.candidate ?? null, period: filters.period ?? 'all' },
    politicalStatus: data.politicalStatus,
    risks: data.risks,
    opportunities: data.opportunities,
    keyChanges: data.keyChanges,
    entities: data.entities,
    themes: data.themes,
    synthesis: data.synthesis,
    electoralSignals,
  });

  return getOrGenerateInsight(context, { forceRefresh: request.forceRefresh });
}
