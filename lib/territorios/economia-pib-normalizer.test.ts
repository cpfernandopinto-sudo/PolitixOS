import { describe, expect, it, vi } from 'vitest';
import { fetchPibMunicipalSidra, parseOfficialPibBaseLine, parseSidraValue, type OfficialPibPerCapitaRow, type SidraPibSeries } from './economia-pib-client';
import { decidePibIndicatorAction } from './economia-pib-collector';
import { normalizePibMunicipal, PIB_VARIABLE_DEFINITIONS, pibIndicatorNaturalKey, validatePibIdentities, type PibIndicator } from './economia-pib-normalizer';

function sourceSeries(definition: typeof PIB_VARIABLE_DEFINITIONS[number]): SidraPibSeries {
  const serie: Record<string, string> = {};
  for (let year = 2002; year <= 2023; year++) {
    if (year > definition.endYear) serie[String(year)] = '...';
    else if (definition.id === 37) serie[String(year)] = '1000';
    else if (definition.id === 543) serie[String(year)] = '100';
    else if (definition.id === 498) serie[String(year)] = '900';
    else if ([513, 517, 6575, 525].includes(definition.id)) serie[String(year)] = '225';
    else serie[String(year)] = '25';
  }
  return { variavel: definition.rawName, unidade: definition.rawUnit, resultados: [{ series: [{ localidade: { id: '3118601', nome: 'Contagem (MG)' }, serie }] }] };
}

function perCapitaRows(): OfficialPibPerCapitaRow[] {
  return Array.from({ length: 22 }, (_, index) => ({ codigoIbge: '3118601', municipio: 'Contagem', year: 2002 + index, pibPerCapita: 10_000 + index, officialPibThousandBrl: 1000, sourceFile: index < 8 ? 'base_2002_2009.zip' : 'base_2010_2023.zip', sourceUrl: 'https://ibge.example/base.zip', rawLineHashInput: `line-${index}` }));
}

describe('parser SIDRA estrito', () => {
  it.each([
    ['...', 'not_available', null], ['..', 'not_applicable', null], ['X', 'suppressed', null],
    ['-', 'absolute_zero', 0], ['0', 'rounded_zero', 0], ['A', 'range', null], ['30.81', 'available', 30.81],
  ])('interpreta %s semanticamente', (raw, status, value) => {
    expect(parseSidraValue(raw)).toMatchObject({ status, value, rawValue: raw });
  });

  it('não converte texto inválido em zero', () => {
    expect(parseSidraValue('')).toMatchObject({ status: 'invalid', value: null });
    expect(parseSidraValue('abc')).toMatchObject({ status: 'invalid', value: null });
  });
});

describe('client SIDRA 5938', () => {
  it('consulta N6, todas as variáveis homologadas e valida a localidade', async () => {
    const payload = PIB_VARIABLE_DEFINITIONS.map(sourceSeries);
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      expect(url).toContain('/5938/periodos/all/variaveis/37%7C543%7C498%7C513%7C516%7C517%7C520%7C6575%7C6574%7C525%7C528');
      expect(url).toContain('localidades=N6[3118601]');
      return new Response(JSON.stringify(payload), { status: 200 });
    }) as typeof fetch;
    const result = await fetchPibMunicipalSidra('3118601', fetcher);
    expect(result.payload).toHaveLength(11);
  });

  it('rejeita código e localidade divergente', async () => {
    await expect(fetchPibMunicipalSidra('311860')).rejects.toThrow('INVALID_CODIGO_IBGE');
    const payload = PIB_VARIABLE_DEFINITIONS.map(sourceSeries);
    payload[0].resultados[0].series[0].localidade.id = '3106200';
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as typeof fetch;
    await expect(fetchPibMunicipalSidra('3118601', fetcher)).rejects.toThrow('SIDRA 5938 não retornou o município');
  });
});

describe('layout oficial PIB dos Municípios', () => {
  it('lê ano, código, município, PIB de auditoria e PIB per capita pelas posições oficiais', () => {
    const line = Array.from({ length: 972 }, () => ' ');
    const put = (position: number, length: number, value: string) => {
      const padded = value.padEnd(length, ' ').slice(0, length);
      for (let index = 0; index < length; index++) line[position - 1 + index] = padded[index];
    };
    put(1, 4, '2023'); put(47, 7, '3118601'); put(55, 40, 'Contagem');
    put(935, 18, '45092392.887'.padStart(18)); put(954, 18, '72511.78'.padStart(18));
    expect(parseOfficialPibBaseLine(line.join(''), 'base.zip', 'https://ibge/base.zip')).toMatchObject({ codigoIbge: '3118601', municipio: 'Contagem', year: 2023, officialPibThousandBrl: 45092392.887, pibPerCapita: 72511.78 });
  });
});

describe('normalização PIB municipal', () => {
  const payload = PIB_VARIABLE_DEFINITIONS.map(sourceSeries);

  it('produz 244 indicadores e preserva as 20 indisponibilidades oficiais de 2022/2023', () => {
    const normalized = normalizePibMunicipal('3118601', payload, perCapitaRows(), 'https://sidra.example/5938');
    expect(normalized.indicators).toHaveLength(244);
    expect(normalized.unavailable).toHaveLength(20);
    expect(normalized.unavailable.every((item) => item.year >= 2022 && item.status === 'not_available')).toBe(true);
    expect(normalized.indicators.some((item) => item.indicator === 'vab_total_precos_correntes' && item.periodStart === '2022-01-01')).toBe(false);
  });

  it('converte Mil Reais para BRL e mantém percentual em pontos percentuais', () => {
    const normalized = normalizePibMunicipal('3118601', payload, perCapitaRows(), 'https://sidra.example/5938');
    const pib = normalized.indicators.find((item) => item.indicator === 'pib_municipal_precos_correntes' && item.periodStart === '2023-01-01');
    const share = normalized.indicators.find((item) => item.indicator === 'participacao_vab_industria' && item.periodStart === '2021-01-01');
    expect(pib).toMatchObject({ value: 1_000_000, unit: 'BRL', metadata: { raw_value: '1000', raw_unit: 'Mil Reais', normalization_factor: 1000, price_basis: 'current_prices' } });
    expect(share).toMatchObject({ value: 25, unit: '%', metadata: { normalization_factor: 1 } });
  });

  it('mantém PIB per capita oficial em dataset separado e sem recálculo', () => {
    const normalized = normalizePibMunicipal('3118601', payload, perCapitaRows(), 'https://sidra.example/5938');
    const perCapita = normalized.indicators.find((item) => item.indicator === 'pib_per_capita_precos_correntes' && item.periodStart === '2023-01-01');
    expect(perCapita).toMatchObject({ value: 10021, unit: 'BRL/habitante', sourceDataset: 'IBGE_PIB_MUNICIPIOS_BASE', sourceRecordId: 'PIB_MUNICIPIOS_BASE:3118601:2023' });
  });

  it('aceita resultado parcial sem a base per capita', () => {
    const normalized = normalizePibMunicipal('3118601', payload, [], 'https://sidra.example/5938');
    expect(normalized.indicators).toHaveLength(222);
    expect(normalized.baseByYear.size).toBe(0);
  });

  it('rejeita valor indisponível dentro da cobertura oficial', () => {
    const broken = structuredClone(payload);
    broken[0].resultados[0].series[0].serie['2021'] = '...';
    expect(() => normalizePibMunicipal('3118601', broken, perCapitaRows(), 'https://sidra.example/5938')).toThrow('SIDRA_5938_UNEXPECTED_UNAVAILABLE:37:2021:not_available');
  });

  it('valida identidades com tolerâncias de arredondamento homologadas', () => {
    const normalized = normalizePibMunicipal('3118601', payload, perCapitaRows(), 'https://sidra.example/5938');
    expect(() => validatePibIdentities(normalized.indicators)).not.toThrow();
    const broken = structuredClone(normalized.indicators) as PibIndicator[];
    const industry = broken.find((item) => item.indicator === 'vab_industria_precos_correntes' && item.periodStart === '2021-01-01')!;
    industry.value += 3_000;
    expect(() => validatePibIdentities(broken)).toThrow('VAB_IDENTITY_FAILED');
  });

  it('gera natural key compatível com dataset e período', () => {
    const normalized = normalizePibMunicipal('3118601', payload, perCapitaRows(), 'https://sidra.example/5938');
    expect(pibIndicatorNaturalKey(normalized.indicators[0])).toBe('pib_municipal_precos_correntes|IBGE_SIDRA_5938|2002-01-01|2002-12-31');
  });
});

describe('reconciliação idempotente', () => {
  const indicator: PibIndicator = { indicator: 'pib_municipal_precos_correntes', value: 10, unit: 'BRL', periodStart: '2023-01-01', periodEnd: '2023-12-31', sourceDataset: 'IBGE_SIDRA_5938', sourceRecordId: '5938:37:3118601:2023', sourceUpdatedAt: null, metadata: {} };
  it('insere ausente, mantém idêntico e atualiza revisão/force refresh', () => {
    expect(decidePibIndicatorAction(undefined, indicator, false)).toBe('insert');
    expect(decidePibIndicatorAction({ valor: 10, source_record_id: indicator.sourceRecordId }, indicator, false)).toBe('unchanged');
    expect(decidePibIndicatorAction({ valor: 11, source_record_id: indicator.sourceRecordId }, indicator, false)).toBe('update');
    expect(decidePibIndicatorAction({ valor: 10, source_record_id: indicator.sourceRecordId }, indicator, true)).toBe('update');
  });
});
