import { describe, it, expect } from 'vitest';
import { formatExecutiveRisk } from './risk-language';
import type { UnifiedAlert } from '@/lib/queries/alerts';

function makeAlert(overrides: Partial<UnifiedAlert> = {}): UnifiedAlert {
  return {
    id: 'noticia_risco_critico:1',
    ruleId: 'noticia_risco_critico',
    nome: 'Notícia de risco crítico',
    origem: 'noticias',
    severidade: 'critico',
    entidade: 'Flávio Bolsonaro',
    titulo: 'Flávio Bolsonaro: Motivos para as desculpas de Flávio - blogs.correiobraziliense.com.br',
    descricao: 'Notícia com relevância/risco local no patamar mais alto observado no projeto.',
    metricaAtual: 'local_relevance = 90',
    referencia: '> 85',
    data: '2026-07-01T00:00:00.000Z',
    url: 'https://blogs.correiobraziliense.com.br/example',
    ...overrides,
  };
}

describe('formatExecutiveRisk', () => {
  it('nunca usa o título da notícia/post como headline do risco', () => {
    const alert = makeAlert();
    const formatted = formatExecutiveRisk(alert);
    expect(formatted.headline).not.toBe(alert.titulo);
    expect(formatted.headline).not.toContain('correiobraziliense.com.br');
  });

  it('headline combina o nome da regra com a entidade para alertas de item', () => {
    const formatted = formatExecutiveRisk(makeAlert());
    expect(formatted.headline).toBe('Notícia de risco crítico envolvendo Flávio Bolsonaro');
  });

  it('expõe o título original apenas como evidência principal, com URL', () => {
    const alert = makeAlert();
    const formatted = formatExecutiveRisk(alert);
    expect(formatted.evidenciaPrincipal).toEqual({ titulo: alert.titulo, url: alert.url });
    expect(formatted.evidenceCount).toBe(1);
  });

  it('para alertas agregados (sem item de origem único), usa apenas o nome da regra e não fabrica evidência', () => {
    const alert = makeAlert({
      id: 'noticia_volume_anormal:24h',
      ruleId: 'noticia_volume_anormal',
      nome: 'Pico anormal de menções (24h)',
      entidade: 'Geral',
      titulo: 'Pico anormal de menções (24h)',
      url: null,
    });
    const formatted = formatExecutiveRisk(alert);
    expect(formatted.headline).toBe('Pico anormal de menções (24h)');
    expect(formatted.evidenciaPrincipal).toBeNull();
    expect(formatted.evidenceCount).toBe(0);
  });

  it('não repete "Geral" como se fosse uma entidade real no headline', () => {
    const alert = makeAlert({
      entidade: 'Geral',
      titulo: 'Post específico qualquer',
    });
    const formatted = formatExecutiveRisk(alert);
    expect(formatted.headline).toBe('Notícia de risco crítico');
    expect(formatted.headline).not.toContain('Geral');
  });

  it('preserva a descrição da regra separadamente do headline', () => {
    const alert = makeAlert();
    const formatted = formatExecutiveRisk(alert);
    expect(formatted.descricaoRegra).toBe(alert.descricao);
  });
});
