'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSearch, Loader2 } from 'lucide-react';
import type { StartInvestigationPayload, StartInvestigationResponse } from '@/lib/types/investigations';

type ButtonState = 'idle' | 'loading' | 'success' | 'error' | 'exists';
type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

interface Props {
  mention: {
    id: string;
    candidate_name: string | null;
    candidate_id?: string | null;
    title: string | null;
    summary: string | null;
    url: string | null;
    source: string | null;
    published_at: string | null;
    city: string | null;
  };
}

export default function InvestigationButton({ mention }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const redirectToInvestigation = (investigationId: string) => {
    window.setTimeout(() => {
      router.push(`/dashboard/investigacoes/${investigationId}`);
    }, 700);
  };

  const handleStart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (state === 'loading') return;

    setState('loading');
    setErrorMsg('');
    setToast(null);

    const payload: StartInvestigationPayload = {
      mention_id: mention.id,
      candidate_id: mention.candidate_id ?? mention.candidate_name ?? mention.id,
      candidate_name: mention.candidate_name ?? 'Desconhecido',
      source_url: mention.url?.trim() || '#',
      original_title: mention.title ?? '',
      original_summary: mention.summary ?? '',
      published_at: mention.published_at ?? new Date().toISOString(),
      source: mention.source ?? 'Fonte não informada',
      city: mention.city ?? 'Não informada',
    };

    try {
      const res = await fetch('/api/investigations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data: StartInvestigationResponse;
      try {
        data = raw ? JSON.parse(raw) : { success: false, error: 'Resposta vazia da API de investigação.' };
      } catch {
        data = { success: false, error: raw || 'Resposta inválida da API de investigação.' };
      }

      if (!res.ok || data.success !== true) {
        setState('error');
        const message = data.error ?? data.message ?? 'Erro desconhecido ao iniciar investigação.';
        console.warn('[Investigação Profunda] Falha na API interna:', {
          httpStatus: res.status,
          code: data.code,
          statusCode: data.statusCode,
          missingEnv: data.missing_env,
          n8nStatus: data.n8n_status,
          n8nStatusText: data.n8n_status_text,
          n8nResponse: data.n8n_response,
          details: data.details,
        });
        setErrorMsg(message);
        setToast({ type: 'error', message });
        return;
      }

      if (!data.investigation_id) {
        const message = data.message ?? data.error ?? 'API de investigação não retornou investigation_id.';
        console.warn('[Investigação Profunda] Resposta incompleta da API interna:', data);
        setState('error');
        setErrorMsg(message);
        setToast({ type: 'error', message });
        return;
      }

      if (data.already_exists) {
        setState('exists');
        setToast({ type: 'info', message: 'Investigação já existente' });
      } else {
        setState('success');
        setToast({ type: 'success', message: 'Dossiê gerado com sucesso' });
      }

      redirectToInvestigation(data.investigation_id);
    } catch {
      setState('error');
      const message = 'Falha de comunicação com o servidor.';
      setErrorMsg(message);
      setToast({ type: 'error', message });
    }
  };

  const buttonLabel = {
    idle: 'Investigação Profunda',
    loading: 'Investigando...',
    success: 'Dossiê gerado',
    error: 'Erro ao investigar',
    exists: 'Dossiê gerado',
  }[state];

  const buttonClass = {
    idle: 'border-[#00FFFF]/25 text-[#00FFFF] hover:bg-[#00FFFF]/10 hover:text-white hover:shadow-[0_0_18px_rgba(0,255,255,0.16)]',
    loading: 'border-blue-500/30 text-blue-400 cursor-not-allowed opacity-70',
    success: 'border-green-500/30 text-green-400',
    error: 'border-red-500/30 text-red-400',
    exists: 'border-green-500/30 text-green-400',
  }[state];

  return (
    <>
      <button
        onClick={handleStart}
        disabled={state === 'loading'}
        title={state === 'error' ? errorMsg : 'Investigação Profunda'}
        aria-label="Investigação Profunda"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${buttonClass}`}
      >
        {state === 'loading' ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <FileSearch size={13} />
        )}
        <span className="whitespace-nowrap">{buttonLabel}</span>
      </button>

      {toast && (
        <div
          role="status"
          className={`fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-md ${
            toast.type === 'error'
              ? 'border-red-500/30 bg-red-950/80 text-red-200'
              : toast.type === 'info'
                ? 'border-blue-500/30 bg-blue-950/80 text-blue-200'
                : 'border-green-500/30 bg-green-950/80 text-green-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
