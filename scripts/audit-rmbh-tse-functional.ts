import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getCanonicalRegion } from '../lib/territorios/regional-registry';
import { auditIndicatorRows, auditTotalInvariants, candidateDuplicateCount, duplicateCount, indicatorNaturalKey, type AuditIndicator } from '../lib/territorios/tse-functional-audit';
import { aggregateCandidateResults, aggregateElectionTotals, aggregatePartyResults, type TseTerritoryKey } from '../lib/territorios/tse-normalizer';
import { downloadTseCsv } from '../lib/territorios/tse-client';

const SAMPLE = [
  { ibge: '3118601', name: 'Contagem', written55b: 0 },
  { ibge: '3106200', name: 'Belo Horizonte', written55b: 0 },
  { ibge: '3106705', name: 'Betim', written55b: 0 },
  { ibge: '3144805', name: 'Nova Lima', written55b: 268 },
  { ibge: '3154606', name: 'Ribeirão das Neves', written55b: 313 },
  { ibge: '3168309', name: 'Taquaraçu de Minas', written55b: 95 },
] as const;

function loadLocalEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function paginated<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if ((data ?? []).length < 1000) return all;
  }
}

function strings(rows: AuditIndicator[], key: string): string[] {
  return [...new Set(rows.map((row) => String(row.metadata?.[key] ?? '')).filter(Boolean))].sort();
}

function winner(rows: AuditIndicator[]) {
  const candidates = rows.filter((row) => row.indicador.startsWith('resultado_candidato_2024_') && String(row.metadata?.office).toLowerCase() === 'prefeito');
  if (!candidates.length) return null;
  const decisiveRound = Math.max(...candidates.map((row) => Number(row.metadata?.round)));
  const ranked = candidates.filter((row) => Number(row.metadata?.round) === decisiveRound).sort((a, b) => Number(b.valor) - Number(a.valor));
  if (ranked.length < 2) return null;
  return {
    round: decisiveRound,
    winner: ranked[0].metadata?.ballotName ?? ranked[0].metadata?.candidateName,
    party: ranked[0].metadata?.party,
    status: ranked[0].metadata?.status,
    votes: Number(ranked[0].valor),
    percentage: Number(ranked[0].metadata?.percentage),
    runnerUp: ranked[1].metadata?.ballotName ?? ranked[1].metadata?.candidateName,
    runnerUpStatus: ranked[1].metadata?.status,
    marginVotes: Number(ranked[0].valor) - Number(ranked[1].valor),
    marginPercentagePoints: Number(ranked[0].metadata?.percentage) - Number(ranked[1].metadata?.percentage),
  };
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const region = getCanonicalRegion('RMBH');
  const sampleCodes = SAMPLE.map((item) => item.ibge);
  if (SAMPLE.some((item) => !region.territories.some((member) => member.ibgeCode === item.ibge))) throw new Error('Amostra externa ao registro canônico.');
  const { data: territories, error: territoryError } = await client.from('territories').select('id,codigo_ibge,municipio,uf,metadata').in('codigo_ibge', sampleCodes);
  if (territoryError) throw territoryError;
  if ((territories ?? []).length !== SAMPLE.length) throw new Error('Amostra incompleta no catálogo.');
  const ids = (territories ?? []).map((item) => item.id);
  const indicators = await paginated<AuditIndicator>((start, end) => client.from('territory_indicators').select('territory_id,indicador,valor,source_dataset,source_record_id,periodo_inicio,periodo_fim,metadata').in('territory_id', ids).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end));
  const evidence = await paginated<Record<string, unknown>>((start, end) => client.from('territory_evidence').select('territory_id,source_hash,source_name,source_url,source_external_id,raw_reference,metadata').in('territory_id', ids).eq('tema', 'eleicoes').eq('source_name', 'TSE').range(start, end));
  const runs = await paginated<Record<string, unknown>>((start, end) => client.from('territory_collection_runs').select('territory_id,status,request_id,started_at,finished_at,items_processed,metadata').in('territory_id', ids).eq('source', 'tse').range(start, end));
  const territoryByIbge = new Map((territories ?? []).map((item) => [item.codigo_ibge, item]));
  const audit = SAMPLE.map((sample) => {
    const territory = territoryByIbge.get(sample.ibge)!;
    const rows = indicators.filter((row) => row.territory_id === territory.id);
    const territoryEvidence = evidence.filter((row) => row.territory_id === territory.id);
    const totals = auditTotalInvariants(rows);
    const candidateRows = rows.filter((row) => row.indicador.startsWith('resultado_candidato_'));
    const partyRows = rows.filter((row) => row.indicador.startsWith('resultado_partido_'));
    return {
      territoryId: territory.id,
      name: territory.municipio,
      ibge: territory.codigo_ibge,
      codigoTse: (territory.metadata as Record<string, { codigo_municipio?: string }> | null)?.tse?.codigo_municipio ?? null,
      physicalIndicators: rows.length,
      writtenIn55b: sample.written55b,
      physicalBefore55b: rows.length - sample.written55b,
      evidence: territoryEvidence.length,
      years: [...new Set(rows.map((row) => row.periodo_inicio?.slice(0, 4)))].filter(Boolean).sort(),
      datasets: [...new Set(rows.map((row) => row.source_dataset))].filter(Boolean).sort(),
      offices: strings(rows, 'office').concat(strings(rows, 'cargo')).filter((item, index, array) => array.indexOf(item) === index),
      rounds: [...new Set([...strings(rows, 'round'), ...strings(rows, 'turno')])].sort(),
      candidateCount: new Set(candidateRows.map((row) => String(row.metadata?.candidateId))).size,
      partyCount: new Set(partyRows.map((row) => String(row.metadata?.partyNumber))).size,
      indicatorTypes: [...new Set(rows.map((row) => row.indicador.replace(/_\d{4}_.+$/, '')))].sort(),
      collectionRuns: runs.filter((row) => row.territory_id === territory.id).length,
      winner2024: winner(rows),
      totals,
      anomalies: auditIndicatorRows(rows),
      candidateDuplicates: candidateDuplicateCount(rows),
      evidenceHashesValid: territoryEvidence.every((row) => {
        const externalId = String(row.source_external_id);
        const year = externalId.match(/(\d{4})$/)?.[1] ?? '';
        return row.source_hash === createHash('sha256').update(`${territory.id}|${externalId}|${year}`).digest('hex');
      }),
      evidenceDatasets: territoryEvidence.map((row) => row.source_external_id).sort(),
    };
  });

  const external = [];
  const detail2024 = await downloadTseCsv(2024, 'MG', 'detail');
  const candidate2024 = await downloadTseCsv(2024, 'MG', 'candidate');
  const party2024 = await downloadTseCsv(2024, 'MG', 'party');
  const detail2020 = await downloadTseCsv(2020, 'MG', 'detail');
  for (const ibge of ['3118601', '3106200', '3106705']) {
    const item = audit.find((entry) => entry.ibge === ibge)!;
    const territory: TseTerritoryKey = { codigoIbge: ibge, codigoTse: item.codigoTse!, municipio: item.name, uf: 'MG' };
    const bankRows = indicators.filter((row) => row.territory_id === item.territoryId);
    const totals = aggregateElectionTotals(detail2024.rowsByMunicipality.get(territory.codigoTse) ?? [], territory);
    const valid = new Map(totals.map((row) => [`${row.year}|${row.round}|${row.officeCode}`, row.validVotes]));
    const candidates = aggregateCandidateResults(candidate2024.rowsByMunicipality.get(territory.codigoTse) ?? [], territory, valid);
    const parties = aggregatePartyResults(party2024.rowsByMunicipality.get(territory.codigoTse) ?? [], territory);
    const bankElectorate = bankRows.find((row) => row.indicador === 'eleitorado_total_2024_t1_c11');
    const sourceElectorate = totals.find((row) => row.round === 1 && row.office.toLowerCase() === 'prefeito')?.electorate;
    const bankCandidateVotes = bankRows.filter((row) => row.indicador.startsWith('resultado_candidato_2024_t1_c11_')).reduce((sum, row) => sum + Number(row.valor), 0);
    const sourceCandidateVotes = candidates.filter((row) => row.round === 1 && row.office.toLowerCase() === 'prefeito').reduce((sum, row) => sum + row.votes, 0);
    external.push({ ibge, year: 2024, bankElectorate: Number(bankElectorate?.valor), sourceElectorate, bankCandidateVotes, sourceCandidateVotes, partyRows: parties.length, pass: Number(bankElectorate?.valor) === sourceElectorate && bankCandidateVotes === sourceCandidateVotes });
  }
  const historicalItem = audit.find((entry) => entry.ibge === '3118601')!;
  const historicalTerritory: TseTerritoryKey = { codigoIbge: historicalItem.ibge, codigoTse: historicalItem.codigoTse!, municipio: historicalItem.name, uf: 'MG' };
  const source2020 = aggregateElectionTotals(detail2020.rowsByMunicipality.get(historicalTerritory.codigoTse) ?? [], historicalTerritory).find((row) => row.round === 1 && row.office.toLowerCase() === 'prefeito');
  const bank2020 = indicators.find((row) => row.territory_id === historicalItem.territoryId && row.indicador === 'eleitorado_total_2020_t1_c11');
  external.push({ ibge: historicalItem.ibge, year: 2020, bankElectorate: Number(bank2020?.valor), sourceElectorate: source2020?.electorate, pass: Number(bank2020?.valor) === source2020?.electorate });

  console.log(JSON.stringify({
    sampleCriterion: 'Taquaraçu de Minas: menor inventário físico do Bloco 5.5B (95 indicadores).',
    audit,
    global: {
      physicalIndicators: indicators.length,
      physicalEvidence: evidence.length,
      indicatorDuplicates: duplicateCount(indicators.map(indicatorNaturalKey)),
      evidenceDuplicates: duplicateCount(evidence.map((row) => [row.territory_id, row.source_hash].join('|'))),
      runningOrphans: runs.filter((row) => row.status === 'running').length,
      externalTerritories: (territories ?? []).filter((row) => !region.territories.some((member) => member.ibgeCode === row.codigo_ibge)).length,
      criticalAnomalies: audit.flatMap((item) => item.anomalies).filter((item) => item.severity === 'CRITICAL').length,
      candidateDuplicates: audit.reduce((sum, item) => sum + item.candidateDuplicates, 0),
    },
    external,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
