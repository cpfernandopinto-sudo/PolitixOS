import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface KpiCardProps {
  title: string;
  value: string | number;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  compact?: boolean;
}

export default function KpiCard({ title, value, status = 'neutral', compact = false }: KpiCardProps) {
  const statusStyles = {
    success: 'text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.15)] border-[#22C55E]/30',
    warning: 'text-[#FACC15] shadow-[0_0_15px_rgba(250,204,21,0.15)] border-[#FACC15]/30',
    danger: 'text-[#FF3B3B] glow-danger border-[#FF3B3B]/40',
    neutral: 'text-[#00FFFF] shadow-[0_0_15px_rgba(0,255,255,0.05)] border-white/5'
  };

  const getIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle2 size={18} className="text-[#22C55E]" />;
      case 'warning': return <AlertCircle size={18} className="text-[#FACC15]" />;
      case 'danger': return <AlertCircle size={18} className="text-[#FF3B3B]" />;
      default: return <TrendingUp size={18} className="text-[#00FFFF]" />;
    }
  };

  if (compact) {
    return (
      <div className={clsx(
        'bg-[#0E1727] border border-blue-300/10 rounded-xl p-3 flex flex-col justify-between h-[90px] transition-all duration-300 hover:border-blue-400/20 hover:scale-[1.01]',
        status === 'danger' ? 'shadow-[0_0_15px_rgba(255,59,59,0.08)] border-red-500/20' : 'shadow-lg'
      )}>
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate mr-2" title={title}>{title}</h3>
          <div className="shrink-0">
            {getIcon()}
          </div>
        </div>
        <div className="flex items-baseline justify-between mt-auto">
          <span className={clsx('text-xl font-bold tracking-tight',
            status === 'danger' ? 'text-[#FF3B3B]' : 'text-white'
          )}>
            {value}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'glass rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-400/20',
      statusStyles[status]
    )}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-[0.08em]">{title}</h3>
        {getIcon()}
      </div>
      <div className="flex items-end justify-between">
        <span className={clsx('text-3xl font-bold tracking-[-0.04em]',
          status === 'danger' ? 'text-[#FF3B3B]' : 'text-white'
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}
