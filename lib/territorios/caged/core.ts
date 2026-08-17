import { createHash } from 'node:crypto';
import type { CagedEventEffect, CagedEventRecord, CagedMunicipalAggregate, CagedSourceKind } from './types';

export const CAGED_METHOD_VERSION = 'novo-caged-municipal-v1';
export const CAGED_REQUIRED_HEADERS = ['competênciamov', 'município', 'saldomovimentação', 'seção'] as const;

export class CagedError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'CagedError';
  }
}

export function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLocaleLowerCase('pt-BR');
}

export function normalizeReferenceMonth(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!/^20\d{4}$/.test(digits) || Number(digits.slice(4, 6)) < 1 || Number(digits.slice(4, 6)) > 12) {
    throw new CagedError('CAGED_PARSE_ERROR', `Competência inválida: ${value}`);
  }
  return digits;
}

export function normalizeCagedMunicipality(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(digits)) throw new CagedError('CAGED_INVALID_MUNICIPALITY', `Município CAGED inválido: ${value}`);
  return digits;
}

export function resolveCagedEventEffect(record: CagedEventRecord, sourceKind: CagedSourceKind): CagedEventEffect {
  const movement = Number(record.movementBalance);
  if (![1, -1, 0].includes(movement)) throw new CagedError('CAGED_PARSE_ERROR', `Saldo de movimentação inválido: ${record.movementBalance}`);
  const sign = sourceKind === 'EXC' ? -1 : 1;
  const admissionsDelta = movement === 1 ? sign : 0;
  const dismissalsDelta = movement === -1 ? sign : 0;
  const balanceDelta = sign * movement;
  if (balanceDelta !== admissionsDelta - dismissalsDelta) throw new CagedError('CAGED_RECONCILIATION_FAILED', 'Efeito do evento não reconciliou.');
  return { referenceMonth: normalizeReferenceMonth(record.referenceMonth), cagedMunicipality: normalizeCagedMunicipality(record.cagedMunicipality), admissionsDelta, dismissalsDelta, balanceDelta };
}

export function aggregateKey(cagedMunicipality: string, referenceMonth: string): string {
  return `${cagedMunicipality}|${referenceMonth}`;
}

export function canonicalAggregateHash(aggregate: CagedMunicipalAggregate, contributingVintages: string[]): string {
  const canonical = {
    territory: aggregate.ibgeCode,
    referenceMonth: aggregate.referenceMonth,
    admissions: aggregate.admissions,
    dismissals: aggregate.dismissals,
    balance: aggregate.balance,
    contributingVintages: [...contributingVintages].sort(),
    methodVersion: CAGED_METHOD_VERSION,
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function endOfMonth(referenceMonth: string): { start: string; end: string } {
  const month = normalizeReferenceMonth(referenceMonth);
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(4, 6));
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return { start: `${month.slice(0, 4)}-${month.slice(4, 6)}-01`, end: `${month.slice(0, 4)}-${month.slice(4, 6)}-${String(lastDay).padStart(2, '0')}` };
}
