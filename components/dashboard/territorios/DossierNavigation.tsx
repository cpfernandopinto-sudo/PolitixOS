"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  Stethoscope, 
  Landmark, 
  TrendingUp, 
  Briefcase, 
  GraduationCap, 
  HardHat, 
  Train, 
  HeartHandshake, 
  Landmark as Fin, // Just mapping some icon
  MapPin, 
  MessageCircle, 
  BrainCircuit, 
  BookOpen
} from 'lucide-react';

const TABS = [
  { label: 'Visão Geral', href: '', icon: LayoutDashboard },
  { label: 'Demografia', href: '/demografia', icon: Users },
  { label: 'Eleições', href: '/eleicoes', icon: Landmark },
  { label: 'Segurança', href: '/seguranca', icon: ShieldAlert },
  { label: 'Saúde', href: '/saude', icon: Stethoscope },
  { label: 'Economia', href: '/economia', icon: TrendingUp },
  { label: 'Emprego e Renda', href: '/emprego-renda', icon: Briefcase },
  { label: 'Educação', href: '/educacao', icon: GraduationCap },
  { label: 'Infraestrutura', href: '/infraestrutura', icon: HardHat },
  { label: 'Mobilidade', href: '/mobilidade', icon: Train },
  { label: 'Desenvolvimento Social', href: '/desenvolvimento-social', icon: HeartHandshake },
  { label: 'Finanças Públicas', href: '/financas-publicas', icon: Fin },
  { label: 'Território', href: '/territorio-urbanizacao', icon: MapPin },
  { label: 'Ambiente Político', href: '/ambiente-politico', icon: MessageCircle },
  { label: 'Inteligência IA', href: '/inteligencia-ia', icon: BrainCircuit },
  { label: 'Fontes', href: '/fontes-metodologia', icon: BookOpen },
];

export default function DossierNavigation({ ibge }: { ibge: string }) {
  const pathname = usePathname();
  
  // Extrai apenas o último segmento para verificar qual tab está ativa,
  // ou lida com a visão geral que não tem sufixo.
  const isTabActive = (href: string) => {
    const basePath = `/dashboard/territorios/${ibge}`;
    if (href === '') {
      return pathname === basePath;
    }
    return pathname === `${basePath}${href}`;
  };

  return (
    <div className="w-full bg-[#0B0F19] border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 md:px-6 lg:px-8 py-2">
          {TABS.map((tab) => {
            const active = isTabActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={`/dashboard/territorios/${ibge}${tab.href}`}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200
                  ${active 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(34,211,238,0.2)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon size={16} className={active ? 'text-cyan-400' : 'text-slate-500'} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
