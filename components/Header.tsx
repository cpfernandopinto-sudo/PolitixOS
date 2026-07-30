import { Bell, Search, ShieldCheck, UserCircle } from 'lucide-react';
import { getSession } from '@/lib/auth/dal';
import LogoutButton from '@/components/LogoutButton';

export default async function Header() {
  const session = await getSession();

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    visualizador: 'Visualizador',
  };

  return (
    <header className="h-[72px] border-b border-white/[0.07] bg-[#080d17]/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative hidden sm:block w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            type="text"
            placeholder="Buscar notícias, candidatos ou temas..."
            aria-label="Busca global"
            className="w-full bg-white/[0.035] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div className="sm:hidden flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <ShieldCheck size={17} className="text-blue-400" />
          Intelligence
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden xl:flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          Operação ativa
        </div>
        <button aria-label="Notificações" className="relative rounded-xl p-2.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF3B3B] rounded-full border-2 border-[#0D0D0D]" />
        </button>

        <div className="flex items-center gap-3 border-l border-white/[0.08] pl-3 md:pl-5">
          {session && (
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-white">{session.name}</p>
              <p className="text-xs text-gray-500">{roleLabel[session.role] ?? session.role}</p>
            </div>
          )}
          <UserCircle size={32} className="text-slate-400" />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
