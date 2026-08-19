/**
 * Modelo de domínio do módulo Pesquisas Eleitorais — reflete as colunas
 * criadas em `supabase_migration_electoral_polls.sql`. Nomes das colunas
 * são do PolitixOS (canônicos), não do CSV original do TSE — o mapeamento
 * real de coluna-do-TSE → campo-daqui está PENDENTE (ver
 * lib/pesquisas/collector.ts, `SCHEMA_NOT_YET_VERIFIED`).
 */
export interface ElectoralPoll {
  id: string;
  tseRegistrationNumber: string;
  source: string;
  sourceUrl: string | null;
  sourceDataset: string;

  electionYear: number;
  uf: string | null;
  municipio: string | null;
  cargo: string | null;
  abrangencia: string | null;
  instituto: string | null;
  contratante: string | null;
  pagante: string | null;
  valor: number | null;
  metodologia: string | null;
  dataRegistro: string | null;
  campoInicio: string | null;
  campoFim: string | null;
  amostra: number | null;
  margemErro: number | null;
  nivelConfianca: number | null;

  ingestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoPergunta = 'espontanea' | 'estimulada';

export interface ElectoralPollResult {
  id: string;
  pollId: string;
  cenario: string;
  turno: number;
  tipoPergunta: TipoPergunta;
  candidateName: string;
  percentage: number;
}

export interface PesquisasFilters {
  electionYear?: number | null;
  uf?: string | null;
  municipio?: string | null;
  cargo?: string | null;
  instituto?: string | null;
}

export type ElectoralPollUpsert = Omit<ElectoralPoll, 'id' | 'createdAt' | 'updatedAt'> & {
  rawSourceRow?: Record<string, unknown> | null;
};

export interface PesquisasKpis {
  totalPolls: number;
  recentPolls30d: number;
  institutesCount: number;
  lastRegistrationDate: string | null;
  ufsCovered: number;
  topCargo: string | null;
  sourceStatus: 'OK' | 'BLOCKED_BY_SOURCE_ACCESS' | 'NEVER_RUN';
  lastSyncAt: string | null;
}
