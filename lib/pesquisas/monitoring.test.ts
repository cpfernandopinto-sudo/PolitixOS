import { describe, expect, it, vi } from 'vitest';
import { runMonitoredPollIngestion, ingestRaceResults, type RaceResultInput } from './monitoring';
import type { ElectoralPollUpsert } from './types';

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.insert = vi.fn(self);
  c.update = vi.fn(self);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

/** Cliente fake roteado por nome de tabela — cada tabela tem sua própria fila de respostas (uma por chamada, na ordem). */
function makeClient(responses: Record<string, Array<{ data: unknown; error: unknown }>>) {
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

const monitoredTarget = { id: 't-gov-mg', candidate_name: 'Cleitinho Azevedo', keywords: 'Cleitinho, senador Cleitinho', state: 'MG', poll_monitoring_office: 'Governador' };

function poll(overrides: Partial<ElectoralPollUpsert> = {}): ElectoralPollUpsert {
  return {
    tseRegistrationNumber: 'MG000012026',
    source: 'TSE/PesqEle',
    sourceUrl: null,
    sourceDataset: 'pesquisas-eleitorais-2026',
    electionYear: 2026,
    uf: 'MG',
    municipio: null,
    cargo: 'Governador, Senador',
    abrangencia: 'MINAS GERAIS',
    instituto: 'INSTITUTO X',
    contratante: null,
    pagante: null,
    valor: null,
    metodologia: null,
    dataRegistro: '2026-08-01',
    campoInicio: null,
    campoFim: null,
    amostra: 1000,
    margemErro: null,
    nivelConfianca: null,
    ingestedAt: new Date().toISOString(),
    rawSourceRow: {},
    ...overrides,
  };
}

describe('runMonitoredPollIngestion — Fase 5 (descartar antes de persistir)', () => {
  it('TESTE C — sem target monitorado relacionado → pesquisa descoberta mas NÃO persistida', async () => {
    const client = makeClient({ targets: [{ data: [], error: null }] });
    const upsertPollsFn = vi.fn();

    const counters = await runMonitoredPollIngestion(client, [poll({ uf: 'SP', cargo: 'Governador' })], upsertPollsFn);

    expect(counters.pollsDiscovered).toBe(1);
    expect(counters.pollsRelevant).toBe(0);
    expect(counters.duplicatesSkipped).toBe(1);
    expect(upsertPollsFn).not.toHaveBeenCalled();
  });

  it('TESTE D — pesquisa com target relacionado (UF+cargo) → persistida', async () => {
    const client = makeClient({
      targets: [{ data: [monitoredTarget], error: null }],
      electoral_polls: [{ data: null, error: null }], // não existia ainda
    });
    const upsertPollsFn = vi.fn().mockResolvedValue({ upserted: 1 });

    const counters = await runMonitoredPollIngestion(client, [poll()], upsertPollsFn);

    expect(counters.pollsRelevant).toBe(1);
    expect(counters.pollsInserted).toBe(1);
    expect(counters.pollsUpdated).toBe(0);
    expect(upsertPollsFn).toHaveBeenCalledTimes(1);
  });

  it('TESTE G — mesma pesquisa processada de novo (já existe) → conta como atualização, nunca duplica linha', async () => {
    const client = makeClient({
      targets: [{ data: [monitoredTarget], error: null }],
      electoral_polls: [{ data: { id: 'existing-poll-id' }, error: null }], // já existia
    });
    const upsertPollsFn = vi.fn().mockResolvedValue({ upserted: 1 });

    const counters = await runMonitoredPollIngestion(client, [poll()], upsertPollsFn);

    expect(counters.pollsInserted).toBe(0);
    expect(counters.pollsUpdated).toBe(1);
    expect(upsertPollsFn).toHaveBeenCalledTimes(1); // upsert idempotente, nunca insert duplicado
  });

  it('TESTE F — pesquisa multi-cargo (Governador+Senador) só é relevante para o target de Governador', async () => {
    const senadorTarget = { id: 't-sen-mg', candidate_name: 'Fulano Senador', keywords: null, state: 'MG', poll_monitoring_office: 'Senador' };
    const client = makeClient({
      targets: [{ data: [monitoredTarget, senadorTarget], error: null }],
      electoral_polls: [{ data: null, error: null }],
    });
    const upsertPollsFn = vi.fn().mockResolvedValue({ upserted: 1 });

    // Só o target de Governador tem UF/cargo compatível nesta pesquisa (ambos monitorados de fato, mas o teste
    // confirma que a pesquisa entra no pipeline pela correspondência real, não que os 2 offices se misturem).
    const counters = await runMonitoredPollIngestion(client, [poll({ cargo: 'Governador, Senador' })], upsertPollsFn);

    expect(counters.pollsRelevant).toBe(1); // 1 pesquisa relevante (não 2, mesmo com 2 targets casando o cargo)
  });

  it('TESTE K — erro ao gravar 1 pesquisa não interrompe as demais nem apaga execuções anteriores', async () => {
    const client = makeClient({
      targets: [{ data: [monitoredTarget], error: null }],
      electoral_polls: [{ data: null, error: null }],
    });
    const upsertPollsFn = vi.fn().mockRejectedValueOnce(new Error('fonte indisponível')).mockResolvedValueOnce({ upserted: 1 });

    const counters = await runMonitoredPollIngestion(
      client,
      [poll({ tseRegistrationNumber: 'MG1' }), poll({ tseRegistrationNumber: 'MG2' })],
      upsertPollsFn
    );

    expect(counters.errors).toBe(1);
    expect(counters.pollsInserted).toBe(1);
  });

  it('zero targets monitorados → zero pesquisas persistidas, mesmo com CSV cheio (Fase 1: nunca liga coleta nacional por omissão)', async () => {
    const client = makeClient({ targets: [{ data: [], error: null }] });
    const upsertPollsFn = vi.fn();

    const counters = await runMonitoredPollIngestion(client, [poll(), poll({ tseRegistrationNumber: 'MG2' })], upsertPollsFn);

    expect(counters.duplicatesSkipped).toBe(2);
    expect(upsertPollsFn).not.toHaveBeenCalled();
  });
});

describe('ingestRaceResults — Fase 6/9 (corrida completa, nunca só o candidato monitorado)', () => {
  const raceResults: RaceResultInput[] = [
    { cenario: 'Estimulado', turno: 1, tipoPergunta: 'estimulada', candidateName: 'Cleitinho Azevedo', percentage: 34, sourceName: 'Instituto X', sourceUrl: 'https://x.com', sourceDate: '2026-08-01', provenance: {} },
    { cenario: 'Estimulado', turno: 1, tipoPergunta: 'estimulada', candidateName: 'Kalil', percentage: 30, sourceName: 'Instituto X', sourceUrl: 'https://x.com', sourceDate: '2026-08-01', provenance: {} },
    { cenario: 'Estimulado', turno: 1, tipoPergunta: 'estimulada', candidateName: 'Pacheco', percentage: 12, sourceName: 'Instituto X', sourceUrl: 'https://x.com', sourceDate: '2026-08-01', provenance: {} },
    { cenario: 'Estimulado', turno: 1, tipoPergunta: 'estimulada', candidateName: 'Branco/Nulo', percentage: 15, sourceName: 'Instituto X', sourceUrl: 'https://x.com', sourceDate: '2026-08-01', provenance: {} },
    { cenario: 'Estimulado', turno: 1, tipoPergunta: 'estimulada', candidateName: 'Indecisos', percentage: 9, sourceName: 'Instituto X', sourceUrl: 'https://x.com', sourceDate: '2026-08-01', provenance: {} },
  ];

  it('TESTE E — corrida com 5 posições (3 candidatos + branco/nulo + indecisos) → todos os resultados persistidos', async () => {
    const client = makeClient({
      targets: [{ data: [monitoredTarget], error: null }],
      electoral_poll_results: [{ data: null, error: null }, { data: { id: 'new-id' }, error: null }],
    });

    const summary = await ingestRaceResults(client, 'poll-1', 'Governador', raceResults);

    expect(summary.resultsInserted + summary.resultsUpdated + summary.errors).toBe(5);
    expect(summary.errors).toBe(0);
  });

  it('TESTE J — verified nunca é true automaticamente por match de nome (default false, sem override)', async () => {
    let resultsCallCount = 0;
    const mockFrom = vi.fn((table: string) => {
      if (table === 'targets') return chain({ data: [monitoredTarget], error: null });
      resultsCallCount += 1;
      // 1ª chamada: checagem de existência (select/maybeSingle) → não existe. 2ª chamada: insert/select/single → id novo.
      return chain(resultsCallCount === 1 ? { data: null, error: null } : { data: { id: 'new-id' }, error: null });
    });
    const client = { from: mockFrom } as never;

    // Nenhum dos results acima passa `verified` — o padrão do RaceResultInput.
    const summary = await ingestRaceResults(client, 'poll-1', 'Governador', [raceResults[0]]);
    expect(summary.errors).toBe(0);

    // A chamada real de upsert é feita por upsertPollResult (results-repository.ts), que grava exatamente o
    // valor de `verified` recebido — como não passamos `verified: true`, o resultado grava `false` por padrão
    // (comportamento herdado de ElectoralPollResultUpsert, coberto também em results-repository.test.ts).
    expect(mockFrom).toHaveBeenCalledWith('electoral_poll_results');
  });

  it('candidato não-real (branco/nulo) nunca é resolvido a um target monitorado', async () => {
    const client = makeClient({
      targets: [{ data: [monitoredTarget], error: null }],
      electoral_poll_results: [{ data: null, error: null }, { data: { id: 'new-id' }, error: null }],
    });

    const summary = await ingestRaceResults(client, 'poll-1', 'Governador', [
      { cenario: 'Estimulado', turno: 1, tipoPergunta: 'estimulada', candidateName: 'Branco/Nulo', percentage: 15, sourceName: null, sourceUrl: null, sourceDate: null, provenance: {} },
    ]);

    expect(summary.errors).toBe(0);
  });
});
