import { ShieldOff } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Sem Permissão' };

export default function SemPermissaoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl" />
        <div className="relative w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <ShieldOff size={40} className="text-red-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Acesso Negado</h1>
        <p className="text-gray-400 max-w-md">
          Você não tem permissão para acessar esta tela. Entre em contato com o administrador do
          sistema para solicitar acesso.
        </p>
      </div>

      <Link
        href="/dashboard/overview"
        className="px-6 py-3 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}
