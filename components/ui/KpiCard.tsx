import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Minus } from 'lucide-react';
import clsx from 'clsx';

interface KpiCardProps {
  title: string;
  value: string | number;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

export default function KpiCard({ title, value, status = 'neutral' }: KpiCardProps) {
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

  return (
    <div className={clsx(
      'glass rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]',
      statusStyles[status]
    )}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        {getIcon()}
      </div>
      <div className="flex items-end justify-between">
        <span className={clsx('text-3xl font-bold tracking-tight', 
          status === 'danger' ? 'text-[#FF3B3B]' : 'text-white'
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}
