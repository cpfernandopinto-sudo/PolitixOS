'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Visão Geral',
  overview: 'Visão Geral',
  noticias: 'Radar de Notícias',
  instagram: 'Radar Instagram',
  x: 'Radar X',
  candidatos: 'Candidatos',
  automacoes: 'Automação',
  investigacoes: 'Investigações',
  usuarios: 'Usuários',
  'sem-permissao': 'Sem permissão',
};

function humanize(segment: string): string {
  return SEGMENT_LABELS[segment] || segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean).filter((s) => s !== 'dashboard');

  // Raiz do dashboard (Visão Geral) — não exibe breadcrumb de um único nível.
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'overview')) {
    return null;
  }

  const crumbs = [
    { href: '/dashboard/overview', label: 'Visão Geral' },
    ...segments.map((segment, i) => ({
      href: `/dashboard/${segments.slice(0, i + 1).join('/')}`,
      label: humanize(segment),
    })),
  ];

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 flex-wrap">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-gray-700 shrink-0" />}
            {isLast ? (
              <span className="text-gray-300 font-medium" aria-current="page">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-gray-300 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
