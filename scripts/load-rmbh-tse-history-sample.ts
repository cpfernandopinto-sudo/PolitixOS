import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '../lib/supabaseClient';
import { runTseMultiCollection } from '../lib/territorios/tse-collector';
import { deriveMayoralOutcome, type TseCandidateResult } from '../lib/territorios/tse-normalizer';

export const HISTORY_SAMPLE = [
  { codigoIbge: '3118601', municipio: 'Contagem' },
  { codigoIbge: '3106200', municipio: 'Belo Horizonte' },
  { codigoIbge: '3106705', municipio: 'Betim' },
  { codigoIbge: '3144805', municipio: 'Nova Lima' },
  { codigoIbge: '3154606', municipio: 'Ribeirão das Neves' },
  { codigoIbge: '3168309', municipio: 'Taquaraçu de Minas' },
] as const;

function loadLocalEnv(): void {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

interface IndicatorRow {
  territory_id: string;
  indicador: string;
  valor: number | string | null;
  source_dataset: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  metadata: Record<string, unknown> | null;
}

async function paginated<T>(query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const output: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    output.push(...(data ?? []));
    if ((data ?? []).length < 1000) return output;
  }
}

function duplicateCount(keys: string[]): number {
  return keys.length - new Set(keys).size;
}

function asCandidate(row: IndicatorRow): TseCandidateResult {
  const metadata = row.metadata ?? {};
  return {
    year: Number(metadata.year), round: Number(metadata.round), officeCode: String(metadata.officeCode), office: String(metadata.office),
    candidateId: String(metadata.candidateId), candidateNumber: String(metadata.candidateNumber), candidateName: String(metadata.candidateName),
    ballotName: String(metadata.ballotName), partyNumber: String(metadata.partyNumber), party: String(metadata.party), partyName: String(metadata.partyName),
    votes: Number(row.valor), validVotes: Number(metadata.validVotes), percentage: Number(metadata.percentage), statusCode: String(metadata.statusCode), status: String(metadata.status),
  };
}

async function snapshot(client: ReturnType<typeof createAdminClient>, territoryIds: string[]) {
  const indicators = await paginated<IndicatorRow>((start, end) => client.from('territory_indicators').select('territory_id,indicador,valor,source_dataset,periodo_inicio,periodo_fim,metadata').in('territory_id', territoryIds).eq('categoria', 'eleicoes').eq('fonte', 'TSE').range(start, end));
  const evidence = await paginated<Record<string, unknown>>((start, end) => client.from('territory_evidence').select('territory_id,source_hash,source_external_id,source_name,source_url,raw_reference').in('territory_id', territoryIds).eq('tema', 'eleicoes').eq('source_name', 'TSE').range(start, end));
  return { indicators, evidence };
}

export async function executeHistoricalSample() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as ReturnType<typeof createAdminClient>;
  const { data: territories, error } = await client.from('territories').select('id,codigo_ibge,municipio').in('codigo_ibge', HISTORY_SAMPLE.map((item) => item.codigoIbge));
  if (error) throw error;
  if ((territories ?? []).length !== HISTORY_SAMPLE.length) throw new Error('Amostra territorial incompleta.');
  const ids = (territories ?? []).map((row) => row.id as string);
  const before = await snapshot(client, ids);
  const first = await runTseMultiCollection(client, HISTORY_SAMPLE.map((item) => ({ codigoIbge: item.codigoIbge, years: [2016, 2020, 2024] })));
  const afterFirst = await snapshot(client, ids);
  const second = await runTseMultiCollection(client, HISTORY_SAMPLE.map((item) => ({ codigoIbge: item.codigoIbge, years: [2016, 2020, 2024] })));
  const afterSecond = await snapshot(client, ids);
  const territoryById = new Map((territories ?? []).map((row) => [row.id as string, row]));
  const inventory = HISTORY_SAMPLE.map((sample) => {
    const territory = (territories ?? []).find((row) => row.codigo_ibge === sample.codigoIbge)!;
    const rows = afterSecond.indicators.filter((row) => row.territory_id === territory.id);
    const byYear = [2016, 2020, 2024].map((year) => {
      const candidates = rows.filter((row) => row.indicador.startsWith(`resultado_candidato_${year}_`));
      const parties = rows.filter((row) => row.indicador.startsWith(`resultado_partido_${year}_`));
      const outcome = deriveMayoralOutcome(candidates.map(asCandidate), year);
      return { year, candidates: candidates.length, parties: parties.length, outcome };
    });
    return { municipio: sample.municipio, codigoIbge: sample.codigoIbge, byYear };
  });
  const indicatorKey = (row: IndicatorRow) => [row.territory_id, row.indicador, row.source_dataset, row.periodo_inicio, row.periodo_fim].join('|');
  const candidateKey = (row: IndicatorRow) => [row.territory_id, row.metadata?.year, row.metadata?.round, row.metadata?.officeCode, row.metadata?.candidateId].join('|');
  const result = {
    before: { indicators: before.indicators.length, evidence: before.evidence.length },
    first: {
      persistedOperations: first.results.reduce((sum, item) => sum + item.indicatorsPersisted, 0),
      insertsByInventory: afterFirst.indicators.length - before.indicators.length,
      evidenceAdded: afterFirst.evidence.length - before.evidence.length,
      statuses: first.results.map((item) => ({ municipio: item.territory.municipio, status: item.overallStatus, persisted: item.indicatorsPersisted, reconciliation: item.indicatorReconciliation, evidence: item.evidencePersisted })),
    },
    second: {
      persistedOperations: second.results.reduce((sum, item) => sum + item.indicatorsPersisted, 0),
      insertsByInventory: afterSecond.indicators.length - afterFirst.indicators.length,
      evidenceAdded: afterSecond.evidence.length - afterFirst.evidence.length,
      statuses: second.results.map((item) => ({ municipio: item.territory.municipio, status: item.overallStatus, persisted: item.indicatorsPersisted, reconciliation: item.indicatorReconciliation, evidence: item.evidencePersisted })),
    },
    after: { indicators: afterSecond.indicators.length, evidence: afterSecond.evidence.length },
    inventory,
    audit: {
      indicatorDuplicates: duplicateCount(afterSecond.indicators.map(indicatorKey)),
      candidateDuplicates: duplicateCount(afterSecond.indicators.filter((row) => row.indicador.startsWith('resultado_candidato_')).map(candidateKey)),
      evidenceDuplicates: duplicateCount(afterSecond.evidence.map((row) => `${row.territory_id}|${row.source_hash}`)),
      historicalEvidence: afterSecond.evidence.filter((row) => /_(2016|2020)$/.test(String(row.source_external_id))).length,
      officialStatusContradictions: inventory.flatMap((item) => item.byYear).filter((item) => item.outcome && !item.outcome.officialStatusValidated).length,
      externalTerritories: [...new Set(afterSecond.indicators.map((row) => row.territory_id))].filter((id) => !territoryById.has(id)).length,
    },
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}
