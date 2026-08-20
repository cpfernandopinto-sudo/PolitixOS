'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { ElectoralPollResultWithPoll } from '@/lib/pesquisas/types';
import { isRealCandidate } from '@/lib/pesquisas/types';
import { ScatterChart, Info } from 'lucide-react';

interface Props {
  results: ElectoralPollResultWithPoll[];
  referenceCandidate?: string | null;
}

interface PollGroup {
  pollId: string;
  instituto: string;
  dataRegistro: string;
  tseReg: string;
  amostra: number | null;
  results: { candidateName: string; percentage: number }[];
}

export function CenarioEleitoralChart({ results, referenceCandidate }: Props) {
  if (results.length === 0) {
    return (
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <ScatterChart size={15} className="text-blue-500" /> Cenário Eleitoral no Período
          </h3>
        </div>
        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-gray-400 text-xs">Sem levantamentos com resultados verificados no período.</p>
        </div>
      </section>
    );
  }

  // Group results by pollId + cenario
  const pollGroupsMap = new Map<string, PollGroup>();

  for (const r of results) {
    if (!r.poll || !isRealCandidate(r.candidateName)) continue;
    const key = `${r.pollId}::${r.cenario}`;
    const existing = pollGroupsMap.get(key) ?? {
      pollId: r.pollId,
      instituto: r.poll.instituto ?? 'TSE/PesqEle',
      dataRegistro: r.poll.dataRegistro ?? 'N/A',
      tseReg: r.poll.tseRegistrationNumber,
      amostra: r.poll.amostra,
      results: [],
    };
    existing.results.push({ candidateName: r.candidateName, percentage: r.percentage });
    pollGroupsMap.set(key, existing);
  }

  const pollGroups = Array.from(pollGroupsMap.values()).sort((a, b) =>
    a.dataRegistro.localeCompare(b.dataRegistro)
  );

  // Extract all distinct real candidates across all poll groups
  const allCandidatesSet = new Set<string>();
  for (const group of pollGroups) {
    for (const res of group.results) {
      allCandidatesSet.add(res.candidateName);
    }
  }

  const candidateList = Array.from(allCandidatesSet).sort();
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // Map dates for X axis
  const dateList = Array.from(new Set(pollGroups.map((g) => g.dataRegistro))).sort();

  // Create series for each candidate
  const seriesList = candidateList.map((cand, idx) => {
    const isReference = referenceCandidate && cand.toLowerCase() === referenceCandidate.toLowerCase();

    const dataPoints = pollGroups.map((group) => {
      const match = group.results.find((r) => r.candidateName === cand);
      return [
        group.dataRegistro,
        match ? match.percentage : null,
        group.instituto,
        group.tseReg,
        group.amostra,
      ];
    });

    return {
      name: cand,
      type: 'line',
      smooth: true,
      symbolSize: isReference ? 12 : 8,
      data: dataPoints,
      itemStyle: {
        color: colors[idx % colors.length],
      },
      lineStyle: {
        width: isReference ? 4 : 2,
        type: 'solid',
      },
      emphasis: {
        focus: 'series',
        lineStyle: { width: 4 },
      },
    };
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0d1322',
      borderColor: 'rgba(255,255,255,0.15)',
      padding: 12,
      textStyle: { color: '#FFFFFF', fontSize: 12 },
      // Vertical rich tooltip with all candidates (Seção 17)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: function (params: any) {
        if (!params || params.length === 0) return '';
        const first = params[0];
        const dateStr = first.axisValue;
        const groupObj = pollGroups.find((g) => g.dataRegistro === dateStr);

        let html = `
          <div style="font-family: sans-serif; min-width: 220px;">
            <div style="font-size: 13px; font-weight: bold; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 6px;">
              ${groupObj ? groupObj.instituto : 'Pesquisa'}
              <div style="font-size: 10px; font-weight: normal; color: #9CA3AF; margin-top: 2px;">
                Data: ${dateStr} ${groupObj ? `· TSE: ${groupObj.tseReg}` : ''}
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
        `;

        // Sort items in tooltip by percentage descending
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = [...params].sort((a: any, b: any) => (b.value[1] ?? 0) - (a.value[1] ?? 0));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.forEach((item: any) => {
          const val = item.value[1];
          const valStr = val !== null && val !== undefined ? `${val}%` : 'N/A';
          const isRef = referenceCandidate && item.seriesName.toLowerCase() === referenceCandidate.toLowerCase();
          const highlightBg = isRef ? 'background: rgba(59, 130, 246, 0.15); padding: 2px 4px; border-radius: 4px;' : '';

          html += `
            <div style="display: flex; items-center; justify-content: space-between; gap: 12px; font-size: 11px; ${highlightBg}">
              <span style="color: ${item.color}; font-weight: ${isRef ? 'bold' : 'normal'}; truncate">
                ● ${item.seriesName} ${isRef ? '(Analisado)' : ''}
              </span>
              <span style="font-weight: bold; font-family: monospace; color: #FFFFFF;">
                ${valStr}
              </span>
            </div>
          `;
        });

        html += `</div></div>`;
        return html;
      },
    },
    legend: {
      data: candidateList,
      textStyle: { color: '#9CA3AF', fontSize: 11 },
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      top: 40,
      bottom: 25,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dateList,
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
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
      <div className="flex items-center justify-between pb-2 border-b border-white/5 flex-wrap gap-2">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <ScatterChart size={15} className="text-blue-500" /> Cenário Eleitoral no Período (Todos os Candidatos)
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Evolução multissérie de intenções de voto no tempo com levantamentos reais.
          </p>
        </div>

        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded font-bold">
          {pollGroups.length} Levantamentos · {candidateList.length} Candidatos
        </span>
      </div>

      <p className="text-gray-500 text-[11px] flex items-center gap-1.5">
        <Info size={12} className="text-blue-400 shrink-0" />
        Passe o mouse sobre os pontos para visualizar a lista completa de todos os concorrentes na data selecionada.
      </p>

      <ReactECharts option={option} notMerge lazyUpdate style={{ height: 280, width: '100%' }} />
    </section>
  );
}
