'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { ObservedHistoryResult } from '@/lib/pesquisas/observedHistory';
import type { TemporalSeriesEntry } from '@/lib/pesquisas/results-repository';
import { buildEvolucaoCandidatoSeries } from '@/lib/pesquisas/evolucaoCandidatoSeries';
import { TrendingUp, Info } from 'lucide-react';

interface Props {
  candidateName: string;
  observedHistory: ObservedHistoryResult;
  temporalSeries: TemporalSeriesEntry[];
}

const COMPARABILITY_LABEL: Record<string, string> = {
  REFERENCIA: 'REFERÊNCIA ATUAL',
  COMPARAVEL: 'COMPARÁVEL PARA TENDÊNCIA',
  NAO_COMPARAVEL: 'NÃO COMPARÁVEL PARA TENDÊNCIA',
};

function formatDateShort(iso: string | null): string {
  if (!iso) return 'N/A';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, m, d] = parts;
  return `${d}/${m}`;
}

/**
 * Bloco 5 do briefing Sprint 2B — "EVOLUÇÃO DE [CANDIDATO]" (Modo B).
 * Mostra TODO o `observedHistory` (nunca esconde um ponto por falta de
 * comparabilidade) como pontos individuais — e desenha uma linha conectando
 * SOMENTE os pontos que pertencem à série comparável real
 * (`buildTemporalSeries`, intocada) para este candidato. Pontos fora dessa
 * série nunca são ligados por linha, mesmo que `observedHistory` os marque
 * como "COMPARAVEL" para o cenário de referência (esse é um critério mais
 * permissivo, usado só para o rótulo do ponto/tooltip — a linha usa o
 * critério mais estrito, o mesmo já validado na Sprint 2A).
 */
export function EvolucaoCandidatoChart({ candidateName, observedHistory, temporalSeries }: Props) {
  const { points } = observedHistory;

  if (points.length === 0) {
    return (
      <section className="surface-primary p-5 space-y-3">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-500" /> Evolução de {candidateName}
        </h3>
        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-gray-400 text-xs">Sem levantamentos com resultado para {candidateName} no recorte atual.</p>
        </div>
      </section>
    );
  }

  const { categories: rawCategories, scatterData, lineData, comparablePollCount } = buildEvolucaoCandidatoSeries(
    observedHistory,
    temporalSeries,
    candidateName
  );
  const categories = rawCategories.map((c) => formatDateShort(c === 'N/A' ? null : c));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0d1322',
      borderColor: 'rgba(255,255,255,0.15)',
      padding: 12,
      textStyle: { color: '#FFFFFF', fontSize: 12 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const dataIndex = params?.[0]?.dataIndex;
        const p = points[dataIndex];
        if (!p) return '';
        return `
          <div style="font-family: sans-serif; min-width: 220px;">
            <div style="font-size: 13px; font-weight: bold; color: #FFFFFF;">${p.instituto}</div>
            <div style="font-size: 10px; color: #9CA3AF; margin-top: 2px;">${formatDateShort(p.date)} · TSE: ${p.tseRegistrationNumber}</div>
            <div style="font-size: 10px; color: #67E8F9; margin-top: 2px;">${p.cenario} · ${p.turno}º turno · ${p.tipoPergunta}</div>
            <div style="font-size: 18px; font-weight: bold; color: #FFFFFF; margin-top: 6px; font-family: monospace;">${p.percentage}%</div>
            <div style="font-size: 9px; font-weight: bold; margin-top: 4px; padding: 2px 6px; border-radius: 4px; display: inline-block; ${
              p.comparability === 'NAO_COMPARAVEL'
                ? 'background: rgba(245,158,11,0.15); color: #FBBF24;'
                : 'background: rgba(34,211,238,0.15); color: #22D3EE;'
            }">${COMPARABILITY_LABEL[p.comparability]}</div>
          </div>
        `;
      },
    },
    legend: {
      data: ['Resultado observado', 'Série comparável'],
      textStyle: { color: '#9CA3AF', fontSize: 11 },
      top: 0,
    },
    grid: { left: '3%', right: '4%', top: 40, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
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
    series: [
      {
        name: 'Resultado observado',
        type: 'scatter',
        symbolSize: 10,
        data: scatterData,
        itemStyle: { color: '#67E8F9' },
      },
      {
        name: 'Série comparável',
        type: 'line',
        connectNulls: false,
        symbolSize: 8,
        data: lineData,
        lineStyle: { width: 3, color: '#22C55E' },
        itemStyle: { color: '#22C55E' },
      },
    ],
  };

  return (
    <section className="surface-primary p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] flex-wrap gap-2">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-500" /> Evolução de {candidateName}
        </h3>
        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-sm font-bold tracking-wider uppercase">
          {points.length} leituras · {comparablePollCount} na série comparável
        </span>
      </div>

      <p className="text-slate-400 text-[11px] flex items-center gap-1.5">
        <Info size={12} className="text-cyan-400 shrink-0" />
        <span className="text-cyan-300">●</span> resultado observado (nem todos comparáveis entre si) ·
        <span className="text-emerald-400"> —</span> linha só entre pontos metodologicamente comparáveis.
      </p>

      <ReactECharts option={option} notMerge lazyUpdate style={{ height: 260, width: '100%' }} />
    </section>
  );
}
