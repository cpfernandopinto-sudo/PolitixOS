// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OverviewTimeline from './OverviewTimeline';
import type { TimelineEvent } from '@/lib/queries/overview';

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: '1',
    canal: 'Notícias',
    titulo: 'Notícia de teste',
    data: new Date().toISOString(),
    severidade: 'media',
    url: null,
    tema: 'Saúde',
    entidade: 'Candidato A',
    sentimento: 'negativo',
    ...overrides,
  };
}

describe('OverviewTimeline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exibe estado vazio quando não há eventos', () => {
    render(<OverviewTimeline events={[]} />);
    expect(screen.getByText(/Nenhum evento notável/)).toBeInTheDocument();
  });

  it('renderiza os eventos no modo cronológico por padrão', () => {
    render(<OverviewTimeline events={[makeEvent({ titulo: 'Evento cronológico' })]} />);
    expect(screen.getByText('Evento cronológico')).toBeInTheDocument();
  });

  it('alterna para o modo agrupado por tema ao clicar', () => {
    render(
      <OverviewTimeline
        events={[
          makeEvent({ id: '1', tema: 'Saúde' }),
          makeEvent({ id: '2', tema: 'Saúde' }),
          makeEvent({ id: '3', tema: 'Segurança' }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Agrupada por tema' }));

    expect(screen.getByText('Saúde')).toBeInTheDocument();
    expect(screen.getByText('2 eventos')).toBeInTheDocument();
    expect(screen.getByText('Segurança')).toBeInTheDocument();
  });

  it('filtra por canal', () => {
    render(
      <OverviewTimeline
        events={[
          makeEvent({ id: '1', canal: 'Notícias', titulo: 'Só notícia' }),
          makeEvent({ id: '2', canal: 'Instagram', titulo: 'Só instagram' }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notícias' }));

    expect(screen.getByText('Só notícia')).toBeInTheDocument();
    expect(screen.queryByText('Só instagram')).not.toBeInTheDocument();
  });
});
