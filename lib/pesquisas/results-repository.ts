import { createClient, createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralPoll, ElectoralPollResult, ElectoralPollResultUpsert } from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Upsert idempotente por chave natural — (poll_id, cenario, turno,
 * tipo_pergunta, candidate_name, office). Não é um UNIQUE constraint no
 * banco (percentuais legitimamente repetem entre candidatos diferentes; a
 * chave natural é o que torna uma linha "a mesma" entre reingestões), então
 * a checagem é feita aqui antes de decidir INSERT vs. UPDATE.
 *
 * PESQUISAS-N8N-01 Fase 10: `office` entra na checagem porque uma mesma
 * pesquisa multi-cargo pode, em tese, ter Governador e Senador com o mesmo
 * `cenario`/`turno`/`tipo_pergunta` e por coincidência o mesmo nome de
 * candidato — sem `office` na chave, o segundo upsert sobrescreveria o
 * primeiro por engano. Verificado contra produção (2026-08-23): 0 colisões
 * reais nas 205 linhas existentes, mas o pipeline seletivo passa a gravar
 * resultado continuamente, então corrigimos preventivamente em vez de
 * esperar o bug acontecer. Quando `office` é null (linhas antigas/legado),
 * a comparação usa `is(null)` para não quebrar a compatibilidade.
 */
export async function upsertPollResult(
  client: AdminClient,
  result: ElectoralPollResultUpsert
): Promise<{ id: string; created: boolean }> {
  let query = client
    .from('electoral_poll_results')
    .select('id')
    .eq('poll_id', result.pollId)
    .eq('cenario', result.cenario)
    .eq('turno', result.turno)
    .eq('tipo_pergunta', result.tipoPergunta)
    .eq('candidate_name', result.candidateName);
  query = result.office ? query.eq('office', result.office) : query.is('office', null);
  const { data: existing } = await query.maybeSingle();

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

export interface TemporalPoint {
  pollId: string;
  date: string | null;
  percentage: number;
}

export interface TemporalSeriesEntry {
  candidateName: string;
  points: TemporalPoint[];
}

/**
 * Série temporal real (PESQUISAS-DATA-02) — só inclui uma pesquisa quando
 * ela tem exatamente 1 cenário de 1º turno estimulado (leitura principal
 * sem ambiguidade). Pesquisas com cenários fragmentados (ex.: MG/abril,
 * que testa Cleitinho contra um adversário por vez) ficam de fora
 * automaticamente — nunca escolhemos um cenário "representativo" entre
 * vários, isso seria inventar comparabilidade. Exige 2+ pesquisas elegíveis.
 */
export function buildTemporalSeries(polls: PriorityRacePoll[]): TemporalSeriesEntry[] {
  const eligible = polls.filter((p) => {
    const t1 = p.results.filter((r) => r.turno === 1 && r.tipoPergunta === 'estimulada');
    if (t1.length === 0) return false;
    const cenarios = new Set(t1.map((r) => r.cenario));
    return cenarios.size === 1;
  });
  if (eligible.length < 2) return [];

  const sorted = [...eligible].sort((a, b) => (a.campoInicio ?? '').localeCompare(b.campoInicio ?? ''));
  const byCandidate = new Map<string, TemporalPoint[]>();
  for (const poll of sorted) {
    const t1 = poll.results.filter((r) => r.turno === 1 && r.tipoPergunta === 'estimulada');
    for (const r of t1) {
      const list = byCandidate.get(r.candidateName) ?? [];
      list.push({ pollId: poll.id, date: poll.campoInicio, percentage: r.percentage });
      byCandidate.set(r.candidateName, list);
    }
  }
  return Array.from(byCandidate.entries()).map(([candidateName, points]) => ({ candidateName, points }));
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

  // Filtra electoral_poll_results (tabela pequena, ~centenas de linhas) via
  // join embutido em vez de primeiro listar TODAS as pesquisas registradas
  // da corrida (centenas a milhares, ex.: BR/Presidente tem 626) e montar
  // um .in('poll_id', [...]) com centenas de UUIDs — isso excede o limite
  // de headers HTTP do PostgREST (16KB) e falha silenciosamente,
  // retornando [] mesmo havendo resultado real (PESQUISAS-03, bug real
  // encontrado ao rodar a consulta contra o banco de produção: BR
  // retornava 0 pesquisas mesmo com 2 pesquisas verificadas no banco).
  const { data: rows, error } = await client
    .from('electoral_poll_results')
    .select('*, poll:electoral_polls!inner(*)')
    .eq('poll.uf', uf)
    .ilike('poll.cargo', `%${cargoLike}%`);

  if (error || !rows) return [];

  const targetCargo = cargoLike.toLowerCase().trim();
  const pollsById = new Map<string, ElectoralPoll>();
  const resultsByPoll = new Map<string, ElectoralPollResult[]>();
  for (const row of rows as Record<string, unknown>[]) {
    const res = mapResultRow(row);
    if (res.office) {
      const resOffice = res.office.toLowerCase().trim();
      if (!resOffice.includes(targetCargo) && !targetCargo.includes(resOffice)) {
        continue;
      }
    }
    const poll = mapPollRow(row.poll as Record<string, unknown>);
    pollsById.set(poll.id, poll);
    const list = resultsByPoll.get(poll.id) ?? [];
    list.push(res);
    resultsByPoll.set(poll.id, list);
  }

  return Array.from(pollsById.values())
    .map((poll) => ({ ...poll, results: resultsByPoll.get(poll.id) ?? [] }))
    .filter((poll) => poll.results.length > 0)
    .sort((a, b) => (b.dataRegistro ?? '').localeCompare(a.dataRegistro ?? ''));
}
