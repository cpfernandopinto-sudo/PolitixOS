import { createHash } from 'node:crypto';
import type { CnesEstablishment } from './saude-cnes-client';

export interface HealthIndicator {
  indicador: string; valor: number; unidade: 'estabelecimentos'; periodoInicio: string; periodoFim: string;
  sourceRecordId: string; sourceUpdatedAt: string; metadata: Record<string, unknown>;
}

const CAPABILITIES: Array<[string, (row: CnesEstablishment) => boolean]> = [
  ['estabelecimentos_total', () => true],
  ['estabelecimentos_atendimento_ambulatorial_sus', (r) => r.estabelecimento_faz_atendimento_ambulatorial_sus?.toUpperCase() === 'SIM'],
  ['estabelecimentos_atendimento_hospitalar', (r) => r.estabelecimento_possui_atendimento_hospitalar === 1],
  ['estabelecimentos_atendimento_ambulatorial', (r) => r.estabelecimento_possui_atendimento_ambulatorial === 1],
  ['estabelecimentos_servico_apoio', (r) => r.estabelecimento_possui_servico_apoio === 1],
  ['estabelecimentos_centro_cirurgico', (r) => r.estabelecimento_possui_centro_cirurgico === 1],
  ['estabelecimentos_centro_obstetrico', (r) => r.estabelecimento_possui_centro_obstetrico === 1],
  ['estabelecimentos_centro_neonatal', (r) => r.estabelecimento_possui_centro_neonatal === 1],
  ['estabelecimentos_unidades_basicas', (r) => r.codigo_tipo_unidade === 2],
  ['estabelecimentos_atencao_primaria', (r) => [1, 2, 15, 71].includes(r.codigo_tipo_unidade)],
  ['estabelecimentos_hospitalares_por_tipo', (r) => [5, 7, 62].includes(r.codigo_tipo_unidade)],
  ['estabelecimentos_urgencia_emergencia', (r) => [20, 21, 42, 73, 76].includes(r.codigo_tipo_unidade)],
];

export function normalizeReferenceDate(referenceDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) || Number.isNaN(Date.parse(`${referenceDate}T00:00:00.000Z`))) throw new Error('INVALID_REFERENCE_DATE');
  return referenceDate;
}

export function normalizeCnesSnapshot(codigoIbge: string, rows: CnesEstablishment[], referenceDate: string): { indicators: HealthIndicator[]; sourceHash: string; referenceDate: string; sourceUpdatedAtMin: string; sourceUpdatedAtMax: string } {
  if (rows.length === 0) throw new Error('CNES_NOT_AVAILABLE');
  const snapshotDate = normalizeReferenceDate(referenceDate);
  const sourceDates = rows.map((item) => item.data_atualizacao).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const sourceUpdatedAtMin = sourceDates.at(0);
  const sourceUpdatedAtMax = sourceDates.at(-1);
  if (!sourceUpdatedAtMin || !sourceUpdatedAtMax) throw new Error('CNES_SOURCE_UPDATED_AT_MISSING');
  const cnesCodes = rows.map((item) => String(item.codigo_cnes)).sort();
  const canonicalRows = rows.map((item) => [item.codigo_cnes, item.data_atualizacao, item.codigo_tipo_unidade, item.estabelecimento_faz_atendimento_ambulatorial_sus, item.estabelecimento_possui_centro_cirurgico, item.estabelecimento_possui_centro_obstetrico, item.estabelecimento_possui_centro_neonatal, item.estabelecimento_possui_atendimento_hospitalar, item.estabelecimento_possui_servico_apoio, item.estabelecimento_possui_atendimento_ambulatorial]).sort((a, b) => Number(a[0]) - Number(b[0]));
  const sourceHash = createHash('sha256').update(JSON.stringify(canonicalRows)).digest('hex');
  const metadata: Record<string, unknown> = { codigo_ibge: codigoIbge, source_mode: 'REAL', source_hash: sourceHash, source_record_count: rows.length, cnes_codes: cnesCodes, snapshot_reference_date: snapshotDate, source_updated_at_min: sourceUpdatedAtMin, source_updated_at_max: sourceUpdatedAtMax };
  const common = { unidade: 'estabelecimentos' as const, periodoInicio: snapshotDate, periodoFim: snapshotDate, sourceUpdatedAt: `${sourceUpdatedAtMax}T00:00:00.000Z`, metadata };
  const indicators = CAPABILITIES.map(([indicador, predicate]) => ({ indicador, valor: rows.filter(predicate).length, sourceRecordId: `${codigoIbge}:${snapshotDate}:${indicador}`, ...common }));
  const byType = new Map<number, number>();
  for (const row of rows) byType.set(row.codigo_tipo_unidade, (byType.get(row.codigo_tipo_unidade) ?? 0) + 1);
  for (const [type, value] of [...byType.entries()].sort((a, b) => a[0] - b[0])) indicators.push({ indicador: `estabelecimentos_tipo_unidade_${type}`, valor: value, sourceRecordId: `${codigoIbge}:${snapshotDate}:tipo:${type}`, ...common, metadata: { ...common.metadata, codigo_tipo_unidade: type } });
  return { indicators, sourceHash, referenceDate: snapshotDate, sourceUpdatedAtMin, sourceUpdatedAtMax };
}
