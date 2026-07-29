import { describe, it, expect } from 'vitest';
import { buildTimelineEvents } from './overview';

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
});
