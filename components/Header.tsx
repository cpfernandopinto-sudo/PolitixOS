import { Bell, Search, UserCircle } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 border-b border-white/5 bg-[#0D0D0D]/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar notícias, candidatos ou temas..." 
            className="w-full bg-[#12192A] border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2563EB]/50 focus:ring-1 focus:ring-[#2563EB]/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF3B3B] rounded-full border-2 border-[#0D0D0D]"></span>
        </button>
        <div className="flex items-center gap-3 border-l border-white/5 pl-6">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-white">João Silva</p>
            <p className="text-xs text-gray-500">Administrador</p>
          </div>
          <UserCircle size={32} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
}
