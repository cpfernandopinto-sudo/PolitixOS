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
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
      <h3 className="text-white font-bold text-lg mb-3">Sentimento Consolidado</h3>
      {sentimentTotal === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm italic">
          Nenhum dado de sentimento no período selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)] gap-4 items-center">
          <div className="h-[220px]">
            <ReactECharts option={sentimentOption} style={{ height: '100%', width: '100%' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            {sentimentItems.map((item) => {
              const pct = sentimentTotal > 0 ? Math.round((item.value / sentimentTotal) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-gray-300 truncate">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{item.value}</div>
                    <div className="text-[10px] text-gray-500">{pct}%</div>
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
