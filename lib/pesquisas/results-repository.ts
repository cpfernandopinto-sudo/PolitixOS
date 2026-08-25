import { createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralPoll, ElectoralPollResult, ElectoralPollResultUpsert } from './types';
import { arePollsComparable, areScenariosEquivalent } from './comparability';

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
 * vários, isso seria inventar comparabilidade.
 *
 * PESQUISAS-N8N-01 (correção pós-validação real): entre as pesquisas
 * elegíveis, só entram na série as que são REALMENTE comparáveis entre si —
 * mesmo cargo/UF (arePollsComparable) e mesmo conjunto de candidatos no
 * cenário (areScenariosEquivalent), ancorado na leitura mais recente. É o
 * mesmo par de funções de comparability.ts já usado por
 * calculateCockpitMetrics (cockpitAnalytics.ts) para montar `comparablePolls`
 * — reaproveitado aqui, não uma heurística nova. Achado real que motivou a
 * correção: Michelle Bolsonaro/Senado/DF tem 3 leituras (Instituto Opinião,
 * Paraná Pesquisas, Real Time Big Data) cada uma com metodologia de cenário
 * diferente (a própria `provenance` de cada resultado já avisa isso) — antes
 * desta correção, a série desenhava 38,8%→36%→25% como se fosse uma
 * tendência única; `calculateCockpitMetrics`/`deriveElectoralSignals` já
 * recusavam essa mesma comparação (`hasSufficientSeries=false`), então a
 * Visão Executiva estava sendo mais permissiva que o resto do módulo.
 * Continua exigindo 2+ pesquisas comparáveis para produzir série.
 */
export function buildTemporalSeries(polls: PriorityRacePoll[]): TemporalSeriesEntry[] {
  const eligible = polls.filter((p) => {
    const t1 = p.results.filter((r) => r.turno === 1 && r.tipoPergunta === 'estimulada');
    if (t1.length === 0) return false;
    const cenarios = new Set(t1.map((r) => r.cenario));
    return cenarios.size === 1;
  });
  if (eligible.length < 2) return [];

  const eligibleDesc = [...eligible].sort((a, b) => (b.campoInicio ?? '').localeCompare(a.campoInicio ?? ''));
  const anchor = eligibleDesc[0];
  const anchorT1 = anchor.results.filter((r) => r.turno === 1 && r.tipoPergunta === 'estimulada');

  const comparable = eligibleDesc.filter((p) => {
    if (p.id === anchor.id) return true;
    if (!arePollsComparable(anchor, p)) return false;
    const pT1 = p.results.filter((r) => r.turno === 1 && r.tipoPergunta === 'estimulada');
    return areScenariosEquivalent(anchorT1, pT1);
  });
  if (comparable.length < 2) return [];

  const sorted = [...comparable].sort((a, b) => (a.campoInicio ?? '').localeCompare(b.campoInicio ?? ''));
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
  // Fase 1 da auditoria MG/Governador (2026-08-24): esta função só é chamada de código de
  // servidor (app/dashboard/pesquisas/executivo/page.tsx e lib/pesquisas/monitoring.ts, nunca de
  // um Client Component). Usava `createClient()` (createBrowserClient, pensado para o navegador)
  // dentro de um contexto server-only — inconsistente com o resto do módulo, que sempre lê
  // electoral_polls/electoral_poll_results com o client admin no servidor. Trocado por
  // createAdminClient() para eliminar essa divergência (RLS das duas tabelas já é "allow all",
  // então o resultado dos dados não muda — só a robustez/consistência de qual client é usado).
  const client = createAdminClient();

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

export interface CandidateRaceContext {
  uf: string;
  cargo: string;
}

/**
 * Total de pesquisas REGISTRADAS (TSE, ficha técnica) para uf+cargo — não
 * confundir com `getPriorityRacePolls`, que só retorna pesquisas que já TÊM
 * resultado. Usado para a Visão Geral/Cockpit mostrarem "28 registradas · 2
 * com resultado" em vez de tratar as duas contagens como a mesma coisa
 * (Fase 3/8 da auditoria MG/Governador).
 */
export async function countRegisteredPolls(uf: string, cargoLike: string): Promise<number> {
  const client = createAdminClient();
  const { count, error } = await client
    .from('electoral_polls')
    .select('id', { count: 'exact', head: true })
    .eq('uf', uf)
    .ilike('cargo', `%${cargoLike}%`);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Fase 1 da auditoria MG/Governador — resolve a corrida (uf/cargo) real de um
 * candidato diretamente a partir de `electoral_poll_results.candidate_id`,
 * que é a fonte de verdade primária de "este candidato tem resultado nesta
 * pesquisa" (preenchida em `ingestRaceResults`/`upsertPollResult`). Não
 * depende de `targets.poll_monitoring_office` nem de casar nome de
 * candidato — evita a Visão Geral ficar refém de um matcher de nome
 * (ex.: "Cleitinho" no resultado vs. "Cleitinho Azevedo" no target) quando o
 * vínculo por id já existe. Retorna `null` quando o candidato ainda não tem
 * nenhum resultado vinculado — nesse caso o chamador cai para o fallback por
 * nome/monitoramento (`targetMatcher.ts`), que continua funcionando como
 * antes.
 */
export async function resolveCandidateRaceContext(candidateId: string): Promise<CandidateRaceContext | null> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('electoral_poll_results')
    .select('office, poll:electoral_polls!inner(uf, cargo, campo_inicio, data_registro)')
    .eq('candidate_id', candidateId);

  if (error || !data || data.length === 0) return null;

  type Row = { office: string | null; poll: { uf: string | null; cargo: string | null; campo_inicio: string | null; data_registro: string | null } | null };
  const rows = data as unknown as Row[];

  const withRace = rows.filter((r) => r.poll?.uf && (r.office || r.poll?.cargo));
  if (withRace.length === 0) return null;

  const sorted = [...withRace].sort((a, b) => {
    const da = a.poll?.campo_inicio ?? a.poll?.data_registro ?? '';
    const db = b.poll?.campo_inicio ?? b.poll?.data_registro ?? '';
    return db.localeCompare(da);
  });

  const mostRecent = sorted[0];
  const uf = mostRecent.poll!.uf!;
  const cargo = mostRecent.office ?? mostRecent.poll!.cargo!;

  return { uf, cargo };
}
