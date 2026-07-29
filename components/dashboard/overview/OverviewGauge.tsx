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
        center: ['50%', '56%'],
        radius: '96%',
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
          width: 10
        },
        pointer: {
          show: false
        },
        axisLine: {
          lineStyle: {
            width: 10,
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
          lineHeight: 34,
          borderRadius: 8,
          offsetCenter: [0, '4%'],
          fontSize: 34,
          fontWeight: 'bold',
          formatter: '{value}',
          color: 'inherit'
        },
        data: [{ value: score }]
      }
    ]
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-white font-bold text-lg tracking-tight">Termômetro de Crise Master</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status === 'crítico' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            status === 'quente' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
              'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
          }`}>
          {status}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">
        Decomposição analítica do risco por canal — o Estado Político (acima) já resume esta mesma leitura em uma classificação executiva.
      </p>

      <div className="flex flex-col items-center">
        <div className="w-full h-[178px] md:h-[190px] -my-2">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>

        <div className="text-gray-400 text-xs font-medium -mt-3 mb-3 uppercase tracking-widest opacity-60">
          Risco Consolidado
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg px-2 py-2 border border-white/5 text-center">
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-0.5 leading-tight">Notícias (50%)</div>
            <div className="text-lg font-bold text-white">{breakdown.noticias}</div>
          </div>
          <div className="bg-white/5 rounded-lg px-2 py-2 border border-white/5 text-center">
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-0.5 leading-tight">X/Twitter (30%)</div>
            <div className="text-lg font-bold text-white">{breakdown.x}</div>
          </div>
          <div className="bg-white/5 rounded-lg px-2 py-2 border border-white/5 text-center">
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-0.5 leading-tight">Instagram (20%)</div>
            <div className="text-lg font-bold text-white">{breakdown.instagram}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
