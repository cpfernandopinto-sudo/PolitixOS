import { describe, it, expect } from 'vitest';
import { resolveNatureza, CORE_INDICATOR_KEYS, NATURE_MAP, INDICE_CRIMES_VIOLENTOS_KEY } from './seguranca-nature-map';

describe('resolveNatureza', () => {
  it('resolve as 13 naturezas núcleo para seus indicator_key esperados', () => {
    expect(resolveNatureza('HOMICIDIO CONSUMADO (REGISTROS)')).toEqual({ status: 'core', indicatorKey: 'homicidio_consumado' });
    expect(resolveNatureza('HOMICIDIO TENTADO')).toEqual({ status: 'core', indicatorKey: 'homicidio_tentado' });
    expect(resolveNatureza('ROUBO CONSUMADO')).toEqual({ status: 'core', indicatorKey: 'roubo_consumado' });
    expect(resolveNatureza('ROUBO TENTADO')).toEqual({ status: 'core', indicatorKey: 'roubo_tentado' });
    expect(resolveNatureza('ESTUPRO CONSUMADO')).toEqual({ status: 'core', indicatorKey: 'estupro_consumado' });
    expect(resolveNatureza('ESTUPRO TENTADO')).toEqual({ status: 'core', indicatorKey: 'estupro_tentado' });
    expect(resolveNatureza('ESTUPRO DE VULNERAVEL CONSUMADO')).toEqual({ status: 'core', indicatorKey: 'estupro_vulneravel_consumado' });
    expect(resolveNatureza('ESTUPRO DE VULNERAVEL TENTADO')).toEqual({ status: 'core', indicatorKey: 'estupro_vulneravel_tentado' });
    expect(resolveNatureza('SEQUESTRO E CARCERE PRIVADO CONSUMADO')).toEqual({ status: 'core', indicatorKey: 'sequestro_carcere_privado_consumado' });
    expect(resolveNatureza('SEQUESTRO E CARCERE PRIVADO TENTADO')).toEqual({ status: 'core', indicatorKey: 'sequestro_carcere_privado_tentado' });
    expect(resolveNatureza('EXTORSAO CONSUMADO')).toEqual({ status: 'core', indicatorKey: 'extorsao_consumado' });
    expect(resolveNatureza('EXTORSAO TENTADO')).toEqual({ status: 'core', indicatorKey: 'extorsao_tentado' });
    expect(resolveNatureza('EXTORSAO MEDIANTE SEQUESTRO CONSUMADO')).toEqual({ status: 'core', indicatorKey: 'extorsao_mediante_sequestro_consumado' });
  });

  it('CORE_INDICATOR_KEYS tem exatamente as 13 chaves do MVP, sem duplicatas', () => {
    expect(CORE_INDICATOR_KEYS).toHaveLength(13);
    expect(new Set(CORE_INDICATOR_KEYS).size).toBe(13);
  });

  it('reconhece Feminicídio como "out_of_scope" (não núcleo), não como desconhecido', () => {
    expect(resolveNatureza('FEMINICIDIO CONSUMADO (REGISTROS)')).toEqual({ status: 'out_of_scope', indicatorKey: 'feminicidio_consumado' });
    expect(resolveNatureza('FEMINICIDIO TENTADO')).toEqual({ status: 'out_of_scope', indicatorKey: 'feminicidio_tentado' });
  });

  it('retorna "unknown" para uma natureza genuinamente não mapeada', () => {
    expect(resolveNatureza('NATUREZA_NUNCA_VISTA_XYZ')).toEqual({ status: 'unknown' });
    expect(resolveNatureza('')).toEqual({ status: 'unknown' });
  });

  it('não depende de normalização automática — "(REGISTROS)" só existe em 2 das 15 naturezas do mapa', () => {
    expect(resolveNatureza('HOMICIDIO CONSUMADO')).toEqual({ status: 'unknown' }); // sem o sufixo real — não deve casar
    expect(resolveNatureza('ROUBO CONSUMADO (REGISTROS)')).toEqual({ status: 'unknown' }); // sufixo que essa natureza NÃO tem na fonte real
  });

  it('índice de crimes violentos não é uma entrada do mapa de naturezas (é derivado pelo coletor)', () => {
    expect(Object.values(NATURE_MAP).some((m) => m.indicatorKey === INDICE_CRIMES_VIOLENTOS_KEY)).toBe(false);
  });
});
