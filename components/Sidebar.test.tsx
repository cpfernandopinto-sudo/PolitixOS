// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Sidebar from './Sidebar';
import HeaderMenuButton from './HeaderMenuButton';
import { MobileSidebarProvider } from './MobileSidebarContext';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/overview',
}));

const adminPerms = { role: 'admin', permissions: [] };

function renderWithMenuButton() {
  return render(
    <MobileSidebarProvider>
      <HeaderMenuButton />
      <Sidebar permissions={adminPerms} />
    </MobileSidebarProvider>
  );
}

describe('Sidebar — overlay mobile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('o overlay mobile começa fechado (nenhum diálogo de navegação no DOM)', () => {
    renderWithMenuButton();
    expect(screen.queryByRole('dialog', { name: 'Menu de navegação' })).not.toBeInTheDocument();
  });

  it('o botão de menu do cabeçalho abre o overlay de navegação mobile', () => {
    renderWithMenuButton();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();
  });

  it('Esc fecha o overlay mobile', () => {
    renderWithMenuButton();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Menu de navegação' })).not.toBeInTheDocument();
  });

  it('clicar em um item de navegação fecha o overlay', () => {
    renderWithMenuButton();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    const dialog = screen.getByRole('dialog', { name: 'Menu de navegação' });

    fireEvent.click(within(dialog).getByRole('link', { name: /Radar de Notícias/ }));
    expect(screen.queryByRole('dialog', { name: 'Menu de navegação' })).not.toBeInTheDocument();
  });

  it('a sidebar fixa de desktop fica oculta em telas pequenas via classe responsiva', () => {
    const { container } = renderWithMenuButton();
    const desktopAside = container.querySelector('aside');
    expect(desktopAside?.className).toContain('hidden');
    expect(desktopAside?.className).toContain('lg:flex');
  });
});
