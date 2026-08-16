import { describe, expect, it } from 'vitest';
import { decideHealthIndicatorAction, HEALTH_CACHE_TTL_MS, healthIndicatorNaturalKey, isHealthCacheFresh } from './saude-collector';
import type { HealthIndicator } from './saude-cnes-normalizer';

function indicator(referenceDate = '2026-08-13', sourceHash = 'hash-a'): HealthIndicator {
  return { indicador: 'estabelecimentos_total', valor: 10, unidade: 'estabelecimentos', periodoInicio: referenceDate, periodoFim: referenceDate, sourceRecordId: `id:${referenceDate}`, sourceUpdatedAt: '2026-08-14T00:00:00.000Z', metadata: { source_hash: sourceHash } };
}

describe('reconciliação do Motor Saúde', () => {
  it('mantém a mesma natural key quando só data_atualizacao/hash muda no mesmo snapshot', () => {
    const before = indicator('2026-08-13', 'hash-a');
    const after = indicator('2026-08-13', 'hash-b');
    expect(healthIndicatorNaturalKey(after)).toBe(healthIndicatorNaturalKey(before));
    expect(decideHealthIndicatorAction({ valor: 10, metadata: { source_hash: 'hash-a' } }, after, false)).toBe('update');
  });

  it('gera nova natural key somente quando reference_date muda', () => {
    expect(healthIndicatorNaturalKey(indicator('2026-08-14'))).not.toBe(healthIndicatorNaturalKey(indicator('2026-08-13')));
  });

  it('reexecução idêntica fica unchanged e force_refresh atualiza sem trocar a chave', () => {
    const item = indicator();
    const existing = { valor: 10, metadata: { source_hash: 'hash-a' } };
    expect(decideHealthIndicatorAction(existing, item, false)).toBe('unchanged');
    expect(decideHealthIndicatorAction(existing, item, true)).toBe('update');
    expect(healthIndicatorNaturalKey(item)).toBe('estabelecimentos_total|2026-08-13|2026-08-13');
  });
});

describe('TTL do Motor Saúde', () => {
  const now = Date.parse('2026-08-15T12:00:00.000Z');

  it('considera cache válido estritamente dentro de 24 horas', () => {
    expect(isHealthCacheFresh('2026-08-14T12:00:00.001Z', now)).toBe(true);
    expect(isHealthCacheFresh('2026-08-14T12:00:00.000Z', now)).toBe(false);
  });

  it('rejeita cache futuro, ausente ou inválido', () => {
    expect(isHealthCacheFresh('2026-08-15T12:00:00.001Z', now)).toBe(false);
    expect(isHealthCacheFresh(undefined, now)).toBe(false);
    expect(isHealthCacheFresh('inválido', now)).toBe(false);
    expect(HEALTH_CACHE_TTL_MS).toBe(86_400_000);
  });
});
