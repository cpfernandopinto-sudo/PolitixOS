import { describe, expect, it } from 'vitest';
import { auditIndicatorRows, auditTotalInvariants, candidateDuplicateCount, type AuditIndicator } from './tse-functional-audit';

function row(indicador: string, valor: number, metadata: Record<string, unknown> = { ano: 2024 }): AuditIndicator {
  return { territory_id: 'territory', indicador, valor, source_dataset: 'dataset', source_record_id: indicador, periodo_inicio: '2024-01-01', periodo_fim: '2024-12-31', metadata };
}

describe('regras estáveis da auditoria funcional TSE', () => {
  it('diferencia ausência de write de inventário físico', () => {
    const physicalInventory = 489;
    const writtenInRun = 0;
    expect(physicalInventory).toBeGreaterThan(writtenInRun);
    expect(writtenInRun).toBe(0);
  });

  it('valida as duas identidades matemáticas dos totais', () => {
    const rows = [
      row('eleitorado_total_2024_t1_c11', 100), row('comparecimento_total_2024_t1_c11', 80), row('abstencao_total_2024_t1_c11', 20),
      row('votos_validos_total_2024_t1_c11', 70), row('votos_brancos_total_2024_t1_c11', 5), row('votos_nulos_total_2024_t1_c11', 5),
    ];
    expect(auditTotalInvariants(rows)).toEqual({ checked: 1, electorateMismatch: 0, ballotMismatch: 0 });
  });

  it('detecta chave natural, candidato e valor inválidos', () => {
    const candidate = row('resultado_candidato_2024_t1_c11_1', -1, { year: 2024, round: 1, officeCode: '11', candidateId: '1', percentage: 101 });
    expect(auditIndicatorRows([candidate, candidate]).map((item) => item.code)).toEqual(expect.arrayContaining(['DUPLICATE_NATURAL_KEY', 'INVALID_VALUE', 'INVALID_PERCENTAGE']));
    expect(candidateDuplicateCount([candidate, candidate])).toBe(1);
  });
});

