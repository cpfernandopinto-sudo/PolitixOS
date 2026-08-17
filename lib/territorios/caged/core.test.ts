import { describe, expect, it } from 'vitest';
import { canonicalAggregateHash, normalizeReferenceMonth, resolveCagedEventEffect } from './core';
import { resolveCagedRunStatus } from './pipeline';
import { decideCagedIndicatorAction } from './persistence';

describe('resolveCagedEventEffect', () => {
  const base = { referenceMonth: '202606', cagedMunicipality: '311860', movementBalance: 1 };
  it('aplica admissão MOV/FOR', () => expect(resolveCagedEventEffect(base, 'MOV')).toEqual({ referenceMonth: '202606', cagedMunicipality: '311860', admissionsDelta: 1, dismissalsDelta: 0, balanceDelta: 1 }));
  it('aplica FOR à competência do evento', () => expect(resolveCagedEventEffect({ ...base, referenceMonth: '202604' }, 'FOR').referenceMonth).toBe('202604'));
  it('inverte exclusão de admissão', () => expect(resolveCagedEventEffect(base, 'EXC')).toMatchObject({ admissionsDelta: -1, dismissalsDelta: 0, balanceDelta: -1 }));
  it('inverte exclusão de desligamento', () => expect(resolveCagedEventEffect({ ...base, movementBalance: -1 }, 'EXC')).toMatchObject({ admissionsDelta: 0, dismissalsDelta: -1, balanceDelta: 1 }));
  it('aceita movimento zero sem inventar evento', () => expect(resolveCagedEventEffect({ ...base, movementBalance: 0 }, 'MOV')).toMatchObject({ admissionsDelta: 0, dismissalsDelta: 0, balanceDelta: 0 }));
  it('rejeita competência inválida', () => expect(() => normalizeReferenceMonth('202613')).toThrow(/Competência inválida/));
});

it('hash agregado é determinístico para ordem de vintages', () => {
  const aggregate = { ibgeCode: '3118601', cagedMunicipality: '311860', referenceMonth: '202606', admissions: 2, dismissals: 1, balance: 1, rowsRead: 3 };
  expect(canonicalAggregateHash(aggregate, ['b', 'a'])).toBe(canonicalAggregateHash(aggregate, ['a', 'b']));
});

it('nova vintage muda o hash e força update do current', () => {
  const aggregate = { ibgeCode: '3118601', cagedMunicipality: '311860', referenceMonth: '202606', admissions: 2, dismissals: 1, balance: 1, rowsRead: 3 };
  const oldHash = canonicalAggregateHash(aggregate, ['MOV:old']);
  const newHash = canonicalAggregateHash(aggregate, ['MOV:new']);
  expect(newHash).not.toBe(oldHash);
  expect(decideCagedIndicatorAction({ valor: 2, metadata: { aggregate_hash: oldHash } }, 2, newHash)).toBe('update');
});

it('não marca run como completo quando FOR está ausente', () => {
  expect(resolveCagedRunStatus(['MOV', 'FOR', 'EXC'], ['MOV', 'EXC'])).toBe('partial');
  expect(resolveCagedRunStatus(['MOV', 'FOR', 'EXC'], ['MOV', 'FOR', 'EXC'])).toBe('completed');
});
