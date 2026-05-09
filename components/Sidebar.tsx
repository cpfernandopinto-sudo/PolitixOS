'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Newspaper, AlertTriangle, Users, Settings, LogOut, Hash, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('politixos_sidebar_collapsed');
    if (stored) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('politixos_sidebar_collapsed', String(newVal));
  };

  const isOverview = pathname === '/dashboard' || pathname === '/dashboard/overview';
  const isNews = pathname === '/dashboard/noticias';
  const isInstagram = pathname === '/dashboard/instagram';
  const isCrisis = pathname === '/dashboard/crise' || pathname === '/dashboard/gestao-crise';
  const isSupporters = pathname === '/dashboard/apoiadores';

  const linkClass = (isActive: boolean) => 
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-600/10 text-[#2563EB] border border-blue-500/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
    } ${collapsed ? 'justify-center' : ''}`;

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 bg-[#0D0D0D] border-r border-white/5 flex flex-col z-50 transition-all duration-300`}>
      <div className={`p-6 flex items-center min-h-[80px] ${collapsed ? 'justify-center' : 'justify-start'}`}>
        {!collapsed && (
          <img 
            src="/brand/PolitixOS.png" 
            alt="PolitixOS Logo" 
            className="w-full max-w-[160px] h-auto object-contain" 
          />
        )}
        {collapsed && (
          <img 
            src="/brand/PolitixOS.png" 
            alt="PolitixOS" 
            className="w-10 h-auto object-contain" 
          />
        )}
      </div>

      {/* Toggle button */}
      <div className={`px-4 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-x-hidden overflow-y-auto">
        <Link href="/dashboard" className={linkClass(isOverview)} title="Visão Geral">
          <LayoutDashboard size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Visão Geral</span>}
        </Link>
        <Link href="/dashboard/noticias" className={linkClass(isNews)} title="Radar de Notícias">
          <Newspaper size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Radar de Notícias</span>}
        </Link>
        <Link href="/dashboard/instagram" className={linkClass(isInstagram)} title="Radar Instagram">
          <Hash size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Radar Instagram</span>}
        </Link>
        <Link href="#" className={linkClass(isCrisis)} title="Gestão de Crise">
          <AlertTriangle size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Gestão de Crise</span>}
        </Link>
        <Link href="#" className={linkClass(isSupporters)} title="Apoiadores">
          <Users size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Apoiadores</span>}
        </Link>
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? 'justify-center' : ''}`} title="Configurações">
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Configurações</span>}
        </button>
        <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-[#FF3B3B] hover:bg-red-500/10 transition-colors ${collapsed ? 'justify-center' : ''}`} title="Sair">
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium whitespace-nowrap">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
