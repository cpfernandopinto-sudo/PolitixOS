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
      'glass rounded-xl p-5 flex flex-col',
      danger ? 'border-[#FF3B3B]/20 shadow-[0_0_20px_rgba(255,59,59,0.05)]' : 'border-white/5',
      className
    )}>
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
        <h3 className="text-white text-base font-semibold">
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
