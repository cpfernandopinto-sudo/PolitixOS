import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { getPollMonitoringTargets, matchPollToTargets, matchCandidateNameToTarget, type MonitoredTarget } from './targetMatcher';
import type { ElectoralPollUpsert } from './types';

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

beforeEach(() => {
  mockFrom.mockReset();
});

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

// TESTE A / B — flag de monitoramento
describe('getPollMonitoringTargets (TESTE A/B — monitoramento ligado/desligado)', () => {
  it('TESTE A — target com poll_monitoring_enabled=false não é retornado (query já filtra no banco)', async () => {
    const c = chain({ data: [], error: null });
    mockFrom.mockReturnValue(c);

    const targets = await getPollMonitoringTargets({ from: mockFrom } as never);

    expect(targets).toEqual([]);
    expect(c.eq).toHaveBeenCalledWith('poll_monitoring_enabled', true);
    expect(c.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('TESTE B — target com poll_monitoring_enabled=true entra no pipeline', async () => {
    const c = chain({
      data: [{ id: 't1', candidate_name: 'Cleitinho Azevedo', keywords: 'Cleitinho, senador Cleitinho', state: 'MG', poll_monitoring_office: 'Governador' }],
      error: null,
    });
    mockFrom.mockReturnValue(c);

    const targets = await getPollMonitoringTargets({ from: mockFrom } as never);

    expect(targets).toHaveLength(1);
    expect(targets[0].candidateName).toBe('Cleitinho Azevedo');
    expect(targets[0].office).toBe('Governador');
  });
});

describe('matchPollToTargets — UF + cargo (Fase 3, nunca só por nome)', () => {
  const targets: MonitoredTarget[] = [
    { id: 't-gov-mg', candidateName: 'Cleitinho Azevedo', keywords: null, state: 'MG', office: 'Governador' },
    { id: 't-sen-df', candidateName: 'Michelle Bolsonaro', keywords: null, state: 'DF', office: 'Senador' },
    { id: 't-gov-df', candidateName: 'Celina Leão', keywords: null, state: 'DF', office: 'Governador' },
  ];

  it('pesquisa de Governador/MG casa só com o target de Governador/MG', () => {
    const matches = matchPollToTargets(poll({ uf: 'MG', cargo: 'Governador, Senador' }), targets);
    expect(matches.map((t) => t.id)).toEqual(['t-gov-mg']);
  });

  it('pesquisa multi-cargo (Governador+Senador no mesmo registro TSE) casa com AMBOS os targets — o registro genuinamente cobre os dois cargos (Fase 4: cargo é multi-valor na pesquisa-pai)', () => {
    const matches = matchPollToTargets(poll({ uf: 'DF', cargo: 'Governador, Senador, Deputado Distrital' }), targets);
    const ids = matches.map((t) => t.id);
    expect(ids).toContain('t-gov-df');
    expect(ids).toContain('t-sen-df');
  });

  it('TESTE I — pesquisa APENAS de Governador/DF (cargo não multi-valor) NÃO casa com o target de Senador/DF só por estarem na mesma UF', () => {
    const matches = matchPollToTargets(poll({ uf: 'DF', cargo: 'Governador' }), targets);
    const ids = matches.map((t) => t.id);
    expect(ids).toContain('t-gov-df');
    expect(ids).not.toContain('t-sen-df');
  });

  it('UF sem correspondência não casa mesmo com cargo igual', () => {
    const matches = matchPollToTargets(poll({ uf: 'SP', cargo: 'Governador' }), targets);
    expect(matches).toEqual([]);
  });

  it('target monitorado sem office nunca casa (nunca "por via das dúvidas")', () => {
    const withoutOffice: MonitoredTarget[] = [{ id: 't-x', candidateName: 'X', keywords: null, state: 'MG', office: null }];
    const matches = matchPollToTargets(poll({ uf: 'MG', cargo: 'Governador' }), withoutOffice);
    expect(matches).toEqual([]);
  });
});

describe('matchCandidateNameToTarget — nome exato e tokens de keywords', () => {
  const targets: MonitoredTarget[] = [
    { id: 't1', candidateName: 'Michelle Bolsonaro', keywords: 'Michelle Bolsonaro, Michelle de Paula Firmo Reinaldo Bolsonaro, ex-primeira-dama', state: 'DF', office: 'Senador' },
  ];

  it('casa por candidate_name exato (case/acento insensitive)', () => {
    const match = matchCandidateNameToTarget('michelle bolsonaro', targets);
    expect(match?.id).toBe('t1');
  });

  it('casa por token de keywords quando nome não bate exatamente', () => {
    const match = matchCandidateNameToTarget('Ex-Primeira-Dama', targets);
    expect(match?.id).toBe('t1');
  });

  it('não casa nome sem relação nenhuma', () => {
    const match = matchCandidateNameToTarget('Fulano de Tal', targets);
    expect(match).toBeNull();
  });
});
