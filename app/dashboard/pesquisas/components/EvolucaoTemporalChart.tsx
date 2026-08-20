'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { TemporalSeriesEntry } from '@/lib/pesquisas/results-repository';
import { TrendingUp, Info } from 'lucide-react';

interface Props {
  temporalSeries: TemporalSeriesEntry[];
  comparablePollsCount: number;
}

export function EvolucaoTemporalChart({ temporalSeries, comparablePollsCount }: Props) {
  const hasSufficientSeries = temporalSeries.length > 0 && comparablePollsCount >= 2;

  if (temporalSeries.length === 0) {
    return (
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-500" /> Evolução Temporal de Intenções de Voto
          </h3>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
            Sem Histórico Comparável
          </span>
        </div>

        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-gray-300 text-xs font-semibold">
            Não há pesquisas comparáveis suficientes para determinar tendência nesta corrida.
          </p>
          <p className="text-gray-500 text-[11px] max-w-lg mx-auto leading-relaxed">
            Requer 2 ou mais pesquisas com resultado verificado no mesmo cargo, UF e cenário de candidatos.
          </p>
        </div>
      </section>
    );
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  const candidates = temporalSeries.map((s) => s.candidateName);

  // Build line series for ECharts
  const seriesList = temporalSeries.map((s, idx) => {
    const dataPoints = s.points.map((p) => [p.date ?? '2026-01-01', p.percentage]);

    return {
      name: s.candidateName,
      type: 'line',
      smooth: true,
      symbolSize: 8,
      data: dataPoints,
      itemStyle: {
        color: colors[idx % colors.length],
      },
      lineStyle: {
        width: 3,
      },
    };
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#12192A',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#FFFFFF' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: function (params: any) {
        if (!params || params.length === 0) return '';
        const dateStr = params[0].axisValue;
        let html = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 240px;">
            <div style="font-size: 11px; color: #9CA3AF; font-weight: bold; margin-bottom: 4px;">
              Data: ${dateStr}
            </div>
        `;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params.forEach((item: any) => {
          html += `
            <div style="font-size: 12px; color: ${item.color}; font-weight: font-extrabold; margin-bottom: 2px;">
              ${item.seriesName}: ${item.value[1]}%
            </div>
          `;
        });
        html += `</div>`;
        return html;
      },
    },
    legend: {
      data: candidates,
      textStyle: { color: '#9CA3AF', fontSize: 11 },
      top: 0,
    },
    grid: {
      left: '4%',
      right: '4%',
      top: 40,
      bottom: 30,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      axisLabel: { color: '#9CA3AF', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9CA3AF', formatter: '{value}%' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
    },
    series: seriesList,
  };

  return (
    <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-500" /> Evolução Temporal de Intenções de Voto
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Série temporal comparativa plota a trajetória de intenção de voto dos candidatos ao longo dos levantamentos.
          </p>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
            hasSufficientSeries
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          {hasSufficientSeries ? `${comparablePollsCount} Pesquisas Comparáveis` : 'Série Limitada'}
        </span>
      </div>

      <p className="text-gray-500 text-[11px] flex items-center gap-1.5">
        <Info size={12} className="text-blue-400 shrink-0" />
        Pontos conectados indicam pesquisas comparáveis (mesmo cargo, UF, turno, tipo de pergunta e conjunto de candidatos).
      </p>

      <ReactECharts option={option} notMerge lazyUpdate style={{ height: 280, width: '100%' }} />

      {/* Resumo textual dos deltas */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        {temporalSeries
          .sort((a, b) => (b.points.at(-1)?.percentage ?? 0) - (a.points.at(-1)?.percentage ?? 0))
          .map((s) => {
            const first = s.points[0]?.percentage ?? 0;
            const last = s.points.at(-1)?.percentage ?? 0;
            const delta = Math.round((last - first) * 10) / 10;

            return (
              <div
                key={s.candidateName}
                className="flex items-center justify-between text-xs bg-white/5 border border-white/5 rounded-xl px-4 py-2.5"
              >
                <span className="text-gray-200 font-semibold">{s.candidateName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono text-xs">
                    {s.points.map((p) => `${p.percentage}%`).join(' → ')}
                  </span>
                  {delta !== 0 ? (
                    <span
                      className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded ${
                        delta > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta} p.p.
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-500 font-mono">0,0 p.p.</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
