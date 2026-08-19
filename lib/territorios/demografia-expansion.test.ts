import { describe, expect, it } from 'vitest';
import { normalizeDemographyPayloads } from './demografia-expansion';

const estimate = [{ id: '9324', variavel: 'População residente estimada', unidade: 'Pessoas', resultados: [{ classificacoes: [], series: [{ localidade: { id: '3106200', nome: 'Belo Horizonte (MG)' }, serie: { '2024': '90', '2025': '100' } }] }] }];
const censusResults = [
  { sex: '6794', age: '100362', value: 100 }, { sex: '4', age: '100362', value: 48 }, { sex: '5', age: '100362', value: 52 },
  { sex: '6794', age: '93070', value: 5 }, { sex: '6794', age: '93084', value: 5 }, { sex: '6794', age: '93085', value: 5 },
  { sex: '6794', age: '93086', value: 5 }, { sex: '6794', age: '93087', value: 5 }, { sex: '6794', age: '93088', value: 5 },
  { sex: '6794', age: '93089', value: 5 }, { sex: '6794', age: '93090', value: 5 }, { sex: '6794', age: '93091', value: 5 }, { sex: '6794', age: '93092', value: 5 }, { sex: '6794', age: '93093', value: 5 }, { sex: '6794', age: '93094', value: 5 },
  { sex: '6794', age: '93095', value: 5 }, { sex: '6794', age: '93096', value: 5 }, { sex: '6794', age: '93097', value: 5 }, { sex: '6794', age: '93098', value: 5 }, { sex: '6794', age: '49108', value: 5 }, { sex: '6794', age: '49109', value: 5 }, { sex: '6794', age: '60040', value: 5 }, { sex: '6794', age: '60041', value: 0 }, { sex: '6794', age: '6653', value: 0 },
].map((item) => ({ classificacoes: [{ id: '2', nome: 'Sexo', categoria: { [item.sex]: item.sex } }, { id: '287', nome: 'Idade', categoria: { [item.age]: item.age } }, { id: '286', nome: 'Forma', categoria: { '113635': 'Total' } }], series: [{ localidade: { id: '3106200', nome: 'Belo Horizonte (MG)' }, serie: { '2022': String(item.value) } }] }));
const census = [{ id: '93', variavel: 'População residente', unidade: 'Pessoas', resultados: censusResults }];

describe('normalizeDemographyPayloads', () => {
  it('separa estimativa de censo, agrega faixas e produz evidence estável', () => {
    const result = normalizeDemographyPayloads(estimate as never, census as never, '2026-08-17T00:00:00.000Z');
    expect(result.indicators.filter((item) => item.sourceDataset === 'SIDRA_6579')).toHaveLength(2);
    expect(result.indicators.find((item) => item.indicator === 'percentual_feminino')?.value).toBe(52);
    expect(result.indicators.find((item) => item.indicator === 'populacao_criancas')?.value).toBe(15);
    expect(result.evidence).toHaveLength(2);
    expect(result.indicators.every((item) => item.metadata.reference_period && item.metadata.source_table)).toBe(true);
  });
});

