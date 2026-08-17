import { persistCagedAggregates, persistCagedSectorAggregates } from './persistence';
import { CAGED_HISTORY_METHOD_VERSION, type CagedHistoricalBatch, type CagedHistoricalSeries } from './history';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

/**
 * Publishes only already reconstructed absolute monthly points. Raw events are
 * never written to Postgres. Each point receives exactly its contributing
 * vintages. Evidence content versions remain immutable by source_hash while
 * metadata/current state is reconciled by the logical territory/month/context key.
 */
export async function persistCagedHistoricalSeries(client: AdminClient, series: CagedHistoricalSeries[], batches: CagedHistoricalBatch[]) {
  const vintageById = new Map(batches.flatMap((batch) => batch.vintages).map((vintage) => [`${vintage.kind}:${vintage.declarationMonth}:${vintage.sha256}`, vintage]));
  const totals = { inserted: 0, updated: 0, unchanged: 0, evidencePersisted: 0, evidenceUpdated: 0, evidenceUnchanged: 0, points: 0, sectorPoints: 0 };
  for (const item of series) for (const point of item.points) {
    const vintages = point.revisionMetadata.contributingVintages.map((id) => vintageById.get(id)).filter((vintage): vintage is NonNullable<typeof vintage> => Boolean(vintage));
    const context = { historyMethodVersion: CAGED_HISTORY_METHOD_VERSION, asOfDeclarationMonth: item.asOfDeclarationMonth };
    const totalResult = await persistCagedAggregates(client, [point], vintages, item.asOfDeclarationMonth, context);
    const sectorResult = await persistCagedSectorAggregates(client, point.sectors, vintages, item.asOfDeclarationMonth, context);
    totals.inserted += totalResult.inserted + sectorResult.inserted;
    totals.updated += totalResult.updated + sectorResult.updated;
    totals.unchanged += totalResult.unchanged + sectorResult.unchanged;
    totals.evidencePersisted += totalResult.evidencePersisted + sectorResult.evidencePersisted;
    totals.evidenceUpdated += totalResult.evidenceUpdated + sectorResult.evidenceUpdated;
    totals.evidenceUnchanged += totalResult.evidenceUnchanged + sectorResult.evidenceUnchanged;
    totals.points++;
    totals.sectorPoints += point.sectors.length;
  }
  return totals;
}
