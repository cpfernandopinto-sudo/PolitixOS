'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
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
      {/*
        ESTRUTURA DO HEADER — full-width, flex-row:

        ┌─────────────────────────────────────────────────────────────────┐
        │ BRAND AREA (w-60, shrink-0) │ CONTEXT AREA (flex-1, min-w-0)   │
        │ Logo PolitixOS              │ Módulo | Candidato | Período | ↻  │
        │                             │ Operação Ativa | Usuário           │
        └─────────────────────────────────────────────────────────────────┘

        - BrandArea tem largura fixa w-60 (240px) — mesmo valor que a sidebar
          expandida — e nunca recolhe. É SHRINK-0: não cede espaço.
        - ContextArea é flex-1 min-w-0: preenche o resto sem transbordar.
        - Não há sobreposição possível: são irmãos em flex-row dentro do header.
      */}
      <header className="relative z-50 flex h-[72px] w-full shrink-0 border-b border-white/[0.08] bg-[#0B0F19]">

        {/* ── BRAND AREA ────────────────────────────────────────────────
            Largura fixa w-60 (240px), não recolhe, alinhada à sidebar.
            Contém somente a logo — sem botão de colapso. */}
        <div className="hidden md:flex w-60 shrink-0 items-center px-5 border-r border-white/[0.08] select-none">
          <Link href="/dashboard/overview" className="flex items-center">
            <img
              src="/brand/politix.svg"
              alt="Politix"
              className="w-[160px] h-auto shrink-0 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            />
          </Link>
        </div>

        {/* ── CONTEXT AREA ──────────────────────────────────────────────
            flex-1 min-w-0: preenche todo o espaço restante sem overflow.
            Contém: hamburger (mobile) | GlobalContextBar | ações direita */}
        <div className="flex flex-1 min-w-0 items-center gap-2 px-4 backdrop-blur-md bg-[#0B0F19]/80 md:px-6">
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
          <div className="flex-1 min-w-0">
            <Suspense fallback={<div className="h-10 w-full" />}>
              <GlobalContextBar candidates={candidates} generatedAt={generatedAt} />
            </Suspense>
          </div>

          {/* Ações da direita — sempre ancoradas à extrema direita */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden items-center gap-2 rounded-sm border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 xl:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              Operação ativa
            </div>
            <UserMenu name={userName} roleLabel={roleLabel} />
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <MobileNavigationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          groups={filteredGroups}
          currentHref=""
        />
      </Suspense>
    </>
  );
}
