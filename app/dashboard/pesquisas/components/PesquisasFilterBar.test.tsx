// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PesquisasFilterBar } from './PesquisasFilterBar';
import type { PesquisasFilters } from '@/lib/pesquisas/types';

const baseFilters: PesquisasFilters = {
  uf: 'MG',
  cargo: 'Governador',
  period: 'all',
  instituto: null,
  turno: 1,
  tipoPergunta: 'estimulada',
  candidateNames: null,
};

function setup(overrides: Partial<PesquisasFilters> = {}) {
  const onChange = vi.fn();
  render(
    <PesquisasFilterBar
      filters={{ ...baseFilters, ...overrides }}
      onChange={onChange}
      availableUfs={['MG', 'DF']}
      availableCargos={['Governador']}
      availableInstitutos={['QUAEST']}
      availableCandidates={['Cleitinho', 'Alexandre Kalil']}
      activeTab="cockpit"
      onTabChange={vi.fn()}
      onResetDefault={vi.fn()}
    />
  );
  return { onChange };
}

describe('PesquisasFilterBar — dropdown de candidatos (P0.2 da auditoria)', () => {
  it('CASO OBRIGATÓRIO 10: dropdown abre ao clicar no trigger e a lista aparece', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /todos os candidatos/i }));

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /cleitinho/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /alexandre kalil/i })).toBeInTheDocument();
  });

  it('CASO OBRIGATÓRIO 10/11: selecionar um candidato dispara onChange com o nome dele', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(screen.getByRole('button', { name: /todos os candidatos/i }));
    await user.click(screen.getByRole('option', { name: /^cleitinho$/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ candidateNames: ['Cleitinho'] }));
  });

  it('CASO OBRIGATÓRIO 12: "Selecionar Todos" restaura candidateNames para null', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ candidateNames: ['Cleitinho'] });

    await user.click(screen.getByRole('button', { name: /cleitinho/i }));
    await user.click(screen.getByRole('button', { name: /selecionar todos/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ candidateNames: null }));
  });

  it('fecha ao pressionar Escape', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /todos os candidatos/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('fecha ao clicar fora', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">fora</div>
        <PesquisasFilterBar
          filters={baseFilters}
          onChange={vi.fn()}
          availableUfs={['MG']}
          availableCargos={['Governador']}
          availableInstitutos={[]}
          availableCandidates={['Cleitinho']}
          activeTab="cockpit"
          onTabChange={vi.fn()}
          onResetDefault={vi.fn()}
        />
      </div>
    );

    await user.click(screen.getByRole('button', { name: /todos os candidatos/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('sem candidatos na corrida, mostra mensagem em vez de lista vazia silenciosa', async () => {
    const user = userEvent.setup();
    render(
      <PesquisasFilterBar
        filters={baseFilters}
        onChange={vi.fn()}
        availableUfs={['MG']}
        availableCargos={['Governador']}
        availableInstitutos={[]}
        availableCandidates={[]}
        activeTab="cockpit"
        onTabChange={vi.fn()}
        onResetDefault={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /todos os candidatos/i }));
    expect(screen.getByText(/nenhum candidato nesta corrida/i)).toBeInTheDocument();
  });
});
