// ---------------------------------------------------------------------------
// SecurityCollector — Motor Segurança Pública / MG (Bloco 4.2).
// ---------------------------------------------------------------------------
// Orquestra o pipeline completo, mantendo cada etapa separada e testável
// (Seção 9 do briefing): fetch/parse ficam em `seguranca-mg-client.ts`,
// resolução de território em `seguranca-territory-resolver.ts`, normalização
// de natureza em `seguranca-nature-map.ts`. Este arquivo cuida de:
// determinar a janela temporal, filtrar/agregar mensalmente, resolver
// território por linha e persistir em `territory_indicators` +
// `territory_collection_runs`, reaproveitando exatamente o schema já
// homologado no Motor IBGE — nenhuma tabela nova.
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';
import type { createAdminClient } from '@/lib/supabaseClient';
import {
  discoverResources,
  selectResourceForYear,
  fetchAnnualCsv,
  parseCrimesViolentosCsv,
  CRIMES_VIOLENTOS_DATASET_ID,
  CRIMES_VIOLENTOS_SOURCE,
  type CrimeViolentoRow,
} from './seguranca-mg-client';
import { resolveNatureza, CORE_INDICATOR_KEYS, INDICE_CRIMES_VIOLENTOS_KEY } from './seguranca-nature-map';
import { resolveTerritoriesMapForUf, type ResolvedTerritory } from './seguranca-territory-resolver';

export const WORKFLOW_NAME = 'politix-territorios-seguranca-mg';
export const WORKFLOW_VERSION = '1.0.0';
export const COLLECTION_RUN_SOURCE = 'sejusp_mg';
export const CATEGORIA = 'seguranca_publica';
export const FONTE = CRIMES_VIOLENTOS_SOURCE;
export const SOURCE_DATASET = CRIMES_VIOLENTOS_DATASET_ID;
export const UNIDADE = 'ocorrencias';

export const MIN_MONTHS = 1;
export const MAX_MONTHS = 24;
export const DEFAULT_MONTHS = 12;

export type SecurityCollectionMode = 'single' | 'mg';

export type SecurityCollectionErrorKind = 'invalid_input' | 'territory_not_found';

export class SecurityCollectionError extends Error {
  kind: SecurityCollectionErrorKind;
  constructor(kind: SecurityCollectionErrorKind, message: string) {
    super(message);
    this.name = 'SecurityCollectionError';
    this.kind = kind;
  }
}

export interface RunSecurityCollectionInput {
  mode: SecurityCollectionMode;
  codigoIbge?: string | null;
  months?: number | null;
  requestId?: string | null;
  /** Injeção para testes — data de referência para o cálculo da janela. Default: `new Date()`. */
  referenceDate?: Date;
}

export interface YearMonth {
  year: number;
  month: number;
}

export interface SecurityCollectionResult {
  requestId: string;
  mode: SecurityCollectionMode;
  source: string;
  dataset: string;
  monthsRequested: number;
  window: { from: YearMonth; to: YearMonth };
  territoriesExpected: number;
  territoriesProcessed: number;
  indicatorsPersisted: number;
  rowsReceived: number;
  rowsDiscarded: number;
  unknownNatures: string[];
  excludedOutOfScopeNatures: string[];
  unmatchedMunicipalities: string[];
  errors: string[];
  overallStatus: 'completed' | 'partial' | 'failed';
}

type AdminClient = ReturnType<typeof createAdminClient>;

// ─── Janela temporal ───────────────────────────────────────────────────────

/**
 * Últimos `months` meses COMPLETOS anteriores ao mês corrente de
 * `referenceDate` (não inclui o mês corrente, presumivelmente incompleto).
 * Ex.: referenceDate=2026-08-11, months=12 → ago/2025 … jul/2026.
 */
export function computeWindow(months: number, referenceDate: Date): YearMonth[] {
  const out: YearMonth[] = [];
  let year = referenceDate.getUTCFullYear();
  let month = referenceDate.getUTCMonth() + 1;

  for (let i = 0; i < months; i++) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    out.push({ year, month });
  }
  return out.reverse();
}

function windowKey(ym: YearMonth): string {
  return `${ym.year}-${ym.month}`;
}

function monthBounds(year: number, month: number): { periodo_inicio: string; periodo_fim: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    periodo_inicio: `${year}-${pad(month)}-01`,
    periodo_fim: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

// ─── Agregação ─────────────────────────────────────────────────────────────

interface AggregatedIndicator {
  territory_id: string;
  indicatorKey: string;
  year: number;
  month: number;
  valor: number;
  risp: string;
  rmbh: string;
  naturezaOriginal: string | null;
  sourceYear: number;
}

interface NormalizeResult {
  aggregation: Map<string, AggregatedIndicator>;
  unknownNatures: Set<string>;
  excludedOutOfScopeNatures: Set<string>;
  unmatchedMunicipalities: Set<string>;
  unknownNatureRowCount: number;
  outOfScopeRowCount: number;
  unmatchedMunicipioRowCount: number;
  perTerritoryRawCount: Map<string, number>;
}

function normalizeAndAggregate(
  rows: CrimeViolentoRow[],
  territoriesByCod6: Map<string, ResolvedTerritory>
): NormalizeResult {
  const aggregation = new Map<string, AggregatedIndicator>();
  const unknownNatures = new Set<string>();
  const excludedOutOfScopeNatures = new Set<string>();
  const unmatchedMunicipalities = new Set<string>();
  const perTerritoryRawCount = new Map<string, number>();
  let unknownNatureRowCount = 0;
  let outOfScopeRowCount = 0;
  let unmatchedMunicipioRowCount = 0;

  for (const row of rows) {
    const territory = territoriesByCod6.get(row.cod_municipio);
    if (!territory) {
      unmatchedMunicipalities.add(row.cod_municipio);
      unmatchedMunicipioRowCount++;
      continue;
    }
    perTerritoryRawCount.set(territory.id, (perTerritoryRawCount.get(territory.id) ?? 0) + 1);

    const resolution = resolveNatureza(row.natureza);
    if (resolution.status === 'unknown') {
      unknownNatures.add(row.natureza);
      unknownNatureRowCount++;
      continue;
    }
    if (resolution.status === 'out_of_scope') {
      excludedOutOfScopeNatures.add(row.natureza);
      outOfScopeRowCount++;
      continue;
    }

    const key = `${territory.id}|${resolution.indicatorKey}|${row.ano}|${row.mes}`;
    const existing = aggregation.get(key);
    if (existing) {
      existing.valor += row.registros;
    } else {
      aggregation.set(key, {
        territory_id: territory.id,
        indicatorKey: resolution.indicatorKey,
        year: row.ano,
        month: row.mes,
        valor: row.registros,
        risp: row.risp,
        rmbh: row.rmbh,
        naturezaOriginal: row.natureza,
        sourceYear: row.ano,
      });
    }
  }

  // Segunda passada: indicador derivado `indice_crimes_violentos` — soma das
  // 13 naturezas núcleo por território + mês (Seção 3 do briefing).
  const byTerritoryMonth = new Map<string, AggregatedIndicator[]>();
  for (const entry of aggregation.values()) {
    const groupKey = `${entry.territory_id}|${entry.year}|${entry.month}`;
    const list = byTerritoryMonth.get(groupKey) ?? [];
    list.push(entry);
    byTerritoryMonth.set(groupKey, list);
  }
  for (const [groupKey, entries] of byTerritoryMonth) {
    const coreEntries = entries.filter((e) => CORE_INDICATOR_KEYS.includes(e.indicatorKey));
    if (coreEntries.length === 0) continue;
    const total = coreEntries.reduce((sum, e) => sum + e.valor, 0);
    const [territory_id, yearStr, monthStr] = groupKey.split('|');
    aggregation.set(`${groupKey}|${INDICE_CRIMES_VIOLENTOS_KEY}`, {
      territory_id,
      indicatorKey: INDICE_CRIMES_VIOLENTOS_KEY,
      year: Number(yearStr),
      month: Number(monthStr),
      valor: total,
      risp: coreEntries[0].risp,
      rmbh: coreEntries[0].rmbh,
      naturezaOriginal: null,
      sourceYear: coreEntries[0].sourceYear,
    });
  }

  return {
    aggregation,
    unknownNatures,
    excludedOutOfScopeNatures,
    unmatchedMunicipalities,
    unknownNatureRowCount,
    outOfScopeRowCount,
    unmatchedMunicipioRowCount,
    perTerritoryRawCount,
  };
}

// ─── Persistência (mesma semântica de idempotência do Motor IBGE) ─────────

async function upsertSecurityIndicator(
  client: AdminClient,
  entry: AggregatedIndicator,
  sourceResourceName: string
): Promise<{ error?: string }> {
  const { periodo_inicio, periodo_fim } = monthBounds(entry.year, entry.month);

  const { data: existing, error: selectError } = await client
    .from('territory_indicators')
    .select('id')
    .eq('territory_id', entry.territory_id)
    .eq('categoria', CATEGORIA)
    .eq('indicador', entry.indicatorKey)
    .eq('fonte', FONTE)
    .eq('source_dataset', SOURCE_DATASET)
    .eq('periodo_inicio', periodo_inicio)
    .eq('periodo_fim', periodo_fim)
    .maybeSingle();

  if (selectError) return { error: selectError.message };

  const metadata = {
    risp: entry.risp,
    rmbh: entry.rmbh,
    natureza_original: entry.naturezaOriginal,
    source_year: entry.sourceYear,
    source_resource: sourceResourceName,
    collected_at: new Date().toISOString(),
  };

  const payload = {
    valor: entry.valor,
    unidade: UNIDADE,
    metadata,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await client.from('territory_indicators').update(payload).eq('id', existing.id);
    return { error: error?.message };
  }

  const { error } = await client.from('territory_indicators').insert({
    territory_id: entry.territory_id,
    categoria: CATEGORIA,
    indicador: entry.indicatorKey,
    fonte: FONTE,
    source_dataset: SOURCE_DATASET,
    periodo_inicio,
    periodo_fim,
    ...payload,
  });
  return { error: error?.message };
}

// ─── Orquestração ──────────────────────────────────────────────────────────

export async function runSecurityCollection(
  client: AdminClient,
  input: RunSecurityCollectionInput
): Promise<SecurityCollectionResult> {
  const requestId = input.requestId ?? randomUUID();
  const months = input.months ?? DEFAULT_MONTHS;

  if (!Number.isInteger(months) || months < MIN_MONTHS || months > MAX_MONTHS) {
    throw new SecurityCollectionError('invalid_input', `"months" deve ser um inteiro entre ${MIN_MONTHS} e ${MAX_MONTHS} (recebido: ${months}).`);
  }
  if (input.mode === 'single' && !input.codigoIbge) {
    throw new SecurityCollectionError('invalid_input', 'mode=single requer codigoIbge.');
  }

  const referenceDate = input.referenceDate ?? new Date();
  const windowMonths = computeWindow(months, referenceDate);
  const windowSet = new Set(windowMonths.map(windowKey));
  const years = Array.from(new Set(windowMonths.map((wm) => wm.year))).sort();

  // 1 download por ano necessário (nunca por município) — Seção 2.
  const resources = await discoverResources(CRIMES_VIOLENTOS_DATASET_ID);
  const allRows: CrimeViolentoRow[] = [];
  const resourceNameByYear = new Map<number, string>();
  for (const year of years) {
    const resource = selectResourceForYear(resources, year);
    resourceNameByYear.set(year, resource.name);
    const csvText = await fetchAnnualCsv(resource.url);
    // Nunca usar `push(...array)` aqui: os CSVs anuais têm ~80-150 mil
    // linhas, e espalhar um array desse tamanho como argumentos de função
    // estoura a call stack do V8 (limite de argumentos por chamada).
    for (const row of parseCrimesViolentosCsv(csvText)) {
      allRows.push(row);
    }
  }

  const windowRows = allRows.filter((row) => windowSet.has(`${row.ano}-${row.mes}`));

  // Resolução de território — direção "cod SEJUSP → territory" (Seção 5).
  // Só carrega o mapa completo da UF quando realmente precisa dele
  // (mode=mg) — mode=single resolve o único território direto por
  // codigo_ibge, sem precisar buscar os 853 territórios de MG à toa.
  let scopedRows: CrimeViolentoRow[];
  let territoriesByCod6: Map<string, ResolvedTerritory>;
  let territoriesExpected: number;

  if (input.mode === 'single') {
    const codigoIbge = input.codigoIbge as string;
    const { data: territoryRow, error: territoryError } = await client
      .from('territories')
      .select('id, codigo_ibge, municipio, uf')
      .eq('codigo_ibge', codigoIbge)
      .maybeSingle();

    if (territoryError) {
      throw new SecurityCollectionError('territory_not_found', `Falha ao consultar território "${codigoIbge}": ${territoryError.message}`);
    }
    if (!territoryRow) {
      throw new SecurityCollectionError('territory_not_found', `Território com codigo_ibge="${codigoIbge}" não encontrado (o Motor Segurança não cria territórios — eles vêm do Motor IBGE).`);
    }

    const territory = territoryRow as ResolvedTerritory;
    const cod6 = territory.codigo_ibge.slice(0, 6);
    scopedRows = windowRows.filter((row) => row.cod_municipio === cod6);
    territoriesByCod6 = new Map([[cod6, territory]]);
    territoriesExpected = 1;
  } else {
    const { map: mgTerritoriesByCod6 } = await resolveTerritoriesMapForUf(client, 'MG');
    scopedRows = windowRows;
    territoriesByCod6 = mgTerritoriesByCod6;
    territoriesExpected = mgTerritoriesByCod6.size;
  }

  const normalized = normalizeAndAggregate(scopedRows, territoriesByCod6);

  // Agrupa entradas agregadas por território para persistir + abrir 1
  // collection_run por território (mesmo padrão do Motor IBGE mode=uf —
  // territory_id é NOT NULL, nunca um valor fictício/agregado).
  const entriesByTerritory = new Map<string, AggregatedIndicator[]>();
  for (const entry of normalized.aggregation.values()) {
    const list = entriesByTerritory.get(entry.territory_id) ?? [];
    list.push(entry);
    entriesByTerritory.set(entry.territory_id, list);
  }

  let indicatorsPersisted = 0;
  let territoriesProcessed = 0;
  const errors: string[] = [];
  const windowFrom = windowMonths[0];
  const windowTo = windowMonths[windowMonths.length - 1];

  for (const [territoryId, entries] of entriesByTerritory) {
    const startedAt = new Date().toISOString();
    let processed = 0;
    let failed = 0;

    for (const entry of entries) {
      const sourceResourceName = resourceNameByYear.get(entry.sourceYear) ?? `crimes_violentos_${entry.sourceYear}`;
      const { error } = await upsertSecurityIndicator(client, entry, sourceResourceName);
      if (error) {
        failed++;
        errors.push(`territory_id=${territoryId} indicador=${entry.indicatorKey} ${entry.year}-${entry.month}: ${error}`);
      } else {
        processed++;
      }
    }

    const finishedAt = new Date().toISOString();
    const rawCount = normalized.perTerritoryRawCount.get(territoryId) ?? 0;
    const status: 'completed' | 'partial' | 'failed' = failed === 0 ? 'completed' : processed > 0 ? 'partial' : 'failed';

    await client.from('territory_collection_runs').insert({
      territory_id: territoryId,
      request_id: requestId,
      source: COLLECTION_RUN_SOURCE,
      status,
      workflow_name: WORKFLOW_NAME,
      workflow_version: WORKFLOW_VERSION,
      started_at: startedAt,
      finished_at: finishedAt,
      items_collected: rawCount,
      items_processed: processed,
      items_discarded: failed,
      error_message: failed > 0 ? `${failed} indicador(es) falharam ao persistir.` : null,
      metadata: {
        mode: input.mode,
        months,
        dataset: SOURCE_DATASET,
        window: { from: windowFrom, to: windowTo },
      },
    });

    indicatorsPersisted += processed;
    if (processed > 0) territoriesProcessed++;
  }

  const rowsDiscarded =
    normalized.unknownNatureRowCount + normalized.outOfScopeRowCount + normalized.unmatchedMunicipioRowCount;

  const hasFailures = errors.length > 0;
  const hasUnmatched = normalized.unmatchedMunicipalities.size > 0;
  const overallStatus: SecurityCollectionResult['overallStatus'] =
    territoriesProcessed === 0 && territoriesExpected > 0
      ? 'failed'
      : hasFailures || hasUnmatched || territoriesProcessed < territoriesExpected
        ? 'partial'
        : 'completed';

  return {
    requestId,
    mode: input.mode,
    source: CRIMES_VIOLENTOS_SOURCE,
    dataset: SOURCE_DATASET,
    monthsRequested: months,
    window: { from: windowFrom, to: windowTo },
    territoriesExpected,
    territoriesProcessed,
    indicatorsPersisted,
    rowsReceived: scopedRows.length,
    rowsDiscarded,
    unknownNatures: Array.from(normalized.unknownNatures),
    excludedOutOfScopeNatures: Array.from(normalized.excludedOutOfScopeNatures),
    unmatchedMunicipalities: Array.from(normalized.unmatchedMunicipalities),
    errors,
    overallStatus,
  };
}
