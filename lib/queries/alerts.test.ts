import { describe, it, expect } from 'vitest';
import {
  evaluateNoticiaItemAlerts,
  evaluateNoticiaAggregateAlerts,
  evaluateInstagramItemAlerts,
  evaluateXItemAlerts,
  sortAlerts,
  shouldReturnEmptyForAccess,
  type UnifiedAlert,
} from './alerts';
import type { MencaoRow } from '@/lib/types/noticias';

function makeNoticia(overrides: Partial<MencaoRow> = {}): MencaoRow {
  return {
    id: 'n1',
    hash: 'hash1',
    published_at: new Date().toISOString(),
    source: 'Fonte X',
    title: 'Notícia de teste',
    url: 'https://example.com/noticia',
    summary: null,
    ai_takeaways: null,
    ai_sentiment: 0,
    ai_topics: [],
    ai_entities: [],
    ai_risk_flags: [],
    local_relevance: 50,
    is_about: true,
    candidate_name: 'Candidato A',
    city: null,
    ...overrides,
  };
}

describe('shouldReturnEmptyForAccess', () => {
  it('retorna true quando allowedTargetIds é array vazio (usuário sem candidato vinculado)', () => {
    expect(shouldReturnEmptyForAccess([])).toBe(true);
  });

  it('retorna false quando allowedTargetIds é null (admin, sem restrição)', () => {
    expect(shouldReturnEmptyForAccess(null)).toBe(false);
  });

  it('retorna false quando allowedTargetIds tem itens', () => {
    expect(shouldReturnEmptyForAccess(['t1', 't2'])).toBe(false);
  });

  it('retorna false quando allowedTargetIds é undefined (contexto interno sem restrição)', () => {
    expect(shouldReturnEmptyForAccess(undefined)).toBe(false);
  });
});

describe('evaluateNoticiaItemAlerts', () => {
  it('gera alerta crítico para local_relevance > 85', () => {
    const alerts = evaluateNoticiaItemAlerts([makeNoticia({ local_relevance: 90 })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severidade).toBe('critico');
    expect(alerts[0].ruleId).toBe('noticia_risco_critico');
  });

  it('gera alerta alto para local_relevance entre 80 e 85', () => {
    const alerts = evaluateNoticiaItemAlerts([makeNoticia({ local_relevance: 82 })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severidade).toBe('alto');
    expect(alerts[0].ruleId).toBe('noticia_risco_alto');
  });

  it('não gera alerta para local_relevance <= 80', () => {
    const alerts = evaluateNoticiaItemAlerts([makeNoticia({ local_relevance: 80 })]);
    expect(alerts).toHaveLength(0);
  });

  it('não gera alerta para lista vazia', () => {
    expect(evaluateNoticiaItemAlerts([])).toEqual([]);
  });
});

describe('evaluateNoticiaAggregateAlerts', () => {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  it('dispara alerta de volume anormal quando 24h > 1.5x a média dos 7 dias anteriores', () => {
    // 7 dias anteriores: 7 notícias (média 1/dia) → threshold = 1.5
    const rows7d = Array.from({ length: 7 }, (_, i) => makeNoticia({ id: `old-${i}`, published_at: hoursAgo(30 + i) }));
    // 24h: 3 notícias > 1.5
    const rows24h = Array.from({ length: 3 }, (_, i) => makeNoticia({ id: `new-${i}`, published_at: hoursAgo(i) }));
    const alerts = evaluateNoticiaAggregateAlerts([...rows7d, ...rows24h]);
    expect(alerts.some((a) => a.ruleId === 'noticia_volume_anormal')).toBe(true);
  });

  it('não dispara volume anormal quando não há histórico de 7 dias para comparar', () => {
    const rows24h = Array.from({ length: 3 }, (_, i) => makeNoticia({ id: `new-${i}`, published_at: hoursAgo(i) }));
    const alerts = evaluateNoticiaAggregateAlerts(rows24h);
    expect(alerts.some((a) => a.ruleId === 'noticia_volume_anormal')).toBe(false);
  });

  it('dispara concentração de sentimento negativo quando >40% das notícias de 24h são negativas', () => {
    const rows = [
      makeNoticia({ id: 'a', published_at: hoursAgo(1), ai_sentiment: -0.5 }),
      makeNoticia({ id: 'b', published_at: hoursAgo(1), ai_sentiment: -0.5 }),
      makeNoticia({ id: 'c', published_at: hoursAgo(1), ai_sentiment: 0.5 }),
    ];
    const alerts = evaluateNoticiaAggregateAlerts(rows);
    expect(alerts.some((a) => a.ruleId === 'noticia_sentimento_negativo')).toBe(true);
  });

  it('dispara concentração de temas sensíveis quando > 3 notícias de crise em 24h', () => {
    const rows = Array.from({ length: 4 }, (_, i) =>
      makeNoticia({ id: `crise-${i}`, published_at: hoursAgo(1), ai_risk_flags: ['corrupcao'] })
    );
    const alerts = evaluateNoticiaAggregateAlerts(rows);
    expect(alerts.some((a) => a.ruleId === 'noticia_temas_sensiveis')).toBe(true);
  });

  it('não dispara nenhum alerta agregado com dados neutros insuficientes', () => {
    const rows = [makeNoticia({ id: 'a', published_at: hoursAgo(1), ai_sentiment: 0 })];
    const alerts = evaluateNoticiaAggregateAlerts(rows);
    expect(alerts).toHaveLength(0);
  });
});

describe('evaluateInstagramItemAlerts', () => {
  it('gera alerta para post com risco alto', () => {
    const alerts = evaluateInstagramItemAlerts([
      { id: 'p1', candidate_name: 'Cand', text: 'Post', risk: 'alto', sentiment: 'neutro', created_at: new Date().toISOString(), url: 'https://x.com' },
    ]);
    expect(alerts.some((a) => a.ruleId === 'instagram_risco_alto')).toBe(true);
  });

  it('não gera alerta de risco para post de risco baixo', () => {
    const alerts = evaluateInstagramItemAlerts([
      { id: 'p1', risk: 'baixo', sentiment: 'neutro' },
    ]);
    expect(alerts.some((a) => a.ruleId === 'instagram_risco_alto')).toBe(false);
  });

  it('gera alerta de concentração negativa quando >40% dos posts são negativos', () => {
    const posts = [
      { id: 'p1', risk: 'baixo', sentiment: 'negativo' },
      { id: 'p2', risk: 'baixo', sentiment: 'negativo' },
      { id: 'p3', risk: 'baixo', sentiment: 'positivo' },
    ];
    const alerts = evaluateInstagramItemAlerts(posts);
    expect(alerts.some((a) => a.ruleId === 'instagram_sentimento_negativo')).toBe(true);
  });
});

describe('evaluateXItemAlerts', () => {
  it('gera alerta de risco alto quando risk = alto', () => {
    const alerts = evaluateXItemAlerts([{ id: 'x1', risk: 'alto' }]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severidade).toBe('alto');
  });

  it('classifica risco crítico como severidade crítica', () => {
    const alerts = evaluateXItemAlerts([{ id: 'x1', risk: 'critico' }]);
    expect(alerts[0].severidade).toBe('critico');
  });

  it('gera alerta por crisisScore alto mesmo sem risk alto/crítico', () => {
    const alerts = evaluateXItemAlerts([{ id: 'x1', risk: 'baixo', crisisScore: 90 }]);
    expect(alerts.some((a) => a.ruleId === 'x_crise_score_alto')).toBe(true);
  });

  it('não gera alerta para post de baixo risco e crisisScore baixo', () => {
    const alerts = evaluateXItemAlerts([{ id: 'x1', risk: 'baixo', crisisScore: 10 }]);
    expect(alerts).toHaveLength(0);
  });
});

describe('sortAlerts', () => {
  function alert(overrides: Partial<UnifiedAlert>): UnifiedAlert {
    return {
      id: 'a',
      ruleId: 'r',
      nome: 'n',
      origem: 'noticias',
      severidade: 'medio',
      entidade: 'e',
      titulo: 't',
      descricao: 'd',
      metricaAtual: 'm',
      referencia: 'r',
      data: new Date().toISOString(),
      url: null,
      ...overrides,
    };
  }

  it('ordena por severidade decrescente primeiro', () => {
    const alerts = [alert({ id: '1', severidade: 'medio' }), alert({ id: '2', severidade: 'critico' }), alert({ id: '3', severidade: 'alto' })];
    const sorted = sortAlerts(alerts);
    expect(sorted.map((a) => a.id)).toEqual(['2', '3', '1']);
  });

  it('dentro da mesma severidade, ordena por mais recente primeiro', () => {
    const now = Date.now();
    const alerts = [
      alert({ id: 'old', severidade: 'alto', data: new Date(now - 10000).toISOString() }),
      alert({ id: 'new', severidade: 'alto', data: new Date(now).toISOString() }),
    ];
    const sorted = sortAlerts(alerts);
    expect(sorted.map((a) => a.id)).toEqual(['new', 'old']);
  });
});
