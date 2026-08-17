import { canonicalAggregateHash } from './core';
import { CAGED_OFFICIAL_SECTORS, CAGED_SECTOR_MAPPING_VERSION, CAGED_SECTOR_METHOD_VERSION } from './methods';
import { canonicalSectorAggregateHash } from './sectors';
import type { CagedMunicipalAggregate, CagedParseSummary, CagedSectorAggregate, CagedSourceVintage } from './types';

export const CAGED_HISTORY_METHOD_VERSION = 'novo-caged-history-revision-aware-v1';

export interface CagedHistoricalBatch {
  declarationMonth: string;
  status: 'completed' | 'partial';
  vintages: CagedSourceVintage[];
  summaries: CagedParseSummary[];
}

export interface CagedHistoricalTarget { ibgeCode: string; cagedMunicipality: string }

export interface CagedRevisionMetadata {
  asOfDeclarationMonth: string;
  methodVersion: string;
  mappingVersion: string;
  aggregateHash: string;
  contributingVintages: string[];
  revisionVintages: string[];
  partial: boolean;
}

export interface CagedHistoricalSectorPoint extends CagedSectorAggregate {
  revisionMetadata: CagedRevisionMetadata;
}

export interface CagedHistoricalPoint extends CagedMunicipalAggregate {
  sectors: CagedHistoricalSectorPoint[];
  revisionMetadata: CagedRevisionMetadata;
  momBalanceDelta: number | null;
  yoyBalanceDelta: number | null;
  rolling12Balance: number | null;
}

export interface CagedHistoricalSeries {
  ibgeCode: string;
  asOfDeclarationMonth: string;
  points: CagedHistoricalPoint[];
  coverage: {
    firstAvailablePeriod: string | null;
    lastAvailablePeriod: string | null;
    monthsAvailable: string[];
    monthsMissing: string[];
    coverageStatus: 'COMPLETE' | 'PARTIAL' | 'NO_DATA';
  };
}

function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(4, 6));
  const end = Number(to);
  while (year * 100 + month <= end) {
    months.push(`${year}${String(month).padStart(2, '0')}`);
    month++;
    if (month === 13) { year++; month = 1; }
  }
  return months;
}

function vintageId(vintage: CagedSourceVintage): string {
  return `${vintage.kind}:${vintage.declarationMonth}:${vintage.sha256}`;
}

function selectLatestBatches(batches: CagedHistoricalBatch[], asOf: string): CagedHistoricalBatch[] {
  const selected = new Map<string, CagedHistoricalBatch>();
  for (const batch of batches.filter((item) => item.declarationMonth <= asOf)) {
    for (const summary of batch.summaries) {
      const vintage = batch.vintages.find((item) => item.kind === summary.kind);
      if (!vintage) continue;
      const key = `${batch.declarationMonth}|${summary.kind}`;
      const current = selected.get(key);
      const currentVintage = current?.vintages.find((item) => item.kind === summary.kind);
      if (!currentVintage || vintage.collectedAt >= currentVintage.collectedAt) {
        selected.set(key, { ...batch, summaries: [summary], vintages: [vintage] });
      }
    }
  }
  return [...selected.values()].sort((a, b) => `${a.declarationMonth}|${a.summaries[0]?.kind}`.localeCompare(`${b.declarationMonth}|${b.summaries[0]?.kind}`));
}

function emptyAggregate(target: CagedHistoricalTarget, referenceMonth: string): CagedMunicipalAggregate {
  return { ...target, referenceMonth, admissions: 0, dismissals: 0, balance: 0, rowsRead: 0 };
}

/** Compacts national parse results immediately after each declaration month. */
export function compactCagedHistoricalBatch(batch: CagedHistoricalBatch, targets: CagedHistoricalTarget[]): CagedHistoricalBatch {
  const codes = new Set(targets.map((item) => item.ibgeCode));
  return {
    ...batch,
    summaries: batch.summaries.map((summary) => ({
      ...summary,
      aggregates: summary.aggregates.filter((row) => codes.has(row.ibgeCode)),
      sectors: { ...summary.sectors, aggregates: summary.sectors.aggregates.filter((row) => codes.has(row.ibgeCode)) },
    })),
  };
}

export function reconstructCagedHistoricalSeries(options: {
  batches: CagedHistoricalBatch[];
  targets: CagedHistoricalTarget[];
  from: string;
  to: string;
  asOfDeclarationMonth: string;
}): CagedHistoricalSeries[] {
  const requestedMonths = monthsBetween(options.from, options.to);
  const selected = selectLatestBatches(options.batches, options.asOfDeclarationMonth);
  const byTarget = new Map(options.targets.map((target) => [target.ibgeCode, new Map<string, CagedHistoricalPoint>()]));
  const lineage = new Map<string, Set<string>>();
  const revisionLineage = new Map<string, Set<string>>();
  const partialDeclarations = new Set(selected.filter((item) => item.status === 'partial').map((item) => item.declarationMonth));

  for (const batch of selected) {
    const summary = batch.summaries[0];
    const vintage = batch.vintages[0];
    if (!summary || !vintage) continue;
    const id = vintageId(vintage);
    const aggregateByCodeMonth = new Map(summary.aggregates.map((row) => [`${row.ibgeCode}|${row.referenceMonth}`, row]));
    const sectorByCodeMonth = new Map<string, CagedSectorAggregate[]>();
    for (const row of summary.sectors.aggregates) {
      const key = `${row.ibgeCode}|${row.referenceMonth}`;
      sectorByCodeMonth.set(key, [...(sectorByCodeMonth.get(key) ?? []), row]);
    }
    for (const target of options.targets) {
      const referenceMonths = summary.kind === 'MOV' ? [batch.declarationMonth] : summary.referenceMonthsTouched;
      for (const referenceMonth of referenceMonths.filter((month) => requestedMonths.includes(month))) {
        const pointKey = `${target.ibgeCode}|${referenceMonth}`;
        const points = byTarget.get(target.ibgeCode)!;
        let point = points.get(referenceMonth);
        if (summary.kind === 'MOV') {
          const base = aggregateByCodeMonth.get(pointKey) ?? emptyAggregate(target, referenceMonth);
          const sectors = CAGED_OFFICIAL_SECTORS.map((sector) => {
            const found = (sectorByCodeMonth.get(pointKey) ?? []).find((row) => row.sector === sector);
            return { ...(found ?? { ...emptyAggregate(target, referenceMonth), sector }), revisionMetadata: {} as CagedRevisionMetadata };
          });
          point = { ...base, sectors, revisionMetadata: {} as CagedRevisionMetadata, momBalanceDelta: null, yoyBalanceDelta: null, rolling12Balance: null };
          points.set(referenceMonth, point);
        } else if (!point) {
          continue;
        }
        if (!point) continue;
        const delta = aggregateByCodeMonth.get(pointKey);
        if (summary.kind !== 'MOV' && delta) {
          point.admissions += delta.admissions; point.dismissals += delta.dismissals; point.balance += delta.balance; point.rowsRead += delta.rowsRead;
        }
        const sectorDeltas = sectorByCodeMonth.get(pointKey) ?? [];
        if (summary.kind !== 'MOV') for (const deltaRow of sectorDeltas) {
          const sector = point.sectors.find((item) => item.sector === deltaRow.sector)!;
          sector.admissions += deltaRow.admissions; sector.dismissals += deltaRow.dismissals; sector.balance += deltaRow.balance; sector.rowsRead += deltaRow.rowsRead;
        }
        if (summary.kind === 'MOV' || delta || sectorDeltas.length) {
          const set = lineage.get(pointKey) ?? new Set<string>(); set.add(id); lineage.set(pointKey, set);
          if (summary.kind !== 'MOV') { const revisions = revisionLineage.get(pointKey) ?? new Set<string>(); revisions.add(id); revisionLineage.set(pointKey, revisions); }
        }
      }
    }
  }

  return options.targets.map((target) => {
    const points = [...byTarget.get(target.ibgeCode)!.values()].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
    const pointByMonth = new Map(points.map((point) => [point.referenceMonth, point]));
    for (const point of points) {
      const ids = [...(lineage.get(`${target.ibgeCode}|${point.referenceMonth}`) ?? [])].sort();
      const revisions = [...(revisionLineage.get(`${target.ibgeCode}|${point.referenceMonth}`) ?? [])].sort();
      const partial = partialDeclarations.has(point.referenceMonth);
      point.revisionMetadata = { asOfDeclarationMonth: options.asOfDeclarationMonth, methodVersion: CAGED_HISTORY_METHOD_VERSION, mappingVersion: CAGED_SECTOR_MAPPING_VERSION, aggregateHash: canonicalAggregateHash(point, ids), contributingVintages: ids, revisionVintages: revisions, partial };
      for (const sector of point.sectors) sector.revisionMetadata = { ...point.revisionMetadata, methodVersion: CAGED_SECTOR_METHOD_VERSION, aggregateHash: canonicalSectorAggregateHash(sector, ids) };
      const previous = pointByMonth.get(monthsBetween(point.referenceMonth, point.referenceMonth)[0] === options.from ? '' : previousMonth(point.referenceMonth));
      const priorYear = pointByMonth.get(`${Number(point.referenceMonth.slice(0, 4)) - 1}${point.referenceMonth.slice(4)}`);
      point.momBalanceDelta = previous ? point.balance - previous.balance : null;
      point.yoyBalanceDelta = priorYear ? point.balance - priorYear.balance : null;
      const rollingMonths = precedingMonths(point.referenceMonth, 12);
      point.rolling12Balance = rollingMonths.every((month) => pointByMonth.has(month)) ? rollingMonths.reduce((sum, month) => sum + pointByMonth.get(month)!.balance, 0) : null;
      const sectorTotals = point.sectors.reduce((sum, sector) => ({ admissions: sum.admissions + sector.admissions, dismissals: sum.dismissals + sector.dismissals, balance: sum.balance + sector.balance }), { admissions: 0, dismissals: 0, balance: 0 });
      if (sectorTotals.admissions !== point.admissions || sectorTotals.dismissals !== point.dismissals || sectorTotals.balance !== point.balance) throw new Error(`CAGED historical sector reconciliation failed: ${target.ibgeCode}|${point.referenceMonth}`);
    }
    const monthsAvailable = points.map((point) => point.referenceMonth);
    const monthsMissing = requestedMonths.filter((month) => !pointByMonth.has(month));
    return { ibgeCode: target.ibgeCode, asOfDeclarationMonth: options.asOfDeclarationMonth, points, coverage: { firstAvailablePeriod: monthsAvailable[0] ?? null, lastAvailablePeriod: monthsAvailable.at(-1) ?? null, monthsAvailable, monthsMissing, coverageStatus: monthsAvailable.length === 0 ? 'NO_DATA' : monthsMissing.length || points.some((point) => point.revisionMetadata.partial) ? 'PARTIAL' : 'COMPLETE' } };
  });
}

function previousMonth(month: string): string {
  const year = Number(month.slice(0, 4)); const value = Number(month.slice(4));
  return value === 1 ? `${year - 1}12` : `${year}${String(value - 1).padStart(2, '0')}`;
}

function precedingMonths(month: string, count: number): string[] {
  const result = [month];
  while (result.length < count) result.unshift(previousMonth(result[0]));
  return result;
}
