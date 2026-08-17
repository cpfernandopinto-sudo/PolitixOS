/**
 * INTEL-ELECTORAL-01 (Missão B) — contrato de prompt eleitoral, versionado e SEPARADO
 * do registry econômico (`../interpretation/prompt-registry.ts`). Decisão explícita do
 * gate: "NÃO transformar Prompt V3 econômico num prompt gigante universal... Prompt
 * registry por domínio."
 *
 * NÃO chama nenhum provider. NÃO é usado por nenhum caminho de execução neste gate —
 * é o contrato que uma futura camada "OPTIONAL LLM ENRICHMENT" (ver arquitetura no
 * relatório) consumiria, entrando SOBRE o `ElectoralBriefing` já determinístico, nunca
 * o substituindo.
 *
 * Entrada: `ElectoralBriefing` inteiro (já contém facts/signals/interpretations
 * classificados DIRECTLY_SUPPORTED/MULTI_SIGNAL_SUPPORTED/LIMITED_CONTEXT, guardrails
 * `allowed`/`prohibited` do próprio contexto, e `confidence.consolidated`). O LLM nunca
 * recebe dado eleitoral fora deste objeto — não há "fetch" nem "conhecimento externo"
 * (mesma política CLOSED_EVIDENCE do INTEL-03A para Economia).
 *
 * Saída esperada: enriquecimento NARRATIVO apenas — nenhum novo fato, nenhuma nova
 * classificação de confiança, nenhuma criação de voto/candidato/eleição/tendência.
 * `electoral-llm-guards.ts` valida isso estruturalmente (rastreabilidade +
 * nunca-upgrade-de-confiança), não apenas por instrução de texto.
 */

import type { ElectoralBriefing } from '../../electoral-briefing';

export const ELECTORAL_INTERPRETATION_PROMPT_V1_ID = 'INTEL_ELECTORAL_INTERPRETATION_PROMPT_V1';
export const ELECTORAL_INTERPRETATION_PROMPT_V1_VERSION = 'v1';

export const ELECTORAL_INTERPRETATION_SYSTEM_PROMPT_V1 = `Você enriquece narrativamente um briefing eleitoral já produzido deterministicamente pelo Politix Territórios. Você NÃO tem acesso a nenhuma fonte externa, pesquisa de opinião, notícia ou conhecimento próprio sobre eleições brasileiras — sua única fonte de verdade é o JSON fornecido.

REGRAS ABSOLUTAS (violação = rejeição estrutural, não apenas estilística):
1. NUNCA invente um voto, resultado, candidato, partido, eleição, comparecimento, abstenção ou margem que não esteja literalmente presente no JSON.
2. NUNCA invente uma tendência ("está subindo", "vai vencer") — só descreva o que já está calculado em "signals"/"interpretations".
3. Toda afirmação factual precisa referenciar (por id) um item real de "interpretations", "elections" ou "benchmark" do JSON — uma afirmação sem referência resolvível é inválida.
4. NUNCA eleve a confiança de uma interpretação: se ela é "LIMITED_CONTEXT" no JSON, seu texto sobre ela também precisa soar como contexto limitado — nunca apresentá-la como fato direto ou "MULTI_SIGNAL_SUPPORTED"/"DIRECTLY_SUPPORTED" quando o JSON diz "LIMITED_CONTEXT".
5. Nunca prever resultado eleitoral futuro como fato. Nunca inferir intenção do eleitor, opinião individual ou ideologia não fornecida. Nunca transformar correlação em causalidade.
6. Respeite "limitations" do JSON — se ele diz que o benchmark é limitado à amostra homologada de seis municípios, nunca apresente esse benchmark como RMBH, Minas Gerais ou Brasil.
7. Você produz apenas NARRATIVA sobre o que já existe — nunca uma nova classificação, nunca um novo dado, nunca uma recomendação (o guardrail do próprio briefing já declara "recommendations: []").`;

export interface ElectoralInterpretationClaim {
  id: string;
  text: string;
  /** Ids de `ElectoralBriefing.interpretations[].id` (ou `fact:{ano}` / `interpretationRef` de benchmark) que sustentam este texto — nunca vazio para um claim substantivo. */
  basedOnInterpretationIds: string[];
}

export interface ElectoralInterpretationDraft {
  claims: ElectoralInterpretationClaim[];
}

export interface SerializedElectoralContext {
  canonicalJson: string;
  interpretationCount: number;
  factCount: number;
  benchmarkCount: number;
  consolidatedConfidence: ElectoralBriefing['confidence']['consolidated'];
}

/** Serialização determinística — reusa o próprio objeto já montado por `buildElectoralBriefing`, nunca reconstrói o dado. */
export function serializeElectoralContext(briefing: ElectoralBriefing): SerializedElectoralContext {
  return {
    canonicalJson: JSON.stringify(briefing),
    interpretationCount: briefing.interpretations.length,
    factCount: briefing.historicalEvolution.length,
    benchmarkCount: briefing.benchmark.length,
    consolidatedConfidence: briefing.confidence.consolidated,
  };
}

export function buildElectoralUserMessage(briefing: ElectoralBriefing): { message: string; serialized: SerializedElectoralContext } {
  const serialized = serializeElectoralContext(briefing);
  const message = `Briefing eleitoral determinístico (município: ${briefing.territory.municipio}/${briefing.territory.uf}, eleições cobertas: ${briefing.territory.electionsCovered.join(', ')}, confiança consolidada: ${briefing.confidence.consolidated}):\n\n${serialized.canonicalJson}\n\nProduza no máximo ${Math.max(1, briefing.interpretations.length)} claims narrativos, cada um referenciando explicitamente os ids de "interpretations"/"elections"/"benchmark" que o sustentam.`;
  return { message, serialized };
}

export function buildElectoralOutputSchema(): Record<string, unknown> {
  return {
    type: 'object', additionalProperties: false, required: ['claims'],
    properties: {
      claims: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'text', 'basedOnInterpretationIds'],
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            basedOnInterpretationIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
          },
        },
      },
    },
  };
}

export function buildElectoralSchemaRetryMessage(): string {
  return 'A saída não seguiu o schema exigido (claims[].id/text/basedOnInterpretationIds). Responda novamente apenas com o JSON válido, sem texto fora do JSON.';
}

export function buildElectoralSemanticRetryMessage(errorCodes: string[]): string {
  return `Os seguintes claims foram rejeitados por violarem as regras absolutas (${errorCodes.join(', ')}). Gere novos claims que referenciem apenas ids reais do briefing e nunca elevem a confiança de um item LIMITED_CONTEXT.`;
}
