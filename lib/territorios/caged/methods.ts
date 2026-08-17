import type { CagedOfficialSector } from './types';

export type CagedCapabilityStatus = 'AVAILABLE' | 'METHODOLOGY_PENDING';

export const CAGED_SECTOR_METHOD_VERSION = 'novo-caged-five-sectors-v1';
export const CAGED_SECTOR_MAPPING_VERSION = 'mte-cnae2-sections-2026-v1';

export const CAGED_CAPABILITIES = {
  fiveSectors: {
    status: 'AVAILABLE',
    methodVersion: CAGED_SECTOR_METHOD_VERSION,
    mappingVersion: CAGED_SECTOR_MAPPING_VERSION,
    sourceField: 'seção',
    scope: 'admissoes_desligamentos_saldo',
  },
  employmentStock: {
    status: 'METHODOLOGY_PENDING',
    reason: 'Exige estoque de referência RAIS oficial e encadeamento/rebase anual ainda não ingeridos e homologados.',
  },
  relativeStockVariation: {
    status: 'METHODOLOGY_PENDING',
    reason: 'Depende do estoque inicial oficial validado, indisponível no motor atual.',
  },
  averageAdmissionSalary: {
    status: 'METHODOLOGY_PENDING',
    reason: 'Filtros gerais foram documentados, mas falta comparador municipal oficial estável para homologação exata.',
  },
} as const satisfies Record<string, { status: CagedCapabilityStatus; [key: string]: unknown }>;

export const CAGED_OFFICIAL_SECTORS: CagedOfficialSector[] = [
  'agropecuaria',
  'industria_geral',
  'construcao',
  'comercio',
  'servicos',
  'nao_classificado',
];

export function classifyCagedSection(value: unknown): CagedOfficialSector {
  const section = String(value ?? '').trim().toLocaleUpperCase('pt-BR');
  if (section === 'A') return 'agropecuaria';
  if (['B', 'C', 'D', 'E'].includes(section)) return 'industria_geral';
  if (section === 'F') return 'construcao';
  if (section === 'G') return 'comercio';
  if (/^[H-U]$/.test(section)) return 'servicos';
  return 'nao_classificado';
}
