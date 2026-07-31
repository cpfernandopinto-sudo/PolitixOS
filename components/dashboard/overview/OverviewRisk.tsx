'use client';

import ReactECharts from 'echarts-for-react';

interface Props {
  risk: { critico: number; alto: number; medio: number; baixo: number };
}

export default function OverviewRisk({ risk }: Props) {
  const total = risk.critico + risk.alto + risk.medio + risk.baixo;

  const riskOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    // Recuperação do modelo executivo anterior: rótulo de valor acima de
    // cada barra (leitura imediata, sem precisar olhar a escala do eixo Y),
    // eixo Y oculto (a barra + rótulo já comunicam a grandeza) — mesmos
    // dados e cores de sempre, só a apresentação do gráfico muda.
    grid: { left: 8, right: 16, top: 28, bottom: 20, containLabel: true },
    xAxis: { type: 'category', data: ['Crítico', 'Alto', 'Médio', 'Baixo'], axisLabel: { color: '#94a3b8', fontSize: 12 } },
    yAxis: { type: 'value', show: false },
    series: [
      {
        data: [
          { value: risk.critico, itemStyle: { color: '#FF0000' } },
          { value: risk.alto, itemStyle: { color: '#EF4444' } },
          { value: risk.medio, itemStyle: { color: '#EAB308' } },
          { value: risk.baixo, itemStyle: { color: '#22C55E' } },
        ],
        type: 'bar',
        barWidth: '70%',
        barCategoryGap: '20%',
        label: {
          show: true,
          position: 'top',
          color: '#F4F7FB',
          fontSize: 13,
          fontWeight: 'bold',
          formatter: '{c}',
        },
      },
    ],
  };

  return (
    <div className="surface-primary p-5 h-full">
      <h3 className="text-white font-bold text-base tracking-tight">Distribuição de Risco</h3>
      <p className="text-xs text-slate-500 mb-3">Gravidade das ocorrências</p>
      {total === 0 ? (
        <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm italic">
          Nenhum item classificado por risco no período selecionado.
        </div>
      ) : (
        <div className="h-[320px]">
          <ReactECharts option={riskOption} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
    </div>
  );
}
