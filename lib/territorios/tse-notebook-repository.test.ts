import { describe, expect, it } from 'vitest';
import { buildElectoralRealBlock } from './tse-notebook-repository';

const base = {
  periodo_inicio: '2024-01-01',
  periodo_fim: '2024-12-31',
  source_dataset: 'detalhe_votacao_munzona_2024',
  source_record_id: null,
  source_updated_at: null,
  collected_at: '2026-08-11T00:00:00.000Z',
  metodologia: 'teste',
};

function total(indicador: string, valor: number, year = 2024) {
  return { ...base, indicador: `${indicador}_${year}_t1_c11`, valor, metadata: { ano: year, turno: 1, cargo: 'Prefeito' } };
}

describe('buildElectoralRealBlock', () => {
  it('monta os KPIs com denominadores eleitorais explícitos e série municipal comparável', () => {
    const rows = [
      total('eleitorado_total', 400, 2020), total('comparecimento_total', 300, 2020), total('abstencao_total', 100, 2020),
      total('eleitorado_total', 500), total('comparecimento_total', 400), total('abstencao_total', 100),
      total('votos_validos_total', 360), total('votos_brancos_total', 15), total('votos_nulos_total', 25),
    ];
    const { block, latestYear } = buildElectoralRealBlock(rows);
    expect(latestYear).toBe(2024);
    expect(block.electorate?.value).toBe('500');
    expect(block.participation?.value).toBe('80,0%');
    expect(block.validVotes?.value).toBe('90,0%');
    expect(block.historicalElectorate).toEqual([{ period: '2020', value: 400 }, { period: '2024', value: 500 }]);
  });

  it('calcula margem do executivo e composição apenas com eleitos da Câmara', () => {
    const rows = [
      total('eleitorado_total', 500),
      { ...base, indicador: 'resultado_candidato_2024_t1_c11_1', valor: 220, metadata: { year: 2024, round: 1, office: 'Prefeito', ballotName: 'A', party: 'AA', percentage: 55 } },
      { ...base, indicador: 'resultado_candidato_2024_t1_c11_2', valor: 180, metadata: { year: 2024, round: 1, office: 'Prefeito', ballotName: 'B', party: 'BB', percentage: 45 } },
      { ...base, indicador: 'resultado_candidato_2024_t1_c13_3', valor: 100, metadata: { year: 2024, round: 1, office: 'Vereador', ballotName: 'C', party: 'AA', status: 'ELEITO POR QP' } },
      { ...base, indicador: 'resultado_candidato_2024_t1_c13_4', valor: 90, metadata: { year: 2024, round: 1, office: 'Vereador', ballotName: 'D', party: 'BB', status: 'NÃO ELEITO' } },
    ];
    const { block } = buildElectoralRealBlock(rows);
    expect(block.margin?.value).toBe('10,0 p.p.');
    expect(block.topParties).toEqual([{ party: 'AA', seats: 1, percentage: 100 }]);
  });
});
