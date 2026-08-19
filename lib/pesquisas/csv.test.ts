import { describe, it, expect } from 'vitest';
import { parseCsvText } from './csv';

/**
 * Fixture SINTÉTICA para testar o mecanismo de parsing (delimiter `;`,
 * aspas, header) — NÃO é uma amostra de dado real do TSE (schema real
 * ainda não verificado, ver PESQUISAS-01A).
 */
describe('parseCsvText — parsing genérico, sem assumir schema do TSE', () => {
  it('extrai headers e linhas de um CSV delimitado por ;', () => {
    const csv = 'COLUNA_A;COLUNA_B;COLUNA_C\nvalor1;valor2;valor3\nvalor4;valor5;valor6';
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(['COLUNA_A', 'COLUNA_B', 'COLUNA_C']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ COLUNA_A: 'valor1', COLUNA_B: 'valor2', COLUNA_C: 'valor3' });
  });

  it('lida com campos entre aspas contendo ; interno', () => {
    const csv = 'NOME;DESCRICAO\n"Instituto X";"Pesquisa; eleitoral; 2026"';
    const { rows } = parseCsvText(csv);
    expect(rows[0].DESCRICAO).toBe('Pesquisa; eleitoral; 2026');
  });

  it('remove BOM e espaços do header', () => {
    const csv = '﻿ COLUNA_COM_ESPACO ;OUTRA\nx;y';
    const { headers } = parseCsvText(csv);
    expect(headers).toEqual(['COLUNA_COM_ESPACO', 'OUTRA']);
  });

  it('CSV vazio (só header) retorna headers=[] e rows=[] — parser não assume presença de dado', () => {
    const { headers, rows } = parseCsvText('');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it('tolera contagem de colunas inconsistente entre linhas (relax_column_count)', () => {
    const csv = 'A;B;C\nx;y';
    expect(() => parseCsvText(csv)).not.toThrow();
  });
});
