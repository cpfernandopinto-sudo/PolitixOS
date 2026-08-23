'use client';

import React, { useActionState } from 'react';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { loginAction, type LoginState } from '@/lib/auth/actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState | undefined, FormData>(
    loginAction,
    undefined
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563EB]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFFF]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass w-full max-w-md p-8 rounded-2xl relative z-10 border border-white/10 shadow-[0_0_50px_rgba(37,99,235,0.1)]">
        <div className="text-center mb-10 flex flex-col items-center">
          <img
            src="/brand/politix.svg"
            alt="Politix"
            className="w-[220px] h-auto mb-4 object-contain"
          />
          <p className="text-gray-400 text-sm">Painel de Inteligência Política em Tempo Real</p>
        </div>

        {state?.error && (
          <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              E-mail Corporativo
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FFFF] transition-colors"
                size={20}
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nome@dominio.com"
                required
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FFFF]/50 focus:ring-1 focus:ring-[#00FFFF]/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative group">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00FFFF] transition-colors"
                size={20}
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FFFF]/50 focus:ring-1 focus:ring-[#00FFFF]/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-login"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-60 text-white py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verificando...
              </>
            ) : (
              'Acessar Plataforma'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
