import { describe, expect, it } from 'vitest';
import { consolidateChangeEvents, type ChangeEvent } from './consolidation';
import { runEconomicIntelligenceEngine } from './engine';
import type { Evidence } from '../contracts';

const TERRITORY_A = 'fixture-intel02c-consolidation-territorio-a';
const TERRITORY_B = 'fixture-intel02c-consolidation-territorio-b';

function makeEvent(fromYear: number, toYear: number, direction: 'up' | 'down', indicator = 'indicador_x'): ChangeEvent {
  return {
    fromYear,
    toYear,
    direction,
    evidenceRefs: [`ev-${indicator}-${fromYear}`, `ev-${indicator}-${toYear}`],
    derivedIndicatorRefs: [`derived:${TERRITORY_A}:${indicator}:ECON_VAR_YOY_V1:${fromYear}-${toYear}`],
    rawSignalId: `signal:economia:change:${indicator}:${fromYear}-${toYear}`,
  };
}

// ---------------------------------------------------------------------------
// Matriz de casos — seção 61 do gate INTEL-02C.
// ---------------------------------------------------------------------------

describe('consolidateChangeEvents — matriz de casos (seção 61 do gate)', () => {
  it('nenhum evento produz array vazio', () => {
    expect(consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', [])).toEqual([]);
  });

  it('1 evento isolado produz uma sequência com eventCount=1', () => {
    const result = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', [makeEvent(2020, 2021, 'up')]);
    expect(result).toHaveLength(1);
    expect(result[0].eventCount).toBe(1);
    expect(result[0].startPeriod).toBe('2020');
    expect(result[0].endPeriod).toBe('2021');
    expect(result[0].constituentSignalRefs).toEqual(['signal:economia:change:indicador_x:2020-2021']);
  });

  it('2 eventos consecutivos mesma direção consolidam em uma sequência com eventCount=2', () => {
    const events = [makeEvent(2020, 2021, 'up'), makeEvent(2021, 2022, 'up')];
    const result = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', events);
    expect(result).toHaveLength(1);
    expect(result[0].eventCount).toBe(2);
    expect(result[0].startPeriod).toBe('2020');
    expect(result[0].endPeriod).toBe('2022');
    expect(result[0].constituentSignalRefs).toEqual([
      'signal:economia:change:indicador_x:2020-2021',
      'signal:economia:change:indicador_x:2021-2022',
    ]);
  });

  it('3 eventos consecutivos mesma direção consolidam em uma sequência com eventCount=3', () => {
    const events = [makeEvent(2020, 2021, 'up'), makeEvent(2021, 2022, 'up'), makeEvent(2022, 2023, 'up')];
    const result = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', events);
    expect(result).toHaveLength(1);
    expect(result[0].eventCount).toBe(3);
    expect(result[0].startPeriod).toBe('2020');
    expect(result[0].endPeriod).toBe('2023');
  });

  it('período interrompido (gap entre toYear e fromYear seguinte) produz duas sequências separadas', () => {
    const events = [makeEvent(2020, 2021, 'up'), makeEvent(2023, 2024, 'up')]; // 2021 -> 2023 não é consecutivo
    const result = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', events);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.eventCount)).toEqual([1, 1]);
    expect(result.map((r) => `${r.startPeriod}-${r.endPeriod}`)).toEqual(['2020-2021', '2023-2024']);
  });

  it('direção invertida quebra a sequência mesmo com anos consecutivos', () => {
    const events = [makeEvent(2020, 2021, 'up'), makeEvent(2021, 2022, 'down')];
    const result = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', events);
    expect(result).toHaveLength(2);
    expect(result[0].direction).toBe('up');
    expect(result[1].direction).toBe('down');
    expect(result[0].eventCount).toBe(1);
    expect(result[1].eventCount).toBe(1);
  });

  it('indicadores diferentes nunca se misturam — cada chamada é escopada por indicator', () => {
    const eventsX = [makeEvent(2020, 2021, 'up', 'indicador_x'), makeEvent(2021, 2022, 'up', 'indicador_x')];
    const eventsY = [makeEvent(2020, 2021, 'up', 'indicador_y'), makeEvent(2021, 2022, 'up', 'indicador_y')];
    const resultX = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', eventsX);
    const resultY = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_y', eventsY);
    expect(resultX[0].indicator).toBe('indicador_x');
    expect(resultY[0].indicator).toBe('indicador_y');
    expect(resultX[0].id).not.toBe(resultY[0].id);
  });

  it('famílias diferentes nunca se misturam — cada chamada é escopada por family', () => {
    const events = [makeEvent(2020, 2021, 'up'), makeEvent(2021, 2022, 'up')];
    const resultFiscal = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', events);
    const resultPibVab = consolidateChangeEvents(TERRITORY_A, 'PIB_VAB_MONETARY', 'indicador_x', events);
    expect(resultFiscal[0].family).toBe('FISCAL');
    expect(resultPibVab[0].family).toBe('PIB_VAB_MONETARY');
    expect(resultFiscal[0].id).not.toBe(resultPibVab[0].id);
  });

  it('territórios diferentes nunca se misturam — cada chamada é escopada por territoryId', () => {
    const events = [makeEvent(2020, 2021, 'up'), makeEvent(2021, 2022, 'up')];
    const resultA = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', events);
    const resultB = consolidateChangeEvents(TERRITORY_B, 'FISCAL', 'indicador_x', events);
    expect(resultA[0].territoryId).toBe(TERRITORY_A);
    expect(resultB[0].territoryId).toBe(TERRITORY_B);
    expect(resultA[0].id).not.toBe(resultB[0].id);
  });

  // methodId: ChangeEvent não carrega methodId — a segregação por método (ECON_SIGNAL_CHANGE_V1
  // vs ECON_SIGNAL_CHANGE_OFFICIAL_SHARE_V1) é garantida estruturalmente porque engine.ts nunca
  // chama consolidateChangeEvents misturando eventos FISCAL/PIB_VAB com OFFICIAL_SHARE na mesma
  // invocação — cada família tem sua própria chamada (ver engine.test.ts / teste de integração abaixo).
  it('agrupamento é determinístico independente da ordem de entrada dos eventos', () => {
    const inOrder = [makeEvent(2020, 2021, 'up'), makeEvent(2021, 2022, 'up'), makeEvent(2022, 2023, 'up')];
    const shuffled = [inOrder[2], inOrder[0], inOrder[1]];
    const resultInOrder = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', inOrder);
    const resultShuffled = consolidateChangeEvents(TERRITORY_A, 'FISCAL', 'indicador_x', shuffled);
    expect(resultShuffled).toEqual(resultInOrder);
  });
});

// ---------------------------------------------------------------------------
// Integração com o motor — lineage (seção 62), determinismo (seção 63) e
// não-perda de sinais brutos (seção 64) do gate INTEL-02C.
// ---------------------------------------------------------------------------

const CONSOLIDATION_INDICATOR = 'indicador_consolidacao_x';
const CONSOLIDATION_TERRITORY = 'fixture-intel02c-consolidacao-motor';

function consolidationEvidence(): Evidence[] {
  const values: Array<[string, number]> = [
    ['2020', 1000],
    ['2021', 1200], // +20% (up, cruza threshold FISCAL de 15%)
    ['2022', 1450], // +20.83% (up)
    ['2023', 1750], // +20.69% (up) — três CHANGE consecutivos em sequência única
    ['2024', 1770], // +1.14% (abaixo do threshold — interrompe a sequência)
    ['2025', 1450], // -18.08% (down, isolado)
  ];
  return values.map(([period, value], index) => ({
    id: `cons-${period}`,
    territoryId: CONSOLIDATION_TERRITORY,
    domain: 'economia' as const,
    indicator: CONSOLIDATION_INDICATOR,
    value,
    unit: 'BRL',
    period,
    source: 'fixture',
    dataset: 'FIXTURE_CONSOLIDATION',
    evidenceHash: `hash-cons-${index}`,
    metadata: { fixture: true },
  }));
}

const CONSOLIDATION_CONFIG = {
  fiscalMonetaryIndicators: [CONSOLIDATION_INDICATOR],
  activityMonetaryIndicators: [],
  officialShareIndicators: [],
  sharePairs: [],
  pressurePair: null,
  divergencePairs: [],
} as const;

describe('consolidação — integração com o motor (seções 62-64 do gate)', () => {
  it('produz a sequência de 3 eventos (2020-2023, up) e o evento isolado (2024-2025, down)', () => {
    const result = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, consolidationEvidence(), CONSOLIDATION_CONFIG);
    expect(result.consolidatedSignals).toHaveLength(2);
    const upRun = result.consolidatedSignals.find((s) => s.direction === 'up')!;
    const downRun = result.consolidatedSignals.find((s) => s.direction === 'down')!;
    expect(upRun.eventCount).toBe(3);
    expect(upRun.startPeriod).toBe('2020');
    expect(upRun.endPeriod).toBe('2023');
    expect(downRun.eventCount).toBe(1);
    expect(downRun.startPeriod).toBe('2024');
    expect(downRun.endPeriod).toBe('2025');
  });

  it('lineage: todo constituentSignalRefs resolve em result.signals (seção 62 do gate)', () => {
    const result = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, consolidationEvidence(), CONSOLIDATION_CONFIG);
    const signalIds = new Set(result.signals.map((s) => s.id));
    for (const consolidated of result.consolidatedSignals) {
      for (const ref of consolidated.constituentSignalRefs) expect(signalIds.has(ref)).toBe(true);
    }
  });

  it('lineage: todo derivedIndicatorRefs resolve em result.derivedIndicators (seção 62 do gate)', () => {
    const result = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, consolidationEvidence(), CONSOLIDATION_CONFIG);
    const derivedIds = new Set(result.derivedIndicators.map((d) => d.id));
    for (const consolidated of result.consolidatedSignals) {
      for (const ref of consolidated.derivedIndicatorRefs) expect(derivedIds.has(ref)).toBe(true);
    }
  });

  it('lineage: todo evidenceRefs resolve transitivamente em result.evidenceIndex (seção 62 do gate)', () => {
    const result = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, consolidationEvidence(), CONSOLIDATION_CONFIG);
    for (const consolidated of result.consolidatedSignals) {
      for (const ref of consolidated.evidenceRefs) expect(result.evidenceIndex[ref]).toBeDefined();
    }
  });

  it('não-perda: nenhum sinal CHANGE bruto é removido de result.signals pela consolidação (seção 64 do gate)', () => {
    const result = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, consolidationEvidence(), CONSOLIDATION_CONFIG);
    const rawChangeSignals = result.signals.filter((s) => s.type === 'CHANGE');
    expect(rawChangeSignals).toHaveLength(4); // 3 no run "up" + 1 isolado "down"
    const constituentRefs = new Set(result.consolidatedSignals.flatMap((s) => s.constituentSignalRefs));
    for (const raw of rawChangeSignals) expect(constituentRefs.has(raw.id)).toBe(true);
  });

  it('determinismo: ordem de entrada da evidência não altera signals nem consolidatedSignals (seção 63 do gate)', () => {
    const original = consolidationEvidence();
    const shuffled = [...original].reverse();
    const resultOriginal = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, original, CONSOLIDATION_CONFIG);
    const resultShuffled = runEconomicIntelligenceEngine(CONSOLIDATION_TERRITORY, shuffled, CONSOLIDATION_CONFIG);
    expect(resultShuffled.signals.map((s) => s.id)).toEqual(resultOriginal.signals.map((s) => s.id));
    expect(resultShuffled.consolidatedSignals).toEqual(resultOriginal.consolidatedSignals);
  });
});
