import {
  LayoutDashboard, Users, HardHat, Train, HeartHandshake, Landmark,
  MessageCircle, ShieldAlert, Stethoscope, GraduationCap, TrendingUp,
  Briefcase, PiggyBank, ActivitySquare, BrainCircuit, FileText, Globe, Database,
  Map, HandPlatter
} from 'lucide-react';

export const TERRITORY_GROUPS = [
  {
    label: 'Visão Geral',
    icon: LayoutDashboard,
    items: [
      { label: 'Visão Geral', href: '', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Território',
    icon: Map,
    items: [
      { label: 'Demografia', href: '/demografia', icon: Users },
      { label: 'Infraestrutura', href: '/infraestrutura', icon: HardHat },
      { label: 'Mobilidade', href: '/mobilidade', icon: Train },
      { label: 'Desenv. Social', href: '/desenvolvimento-social', icon: HeartHandshake },
    ]
  },
  {
    label: 'Política',
    icon: Landmark,
    items: [
      { label: 'Eleições', href: '/eleicoes', icon: Landmark },
      { label: 'Amb. Político', href: '/ambiente-politico', icon: MessageCircle },
    ]
  },
  {
    label: 'Serviços',
    icon: HandPlatter,
    items: [
      { label: 'Segurança', href: '/seguranca', icon: ShieldAlert },
      { label: 'Saúde', href: '/saude', icon: Stethoscope },
      { label: 'Educação', href: '/educacao', icon: GraduationCap },
    ]
  },
  {
    label: 'Economia',
    icon: TrendingUp,
    items: [
      { label: 'Economia', href: '/economia', icon: TrendingUp },
      { label: 'Emprego e Renda', href: '/emprego-renda', icon: Briefcase },
      { label: 'Finanças', href: '/financas-publicas', icon: PiggyBank },
    ]
  },
  {
    label: 'Inteligência',
    icon: BrainCircuit,
    items: [
      { label: 'Radar', href: '/radar', icon: ActivitySquare },
      { label: 'Análise IA', href: '/inteligencia-ia', icon: BrainCircuit },
      { label: 'Briefing Executivo', href: '/briefing', icon: FileText },
      { label: 'Inteligência Externa', href: '/inteligencia-externa', icon: Globe },
      { label: 'Evidências', href: '/fontes-metodologia', icon: Database },
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
