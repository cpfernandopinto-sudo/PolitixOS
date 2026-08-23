import { describe, it, expect } from 'vitest';
import { buildTimelineEvents, resolveAllPeriodFilters } from './overview';

describe('resolveAllPeriodFilters — dedup de fetchOverviewData para "Todo período"', () => {
  it('reaproveita a MESMA referência quando period já é "all"', () => {
    const filters = { candidate: null, period: 'all', allowedTargetIds: null };
    expect(resolveAllPeriodFilters(filters)).toBe(filters);
  });

  it('reaproveita a MESMA referência quando period está ausente (default)', () => {
    const filters = { candidate: null, allowedTargetIds: null };
    expect(resolveAllPeriodFilters(filters)).toBe(filters);
  });

  it('reaproveita a MESMA referência mesmo com filtros adicionais (candidato selecionado)', () => {
    const filters = { candidate: 'target-123', period: 'all', allowedTargetIds: ['target-123'] };
    expect(resolveAllPeriodFilters(filters)).toBe(filters);
  });

  it('cria uma NOVA referência quando period é um filtro real diferente de "all"', () => {
    const filters = { candidate: null, period: '7', allowedTargetIds: null };
    const resolved = resolveAllPeriodFilters(filters);
    expect(resolved).not.toBe(filters);
    expect(resolved).toEqual({ candidate: null, period: 'all', allowedTargetIds: null });
  });

  it('preserva os demais campos do filtro ao sobrescrever period', () => {
    const filters = { candidate: 'target-9', period: '30', allowedTargetIds: ['target-9'] };
    const resolved = resolveAllPeriodFilters(filters);
    expect(resolved).toEqual({ candidate: 'target-9', period: 'all', allowedTargetIds: ['target-9'] });
  });

  it('undefined permanece undefined (sem filtros nenhum)', () => {
    expect(resolveAllPeriodFilters(undefined)).toBeUndefined();
  });
});

describe('buildTimelineEvents', () => {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  it('ordena os eventos cronologicamente, mais recente primeiro', () => {
    const events = buildTimelineEvents({
      noticias: [
        { id: 'n1', title: 'Antiga', published_at: hoursAgo(5), local_relevance: 90, url: null },
        { id: 'n2', title: 'Recente', published_at: hoursAgo(1), local_relevance: 90, url: null },
      ],
      instagramPosts: [],
      xPosts: [],
    });
    expect(events.map((e) => e.id)).toEqual(['n2', 'n1']);
  });

  it('não inclui notícias abaixo do threshold de relevância', () => {
    const events = buildTimelineEvents({
      noticias: [{ id: 'n1', title: 'Irrelevante', published_at: hoursAgo(1), local_relevance: 40, url: null }],
      instagramPosts: [],
      xPosts: [],
    });
    expect(events).toHaveLength(0);
  });

  it('não inclui posts sociais de baixo risco', () => {
    const events = buildTimelineEvents({
      noticias: [],
      instagramPosts: [{ id: 'p1', text: 'ok', created_at: hoursAgo(1), risk: 'baixo' }],
      xPosts: [{ id: 'p2', text: 'ok', created_at: hoursAgo(1), risk: 'baixo' }],
    });
    expect(events).toHaveLength(0);
  });

  it('deduplica pelo par canal+id — mesmo id não aparece duas vezes', () => {
    const events = buildTimelineEvents({
      noticias: [
        { id: 'n1', title: 'Dup', published_at: hoursAgo(1), local_relevance: 90, url: null },
        { id: 'n1', title: 'Dup', published_at: hoursAgo(1), local_relevance: 90, url: null },
      ],
      instagramPosts: [],
      xPosts: [],
    });
    expect(events).toHaveLength(1);
  });

  it('itens de canais diferentes com o mesmo id não são deduplicados entre si', () => {
    const events = buildTimelineEvents({
      noticias: [{ id: 'same-id', title: 'Notícia', published_at: hoursAgo(1), local_relevance: 90, url: null }],
      instagramPosts: [{ id: 'same-id', text: 'Post', created_at: hoursAgo(1), risk: 'alto' }],
      xPosts: [],
    });
    expect(events).toHaveLength(2);
  });

  it('marca severidade alta apenas acima do threshold crítico', () => {
    const events = buildTimelineEvents({
      noticias: [
        { id: 'n1', title: 'Crítica', published_at: hoursAgo(1), local_relevance: 90, url: null },
        { id: 'n2', title: 'Alta', published_at: hoursAgo(2), local_relevance: 75, url: null },
      ],
      instagramPosts: [],
      xPosts: [],
    });
    expect(events.find((e) => e.id === 'n1')?.severidade).toBe('alta');
    expect(events.find((e) => e.id === 'n2')?.severidade).toBe('media');
  });

  it('inclui posts do Facebook de alto risco (facebookPosts é opcional, retrocompatível)', () => {
    const events = buildTimelineEvents({
      noticias: [],
      instagramPosts: [],
      xPosts: [],
      facebookPosts: [{ id: 'f1', text: 'Post de risco', created_at: hoursAgo(1), risk: 'alto' }],
    });
    expect(events).toHaveLength(1);
    expect(events[0].canal).toBe('Facebook');
  });

  it('omitir facebookPosts continua funcionando (chamadas existentes não quebram)', () => {
    const events = buildTimelineEvents({ noticias: [], instagramPosts: [], xPosts: [] });
    expect(events).toEqual([]);
  });

  it('Facebook de baixo risco não entra na timeline', () => {
    const events = buildTimelineEvents({
      noticias: [],
      instagramPosts: [],
      xPosts: [],
      facebookPosts: [{ id: 'f1', text: 'ok', created_at: hoursAgo(1), risk: 'baixo' }],
    });
    expect(events).toHaveLength(0);
  });
});
