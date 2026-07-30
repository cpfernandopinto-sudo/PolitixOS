import { UserCircle } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

interface Props {
  name: string;
  roleLabel: string;
}

/**
 * Bloco de identidade/logout do topo — mesmo conteúdo e mesma ação de logout
 * do Header anterior, só reorganizado como componente dedicado. Nome/papel só
 * aparecem a partir de `lg` (notebook/desktop) — em `md` (tablet) ainda não
 * há espaço ao lado do seletor de módulo + busca sem causar scroll horizontal
 * (ver item 9: tablet = "ações somente ícone"). Avatar e logout permanecem
 * sempre visíveis.
 */
export default function UserMenu({ name, roleLabel }: Props) {
  return (
    <div className="flex items-center gap-3 border-l border-white/[0.08] pl-3 lg:pl-5">
      <div className="hidden text-right lg:block">
        <p className="text-sm font-medium leading-tight text-white">{name}</p>
        <p className="text-xs leading-tight text-gray-500">{roleLabel}</p>
      </div>
      <UserCircle size={32} className="shrink-0 text-slate-400" />
      <LogoutButton />
    </div>
  );
}
