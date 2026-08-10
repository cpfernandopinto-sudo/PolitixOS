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
    // ESTRUTURA CORRIGIDA: Header full-width acima da linha sidebar+conteúdo.
    // Isso elimina a sobreposição da Brand Area (absolute w-60) sobre o Header.
    // Antes: [Sidebar | [Header + Main]]
    // Agora:  [Header (full-width)      ]
    //         [Sidebar  | Main           ]
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--background)]">
      {/* Header full-width — contém Brand Area + Global Context Bar + User */}
      <Header
        permissions={navPermissions}
        userName={session.name}
        roleLabel={ROLE_LABEL[session.role] ?? session.role}
        candidates={candidates}
        generatedAt={generatedAt}
      />

      {/* Linha de conteúdo abaixo do header: Sidebar + Main */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar lateral — apenas Navigation Area (Brand Area está no Header) */}
        <Sidebar permissions={navPermissions} />

        {/* Área de conteúdo principal */}
        <main className="dashboard-main flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
