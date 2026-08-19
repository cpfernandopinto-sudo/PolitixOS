// Shared types for auth — safe to import from both server and client components

import { APP_SCREENS } from '@/lib/navigation/appScreens';

export type UserRole = 'admin' | 'gestor' | 'visualizador';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserFormState {
  error?: string;
  success?: boolean;
}

/**
 * screen_key grantáveis no picker "Telas Permitidas" — derivado do catálogo
 * canônico (`lib/navigation/appScreens.ts`). Exclui telas `adminOnly` (não há
 * o que conceder — o acesso vem do role) e telas ainda não implementadas
 * (`implemented: false`, ex.: Configurações/Gestão de Crise/Apoiadores —
 * conceder uma permissão para uma página inexistente só confundiria quem
 * administra usuários).
 */
export const ALL_SCREENS: string[] = APP_SCREENS.filter((s) => s.implemented && !s.adminOnly).map(
  (s) => s.key
);
