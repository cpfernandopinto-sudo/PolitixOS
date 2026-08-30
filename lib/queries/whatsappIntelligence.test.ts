import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabaseClient', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }));

import {
  buildTextSearchOrFilter,
  decodeCursor,
  mapWhatsappAnalysisFeedRow,
  latestWhatsappAnalysisByMessageId,
  parseCommonFilters,
  resolveWhatsappSessionScope,
  WHATSAPP_ANALYSIS_FEED_FIELDS,
} from './whatsappIntelligence';
import { getSession } from '@/lib/auth/session';

describe('WhatsApp Intelligence read contract', () => {
  it('selects recommended_action and preserves every existing feed analysis field', () => {
    expect(WHATSAPP_ANALYSIS_FEED_FIELDS.split(', ')).toEqual(expect.arrayContaining([
      'theme', 'subtheme', 'sentiment', 'sentiment_score', 'relevance', 'ai_summary',
      'intent', 'risk_level', 'mentioned_candidates', 'mentioned_entities',
      'mentioned_locations', 'confidence', 'schema_version', 'prompt_version',
      'analyzed_at', 'recommended_action',
    ]));
  });

  it('quotes PostgREST search values so commas and parentheses remain data', () => {
    expect(buildTextSearchOrFilter('saude, bairro (centro)')).toBe(
      'text.ilike."%saude, bairro (centro)%",caption.ilike."%saude, bairro (centro)%"',
    );
    expect(buildTextSearchOrFilter('rua "A" \\ centro')).toBe(
      'text.ilike."%rua \\"A\\" \\\\ centro%",caption.ilike."%rua \\"A\\" \\\\ centro%"',
    );
  });

  it('normalizes q and rejects control characters or oversized searches', () => {
    const valid = parseCommonFilters(new URLSearchParams({ q: '  saude  ' }));
    expect(valid.ok && valid.filters.q).toBe('saude');

    const control = parseCommonFilters(new URLSearchParams({ q: 'saude\ncentro' }));
    expect(control).toMatchObject({ ok: false, code: 'INVALID_FILTER' });

    const oversized = parseCommonFilters(new URLSearchParams({ q: 'a'.repeat(201) }));
    expect(oversized).toMatchObject({ ok: false, code: 'INVALID_FILTER' });
  });

  it('accepts only a fully valid occurred_at/id cursor', () => {
    const occurredAt = '2026-08-29T15:22:31.000Z';
    const id = '11111111-1111-4111-8111-111111111111';
    const valid = Buffer.from(`${occurredAt}|${id}`).toString('base64url');
    expect(decodeCursor(valid)).toEqual({ occurredAt, id });

    expect(decodeCursor(Buffer.from(`not-a-date|${id}`).toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from(`${occurredAt}|not-a-uuid`).toString('base64url'))).toBeNull();
    expect(decodeCursor(Buffer.from(`${occurredAt}|${id}|extra`).toString('base64url'))).toBeNull();
  });

  it.each([
    { schemaVersion: '1.0', recommendedAction: null },
    { schemaVersion: '1.1', recommendedAction: 'Preparar esclarecimento factual e monitorar a mobilização.' },
  ])('maps recommended_action for schema $schemaVersion without changing existing analysis fields', ({ schemaVersion, recommendedAction }) => {
    const mapped = mapWhatsappAnalysisFeedRow({
      message_id: '11111111-1111-4111-8111-111111111111',
      theme: 'Política',
      subtheme: 'Atuação Política e Gestão',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.7,
      relevance: 'HIGH',
      ai_summary: 'Resumo factual preservado.',
      intent: 'MOBILIZATION',
      risk_level: 'LOW',
      mentioned_candidates: [{ name: 'Candidato citado' }],
      mentioned_entities: [{ name: 'Entidade', type: 'ORGANIZATION' }],
      mentioned_locations: [{ name: 'Local', type: 'CITY' }],
      confidence: 0.95,
      schema_version: schemaVersion,
      prompt_version: schemaVersion === '1.0' ? 'whatsapp_mvp_v1' : 'whatsapp_recommendation_v1',
      analyzed_at: '2026-08-30T12:00:00.000Z',
      recommended_action: recommendedAction,
    });

    expect(mapped).toMatchObject({
      theme: 'Política',
      subtheme: 'Atuação Política e Gestão',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.7,
      relevance: 'HIGH',
      summary: 'Resumo factual preservado.',
      intent: 'MOBILIZATION',
      risk_level: 'LOW',
      confidence: 0.95,
      schema_version: schemaVersion,
      recommended_action: recommendedAction,
    });
    expect(mapped.mentioned_candidates).toHaveLength(1);
    expect(mapped.mentioned_entities).toHaveLength(1);
    expect(mapped.mentioned_locations).toHaveLength(1);
  });

  it('prefers the latest schema 1.1 analysis when historical 1.0 coexists for the same message', () => {
    const base = {
      message_id: '11111111-1111-4111-8111-111111111111',
      theme: 'Política', subtheme: null, sentiment: 'NEGATIVE', sentiment_score: -0.7,
      relevance: 'HIGH', ai_summary: 'Resumo', intent: 'MOBILIZATION', risk_level: 'LOW',
      mentioned_candidates: [], mentioned_entities: [], mentioned_locations: [], confidence: 0.9,
    };
    const latest = latestWhatsappAnalysisByMessageId([
      {
        ...base,
        schema_version: '1.1', prompt_version: 'whatsapp_recommendation_v1',
        analyzed_at: '2026-08-30T12:00:00.000Z', recommended_action: 'Monitorar e preparar esclarecimento factual.',
      },
      {
        ...base,
        schema_version: '1.0', prompt_version: 'whatsapp_mvp_v1',
        analyzed_at: '2026-08-29T12:00:00.000Z', recommended_action: null,
      },
    ]).get(base.message_id);

    expect(latest).toMatchObject({
      schema_version: '1.1',
      recommended_action: 'Monitorar e preparar esclarecimento factual.',
    });
  });

  it('requires the whatsapp permission for authenticated non-admin users', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      name: 'Operador',
      email: 'operador@example.test',
      role: 'gestor',
      permissions: [],
      allowedTargetIds: [],
      clientId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });

    const denied = await resolveWhatsappSessionScope('request-1');
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.response.status).toBe(403);

    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      name: 'Operador',
      email: 'operador@example.test',
      role: 'gestor',
      permissions: ['whatsapp'],
      allowedTargetIds: [],
      clientId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });

    await expect(resolveWhatsappSessionScope('request-2')).resolves.toEqual({
      ok: true,
      clientId: '11111111-1111-4111-8111-111111111111',
    });
  });
});
