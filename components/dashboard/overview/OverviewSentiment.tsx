'use client';

import ReactECharts from 'echarts-for-react';

interface Props {
  sentiment: { positivo: number; negativo: number; neutro: number; misto: number };
}

export default function OverviewSentiment({ sentiment }: Props) {
  const sentimentItems = [
    { value: sentiment.positivo, name: 'Positivo', color: '#4edea3' },
    { value: sentiment.negativo, name: 'Negativo', color: '#ffb4ab' },
    { value: sentiment.neutro, name: 'Neutro', color: '#06B6D4' },
    { value: sentiment.misto, name: 'Misto', color: '#ffb95f' },
  ];
  const sentimentTotal = sentimentItems.reduce((acc, item) => acc + item.value, 0);
  const dominant = sentimentItems.reduce((max, item) => (item.value > max.value ? item : max), sentimentItems[0]);
  const dominantPct = sentimentTotal > 0 ? Math.round((dominant.value / sentimentTotal) * 100) : 0;

  const sentimentOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        name: 'Sentimento',
        type: 'pie',
        radius: ['58%', '78%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 1, borderColor: '#161B26', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 15, fontWeight: 'bold' } },
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
    <div className="surface-primary p-5 h-full">
      <h3 className="text-white font-bold text-base tracking-tight mb-3">Sentimento Consolidado</h3>
      {sentimentTotal === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm italic">
          Nenhum dado de sentimento no período selecionado.
        </div>
      ) : (
        // Empilhado (não lado-a-lado): o breakpoint sm: reage à largura do
        // VIEWPORT, não à largura do card — num card de 1/4 da tela (Panorama
        // Analítico em grade), lado-a-lado ficava espremido. Empilhado é
        // estável em qualquer largura de coluna.
        <div className="h-[320px] flex flex-col justify-center gap-4">
          <div className="relative h-[230px] shrink-0">
            <ReactECharts option={sentimentOption} style={{ height: '100%', width: '100%' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[28px] font-bold text-white leading-none">{dominantPct}%</span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider mt-1.5">{dominant.name}</span>
            </div>
          </div>
          {/* Legenda compacta — sem aparência de mini-card/botão (Fase 2). */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {sentimentItems.map((item) => {
              const pct = sentimentTotal > 0 ? Math.round((item.value / sentimentTotal) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-medium text-slate-300 truncate">{item.name}</span>
                  <span className="text-[11px] text-slate-500 shrink-0 ml-auto">{item.value} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
