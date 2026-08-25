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

/** Categorias que não representam candidatos reais — excluídas de rankings de liderança e filtros. */
export const NON_CANDIDATE_LABELS = new Set([
  'branco/nulo',
  'branco/nulo/não vai votar',
  'nulo/branco',
  'branco/nulo/nenhum',
  'indecisos',
  'indecisos/brancos/nulos',
  'não sabe',
  'não respondeu',
  'não sabe/não respondeu',
  'ns/nr',
  'outros',
]);

export function isRealCandidate(name: string): boolean {
  if (!name) return false;
  return !NON_CANDIDATE_LABELS.has(name.trim().toLowerCase());
}

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
  // '60d' estava disponível no dropdown (PesquisasFilterBar.tsx) mas ausente deste tipo — o filtro
  // Período era decorativo, então o mismatch nunca quebrava nada em runtime. Corrigido no Sprint 2A.
  period?: '30d' | '60d' | '90d' | 'year' | 'all' | null;
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
  intencaoMaisRecente: {
    candidateName: string;
    percentage: number;
    pollDate: string | null;
    instituto: string;
    /** Sprint 2B, P1 — contexto compacto da pesquisa de referência (nunca deixar o usuário achar que o % é média/agregado). */
    cenario: string | null;
    tseRegistrationNumber: string;
  } | null;
  runnerUpResult: { candidateName: string; percentage: number } | null;
  referenceCandidate: string | null;
  analyzedCandidateResult: { candidateName: string; percentage: number; rank: number; gapToLeader: number } | null;
  gapConcorrente: { gap: number; leader: string; runnerUp: string } | null;
  variacaoAnterior: { diff: number; candidateName: string; previousPollDate: string | null } | null;
  maximoPeriodo: { percentage: number; candidateName: string; pollDate: string | null } | null;
  minimoPeriodo: { percentage: number; candidateName: string; pollDate: string | null } | null;
  totalPollsInSlice: number;
  pollsWithResultsCount: number;
  /** Inclui a própria pesquisa mais recente (auto-match) — preservado para não quebrar `signals.ts`/testes existentes. Para UX, usar `comparableOtherPollsCount`. */
  pesquisasComparaveisCount: number;
  /** Pesquisas OUTRAS que a mais recente e que são metodologicamente comparáveis a ela (`pesquisasComparaveisCount` menos a auto-comparação). É o número que a UX deve chamar de "Comparáveis" — 0 quando só a própria pesquisa mais recente "bate" consigo mesma. */
  comparableOtherPollsCount: number;
  trendPollsCount: number;
  lastUpdateDate: string | null;
  hasSufficientSeries: boolean;
  leaderMovement: 'UP' | 'DOWN' | 'STABLE' | 'UNAVAILABLE';
  runnerUpMovement: 'UP' | 'DOWN' | 'STABLE' | 'UNAVAILABLE';
  gapBehavior: 'EXPANDING' | 'NARROWING' | 'STABLE' | 'UNAVAILABLE';
  volatility: 'BAIXA' | 'MODERADA' | 'ALTA' | 'UNAVAILABLE';
  instituteConsistency: 'CONVERGENTE' | 'MODERADA' | 'DIVERGENTE' | 'UNAVAILABLE';
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
