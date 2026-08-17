import { createHash } from 'node:crypto';
import { CAGED_OFFICIAL_SECTORS, CAGED_SECTOR_MAPPING_VERSION, CAGED_SECTOR_METHOD_VERSION, classifyCagedSection } from './methods';
import type { CagedEventEffect, CagedOfficialSector, CagedSectorAggregate, CagedSectorSummary } from './types';

type SectorTotals = CagedSectorSummary['nationalTotals'][CagedOfficialSector];

function emptyTotals(): SectorTotals {
  return { admissions: 0, dismissals: 0, balance: 0, rowsRead: 0 };
}

export class CagedSectorAccumulator {
  private readonly national = Object.fromEntries(CAGED_OFFICIAL_SECTORS.map((sector) => [sector, emptyTotals()])) as CagedSectorSummary['nationalTotals'];
  private readonly municipal = new Map<string, CagedSectorAggregate>();

  addNational(section: unknown, effect: CagedEventEffect): CagedOfficialSector {
    const sector = classifyCagedSection(section);
    this.apply(this.national[sector], effect);
    return sector;
  }

  addMunicipal(sector: CagedOfficialSector, ibgeCode: string, effect: CagedEventEffect): void {
    const key = `${ibgeCode}|${effect.referenceMonth}|${sector}`;
    const current = this.municipal.get(key) ?? {
      ibgeCode,
      cagedMunicipality: effect.cagedMunicipality,
      referenceMonth: effect.referenceMonth,
      sector,
      ...emptyTotals(),
    };
    this.apply(current, effect);
    this.municipal.set(key, current);
  }

  summary(): CagedSectorSummary {
    return {
      methodVersion: CAGED_SECTOR_METHOD_VERSION,
      mappingVersion: CAGED_SECTOR_MAPPING_VERSION,
      nationalTotals: this.national,
      aggregates: [...this.municipal.values()].sort((a, b) => `${a.referenceMonth}|${a.ibgeCode}|${a.sector}`.localeCompare(`${b.referenceMonth}|${b.ibgeCode}|${b.sector}`)),
    };
  }

  private apply(target: SectorTotals, effect: CagedEventEffect): void {
    target.admissions += effect.admissionsDelta;
    target.dismissals += effect.dismissalsDelta;
    target.balance += effect.balanceDelta;
    target.rowsRead++;
    if (target.balance !== target.admissions - target.dismissals) throw new Error('CAGED sector reconciliation failed.');
  }
}

export function mergeCagedSectorAggregates(summaries: CagedSectorSummary[]): CagedSectorAggregate[] {
  const merged = new Map<string, CagedSectorAggregate>();
  for (const summary of summaries) for (const row of summary.aggregates) {
    const key = `${row.ibgeCode}|${row.referenceMonth}|${row.sector}`;
    const current = merged.get(key) ?? { ...row, admissions: 0, dismissals: 0, balance: 0, rowsRead: 0 };
    current.admissions += row.admissions;
    current.dismissals += row.dismissals;
    current.balance += row.balance;
    current.rowsRead += row.rowsRead;
    if (current.balance !== current.admissions - current.dismissals) throw new Error(`CAGED sector reconciliation failed: ${key}`);
    merged.set(key, current);
  }
  return [...merged.values()].sort((a, b) => `${a.referenceMonth}|${a.ibgeCode}|${a.sector}`.localeCompare(`${b.referenceMonth}|${b.ibgeCode}|${b.sector}`));
}

export function canonicalSectorAggregateHash(aggregate: CagedSectorAggregate, contributingVintages: string[]): string {
  return createHash('sha256').update(JSON.stringify({
    territory: aggregate.ibgeCode,
    referenceMonth: aggregate.referenceMonth,
    sector: aggregate.sector,
    admissions: aggregate.admissions,
    dismissals: aggregate.dismissals,
    balance: aggregate.balance,
    contributingVintages: [...contributingVintages].sort(),
    methodVersion: CAGED_SECTOR_METHOD_VERSION,
    mappingVersion: CAGED_SECTOR_MAPPING_VERSION,
  })).digest('hex');
}
