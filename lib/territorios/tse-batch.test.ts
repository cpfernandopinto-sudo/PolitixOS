import { describe, expect, it } from 'vitest';
import { chunks, TSE_BATCH_SIZE } from './tse-collector';
import { aggregateElectionTotals } from './tse-normalizer';

describe('batch e isolamento municipal TSE', () => {
  it('divide N itens e mantém o último lote menor', () => {
    const values = Array.from({ length: TSE_BATCH_SIZE * 2 + 7 }, (_, index) => index);
    expect(chunks(values, TSE_BATCH_SIZE).map((batch) => batch.length)).toEqual([TSE_BATCH_SIZE, TSE_BATCH_SIZE, 7]);
  });

  it('não vaza linhas entre municípios', () => {
    const base = { ANO_ELEICAO: '2024', NR_TURNO: '1', CD_CARGO: '11', DS_CARGO: 'Prefeito', SG_UF: 'MG', QT_APTOS: '100', QT_COMPARECIMENTO: '80', QT_ABSTENCOES: '20', QT_TOTAL_VOTOS_VALIDOS: '70', QT_VOTOS_BRANCOS: '5', QT_TOTAL_VOTOS_NULOS: '5' };
    const rows = [
      { ...base, CD_MUNICIPIO: '43710', NM_MUNICIPIO: 'CONTAGEM', NR_ZONA: '90' },
      { ...base, CD_MUNICIPIO: '41238', NM_MUNICIPIO: 'BELO HORIZONTE', NR_ZONA: '29', QT_APTOS: '200' },
    ];
    const contagem = aggregateElectionTotals(rows, { codigoIbge: '3118601', codigoTse: '43710', municipio: 'Contagem', uf: 'MG' });
    const beloHorizonte = aggregateElectionTotals(rows, { codigoIbge: '3106200', codigoTse: '41238', municipio: 'Belo Horizonte', uf: 'MG' });
    expect(contagem[0].electorate).toBe(100);
    expect(beloHorizonte[0].electorate).toBe(200);
  });
});
