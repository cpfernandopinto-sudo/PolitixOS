/**
 * RELEASE-HOTFIX-TERRITORIOS-1.0 — reconciliação de tipagem deste adapter (achado do
 * RELEASE-GATE-TERRITORIOS-1.0, seção 1/13: o arquivo entregue no INTEL-ELECTORAL-01 foi
 * sobrescrito durante a execução paralela por uma versão funcionalmente equivalente, mas
 * com `derivedIndicators: any[]`, múltiplos `as any` mascarando o contrato `DerivedIndicator`
 * incompleto, e um parâmetro `sectorPoints` nunca utilizado.
 *
 * Este hotfix restaura tipagem forte e o contrato completo de `DerivedIndicator`
 * (methodId/methodVersion/inputs/formulaDescription/limitations) SEM alterar nenhum valor
 * CAGED, nenhuma query, nenhum id de evidência e sem recalcular metodologia — MoM/YoY/
 * Rolling-12m continuam sendo a mesma diferença simples / soma de 12 já homologada em
 * `caged/history.ts`. `sectorPoints` (nunca lido em nenhuma versão anterior) foi removido —
 * não é criação de feature setorial, é remoção de um parâmetro morto.
 *
 * Achado corrigido junto (contrato, não valor): o `AnalyticalSignal` de TREND referenciava,
 * em `derivedIndicatorRefs`, um id que nunca existia em `derivedIndicators` (formato
 * diferente do id realmente usado no laço de MoM). Corrigido para apontar ao
 * DerivedIndicator de MoM real quando ele existe para o período — sem isso, o guard de
 * rastreabilidade do L4 nunca conseguiria resolver essa referência.
 */

import type { CagedOfficialSector } from '@/lib/territorios/caged/types';
import type { CagedSeriesQueryPoint } from '@/lib/territorios/caged/series-query';
import type { AnalyticalSignal, DerivedIndicator, DomainAvailability, Evidence } from '../contracts';
import type { EconomicIntelligenceResult } from './types';
import type { ThresholdFamily } from './thresholds';
import { derivedIndicatorId } from './derived-indicators';

export type CagedSectorKey = CagedOfficialSector;

export interface CagedAdapterPoint {
  referenceMonth: string;
  admissions: number;
  dismissals: number;
  balance: number;
  metadata?: Record<string, unknown>;
}

const SECTOR_LABELS: Record<CagedSectorKey, string> = {
  agropecuaria: 'Agropecuária',
  industria_geral: 'Indústria geral',
  construcao: 'Construção',
  comercio: 'Comércio',
  servicos: 'Serviços',
  nao_classificado: 'Não classificado',
};

const ADAPTER_VERSION = 'intel-electoral-01-caged-adapter-v1';
const CAGED_MOM_METHOD_ID = 'CAGED_EMPLOYMENT_MOM_V1';
const CAGED_YOY_METHOD_ID = 'CAGED_EMPLOYMENT_YOY_V1';
const CAGED_ROLLING12_METHOD_ID = 'CAGED_EMPLOYMENT_ROLLING12_V1';
const SALDO_INDICATOR = 'saldo_emprego_formal';

function periodLabel(month: string): string {
  if (month.length === 6) return `${month.slice(0, 4)}/${month.slice(4)}`;
  return month;
}

function evidenceHashOf(metadata: Record<string, unknown> | undefined, fallback: string): string {
  return typeof metadata?.aggregate_hash === 'string' ? metadata.aggregate_hash : fallback;
}

function buildCagedSignal(point: CagedAdapterPoint, previousPoint: CagedAdapterPoint | null, territoryId: string, momIndicatorId: string | null, sector?: CagedSectorKey): AnalyticalSignal {
  const scopeLabel = sector ? SECTOR_LABELS[sector] : 'geral';
  const sectorTag = sector ? `:${sector}` : '';
  const hasPrev = previousPoint !== null;

  return {
    id: `signal:economia:caged:${point.referenceMonth}${sectorTag}`,
    territoryId,
    domains: ['economia'],
    type: 'TREND',
    severity: null,
    priority: null,
    status: 'ACTIVE',
    methodId: 'caged-adapter-v1',
    methodVersion: 'v1',
    title: `Saldo de empregos CAGED (${scopeLabel}) em ${periodLabel(point.referenceMonth)}`,
    summary: `O saldo mensal de empregos formais (${scopeLabel}) no período ${periodLabel(point.referenceMonth)} foi de ${point.balance > 0 ? '+' : ''}${point.balance} (admissões: ${point.admissions}, desligamentos: ${point.dismissals}).${hasPrev ? ` No mês anterior (${periodLabel(previousPoint.referenceMonth)}), o saldo fora de ${previousPoint.balance > 0 ? '+' : ''}${previousPoint.balance}.` : ''}`,
    evidenceRefs: [`db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${point.referenceMonth}${sectorTag}`],
    // Só referencia um DerivedIndicator que realmente existe em `derivedIndicators` — nunca um id fabricado (ver cabeçalho do arquivo).
    derivedIndicatorRefs: momIndicatorId ? [momIndicatorId] : [],
    period: point.referenceMonth,
    confidence: 'DIRECTLY_SUPPORTED',
    limitations: [
      {
        code: 'CAGED_L3_THRESHOLD_NOT_CALIBRATED',
        description: 'Sinais TREND do CAGED usam apenas direção, sem calibração de magnitude/severidade.',
        domain: 'economia',
      },
    ],
  };
}

export function buildCagedEconomicIntelligenceResult(territoryId: string, points: CagedAdapterPoint[]): EconomicIntelligenceResult {
  const sorted = [...points].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
  const hasData = sorted.length > 0;
  const latest = sorted.at(-1) ?? null;
  const previous = sorted.length >= 2 ? sorted.at(-2)! : null;

  const signals: AnalyticalSignal[] = [];
  const evidenceIndex: Record<string, Evidence> = {};
  const derivedIndicators: DerivedIndicator[] = [];
  const momIndicatorIdByPeriod = new Map<string, string>();

  for (const pt of sorted) {
    const evId = `db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${pt.referenceMonth}`;
    evidenceIndex[evId] = {
      id: evId,
      territoryId,
      domain: 'economia',
      indicator: 'saldo_emprego_formal',
      value: pt.balance,
      unit: 'vagas',
      period: pt.referenceMonth,
      source: 'MTE',
      dataset: 'NOVO_CAGED',
      evidenceHash: evidenceHashOf(pt.metadata, `hash-${pt.referenceMonth}`),
      metadata: pt.metadata ?? {},
    };

    const admId = `db:${territoryId}:admissoes_emprego_formal:NOVO_CAGED:${pt.referenceMonth}`;
    evidenceIndex[admId] = {
      id: admId,
      territoryId,
      domain: 'economia',
      indicator: 'admissoes_emprego_formal',
      value: pt.admissions,
      unit: 'vagas',
      period: pt.referenceMonth,
      source: 'MTE',
      dataset: 'NOVO_CAGED',
      evidenceHash: evidenceHashOf(pt.metadata, `hash-adm-${pt.referenceMonth}`),
      metadata: pt.metadata ?? {},
    };

    const disId = `db:${territoryId}:desligamentos_emprego_formal:NOVO_CAGED:${pt.referenceMonth}`;
    evidenceIndex[disId] = {
      id: disId,
      territoryId,
      domain: 'economia',
      indicator: 'desligamentos_emprego_formal',
      value: pt.dismissals,
      unit: 'vagas',
      period: pt.referenceMonth,
      source: 'MTE',
      dataset: 'NOVO_CAGED',
      evidenceHash: evidenceHashOf(pt.metadata, `hash-dis-${pt.referenceMonth}`),
      metadata: pt.metadata ?? {},
    };
  }

  // MoM — mesma fórmula de momBalanceDelta em caged/history.ts: diferença simples, nunca percentual.
  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const id = derivedIndicatorId(`${SALDO_INDICATOR}_mom`, CAGED_MOM_METHOD_ID, curr.referenceMonth, territoryId);
    momIndicatorIdByPeriod.set(curr.referenceMonth, id);
    derivedIndicators.push({
      id,
      territoryId,
      domain: 'economia',
      indicator: `${SALDO_INDICATOR}_mom`,
      methodId: CAGED_MOM_METHOD_ID,
      methodVersion: ADAPTER_VERSION,
      inputs: [
        { evidenceRef: `db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${prev.referenceMonth}`, role: 'previous_month' },
        { evidenceRef: `db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${curr.referenceMonth}`, role: 'current_month' },
      ],
      result: curr.balance - prev.balance,
      unit: 'vagas',
      period: curr.referenceMonth,
      formulaDescription: 'saldo(mês) - saldo(mês anterior) — diferença aritmética simples, nunca percentual sobre saldo (que pode ser negativo/zero). Mesma fórmula de momBalanceDelta em caged/history.ts.',
      limitations: [],
    });
  }

  // YoY — mesma fórmula de yoyBalanceDelta em caged/history.ts.
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const currY = Number(curr.referenceMonth.slice(0, 4));
    const currM = curr.referenceMonth.slice(4);
    const prevMatch = sorted.find((p) => p.referenceMonth === `${currY - 1}${currM}`);
    if (prevMatch) {
      derivedIndicators.push({
        id: derivedIndicatorId(`${SALDO_INDICATOR}_yoy`, CAGED_YOY_METHOD_ID, curr.referenceMonth, territoryId),
        territoryId,
        domain: 'economia',
        indicator: `${SALDO_INDICATOR}_yoy`,
        methodId: CAGED_YOY_METHOD_ID,
        methodVersion: ADAPTER_VERSION,
        inputs: [
          { evidenceRef: `db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${prevMatch.referenceMonth}`, role: 'same_month_prior_year' },
          { evidenceRef: `db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${curr.referenceMonth}`, role: 'current_month' },
        ],
        result: curr.balance - prevMatch.balance,
        unit: 'vagas',
        period: curr.referenceMonth,
        formulaDescription: 'saldo(mês) - saldo(mesmo mês, ano anterior) — mesma fórmula de yoyBalanceDelta em caged/history.ts.',
        limitations: [],
      });
    }
  }

  // Rolling 12m — soma de fluxo (nunca estoque), só quando os 12 meses anteriores estão completos. Mesma fórmula de rolling12Balance em caged/history.ts.
  for (let i = 11; i < sorted.length; i++) {
    const window = sorted.slice(i - 11, i + 1);
    const sum = window.reduce((acc, p) => acc + p.balance, 0);
    derivedIndicators.push({
      id: derivedIndicatorId(`${SALDO_INDICATOR}_rolling12`, CAGED_ROLLING12_METHOD_ID, sorted[i].referenceMonth, territoryId),
      territoryId,
      domain: 'economia',
      indicator: `${SALDO_INDICATOR}_rolling12`,
      methodId: CAGED_ROLLING12_METHOD_ID,
      methodVersion: ADAPTER_VERSION,
      inputs: window.map((p) => ({ evidenceRef: `db:${territoryId}:saldo_emprego_formal:NOVO_CAGED:${p.referenceMonth}`, role: 'rolling_window_month' })),
      result: sum,
      unit: 'vagas',
      period: sorted[i].referenceMonth,
      formulaDescription: 'Soma do saldo mensal dos 12 meses terminados na competência — soma de fluxo, nunca estoque de empregos. Mesma fórmula de rolling12Balance em caged/history.ts. Só calculado quando os 12 meses estão completos.',
      limitations: [],
    });
  }

  if (latest) {
    signals.push(buildCagedSignal(latest, previous, territoryId, momIndicatorIdByPeriod.get(latest.referenceMonth) ?? null));
  }

  const coverageByFamily: Record<ThresholdFamily, DomainAvailability> = {
    FISCAL: 'unavailable',
    PIB_VAB_MONETARY: 'unavailable',
    OFFICIAL_SHARE: 'unavailable',
    GENERAL: hasData ? 'available' : 'unavailable',
  };

  const temporalCoverageByFamily: Record<'FISCAL' | 'PIB_VAB_MONETARY' | 'OFFICIAL_SHARE', { periodStart: string; periodEnd: string } | null> = {
    FISCAL: null,
    PIB_VAB_MONETARY: null,
    OFFICIAL_SHARE: null,
  };

  return {
    territoryId,
    engineVersion: ADAPTER_VERSION,
    derivedIndicators,
    signals,
    consolidatedSignals: [],
    coverage: {
      byDomain: { economia: hasData ? 'available' : 'unavailable' },
      domainsAvailable: hasData ? 1 : 0,
      domainsExpected: 1,
      missingData: [],
    },
    coverageByFamily,
    temporalCoverage: {
      periodStart: sorted[0]?.referenceMonth ?? 'N/A',
      periodEnd: sorted.at(-1)?.referenceMonth ?? 'N/A',
      referencePeriodLabel: sorted.length ? `${sorted[0].referenceMonth}–${sorted.at(-1)!.referenceMonth}` : 'sem dados',
      sourceReferencePeriods: { economia: sorted.at(-1)?.referenceMonth ?? null },
    },
    temporalCoverageByFamily,
    limitations: [
      {
        code: 'CAGED_L3_THRESHOLD_NOT_CALIBRATED',
        description: 'Sinais TREND do CAGED usam apenas direção, sem calibração de magnitude/severidade.',
        domain: 'economia',
      },
    ],
    methodology: {
      methodId: ADAPTER_VERSION,
      methodVersion: 'v1',
      description: 'Adapter de compatibilidade do CAGED para Inteligência Política Territorial.',
    },
    evidenceIndex,
  };
}

export function buildCagedBlock(points: CagedSeriesQueryPoint[], territoryId: string) {
  return buildCagedEconomicIntelligenceResult(territoryId, points as CagedAdapterPoint[]);
}
