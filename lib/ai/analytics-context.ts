import { createHash } from 'node:crypto';
import type { AnalyticsContext, EvidenceRefInput } from './analytics-schema';
import type { PoliticalStatusResult } from '@/lib/analytics/political-status';
import type {
  ExecutiveSynthesis,
  RiskCard,
  OpportunityCard,
  KeyChange,
  EntityRankItem,
  ThemeRankItem,
} from '@/lib/analytics/executive-summary';

/** Versão da metodologia determinística (Sprint 3) refletida no contexto. */
export const METHODOLOGY_VERSION = 'centro-executivo-sprint3-v1';
/** Versão do prompt/schema da leitura assistida (Sprint 4). */
export const PROMPT_VERSION = 'leitura-analitica-v1';

const MAX_EVIDENCES = 20;
const MAX_LIST_ITEMS = 8;

/** Limitações conhecidas da metodologia — mesmas já documentadas em docs/METODOLOGIA_CENTRO_EXECUTIVO.md. Nunca editadas dinamicamente por dado do usuário. */
const KNOWN_METHODOLOGY_LIMITATIONS = [
  'O score de crise é um indicador sintético (volume, sentimento, risco), não uma pesquisa de opinião ou medição de aprovação.',
  '"Tema em Destaque" reflete apenas volume no período atual — não há dado histórico para medir crescimento real de tema.',
  'A comparação de período anterior é agregada (sentimento geral), não por métrica individual de cada rede social.',
  'Nenhuma conclusão aqui deve ser lida como previsão eleitoral, recomendação de voto ou opinião política.',
];

interface BuildContextInput {
  filters: { candidate: string | null; period: string | null };
  politicalStatus: PoliticalStatusResult;
  risks: RiskCard[];
  opportunities: OpportunityCard[];
  keyChanges: KeyChange[];
  entities: EntityRankItem[];
  themes: ThemeRankItem[];
  synthesis: ExecutiveSynthesis;
}

/**
 * Sanitiza texto vindo de notícias/posts monitorados antes de incluí-lo no
 * contexto enviado ao modelo. Esse texto é DADO, nunca instrução — mesmo
 * assim, removemos HTML/scripts e qualquer coisa que se pareça com uma
 * tentativa de instrução embutida (ex.: "ignore as instruções anteriores"),
 * substituindo por um marcador neutro. O prompt do sistema (ver
 * analytics-prompt.ts) também reforça essa regra de forma independente —
 * esta é uma camada defensiva adicional, não a única.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Cobre as duas ordens de palavras possíveis: "ignore ... instructions"
  // (inglês) e "ignore ... instruções" (português, onde o adjetivo
  // "anteriores" vem DEPOIS do substantivo — "instruções anteriores").
  /\bignore\b[^.!?\n]{0,40}\b(instru\w*|instructions?)\b/gi,
  /\b(instru\w*|instructions?)\b[^.!?\n]{0,40}\bignore\b/gi,
  /system\s*prompt/gi,
  /you\s+are\s+now/gi,
  /\bact\s+as\b/gi,
  /<\s*script/gi,
  /<\s*\/?\s*[a-z][^>]*>/gi, // remove quaisquer tags HTML
];

export function sanitizeMonitoredText(text: string): string {
  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[trecho removido]');
  }
  return sanitized.replace(/\s+/g, ' ').trim();
}

/** Sanitiza e trunca em um único passo — todo texto de origem monitorada passa por aqui antes de entrar no contexto. */
function truncate(text: string, max = 220): string {
  const clean = sanitizeMonitoredText(text);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Constrói o contexto estruturado enviado ao modelo — função pura,
 * determinística e testável. Só inclui os campos explicitamente permitidos
 * (ver comentário no topo do arquivo de schema); nunca inclui tokens,
 * dados de sessão, e-mails, IDs internos de usuário ou tabelas completas.
 */
export function buildAnalyticsContext(input: BuildContextInput): AnalyticsContext {
  const evidencias: EvidenceRefInput[] = [];
  const seenIds = new Set<string>();
  const pushEvidence = (ref: EvidenceRefInput) => {
    if (seenIds.has(ref.id) || evidencias.length >= MAX_EVIDENCES) return;
    seenIds.add(ref.id);
    evidencias.push(ref);
  };

  input.risks.slice(0, MAX_LIST_ITEMS).forEach((r) => {
    pushEvidence({ id: r.id, tipo: 'alerta', url: r.evidencia?.url ?? null, descricao: truncate(r.descricao) });
  });
  input.opportunities.slice(0, MAX_LIST_ITEMS).forEach((o) => {
    pushEvidence({ id: o.id, tipo: 'alerta', url: null, descricao: truncate(o.descricao) });
  });
  input.themes.slice(0, MAX_LIST_ITEMS).forEach((t) => {
    pushEvidence({ id: `tema:${t.tema}`, tipo: 'tema', url: null, descricao: truncate(t.tema, 80) });
  });
  input.entities.slice(0, MAX_LIST_ITEMS).forEach((e) => {
    pushEvidence({ id: `entidade:${e.nome}`, tipo: 'entidade', url: null, descricao: truncate(e.nome, 80) });
  });

  return {
    versao: { metodologia: METHODOLOGY_VERSION, prompt: PROMPT_VERSION },
    periodo: input.filters.period || 'all',
    filtros: { candidato: input.filters.candidate, periodo: input.filters.period || 'all' },
    estadoPolitico: {
      status: input.politicalStatus.label,
      score: input.politicalStatus.score,
      semDados: input.politicalStatus.semDados,
      fatores: input.politicalStatus.fatores.slice(0, MAX_LIST_ITEMS),
    },
    sintese: {
      estadoGeral: input.synthesis.estadoGeral.valor,
      principalRisco: input.synthesis.principalRisco.valor,
      principalOportunidade: input.synthesis.principalOportunidade.valor,
      temaEmDestaque: input.synthesis.temaEmDestaque.valor,
      maiorExposicao: input.synthesis.maiorExposicao.valor,
      mudancaRelevante: input.synthesis.mudancaRelevante.valor,
    },
    riscos: input.risks.slice(0, MAX_LIST_ITEMS).map((r) => ({
      id: r.id,
      descricao: truncate(r.descricao),
      severidade: r.severidade,
      metrica: truncate(r.metricaAtual, 80),
    })),
    oportunidades: input.opportunities.slice(0, MAX_LIST_ITEMS).map((o) => ({
      id: o.id,
      descricao: truncate(o.descricao),
      metrica: truncate(o.metricaAtual, 80),
    })),
    mudancas: input.keyChanges.slice(0, MAX_LIST_ITEMS).map((c) => ({
      label: c.label,
      metrica: `${c.valorAnterior} → ${c.valorAtual}`,
      interpretacao: c.interpretacao,
    })),
    entidades: input.entities.slice(0, MAX_LIST_ITEMS).map((e) => ({
      nome: e.nome,
      volume: e.volume,
      sentimento: e.sentimentoPredominante,
      alertas: e.alertas,
    })),
    temas: input.themes.slice(0, MAX_LIST_ITEMS).map((t) => ({ tema: t.tema, frequencia: t.frequencia })),
    evidenciasDisponiveis: evidencias,
    limitacoesConhecidas: KNOWN_METHODOLOGY_LIMITATIONS,
  };
}

/**
 * Hash determinístico do contexto — usado como chave de cache/dedup.
 * `JSON.stringify` em JS preserva a ordem de inserção das chaves; como
 * `buildAnalyticsContext` sempre monta o objeto na MESMA ordem de campos
 * para o mesmo tipo de entrada, a serialização é estável para entradas
 * equivalentes (verificado em teste).
 */
export function hashAnalyticsContext(context: AnalyticsContext): string {
  const canonical = JSON.stringify(context);
  return createHash('sha256').update(canonical).digest('hex');
}
