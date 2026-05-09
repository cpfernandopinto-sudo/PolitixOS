'use client';

import { LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/auth/actions';

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        title="Sair"
        className="p-1.5 rounded-lg text-gray-400 hover:text-[#FF3B3B] hover:bg-red-500/10 transition-colors"
      >
        <LogOut size={18} />
      </button>
    </form>
  );
}
