import { describe, it, expect } from 'vitest';
import { classifyPollIntegrationStatus } from './integrationStatus';

const NOW = new Date('2026-08-24T12:00:00Z');

describe('classifyPollIntegrationStatus', () => {
  it('CASO: pesquisa com resultado integrado', () => {
    const result = classifyPollIntegrationStatus(true, '2026-07-14 00:00:00', NOW);
    expect(result.status).toBe('COM_RESULTADO');
  });

  it('CASO: sem resultado e DT_DIVULGACAO no futuro → aguardando divulgação', () => {
    const result = classifyPollIntegrationStatus(false, '2026-08-25 00:00:00', NOW);
    expect(result.status).toBe('AGUARDANDO_DIVULGACAO');
  });

  it('CASO: sem resultado e DT_DIVULGACAO já passou → resultado não integrado', () => {
    const result = classifyPollIntegrationStatus(false, '2026-07-14 00:00:00', NOW);
    expect(result.status).toBe('RESULTADO_NAO_INTEGRADO');
  });

  it('CASO: sem resultado e sem DT_DIVULGACAO conhecida → resultado não integrado (nunca inventa aguardando)', () => {
    const result = classifyPollIntegrationStatus(false, null, NOW);
    expect(result.status).toBe('RESULTADO_NAO_INTEGRADO');
  });

  it('CASO: DT_DIVULGACAO exatamente agora → considera já divulgada (>=), não integrada', () => {
    const result = classifyPollIntegrationStatus(false, NOW.toISOString(), NOW);
    expect(result.status).toBe('RESULTADO_NAO_INTEGRADO');
  });
});
