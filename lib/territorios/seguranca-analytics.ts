import { CORE_INDICATOR_KEYS, INDICE_CRIMES_VIOLENTOS_KEY } from './seguranca-nature-map';

export type SecurityAnalyticalGroup = 'violencia_sexual' | 'violencia_letal' | 'roubo' | 'extorsao' | 'sequestro' | 'indice_oficial';
export interface SecurityCatalogEntry { indicatorKey: string; label: string; group: SecurityAnalyticalGroup; source: 'SEJUSP-MG'; }

const entry = (indicatorKey: string, label: string, group: SecurityAnalyticalGroup): SecurityCatalogEntry => ({ indicatorKey, label, group, source: 'SEJUSP-MG' });
export const SECURITY_INDICATOR_CATALOG: readonly SecurityCatalogEntry[] = Object.freeze([
  entry('estupro_consumado', 'Estupro consumado', 'violencia_sexual'), entry('estupro_tentado', 'Estupro tentado', 'violencia_sexual'),
  entry('estupro_vulneravel_consumado', 'Estupro de vulnerável consumado', 'violencia_sexual'), entry('estupro_vulneravel_tentado', 'Estupro de vulnerável tentado', 'violencia_sexual'),
  entry('homicidio_consumado', 'Homicídio consumado', 'violencia_letal'), entry('homicidio_tentado', 'Homicídio tentado', 'violencia_letal'),
  entry('roubo_consumado', 'Roubo consumado', 'roubo'), entry('roubo_tentado', 'Roubo tentado', 'roubo'),
  entry('extorsao_consumado', 'Extorsão consumada', 'extorsao'), entry('extorsao_tentado', 'Extorsão tentada', 'extorsao'), entry('extorsao_mediante_sequestro_consumado', 'Extorsão mediante sequestro consumada', 'extorsao'),
  entry('sequestro_carcere_privado_consumado', 'Sequestro e cárcere privado consumado', 'sequestro'), entry('sequestro_carcere_privado_tentado', 'Sequestro e cárcere privado tentado', 'sequestro'),
  entry(INDICE_CRIMES_VIOLENTOS_KEY, 'Índice de crimes violentos', 'indice_oficial'),
]);

export interface SecuritySeriesPoint { period: string; value: number; }
export interface SecuritySeriesSummary { current: number; previous: number | null; delta: number | null; trend: 'up' | 'down' | 'stable' | 'insufficient'; peak: SecuritySeriesPoint; low: SecuritySeriesPoint; average: number; }
export function summarizeSecuritySeries(points: SecuritySeriesPoint[]): SecuritySeriesSummary | null {
  const ordered = points.filter((point) => Number.isFinite(point.value)).sort((a, b) => a.period.localeCompare(b.period));
  if (ordered.length === 0) return null;
  const current = ordered.at(-1)!; const previous = ordered.at(-2) ?? null; const delta = previous ? current.value - previous.value : null;
  return { current: current.value, previous: previous?.value ?? null, delta, trend: delta === null ? 'insufficient' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable', peak: ordered.reduce((a, b) => b.value > a.value ? b : a), low: ordered.reduce((a, b) => b.value < a.value ? b : a), average: Number((ordered.reduce((sum, point) => sum + point.value, 0) / ordered.length).toFixed(4)) };
}

const catalogKeys = new Set(SECURITY_INDICATOR_CATALOG.map((item) => item.indicatorKey));
if (![...CORE_INDICATOR_KEYS, INDICE_CRIMES_VIOLENTOS_KEY].every((key) => catalogKeys.has(key))) throw new Error('SECURITY_CATALOG_INCOMPLETE');

