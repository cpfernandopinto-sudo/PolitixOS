import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { parse } from 'csv-parse';
import { aggregateKey, CAGED_REQUIRED_HEADERS, CagedError, normalizeHeader, resolveCagedEventEffect } from './core';
import type { CagedMunicipalityResolver } from './municipality-resolver';
import { CagedSectorAccumulator } from './sectors';
import type { CagedMunicipalAggregate, CagedParseSummary, CagedSourceKind } from './types';

type MutableAggregate = CagedMunicipalAggregate;

export async function parseCagedFile(textPath: string, kind: CagedSourceKind, resolver: CagedMunicipalityResolver): Promise<CagedParseSummary> {
  const started = performance.now();
  const aggregates = new Map<string, MutableAggregate>();
  const referenceMonths = new Set<string>();
  const municipalities = new Set<string>();
  let rowsRead = 0, rowsAccepted = 0, rowsDiscarded = 0, invalidMunicipalities = 0, reservedMunicipalityEvents = 0, unresolvedMunicipalityEvents = 0, peakRssBytes = process.memoryUsage().rss;
  const unresolvedCodes = new Set<string>();
  const nationalTotals = { admissions: 0, dismissals: 0, balance: 0 };
  const sectors = new CagedSectorAccumulator();
  let actualHeader: string[] = [];
  const parser = createReadStream(textPath).pipe(parse({ delimiter: ';', bom: true, columns: (header: string[]) => {
    actualHeader = header.map(normalizeHeader);
    const missing = CAGED_REQUIRED_HEADERS.filter((required) => !actualHeader.includes(required));
    if (missing.length > 0) throw new CagedError('CAGED_LAYOUT_MISMATCH', `Campos obrigatórios ausentes: ${missing.join(', ')}`, { header: actualHeader });
    return actualHeader;
  }, relax_quotes: true, skip_empty_lines: true, trim: true }));
  try {
    for await (const raw of parser as AsyncIterable<Record<string, string>>) {
      rowsRead++;
      if ((rowsRead & 0x3fff) === 0) peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
      try {
        const cagedMunicipality = String(raw['município'] ?? '');
        const effect = resolveCagedEventEffect({ referenceMonth: raw['competênciamov'], cagedMunicipality, movementBalance: Number(raw['saldomovimentação']) }, kind);
        nationalTotals.admissions += effect.admissionsDelta;
        nationalTotals.dismissals += effect.dismissalsDelta;
        nationalTotals.balance += effect.balanceDelta;
        const sector = sectors.addNational(raw['seção'], effect);
        if (effect.cagedMunicipality === '999999') { reservedMunicipalityEvents++; rowsDiscarded++; continue; }
        const ibgeCode = resolver.resolve(cagedMunicipality);
        if (!ibgeCode) { invalidMunicipalities++; unresolvedMunicipalityEvents++; unresolvedCodes.add(effect.cagedMunicipality); rowsDiscarded++; continue; }
        sectors.addMunicipal(sector, ibgeCode, effect);
        const key = aggregateKey(effect.cagedMunicipality, effect.referenceMonth);
        const current = aggregates.get(key) ?? { ibgeCode, cagedMunicipality: effect.cagedMunicipality, referenceMonth: effect.referenceMonth, admissions: 0, dismissals: 0, balance: 0, rowsRead: 0 };
        current.admissions += effect.admissionsDelta;
        current.dismissals += effect.dismissalsDelta;
        current.balance += effect.balanceDelta;
        current.rowsRead++;
        if (current.balance !== current.admissions - current.dismissals) throw new CagedError('CAGED_RECONCILIATION_FAILED', `Agregado inconsistente: ${key}`);
        aggregates.set(key, current); referenceMonths.add(effect.referenceMonth); municipalities.add(effect.cagedMunicipality); rowsAccepted++;
      } catch (error) {
        if (error instanceof CagedError && error.code === 'CAGED_INVALID_MUNICIPALITY') { invalidMunicipalities++; rowsDiscarded++; continue; }
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof CagedError) throw error;
    throw new CagedError('CAGED_PARSE_ERROR', `Falha no parser ${kind}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const sorted = [...aggregates.values()].sort((a, b) => `${a.referenceMonth}|${a.ibgeCode}`.localeCompare(`${b.referenceMonth}|${b.ibgeCode}`));
  if (nationalTotals.balance !== nationalTotals.admissions - nationalTotals.dismissals) throw new CagedError('CAGED_RECONCILIATION_FAILED', 'Total nacional inconsistente.');
  const sectorSummary = sectors.summary();
  const sectorNational = Object.values(sectorSummary.nationalTotals).reduce((sum, row) => ({ admissions: sum.admissions + row.admissions, dismissals: sum.dismissals + row.dismissals, balance: sum.balance + row.balance }), { admissions: 0, dismissals: 0, balance: 0 });
  if (JSON.stringify(sectorNational) !== JSON.stringify(nationalTotals)) throw new CagedError('CAGED_RECONCILIATION_FAILED', 'Total nacional por setor não reconciliou com o total geral.');
  return { kind, rowsRead, rowsAccepted, rowsDiscarded, invalidMunicipalities, reservedMunicipalityEvents, unresolvedMunicipalityEvents, distinctUnresolvedMunicipalityCodes: [...unresolvedCodes].sort(), nationalTotals, referenceMonthsTouched: [...referenceMonths].sort(), municipalitiesTouched: [...municipalities].sort(), aggregates: sorted, sectors: sectorSummary, header: actualHeader, layoutHash: createHash('sha256').update(actualHeader.join(';')).digest('hex'), elapsedMs: performance.now() - started, peakRssBytes };
}

export function mergeCagedAggregates(summaries: CagedParseSummary[]): CagedMunicipalAggregate[] {
  const merged = new Map<string, CagedMunicipalAggregate>();
  for (const summary of summaries) for (const row of summary.aggregates) {
    const key = `${row.ibgeCode}|${row.referenceMonth}`;
    const current = merged.get(key) ?? { ...row, admissions: 0, dismissals: 0, balance: 0, rowsRead: 0 };
    current.admissions += row.admissions; current.dismissals += row.dismissals; current.balance += row.balance; current.rowsRead += row.rowsRead;
    if (current.balance !== current.admissions - current.dismissals) throw new CagedError('CAGED_RECONCILIATION_FAILED', `Agregado combinado inconsistente: ${key}`);
    merged.set(key, current);
  }
  return [...merged.values()].sort((a, b) => `${a.referenceMonth}|${a.ibgeCode}`.localeCompare(`${b.referenceMonth}|${b.ibgeCode}`));
}
