import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CommandPalette from '@/components/CommandPalette';
import { MobileSidebarProvider } from '@/components/MobileSidebarContext';
import { requireAuth } from '@/lib/auth/dal';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garante que o usuário está autenticado; redireciona para /login se não.
  const session = await requireAuth();

  const sidebarPerms = {
    role: session.role,
    permissions: session.permissions,
  };

  return (
    <MobileSidebarProvider>
      <div className="min-h-screen bg-[#0D0D0D] flex">
        <CommandPalette permissions={sidebarPerms} />
        {/* Sidebar renderiza uma <aside> fixa só em lg+ e um overlay em
            mobile (ver components/Sidebar.tsx) — nunca reduz a largura do
            conteúdo principal abaixo de lg. */}
        <Sidebar permissions={sidebarPerms} />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
