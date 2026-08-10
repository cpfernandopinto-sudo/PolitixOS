'use client';

import { useState, Suspense } from 'react';
import { Menu } from 'lucide-react';
import UserMenu from '@/components/navigation/UserMenu';
import MobileNavigationDrawer from '@/components/navigation/MobileNavigationDrawer';
import GlobalContextBar from '@/components/GlobalContextBar';
import { NAV_GROUPS, canSeeNavItem, type NavPermissions } from '@/lib/navigation/dashboardNavigation';

interface Candidate {
  id: string;
  name: string;
}

interface Props {
  permissions: NavPermissions;
  userName: string;
  roleLabel: string;
  candidates: Candidate[];
  generatedAt: string;
}

export default function Header({ permissions, userName, roleLabel, candidates, generatedAt }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavItem(item, permissions)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[72px] items-center gap-2 border-b border-white/[0.08] bg-[#0B0F19]/80 px-4 backdrop-blur-md md:px-6">
        {/* Hamburger menu — mobile only */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu de navegação"
          className="p-2 rounded text-slate-400 hover:text-white hover:bg-white/[0.04] md:hidden shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Global Context Bar — módulo, candidato, período, refresh */}
        <Suspense fallback={<div className="flex-1" />}>
          <GlobalContextBar candidates={candidates} generatedAt={generatedAt} />
        </Suspense>

        {/* Ações da direita */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden items-center gap-2 rounded-sm border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            Operação ativa
          </div>
          <UserMenu name={userName} roleLabel={roleLabel} />
        </div>
      </header>

      <MobileNavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={filteredGroups}
        currentHref=""
      />
    </>
  );
}
