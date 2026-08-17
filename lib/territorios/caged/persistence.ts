import { randomUUID } from 'node:crypto';
import { CAGED_METHOD_VERSION, canonicalAggregateHash, endOfMonth, CagedError } from './core';
import type { CagedMunicipalAggregate, CagedSourceVintage } from './types';
import { CAGED_SECTOR_MAPPING_VERSION, CAGED_SECTOR_METHOD_VERSION } from './methods';
import { canonicalSectorAggregateHash } from './sectors';
import type { CagedOfficialSector, CagedSectorAggregate } from './types';
import { persistRevisionAwareCagedEvidence, type CagedEvidenceRow } from './evidence-persistence';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;
const INDICATORS = [
  ['admissoes_emprego_formal', 'admissions'],
  ['desligamentos_emprego_formal', 'dismissals'],
  ['saldo_emprego_formal', 'balance'],
] as const;

const SECTOR_INDICATORS: Record<Exclude<CagedOfficialSector, 'nao_classificado'>, string> = {
  agropecuaria: 'agropecuaria',
  industria_geral: 'industria_geral',
  construcao: 'construcao',
  comercio: 'comercio',
  servicos: 'servicos',
};

export function decideCagedIndicatorAction(existing: Record<string, unknown> | undefined, value: number, aggregateHash: string): 'insert' | 'update' | 'unchanged' {
  if (!existing) return 'insert';
  return Number(existing.valor) === value && (existing.metadata as Record<string, unknown> | null)?.aggregate_hash === aggregateHash ? 'unchanged' : 'update';
}

async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await query(from, from + 999);
    if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message);
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < 1000) break;
  }
  return rows;
}

export async function persistCagedAggregates(client: AdminClient, aggregates: CagedMunicipalAggregate[], vintages: CagedSourceVintage[], declarationMonth: string, context: { historyMethodVersion?: string; asOfDeclarationMonth?: string } = {}) {
  const codes = [...new Set(aggregates.map((row) => row.ibgeCode))];
  const territories = await readAll<Record<string, unknown>>((from, to) => client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', codes).range(from, to));
  const territoryByCode = new Map(territories.map((row) => [String(row.codigo_ibge), row]));
  const missing = codes.filter((code) => !territoryByCode.has(code));
  const resolvedAggregates = aggregates.filter((row) => territoryByCode.has(row.ibgeCode));
  const periods = [...new Set(resolvedAggregates.map((row) => endOfMonth(row.referenceMonth).start))];
  const existing = await readAll<Record<string, unknown>>((from, to) => client.from('territory_indicators')
    .select('id,territory_id,indicador,periodo_inicio,periodo_fim,valor,metadata')
    .in('territory_id', territories.map((row) => String(row.id))).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED').in('periodo_inicio', periods).range(from, to));
  const existingByKey = new Map(existing.map((row) => [`${row.territory_id}|${row.indicador}|${row.periodo_inicio}`, row]));
  const vintageIds = vintages.map((vintage) => `${vintage.kind}:${vintage.declarationMonth}:${vintage.sha256}`);
  const inserts: Record<string, unknown>[] = [], updates: Array<{ id: string; payload: Record<string, unknown> }> = [];
  let unchanged = 0;
  const evidenceRows: CagedEvidenceRow[] = [];
  const collectedAt = new Date().toISOString();
  for (const aggregate of resolvedAggregates) {
    const territory = territoryByCode.get(aggregate.ibgeCode)!;
    const period = endOfMonth(aggregate.referenceMonth);
    const aggregateHash = canonicalAggregateHash(aggregate, vintageIds);
    for (const [indicator, field] of INDICATORS) {
      const key = `${territory.id}|${indicator}|${period.start}`;
      const current = existingByKey.get(key);
      const payload = {
        valor: aggregate[field], unidade: field === 'balance' ? 'vínculos (saldo)' : 'movimentações',
        source_record_id: `NOVO_CAGED:${aggregate.referenceMonth}:${aggregate.ibgeCode}:${indicator}`,
        source_updated_at: collectedAt,
        metodologia: 'Agregação municipal mensal de eventos oficiais Novo CAGED; MOV/FOR aplicam o sinal original e EXC aplica o efeito inverso. Não representa estoque.',
        metadata: { source_mode: 'REAL', method_version: CAGED_METHOD_VERSION, history_method_version: context.historyMethodVersion ?? null, declaration_month: declarationMonth, as_of_declaration_month: context.asOfDeclarationMonth ?? declarationMonth, reference_month: aggregate.referenceMonth, aggregate_hash: aggregateHash, contributing_vintages: vintageIds, rows_contributing: aggregate.rowsRead, revision_aware: Boolean(context.historyMethodVersion), current: true },
        collected_at: collectedAt, updated_at: collectedAt,
      };
      const decided = decideCagedIndicatorAction(current, aggregate[field], aggregateHash);
      const currentMetadata = current?.metadata as Record<string, unknown> | undefined;
      const action = decided === 'unchanged' && context.historyMethodVersion && (currentMetadata?.history_method_version !== context.historyMethodVersion || currentMetadata?.as_of_declaration_month !== context.asOfDeclarationMonth) ? 'update' : decided;
      if (action === 'insert') inserts.push({ territory_id: territory.id, categoria: 'economia', indicador: indicator, granularidade: 'municipal', fonte: 'MTE', source_dataset: 'NOVO_CAGED', periodo_inicio: period.start, periodo_fim: period.end, ...payload });
      else if (action === 'unchanged') unchanged++;
      else updates.push({ id: String(current!.id), payload });
    }
    evidenceRows.push({
      territory_id: String(territory.id), source_type: 'official_data', source_name: 'MTE/Novo CAGED', source_url: vintages.find((item) => item.kind === 'MOV')?.sourceUrl ?? vintages[0]?.sourceUrl,
      source_external_id: `NOVO_CAGED:${aggregate.referenceMonth}:${aggregate.ibgeCode}:${aggregateHash}`,
      source_hash: aggregateHash, published_at: null, collected_at: collectedAt, tema: 'economia', subtema: 'emprego_formal',
      title: `Novo CAGED ${aggregate.referenceMonth} — ${territory.municipio}/${territory.uf}`,
      summary: `${aggregate.admissions} admissões, ${aggregate.dismissals} desligamentos e saldo ${aggregate.balance}.`,
      raw_reference: { declaration_month: declarationMonth, reference_month: aggregate.referenceMonth, caged_municipality: aggregate.cagedMunicipality, ibge_code: aggregate.ibgeCode, aggregates: { admissions: aggregate.admissions, dismissals: aggregate.dismissals, balance: aggregate.balance }, vintages: vintages.map((v) => ({ kind: v.kind, sha256: v.sha256, size_bytes: v.sizeBytes, source_url: v.sourceUrl, storage_provider: v.storageProvider ?? 'local', storage_bucket: v.storageBucket ?? null, object_key: v.storageObjectKey ?? v.storagePath, layout_version: v.layoutVersion })) },
      confidence: 1, metadata: { source_mode: 'REAL', method_version: CAGED_METHOD_VERSION, history_method_version: context.historyMethodVersion ?? null, as_of_declaration_month: context.asOfDeclarationMonth ?? declarationMonth, reference_month: aggregate.referenceMonth, context: 'total', contributing_vintages: vintageIds, aggregate_hash: aggregateHash, revision_aware: Boolean(context.historyMethodVersion), current: true },
    });
  }
  for (let index = 0; index < inserts.length; index += 500) { const result = await client.from('territory_indicators').insert(inserts.slice(index, index + 500)); if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message); }
  for (let index = 0; index < updates.length; index += 20) { const results = await Promise.all(updates.slice(index, index + 20).map((row) => client.from('territory_indicators').update(row.payload).eq('id', row.id))); const failed = results.find((item) => item.error); if (failed?.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', failed.error.message); }
  let evidencePersisted = 0, evidenceUpdated = 0, evidenceUnchanged = 0;
  if (context.historyMethodVersion) {
    const evidenceResult = await persistRevisionAwareCagedEvidence(client, evidenceRows);
    if (evidenceResult.ambiguousRows.length) throw new CagedError('CAGED_PERSISTENCE_FAILED', `Ambiguous CAGED evidence rows: ${evidenceResult.ambiguousRows.join(', ')}`);
    evidencePersisted = evidenceResult.inserted; evidenceUpdated = evidenceResult.updated; evidenceUnchanged = evidenceResult.unchanged;
  } else for (let index = 0; index < evidenceRows.length; index += 500) { const result = await client.from('territory_evidence').upsert(evidenceRows.slice(index, index + 500), { onConflict: 'territory_id,source_hash', ignoreDuplicates: true }).select('id'); if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message); evidencePersisted += result.data?.length ?? 0; }
  return { inserted: inserts.length, updated: updates.length, unchanged, evidencePersisted, evidenceUpdated, evidenceUnchanged, territories: territories.length, resolution: { requested: codes.length, resolved: territories.length, absentFromCatalog: missing.length, absentIbgeCodes: missing } };
}

export async function persistCagedSectorAggregates(client: AdminClient, aggregates: CagedSectorAggregate[], vintages: CagedSourceVintage[], declarationMonth: string, context: { historyMethodVersion?: string; asOfDeclarationMonth?: string } = {}) {
  const codes = [...new Set(aggregates.map((row) => row.ibgeCode))];
  const territories = await readAll<Record<string, unknown>>((from, to) => client.from('territories').select('id,codigo_ibge,municipio,uf').in('codigo_ibge', codes).range(from, to));
  const territoryByCode = new Map(territories.map((row) => [String(row.codigo_ibge), row]));
  const publishable = aggregates.filter((row) => row.sector !== 'nao_classificado' && territoryByCode.has(row.ibgeCode));
  const periods = [...new Set(publishable.map((row) => endOfMonth(row.referenceMonth).start))];
  const indicators = publishable.flatMap((row) => {
    const suffix = SECTOR_INDICATORS[row.sector as Exclude<CagedOfficialSector, 'nao_classificado'>];
    return [`admissoes_emprego_formal_${suffix}`, `desligamentos_emprego_formal_${suffix}`, `saldo_emprego_formal_${suffix}`];
  });
  const existing = periods.length === 0 ? [] : await readAll<Record<string, unknown>>((from, to) => client.from('territory_indicators')
    .select('id,territory_id,indicador,periodo_inicio,valor,metadata')
    .in('territory_id', territories.map((row) => String(row.id))).eq('categoria', 'economia').eq('fonte', 'MTE').eq('source_dataset', 'NOVO_CAGED').in('periodo_inicio', periods).in('indicador', [...new Set(indicators)]).range(from, to));
  const existingByKey = new Map(existing.map((row) => [`${row.territory_id}|${row.indicador}|${row.periodo_inicio}`, row]));
  const vintageIds = vintages.map((vintage) => `${vintage.kind}:${vintage.declarationMonth}:${vintage.sha256}`);
  const inserts: Record<string, unknown>[] = [], updates: Array<{ id: string; payload: Record<string, unknown> }> = [], evidenceRows: CagedEvidenceRow[] = [];
  let unchanged = 0;
  const collectedAt = new Date().toISOString();
  for (const aggregate of publishable) {
    const territory = territoryByCode.get(aggregate.ibgeCode)!;
    const period = endOfMonth(aggregate.referenceMonth);
    const hash = canonicalSectorAggregateHash(aggregate, vintageIds);
    const suffix = SECTOR_INDICATORS[aggregate.sector as Exclude<CagedOfficialSector, 'nao_classificado'>];
    const fields = [['admissoes', 'admissions'], ['desligamentos', 'dismissals'], ['saldo', 'balance']] as const;
    for (const [prefix, field] of fields) {
      const indicator = `${prefix}_emprego_formal_${suffix}`;
      const key = `${territory.id}|${indicator}|${period.start}`;
      const current = existingByKey.get(key);
      const payload = {
        valor: aggregate[field], unidade: field === 'balance' ? 'vínculos (saldo)' : 'movimentações',
        source_record_id: `NOVO_CAGED:${aggregate.referenceMonth}:${aggregate.ibgeCode}:${aggregate.sector}:${indicator}`,
        source_updated_at: collectedAt,
        metodologia: 'Agregação municipal mensal por um dos cinco grandes grupamentos oficiais do Novo CAGED, derivada do campo seção CNAE 2.0. MOV/FOR mantêm o sinal e EXC inverte o evento.',
        metadata: { source_mode: 'REAL', method_version: CAGED_SECTOR_METHOD_VERSION, history_method_version: context.historyMethodVersion ?? null, mapping_version: CAGED_SECTOR_MAPPING_VERSION, declaration_month: declarationMonth, as_of_declaration_month: context.asOfDeclarationMonth ?? declarationMonth, reference_month: aggregate.referenceMonth, sector: aggregate.sector, aggregate_hash: hash, contributing_vintages: vintageIds, rows_contributing: aggregate.rowsRead, revision_aware: Boolean(context.historyMethodVersion), current: true },
        collected_at: collectedAt, updated_at: collectedAt,
      };
      const decided = decideCagedIndicatorAction(current, aggregate[field], hash);
      const currentMetadata = current?.metadata as Record<string, unknown> | undefined;
      const action = decided === 'unchanged' && context.historyMethodVersion && (currentMetadata?.history_method_version !== context.historyMethodVersion || currentMetadata?.as_of_declaration_month !== context.asOfDeclarationMonth) ? 'update' : decided;
      if (action === 'insert') inserts.push({ territory_id: territory.id, categoria: 'economia', indicador: indicator, granularidade: 'municipal', fonte: 'MTE', source_dataset: 'NOVO_CAGED', periodo_inicio: period.start, periodo_fim: period.end, ...payload });
      else if (action === 'update') updates.push({ id: String(current!.id), payload });
      else unchanged++;
    }
    evidenceRows.push({
      territory_id: String(territory.id), source_type: 'official_data', source_name: 'MTE/Novo CAGED', source_url: vintages.find((item) => item.kind === 'MOV')?.sourceUrl ?? vintages[0]?.sourceUrl,
      source_external_id: `NOVO_CAGED:${aggregate.referenceMonth}:${aggregate.ibgeCode}:${aggregate.sector}:${hash}`, source_hash: hash,
      published_at: null, collected_at: collectedAt, tema: 'economia', subtema: 'emprego_formal_setorial',
      title: `Novo CAGED ${aggregate.referenceMonth} — ${aggregate.sector} — ${territory.municipio}/${territory.uf}`,
      summary: `${aggregate.admissions} admissões, ${aggregate.dismissals} desligamentos e saldo ${aggregate.balance} no grupamento ${aggregate.sector}.`,
      raw_reference: { declaration_month: declarationMonth, reference_month: aggregate.referenceMonth, caged_municipality: aggregate.cagedMunicipality, ibge_code: aggregate.ibgeCode, sector: aggregate.sector, aggregates: { admissions: aggregate.admissions, dismissals: aggregate.dismissals, balance: aggregate.balance }, contributing_vintages: vintageIds },
      confidence: 1, metadata: { source_mode: 'REAL', method_version: CAGED_SECTOR_METHOD_VERSION, history_method_version: context.historyMethodVersion ?? null, mapping_version: CAGED_SECTOR_MAPPING_VERSION, as_of_declaration_month: context.asOfDeclarationMonth ?? declarationMonth, reference_month: aggregate.referenceMonth, context: 'sector', sector: aggregate.sector, contributing_vintages: vintageIds, aggregate_hash: hash, revision_aware: Boolean(context.historyMethodVersion), current: true },
    });
  }
  for (let index = 0; index < inserts.length; index += 500) { const result = await client.from('territory_indicators').insert(inserts.slice(index, index + 500)); if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message); }
  for (let index = 0; index < updates.length; index += 20) { const results = await Promise.all(updates.slice(index, index + 20).map((row) => client.from('territory_indicators').update(row.payload).eq('id', row.id))); const failed = results.find((item) => item.error); if (failed?.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', failed.error.message); }
  let evidencePersisted = 0, evidenceUpdated = 0, evidenceUnchanged = 0;
  if (context.historyMethodVersion) {
    const evidenceResult = await persistRevisionAwareCagedEvidence(client, evidenceRows);
    if (evidenceResult.ambiguousRows.length) throw new CagedError('CAGED_PERSISTENCE_FAILED', `Ambiguous CAGED evidence rows: ${evidenceResult.ambiguousRows.join(', ')}`);
    evidencePersisted = evidenceResult.inserted; evidenceUpdated = evidenceResult.updated; evidenceUnchanged = evidenceResult.unchanged;
  } else for (let index = 0; index < evidenceRows.length; index += 500) { const result = await client.from('territory_evidence').upsert(evidenceRows.slice(index, index + 500), { onConflict: 'territory_id,source_hash', ignoreDuplicates: true }).select('id'); if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message); evidencePersisted += result.data?.length ?? 0; }
  return { inserted: inserts.length, updated: updates.length, unchanged, evidencePersisted, evidenceUpdated, evidenceUnchanged, territories: territories.length, indicatorsProcessed: publishable.length * 3 };
}

export async function createCentralCagedRun(client: AdminClient, _legacyAnchorIbgeCode: string, declarationMonth: string) {
  const requestId = randomUUID(), startedAt = new Date().toISOString();
  const run = await client.from('source_collection_runs').insert({ request_id: requestId, source: 'MTE/NOVO_CAGED', scope: 'NATIONAL', declaration_month: declarationMonth, status: 'running', workflow_name: 'novo-caged-central-v1', workflow_version: '1.1.0', started_at: startedAt, metadata: { declaration_month: declarationMonth, scope: 'NATIONAL', legacy_anchor_removed: true } }).select('id').single();
  if (run.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', run.error.message);
  return { id: String(run.data.id), requestId, startedAt };
}

export async function finishCentralCagedRun(client: AdminClient, runId: string, status: 'completed' | 'partial' | 'failed', metadata: Record<string, unknown>, errorMessage: string | null = null) {
  const result = await client.from('source_collection_runs').update({ status, finished_at: new Date().toISOString(), items_collected: Number(metadata.rows_read ?? 0), items_processed: Number(metadata.indicators_processed ?? 0), items_discarded: Number(metadata.rows_discarded ?? 0), error_message: errorMessage, metadata }).eq('id', runId);
  if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message);
}

export async function acquireCagedLease(client: AdminClient, declarationMonth: string, ownerId = randomUUID(), ttlSeconds = 7200) {
  const result = await client.rpc('acquire_source_collection_lease', { p_source: 'MTE/NOVO_CAGED', p_scope: 'NATIONAL', p_declaration_month: declarationMonth, p_owner_id: ownerId, p_ttl_seconds: ttlSeconds });
  if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message);
  if (!result.data) throw new CagedError('ALREADY_RUNNING', `Já existe execução ativa para ${declarationMonth}.`);
  return { ownerId, declarationMonth };
}
export async function releaseCagedLease(client: AdminClient, lease: { ownerId: string; declarationMonth: string }) { const result = await client.from('source_collection_leases').delete().eq('source', 'MTE/NOVO_CAGED').eq('scope', 'NATIONAL').eq('declaration_month', lease.declarationMonth).eq('owner_id', lease.ownerId); if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message); }
