'use client';

import ReactECharts from 'echarts-for-react';

interface ChannelData {
  noticias: { sentimento_medio: number; risco_medio: number; volume: number };
  instagram: { sentimento_medio: number; risco_medio: number; engajamento: number; volume: number };
  x: { sentimento_medio: number; risco_medio: number; polarização: number; volume: number; posts: any[] };
}

interface Props {
  data: ChannelData;
}

export default function OverviewChannels({ data }: Props) {
  console.log("[X MAP INPUT]", data.x.posts?.length || 0);

  const option = {
    radar: {
      indicator: [
        { name: 'Sentimento', max: 1, min: -1 },
        { name: 'Risco', max: 1 },
        { name: 'Volume/Engajamento', max: 1000 },
        { name: 'Polarização', max: 1 },
        { name: 'Alcance', max: 100 }
      ],
      shape: 'circle',
      splitNumber: 4,
      axisName: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      }
    },
    series: [
      {
        name: 'Distribuição por Canal',
        type: 'radar',
        data: [
          {
            value: [data.noticias.sentimento_medio, data.noticias.risco_medio, data.noticias.volume / 10, 0.2, 80],
            name: 'Notícias',
            itemStyle: { color: '#2563EB' },
            areaStyle: { color: 'rgba(37, 99, 235, 0.1)' }
          },
          {
            value: [data.instagram.sentimento_medio, data.instagram.risco_medio, data.instagram.engajamento / 100, 0.4, 60],
            name: 'Instagram',
            itemStyle: { color: '#E1306C' },
            areaStyle: { color: 'rgba(225, 48, 108, 0.1)' }
          },
          {
            value: [data.x.sentimento_medio, data.x.risco_medio, (data.x.posts?.length || 0) / 10, data.x.polarização, 90],
            name: 'X (Twitter)',
            itemStyle: { color: '#00FFFF' },
            areaStyle: { color: 'rgba(0, 255, 255, 0.1)' }
          }
        ]
      }
    ],
    legend: {
      show: true,
      bottom: 0,
      textStyle: { color: '#999', fontSize: 10 },
      icon: 'circle'
    }
  };

  console.log("[UI FINAL]", {
    x: data.x.posts?.length || 0
  });

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-white font-bold text-lg tracking-tight mb-6">Distribuição por Canal</h3>
      <div className="flex-1 min-h-[300px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}
