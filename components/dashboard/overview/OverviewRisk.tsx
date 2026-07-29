'use client';

import ReactECharts from 'echarts-for-react';

interface Props {
  risk: { critico: number; alto: number; medio: number; baixo: number };
}

export default function OverviewRisk({ risk }: Props) {
  const total = risk.critico + risk.alto + risk.medio + risk.baixo;

  const riskOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 8, top: 12, bottom: 18, containLabel: true },
    xAxis: { type: 'category', data: ['Crítico', 'Alto', 'Médio', 'Baixo'], axisLabel: { color: '#666' } },
    yAxis: { type: 'value', axisLabel: { color: '#666' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
    series: [
      {
        data: [
          { value: risk.critico, itemStyle: { color: '#FF0000' } },
          { value: risk.alto, itemStyle: { color: '#EF4444' } },
          { value: risk.medio, itemStyle: { color: '#EAB308' } },
          { value: risk.baixo, itemStyle: { color: '#22C55E' } },
        ],
        type: 'bar',
        barWidth: '46%',
      },
    ],
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full">
      <h3 className="text-white font-bold text-lg mb-3">Distribuição de Risco</h3>
      {total === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm italic">
          Nenhum item classificado por risco no período selecionado.
        </div>
      ) : (
        <div className="h-[300px]">
          <ReactECharts option={riskOption} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
    </div>
  );
}
