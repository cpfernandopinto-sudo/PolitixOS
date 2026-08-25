import { describe, expect, it, vi, beforeEach } from 'vitest';

function chain(result: { data: unknown; error: unknown; count?: number }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.ilike = vi.fn(self);
  c.order = vi.fn(self);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

/** Cliente fake roteado por nome de tabela — cada tabela tem sua própria fila de respostas (uma por chamada, na ordem em que o código as faz). */
function makeClient(responses: Record<string, Array<{ data: unknown; error: unknown; count?: number }>>) {
  const cursors: Record<string, number> = {};
  const from = vi.fn((table: string) => {
    const queue = responses[table];
    if (!queue) throw new Error(`Tabela inesperada no teste: ${table}`);
    const i = cursors[table] ?? 0;
    cursors[table] = Math.min(i + 1, queue.length - 1);
    return chain(queue[Math.min(i, queue.length - 1)]);
  });
  return { from } as never;
}

let sharedClient: ReturnType<typeof makeClient>;

vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => sharedClient,
  createClient: () => sharedClient,
}));

// Importado depois do mock, como results-repository.test.ts já faz.
const { getElectoralSignalsSummaryForCandidate } = await import('./monitoring');

const cleitinhoPoll = {
  id: 'poll-mg-jul', tse_registration_number: 'MG034902026', source: 'TSE/PesqEle', source_url: null,
  source_dataset: 'pesquisas-eleitorais-2026', election_year: 2026, uf: 'MG', municipio: null,
  cargo: 'Governador, Senador', abrangencia: 'MINAS GERAIS', instituto: 'QUAEST', contratante: null,
  pagante: null, valor: null, metodologia: null, data_registro: '2026-07-22', campo_inicio: '2026-07-22',
  campo_fim: '2026-07-26', amostra: 1482, margem_erro: null, nivel_confianca: null, raw_source_row: null,
  ingested_at: '2026-08-19T00:00:00.000Z', created_at: '2026-08-19T00:00:00.000Z', updated_at: '2026-08-19T00:00:00.000Z',
};

function raceResultRow(candidateName: string, percentage: number, candidateId: string | null) {
  return {
    id: `res-${candidateName}`, poll_id: 'poll-mg-jul', cenario: 'Cenário 1 (com Cleitinho)', turno: 1,
    tipo_pergunta: 'estimulada', candidate_name: candidateName, percentage, office: 'Governador',
    result_type: 'STIMULATED', candidate_id: candidateId, source_name: 'Genial/Quaest', source_url: null,
    source_date: '2026-07-26', collected_at: '2026-08-19T00:00:00.000Z', provenance: {}, verified: true,
    poll: cleitinhoPoll,
  };
}

beforeEach(() => {
  sharedClient = undefined as never;
});

describe('getElectoralSignalsSummaryForCandidate — resolução por candidate_id (Fase 1 da auditoria MG/Governador)', () => {
  it('resolve a corrida direto por candidate_id, mesmo com nome divergente entre target e resultado ("Cleitinho Azevedo" vs "Cleitinho")', async () => {
    sharedClient = makeClient({
      electoral_poll_results: [
        // 1ª chamada: resolveCandidateRaceContext(candidateId)
        { data: [{ office: 'Governador', poll: { uf: 'MG', cargo: 'Governador, Senador', campo_inicio: '2026-07-22', data_registro: '2026-07-22' } }], error: null },
        // 2ª chamada: getPriorityRacePolls('MG', 'Governador')
        { data: [raceResultRow('Cleitinho', 35, 'target-cleitinho'), raceResultRow('Alexandre Kalil', 12, null)], error: null },
      ],
      electoral_polls: [
        // countRegisteredPolls('MG', 'Governador')
        { data: null, error: null, count: 28 },
      ],
    });

    const summaries = await getElectoralSignalsSummaryForCandidate(
      sharedClient,
      'Cleitinho Azevedo',
      'target-cleitinho'
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].currentPercentage).toBe(35);
    expect(summaries[0].leader).toBe('Cleitinho');
    expect(summaries[0].registeredPollsCount).toBe(28);
    expect(summaries[0].pollsWithResultsCount).toBe(1);
    // Nunca "Sem dados": há resultado real, mesmo sem série comparável.
    expect(summaries[0].comparability).toBe('insufficient');
  });

  it('sem candidate_id vinculado a nenhum resultado ainda → cai para o fallback por nome/monitoramento (comportamento preservado)', async () => {
    sharedClient = makeClient({
      electoral_poll_results: [
        // resolveCandidateRaceContext(candidateId) não encontra nada
        { data: [], error: null },
        // getPriorityRacePolls('MG', 'Governador') via fallback de target
        { data: [raceResultRow('Cleitinho', 35, null), raceResultRow('Alexandre Kalil', 12, null)], error: null },
      ],
      targets: [
        { data: [{ id: 't1', candidate_name: 'Cleitinho Azevedo', keywords: 'Cleitinho, senador Cleitinho', state: 'MG', poll_monitoring_office: 'Governador' }], error: null },
      ],
      electoral_polls: [{ data: null, error: null, count: 28 }],
    });

    const summaries = await getElectoralSignalsSummaryForCandidate(
      sharedClient,
      'Cleitinho Azevedo',
      'target-sem-resultado-ainda'
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].currentPercentage).toBe(35);
  });

  it('candidato não monitorado e sem candidate_id em nenhum resultado → []', async () => {
    sharedClient = makeClient({
      electoral_poll_results: [{ data: [], error: null }],
      targets: [{ data: [], error: null }],
    });

    const summaries = await getElectoralSignalsSummaryForCandidate(sharedClient, 'Candidato Desconhecido', 'id-x');
    expect(summaries).toEqual([]);
  });
});
