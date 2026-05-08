import { AlertTriangle, TrendingUp, AlertOctagon } from 'lucide-react';
import type { CrisisAlert as CrisisAlertType } from '@/lib/queries/noticias';

interface CrisisAlertProps {
  alert: CrisisAlertType;
}

export default function CrisisAlert({ alert }: CrisisAlertProps) {
  const isCritical = alert.nivel === 'critico';
  
  const Icon = alert.tipo === 'volume' 
    ? TrendingUp 
    : alert.tipo === 'risco' 
      ? AlertOctagon 
      : AlertTriangle;

  return (
    <div className={`flex items-center p-4 rounded-xl border ${
      isCritical 
        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
    }`}>
      <Icon className="w-5 h-5 mr-3 shrink-0" />
      <span className="font-medium text-sm">{alert.mensagem}</span>
    </div>
  );
}
