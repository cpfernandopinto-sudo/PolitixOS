import { Bell, UserCircle } from 'lucide-react';
import { getSession } from '@/lib/auth/dal';
import LogoutButton from '@/components/LogoutButton';
import HeaderSearchTrigger from '@/components/HeaderSearchTrigger';

export default async function Header() {
  const session = await getSession();

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    visualizador: 'Visualizador',
  };

  return (
    <header className="h-16 border-b border-white/5 bg-[#0D0D0D]/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 flex-1">
        <HeaderSearchTrigger />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF3B3B] rounded-full border-2 border-[#0D0D0D]" />
        </button>

        <div className="flex items-center gap-3 border-l border-white/5 pl-6">
          {session && (
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-white">{session.name}</p>
              <p className="text-xs text-gray-500">{roleLabel[session.role] ?? session.role}</p>
            </div>
          )}
          <UserCircle size={32} className="text-gray-400" />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
