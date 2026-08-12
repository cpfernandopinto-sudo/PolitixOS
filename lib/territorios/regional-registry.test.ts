import { describe, expect, it } from 'vitest';
import { compareRegionClassification, getCanonicalRegion, getTerritoriesByRegion, isTerritoryInRegion } from './regional-registry';

describe('registro territorial canônico', () => {
  const rmbh = getTerritoriesByRegion('RMBH');

  it('homologa os 34 municípios definidos pelo art. 2º da LC-MG 89/2006', () => {
    expect(rmbh).toHaveLength(34);
    expect(getCanonicalRegion('RMBH')).toMatchObject({
      version: 'LCP-MG-89-2006-art-2',
      authority: 'Assembleia Legislativa do Estado de Minas Gerais',
    });
  });

  it('inclui Belo Horizonte e Contagem sem exceção no motor temático', () => {
    expect(isTerritoryInRegion('RMBH', '3106200')).toBe(true);
    expect(isTerritoryInRegion('RMBH', '3118601')).toBe(true);
  });

  it('mantém códigos IBGE e município+UF únicos', () => {
    expect(new Set(rmbh.map((item) => item.ibgeCode)).size).toBe(rmbh.length);
    expect(new Set(rmbh.map((item) => `${item.name}|${item.uf}`)).size).toBe(rmbh.length);
  });

  it('contém somente códigos IBGE válidos de Minas Gerais', () => {
    expect(rmbh.every((item) => /^31\d{5}$/.test(item.ibgeCode))).toBe(true);
    expect(rmbh.every((item) => item.uf === 'MG')).toBe(true);
  });

  it('expõe a divergência temática sem alterar o pertencimento canônico', () => {
    const securityClassification = new Map(rmbh.map((item) => [item.ibgeCode, true]));
    securityClassification.set('3106200', false);
    expect(compareRegionClassification('RMBH', securityClassification)).toEqual([
      { ibgeCode: '3106200', name: 'Belo Horizonte', canonicalMember: true, externalMember: false },
    ]);
    expect(isTerritoryInRegion('RMBH', '3106200')).toBe(true);
  });
});
