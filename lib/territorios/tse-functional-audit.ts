export const TSE_AUDIT_YEARS = [2016, 2020, 2024] as const;

export interface AuditIndicator {
  territory_id: string;
  indicador: string;
  valor: number | string | null;
  source_dataset: string | null;
  source_record_id: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditAnomaly {
  severity: 'CRITICAL' | 'WARNING';
  code: string;
  detail: string;
}

export function indicatorNaturalKey(row: AuditIndicator): string {
  return [row.territory_id, row.indicador, row.source_dataset, row.periodo_inicio, row.periodo_fim].join('|');
}

export function duplicateCount(keys: string[]): number {
  return keys.length - new Set(keys).size;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function metadataNumber(row: AuditIndicator, key: string): number {
  return number(row.metadata?.[key]);
}

export function auditIndicatorRows(rows: AuditIndicator[]): AuditAnomaly[] {
  const anomalies: AuditAnomaly[] = [];
  const duplicates = duplicateCount(rows.map(indicatorNaturalKey));
  if (duplicates) anomalies.push({ severity: 'CRITICAL', code: 'DUPLICATE_NATURAL_KEY', detail: `${duplicates} indicadores duplicados.` });
  for (const row of rows) {
    const year = metadataNumber(row, 'ano') || metadataNumber(row, 'year') || Number(row.periodo_inicio?.slice(0, 4));
    if (!TSE_AUDIT_YEARS.includes(year as (typeof TSE_AUDIT_YEARS)[number])) {
      anomalies.push({ severity: 'CRITICAL', code: 'UNEXPECTED_YEAR', detail: `${row.indicador}: ano ${year}.` });
    }
    if (!Number.isFinite(number(row.valor)) || number(row.valor) < 0) {
      anomalies.push({ severity: 'CRITICAL', code: 'INVALID_VALUE', detail: `${row.indicador}: valor ${row.valor}.` });
    }
    if (row.indicador.startsWith('resultado_candidato_')) {
      const percentage = metadataNumber(row, 'percentage');
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        anomalies.push({ severity: 'CRITICAL', code: 'INVALID_PERCENTAGE', detail: `${row.indicador}: percentual ${percentage}.` });
      }
    }
  }
  return anomalies;
}

export interface TotalInvariantResult {
  checked: number;
  electorateMismatch: number;
  ballotMismatch: number;
}

export function auditTotalInvariants(rows: AuditIndicator[]): TotalInvariantResult {
  const groups = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const match = row.indicador.match(/^(eleitorado_total|comparecimento_total|abstencao_total|votos_validos_total|votos_brancos_total|votos_nulos_total)_(\d{4}_t\d+_c\d+)$/);
    if (!match) continue;
    const group = groups.get(match[2]) ?? new Map<string, number>();
    group.set(match[1], number(row.valor));
    groups.set(match[2], group);
  }
  let checked = 0;
  let electorateMismatch = 0;
  let ballotMismatch = 0;
  for (const values of groups.values()) {
    if (values.size !== 6) continue;
    checked++;
    const electorate = values.get('eleitorado_total')!;
    const turnout = values.get('comparecimento_total')!;
    const abstention = values.get('abstencao_total')!;
    const valid = values.get('votos_validos_total')!;
    const blank = values.get('votos_brancos_total')!;
    const nullVotes = values.get('votos_nulos_total')!;
    if (electorate !== turnout + abstention) electorateMismatch++;
    if (turnout !== valid + blank + nullVotes) ballotMismatch++;
  }
  return { checked, electorateMismatch, ballotMismatch };
}

export function candidateDuplicateCount(rows: AuditIndicator[]): number {
  const keys = rows.filter((row) => row.indicador.startsWith('resultado_candidato_')).map((row) => [
    row.territory_id,
    row.metadata?.year,
    row.metadata?.round,
    row.metadata?.officeCode,
    row.metadata?.candidateId,
  ].join('|'));
  return duplicateCount(keys);
}

