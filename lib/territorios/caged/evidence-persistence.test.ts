import { describe, expect, it } from 'vitest';
import { planCagedEvidencePersistence, type CagedEvidenceRow } from './evidence-persistence';

const desiredMetadata = { history_method_version: 'novo-caged-history-revision-aware-v1', as_of_declaration_month: '202606', revision_aware: true, current: true };
function row(hash: string, metadata: Record<string, unknown>, id?: string): CagedEvidenceRow {
  return { id, territory_id: 'territory-1', source_hash: hash, source_name: 'MTE/Novo CAGED', tema: 'economia', raw_reference: { reference_month: '202506' }, metadata };
}

describe('CAGED evidence revision-aware persistence', () => {
  it('updates metadata for the same hash without touching raw_reference', () => {
    const existing = row('hash-a', { current: true }, 'id-a');
    const plan = planCagedEvidencePersistence([existing], [row('hash-a', desiredMetadata)]);
    expect(plan.updates).toEqual([{ id: 'id-a', metadata: desiredMetadata }]);
    expect(existing.raw_reference).toEqual({ reference_month: '202506' });
  });

  it('is a noop for the same hash and same metadata', () => {
    const plan = planCagedEvidencePersistence([row('hash-a', desiredMetadata, 'id-a')], [row('hash-a', desiredMetadata)]);
    expect(plan).toMatchObject({ inserts: [], updates: [], unchanged: 1, ambiguousRows: [] });
  });

  it('preserves a legitimate vintage and leaves only the new hash current', () => {
    const plan = planCagedEvidencePersistence([row('hash-old', { current: true }, 'id-old')], [row('hash-new', desiredMetadata)]);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.updates[0]).toMatchObject({ id: 'id-old', metadata: { current: false, superseded_by_source_hash: 'hash-new', revision_aware: true } });
  });

  it('does not mix total and sector logical identities', () => {
    const sector = { ...row('sector-hash', { current: true }, 'id-sector'), raw_reference: { reference_month: '202506', sector: 'servicos' } };
    const plan = planCagedEvidencePersistence([sector], [row('total-hash', desiredMetadata)]);
    expect(plan.updates).toHaveLength(0);
    expect(plan.inserts).toHaveLength(1);
  });

  it('stops on malformed or duplicate incoming logical identities', () => {
    const malformed = { ...row('bad', desiredMetadata), raw_reference: {} };
    const plan = planCagedEvidencePersistence([], [row('a', desiredMetadata), row('b', desiredMetadata), malformed]);
    expect(plan.ambiguousRows).toHaveLength(2);
  });
});
