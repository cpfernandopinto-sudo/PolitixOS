import type { ObservedHistoryResult } from './observedHistory';
import type { TemporalSeriesEntry } from './results-repository';

export interface EvolucaoCandidatoSeries {
  categories: string[];
  scatterData: number[];
  /** Mesmo tamanho de `scatterData` — `null` nos índices que NÃO pertencem à série comparável real (buildTemporalSeries), nunca conectados por linha. */
  lineData: (number | null)[];
  comparablePollCount: number;
}

/**
 * Sprint 2B, Bloco 5 — separa a construção dos dados do gráfico (pura,
 * testável) da renderização ECharts. `scatterData` sempre inclui TODOS os
 * pontos de `observedHistory` (nunca esconde nenhum). `lineData` só tem
 * valor não-nulo nos pontos cujo `pollId` está na série comparável REAL
 * (`buildTemporalSeries`, intocada) — nunca no critério mais permissivo de
 * `observedHistory.points[].comparability`.
 */
export function buildEvolucaoCandidatoSeries(
  observedHistory: ObservedHistoryResult,
  temporalSeries: TemporalSeriesEntry[],
  candidateName: string
): EvolucaoCandidatoSeries {
  const seriesEntry = temporalSeries.find((s) => s.candidateName.toLowerCase() === candidateName.toLowerCase());
  const comparablePollIds = new Set(seriesEntry?.points.map((p) => p.pollId) ?? []);

  const categories = observedHistory.points.map((p) => p.date ?? 'N/A');
  const scatterData = observedHistory.points.map((p) => p.percentage);
  const lineData = observedHistory.points.map((p) => (comparablePollIds.has(p.pollId) ? p.percentage : null));

  return { categories, scatterData, lineData, comparablePollCount: comparablePollIds.size };
}
