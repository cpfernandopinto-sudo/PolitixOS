'use client';

import type { ExecutiveCockpitMetrics } from '@/lib/pesquisas/types';
import KpiCard from '@/components/ui/KpiCard';

interface Props {
  metrics: ExecutiveCockpitMetrics;
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'Não disponível';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function ExecutiveKpiCards({ metrics }: Props) {
  const {
    intencaoMaisRecente,
    gapConcorrente,
    pesquisasComparaveisCount,
    lastUpdateDate,
    hasSufficientSeries,
  } = metrics;

  const instituto = intencaoMaisRecente?.instituto ?? 'Não disponível';
  const lider = intencaoMaisRecente
    ? `${intencaoMaisRecente.candidateName} (${intencaoMaisRecente.percentage}%)`
    : 'Não disponível';
  const diffStr = gapConcorrente ? `${gapConcorrente.gap} p.p.` : 'Não disponível';
  const temporalStr = hasSufficientSeries
    ? `${pesquisasComparaveisCount} pesquisas`
    : `Indisponível (${pesquisasComparaveisCount} pesquisa${pesquisasComparaveisCount === 1 ? '' : 's'})`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard title="Pesquisa Mais Recente" value={instituto} compact />
      <KpiCard title="Líder Atual" value={lider} status={intencaoMaisRecente ? 'success' : 'neutral'} compact />
      <KpiCard title="Diferença 1º × 2º" value={diffStr} compact />
      <KpiCard title="Evolução Temporal" value={temporalStr} compact />
      <KpiCard title="Pesquisas c/ Resultado" value={pesquisasComparaveisCount} compact />
      <KpiCard title="Última Atualização" value={formatDateShort(lastUpdateDate)} compact />
    </div>
  );
}
