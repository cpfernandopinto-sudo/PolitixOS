// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalContextBar, { type CandidateOption } from './GlobalContextBar';

/**
 * Regressão UX-ACCESS-FILTERS-01C: `useSearchParams()` só reflete uma
 * seleção DEPOIS que a navegação do App Router (router.replace) termina —
 * um round-trip real, não instantâneo. O mock abaixo mantém `searchParams`
 * FIXO durante todo o teste (pior caso: a navegação nunca "chega" a tempo
 * do próximo clique), exatamente o cenário que expôs o bug: um segundo
 * clique lendo a seleção anterior a partir de uma URL que ainda não mudou.
 * Se a correção (estado local otimista) regredir, o segundo clique volta a
 * SUBSTITUIR a seleção em vez de somar a ela, e este teste falha.
 */
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/overview',
  useRouter: () => ({ replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

const candidates: CandidateOption[] = [
  { id: 'celina', name: 'Celina Leão' },
  { id: 'michelle', name: 'Michelle Bolsonaro' },
  { id: 'flavio', name: 'Flávio Bolsonaro' },
];

async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Todos os Candidatos/ }));
  return screen.getByRole('listbox');
}

describe('GlobalContextBar — multi-seleção real de candidatos', () => {
  it('marcar Celina e depois Michelle deixa AMBAS selecionadas (não substitui)', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    const listbox = await openDropdown(user);
    await user.click(within(listbox).getByText('Celina Leão'));
    await user.click(within(listbox).getByText('Michelle Bolsonaro'));

    expect(within(listbox).getByRole('option', { name: /Celina Leão/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(listbox).getByRole('option', { name: /Michelle Bolsonaro/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(listbox).getByRole('option', { name: /Flávio Bolsonaro/ })).toHaveAttribute('aria-selected', 'false');

    // Trigger reflete os 2 selecionados (não "1 candidato" nem o nome de um só).
    expect(screen.getByRole('button', { name: 'Celina Leão + Michelle Bolsonaro' })).toBeInTheDocument();

    // A última navegação disparada carrega AMBOS os ids, não só o último clicado.
    const lastCall = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toContain('candidates=celina%2Cmichelle');
  });

  it('clicar num candidato já selecionado remove só ele, preservando os demais', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    const listbox = await openDropdown(user);
    await user.click(within(listbox).getByText('Celina Leão'));
    await user.click(within(listbox).getByText('Michelle Bolsonaro'));
    await user.click(within(listbox).getByText('Celina Leão')); // desmarca Celina

    expect(within(listbox).getByRole('option', { name: /Celina Leão/ })).toHaveAttribute('aria-selected', 'false');
    expect(within(listbox).getByRole('option', { name: /Michelle Bolsonaro/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Michelle Bolsonaro' })).toBeInTheDocument();
  });

  it('3 candidatos selecionados mostram "N candidatos selecionados" no trigger', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    const listbox = await openDropdown(user);
    await user.click(within(listbox).getByText('Celina Leão'));
    await user.click(within(listbox).getByText('Michelle Bolsonaro'));
    await user.click(within(listbox).getByText('Flávio Bolsonaro'));

    expect(screen.getByRole('button', { name: '3 candidatos selecionados' })).toBeInTheDocument();
  });

  it('"Todos os Candidatos" limpa a seleção (volta a ALL_ALLOWED)', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    const listbox = await openDropdown(user);
    await user.click(within(listbox).getByText('Celina Leão'));
    await user.click(within(listbox).getByText('Michelle Bolsonaro'));
    await user.click(within(listbox).getByText('Todos os Candidatos'));

    expect(screen.getByRole('button', { name: 'Todos os Candidatos' })).toBeInTheDocument();
    const lastCall = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).not.toContain('candidates=');
    expect(lastCall).not.toContain('mode=');
  });

  it('o dropdown permanece aberto entre cliques em checkboxes (não fecha a cada seleção)', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    const listbox = await openDropdown(user);
    await user.click(within(listbox).getByText('Celina Leão'));

    // Ainda visível e clicável para o segundo candidato sem reabrir o menu.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(within(screen.getByRole('listbox')).getByText('Michelle Bolsonaro'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  /**
   * Sprint 12, P1/P2 — regressão do bug "dropdown não abre" (causa raiz:
   * app/dashboard/layout.tsx tem overflow-hidden no container raiz que
   * envolve o Header inteiro). A correção move o painel para um portal em
   * document.body — estes testes travam esse comportamento.
   */
  it('CASO OBRIGATÓRIO — renderiza o painel via portal em document.body, fora da árvore do botão', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    const { container } = render(<GlobalContextBar candidates={candidates} />);

    await openDropdown(user);
    const listbox = screen.getByRole('listbox');

    // O painel NÃO é descendente do container de render do componente (não está preso a nenhum
    // overflow/stacking context ancestral) — é filho direto de document.body.
    expect(container.contains(listbox)).toBe(false);
    expect(document.body.contains(listbox)).toBe(true);
    expect(listbox.parentElement).toBe(document.body);
  });

  it('fecha ao pressionar Escape', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    await openDropdown(user);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('fecha ao clicar fora (mesmo o painel vivendo em document.body via portal)', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">fora</div>
        <GlobalContextBar candidates={candidates} />
      </div>
    );

    await openDropdown(user);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clicar DENTRO do painel (portal) nunca é tratado como clique fora — não fecha o menu', async () => {
    mockReplace.mockClear();
    const user = userEvent.setup();
    render(<GlobalContextBar candidates={candidates} />);

    const listbox = await openDropdown(user);
    // Clique num item do próprio painel (fora da árvore DOM do botão) não deve fechar o menu
    // prematuramente antes do onClick da opção processar a seleção.
    await user.click(within(listbox).getByText('Celina Leão'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
