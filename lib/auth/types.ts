// Shared types for auth — safe to import from both server and client components

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

export const ALL_SCREENS: string[] = [
  'dashboard',
  'noticias',
  'instagram',
  'candidatos',
  'automacoes',
  'gestao_crise',
  'apoiadores',
  'configuracoes',
];
