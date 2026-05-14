'use client';

import ReactECharts from 'echarts-for-react';

interface GaugeProps {
  score: number;
  status: string;
  breakdown: {
    noticias: number;
    x: number;
    instagram: number;
  };
}

export default function OverviewGauge({ score, status, breakdown }: GaugeProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'crítico': return '#EF4444';
      case 'quente': return '#F97316';
      case 'morno': return '#EAB308';
      default: return '#00FFFF';
    }
  };

  const color = getStatusColor(status);

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 5,
        itemStyle: {
          color: color,
        },
        progress: {
          show: true,
          width: 12
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, '#2D2D2D']]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, 0],
          fontSize: 32,
          fontWeight: 'bold',
          formatter: '{value}',
          color: 'inherit'
        },
        data: [{ value: score }]
      }
    ]
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-lg tracking-tight">Termômetro de Crise Master</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status === 'crítico' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            status === 'quente' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
              'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
          }`}>
          {status}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-4">
        <div className="w-full h-[220px]">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>

        <div className="text-gray-400 text-sm font-medium -mt-6 mb-8 uppercase tracking-widest opacity-60">
          Risco Consolidado
        </div>

        <div className="w-full grid grid-cols-3 gap-2 mt-auto">
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Notícias (50%)</div>
            <div className="text-lg font-bold text-white">{breakdown.noticias}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">X/Twitter (30%)</div>
            <div className="text-lg font-bold text-white">{breakdown.x}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Instagram (20%)</div>
            <div className="text-lg font-bold text-white">{breakdown.instagram}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
