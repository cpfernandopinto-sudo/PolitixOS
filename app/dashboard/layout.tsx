import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
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
    <div className="dashboard-shell min-h-screen flex">
      <Sidebar permissions={sidebarPerms} />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header />
        <main className="dashboard-main flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
