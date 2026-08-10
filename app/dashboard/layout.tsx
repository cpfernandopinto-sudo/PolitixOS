import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { requireAuth } from '@/lib/auth/dal';
import { getOverviewFiltersOptions } from '@/lib/queries/overview';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  visualizador: 'Visualizador',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Garante que o usuário está autenticado; redireciona para /login se não.
  const session = await requireAuth();

  const navPermissions = {
    role: session.role,
    permissions: session.permissions,
  };

  // Busca lista de candidatos para o Global Context Bar.
  // Admin recebe null → lista completa; demais recebem seus allowedTargetIds.
  const allowedTargetIds = session.role === 'admin' ? null : (session.allowedTargetIds ?? null);
  const candidates = await getOverviewFiltersOptions(allowedTargetIds);

  const generatedAt = new Date().toISOString();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)]">
      {/* Sidebar lateral esquerda permanente */}
      <Sidebar permissions={navPermissions} />

      {/* Conteúdo principal à direita */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          permissions={navPermissions}
          userName={session.name}
          roleLabel={ROLE_LABEL[session.role] ?? session.role}
          candidates={candidates}
          generatedAt={generatedAt}
        />
        <main className="dashboard-main flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
