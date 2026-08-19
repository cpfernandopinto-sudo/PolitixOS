import { createClient, createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralPoll, ElectoralPollResult, ElectoralPollResultUpsert } from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Upsert idempotente por chave natural — (poll_id, cenario, turno,
 * tipo_pergunta, candidate_name). Não é um UNIQUE constraint no banco
 * (percentuais legitimamente repetem entre candidatos diferentes; a chave
 * natural é o que torna uma linha "a mesma" entre reingestões), então a
 * checagem é feita aqui antes de decidir INSERT vs. UPDATE.
 */
export async function upsertPollResult(
  client: AdminClient,
  result: ElectoralPollResultUpsert
): Promise<{ id: string; created: boolean }> {
  const { data: existing } = await client
    .from('electoral_poll_results')
    .select('id')
    .eq('poll_id', result.pollId)
    .eq('cenario', result.cenario)
    .eq('turno', result.turno)
    .eq('tipo_pergunta', result.tipoPergunta)
    .eq('candidate_name', result.candidateName)
    .maybeSingle();

  const row = {
    poll_id: result.pollId,
    cenario: result.cenario,
    turno: result.turno,
    tipo_pergunta: result.tipoPergunta,
    candidate_name: result.candidateName,
    percentage: result.percentage,
    office: result.office,
    result_type: result.resultType,
    candidate_id: result.candidateId,
    source_name: result.sourceName,
    source_url: result.sourceUrl,
    source_date: result.sourceDate,
    provenance: result.provenance,
    verified: result.verified,
  };

  if (existing?.id) {
    const { error } = await client.from('electoral_poll_results').update(row).eq('id', existing.id);
    if (error) throw new Error(`Falha ao atualizar resultado: ${error.message}`);
    return { id: existing.id as string, created: false };
  }

  const { data: inserted, error } = await client.from('electoral_poll_results').insert(row).select('id').single();
  if (error || !inserted) throw new Error(`Falha ao gravar resultado: ${error?.message}`);
  return { id: inserted.id as string, created: true };
}

export interface PriorityRacePoll extends ElectoralPoll {
  results: ElectoralPollResult[];
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
    office: (row.office as string | null) ?? null,
    resultType: (row.result_type as ElectoralPollResult['resultType']) ?? null,
    candidateId: (row.candidate_id as string | null) ?? null,
    sourceName: (row.source_name as string | null) ?? null,
    sourceUrl: (row.source_url as string | null) ?? null,
    sourceDate: (row.source_date as string | null) ?? null,
    collectedAt: row.collected_at as string,
    provenance: (row.provenance as Record<string, unknown>) ?? {},
    verified: Boolean(row.verified),
  };
}

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
    rawSourceRow: (row.raw_source_row as Record<string, string> | null) ?? null,
    ingestedAt: row.ingested_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Pesquisas de uma corrida prioritária (PARTE 4/5/6) que TÊM resultado
 * integrado, mais recentes primeiro — usado pelas visões executivas.
 * `cargo` casa por `ilike '%valor%'` porque a fonte armazena cargo como
 * string multi-valor bruta (ex.: "Governador, Senador") — ver
 * CLAUDE_PESQUISAS_01A_CORE_TSE.md §3.
 */
export async function getPriorityRacePolls(uf: string, cargoLike: string): Promise<PriorityRacePoll[]> {
  const client = createClient();

  const { data: pollRows, error: pollError } = await client
    .from('electoral_polls')
    .select('*')
    .eq('uf', uf)
    .ilike('cargo', `%${cargoLike}%`)
    .order('data_registro', { ascending: false, nullsFirst: false });

  if (pollError || !pollRows) return [];

  const polls = pollRows.map(mapPollRow);
  const pollIds = polls.map((p) => p.id);
  if (pollIds.length === 0) return [];

  const { data: resultRows } = await client.from('electoral_poll_results').select('*').in('poll_id', pollIds);
  const resultsByPoll = new Map<string, ElectoralPollResult[]>();
  for (const row of (resultRows ?? []).map(mapResultRow)) {
    const list = resultsByPoll.get(row.pollId) ?? [];
    list.push(row);
    resultsByPoll.set(row.pollId, list);
  }

  return polls
    .map((poll) => ({ ...poll, results: resultsByPoll.get(poll.id) ?? [] }))
    .filter((p) => p.results.length > 0);
}
