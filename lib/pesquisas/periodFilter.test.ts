import { describe, it, expect } from 'vitest';
import { getPeriodAnchorDate, isWithinPeriod } from './periodFilter';

describe('getPeriodAnchorDate', () => {
  it('prioriza campoFim, depois campoInicio, depois dataRegistro', () => {
    expect(getPeriodAnchorDate({ campoFim: '2026-07-26', campoInicio: '2026-07-22', dataRegistro: '2026-07-22' })).toBe('2026-07-26');
    expect(getPeriodAnchorDate({ campoFim: null, campoInicio: '2026-07-22', dataRegistro: '2026-07-20' })).toBe('2026-07-22');
    expect(getPeriodAnchorDate({ campoFim: null, campoInicio: null, dataRegistro: '2026-07-20' })).toBe('2026-07-20');
    expect(getPeriodAnchorDate({})).toBeNull();
  });
});

describe('isWithinPeriod', () => {
  const NOW = new Date('2026-08-24T12:00:00Z');

  it('"all" (Todo o Histórico) sempre passa, mesmo sem data', () => {
    expect(isWithinPeriod(null, 'all', NOW)).toBe(true);
    expect(isWithinPeriod('2020-01-01', 'all', NOW)).toBe(true);
  });

  it('sem data conhecida, com período específico selecionado → nunca passa', () => {
    expect(isWithinPeriod(null, '30d', NOW)).toBe(false);
    expect(isWithinPeriod(undefined, '90d', NOW)).toBe(false);
  });

  it('30d: dentro e fora da janela', () => {
    expect(isWithinPeriod('2026-08-10', '30d', NOW)).toBe(true); // 14 dias atrás
    expect(isWithinPeriod('2026-06-01', '30d', NOW)).toBe(false); // ~84 dias atrás
  });

  it('60d: dentro e fora da janela (opção do dropdown que não existia no tipo até esta correção)', () => {
    expect(isWithinPeriod('2026-07-01', '60d', NOW)).toBe(true); // ~54 dias
    expect(isWithinPeriod('2026-06-01', '60d', NOW)).toBe(false); // ~84 dias
  });

  it('90d: caso real MG034902026 (22/07) e MG086462026 (22/04)', () => {
    expect(isWithinPeriod('2026-07-26', '90d', NOW)).toBe(true); // ~29 dias
    expect(isWithinPeriod('2026-04-26', '90d', NOW)).toBe(false); // ~120 dias
  });

  it('year: mesmo ano civil', () => {
    expect(isWithinPeriod('2026-01-05', 'year', NOW)).toBe(true);
    expect(isWithinPeriod('2025-12-31', 'year', NOW)).toBe(false);
  });

  it('data futura não conta como "dentro dos últimos N dias"', () => {
    expect(isWithinPeriod('2026-09-01', '30d', NOW)).toBe(false);
  });
});
