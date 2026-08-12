import { describe, expect, it } from 'vitest';
import { analyzeElectionYear, buildElectionTerritoryAnalysis, buildElectoralSampleBenchmarks, type ElectoralAnalyticsIndicator } from './electoral-analytics';

const territory = { id: 'territory-1', codigoIbge: '3118601', municipio: 'Contagem', uf: 'MG' };
const base = { territory_id: territory.id, unidade: 'votos', source_record_id: null, periodo_inicio: '2024-01-01', periodo_fim: '2024-12-31' };

function total(prefix: string, value: number | null, year = 2024, round = 1): ElectoralAnalyticsIndicator {
  return { ...base, indicador: `${prefix}_${year}_t${round}_c11`, valor: value, source_dataset: `detalhe_votacao_munzona_${year}`, metadata: { year, round, office: 'Prefeito' } };
}

function candidate(id: string, name: string, party: string, votes: number, percentage: number, status: string, year = 2024, round = 1): ElectoralAnalyticsIndicator {
  return { ...base, indicador: `resultado_candidato_${year}_t${round}_c11_${id}`, valor: votes, source_dataset: `votacao_candidato_munzona_${year}`, metadata: { year, round, office: 'Prefeito', candidateId: id, ballotName: name, party, percentage, status } };
}

function election(year: number, electorate: number, turnout: number, abstention: number, winnerParty: string, winnerName: string, round = 1) {
  return [
    total('eleitorado_total', electorate, year, round), total('comparecimento_total', turnout, year, round),
    total('abstencao_total', abstention, year, round), total('votos_validos_total', turnout - 10, year, round),
    candidate(`${year}-1`, winnerName, winnerParty, 60, 60, 'ELEITO', year, round),
    candidate(`${year}-2`, `Segundo ${year}`, 'ZZ', 40, 40, 'NÃO ELEITO', year, round),
  ];
}

const evidence = [
  { territory_id: territory.id, source_hash: 'detail-2024', source_external_id: 'detalhe_votacao_munzona_2024' },
  { territory_id: territory.id, source_hash: 'candidate-2024', source_external_id: 'votacao_candidato_munzona_2024' },
];

describe('camada analítica eleitoral territorial', () => {
  it('calcula taxas, margens, vencedor, segundo e turno decisivo com provenance', () => {
    const rows = [...election(2024, 500, 400, 100, 'AA', 'Vencedor')];
    const result = analyzeElectionYear(territory.id, rows, evidence, 2024);
    expect(result).toMatchObject({ turnoutRate: 80, abstentionRate: 20, winner: 'Vencedor', winnerParty: 'AA', runnerUp: 'Segundo 2024', marginVotes: 20, marginPercentagePoints: 20, decisiveRound: 1, electorateIdentityValid: true });
    expect(result.provenance.metricKeys).toContain('eleitorado_total_2024_t1_c11');
    expect(result.provenance.datasets).toEqual(['detalhe_votacao_munzona_2024', 'votacao_candidato_munzona_2024']);
    expect(result.provenance.evidenceHashes).toEqual(['candidate-2024', 'detail-2024']);
  });

  it('preserva ausência como null e não como zero', () => {
    const result = analyzeElectionYear(territory.id, [total('eleitorado_total', 500)], [], 2024);
    expect(result.turnout).toBeNull();
    expect(result.turnoutRate).toBeNull();
    expect(result.winner).toBeNull();
    expect(result.marginVotes).toBeNull();
    expect(result.electorateIdentityValid).toBeNull();
  });

  it('não calcula taxa quando o denominador necessário está ausente ou é zero', () => {
    expect(analyzeElectionYear(territory.id, [total('comparecimento_total', 10)], [], 2024).turnoutRate).toBeNull();
    expect(analyzeElectionYear(territory.id, [total('eleitorado_total', 0), total('comparecimento_total', 0)], [], 2024).turnoutRate).toBeNull();
  });

  it('deriva histórico, mudanças partidárias, mudanças de vencedor e turnos', () => {
    const rows = [
      ...election(2016, 400, 300, 100, 'AA', 'Pessoa A', 2),
      ...election(2020, 450, 360, 90, 'BB', 'Pessoa B', 2),
      ...election(2024, 500, 400, 100, 'BB', 'Pessoa B'),
    ];
    const result = buildElectionTerritoryAnalysis(territory, rows, evidence);
    expect(result.historicalEvolution[1]).toMatchObject({ electorateChange: 50, turnoutChange: 60, abstentionChange: -10, turnoutRateChange: 5 });
    expect(result.partyHistory.winnerPartyChanges).toBe(1);
    expect(result.winnerHistory.winnerChanges).toBe(1);
    expect(result.decisiveRounds).toEqual({ firstRound: 1, secondRound: 2, unavailable: 0 });
  });

  it('compara territórios e identifica explicitamente a média da amostra', () => {
    const first = buildElectionTerritoryAnalysis(territory, election(2024, 500, 400, 100, 'AA', 'A'), []);
    const second = buildElectionTerritoryAnalysis({ id: 'territory-2', codigoIbge: '3106200', municipio: 'Belo Horizonte', uf: 'MG' }, election(2024, 1000, 700, 300, 'BB', 'B').map((row) => ({ ...row, territory_id: 'territory-2' })), []);
    const benchmark = buildElectoralSampleBenchmarks([first, second]).find((item) => item.year === 2024)!;
    expect(benchmark.sampleLabel).toBe('amostra homologada de seis municípios');
    expect(benchmark.averages.turnoutRate).toBe(75);
    expect(benchmark.territories.map((item) => item.codigoIbge)).toEqual(['3106200', '3118601']);
  });

  it('não muta a entrada e produz resultado estruturalmente determinístico', () => {
    const rows = [...election(2024, 500, 400, 100, 'AA', 'A')];
    const snapshot = structuredClone(rows);
    const first = buildElectionTerritoryAnalysis(territory, rows, evidence);
    const second = buildElectionTerritoryAnalysis(territory, rows, evidence);
    expect(rows).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('regride contra os valores homologados de Contagem 2024', () => {
    const rows = [
      total('eleitorado_total', 459110), total('comparecimento_total', 352354), total('abstencao_total', 106756), total('votos_validos_total', 310076),
      candidate('1', 'MARÍLIA', 'PT', 188228, 60.7038274487545, 'ELEITO'),
      candidate('2', 'JUNIO AMARAL', 'PL', 120776, 38.9504508572092, 'NÃO ELEITO'),
    ];
    const result = analyzeElectionYear(territory.id, rows, evidence, 2024);
    expect(result).toMatchObject({ electorate: 459110, turnout: 352354, abstention: 106756, validVotes: 310076, winner: 'MARÍLIA', winnerParty: 'PT', runnerUp: 'JUNIO AMARAL', marginVotes: 67452, decisiveRound: 1, winnerStatus: 'ELEITO' });
    expect(result.marginPercentagePoints).toBeCloseTo(21.753376591545305, 10);
  });
});
