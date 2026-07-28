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

/**
 * Radar com apenas dimensões que têm dado real para os TRÊS canais.
 *
 * Removidas nesta reintegração (Sprint 6): "Alcance" (valores fixos 80/60/90
 * sem nenhuma origem em dado real — o projeto não tem contagem de
 * seguidores/alcance em nenhuma tabela, ver docs/AUDITORIA_UX_PERFORMANCE_POLITIXOS.md)
 * e "Polarização" (real apenas para X via `data.x.polarização`; para
 * Notícias/Instagram era um valor fixo 0.2/0.4). Ambas eram métricas
 * fabricadas — violavam a diretriz de não inventar dados.
 */
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
    tooltip: { trigger: 'item' },
    series: [
      {
        name: 'Distribuição por Canal',
        type: 'radar',
        symbolSize: 3,
        lineStyle: { width: 1.5 },
        data: [
          {
            value: [data.noticias.sentimento_medio, data.noticias.risco_medio, data.noticias.volume / 10],
            name: 'Notícias',
            itemStyle: { color: '#2563EB' },
            areaStyle: { color: 'rgba(37, 99, 235, 0.1)' }
          },
          {
            value: [data.instagram.sentimento_medio, data.instagram.risco_medio, data.instagram.engajamento / 100],
            name: 'Instagram',
            itemStyle: { color: '#E1306C' },
            areaStyle: { color: 'rgba(225, 48, 108, 0.1)' }
          },
          {
            value: [data.x.sentimento_medio, data.x.risco_medio, (data.x.posts?.length || 0) / 10],
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
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl px-5 py-4 overflow-hidden">
      <h3 className="text-white font-bold text-lg tracking-tight">Distribuição por Canal</h3>
      <p className="text-xs text-gray-500 mb-2">Como cada canal contribui para o cenário monitorado.</p>
      {/*
        Altura FIXA (não flex-1/h-full): este bloco agora monta imediatamente
        no carregamento inicial da página (Camada 2, sempre visível), não mais
        só depois do usuário expandir "Análises Complementares". echarts-for-react
        mede clientWidth/clientHeight no primeiro mount — com altura dependente
        de flex-1 dentro de um container sem altura própria definida, essa
        medição podia disparar antes do layout assentar (`[ECharts] Can't get
        DOM width or height`), resultando num canvas de ~100px. Altura fixa
        elimina a corrida, mesmo padrão já usado em OverviewSentiment/OverviewRisk.
      */}
      <div className="h-[340px] lg:h-[360px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}
