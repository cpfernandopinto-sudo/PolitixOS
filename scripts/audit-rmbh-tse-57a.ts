import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { downloadTseCsv } from '../lib/territorios/tse-client';
import {
  aggregateCandidateResults,
  aggregateElectionTotals,
  deriveMayoralOutcome,
  type TseCandidateResult,
  type TseElectionTotals,
  type TseMayoralOutcome,
  type TseTerritoryKey,
} from '../lib/territorios/tse-normalizer';
import { HISTORY_SAMPLE } from './load-rmbh-tse-history-sample';

interface IndicatorRow {
  territory_id: string;
  indicador: string;
  valor: number | string | null;
  source_dataset: string;
  source_record_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  metadata: Record<string, unknown> | null;
}

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function paginated<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

function duplicateCount(keys: string[]): number {
  return keys.length - new Set(keys).size;
}

function asCandidate(row: IndicatorRow): TseCandidateResult {
  const m = row.metadata ?? {};
  return {
    year: Number(m.year), round: Number(m.round), officeCode: String(m.officeCode), office: String(m.office),
    candidateId: String(m.candidateId), candidateNumber: String(m.candidateNumber), candidateName: String(m.candidateName),
    ballotName: String(m.ballotName), partyNumber: String(m.partyNumber), party: String(m.party), partyName: String(m.partyName),
    votes: Number(row.valor), validVotes: Number(m.validVotes), percentage: Number(m.percentage),
    statusCode: String(m.statusCode), status: String(m.status),
  };
}

function bankTotal(rows: IndicatorRow[], year: number, round: number, officeCode: string): TseElectionTotals {
  const suffix = `${year}_t${round}_c${officeCode}`;
  const value = (prefix: string) => Number(rows.find((row) => row.indicador === `${prefix}_${suffix}`)?.valor);
  return {
    year, round, officeCode, office: 'Prefeito', electionType: '', sourceRecordIds: [],
    electorate: value('eleitorado_total'), turnout: value('comparecimento_total'), abstention: value('abstencao_total'),
    validVotes: value('votos_validos_total'), blankVotes: value('votos_brancos_total'), nullVotes: value('votos_nulos_total'),
  };
}

function totalComparison(bank: TseElectionTotals, official: TseElectionTotals) {
  const fields = ['electorate', 'turnout', 'abstention', 'validVotes'] as const;
  return {
    values: Object.fromEntries(fields.map((field) => [field, { bank: bank[field], official: official[field], pass: bank[field] === official[field] }])),
    pass: fields.every((field) => bank[field] === official[field]),
  };
}

function outcomeComparison(bank: TseMayoralOutcome | null, official: TseMayoralOutcome | null) {
  if (!bank || !official) return { pass: false, bank, official };
  const tolerance = 1e-9;
  const pass = bank.decisiveRound === official.decisiveRound
    && bank.winner.candidateId === official.winner.candidateId
    && bank.runnerUp.candidateId === official.runnerUp.candidateId
    && bank.marginVotes === official.marginVotes
    && Math.abs(bank.marginPercentagePoints - official.marginPercentagePoints) < tolerance
    && bank.officialStatusValidated
    && official.officialStatusValidated;
  return {
    pass,
    bank: { round: bank.decisiveRound, winner: bank.winner.ballotName, runnerUp: bank.runnerUp.ballotName, marginVotes: bank.marginVotes, marginPercentagePoints: bank.marginPercentagePoints },
    official: { round: official.decisiveRound, winner: official.winner.ballotName, runnerUp: official.runnerUp.ballotName, marginVotes: official.marginVotes, marginPercentagePoints: official.marginPercentagePoints },
  };
}

export async function auditRmbhTse57a() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: territories, error } = await client.from('territories').select('id,codigo_ibge,municipio,uf,metadata').in('codigo_ibge', HISTORY_SAMPLE.map((item) => item.codigoIbge));
  if (error) throw error;
  if ((territories ?? []).length !== HISTORY_SAMPLE.length) throw new Error('Amostra territorial incompleta.');
  const ids = (territories ?? []).map((row) => String(row.id));
  const indicators = await paginated<IndicatorRow>((start, end) => client.from('territory_indicators').select('territory_id,indicador,valor,source_dataset,source_record_id,periodo_inicio,periodo_fim,metadata').in('territory_id', ids).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end));
  const evidence = await paginated<Record<string, unknown>>((start, end) => client.from('territory_evidence').select('territory_id,source_hash,source_external_id,source_name,source_url,raw_reference').in('territory_id', ids).eq('tema', 'eleicoes').eq('source_name', 'TSE').range(start, end));
  const runs = await paginated<Record<string, unknown>>((start, end) => client.from('territory_collection_runs').select('territory_id,status').in('territory_id', ids).eq('source', 'tse').range(start, end));
  const resources = new Map<number, { detail: Awaited<ReturnType<typeof downloadTseCsv>>; candidate: Awaited<ReturnType<typeof downloadTseCsv>> }>();
  for (const year of [2016, 2020, 2024]) {
    const [detail, candidate] = await Promise.all([downloadTseCsv(year, 'MG', 'detail'), downloadTseCsv(year, 'MG', 'candidate')]);
    resources.set(year, { detail, candidate });
  }
  const comparisons = [];
  for (const row of territories ?? []) {
    const metadata = row.metadata as { tse?: { codigo_municipio?: string } } | null;
    const territory: TseTerritoryKey = { codigoIbge: String(row.codigo_ibge), codigoTse: String(metadata?.tse?.codigo_municipio), municipio: String(row.municipio), uf: String(row.uf) };
    const bankRows = indicators.filter((item) => item.territory_id === row.id);
    for (const year of [2016, 2020, 2024]) {
      if (year !== 2024 && !['3118601', '3106200', '3106705'].includes(territory.codigoIbge)) continue;
      const resource = resources.get(year)!;
      const totals = aggregateElectionTotals(resource.detail.rowsByMunicipality.get(territory.codigoTse) ?? [], territory);
      const valid = new Map(totals.map((item) => [`${item.year}|${item.round}|${item.officeCode}`, item.validVotes]));
      const officialCandidates = aggregateCandidateResults(resource.candidate.rowsByMunicipality.get(territory.codigoTse) ?? [], territory, valid);
      const officialOutcome = deriveMayoralOutcome(officialCandidates, year);
      const bankCandidates = bankRows.filter((item) => item.indicador.startsWith(`resultado_candidato_${year}_`)).map(asCandidate);
      const bankOutcome = deriveMayoralOutcome(bankCandidates, year);
      const officialTotal = totals.find((item) => item.round === officialOutcome?.decisiveRound && item.officeCode === '11');
      const totalsResult = officialTotal ? totalComparison(bankTotal(bankRows, year, officialTotal.round, officialTotal.officeCode), officialTotal) : null;
      comparisons.push({ municipio: territory.municipio, codigoIbge: territory.codigoIbge, year, totals: totalsResult, outcome: outcomeComparison(bankOutcome, officialOutcome), pass: Boolean(totalsResult?.pass) && outcomeComparison(bankOutcome, officialOutcome).pass });
    }
  }
  const indicatorNaturalKey = (row: IndicatorRow) => [row.territory_id, row.indicador, row.source_dataset, row.periodo_inicio, row.periodo_fim].join('|');
  const candidateKey = (row: IndicatorRow) => [row.territory_id, row.metadata?.year, row.metadata?.round, row.metadata?.officeCode, row.metadata?.candidateId].join('|');
  const partyKey = (row: IndicatorRow) => [row.territory_id, row.metadata?.year, row.metadata?.round, row.metadata?.officeCode, row.metadata?.partyNumber].join('|');
  const evidenceHashValid = evidence.every((row) => {
    const raw = row.raw_reference as { source?: { referencePeriod?: string } } | null;
    return row.source_hash === createHash('sha256').update(`${row.territory_id}|${row.source_external_id}|${raw?.source?.referencePeriod}`).digest('hex');
  });
  const audit = {
    indicators: indicators.length,
    evidence: evidence.length,
    indicatorDuplicates: duplicateCount(indicators.map(indicatorNaturalKey)),
    candidateDuplicates: duplicateCount(indicators.filter((row) => row.indicador.startsWith('resultado_candidato_')).map(candidateKey)),
    partyDuplicates: duplicateCount(indicators.filter((row) => row.indicador.startsWith('resultado_partido_')).map(partyKey)),
    evidenceDuplicates: duplicateCount(evidence.map((row) => `${row.territory_id}|${row.source_hash}`)),
    runningOrphans: runs.filter((row) => row.status === 'running').length,
    territoryIdsValid: indicators.every((row) => ids.includes(row.territory_id)),
    yearsValid: indicators.every((row) => ['2016', '2020', '2024'].includes(row.periodo_inicio.slice(0, 4))),
    datasetsValid: indicators.every((row) => /^(detalhe_votacao_munzona|votacao_candidato_munzona|votacao_partido_munzona)_(2016|2020|2024)$/.test(row.source_dataset)),
    evidenceHashValid,
  };
  const result = { audit, comparisons, pass: Object.values(audit).every((value) => typeof value === 'boolean' ? value : value === 0 || value > 0) && comparisons.every((item) => item.pass) };
  console.log(JSON.stringify(result, null, 2));
  return result;
}
