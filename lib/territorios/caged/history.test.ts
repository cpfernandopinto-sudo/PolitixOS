import { describe, expect, it } from 'vitest';
import { reconstructCagedHistoricalSeries, type CagedHistoricalBatch } from './history';
import { CAGED_OFFICIAL_SECTORS, CAGED_SECTOR_MAPPING_VERSION, CAGED_SECTOR_METHOD_VERSION } from './methods';
import type { CagedOfficialSector, CagedParseSummary, CagedSourceKind, CagedSourceVintage } from './types';

const target = { ibgeCode: '3118601', cagedMunicipality: '311860' };
function batch(declarationMonth: string, kind: CagedSourceKind, referenceMonth: string, admissions: number, dismissals: number, sector: CagedOfficialSector = 'servicos', collectedAt = '2026-07-01T00:00:00Z'): CagedHistoricalBatch {
  const vintage: CagedSourceVintage = { kind, declarationMonth, sourceUrl: `ftp://${kind}/${declarationMonth}`, sha256: `${kind}-${declarationMonth}-${admissions}-${dismissals}`, sizeBytes: 1, collectedAt, status: 'processed', storagePath: '/raw', layoutVersion: 'layout', processedAt: collectedAt };
  const aggregate = { ...target, referenceMonth, admissions, dismissals, balance: admissions - dismissals, rowsRead: Math.abs(admissions) + Math.abs(dismissals) };
  const sectors = CAGED_OFFICIAL_SECTORS.map((name) => ({ ...target, referenceMonth, sector: name, admissions: name === sector ? admissions : 0, dismissals: name === sector ? dismissals : 0, balance: name === sector ? admissions - dismissals : 0, rowsRead: name === sector ? aggregate.rowsRead : 0 }));
  const nationalTotals = Object.fromEntries(CAGED_OFFICIAL_SECTORS.map((name) => [name, { admissions: 0, dismissals: 0, balance: 0, rowsRead: 0 }])) as CagedParseSummary['sectors']['nationalTotals'];
  const summary: CagedParseSummary = { kind, aggregates: [aggregate], sectors: { methodVersion: CAGED_SECTOR_METHOD_VERSION, mappingVersion: CAGED_SECTOR_MAPPING_VERSION, aggregates: sectors, nationalTotals }, referenceMonthsTouched: [referenceMonth], rowsRead: 1, rowsAccepted: 1, rowsDiscarded: 0, invalidMunicipalities: 0, reservedMunicipalityEvents: 0, unresolvedMunicipalityEvents: 0, distinctUnresolvedMunicipalityCodes: [], nationalTotals: { admissions, dismissals, balance: admissions - dismissals }, municipalitiesTouched: ['311860'], header: [], layoutHash: 'layout', elapsedMs: 1, peakRssBytes: 1 };
  return { declarationMonth, status: 'completed', vintages: [vintage], summaries: [summary] };
}

describe('CAGED historical revision-aware series', () => {
  it('reconstrói múltiplos meses, zero real e NO_DATA sem confundi-los', () => {
    const series = reconstructCagedHistoricalSeries({ batches: [batch('202501', 'MOV', '202501', 10, 8), batch('202503', 'MOV', '202503', 0, 0)], targets: [target], from: '202501', to: '202503', asOfDeclarationMonth: '202503' })[0];
    expect(series.points.map((point) => [point.referenceMonth, point.balance])).toEqual([['202501', 2], ['202503', 0]]);
    expect(series.coverage.monthsMissing).toEqual(['202502']);
    expect(series.coverage.coverageStatus).toBe('PARTIAL');
  });

  it('aplica FOR/EXC conforme cutoff, reconcilia setores e altera hash', () => {
    const inputs = [batch('202501', 'MOV', '202501', 10, 8), batch('202502', 'FOR', '202501', 1, 0), batch('202503', 'EXC', '202501', -1, 0)];
    const before = reconstructCagedHistoricalSeries({ batches: inputs, targets: [target], from: '202501', to: '202501', asOfDeclarationMonth: '202501' })[0].points[0];
    const afterFor = reconstructCagedHistoricalSeries({ batches: inputs, targets: [target], from: '202501', to: '202501', asOfDeclarationMonth: '202502' })[0].points[0];
    const afterExc = reconstructCagedHistoricalSeries({ batches: inputs, targets: [target], from: '202501', to: '202501', asOfDeclarationMonth: '202503' })[0].points[0];
    expect([before.balance, afterFor.balance, afterExc.balance]).toEqual([2, 3, 2]);
    expect(before.revisionMetadata.aggregateHash).not.toBe(afterFor.revisionMetadata.aggregateHash);
    expect(afterFor.revisionMetadata.aggregateHash).not.toBe(afterExc.revisionMetadata.aggregateHash);
    expect(afterExc.sectors.reduce((sum, sector) => sum + sector.balance, 0)).toBe(afterExc.balance);
  });

  it('é determinístico, ordenado e substitui duplicate input pela vintage mais recente', () => {
    const old = batch('202501', 'MOV', '202501', 9, 8, 'servicos', '2026-01-01T00:00:00Z');
    const latest = batch('202501', 'MOV', '202501', 10, 8, 'servicos', '2026-02-01T00:00:00Z');
    const options = { batches: [latest, old, latest], targets: [target], from: '202501', to: '202501', asOfDeclarationMonth: '202501' };
    const first = reconstructCagedHistoricalSeries(options)[0];
    const second = reconstructCagedHistoricalSeries({ ...options, batches: [...options.batches].reverse() })[0];
    expect(first.points[0].balance).toBe(2);
    expect(first).toEqual(second);
  });
});
