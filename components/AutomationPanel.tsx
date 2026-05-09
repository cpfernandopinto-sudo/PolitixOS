'use client';

import { useState, useCallback } from 'react';
import {
  Newspaper, Image, MessageSquare, BrainCircuit, RefreshCw,
  CheckCircle, XCircle, Loader2, Play, Clock,
} from 'lucide-react';
import { triggerN8nWebhook, WEBHOOKS, type WebhookKey } from '@/lib/n8n';

// ---------------------------------------------------------------------------
// Flow definitions
// ---------------------------------------------------------------------------
interface Flow {
  key: WebhookKey;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  estimatedTime: string;
}

const FLOWS: Flow[] = [
  {
    key: 'noticias',
    label: 'Coletar Notícias',
    description: 'Busca e indexa novas notícias sobre os candidatos monitorados.',
    icon: Newspaper,
    color: '#2563EB',
    estimatedTime: '~30s',
  },
  {
    key: 'posts',
    label: 'Coletar Posts',
    description: 'Importa novos posts das redes sociais (Instagram, TikTok, etc).',
    icon: Image,
    color: '#E1306C',
    estimatedTime: '~45s',
  },
  {
    key: 'comentarios',
    label: 'Coletar Comentários',
    description: 'Coleta comentários recentes nos posts já monitorados.',
    icon: MessageSquare,
    color: '#69C9D0',
    estimatedTime: '~60s',
  },
  {
    key: 'analise',
    label: 'Rodar Análise de IA',
    description: 'Processa posts pendentes com análise de sentimento e risco via IA.',
    icon: BrainCircuit,
    color: '#FACC15',
    estimatedTime: '~2min',
  },
  {
    key: 'reprocessamento',
    label: 'Reprocessar Posts sem Análise',
    description: 'Reenvia para análise de IA todos os posts que ainda não possuem resultado.',
    icon: RefreshCw,
    color: '#22C55E',
    estimatedTime: '~2min',
  },
];

// ---------------------------------------------------------------------------
// Status per flow
// ---------------------------------------------------------------------------
type FlowStatus = 'idle' | 'loading' | 'success' | 'error';

interface FlowState {
  status: FlowStatus;
  message: string | null;
  lastRun: Date | null;
}

const initialState = (): FlowState => ({ status: 'idle', message: null, lastRun: null });

// ---------------------------------------------------------------------------
// FlowCard
// ---------------------------------------------------------------------------
interface FlowCardProps {
  flow: Flow;
  state: FlowState;
  onTrigger: (key: WebhookKey) => void;
}

function FlowCard({ flow, state, onTrigger }: FlowCardProps) {
  const Icon = flow.icon;
  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';

  return (
    <div
      className={`bg-[#12192A] border rounded-2xl p-6 flex flex-col gap-5 transition-all duration-200 ${isLoading
          ? 'border-white/10 shadow-lg shadow-black/20'
          : isSuccess
            ? 'border-green-500/20'
            : isError
              ? 'border-red-500/20'
              : 'border-white/5 hover:border-white/10'
        }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            backgroundColor: `${flow.color}18`,
            color: isLoading ? flow.color : isSuccess ? '#22C55E' : isError ? '#FF3B3B' : flow.color,
            border: `1px solid ${flow.color}22`,
          }}
        >
          {isLoading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isSuccess ? (
            <CheckCircle size={22} />
          ) : isError ? (
            <XCircle size={22} />
          ) : (
            <Icon size={22} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base">{flow.label}</h3>
          <p className="text-gray-500 text-sm mt-0.5 leading-relaxed">{flow.description}</p>
        </div>
      </div>

      {/* Status message */}
      {state.message && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${isSuccess
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
        >
          {isSuccess ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {state.message}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 mt-auto">
        {/* Last run + estimate */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock size={12} />
          {state.lastRun ? (
            <span>
              Última execução:{' '}
              {state.lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          ) : (
            <span>Tempo estimado: {flow.estimatedTime}</span>
          )}
        </div>

        {/* Trigger button */}
        <button
          id={`trigger_${flow.key}`}
          onClick={() => onTrigger(flow.key)}
          disabled={isLoading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${isLoading
              ? 'bg-white/5 text-gray-400 cursor-wait'
              : 'text-white hover:opacity-90 active:scale-95'
            }`}
          style={
            !isLoading
              ? {
                background: `linear-gradient(135deg, ${flow.color}cc, ${flow.color})`,
                boxShadow: `0 4px 24px ${flow.color}30`,
              }
              : undefined
          }
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play size={15} />
              Executar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AutomationPanel
// ---------------------------------------------------------------------------
export default function AutomationPanel() {
  const [states, setStates] = useState<Record<WebhookKey, FlowState>>(() => ({
    noticias: initialState(),
    posts: initialState(),
    comentarios: initialState(),
    analise: initialState(),
    reprocessamento: initialState(),
  }));

  const setFlowState = useCallback((key: WebhookKey, patch: Partial<FlowState>) => {
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }, []);

  const handleTrigger = useCallback(
    async (key: WebhookKey) => {
      setFlowState(key, { status: 'loading', message: null });

      try {
        await triggerN8nWebhook(WEBHOOKS[key]);
        setFlowState(key, {
          status: 'success',
          message: 'Fluxo acionado com sucesso! O n8n está processando.',
          lastRun: new Date(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
        setFlowState(key, {
          status: 'error',
          message: msg,
          lastRun: new Date(),
        });
      }
    },
    [setFlowState]
  );

  const anyLoading = Object.values(states).some((s) => s.status === 'loading');

  return (
    <div className="space-y-6">
      {/* Warning banner when any flow is running */}
      {anyLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium">
          <Loader2 size={16} className="animate-spin flex-shrink-0" />
          Um ou mais fluxos estão em execução. Aguarde a conclusão antes de acionar novamente.
        </div>
      )}

      {/* Grid de flows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {FLOWS.map((flow) => (
          <FlowCard
            key={flow.key}
            flow={flow}
            state={states[flow.key]}
            onTrigger={handleTrigger}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-gray-600 text-xs text-center pt-2">
        Os webhooks disparam fluxos no n8n. Configure as URLs em{' '}
        <code className="bg-white/5 px-1.5 py-0.5 rounded text-gray-500">.env.local</code>{' '}
        via variáveis{' '}
        <code className="bg-white/5 px-1.5 py-0.5 rounded text-gray-500">NEXT_PUBLIC_WEBHOOK_*</code>.
      </p>
    </div>
  );
}
