/**
 * Registro territorial canônico e versionável.
 *
 * Pertencimento regional é domínio territorial, nunca responsabilidade de
 * motores temáticos (TSE, Segurança etc.). Cada entrada precisa apontar para
 * a norma oficial que define sua composição e usar código IBGE como chave.
 */

export type TerritoryRegionCode = 'RMBH';

export interface CanonicalRegionTerritory {
  ibgeCode: string;
  name: string;
  uf: string;
}

export interface CanonicalTerritoryRegion {
  code: TerritoryRegionCode;
  name: string;
  version: string;
  authority: string;
  legalBasis: string;
  sourceUrl: string;
  sourceAccessedAt: string;
  territories: readonly CanonicalRegionTerritory[];
}

const RMBH: CanonicalTerritoryRegion = {
  code: 'RMBH',
  name: 'Região Metropolitana de Belo Horizonte',
  version: 'LCP-MG-89-2006-art-2',
  authority: 'Assembleia Legislativa do Estado de Minas Gerais',
  legalBasis: 'Lei Complementar do Estado de Minas Gerais nº 89, de 12/01/2006, art. 2º',
  sourceUrl: 'https://www.almg.gov.br/legislacao-mineira/texto/LCP/89/2006/',
  sourceAccessedAt: '2026-08-11',
  territories: [
    { ibgeCode: '3105004', name: 'Baldim', uf: 'MG' },
    { ibgeCode: '3106200', name: 'Belo Horizonte', uf: 'MG' },
    { ibgeCode: '3106705', name: 'Betim', uf: 'MG' },
    { ibgeCode: '3109006', name: 'Brumadinho', uf: 'MG' },
    { ibgeCode: '3110004', name: 'Caeté', uf: 'MG' },
    { ibgeCode: '3112505', name: 'Capim Branco', uf: 'MG' },
    { ibgeCode: '3117876', name: 'Confins', uf: 'MG' },
    { ibgeCode: '3118601', name: 'Contagem', uf: 'MG' },
    { ibgeCode: '3124104', name: 'Esmeraldas', uf: 'MG' },
    { ibgeCode: '3126000', name: 'Florestal', uf: 'MG' },
    { ibgeCode: '3129806', name: 'Ibirité', uf: 'MG' },
    { ibgeCode: '3130101', name: 'Igarapé', uf: 'MG' },
    { ibgeCode: '3132206', name: 'Itaguara', uf: 'MG' },
    { ibgeCode: '3133709', name: 'Itatiaiuçu', uf: 'MG' },
    { ibgeCode: '3134608', name: 'Jaboticatubas', uf: 'MG' },
    { ibgeCode: '3136652', name: 'Juatuba', uf: 'MG' },
    { ibgeCode: '3137601', name: 'Lagoa Santa', uf: 'MG' },
    { ibgeCode: '3140159', name: 'Mário Campos', uf: 'MG' },
    { ibgeCode: '3140704', name: 'Mateus Leme', uf: 'MG' },
    { ibgeCode: '3141108', name: 'Matozinhos', uf: 'MG' },
    { ibgeCode: '3144805', name: 'Nova Lima', uf: 'MG' },
    { ibgeCode: '3136603', name: 'Nova União', uf: 'MG' },
    { ibgeCode: '3149309', name: 'Pedro Leopoldo', uf: 'MG' },
    { ibgeCode: '3153905', name: 'Raposos', uf: 'MG' },
    { ibgeCode: '3154606', name: 'Ribeirão das Neves', uf: 'MG' },
    { ibgeCode: '3154804', name: 'Rio Acima', uf: 'MG' },
    { ibgeCode: '3155306', name: 'Rio Manso', uf: 'MG' },
    { ibgeCode: '3156700', name: 'Sabará', uf: 'MG' },
    { ibgeCode: '3157807', name: 'Santa Luzia', uf: 'MG' },
    { ibgeCode: '3162922', name: 'São Joaquim de Bicas', uf: 'MG' },
    { ibgeCode: '3162955', name: 'São José da Lapa', uf: 'MG' },
    { ibgeCode: '3165537', name: 'Sarzedo', uf: 'MG' },
    { ibgeCode: '3168309', name: 'Taquaraçu de Minas', uf: 'MG' },
    { ibgeCode: '3171204', name: 'Vespasiano', uf: 'MG' },
  ],
};

const REGIONS: Readonly<Record<TerritoryRegionCode, CanonicalTerritoryRegion>> = { RMBH };

export function getCanonicalRegion(code: TerritoryRegionCode): CanonicalTerritoryRegion {
  return REGIONS[code];
}

export function getTerritoriesByRegion(code: TerritoryRegionCode): readonly CanonicalRegionTerritory[] {
  return getCanonicalRegion(code).territories;
}

export function isTerritoryInRegion(code: TerritoryRegionCode, ibgeCode: string): boolean {
  return getTerritoriesByRegion(code).some((territory) => territory.ibgeCode === ibgeCode);
}

export interface RegionalClassificationDivergence {
  ibgeCode: string;
  name: string;
  canonicalMember: boolean;
  externalMember: boolean | null;
}

/** Compara uma classificação temática sem promovê-la a fonte territorial. */
export function compareRegionClassification(
  code: TerritoryRegionCode,
  externalByIbge: ReadonlyMap<string, boolean>
): RegionalClassificationDivergence[] {
  return getTerritoriesByRegion(code)
    .map((territory) => ({
      ibgeCode: territory.ibgeCode,
      name: territory.name,
      canonicalMember: true,
      externalMember: externalByIbge.get(territory.ibgeCode) ?? null,
    }))
    .filter((item) => item.externalMember !== item.canonicalMember);
}
