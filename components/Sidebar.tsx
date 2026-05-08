import Link from 'next/link';
import { LayoutDashboard, Newspaper, AlertTriangle, Users, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[#0D0D0D] border-r border-white/5 flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="text-[#00FFFF]">Politix</span>OS
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <LayoutDashboard size={20} />
          <span className="font-medium">Visão Geral</span>
        </Link>
        <Link href="/dashboard/noticias" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600/10 text-[#2563EB] border border-blue-500/20 transition-colors">
          <Newspaper size={20} className="text-[#2563EB]" />
          <span className="font-medium">Radar de Notícias</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <AlertTriangle size={20} />
          <span className="font-medium">Gestão de Crise</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Users size={20} />
          <span className="font-medium">Apoiadores</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Settings size={20} />
          <span className="font-medium">Configurações</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-[#FF3B3B] hover:bg-red-500/10 transition-colors">
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
