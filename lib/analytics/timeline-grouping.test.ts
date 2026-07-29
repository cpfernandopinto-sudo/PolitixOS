import { describe, it, expect } from 'vitest';
import { groupTimelineEvents, type TimelineEventWithMeta } from './timeline-grouping';

function makeEvent(overrides: Partial<TimelineEventWithMeta> = {}): TimelineEventWithMeta {
  return {
    id: 'e1',
    canal: 'Notícias',
    titulo: 'Evento',
    data: new Date().toISOString(),
    severidade: 'media',
    url: null,
    tema: null,
    entidade: null,
    sentimento: null,
    ...overrides,
  };
}

describe('groupTimelineEvents', () => {
  it('agrupa eventos com o mesmo tema (case-insensitive)', () => {
    const events = [
      makeEvent({ id: '1', tema: 'Saúde' }),
      makeEvent({ id: '2', tema: 'saúde' }),
      makeEvent({ id: '3', tema: 'Segurança' }),
    ];
    const groups = groupTimelineEvents(events);
    const saude = groups.find((g) => g.tema.toLowerCase() === 'saúde');
    expect(saude?.quantidade).toBe(2);
  });

  it('eventos sem tema viram grupos isolados (fallback canal+id)', () => {
    const events = [makeEvent({ id: '1', tema: null }), makeEvent({ id: '2', tema: null })];
    const groups = groupTimelineEvents(events);
    expect(groups).toHaveLength(2);
    groups.forEach((g) => expect(g.quantidade).toBe(1));
  });

  it('não duplica eventos entre grupos — cada evento aparece em exatamente um grupo', () => {
    const events = [makeEvent({ id: '1', tema: 'Saúde' }), makeEvent({ id: '2', tema: 'Saúde' }), makeEvent({ id: '3', tema: null })];
    const groups = groupTimelineEvents(events);
    const totalEventos = groups.reduce((sum, g) => sum + g.eventos.length, 0);
    expect(totalEventos).toBe(events.length);
  });

  it('severidadeMax reflete a maior severidade do grupo', () => {
    const events = [makeEvent({ id: '1', tema: 'Saúde', severidade: 'media' }), makeEvent({ id: '2', tema: 'Saúde', severidade: 'alta' })];
    const groups = groupTimelineEvents(events);
    expect(groups[0].severidadeMax).toBe('alta');
  });

  it('coleta entidades associadas sem duplicar', () => {
    const events = [
      makeEvent({ id: '1', tema: 'Saúde', entidade: 'Candidato A' }),
      makeEvent({ id: '2', tema: 'Saúde', entidade: 'Candidato A' }),
      makeEvent({ id: '3', tema: 'Saúde', entidade: 'Candidato B' }),
    ];
    const groups = groupTimelineEvents(events);
    expect(groups[0].entidadesAssociadas.sort()).toEqual(['Candidato A', 'Candidato B']);
  });

  it('calcula sentimento predominante do grupo pela contagem', () => {
    const events = [
      makeEvent({ id: '1', tema: 'Saúde', sentimento: 'negativo' }),
      makeEvent({ id: '2', tema: 'Saúde', sentimento: 'negativo' }),
      makeEvent({ id: '3', tema: 'Saúde', sentimento: 'positivo' }),
    ];
    const groups = groupTimelineEvents(events);
    expect(groups[0].sentimentoPredominante).toBe('negativo');
  });

  it('ordena os grupos pelo evento mais recente', () => {
    const now = Date.now();
    const events = [
      makeEvent({ id: '1', tema: 'Antigo', data: new Date(now - 100000).toISOString() }),
      makeEvent({ id: '2', tema: 'Recente', data: new Date(now).toISOString() }),
    ];
    const groups = groupTimelineEvents(events);
    expect(groups[0].tema).toBe('Recente');
  });

  it('cenário sem dados: lista vazia não lança erro', () => {
    expect(groupTimelineEvents([])).toEqual([]);
  });

  it('é determinístico', () => {
    const events = [makeEvent({ id: '1', tema: 'Saúde' }), makeEvent({ id: '2', tema: 'Segurança' })];
    expect(groupTimelineEvents(events)).toEqual(groupTimelineEvents(events));
  });
});
