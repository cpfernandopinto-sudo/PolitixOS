'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface MobileSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null);

/**
 * Estado compartilhado do menu mobile (overlay) entre `Header` (botão de
 * abrir) e `Sidebar` (painel). Necessário porque os dois são componentes
 * irmãos renderizados por `app/dashboard/layout.tsx` (Server Component) —
 * sem um contexto client comum, não haveria como o botão do cabeçalho
 * abrir o painel da sidebar sem prop drilling através do layout do servidor.
 */
export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileSidebarContext.Provider value={{ open, setOpen }}>{children}</MobileSidebarContext.Provider>;
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) throw new Error('useMobileSidebar deve ser usado dentro de MobileSidebarProvider');
  return ctx;
}
