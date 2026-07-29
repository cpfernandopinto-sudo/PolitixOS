'use client';

import ReactECharts from 'echarts-for-react';

interface Props {
  sentiment: { positivo: number; negativo: number; neutro: number; misto: number };
}

export default function OverviewSentiment({ sentiment }: Props) {
  const sentimentItems = [
    { value: sentiment.positivo, name: 'Positivo', color: '#22C55E' },
    { value: sentiment.negativo, name: 'Negativo', color: '#EF4444' },
    { value: sentiment.neutro, name: 'Neutro', color: '#2563EB' },
    { value: sentiment.misto, name: 'Misto', color: '#EAB308' },
  ];
  const sentimentTotal = sentimentItems.reduce((acc, item) => acc + item.value, 0);

  const sentimentOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        name: 'Sentimento',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#1A1A1A', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: sentimentItems.map((item) => ({
          value: item.value,
          name: item.name,
          itemStyle: { color: item.color },
        })),
      },
    ],
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full">
      <h3 className="text-white font-bold text-lg mb-3">Sentimento Consolidado</h3>
      {sentimentTotal === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm italic">
          Nenhum dado de sentimento no período selecionado.
        </div>
      ) : (
        // Empilhado (não lado-a-lado): o breakpoint sm: reage à largura do
        // VIEWPORT, não à largura do card — num card de 1/4 da tela (Panorama
        // Analítico em grade), lado-a-lado ficava espremido. Empilhado é
        // estável em qualquer largura de coluna.
        <div className="h-[300px] flex flex-col gap-3">
          <div className="h-[160px] shrink-0">
            <ReactECharts option={sentimentOption} style={{ height: '100%', width: '100%' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sentimentItems.map((item) => {
              const pct = sentimentTotal > 0 ? Math.round((item.value / sentimentTotal) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-medium text-gray-300 truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">{item.value}</div>
                    <div className="text-[9px] text-gray-500">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
