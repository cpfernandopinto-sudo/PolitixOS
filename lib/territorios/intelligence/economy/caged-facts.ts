/**
 * INTEL-DOMAIN-02 (Missão A) — Facts determinísticos do CAGED (L2/L1 -> ponte legível).
 *
 * Todo fact é calculado por aritmética direta sobre a série já persistida (mesma fonte
 * que `caged-adapter.ts`) — nunca uma nova metodologia, nunca uma chamada de LLM. Quando
 * o dado disponível não sustenta matematicamente um fact (ex.: MoM sem mês anterior),
 * o fact é retornado com `supported: false` e `value: null` — nunca omitido em silêncio
 * (a ausência também é informação, seção 14 do INTEL-01) e nunca preenchido com um valor
 * fabricado.
 */

import type { Fact } from '../contracts';
import type { CagedAdapterPoint, CagedSectorKey } from './caged-adapter';

const SALDO_INDICATOR = 'saldo_emprego_formal';

function evidenceRef(territoryId: string, indicator: string, period: string): string {
  return `db:${territoryId}:${indicator}:NOVO_CAGED:${period}`;
}

function fact(partial: Omit<Fact, 'domain' | 'limitations'> & { limitations?: Fact['limitations'] }): Fact {
  return { domain: 'economia', limitations: [], ...partial };
}

export interface CagedSectorSeries {
  sector: CagedSectorKey;
  label: string;
  points: CagedAdapterPoint[];
}

export interface BuildCagedFactsOptions {
  sectorSeries?: CagedSectorSeries[];
}

/**
 * Constrói os facts do domínio Economia/CAGED a partir da série mensal total já
 * ordenável (não precisa vir pré-ordenada) e, opcionalmente, das séries setoriais (para
 * os facts de setor líder/setor que mais deteriorou/setores positivos/negativos).
 */
export function buildCagedFacts(territoryId: string, points: CagedAdapterPoint[], options: BuildCagedFactsOptions = {}): Fact[] {
  const sorted = [...points].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
  const facts: Fact[] = [];
  if (sorted.length === 0) return facts;

  const latest = sorted.at(-1)!;
  const previous = sorted.length >= 2 ? sorted.at(-2)! : null;
  const yearAgoIndex = sorted.length >= 13 ? sorted.length - 13 : -1;
  const yearAgo = yearAgoIndex >= 0 ? sorted[yearAgoIndex] : null;

  const saldoRef = (period: string) => evidenceRef(territoryId, SALDO_INDICATOR, period);

  // --- saldo atual / admissões / desligamentos ---
  facts.push(fact({ id: `fact:${territoryId}:current_balance:${latest.referenceMonth}`, territoryId, key: 'current_balance', label: 'Saldo de emprego formal (mês mais recente)', value: latest.balance, unit: 'vínculos', period: latest.referenceMonth, evidenceRefs: [saldoRef(latest.referenceMonth)], derivedIndicatorRefs: [], supported: true }));
  facts.push(fact({ id: `fact:${territoryId}:current_admissions:${latest.referenceMonth}`, territoryId, key: 'current_admissions', label: 'Admissões (mês mais recente)', value: latest.admissions, unit: 'vínculos', period: latest.referenceMonth, evidenceRefs: [evidenceRef(territoryId, 'admissoes_emprego_formal', latest.referenceMonth)], derivedIndicatorRefs: [], supported: true }));
  facts.push(fact({ id: `fact:${territoryId}:current_dismissals:${latest.referenceMonth}`, territoryId, key: 'current_dismissals', label: 'Desligamentos (mês mais recente)', value: latest.dismissals, unit: 'vínculos', period: latest.referenceMonth, evidenceRefs: [evidenceRef(territoryId, 'desligamentos_emprego_formal', latest.referenceMonth)], derivedIndicatorRefs: [], supported: true }));

  // --- MoM ---
  facts.push(fact({
    id: `fact:${territoryId}:mom_change:${latest.referenceMonth}`, territoryId, key: 'mom_change', label: 'Variação do saldo frente ao mês anterior (MoM)',
    value: previous ? latest.balance - previous.balance : null, unit: 'vínculos', period: latest.referenceMonth,
    evidenceRefs: previous ? [saldoRef(previous.referenceMonth), saldoRef(latest.referenceMonth)] : [],
    derivedIndicatorRefs: [], supported: previous !== null,
    limitations: previous ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'Não há mês anterior na série para calcular MoM.', domain: 'economia' }],
  }));

  // --- YoY ---
  facts.push(fact({
    id: `fact:${territoryId}:yoy_change:${latest.referenceMonth}`, territoryId, key: 'yoy_change', label: 'Variação do saldo frente ao mesmo mês do ano anterior (YoY)',
    value: yearAgo ? latest.balance - yearAgo.balance : null, unit: 'vínculos', period: latest.referenceMonth,
    evidenceRefs: yearAgo ? [saldoRef(yearAgo.referenceMonth), saldoRef(latest.referenceMonth)] : [],
    derivedIndicatorRefs: [], supported: yearAgo !== null,
    limitations: yearAgo ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'A série não cobre 12 meses antes da competência mais recente.', domain: 'economia' }],
  }));

  // --- Rolling 12m ---
  const hasFullWindow = sorted.length >= 12;
  const window12 = hasFullWindow ? sorted.slice(-12) : [];
  facts.push(fact({
    id: `fact:${territoryId}:rolling12:${latest.referenceMonth}`, territoryId, key: 'rolling12', label: 'Saldo acumulado nos últimos 12 meses (R12)',
    value: hasFullWindow ? window12.reduce((sum, p) => sum + p.balance, 0) : null, unit: 'vínculos', period: latest.referenceMonth,
    evidenceRefs: window12.map((p) => saldoRef(p.referenceMonth)),
    derivedIndicatorRefs: [], supported: hasFullWindow,
    limitations: hasFullWindow ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'A série tem menos de 12 meses — rolling 12m não pode ser uma janela completa.', domain: 'economia' }],
  }));

  // --- melhor mês / pior mês ---
  const best = sorted.reduce((max, p) => (p.balance > max.balance ? p : max), sorted[0]);
  const worst = sorted.reduce((min, p) => (p.balance < min.balance ? p : min), sorted[0]);
  facts.push(fact({ id: `fact:${territoryId}:best_month:${latest.referenceMonth}`, territoryId, key: 'best_month', label: 'Melhor mês da série (maior saldo)', value: best.balance, unit: 'vínculos', period: best.referenceMonth, evidenceRefs: [saldoRef(best.referenceMonth)], derivedIndicatorRefs: [], supported: true }));
  facts.push(fact({ id: `fact:${territoryId}:worst_month:${latest.referenceMonth}`, territoryId, key: 'worst_month', label: 'Pior mês da série (menor saldo)', value: worst.balance, unit: 'vínculos', period: worst.referenceMonth, evidenceRefs: [saldoRef(worst.referenceMonth)], derivedIndicatorRefs: [], supported: true }));

  // --- tendência (direção dos últimos 3 MoM) ---
  const momSeries: number[] = [];
  for (let i = 1; i < sorted.length; i++) momSeries.push(sorted[i].balance - sorted[i - 1].balance);
  const last3Mom = momSeries.slice(-3);
  const trendSupported = last3Mom.length === 3;
  let trendValue: 'subindo' | 'caindo' | 'misto' | null = null;
  if (trendSupported) {
    const allPositive = last3Mom.every((d) => d > 0);
    const allNegative = last3Mom.every((d) => d < 0);
    trendValue = allPositive ? 'subindo' : allNegative ? 'caindo' : 'misto';
  }
  facts.push(fact({
    id: `fact:${territoryId}:trend:${latest.referenceMonth}`, territoryId, key: 'trend_direction', label: 'Tendência de direção do saldo (últimos 3 MoM)',
    value: trendValue, unit: null, period: latest.referenceMonth,
    evidenceRefs: sorted.slice(-4).map((p) => saldoRef(p.referenceMonth)), derivedIndicatorRefs: [], supported: trendSupported,
    limitations: trendSupported ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'Menos de 3 variações MoM disponíveis para caracterizar tendência.', domain: 'economia' }],
  }));

  // --- aceleração/desaceleração: compara a magnitude do último MoM com a do penúltimo ---
  const accelerationSupported = momSeries.length >= 2;
  let accelerationValue: 'acelerando' | 'desacelerando' | 'estavel' | null = null;
  if (accelerationSupported) {
    const lastMom = momSeries.at(-1)!;
    const prevMom = momSeries.at(-2)!;
    if (lastMom === prevMom) accelerationValue = 'estavel';
    else accelerationValue = Math.abs(lastMom) > Math.abs(prevMom) && Math.sign(lastMom) === Math.sign(prevMom) ? 'acelerando' : 'desacelerando';
  }
  facts.push(fact({
    id: `fact:${territoryId}:acceleration:${latest.referenceMonth}`, territoryId, key: 'acceleration', label: 'Aceleração/desaceleração do saldo (variação da variação mensal)',
    value: accelerationValue, unit: null, period: latest.referenceMonth,
    evidenceRefs: sorted.slice(-3).map((p) => saldoRef(p.referenceMonth)), derivedIndicatorRefs: [], supported: accelerationSupported,
    limitations: accelerationSupported ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'Menos de 2 variações MoM disponíveis.', domain: 'economia' }],
  }));

  // --- mudança recente de direção (reversão de sinal do saldo) ---
  // `Fact.value` é `number | string | null` (contrato cross-domain) — representado como
  // 'sim'/'nao' em vez de boolean para permanecer dentro do tipo, sem alargar o contrato.
  const reversalSupported = previous !== null;
  const reversalIsTrue = reversalSupported && Math.sign(latest.balance) !== 0 && Math.sign(previous!.balance) !== 0 && Math.sign(latest.balance) !== Math.sign(previous!.balance);
  const reversalValue: 'sim' | 'nao' | null = reversalSupported ? (reversalIsTrue ? 'sim' : 'nao') : null;
  facts.push(fact({
    id: `fact:${territoryId}:direction_reversal:${latest.referenceMonth}`, territoryId, key: 'direction_reversal', label: 'Mudança recente de direção do saldo (sinal invertido frente ao mês anterior)',
    value: reversalValue, unit: null, period: latest.referenceMonth,
    evidenceRefs: previous ? [saldoRef(previous.referenceMonth), saldoRef(latest.referenceMonth)] : [], derivedIndicatorRefs: [], supported: reversalSupported,
    limitations: reversalSupported ? [] : [{ code: 'INSUFFICIENT_PERIODS', description: 'Não há mês anterior para comparar sinal.', domain: 'economia' }],
  }));

  // --- setores (opcional) ---
  if (options.sectorSeries && options.sectorSeries.length > 0) {
    facts.push(...buildSectorFacts(territoryId, latest.referenceMonth, options.sectorSeries));
  }

  return facts;
}

function buildSectorFacts(territoryId: string, period: string, sectorSeries: CagedSectorSeries[]): Fact[] {
  const facts: Fact[] = [];
  const latestBySector = sectorSeries
    .map((series) => {
      const sorted = [...series.points].sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth));
      const latest = sorted.at(-1);
      return latest ? { sector: series.sector, label: series.label, point: latest } : null;
    })
    .filter((item): item is { sector: CagedSectorKey; label: string; point: CagedAdapterPoint } => item !== null);

  if (latestBySector.length === 0) {
    facts.push({
      domain: 'economia', id: `fact:${territoryId}:sector_leader:${period}`, territoryId, key: 'sector_leader', label: 'Setor com maior saldo no mês', value: null, unit: null, period,
      evidenceRefs: [], derivedIndicatorRefs: [], supported: false, limitations: [{ code: 'INSUFFICIENT_EVIDENCE', description: 'Nenhuma série setorial disponível.', domain: 'economia' }],
    });
    return facts;
  }

  const leader = latestBySector.reduce((max, item) => (item.point.balance > max.point.balance ? item : max), latestBySector[0]);
  const worst = latestBySector.reduce((min, item) => (item.point.balance < min.point.balance ? item : min), latestBySector[0]);
  const positive = latestBySector.filter((item) => item.point.balance > 0);
  const negative = latestBySector.filter((item) => item.point.balance < 0);

  facts.push({ domain: 'economia', id: `fact:${territoryId}:sector_leader:${period}`, territoryId, key: 'sector_leader', label: `Setor com maior saldo no mês (${leader.label})`, value: leader.point.balance, unit: 'vínculos', period, evidenceRefs: [evidenceRef(territoryId, `${SALDO_INDICATOR}_${leader.sector}`, period)], derivedIndicatorRefs: [], supported: true, limitations: [] });
  facts.push({ domain: 'economia', id: `fact:${territoryId}:sector_worst:${period}`, territoryId, key: 'sector_worst', label: `Setor que mais deteriorou no mês (${worst.label})`, value: worst.point.balance, unit: 'vínculos', period, evidenceRefs: [evidenceRef(territoryId, `${SALDO_INDICATOR}_${worst.sector}`, period)], derivedIndicatorRefs: [], supported: true, limitations: [] });
  facts.push({ domain: 'economia', id: `fact:${territoryId}:sectors_positive:${period}`, territoryId, key: 'sectors_positive', label: 'Quantidade de setores com saldo positivo no mês', value: positive.length, unit: 'setores', period, evidenceRefs: positive.map((item) => evidenceRef(territoryId, `${SALDO_INDICATOR}_${item.sector}`, period)), derivedIndicatorRefs: [], supported: true, limitations: [] });
  facts.push({ domain: 'economia', id: `fact:${territoryId}:sectors_negative:${period}`, territoryId, key: 'sectors_negative', label: 'Quantidade de setores com saldo negativo no mês', value: negative.length, unit: 'setores', period, evidenceRefs: negative.map((item) => evidenceRef(territoryId, `${SALDO_INDICATOR}_${item.sector}`, period)), derivedIndicatorRefs: [], supported: true, limitations: [] });

  return facts;
}
