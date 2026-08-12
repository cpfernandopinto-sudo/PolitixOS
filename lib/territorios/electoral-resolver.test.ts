import { describe, expect, it } from 'vitest';
import { resolveElectoralNotebook } from './electoral-resolver';

const demo = {
  mode: 'demo', electorate: { value: 100 }, participation: { value: '70%' }, abstention: { value: '30%' },
  historicalElectorate: [], historicalParticipation: [], historicalAbstention: [], candidateResults: [{ name: 'Demo', party: 'D', votes: 1, percentage: 100 }], partyEvolution: [],
  historicalTrend: 'demo',
} as never;

describe('fallback eleitoral por campo', () => {
  it('REAL vence DEMO quando disponível e DEMO permanece quando REAL falta', () => {
    const result = resolveElectoralNotebook(demo, { electorate: { value: 200 } });
    expect(result.notebook.electorate.value).toBe(200);
    expect(result.fieldModes.electorate).toBe('REAL');
    expect(result.notebook.participation.value).toBe('70%');
    expect(result.fieldModes.participation).toBe('DEMO');
    expect(result.notebook.candidateResults[0].name).toBe('Demo');
  });
});

