'use client';

import { useState, useCallback } from 'react';
import type { ComponentType, SVGProps } from 'react';
import {
  Newspaper, MessageSquare, BrainCircuit, RefreshCw,
  CheckCircle, XCircle, Loader2, Play, Clock, X,
} from 'lucide-react';
import { triggerN8nWebhook, WEBHOOKS, type WebhookKey } from '@/lib/n8n';

// ---------------------------------------------------------------------------
// Flow definitions
// ---------------------------------------------------------------------------
type FlowStatus = 'idle' | 'loading' | 'success' | 'error';
type FlowIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

interface Flow {
  key: WebhookKey;
  label: string;
  description: string;
  icon: FlowIcon;
  color: string;
  estimatedTime: string;
}

interface FlowSection {
  title: string;
  description: string;
  flows: Flow[];
}

function InstagramIcon({ size = 22, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}

const FLOW_SECTIONS: FlowSection[] = [
  {
    title: 'Notícias',
    description: 'Coleta editorial e indexação de notícias monitoradas.',
    flows: [
      {
        key: 'noticias',
        label: 'Coletar Notícias',
        description: 'Busca e indexa novas notícias sobre os candidatos monitorados.',
        icon: Newspaper,
        color: '#2563EB',
        estimatedTime: '~30s',
      },
    ],
  },
  {
    title: 'Instagram',
    description: 'Fluxos atuais de Instagram mantidos nas mesmas automações.',
    flows: [
      {
        key: 'posts',
        label: 'Coletar Posts Instagram',
        description: 'Importa novos posts do Instagram para monitoramento.',
        icon: InstagramIcon,
        color: '#E1306C',
        estimatedTime: '~45s',
      },
      {
        key: 'comentarios',
        label: 'Coletar Comentários Instagram',
        description: 'Coleta comentários recentes nos posts de Instagram já monitorados.',
        icon: MessageSquare,
        color: '#69C9D0',
        estimatedTime: '~60s',
      },
      {
        key: 'analise',
        label: 'Rodar Análise de IA Instagram',
        description: 'Processa posts pendentes do Instagram com sentimento e risco via IA.',
        icon: BrainCircuit,
        color: '#FACC15',
        estimatedTime: '~2min',
      },
      {
        key: 'reprocessamento',
        label: 'Reprocessar Posts sem Análise Instagram',
        description: 'Reenvia para análise de IA posts de Instagram ainda sem resultado.',
        icon: RefreshCw,
        color: '#22C55E',
        estimatedTime: '~2min',
      },
    ],
  },
  {
    title: 'X/Twitter',
    description: 'Fluxos dedicados para posts, replies e análise do X.',
    flows: [
      {
        key: 'xPosts',
        label: 'Coletar Posts X',
        description: 'Importa novos posts do X para monitoramento.',
        icon: X,
        color: '#64748B',
        estimatedTime: '~45s',
      },
      {
        key: 'xReplies',
        label: 'Coletar Comentários/Replies X',
        description: 'Coleta replies recentes nos posts do X já monitorados.',
        icon: MessageSquare,
        color: '#38BDF8',
        estimatedTime: '~60s',
      },
      {
        key: 'xAiAnalysis',
        label: 'Rodar Análise de IA X',
        description: 'Processa posts pendentes do X com sentimento e risco via IA.',
        icon: BrainCircuit,
        color: '#A78BFA',
        estimatedTime: '~2min',
      },
      {
        key: 'xReprocess',
        label: 'Reprocessar Posts sem Análise X',
        description: 'Reenvia para análise de IA posts do X ainda sem resultado.',
        icon: RefreshCw,
        color: '#14B8A6',
        estimatedTime: '~2min',
      },
    ],
  },
];

const STATUS_LABELS: Record<FlowStatus, string> = {
  idle: 'Aguardando',
  loading: 'Rodando',
  success: 'Finalizado',
  error: 'Erro',
};

// ---------------------------------------------------------------------------
// Status per flow
// ---------------------------------------------------------------------------
interface FlowState {
  status: FlowStatus;
  message: string | null;
  lastRun: Date | null;
}

const initialState = (): FlowState => ({ status: 'idle', message: null, lastRun: null });

const createInitialStates = () => (
  FLOW_SECTIONS.flatMap((section) => section.flows).reduce(
    (acc, flow) => ({ ...acc, [flow.key]: initialState() }),
    {} as Record<WebhookKey, FlowState>
  )
);

const isWebhookConfigured = (url: string | undefined): url is string => Boolean(url?.trim());

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
  const webhookConfigured = isWebhookConfigured(WEBHOOKS[flow.key]);
  const isLoading = state.status === 'loading';
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';
  const isDisabled = isLoading || !webhookConfigured;

  return (
    <div
      className={`bg-[#12192A] border rounded-2xl p-6 flex flex-col gap-5 transition-all duration-200 ${isLoading
          ? 'border-white/10 shadow-lg shadow-black/20'
          : isSuccess
            ? 'border-green-500/20'
            : isError
              ? 'border-red-500/20'
              : !webhookConfigured
                ? 'border-white/5 opacity-75'
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

      {/* Status */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`px-2.5 py-1 rounded-lg border font-medium ${isLoading
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : isSuccess
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : isError
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-white/5 text-gray-400 border-white/10'
            }`}
        >
          {STATUS_LABELS[state.status]}
        </span>

        {!webhookConfigured && (
          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
            Canal indisponível
          </span>
        )}
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
          disabled={isDisabled}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${isLoading
              ? 'bg-white/5 text-gray-400 cursor-wait'
              : webhookConfigured
                ? 'text-white hover:opacity-90 active:scale-95'
                : 'bg-white/5 text-gray-500'
            }`}
          style={
            !isDisabled
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
  const [states, setStates] = useState<Record<WebhookKey, FlowState>>(createInitialStates);

  const setFlowState = useCallback((key: WebhookKey, patch: Partial<FlowState>) => {
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }, []);

  const handleTrigger = useCallback(
    async (key: WebhookKey) => {
      const webhookUrl = WEBHOOKS[key];

      if (!isWebhookConfigured(webhookUrl)) {
        setFlowState(key, {
          status: 'error',
          message: 'Canal indisponível neste ambiente',
        });
        return;
      }

      setFlowState(key, { status: 'loading', message: null });

      try {
        await triggerN8nWebhook(webhookUrl);
        setFlowState(key, {
          status: 'success',
          message: 'Fluxo iniciado com sucesso',
          lastRun: new Date(),
        });
      } catch {
        setFlowState(key, {
          status: 'error',
          message: 'Não foi possível iniciar o processo agora. Tente novamente.',
          lastRun: new Date(),
        });
      }
    },
    [setFlowState]
  );

  const anyLoading = Object.values(states).some((s) => s.status === 'loading');

  return (
    <div className="space-y-8">
      {/* Warning banner when any flow is running */}
      {anyLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium">
          <Loader2 size={16} className="animate-spin flex-shrink-0" />
          Um ou mais fluxos estão em execução. Aguarde a conclusão antes de acionar novamente.
        </div>
      )}

      {FLOW_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            <p className="text-gray-500 text-sm mt-1">{section.description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {section.flows.map((flow) => (
              <FlowCard
                key={flow.key}
                flow={flow}
                state={states[flow.key]}
                onTrigger={handleTrigger}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Disclaimer */}
      <p className="text-gray-600 text-xs text-center pt-2">
        Estas ações acionam manualmente os processos de coleta e análise do PolitixOS.
        Um canal marcado como indisponível ainda não foi configurado neste ambiente.
      </p>
    </div>
  );
}
