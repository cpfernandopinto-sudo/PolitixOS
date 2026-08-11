'use client';

import { Clock, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { TerritoryBriefingStatus } from '@/lib/types/territories';

interface StatusMeta {
  label: string;
  icon: typeof Clock;
  className: string;
  spin?: boolean;
}

// Cobre os 7 estados homologados no Bloco 1 (Seção 18) para que a UI já
// saiba renderizar qualquer status que os blocos futuros (motores n8n)
// venham a produzir — mesmo que, neste bloco, só 'nao_iniciado' e 'erro'
// sejam de fato alcançáveis pela ação de criação do briefing.
const STATUS_META: Record<TerritoryBriefingStatus, StatusMeta> = {
  nao_iniciado: { label: 'Não iniciado', icon: Clock, className: 'text-gray-400 bg-white/5 border-white/10' },
  coletando: { label: 'Coletando dados', icon: Loader2, className: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', spin: true },
  processando: { label: 'Processando', icon: Loader2, className: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', spin: true },
  analisando: { label: 'Analisando', icon: Loader2, className: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', spin: true },
  concluido: { label: 'Concluído', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  parcial: { label: 'Parcial', icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  erro: { label: 'Erro', icon: XCircle, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

interface Props {
  status: TerritoryBriefingStatus;
  detail?: string | null;
}

export default function BriefingStatus({ status, detail }: Props) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${meta.className}`}>
      <Icon size={16} className={meta.spin ? 'animate-spin' : ''} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{meta.label}</p>
        {detail && <p className="text-xs opacity-80 truncate">{detail}</p>}
      </div>
    </div>
  );
}
