'use server';

import { requireAuth } from '@/lib/auth/dal';
import { getExecutiveOverviewData, type OverviewFilters } from '@/lib/queries/overview';
import { buildAnalyticsContext } from '@/lib/ai/analytics-context';
import { getOrGenerateInsight } from '@/lib/ai/analytics-service';
import type { AssistedInsightResult } from '@/lib/ai/analytics-schema';

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

  const context = buildAnalyticsContext({
    filters: { candidate: filters.candidate ?? null, period: filters.period ?? 'all' },
    politicalStatus: data.politicalStatus,
    risks: data.risks,
    opportunities: data.opportunities,
    keyChanges: data.keyChanges,
    entities: data.entities,
    themes: data.themes,
    synthesis: data.synthesis,
  });

  return getOrGenerateInsight(context, { forceRefresh: request.forceRefresh });
}
