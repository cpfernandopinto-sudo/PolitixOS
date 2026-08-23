import { z } from 'zod';

/**
 * Schemas Zod para a Leitura Analítica Assistida (Sprint 4).
 *
 * Duas responsabilidades:
 * 1. `AnalyticsContextSchema` — valida/tipa o CONTEXTO que enviamos ao
 *    modelo (nunca dados brutos demais, nunca campos sensíveis).
 * 2. `AnalyticsInsightOutputSchema` — valida a SAÍDA do modelo antes de
 *    persistir ou renderizar. Uma resposta que não passa neste schema é
 *    descartada (nunca exibida, nunca persistida) — ver
 *    lib/ai/analytics-service.ts.
 */

// ─── Contexto (entrada) ─────────────────────────────────────────────────────

export const EvidenceRefSchema = z.object({
  id: z.string(),
  tipo: z.enum(['alerta', 'noticia', 'post', 'tema', 'entidade']),
  url: z.string().nullable(),
  descricao: z.string(),
});
export type EvidenceRefInput = z.infer<typeof EvidenceRefSchema>;

export const AnalyticsContextSchema = z.object({
  versao: z.object({
    metodologia: z.string(),
    prompt: z.string(),
  }),
  periodo: z.string(),
  filtros: z.object({
    candidato: z.string().nullable(),
    periodo: z.string(),
  }),
  estadoPolitico: z.object({
    status: z.string(),
    score: z.number(),
    semDados: z.boolean(),
    fatores: z.array(z.string()).max(10),
  }),
  sintese: z.object({
    estadoGeral: z.string().nullable(),
    principalRisco: z.string().nullable(),
    principalOportunidade: z.string().nullable(),
    temaEmDestaque: z.string().nullable(),
    maiorExposicao: z.string().nullable(),
    mudancaRelevante: z.string().nullable(),
  }),
  riscos: z
    .array(
      z.object({ id: z.string(), descricao: z.string(), severidade: z.string(), metrica: z.string() })
    )
    .max(10),
  oportunidades: z
    .array(z.object({ id: z.string(), descricao: z.string(), metrica: z.string() }))
    .max(10),
  mudancas: z
    .array(z.object({ label: z.string(), metrica: z.string(), interpretacao: z.string() }))
    .max(10),
  entidades: z
    .array(z.object({ nome: z.string(), volume: z.number(), sentimento: z.string().nullable(), alertas: z.number() }))
    .max(10),
  temas: z.array(z.object({ tema: z.string(), frequencia: z.number() })).max(10),
  /**
   * PESQUISAS-N8N-01 — resumo determinístico de pesquisas eleitorais para o
   * candidato filtrado, quando ele é um target com poll_monitoring_enabled.
   * Nunca resultado bruto por pesquisa — só o resumo já calculado por
   * lib/pesquisas/monitoring.ts (getElectoralSignalsSummaryForCandidate).
   * Vazio quando o candidato não é monitorado ou não há dado (nunca inventado).
   */
  pesquisasEleitorais: z
    .array(
      z.object({
        candidato: z.string(),
        cargo: z.string(),
        percentualAtual: z.number().nullable(),
        percentualAnterior: z.number().nullable(),
        variacaoPp: z.number().nullable(),
        lider: z.string().nullable(),
        gap: z.number().nullable(),
        tendencia: z.string(),
        totalPesquisas: z.number(),
        comparabilidade: z.enum(['sufficient', 'insufficient']),
        confianca: z.enum(['baixa', 'media', 'alta']),
        sinais: z.array(z.object({ tipo: z.string(), descricao: z.string(), intensidade: z.string().nullable() })).max(9),
      })
    )
    .max(5)
    .default([]),
  evidenciasDisponiveis: z.array(EvidenceRefSchema).max(30),
  limitacoesConhecidas: z.array(z.string()).max(10),
});
export type AnalyticsContext = z.infer<typeof AnalyticsContextSchema>;

// ─── Saída do modelo ────────────────────────────────────────────────────────

const evidenceIdArray = z.array(z.string()).max(10);

export const AnalyticsInsightOutputSchema = z.object({
  resumo: z.string().min(1).max(600),
  pontosPrincipais: z.array(z.string().max(240)).min(1).max(5),
  riscosInterpretados: z
    .array(z.object({ texto: z.string().max(300), evidenciaIds: evidenceIdArray }))
    .max(5),
  oportunidadesInterpretadas: z
    .array(z.object({ texto: z.string().max(300), evidenciaIds: evidenceIdArray }))
    .max(5),
  hipoteses: z.array(z.object({ texto: z.string().max(300), evidenciaIds: evidenceIdArray })).max(5),
  naoEpossivelConcluir: z.array(z.string().max(300)).min(1).max(6),
  evidenciasCitadas: evidenceIdArray,
  confianca: z.enum(['baixa', 'media', 'alta']),
});
export type AnalyticsInsightOutput = z.infer<typeof AnalyticsInsightOutputSchema>;

/**
 * Estados possíveis do bloco "Leitura Analítica Assistida" na UI.
 * `dados_insuficientes` é distinto de `erro`: significa que o contexto
 * determinístico não tem volume suficiente para valer a pena gerar uma
 * leitura (ex.: síntese inteira em semDados) — não chamamos o modelo.
 */
export type AssistedInsightStatus =
  | 'nao_gerado'
  | 'gerando'
  | 'disponivel'
  | 'desatualizado'
  | 'erro'
  | 'dados_insuficientes'
  | 'indisponivel';

export interface AssistedInsightResult {
  status: AssistedInsightStatus;
  output: AnalyticsInsightOutput | null;
  contextHash: string;
  generatedAt: string | null;
  model: string | null;
  promptVersion: string;
  methodologyVersion: string;
  error: string | null;
}
