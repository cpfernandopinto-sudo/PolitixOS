import TopNavigation from '@/components/navigation/TopNavigation';
import { requireAuth } from '@/lib/auth/dal';

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

  return (
    <div className="dashboard-shell flex min-h-screen flex-col">
      <TopNavigation
        permissions={navPermissions}
        userName={session.name}
        roleLabel={ROLE_LABEL[session.role] ?? session.role}
      />
      <main className="dashboard-main flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
