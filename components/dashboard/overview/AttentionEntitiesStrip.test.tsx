// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttentionEntitiesStrip from './AttentionEntitiesStrip';
import type { EntityRankItem } from '@/lib/analytics/executive-summary';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const entities: EntityRankItem[] = [
  { nome: 'Flávio Bolsonaro', volume: 446, sentimentoPredominante: 'negativo', riscoPredominante: 'alto', alertas: 3, temaPrincipal: 'política', targetId: 'target-1' },
  { nome: 'Michelle', volume: 27, sentimentoPredominante: 'positivo', riscoPredominante: 'baixo', alertas: 0, temaPrincipal: null, targetId: null },
];

describe('AttentionEntitiesStrip', () => {
  it('exibe iniciais determinísticas como avatar para cada entidade', () => {
    render(<AttentionEntitiesStrip entities={entities} />);
    expect(screen.getByText('FB')).toBeInTheDocument();
    expect(screen.getByText('MI')).toBeInTheDocument();
  });

  it('só oferece a ação de filtro para entidades com targetId real', () => {
    render(<AttentionEntitiesStrip entities={entities} />);
    expect(screen.getAllByRole('button', { name: /Filtrar por/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Filtrar por Flávio Bolsonaro' })).toBeInTheDocument();
  });

  it('mostra a contagem de alertas de cada entidade', () => {
    render(<AttentionEntitiesStrip entities={entities} />);
    expect(screen.getByText('3 alertas')).toBeInTheDocument();
    expect(screen.getByText('0 alertas')).toBeInTheDocument();
  });

  it('limita a exibição a 5 entidades mesmo recebendo mais', () => {
    const many: EntityRankItem[] = Array.from({ length: 8 }, (_, i) => ({
      nome: `Candidato ${i}`,
      volume: 10 - i,
      sentimentoPredominante: null,
      riscoPredominante: null,
      alertas: 0,
      temaPrincipal: null,
      targetId: null,
    }));
    render(<AttentionEntitiesStrip entities={many} />);
    expect(screen.getAllByText(/^0 alertas$/)).toHaveLength(5);
  });

  it('estado vazio é honesto (sem inventar dados) e não exibe mais painel de Temas', () => {
    render(<AttentionEntitiesStrip entities={[]} />);
    expect(screen.getByText('Nenhuma entidade identificada no período.')).toBeInTheDocument();
    expect(screen.queryByText(/Temas em Atenção/)).not.toBeInTheDocument();
  });
});
