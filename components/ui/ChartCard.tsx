import React from 'react';
import clsx from 'clsx';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
  extra?: React.ReactNode;
}

export default function ChartCard({ title, children, className, danger = false, extra }: ChartCardProps) {
  return (
    <div className={clsx(
      'glass rounded-2xl p-5 md:p-6 flex flex-col transition-all duration-300 hover:border-blue-400/20',
      danger ? 'border-rose-400/20 shadow-[0_18px_45px_rgba(244,63,94,0.06)]' : 'border-white/[0.08]',
      className
    )}>
      <div className="flex justify-between items-center mb-5 border-b border-white/[0.07] pb-4">
        <h3 className="text-white text-[15px] font-semibold tracking-tight">
          {title}
        </h3>
        {extra && <div className="shrink-0">{extra}</div>}
      </div>
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </div>
  );
}
