import { describe, expect, it } from 'vitest';
import type { CnesEstablishment } from './saude-cnes-client';
import { normalizeCnesSnapshot } from './saude-cnes-normalizer';

function row(overrides: Partial<CnesEstablishment> = {}): CnesEstablishment {
  return {
    codigo_cnes: 1, codigo_municipio: 311860, codigo_tipo_unidade: 2,
    estabelecimento_faz_atendimento_ambulatorial_sus: 'SIM', estabelecimento_possui_centro_cirurgico: 0,
    estabelecimento_possui_centro_obstetrico: 0, estabelecimento_possui_centro_neonatal: 0,
    estabelecimento_possui_atendimento_hospitalar: 0, estabelecimento_possui_servico_apoio: 1,
    estabelecimento_possui_atendimento_ambulatorial: 1, data_atualizacao: '2026-07-24', ...overrides,
  };
}

describe('normalização do snapshot CNES', () => {
  it('gera indicadores agregados, tipos, período e proveniência estáveis', () => {
    const rows = [row(), row({ codigo_cnes: 2, codigo_tipo_unidade: 5, data_atualizacao: '2026-07-25', estabelecimento_possui_atendimento_hospitalar: 1, estabelecimento_faz_atendimento_ambulatorial_sus: 'NAO' })];
    const first = normalizeCnesSnapshot('3118601', rows, '2026-08-13');
    const second = normalizeCnesSnapshot('3118601', [...rows].reverse(), '2026-08-13');
    expect(first.referenceDate).toBe('2026-08-13');
    expect(first.sourceUpdatedAtMin).toBe('2026-07-24');
    expect(first.sourceUpdatedAtMax).toBe('2026-07-25');
    expect(first.sourceHash).toBe(second.sourceHash);
    expect(first.indicators.find((item) => item.indicador === 'estabelecimentos_total')?.valor).toBe(2);
    expect(first.indicators.find((item) => item.indicador === 'estabelecimentos_atendimento_ambulatorial_sus')?.valor).toBe(1);
    expect(first.indicators.find((item) => item.indicador === 'estabelecimentos_tipo_unidade_5')?.valor).toBe(1);
    expect(first.indicators.every((item) => item.periodoInicio === '2026-08-13')).toBe(true);
  });

  it('não fabrica dado quando a fonte não retorna registros', () => {
    expect(() => normalizeCnesSnapshot('3118601', [], '2026-08-13')).toThrow('CNES_NOT_AVAILABLE');
  });

  it('desacopla mudança individual da fonte do período do snapshot', () => {
    const d1 = normalizeCnesSnapshot('3118601', [row()], '2026-08-13');
    const changedSourceDate = normalizeCnesSnapshot('3118601', [row({ data_atualizacao: '2026-08-14' })], '2026-08-13');
    expect(changedSourceDate.sourceHash).not.toBe(d1.sourceHash);
    expect(changedSourceDate.indicators.map((item) => [item.periodoInicio, item.periodoFim])).toEqual(d1.indicators.map((item) => [item.periodoInicio, item.periodoFim]));
  });

  it('cria período intencional distinto para nova reference_date', () => {
    const d1 = normalizeCnesSnapshot('3118601', [row()], '2026-08-13');
    const d2 = normalizeCnesSnapshot('3118601', [row()], '2026-08-14');
    expect(d1.indicators[0].periodoInicio).toBe('2026-08-13');
    expect(d2.indicators[0].periodoInicio).toBe('2026-08-14');
  });
});
