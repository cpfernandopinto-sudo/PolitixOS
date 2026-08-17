import { CagedError } from './core';

type AdminClient = ReturnType<typeof import('@/lib/supabaseClient').createAdminClient>;

export interface CagedEvidenceRow {
  id?: string;
  territory_id: string;
  source_hash: string;
  source_name?: string;
  tema?: string;
  raw_reference: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface CagedEvidencePlan {
  inserts: CagedEvidenceRow[];
  updates: Array<{ id: string; metadata: Record<string, unknown> }>;
  unchanged: number;
  ambiguousRows: string[];
  logicalDuplicates: number;
  legitimateVintages: number;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function cagedEvidenceLogicalKey(row: Pick<CagedEvidenceRow, 'territory_id' | 'raw_reference'>): string | null {
  const raw = row.raw_reference;
  const referenceMonth = raw?.reference_month;
  const sector = raw?.sector ?? 'total';
  if (typeof referenceMonth !== 'string' || !/^\d{6}$/.test(referenceMonth) || typeof sector !== 'string') return null;
  return `${row.territory_id}|${referenceMonth}|${sector}`;
}

export function planCagedEvidencePersistence(existing: CagedEvidenceRow[], incoming: CagedEvidenceRow[]): CagedEvidencePlan {
  const ambiguousRows: string[] = [];
  const incomingByKey = new Map<string, CagedEvidenceRow>();
  for (const row of incoming) {
    const key = cagedEvidenceLogicalKey(row);
    if (!key) { ambiguousRows.push(`incoming:${row.territory_id}:${row.source_hash}`); continue; }
    if (incomingByKey.has(key)) ambiguousRows.push(`incoming-duplicate:${key}`);
    incomingByKey.set(key, row);
  }

  const existingByKey = new Map<string, CagedEvidenceRow[]>();
  for (const row of existing) {
    const key = cagedEvidenceLogicalKey(row);
    if (!key) { ambiguousRows.push(`existing:${row.id ?? 'unknown'}:${row.source_hash}`); continue; }
    existingByKey.set(key, [...(existingByKey.get(key) ?? []), row]);
  }

  const inserts: CagedEvidenceRow[] = [];
  const updates: Array<{ id: string; metadata: Record<string, unknown> }> = [];
  let unchanged = 0;
  let logicalDuplicates = 0;
  let legitimateVintages = 0;

  for (const [key, desired] of incomingByKey) {
    const versions = existingByKey.get(key) ?? [];
    if (versions.length > 1) {
      logicalDuplicates++;
      legitimateVintages += versions.length - 1;
    }
    const sameHash = versions.find((row) => row.source_hash === desired.source_hash);
    if (!sameHash) inserts.push(desired);

    for (const row of versions) {
      if (!row.id) { ambiguousRows.push(`missing-id:${key}:${row.source_hash}`); continue; }
      const isCurrent = row.source_hash === desired.source_hash;
      const desiredMetadata = isCurrent
        ? { ...(row.metadata ?? {}), ...(desired.metadata ?? {}), current: true }
        : {
            ...(row.metadata ?? {}),
            history_method_version: desired.metadata?.history_method_version ?? null,
            as_of_declaration_month: desired.metadata?.as_of_declaration_month ?? null,
            revision_aware: desired.metadata?.revision_aware ?? false,
            current: false,
            superseded_by_source_hash: desired.source_hash,
          };
      if (stable(row.metadata ?? {}) === stable(desiredMetadata)) unchanged++;
      else updates.push({ id: row.id, metadata: desiredMetadata });
    }
  }

  return { inserts, updates, unchanged, ambiguousRows, logicalDuplicates, legitimateVintages };
}

async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await query(from, from + 999);
    if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message);
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < 1000) return rows;
  }
}

export async function persistRevisionAwareCagedEvidence(client: AdminClient, incoming: CagedEvidenceRow[], options: { dryRun?: boolean } = {}) {
  if (!incoming.length) return { inserted: 0, updated: 0, unchanged: 0, ambiguousRows: [], logicalDuplicates: 0, legitimateVintages: 0 };
  const territoryIds = [...new Set(incoming.map((row) => row.territory_id))];
  const existing = await readAll<CagedEvidenceRow>((from, to) => client.from('territory_evidence')
    .select('id,territory_id,source_hash,source_name,tema,raw_reference,metadata')
    .in('territory_id', territoryIds).eq('source_name', 'MTE/Novo CAGED').eq('tema', 'economia').range(from, to));
  const plan = planCagedEvidencePersistence(existing, incoming);
  if (plan.ambiguousRows.length) return { inserted: plan.inserts.length, updated: plan.updates.length, unchanged: plan.unchanged, ambiguousRows: plan.ambiguousRows, logicalDuplicates: plan.logicalDuplicates, legitimateVintages: plan.legitimateVintages };
  if (!options.dryRun) {
    for (let index = 0; index < plan.inserts.length; index += 500) {
      const result = await client.from('territory_evidence').insert(plan.inserts.slice(index, index + 500));
      if (result.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', result.error.message);
    }
    for (let index = 0; index < plan.updates.length; index += 20) {
      const results = await Promise.all(plan.updates.slice(index, index + 20).map((row) => client.from('territory_evidence').update({ metadata: row.metadata }).eq('id', row.id)));
      const failed = results.find((item) => item.error);
      if (failed?.error) throw new CagedError('CAGED_PERSISTENCE_FAILED', failed.error.message);
    }
  }
  return { inserted: plan.inserts.length, updated: plan.updates.length, unchanged: plan.unchanged, ambiguousRows: plan.ambiguousRows, logicalDuplicates: plan.logicalDuplicates, legitimateVintages: plan.legitimateVintages };
}
