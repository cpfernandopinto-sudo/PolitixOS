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
  const volumeValues = [
    data.noticias.volume / 10,
    data.instagram.engajamento / 100,
    (data.x.posts?.length || 0) / 10
  ];
  const volumeMax = Math.max(1000, ...volumeValues) * 1.15;

  const option = {
    radar: {
      center: ['50%', '49%'],
      radius: '58%',
      indicator: [
        { name: 'Sentimento', max: 1, min: -1 },
        { name: 'Risco', max: 1 },
        { name: 'Volume/Engajamento', max: volumeMax },
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
        symbolSize: 3,
        lineStyle: { width: 1.5 },
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
      bottom: 2,
      left: 'center',
      itemGap: 16,
      textStyle: { color: '#999', fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl px-5 py-4 h-full flex flex-col overflow-hidden">
      <h3 className="text-white font-bold text-lg tracking-tight mb-2">Distribuição por Canal</h3>
      <div className="flex-1 min-h-[340px] lg:min-h-[360px] overflow-hidden">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}
