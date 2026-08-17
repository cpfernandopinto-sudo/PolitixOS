import { CAGED_OFFICIAL_SECTORS } from './methods';
import type { CagedOfficialSector } from './types';

type QueryClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

const SECTOR_SUFFIX: Record<CagedOfficialSector, string> = {
  agropecuaria: 'agropecuaria', industria_geral: 'industria_geral', construcao: 'construcao', comercio: 'comercio', servicos: 'servicos', nao_classificado: 'nao_classificado',
};

export interface CagedSeriesQueryPoint {
  referenceMonth: string;
  admissions: number;
  dismissals: number;
  balance: number;
  revisionMetadata: Record<string, unknown>;
}

export interface CagedSeriesQueryResult {
  territoryId: string;
  sector: CagedOfficialSector | null;
  points: CagedSeriesQueryPoint[];
  coverage: {
    firstAvailablePeriod: string | null;
    lastAvailablePeriod: string | null;
    monthsAvailable: string[];
    monthsMissing: string[];
    coverageStatus: 'COMPLETE' | 'PARTIAL' | 'NO_DATA';
  };
}

function dateToMonth(value: string): string { return value.slice(0, 7).replace('-', ''); }
function monthToDate(value: string): string { return `${value.slice(0, 4)}-${value.slice(4)}-01`; }
function monthsBetween(from: string, to: string): string[] {
  const result: string[] = []; let cursor = from;
  while (cursor <= to) { result.push(cursor); const year = Number(cursor.slice(0, 4)); const month = Number(cursor.slice(4)); cursor = month === 12 ? `${year + 1}01` : `${year}${String(month + 1).padStart(2, '0')}`; }
  return result;
}

/** Read-only contract ready for line, bar, stacked sector and YoY charts. */
export async function getCagedMunicipalSeries(client: QueryClient, options: { territoryId: string; from: string; to: string; sector?: CagedOfficialSector }): Promise<CagedSeriesQueryResult> {
  if (options.sector && !CAGED_OFFICIAL_SECTORS.includes(options.sector)) throw new Error(`Invalid CAGED sector: ${options.sector}`);
  const suffix = options.sector ? `_${SECTOR_SUFFIX[options.sector]}` : '';
  const indicators = [`admissoes_emprego_formal${suffix}`, `desligamentos_emprego_formal${suffix}`, `saldo_emprego_formal${suffix}`];
  const result = await client.from('territory_indicators').select('indicador,valor,periodo_inicio,metadata')
    .eq('territory_id', options.territoryId).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED')
    .in('indicador', indicators).gte('periodo_inicio', monthToDate(options.from)).lte('periodo_inicio', monthToDate(options.to)).order('periodo_inicio', { ascending: true });
  if (result.error) throw new Error(`CAGED series query failed: ${result.error.message}`);
  const grouped = new Map<string, Map<string, { valor: unknown; metadata: unknown }>>();
  for (const row of result.data ?? []) {
    const month = dateToMonth(String(row.periodo_inicio)); const values = grouped.get(month) ?? new Map(); values.set(String(row.indicador), { valor: row.valor, metadata: row.metadata }); grouped.set(month, values);
  }
  const points = [...grouped.entries()].filter(([, values]) => indicators.every((indicator) => values.has(indicator))).map(([referenceMonth, values]) => ({ referenceMonth, admissions: Number(values.get(indicators[0])!.valor), dismissals: Number(values.get(indicators[1])!.valor), balance: Number(values.get(indicators[2])!.valor), revisionMetadata: (values.get(indicators[2])!.metadata ?? {}) as Record<string, unknown> })).sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
  const requested = monthsBetween(options.from, options.to); const monthsAvailable = points.map((point) => point.referenceMonth); const available = new Set(monthsAvailable); const monthsMissing = requested.filter((month) => !available.has(month));
  return { territoryId: options.territoryId, sector: options.sector ?? null, points, coverage: { firstAvailablePeriod: monthsAvailable[0] ?? null, lastAvailablePeriod: monthsAvailable.at(-1) ?? null, monthsAvailable, monthsMissing, coverageStatus: points.length === 0 ? 'NO_DATA' : monthsMissing.length || points.some((point) => point.revisionMetadata.partial === true) ? 'PARTIAL' : 'COMPLETE' } };
}
