'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, MapPin, ArrowLeft } from 'lucide-react';
import { TERRITORY_GROUPS } from './navigation';

interface Props {
  ibge: string;
  cityName: string;
  uf: string;
}

export default function DossierBreadcrumbs({ ibge, cityName, uf }: Props) {
  const pathname = usePathname();

  // Find active item label from pathname
  let activeNotebookLabel = 'Visão Geral';
  const basePath = `/dashboard/territorios/${ibge}`;

  for (const group of TERRITORY_GROUPS) {
    for (const item of group.items) {
      const itemPath = item.href === '' ? basePath : `${basePath}${item.href}`;
      if (pathname === itemPath) {
        activeNotebookLabel = item.label;
        break;
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-1 border-b border-white/5 mb-2 text-xs">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1.5 text-gray-400 font-medium">
        <Link
          href="/dashboard/territorios"
          className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <MapPin size={13} className="text-cyan-400" />
          <span>Politix Territórios</span>
        </Link>

        <ChevronRight size={12} className="text-gray-600 shrink-0" />

        <span className="text-gray-300 font-mono font-semibold">{uf}</span>

        <ChevronRight size={12} className="text-gray-600 shrink-0" />

        <Link
          href={`/dashboard/territorios/${ibge}`}
          className="text-white font-bold hover:text-cyan-300 transition-colors"
        >
          {cityName}
        </Link>

        <ChevronRight size={12} className="text-gray-600 shrink-0" />

        <span className="text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          {activeNotebookLabel}
        </span>
      </div>

      {/* Action button to change territory */}
      <Link
        href="/dashboard/territorios"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-[11px] font-semibold transition-all"
        title="Retornar à central de seleção de territórios"
      >
        <ArrowLeft size={12} />
        <span>Trocar Cidade</span>
      </Link>
    </div>
  );
}
