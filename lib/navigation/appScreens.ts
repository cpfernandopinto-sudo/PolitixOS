import {
  LayoutDashboard,
  Newspaper,
  UserPlus,
  Zap,
  FileSearch,
  UserCog,
  Settings,
  MapPin,
  LineChart,
} from 'lucide-react';
import type { NavIcon } from './navIcons';
import { InstagramNavIcon, XNavIcon, FacebookNavIcon } from './navIcons';

/**
 * Catálogo canônico de telas do PolitixOS — fonte única para:
 *   - `NAV_GROUPS` (menu, ver dashboardNavigation.tsx)
 *   - `ALL_SCREENS` (picker "Telas Permitidas" em Gestão de Usuários, ver lib/auth/types.ts)
 *   - `SCREEN_MAP` (proxy.ts, guarda de rota do middleware)
 *
 * Antes desta unificação essas três listas eram mantidas manualmente em
 * arquivos separados e já haviam divergido (proxy.ts não tinha entrada para
 * `/dashboard/x`, deixando a tela sem checagem de permissão no middleware).
 * Não duplicar campos desta tabela em nenhum dos consumidores acima.
 */
export interface AppScreen {
  /** screen_key — persistido em app_user_permissions.screen_key */
  key: string;
  label: string;
  route: string;
  icon: NavIcon;
  /** Grupo de exibição no menu (ordem visual definida em NAV_GROUP_ORDER). */
  group: string;
  description?: string;
  /** Restrita a administradores — não aparece no picker "Telas Permitidas" (não há o que conceder). */
  adminOnly?: boolean;
  /**
   * false = tela ainda não tem página real (stub). Não é grantável no picker,
   * não é enforced pelo proxy (nada a proteger), e aparece no menu marcada
   * como "ainda não implementada" — mesmo padrão já usado para Configurações.
   */
  implemented: boolean;
  /** GlobalContextBar deve renderizar o seletor de candidato multi-select nesta tela. */
  supportsGlobalCandidate: boolean;
  /** GlobalContextBar deve renderizar o seletor de período nesta tela. */
  supportsGlobalPeriod: boolean;
  /**
   * Aparece no menu de navegação. `gestao_crise`/`apoiadores` nunca tiveram
   * item de menu (eram apenas entradas soltas no picker de permissões) — o
   * catálogo preserva isso em vez de introduzir 2 itens "em breve" novos no
   * menu, o que expandiria a superfície visível sem pedido explícito.
   */
  showInNav: boolean;
}

export const NAV_GROUP_ORDER = ['Inteligência', 'Monitoramento', 'Operação', 'Sistema'] as const;

export const APP_SCREENS: AppScreen[] = [
  {
    key: 'dashboard',
    label: 'Visão Geral',
    route: '/dashboard/overview',
    icon: LayoutDashboard,
    group: 'Inteligência',
    description: 'Centro executivo consolidado',
    implemented: true,
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: true,
    showInNav: true,
  },
  {
    key: 'territorios',
    label: 'Territórios',
    route: '/dashboard/territorios',
    icon: MapPin,
    group: 'Inteligência',
    description: 'Dossiês e inteligência municipal',
    implemented: true,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'noticias',
    label: 'Notícias',
    route: '/dashboard/noticias',
    icon: Newspaper,
    group: 'Inteligência',
    description: 'Monitoramento e análise de risco',
    implemented: true,
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: true,
    showInNav: true,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    route: '/dashboard/instagram',
    icon: InstagramNavIcon,
    group: 'Inteligência',
    description: 'Análise de comentários e interações',
    implemented: true,
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: true,
    showInNav: true,
  },
  {
    key: 'x',
    label: 'X',
    route: '/dashboard/x',
    icon: XNavIcon,
    group: 'Inteligência',
    description: 'Discurso político em tempo real',
    implemented: true,
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: true,
    showInNav: true,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    route: '/dashboard/facebook',
    icon: FacebookNavIcon,
    group: 'Inteligência',
    description: 'Comunidades e engajamento político',
    implemented: true,
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: true,
    showInNav: true,
  },
  {
    key: 'investigacoes',
    label: 'Investigações',
    route: '/dashboard/investigacoes',
    icon: FileSearch,
    group: 'Inteligência',
    description: 'Dossiês e investigações profundas',
    implemented: true,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'pesquisas',
    label: 'Pesquisas Eleitorais',
    route: '/dashboard/pesquisas',
    icon: LineChart,
    group: 'Inteligência',
    description: 'Monitor oficial de pesquisas registradas no TSE/PesqEle',
    implemented: true,
    // Sprint 2B, P0.1: reavaliado como o comentário original previa —
    // PESQUISAS-01B confirmou o vínculo real electoral_poll_results.candidate_id
    // → targets.id (auditoria MG/Governador), então o candidato global agora
    // tem o que filtrar. Período global segue false: os filtros locais de
    // Pesquisas (Período/Turno/Tipo) já cobrem esse eixo com semântica
    // própria (ver lib/pesquisas/periodFilter.ts) — não é o mesmo período
    // (dias corridos) que Visão Geral/Notícias/Instagram/X consomem.
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'candidatos',
    label: 'Candidatos/Entidades',
    route: '/dashboard/candidatos',
    icon: UserPlus,
    group: 'Monitoramento',
    description: 'Perfil de candidatos monitorados',
    implemented: true,
    supportsGlobalCandidate: true,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'automacoes',
    label: 'Automação/Operação',
    route: '/dashboard/automacoes',
    icon: Zap,
    group: 'Operação',
    description: 'Integrações e alertas automáticos',
    implemented: true,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'usuarios',
    label: 'Usuários',
    route: '/dashboard/usuarios',
    icon: UserCog,
    group: 'Sistema',
    description: 'Gestão de acessos',
    adminOnly: true,
    implemented: true,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    route: '/dashboard/configuracoes',
    icon: Settings,
    group: 'Sistema',
    description: 'Configurações do sistema',
    implemented: false,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: true,
  },
  {
    key: 'gestao_crise',
    label: 'Gestão de Crise',
    route: '/dashboard/gestao-crise',
    icon: Zap,
    group: 'Operação',
    implemented: false,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: false,
  },
  {
    key: 'apoiadores',
    label: 'Apoiadores',
    route: '/dashboard/apoiadores',
    icon: UserPlus,
    group: 'Monitoramento',
    implemented: false,
    supportsGlobalCandidate: false,
    supportsGlobalPeriod: false,
    showInNav: false,
  },
];

export function findAppScreen(key: string): AppScreen | undefined {
  return APP_SCREENS.find((s) => s.key === key);
}

export function findAppScreenByRoute(pathname: string): AppScreen | undefined {
  return APP_SCREENS.find((s) => pathname === s.route || pathname.startsWith(`${s.route}/`));
}
