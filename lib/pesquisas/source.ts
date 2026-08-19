import { TSE_PROVIDER, TSE_LICENSE } from '@/lib/territorios/tse-client';

export const PESQUISAS_SOURCE = 'TSE/PesqEle';
export const PESQUISAS_DATASET = 'pesquisas-eleitorais-2026';
export const PESQUISAS_SOURCE_URL =
  'https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip';
export const PESQUISAS_PORTAL_URL = 'https://dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026';

export interface PesquisasSourceDescriptor {
  provider: typeof TSE_PROVIDER;
  dataset: typeof PESQUISAS_DATASET;
  sourceUrl: string;
  portalUrl: string;
  license: typeof TSE_LICENSE;
}

export function getPesquisasSourceDescriptor(): PesquisasSourceDescriptor {
  return {
    provider: TSE_PROVIDER,
    dataset: PESQUISAS_DATASET,
    sourceUrl: PESQUISAS_SOURCE_URL,
    portalUrl: PESQUISAS_PORTAL_URL,
    license: TSE_LICENSE,
  };
}
