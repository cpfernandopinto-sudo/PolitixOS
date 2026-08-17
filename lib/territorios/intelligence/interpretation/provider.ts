/**
 * INTEL-03A — Provider de interpretação (seções 47-50 do gate).
 *
 * `InterpretationProvider` é a interface técnica que um futuro INTEL-03B (LLM real),
 * um provider baseado em regra, um humano ou um híbrido implementam igualmente —
 * nunca específica de um fornecedor de modelo (seção 48). Este arquivo NÃO chama
 * nenhum LLM e não cria nenhuma prompt final.
 *
 * `RuleBasedMockProvider` é o único provider implementado neste gate: gera drafts por
 * template determinístico, agrupados por família (nunca cross-family — seção 69),
 * nunca simula "IA" fingindo incerteza ou linguagem de modelo (seção 49) — é
 * literalmente preenchimento de template a partir de campos estruturados do contexto,
 * com `origin: 'rule'`.
 */

import type { ConsolidatedSignal } from '../economy/consolidation';
import type { ThresholdFamily } from '../economy/thresholds';
import { unitIndicators } from './guards';
import type {
  ClaimType,
  InterpretationClaim,
  InterpretationDraft,
  InterpretationGenerationResult,
  InterpretationInputContext,
  InterpretationProvider,
  InterpretationUnit,
} from './types';

const FAMILY_LABEL: Record<ThresholdFamily, string> = {
  FISCAL: 'finanças públicas municipais (SICONFI)',
  PIB_VAB_MONETARY: 'atividade econômica (PIB/VAB, IBGE)',
  OFFICIAL_SHARE: 'participação setorial oficial (IBGE)',
  GENERAL: 'indicadores gerais',
};

function claimTypeForUnit(unit: InterpretationUnit): ClaimType {
  if (unit.kind === 'CONSOLIDATED_SIGNAL') return 'OBSERVED_PATTERN';
  switch ((unit.signal as { type: string }).type) {
    case 'TREND': return 'TEMPORAL_READING';
    case 'PRESSURE': return 'COMPARATIVE_READING';
    case 'CONCENTRATION': return 'STRUCTURAL_READING';
    case 'DIVERGENCE': return 'MIXED_SIGNAL_READING';
    default: return 'OBSERVED_PATTERN'; // ANOMALY, ATTENTION, CHANGE órfão.
  }
}

function claimTextForUnit(unit: InterpretationUnit): string {
  const indicators = unitIndicators(unit).join(' e ');
  if (unit.kind === 'CONSOLIDATED_SIGNAL') {
    const signal = unit.signal as ConsolidatedSignal;
    const direction = signal.direction === 'up' ? 'de alta' : 'de queda';
    return `Entre ${signal.startPeriod} e ${signal.endPeriod}, o indicador ${signal.indicator} registrou ${signal.eventCount} evento(s) de mudança consecutiva na direção ${direction}, segundo o método determinístico do motor econômico.`;
  }
  const type = (unit.signal as { type: string }).type;
  const severityLabel = (unit.signal as { severity: string | null }).severity ?? 'não classificada';
  switch (type) {
    case 'TREND':
      return `No período ${unit.period}, o indicador ${indicators} apresentou padrão de trajetória persistente identificado pelo método determinístico do motor, severidade ${severityLabel}.`;
    case 'PRESSURE':
      return `No período ${unit.period}, a variação da despesa corrente superou persistentemente a da receita corrente segundo o método determinístico do motor (sinal do tipo PRESSURE).`;
    case 'CONCENTRATION':
      return `No período ${unit.period}, foi identificada concentração estrutural relevante no indicador ${indicators}, segundo o método determinístico do motor (sinal do tipo CONCENTRATION).`;
    case 'DIVERGENCE':
      return `No período ${unit.period}, dois indicadores da família ${FAMILY_LABEL[unit.family]} apresentaram movimentos em sentidos opostos no mesmo intervalo, segundo o método determinístico do motor.`;
    case 'ANOMALY':
      return `No período ${unit.period}, o indicador ${indicators} apresentou variação fora da faixa esperada pela própria série histórica, segundo o método estatístico (IQR) do motor.`;
    case 'ATTENTION':
      return `No período ${unit.period}, o indicador ${indicators} apresentou valor fora da janela histórica recente da própria série, segundo o método determinístico do motor.`;
    default:
      return `No período ${unit.period}, o indicador ${indicators} apresentou sinal do tipo ${type} identificado pelo método determinístico do motor.`;
  }
}

function claimForUnit(unit: InterpretationUnit): InterpretationClaim {
  return {
    id: `claim:${unit.id}`,
    text: claimTextForUnit(unit),
    signalRefs: [unit.id],
    evidenceRefs: [...unit.evidenceRefs],
    claimType: claimTypeForUnit(unit),
    supportStatus: 'SUPPORTED', // recomputado por validateInterpretationDraft — nunca aceito por confiança aqui (seção 15).
  };
}

/**
 * Caveats determinísticos por família (defasagem, nominalidade, calibração-piloto) —
 * exportado para reuso pelo `AnthropicInterpretationProvider` (INTEL-03B), que os
 * mescla aos caveats gerados pelo LLM em vez de depender só do modelo para não
 * esquecê-los (seção 25 do gate: caveats nunca genéricos/vazios).
 */
export function caveatsForFamily(context: InterpretationInputContext, family: ThresholdFamily, units: InterpretationUnit[]): string[] {
  const caveats: string[] = [];
  const range = family === 'GENERAL' ? context.temporalCoverage : context.temporalCoverageByFamily[family as 'FISCAL' | 'PIB_VAB_MONETARY' | 'OFFICIAL_SHARE'];
  if (range) caveats.push(`dado oficial mais recente disponível cobre até ${range.periodEnd}; sujeito a defasagem de publicação da fonte original.`);
  if (units.some((unit) => unit.kind === 'RAW_SIGNAL' || unit.family !== 'OFFICIAL_SHARE')) caveats.push('valores nominais, sem deflator, quando aplicável aos indicadores monetários desta família.');
  const calibration = context.calibrationStatusByFamily[family];
  if (calibration === 'THRESHOLD_PILOT_CALIBRATED') caveats.push('thresholds desta família são pilot-calibrados (3 municípios de Minas Gerais) — não constituem calibração nacional.');
  caveats.push('leitura não estabelece causalidade nem atribuição de gestão; descreve exclusivamente o que os sinais e evidências disponíveis sustentam.');
  return caveats;
}

/**
 * Agrupa unidades selecionadas por família (nunca cross-family — seção 69 do gate) e
 * produz um `InterpretationDraft` por família presente, com um claim por unidade.
 */
export class RuleBasedMockProvider implements InterpretationProvider {
  readonly id = 'rule-based-mock-v1';

  async generateInterpretations(context: InterpretationInputContext): Promise<InterpretationGenerationResult> {
    return { drafts: this.generateInterpretationsSync(context), executionMetadata: [] };
  }

  private generateInterpretationsSync(context: InterpretationInputContext): InterpretationDraft[] {
    const byFamily = new Map<ThresholdFamily, InterpretationUnit[]>();
    for (const unit of context.units) {
      const bucket = byFamily.get(unit.family) ?? [];
      bucket.push(unit);
      byFamily.set(unit.family, bucket);
    }

    const drafts: InterpretationDraft[] = [];
    for (const family of [...byFamily.keys()].sort()) {
      const units = [...byFamily.get(family)!].sort((a, b) => a.id.localeCompare(b.id));
      const claims = units.map(claimForUnit);
      const periods = units.map((unit) => unit.period).sort();
      const draftId = `interpretation-draft:${context.territoryId}:${family}`;
      drafts.push({
        id: draftId,
        territoryId: context.territoryId,
        domains: ['economia'],
        statement: `Para a família ${FAMILY_LABEL[family]}, o motor econômico identificou ${claims.length} sinal(is) analítico(s) determinístico(s) no período coberto pelo contexto, detalhados nas afirmações desta interpretação.`,
        claims,
        caveats: caveatsForFamily(context, family, units),
        temporalScope: { periodStart: periods[0], periodEnd: periods.at(-1)!, label: `${family} — ${periods[0]} a ${periods.at(-1)}` },
        origin: 'rule',
        methodVersion: 'INTEL_INTERPRETATION_MOCK_PROVIDER_V1',
      });
    }
    return drafts;
  }
}
