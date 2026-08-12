import { downloadTseCsv } from '../lib/territorios/tse-client';
import { aggregateElectionTotals, type TseTerritoryKey } from '../lib/territorios/tse-normalizer';

const detail = await downloadTseCsv(2024, 'MG', 'detail');
const municipalityRows = detail.rows.filter((row) => row.SG_UF === 'MG' && row.CD_MUNICIPIO === '43710');
if (!municipalityRows.length) throw new Error('Contagem/MG (TSE 43710) não foi localizada no arquivo oficial de 2024.');

const territory: TseTerritoryKey = {
  codigoIbge: '3118601',
  codigoTse: '43710',
  municipio: 'CONTAGEM',
  uf: 'MG',
};
const totals = aggregateElectionTotals(detail.rows, territory);
const mayorFirstRound = totals.find((item) => item.round === 1 && item.office.toLocaleLowerCase('pt-BR') === 'prefeito');
if (!mayorFirstRound || mayorFirstRound.electorate <= 0 || mayorFirstRound.turnout <= 0) {
  throw new Error('Agregação municipal do executivo não produziu eleitorado/comparecimento válidos.');
}
if (mayorFirstRound.electorate !== mayorFirstRound.turnout + mayorFirstRound.abstention) {
  throw new Error('Sanidade falhou: eleitorado diferente de comparecimento + abstenção.');
}

console.log(JSON.stringify({ source: detail.source, municipalityRows: municipalityRows.length, mayorFirstRound }, null, 2));
