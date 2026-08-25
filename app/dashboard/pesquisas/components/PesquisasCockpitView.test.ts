import { describe, it, expect } from 'vitest';
import { buildInitialFilters, type GlobalCandidateContext } from './PesquisasCockpitView';
import type { ElectoralPoll, ElectoralPollResultWithPoll } from '@/lib/pesquisas/types';

function poll(id: string, overrides: Partial<ElectoralPoll> = {}): ElectoralPoll {
  return {
    id, tseRegistrationNumber: `REG-${id}`, source: 'TSE/PesqEle', sourceUrl: null,
    sourceDataset: 'pesquisas-eleitorais-2026', electionYear: 2026, uf: 'MG', municipio: null,
    cargo: 'Governador, Senador', abrangencia: 'MINAS GERAIS', instituto: 'QUAEST', contratante: null,
    pagante: null, valor: null, metodologia: null, dataRegistro: '2026-07-22', campoInicio: '2026-07-22',
    campoFim: '2026-07-26', amostra: 1482, margemErro: null, nivelConfianca: null, rawSourceRow: null,
    ingestedAt: '2026-08-19T00:00:00Z', createdAt: '2026-08-19T00:00:00Z', updatedAt: '2026-08-19T00:00:00Z',
    ...overrides,
  };
}

function res(
  overrides: Partial<ElectoralPollResultWithPoll> & { candidateName: string; percentage: number },
  pollObj: ElectoralPoll
): ElectoralPollResultWithPoll {
  return {
    id: `${pollObj.id}-${overrides.candidateName}`, pollId: pollObj.id, cenario: 'Cenário 1', turno: 1,
    tipoPergunta: 'estimulada', office: 'Governador', resultType: 'STIMULATED', candidateId: null,
    sourceName: 'Genial/Quaest', sourceUrl: null, sourceDate: '2026-07-26', collectedAt: '2026-08-19T00:00:00Z',
    provenance: {}, verified: true, poll: pollObj, ...overrides,
  };
}

const mgPoll = poll('mg-jul');
const mgResults: ElectoralPollResultWithPoll[] = [
  res({ candidateName: 'Cleitinho', percentage: 35 }, mgPoll),
  res({ candidateName: 'Alexandre Kalil', percentage: 12 }, mgPoll),
];

describe('buildInitialFilters — Sprint 2B, P0.1 (contexto global de candidato)', () => {
  it('CASO A: candidato global presente e pertence à corrida → filtro local inicial = candidato, na uf/cargo dele', () => {
    const globalCandidate: GlobalCandidateContext = { candidateName: 'Cleitinho', uf: 'MG', cargo: 'Governador' };
    const filters = buildInitialFilters(globalCandidate, mgResults);

    expect(filters.candidateNames).toEqual(['Cleitinho']);
    expect(filters.uf).toBe('MG');
    expect(filters.cargo).toBe('Governador');
  });

  it('CASO B: sem candidato global → filtro local inicial = Todos os candidatos, DF/Governador (default)', () => {
    const filters = buildInitialFilters(null, mgResults);
    expect(filters.candidateNames).toBeNull();
    expect(filters.uf).toBe('DF');
    expect(filters.cargo).toBe('Governador');
  });

  it('CASO C: candidato global incompatível com a corrida (sem resultado ali) → fallback seguro, Todos os candidatos', () => {
    const globalCandidate: GlobalCandidateContext = { candidateName: 'Candidato Inexistente Nesta Corrida', uf: 'MG', cargo: 'Governador' };
    const filters = buildInitialFilters(globalCandidate, mgResults);

    expect(filters.candidateNames).toBeNull();
    // Mesmo caindo para "Todos os candidatos", a corrida (uf/cargo) do candidato é preservada —
    // não força de volta para o default DF/Governador, que faria ainda menos sentido.
    expect(filters.uf).toBe('MG');
    expect(filters.cargo).toBe('Governador');
  });

  it('CASO C variante: target sem state/office configurados (uf/cargo nulos) e candidato sem resultado em DF/Governador (default) → fallback seguro', () => {
    const globalCandidate: GlobalCandidateContext = { candidateName: 'Cleitinho', uf: null, cargo: null };
    // mgResults é MG, não DF — na corrida default (DF/Governador) Cleitinho não aparece.
    const filters = buildInitialFilters(globalCandidate, mgResults);

    expect(filters.candidateNames).toBeNull();
    expect(filters.uf).toBe('DF');
    expect(filters.cargo).toBe('Governador');
  });

  it('nunca quebra com allResults vazio', () => {
    const globalCandidate: GlobalCandidateContext = { candidateName: 'Cleitinho', uf: 'MG', cargo: 'Governador' };
    const filters = buildInitialFilters(globalCandidate, []);
    expect(filters.candidateNames).toBeNull();
  });
});
