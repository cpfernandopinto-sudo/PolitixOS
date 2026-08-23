'use client';

import ReactECharts from 'echarts-for-react';
import { channelWeightLabel } from '@/lib/config/channel-weights';

interface GaugeProps {
  score: number;
  status: string;
  breakdown: {
    noticias: number;
    x: number;
    instagram: number;
    facebook: number;
  };
}

export default function OverviewGauge({ score, status, breakdown }: GaugeProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'crítico': return '#F87171';
      case 'quente': return '#FB923C';
      case 'morno': return '#FACC15';
      default: return '#06B6D4';
    }
  };

  const color = getStatusColor(status);

  const option = {
    series: [
      {
        type: 'gauge',
        center: ['50%', '58%'],
        radius: '99%',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 5,
        itemStyle: {
          color: color,
          shadowColor: color,
          shadowBlur: 6,
        },
        progress: {
          show: true,
          width: 9,
          roundCap: true,
        },
        // Ponteiro fino e elegante
        pointer: {
          show: true,
          icon: 'path://M2,0 C2,0 1,-2 0,-64 C-1,-2 -2,0 -2,0 Z',
          length: '58%',
          width: 4,
          offsetCenter: [0, 0],
          itemStyle: { color, shadowColor: color, shadowBlur: 4 },
        },
        anchor: {
          show: true,
          size: 8,
          itemStyle: { color, borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1.5 },
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 9,
            color: [[1, 'rgba(45, 55, 72, 0.4)']]
          }
        },
        axisTick: {
          show: true,
          distance: -18,
          length: 3,
          splitNumber: 5,
          lineStyle: { color: 'rgba(148,163,184,0.25)', width: 1 },
        },
        splitLine: {
          show: true,
          distance: -20,
          length: 8,
          lineStyle: { color: 'rgba(148,163,184,0.35)', width: 1.5 },
        },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          offsetCenter: [0, '2%'],
          fontSize: 40,
          fontWeight: 700,
          formatter: '{value}',
          color: 'inherit'
        },
        data: [{ value: score }]
      }
    ]
  };

  return (
    <div className="surface-primary p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-white font-bold text-base tracking-tight">Termômetro de Crise Master</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
          status === 'crítico' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          status === 'quente' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
          status === 'morno' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        }`}>
          {status}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 mb-1 truncate">
        Decomposição analítica do risco por canal (resumido no Estado Político).
      </p>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="w-full h-[140px] md:h-[150px]">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>

        <div className="text-slate-400 text-[10px] font-semibold -mt-2 mb-1.5 uppercase tracking-widest opacity-70">
          Risco Consolidado
        </div>

        <div className="w-full grid grid-cols-4 gap-2">
          <div className="bg-white/[0.02] rounded px-1 py-1.5 border border-white/[0.08] text-center">
            <div className="text-[8px] text-slate-500 uppercase font-bold mb-0.5 leading-tight truncate">{channelWeightLabel('noticias')}</div>
            <div className="text-sm font-bold text-white">{breakdown.noticias}</div>
          </div>
          <div className="bg-white/[0.02] rounded px-1 py-1.5 border border-white/[0.08] text-center">
            <div className="text-[8px] text-slate-500 uppercase font-bold mb-0.5 leading-tight truncate">{channelWeightLabel('x')}</div>
            <div className="text-sm font-bold text-white">{breakdown.x}</div>
          </div>
          <div className="bg-white/[0.02] rounded px-1 py-1.5 border border-white/[0.08] text-center">
            <div className="text-[8px] text-slate-500 uppercase font-bold mb-0.5 leading-tight truncate">{channelWeightLabel('instagram')}</div>
            <div className="text-sm font-bold text-white">{breakdown.instagram}</div>
          </div>
          <div className="bg-white/[0.02] rounded px-1 py-1.5 border border-white/[0.08] text-center">
            <div className="text-[8px] text-slate-500 uppercase font-bold mb-0.5 leading-tight truncate">{channelWeightLabel('facebook')}</div>
            <div className="text-sm font-bold text-white">{breakdown.facebook}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
