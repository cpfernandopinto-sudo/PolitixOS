import { createClient, createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralPoll, ElectoralPollResult, PesquisasFilters, PesquisasKpis } from './types';
import { getLastCollectorRun } from './collector';

function mapPollRow(row: Record<string, unknown>): ElectoralPoll {
  return {
    id: row.id as string,
    tseRegistrationNumber: row.tse_registration_number as string,
    source: row.source as string,
    sourceUrl: (row.source_url as string | null) ?? null,
    sourceDataset: row.source_dataset as string,
    electionYear: row.election_year as number,
    uf: (row.uf as string | null) ?? null,
    municipio: (row.municipio as string | null) ?? null,
    cargo: (row.cargo as string | null) ?? null,
    abrangencia: (row.abrangencia as string | null) ?? null,
    instituto: (row.instituto as string | null) ?? null,
    contratante: (row.contratante as string | null) ?? null,
    pagante: (row.pagante as string | null) ?? null,
    valor: (row.valor as number | null) ?? null,
    metodologia: (row.metodologia as string | null) ?? null,
    dataRegistro: (row.data_registro as string | null) ?? null,
    campoInicio: (row.campo_inicio as string | null) ?? null,
    campoFim: (row.campo_fim as string | null) ?? null,
    amostra: (row.amostra as number | null) ?? null,
    margemErro: (row.margem_erro as number | null) ?? null,
    nivelConfianca: (row.nivel_confianca as number | null) ?? null,
    ingestedAt: row.ingested_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapResultRow(row: Record<string, unknown>): ElectoralPollResult {
  return {
    id: row.id as string,
    pollId: row.poll_id as string,
    cenario: row.cenario as string,
    turno: row.turno as number,
    tipoPergunta: row.tipo_pergunta as ElectoralPollResult['tipoPergunta'],
    candidateName: row.candidate_name as string,
    percentage: Number(row.percentage),
  };
}

export async function listPolls(filters?: PesquisasFilters): Promise<ElectoralPoll[]> {
  const client = createClient();
  let query = client.from('electoral_polls').select('*').order('data_registro', { ascending: false, nullsFirst: false });

  if (filters?.electionYear) query = query.eq('election_year', filters.electionYear);
  if (filters?.uf) query = query.eq('uf', filters.uf);
  if (filters?.municipio) query = query.eq('municipio', filters.municipio);
  if (filters?.cargo) query = query.eq('cargo', filters.cargo);
  if (filters?.instituto) query = query.eq('instituto', filters.instituto);

  const { data, error } = await query;
  if (error) {
    console.error('[pesquisas] listPolls error:', error.message);
    return [];
  }
  return (data ?? []).map(mapPollRow);
}

export async function getPollById(id: string): Promise<ElectoralPoll | null> {
  const client = createClient();
  const { data, error } = await client.from('electoral_polls').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapPollRow(data);
}

export async function getPollResults(pollId: string): Promise<ElectoralPollResult[]> {
  const client = createClient();
  const { data, error } = await client.from('electoral_poll_results').select('*').eq('poll_id', pollId);
  if (error) {
    console.error('[pesquisas] getPollResults error:', error.message);
    return [];
  }
  return (data ?? []).map(mapResultRow);
}

/**
 * KPIs honestos (PARTE 17): cada número vem de uma contagem/consulta real.
 * `sourceStatus`/`lastSyncAt` refletem a última execução real do coletor
 * (`source_collection_runs`) — nunca "0 pesquisas" silencioso quando na
 * verdade a fonte está bloqueada (PARTE 32).
 */
export async function getPesquisasKpis(): Promise<PesquisasKpis> {
  const client = createClient();

  const [{ count: totalPolls }, { count: recentPolls30d }, { data: institutesRows }, { data: ufRows }, { data: cargoRows }, { data: lastRegRows }] =
    await Promise.all([
      client.from('electoral_polls').select('id', { count: 'exact', head: true }),
      client
        .from('electoral_polls')
        .select('id', { count: 'exact', head: true })
        .gte('data_registro', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
      client.from('electoral_polls').select('instituto').not('instituto', 'is', null),
      client.from('electoral_polls').select('uf').not('uf', 'is', null),
      client.from('electoral_polls').select('cargo').not('cargo', 'is', null),
      client.from('electoral_polls').select('data_registro').not('data_registro', 'is', null).order('data_registro', { ascending: false }).limit(1),
    ]);

  const institutesCount = new Set((institutesRows ?? []).map((r: { instituto: string }) => r.instituto)).size;
  const ufsCovered = new Set((ufRows ?? []).map((r: { uf: string }) => r.uf)).size;

  const cargoCounts = new Map<string, number>();
  for (const row of (cargoRows ?? []) as { cargo: string }[]) {
    cargoCounts.set(row.cargo, (cargoCounts.get(row.cargo) ?? 0) + 1);
  }
  let topCargo: string | null = null;
  let topCargoCount = 0;
  for (const [cargo, count] of cargoCounts) {
    if (count > topCargoCount) {
      topCargo = cargo;
      topCargoCount = count;
    }
  }

  const lastRun = await getLastCollectorRun(createAdminClient());
  const sourceStatus: PesquisasKpis['sourceStatus'] = !lastRun
    ? 'NEVER_RUN'
    : lastRun.status === 'completed'
      ? 'OK'
      : 'BLOCKED_BY_SOURCE_ACCESS';

  return {
    totalPolls: totalPolls ?? 0,
    recentPolls30d: recentPolls30d ?? 0,
    institutesCount,
    lastRegistrationDate: (lastRegRows?.[0] as { data_registro: string } | undefined)?.data_registro ?? null,
    ufsCovered,
    topCargo,
    sourceStatus,
    lastSyncAt: lastRun?.finished_at ?? null,
  };
}
