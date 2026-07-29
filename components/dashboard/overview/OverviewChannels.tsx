'use client';

import ReactECharts from 'echarts-for-react';

interface ChannelData {
  noticias: { sentimento_medio: number; risco_medio: number; volume: number };
  instagram: { sentimento_medio: number; risco_medio: number; engajamento: number; volume: number };
  x: { sentimento_medio: number; risco_medio: number; polarização: number; volume: number; posts: unknown[] };
}

interface Props {
  data: ChannelData;
}

export default function OverviewChannels({ data }: Props) {
  const volumes = [
    data.noticias.volume,
    data.instagram.volume,
    data.x.volume || data.x.posts?.length || 0,
  ];
  const maxVolume = Math.max(1, ...volumes);
  const activities = [
    data.noticias.volume,
    data.instagram.engajamento,
    data.x.volume || data.x.posts?.length || 0,
  ];
  const maxActivity = Math.max(1, ...activities);
  const normalizeSentiment = (value: number) => Math.max(0, Math.min(100, (value + 1) * 50));
  const normalizeRatio = (value: number) => Math.max(0, Math.min(100, value * 100));
  const normalizeVolume = (value: number) => Math.max(0, Math.min(100, value / maxVolume * 100));

  const option = {
    animationDuration: 450,
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0B1220',
      borderColor: 'rgba(148,163,184,.2)',
      textStyle: { color: '#F8FAFC', fontSize: 11 },
    },
    radar: {
      center: ['50%', '45%'],
      radius: '62%',
      shape: 'circle',
      splitNumber: 4,
      indicator: [
        { name: 'Sentimento', max: 100 },
        { name: 'Alcance', max: 100 },
        { name: 'Polarização', max: 100 },
        { name: 'Volume', max: 100 },
        { name: 'Risco', max: 100 },
      ],
      axisName: {
        color: '#7F8CA3',
        fontSize: 10,
        fontWeight: 600,
      },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,.11)' } },
      splitArea: {
        show: true,
        areaStyle: { color: ['rgba(255,255,255,.006)', 'rgba(255,255,255,.018)'] },
      },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,.1)' } },
    },
    series: [
      {
        name: 'Distribuição por canal',
        type: 'radar',
        symbolSize: 3,
        lineStyle: { width: 2 },
        data: [
          {
            name: 'Notícias',
            value: [
              normalizeSentiment(data.noticias.sentimento_medio),
              normalizeVolume(data.noticias.volume),
              0,
              data.noticias.volume / maxActivity * 100,
              normalizeRatio(data.noticias.risco_medio),
            ],
            itemStyle: { color: '#3B82F6' },
            areaStyle: { color: 'rgba(59,130,246,.13)' },
          },
          {
            name: 'Instagram',
            value: [
              normalizeSentiment(data.instagram.sentimento_medio),
              normalizeVolume(data.instagram.volume),
              0,
              data.instagram.engajamento / maxActivity * 100,
              normalizeRatio(data.instagram.risco_medio),
            ],
            itemStyle: { color: '#EC407A' },
            areaStyle: { color: 'rgba(236,64,122,.12)' },
          },
          {
            name: 'X',
            value: [
              normalizeSentiment(data.x.sentimento_medio),
              normalizeVolume(data.x.volume || data.x.posts?.length || 0),
              normalizeRatio(data.x.polarização),
              (data.x.volume || data.x.posts?.length || 0) / maxActivity * 100,
              normalizeRatio(data.x.risco_medio),
            ],
            itemStyle: { color: '#22D3EE' },
            areaStyle: { color: 'rgba(34,211,238,.12)' },
          },
        ],
      },
    ],
    legend: {
      bottom: 0,
      left: 'center',
      itemGap: 12,
      itemWidth: 8,
      itemHeight: 8,
      icon: 'circle',
      textStyle: { color: '#94A3B8', fontSize: 9 },
      data: ['Notícias', 'Instagram', 'X'],
    },
  };

  return (
    <div className="glass h-full rounded-2xl p-5">
      <div>
        <h3 className="text-base font-bold text-white">Distribuição por Canal</h3>
        <p className="mt-1 text-[11px] text-slate-500">Comparativo multidimensional</p>
      </div>
      <div className="h-[260px] -mx-2">
        <ReactECharts
          option={option}
          notMerge
          lazyUpdate
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
}
