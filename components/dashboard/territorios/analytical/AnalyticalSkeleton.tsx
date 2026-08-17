'use client';

import React from 'react';

export interface AnalyticalSkeletonProps {
  type?: 'card' | 'chart' | 'table' | 'insight';
  height?: number;
  count?: number;
}

export default function AnalyticalSkeleton({
  type = 'card',
  height = 120,
  count = 1,
}: AnalyticalSkeletonProps) {
  const items = Array.from({ length: count });

  if (type === 'chart') {
    return (
      <div
        style={{ height }}
        className="w-full bg-[#111726] border border-white/5 rounded-xl p-5 animate-pulse flex flex-col justify-between"
      >
        <div className="flex justify-between items-center">
          <div className="h-3 bg-white/10 rounded w-1/3" />
          <div className="h-3 bg-white/10 rounded w-1/6" />
        </div>
        <div className="h-3/4 bg-white/5 rounded w-full mt-4" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="w-full bg-[#111726] border border-white/5 rounded-xl p-5 animate-pulse space-y-3">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-3 bg-white/5 rounded w-full" />
        ))}
      </div>
    );
  }

  if (type === 'insight') {
    return (
      <div className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-2xl p-6 animate-pulse space-y-4">
        <div className="h-4 bg-cyan-500/20 rounded w-1/3" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-4/5" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {items.map((_, idx) => (
        <div
          key={idx}
          style={{ height }}
          className="bg-[#111726] border border-white/5 rounded-xl p-5 animate-pulse flex flex-col justify-between"
        >
          <div className="flex justify-between items-center">
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-3 bg-white/10 rounded w-6" />
          </div>
          <div className="h-6 bg-white/15 rounded w-1/3 my-2" />
          <div className="h-2.5 bg-white/5 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
