'use client';

import ReactECharts from 'echarts-for-react';

interface Props {
  risk: { critico: number; alto: number; medio: number; baixo: number };
}

export default function OverviewRisk({ risk }: Props) {
  const total = risk.critico + risk.alto + risk.medio + risk.baixo;

  const riskOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    // Fase 2.1 do refinamento visual: barras mais largas e menor espaçamento
    // entre categorias para reduzir o vazio percebido entre elas (a Fase 2
    // já usava quase toda a altura do grid, mas os vãos entre barras finas
    // liam como espaço morto). Margens ligeiramente maiores para o eixo Y
    // não cortar o rótulo "1.000". Escala, valores e cores de dados intactos.
    grid: { left: 8, right: 16, top: 12, bottom: 20, containLabel: true },
    xAxis: { type: 'category', data: ['Crítico', 'Alto', 'Médio', 'Baixo'], axisLabel: { color: '#94a3b8', fontSize: 12 } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } } },
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
      },
    ],
  };

  return (
    <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl p-5 h-full">
      <h3 className="text-white font-bold text-lg mb-3">Distribuição de Risco</h3>
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
