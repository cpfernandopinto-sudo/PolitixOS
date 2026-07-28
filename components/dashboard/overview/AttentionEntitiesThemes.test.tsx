// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttentionEntitiesThemes from './AttentionEntitiesThemes';
import type { EntityRankItem, ThemeRankItem } from '@/lib/analytics/executive-summary';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const entities: EntityRankItem[] = [
  { nome: 'Flávio Bolsonaro', volume: 446, sentimentoPredominante: 'negativo', riscoPredominante: 'alto', alertas: 3, temaPrincipal: 'política', targetId: 'target-1' },
  { nome: 'Michelle', volume: 27, sentimentoPredominante: 'positivo', riscoPredominante: 'baixo', alertas: 0, temaPrincipal: null, targetId: null },
];

const themes: ThemeRankItem[] = [{ tema: 'política', frequencia: 16, sentimento: 0.3 }];

describe('AttentionEntitiesThemes', () => {
  it('exibe iniciais determinísticas como avatar para cada entidade', () => {
    render(<AttentionEntitiesThemes entities={entities} themes={themes} />);
    expect(screen.getByText('FB')).toBeInTheDocument();
    expect(screen.getByText('MI')).toBeInTheDocument();
  });

  it('só mostra a ação "Filtrar" para entidades com targetId real', () => {
    render(<AttentionEntitiesThemes entities={entities} themes={themes} />);
    expect(screen.getAllByText('Filtrar')).toHaveLength(1);
  });

  it('estado vazio de entidades e temas é honesto (sem inventar dados)', () => {
    render(<AttentionEntitiesThemes entities={[]} themes={[]} />);
    expect(screen.getByText('Nenhuma entidade identificada no período.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum tema identificado no período.')).toBeInTheDocument();
  });
});
