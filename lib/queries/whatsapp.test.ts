import { describe, it, expect } from 'vitest';
import {
  MOCK_WHATSAPP_MESSAGES,
  fetchWhatsAppMessages,
  fetchWhatsAppSummary,
  fetchWhatsAppGroups,
  fetchWhatsAppFilters,
  fetchWhatsAppDashboardData,
  filterWhatsAppMessages,
  encodeCursor,
  decodeCursor,
  cleanFilter,
} from './whatsapp';

describe('WhatsApp Queries & Codex DTO Contract Compliance', () => {
  it('contém fixtures válidas com formato estrito do Codex', () => {
    expect(MOCK_WHATSAPP_MESSAGES.length).toBeGreaterThanOrEqual(10);
    const sample = MOCK_WHATSAPP_MESSAGES[0];

    // Checagem de chaves canônicas da Seção 5.4
    expect(sample.id).toBeDefined();
    expect(sample.occurred_at).toBeDefined();
    expect(sample.chat.id).toBeDefined();
    expect(sample.chat.name).toBeDefined();
    expect(sample.chat.type).toBe('GROUP');
    expect(sample.sender.name).toBeDefined();
    expect(sample.message_type).toBe('TEXT');
    expect(sample.from_me).toBe(false);
    expect(sample.analysis_status).toBe('COMPLETED');
    expect(sample.analysis).not.toBeNull();
    expect(sample.analysis?.sentiment).toBe('NEGATIVE');
    expect(sample.analysis?.risk_level).toBe('HIGH');
    expect(sample.analysis?.relevance).toBe('HIGH');
    expect(sample.analysis?.mentioned_candidates).toBeInstanceOf(Array);
    expect(sample.analysis?.mentioned_entities).toBeInstanceOf(Array);
    expect(sample.analysis?.mentioned_locations).toBeInstanceOf(Array);
  });

  it('suporta todos os estados obrigatórios da IA (COMPLETED, PROCESSING, PENDING, SKIPPED, FAILED)', () => {
    const statuses = new Set(MOCK_WHATSAPP_MESSAGES.map((m) => m.analysis_status));
    expect(statuses.has('COMPLETED')).toBe(true);
    expect(statuses.has('PROCESSING')).toBe(true);
    expect(statuses.has('PENDING')).toBe(true);
    expect(statuses.has('SKIPPED')).toBe(true);
    expect(statuses.has('FAILED')).toBe(true);
  });

  describe('Cursor Pagination (encodeCursor / decodeCursor)', () => {
    it('codifica e decodifica cursor opaco determinístico', () => {
      const occurredAt = '2026-08-29T16:30:00.000Z';
      const id = 'msg-uuid-123';
      const cursor = encodeCursor(occurredAt, id);

      expect(typeof cursor).toBe('string');
      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({ occurredAt, id });
    });

    it('retorna null para cursor inválido ou corrompido', () => {
      expect(decodeCursor('cursor_invalido_sem_pipe')).toBeNull();
      expect(decodeCursor('')).toBeNull();
    });

    it('pagina itens corretamente via cursor', async () => {
      const page1 = await fetchWhatsAppMessages({ page_size: 3 });
      expect(page1.items.length).toBe(3);
      expect(page1.has_more).toBe(true);
      expect(page1.next_cursor).not.toBeNull();

      const page2 = await fetchWhatsAppMessages({ page_size: 3, cursor: page1.next_cursor });
      expect(page2.items.length).toBe(3);
      // Itens da página 2 não devem sobrepor os da página 1
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe('fetchWhatsAppSummary (Seção 5.3)', () => {
    it('calcula sumário com totais, distribuições e percentuais', async () => {
      const summary = await fetchWhatsAppSummary();
      expect(summary.totals.messages).toBe(MOCK_WHATSAPP_MESSAGES.length);
      expect(summary.totals.groups).toBeGreaterThanOrEqual(1);
      expect(summary.totals.analyzed).toBeGreaterThanOrEqual(1);
      expect(summary.totals.high_or_critical_risk).toBeGreaterThanOrEqual(1);
      expect(summary.sentiment.length).toBeGreaterThan(0);
      expect(summary.risk.length).toBeGreaterThan(0);
      expect(summary.relevance.length).toBeGreaterThan(0);
      expect(summary.top_themes.length).toBeGreaterThan(0);
      expect(summary.freshness.last_message_at).not.toBeNull();
    });

    it('retorna zeros limpos quando a base filtrada está vazia', async () => {
      const summary = await fetchWhatsAppSummary({ q: 'termo_sem_correspondencia_xyz' });
      expect(summary.totals.messages).toBe(0);
      expect(summary.totals.analyzed).toBe(0);
      expect(summary.totals.high_or_critical_risk).toBe(0);
    });
  });

  describe('fetchWhatsAppGroups (Seção 5.6)', () => {
    it('retorna lista agregada de grupos', async () => {
      const groups = await fetchWhatsAppGroups();
      expect(groups.items.length).toBeGreaterThan(0);
      const group = groups.items[0];
      expect(group.id).toBeDefined();
      expect(group.name).toBeDefined();
      expect(group.type).toBe('GROUP');
      expect(group.message_count).toBeGreaterThanOrEqual(1);
      expect(group.unique_senders).toBeGreaterThanOrEqual(1);
    });
  });

  describe('fetchWhatsAppFilters (Seção 5.7)', () => {
    it('retorna opções disponíveis de filtros com contagens reais', async () => {
      const filters = await fetchWhatsAppFilters();
      expect(filters.groups.length).toBeGreaterThan(0);
      expect(filters.sentiments.some((s) => s.value === 'NEGATIVE')).toBe(true);
      expect(filters.risk_levels.some((r) => r.value === 'HIGH')).toBe(true);
      expect(filters.themes.length).toBeGreaterThan(0);
      expect(filters.message_types.some((t) => t.value === 'AUDIO')).toBe(true);
    });
  });

  describe('filterWhatsAppMessages', () => {
    it('filtra por sentimento NEGATIVE', () => {
      const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, { sentiment: 'NEGATIVE' });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((m) => m.analysis?.sentiment === 'NEGATIVE')).toBe(true);
    });

    it('filtra por risco CRITICAL', () => {
      const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, { risk_level: 'CRITICAL' });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((m) => m.analysis?.risk_level === 'CRITICAL')).toBe(true);
    });

    it('filtra por tipo de mídia AUDIO', () => {
      const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, { message_type: 'AUDIO' });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((m) => m.message_type === 'AUDIO')).toBe(true);
    });

    it('filtra por busca textual no texto ou resumo', () => {
      const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, { q: 'UPA' });
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe('fetchWhatsAppDashboardData', () => {
    it('monta payload unificado para a página', async () => {
      const data = await fetchWhatsAppDashboardData();
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.summary).toBeDefined();
      expect(data.groups.length).toBeGreaterThan(0);
      expect(data.filterOptions).toBeDefined();
      expect(data.criticalAlert).not.toBeNull();
      expect(data.completeness).toContain('100%');
    });
  });

  describe('cleanFilter', () => {
    it('sanitiza parâmetros', () => {
      expect(cleanFilter('all')).toBeNull();
      expect(cleanFilter('')).toBeNull();
      expect(cleanFilter(undefined)).toBeNull();
      expect(cleanFilter(['NEGATIVE', 'OTHER'])).toBe('NEGATIVE');
    });
  });
});
