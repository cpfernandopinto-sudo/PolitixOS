'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import ModuleSwitcher from './ModuleSwitcher';
import MobileNavigationDrawer from './MobileNavigationDrawer';
import UserMenu from './UserMenu';
import {
  NAV_GROUPS,
  canSeeNavItem,
  findCurrentNavItem,
  type NavPermissions,
} from '@/lib/navigation/dashboardNavigation';

interface Props {
  permissions: NavPermissions;
  userName: string;
  roleLabel: string;
}

/**
 * Substitui Sidebar + Header (rescue) por uma única barra superior compacta,
 * liberando toda a largura antes ocupada pela sidebar fixa para o conteúdo
 * (Panorama Analítico, tabelas, gráficos). Rotas/permissões/busca/logout são
 * os mesmos de antes — só a apresentação/organização do chrome mudou.
 */
export default function TopNavigation({ permissions, userName, roleLabel }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Fecha o drawer mobile ao trocar de rota — ajuste de estado durante o
  // render (padrão recomendado pelo React) em vez de setState num efeito.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setDrawerOpen(false);
  }

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavItem(item, permissions)),
  })).filter((group) => group.items.length > 0);

  const currentItem = findCurrentNavItem(pathname);

  return (
    <>
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-white/[0.07] bg-[#080d17]/90 px-3 backdrop-blur-xl md:px-6">
      {/* Logo — mesmo logotipo em todas as larguras (não há símbolo isolado
          na marca), só reduz de tamanho em telas menores. Escala reduzida
          ~9% (Fase 2 de refinamento) e respiro explícito até o seletor de
          módulo, em vez de depender do gap uniforme da barra. Ajuste final:
          tablet com respiro reduzido (20px) e notebook/desktop no topo da
          meta de 24-28px (28px). Clica para Visão Geral. */}
      <Link
        href="/dashboard/overview"
        aria-label="Ir para Visão Geral"
        className="mr-3 flex shrink-0 items-center md:mr-5 lg:mr-7"
      >
        <img
          src="/brand/PolitixOS.png"
          alt="PolitixOS"
          className="h-[22px] w-auto object-contain drop-shadow-[0_0_18px_rgba(59,130,246,0.18)] sm:h-[25px] md:h-[29px]"
        />
      </Link>

      {/* Seletor de módulo — desktop/tablet */}
      <div className="mr-3 hidden md:block md:mr-4">
        <ModuleSwitcher groups={filteredGroups} />
      </div>

      {/* Botão de menu — mobile, abre o drawer. O módulo atual já aparece no
          título da própria página (h1) logo abaixo da barra, então aqui só o
          ícone — nomes de módulo mais longos ("Gestão de Crise") não cabem
          ao lado do logo + busca + ações num viewport de 360-390px. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        aria-label={`Abrir menu de navegação — módulo atual: ${currentItem?.label ?? 'nenhum'}`}
        className="shrink-0 rounded-lg p-2 text-slate-200 transition-colors hover:bg-white/[0.06] md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Espaçador flexível — ocupa o espaço da barra de busca até que a
          busca global tenha uma implementação funcional real (ver
          RELATORIO_FASE1_INTEGRIDADE_CONFIANCA_POLITIXOS.md, Objetivo 5). */}
      <div className="flex-1" />

      {/* Ações à direita */}
      <div className="flex shrink-0 items-center gap-2 lg:gap-[14px] xl:gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          Operação ativa
        </div>
        <UserMenu name={userName} roleLabel={roleLabel} />
      </div>
    </header>

    {/* Fora do <header> (que é `sticky`) para que o `fixed inset-0` do
        drawer cubra a viewport inteira, não apenas a altura da barra. */}
    <MobileNavigationDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      groups={filteredGroups}
      currentHref={currentItem?.href ?? ''}
    />
    </>
  );
}
