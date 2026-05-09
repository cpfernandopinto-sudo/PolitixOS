import React from 'react';
import { Lock, Mail } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFFF]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass w-full max-w-md p-8 rounded-2xl relative z-10 border border-white/10 shadow-[0_0_50px_rgba(37,99,235,0.1)]">
        <div className="text-center mb-10 flex flex-col items-center">
          <img 
            src="/brand/PolitixOS.png" 
            alt="PolitixOS Logo" 
            className="w-auto h-auto max-w-[240px] mb-4 object-contain" 
          />
          <p className="text-gray-400 text-sm">Painel de Inteligência Política em Tempo Real</p>
        </div>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">E-mail Corporativo</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FFFF] transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="nome@dominio.com"
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FFFF]/50 focus:ring-1 focus:ring-[#00FFFF]/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FFFF] transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FFFF]/50 focus:ring-1 focus:ring-[#00FFFF]/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded bg-[#12192A] border-white/10 text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-[#0D0D0D]" />
              <span className="text-gray-400 group-hover:text-white transition-colors">Lembrar-me</span>
            </label>
            <a href="#" className="text-[#00FFFF] hover:underline hover:text-[#00FFFF]/80 transition-colors">Esqueceu a senha?</a>
          </div>

          <Link 
            href="/dashboard/noticias"
            className="w-full flex items-center justify-center bg-[#2563EB] hover:bg-[#2563EB]/90 text-white py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
          >
            Acessar Plataforma
          </Link>
        </form>
      </div>
    </div>
  );
}
