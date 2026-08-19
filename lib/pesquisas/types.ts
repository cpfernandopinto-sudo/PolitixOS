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

  rawSourceRow?: Record<string, string> | null;

  ingestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedValue<T> {
  value: T;
  isExtracted: boolean;
  confidence: 'high' | 'medium' | 'low';
  sourceField: 'DS_PLANO_AMOSTRAL' | 'DS_METODOLOGIA_PESQUISA' | 'DS_SISTEMA_CONTROLE' | 'DS_DADO_MUNICIPIO' | 'STRUCTURED_TSE';
  rawSnippet?: string;
}

export interface SampleProfileItem {
  label: string;
  percentage: number;
}

export interface ExtractedPollMetadata {
  marginError: ExtractedValue<number> | null;
  confidenceLevel: ExtractedValue<number> | null;
  genderDistribution: ExtractedValue<SampleProfileItem[]> | null;
  ageDistribution: ExtractedValue<SampleProfileItem[]> | null;
  educationDistribution: ExtractedValue<SampleProfileItem[]> | null;
  incomeDistribution: ExtractedValue<SampleProfileItem[]> | null;
  collectionType: ExtractedValue<string> | null;
  samplingMethod: ExtractedValue<string> | null;
  targetPublic: ExtractedValue<string> | null;
  weightingInfo: ExtractedValue<{ used: boolean; variables: string[] }> | null;
  qualityControl: ExtractedValue<{ checkpoints: string[]; auditPercentage: number | null }> | null;
  territorialCoverage: ExtractedValue<{ status: 'structured' | 'pending' | 'none'; details: string[] | null }> | null;
}

export type TipoPergunta = 'espontanea' | 'estimulada';

/**
 * PESQUISAS-01B — nunca populada sem proveniência verificável (fonte real,
 * URL, data). `office`/`resultType` complementam (não substituem) o par
 * turno+tipoPergunta já usado como chave de comparabilidade
 * (lib/pesquisas/comparability.ts) — servem para filtragem direta sem join.
 */
export type ResultType = 'STIMULATED' | 'SPONTANEOUS' | 'REJECTION' | 'SECOND_ROUND' | 'OTHER';

export interface ElectoralPollResult {
  id: string;
  pollId: string;
  cenario: string;
  turno: number;
  tipoPergunta: TipoPergunta;
  candidateName: string;
  percentage: number;
  /** screen_key-like: 'Presidente' | 'Governador' etc. — espelha o cargo da pesquisa associada. */
  office: string | null;
  resultType: ResultType | null;
  /** Preenchido só quando há correspondência seguramente identificável com lib/queries/candidatos (targets). */
  candidateId: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  collectedAt: string;
  provenance: Record<string, unknown>;
  /** true somente após conferência manual (mesmo instituto + janela de campo + cargo/território da pesquisa registrada) — nunca automático por similaridade. */
  verified: boolean;
}

export type ElectoralPollResultUpsert = Omit<ElectoralPollResult, 'id' | 'collectedAt'>;

export interface PesquisasFilters {
  electionYear?: number | null;
  uf?: string | null;
  municipio?: string | null;
  cargo?: string | null;
  instituto?: string | null;
  period?: '30d' | '90d' | 'year' | 'all' | null;
  turno?: number | null;
  tipoPergunta?: TipoPergunta | null;
  candidateNames?: string[] | null;
}

export interface ElectoralPollResultWithPoll extends ElectoralPollResult {
  poll?: ElectoralPoll | null;
}

export interface CandidateRankingItem {
  candidateName: string;
  percentage: number;
  candidateId?: string | null;
  isLeader?: boolean;
}

export interface InstituteComparisonPoint {
  institute: string;
  pollId: string;
  registrationNumber: string;
  fieldDate: string | null;
  sampleSize: number | null;
  /** Cenário desta linha — uma pesquisa com múltiplos cenários (PESQUISAS-03) vira uma linha por cenário, nunca uma única linha misturando percentuais de leituras diferentes. */
  cenario: string | null;
  results: { candidateName: string; percentage: number }[];
}

export interface ExecutiveCockpitMetrics {
  intencaoMaisRecente: { candidateName: string; percentage: number; pollDate: string | null; instituto: string } | null;
  gapConcorrente: { gap: number; leader: string; runnerUp: string } | null;
  variacaoAnterior: { diff: number; candidateName: string; previousPollDate: string | null } | null;
  maximoPeriodo: { percentage: number; candidateName: string; pollDate: string | null } | null;
  minimoPeriodo: { percentage: number; candidateName: string; pollDate: string | null } | null;
  pesquisasComparaveisCount: number;
  lastUpdateDate: string | null;
  hasSufficientSeries: boolean;
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
