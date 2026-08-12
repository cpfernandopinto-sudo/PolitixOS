import { describe, expect, it } from 'vitest';
import { aggregateCandidateResults, aggregateElectionTotals, aggregatePartyResults, buildCouncilComposition, deriveMayoralOutcome } from './tse-normalizer';

const territory = { codigoIbge: '3118601', codigoTse: '43710', municipio: 'Contagem', uf: 'MG' };
const base = { ANO_ELEICAO: '2024', NR_TURNO: '1', CD_CARGO: '11', DS_CARGO: 'Prefeito', SG_UF: 'MG', CD_MUNICIPIO: '43710', NM_MUNICIPIO: 'CONTAGEM' };

describe('normalização TSE', () => {
  it('agrega zonas sem confundir comparecimento, abstenção e votos', () => {
    const totals = aggregateElectionTotals([
      { ...base, NR_ZONA: '90', QT_APTOS: '100', QT_COMPARECIMENTO: '80', QT_ABSTENCOES: '20', QT_TOTAL_VOTOS_VALIDOS: '70', QT_VOTOS_BRANCOS: '4', QT_TOTAL_VOTOS_NULOS: '6' },
      { ...base, NR_ZONA: '91', QT_APTOS: '200', QT_COMPARECIMENTO: '150', QT_ABSTENCOES: '50', QT_TOTAL_VOTOS_VALIDOS: '130', QT_VOTOS_BRANCOS: '8', QT_TOTAL_VOTOS_NULOS: '12' },
    ], territory);
    expect(totals).toHaveLength(1);
    expect(totals[0]).toMatchObject({ electorate: 300, turnout: 230, abstention: 70, validVotes: 200, blankVotes: 12, nullVotes: 18 });
    expect(totals[0].turnout + totals[0].abstention).toBe(totals[0].electorate);
  });

  it('agrega candidato por SQ_CANDIDATO e calcula percentual sobre votos válidos do cargo', () => {
    const rows = [
      { ...base, NR_ZONA: '90', SQ_CANDIDATO: '1', NR_CANDIDATO: '10', NM_CANDIDATO: 'A', NM_URNA_CANDIDATO: 'A', NR_PARTIDO: '10', SG_PARTIDO: 'REP', NM_PARTIDO: 'Republicanos', QT_VOTOS_NOMINAIS_VALIDOS: '60', CD_SIT_TOT_TURNO: '1', DS_SIT_TOT_TURNO: 'ELEITO' },
      { ...base, NR_ZONA: '91', SQ_CANDIDATO: '1', NR_CANDIDATO: '10', NM_CANDIDATO: 'A', NM_URNA_CANDIDATO: 'A', NR_PARTIDO: '10', SG_PARTIDO: 'REP', NM_PARTIDO: 'Republicanos', QT_VOTOS_NOMINAIS_VALIDOS: '40', CD_SIT_TOT_TURNO: '1', DS_SIT_TOT_TURNO: 'ELEITO' },
    ];
    const results = aggregateCandidateResults(rows, territory, new Map([['2024|1|11', 200]]));
    expect(results[0]).toMatchObject({ votes: 100, percentage: 50, party: 'REP' });
  });

  it('calcula composição apenas a partir de vereadores eleitos', () => {
    const elected = [
      { year: 2024, office: 'Vereador', party: 'A', status: 'ELEITO' },
      { year: 2024, office: 'Vereador', party: 'A', status: 'ELEITO POR QP' },
      { year: 2024, office: 'Vereador', party: 'B', status: 'SUPLENTE' },
    ] as never;
    expect(buildCouncilComposition(elected, 2024)).toEqual([{ year: 2024, party: 'A', seats: 2, percentage: 100 }]);
  });

  it('agrega votos partidários por partido', () => {
    const parties = aggregatePartyResults([{ ...base, NR_PARTIDO: '10', SG_PARTIDO: 'REP', NM_PARTIDO: 'Republicanos', QT_VOTOS_NOMINAIS_VALIDOS: '90', QT_TOTAL_VOTOS_LEG_VALIDOS: '10' }], territory);
    expect(parties[0]).toMatchObject({ nominalVotes: 90, legendVotes: 10, totalVotes: 100 });
  });
});

describe('normalização nominal multiano', () => {
  const territory = { codigoIbge: '3118601', codigoTse: '43710', municipio: 'Contagem', uf: 'MG' };

  it.each([2016, 2020, 2024])('preserva a identidade e o status oficial em %s', (year) => {
    const rows = [
      { ANO_ELEICAO: String(year), NR_TURNO: '1', CD_CARGO: '11', DS_CARGO: 'Prefeito', SQ_CANDIDATO: `${year}01`, NR_CANDIDATO: '10', NM_CANDIDATO: 'CANDIDATO A', NM_URNA_CANDIDATO: 'A', NR_PARTIDO: '10', SG_PARTIDO: 'PA', NM_PARTIDO: 'PARTIDO A', QT_VOTOS_NOMINAIS_VALIDOS: '600', CD_SIT_TOT_TURNO: '1', DS_SIT_TOT_TURNO: 'ELEITO', SG_UF: 'MG', CD_MUNICIPIO: '43710' },
      { ANO_ELEICAO: String(year), NR_TURNO: '1', CD_CARGO: '11', DS_CARGO: 'Prefeito', SQ_CANDIDATO: `${year}02`, NR_CANDIDATO: '20', NM_CANDIDATO: 'CANDIDATO B', NM_URNA_CANDIDATO: 'B', NR_PARTIDO: '20', SG_PARTIDO: 'PB', NM_PARTIDO: 'PARTIDO B', QT_VOTOS_NOMINAIS_VALIDOS: '400', CD_SIT_TOT_TURNO: '4', DS_SIT_TOT_TURNO: 'NÃO ELEITO', SG_UF: 'MG', CD_MUNICIPIO: '43710' },
    ];
    const results = aggregateCandidateResults(rows, territory, new Map([[`${year}|1|11`, 1000]]));
    expect(results[0]).toMatchObject({ year, candidateId: `${year}01`, party: 'PA', votes: 600, percentage: 60, status: 'ELEITO' });
    expect(deriveMayoralOutcome(results, year)).toMatchObject({ decisiveRound: 1, marginVotes: 200, marginPercentagePoints: 20, officialStatusValidated: true });
  });

  it('usa o segundo turno como decisivo', () => {
    const base = { year: 2020, officeCode: '11', office: 'Prefeito', candidateNumber: '', candidateName: '', ballotName: '', partyNumber: '', partyName: '', validVotes: 1000, statusCode: '' };
    const results = [
      { ...base, round: 1, candidateId: '1', party: 'A', votes: 700, percentage: 70, status: 'NÃO ELEITO' },
      { ...base, round: 1, candidateId: '2', party: 'B', votes: 300, percentage: 30, status: 'NÃO ELEITO' },
      { ...base, round: 2, candidateId: '1', party: 'A', votes: 450, percentage: 45, status: 'NÃO ELEITO' },
      { ...base, round: 2, candidateId: '2', party: 'B', votes: 550, percentage: 55, status: 'ELEITO' },
    ];
    expect(deriveMayoralOutcome(results, 2020)).toMatchObject({ decisiveRound: 2, winner: { candidateId: '2' }, runnerUp: { candidateId: '1' }, marginVotes: 100, officialStatusValidated: true });
  });
});
