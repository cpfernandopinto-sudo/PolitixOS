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
      center: ['45%', '48%'],
      radius: '62%',
      indicator: [
        { name: 'Sentimento', max: 1, min: -1 },
        { name: 'Risco', max: 1 },
        // Rótulo curto ("Vol./Engaj.") — em cards de 1/4 da largura da tela
        // (Panorama Analítico), o nome completo "Volume/Engajamento" era
        // cortado na borda do card (bug de legibilidade encontrado no
        // hotfix de apresentação).
        { name: 'Vol./Engaj.', max: volumeMax },
      ],
      shape: 'circle',
      splitNumber: 4,
      axisName: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.24)'
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.24)'
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
      bottom: 0,
      left: 'center',
      itemGap: 10,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8
    }
  };

  return (
    <div className="surface-primary px-5 py-4 overflow-hidden h-full">
      <h3 className="text-white font-bold text-base tracking-tight">Distribuição por Canal</h3>
      <p className="text-xs text-slate-500 mb-0.5">Como cada canal contribui para o cenário.</p>
      {/*
        Altura FIXA (não flex-1/h-full): este bloco monta imediatamente no
        carregamento inicial da página (Camada 2, sempre visível). echarts-for-react
        mede clientWidth/clientHeight no primeiro mount — com altura dependente
        de flex-1 dentro de um container sem altura própria definida, essa
        medição podia disparar antes do layout assentar (`[ECharts] Can't get
        DOM width or height`), resultando num canvas de ~100px. Altura fixa
        elimina a corrida, mesmo padrão já usado em OverviewSentiment/OverviewRisk.
        Fase 2.1 do refinamento visual: raio ampliado bem mais (64%→85%) e
        container mais alto — a Fase 2 tinha corrigido a direção certa, mas
        o radar ainda ficava pequeno demais dentro do card.
      */}
      <div className="h-[340px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}
