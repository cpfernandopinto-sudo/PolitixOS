import {
  LayoutDashboard,
  Users,
  Vote,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  BrainCircuit,
  ActivitySquare,
  FileText,
  Globe,
  Database,
} from 'lucide-react';

export const CORE_DOSSIER_NOTEBOOKS = [
  { id: 'visao-geral', label: 'Visão Geral', href: '', icon: LayoutDashboard },
  { id: 'demografia', label: 'Demografia', href: '/demografia', icon: Users },
  { id: 'eleitoral', label: 'Eleitoral', href: '/eleicoes', icon: Vote },
  { id: 'seguranca', label: 'Segurança', href: '/seguranca', icon: ShieldAlert },
  { id: 'saude', label: 'Saúde', href: '/saude', icon: Stethoscope },
  { id: 'economia', label: 'Economia', href: '/economia', icon: TrendingUp },
  { id: 'inteligencia-politica', label: 'Inteligência Política', href: '/inteligencia-politica', icon: BrainCircuit },
];

export const TERRITORY_GROUPS = [
  {
    label: 'Síntese Executiva',
    icon: LayoutDashboard,
    items: [
      { label: 'Visão Geral', href: '', icon: LayoutDashboard },
      { label: 'Inteligência Política', href: '/inteligencia-politica', icon: BrainCircuit },
    ],
  },
  {
    label: 'Cadernos Temáticos',
    icon: Users,
    items: [
      { label: 'Demografia', href: '/demografia', icon: Users },
      { label: 'Eleitoral', href: '/eleicoes', icon: Vote },
      { label: 'Segurança', href: '/seguranca', icon: ShieldAlert },
      { label: 'Saúde', href: '/saude', icon: Stethoscope },
      { label: 'Economia', href: '/economia', icon: TrendingUp },
    ],
  },
  {
    label: 'Inteligência & Evidências',
    icon: ActivitySquare,
    items: [
      { label: 'Radar Local', href: '/radar', icon: ActivitySquare },
      { label: 'Briefing Executivo', href: '/briefing', icon: FileText },
      { label: 'Fontes & Métodos', href: '/fontes-metodologia', icon: Database },
    ],
  },
];

export function getActiveGroup(pathname: string, ibge: string) {
  const basePath = `/dashboard/territorios/${ibge}`;

  for (const group of TERRITORY_GROUPS) {
    for (const item of group.items) {
      const itemPath = item.href === '' ? basePath : `${basePath}${item.href}`;
      if (pathname === itemPath) {
        return group;
      }
    }
  }
  return null;
}
