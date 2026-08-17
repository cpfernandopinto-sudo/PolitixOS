/**
 * Formatadores Universais de Dados e Números — PolitixOS (pt-BR).
 * Preservam a integridade dos dados brutos e realizam formatações exclusivamente visuais.
 */

/**
 * Formata um número inteiro (ex: 1240500 -> "1.240.500").
 */
export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata um percentual (ex: 78.4 -> "78,4%").
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

/**
 * Formata moeda em Reais (ex: 55400 -> "R$ 55.400,00" ou "R$ 55.400").
 */
export function formatCurrency(value: number | null | undefined, includeDecimals = true): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Formata números grandes em formato compacto executivo (ex: 4475980236 -> "R$ 4,48 bi", 1200000 -> "1,2 mi").
 */
export function formatCompactNumber(value: number | null | undefined, isCurrency = false): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  const absVal = Math.abs(value);
  const prefix = isCurrency ? 'R$ ' : '';
  const sign = value < 0 ? '-' : '';

  if (absVal >= 1_000_000_000) {
    const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(absVal / 1_000_000_000);
    return `${sign}${prefix}${formatted} bi`;
  }
  if (absVal >= 1_000_000) {
    const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(absVal / 1_000_000);
    return `${sign}${prefix}${formatted} mi`;
  }
  if (absVal >= 1_000) {
    const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(absVal / 1_000);
    return `${sign}${prefix}${formatted} mil`;
  }

  return `${sign}${prefix}${formatInteger(value)}`;
}

/**
 * Formata strings de datas ISO para pt-BR (ex: "2026-08-16T10:00:00Z" -> "16/08/2026").
 */
export function formatDate(dateStr: string | null | undefined, includeTime = false): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      ...(includeTime ? { timeStyle: 'short' } : {}),
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Normaliza rótulos de período (ex: "2024", "2024-Q1", "24h", "2022-2024").
 */
export function formatPeriod(periodStr: string | null | undefined): string {
  if (!periodStr) return '—';
  return periodStr.trim();
}
