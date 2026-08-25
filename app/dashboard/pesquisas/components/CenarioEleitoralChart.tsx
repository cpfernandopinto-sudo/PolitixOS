'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { ElectoralPollResultWithPoll } from '@/lib/pesquisas/types';
import { buildCenarioPollGroups } from '@/lib/pesquisas/chartGrouping';
import { ScatterChart, Info } from 'lucide-react';

interface Props {
  results: ElectoralPollResultWithPoll[];
  referenceCandidate?: string | null;
}

function formatDateShort(iso: string): string {
  if (!iso || iso === 'N/A') return iso;
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [, m, d] = parts;
  return `${d}/${m}`;
}

export function CenarioEleitoralChart({ results, referenceCandidate }: Props) {
  if (results.length === 0) {
    return (
      <section className="surface-primary p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <ScatterChart size={15} className="text-blue-500" /> Histórico Observado — Cenários Publicados
          </h3>
        </div>
        <div className="py-8 px-4 text-center rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-gray-400 text-xs">Sem levantamentos com resultados verificados no período.</p>
        </div>
      </section>
    );
  }

  // Um ponto no eixo = 1 pesquisa + 1 cenário (nunca "1 pesquisa" só por data) — é isso que evita
  // candidatos de cenários diferentes (ex.: "com Cleitinho" vs "sem Cleitinho") se misturarem sob
  // o mesmo rótulo quando compartilham a mesma data de registro.
  const pollGroups = buildCenarioPollGroups(results);

  const allCandidatesSet = new Set<string>();
  for (const group of pollGroups) {
    for (const res of group.results) {
      allCandidatesSet.add(res.candidateName);
    }
  }

  const candidateList = Array.from(allCandidatesSet).sort();
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  // Categorias do eixo X são indexadas 1:1 com pollGroups (data + cenário), nunca só por data —
  // garante que cada ponto do gráfico e cada linha do tooltip correspondam a exatamente 1 cenário.
  const categoryList = pollGroups.map((g) => `${formatDateShort(g.dataRegistro)} · ${g.cenario}`);

  const seriesList = candidateList.map((cand, idx) => {
    const isReference = referenceCandidate && cand.toLowerCase() === referenceCandidate.toLowerCase();

    const dataPoints = pollGroups.map((group) => {
      const match = group.results.find((r) => r.candidateName === cand);
      return match ? match.percentage : null;
    });

    return {
      name: cand,
      // Sprint 2B, P1: cada ponto aqui é uma leitura de um cenário (muitas vezes NÃO
      // metodologicamente comparável a outro cenário do mesmo candidato — ex.: "com Cleitinho" vs
      // "sem Cleitinho", ou confrontos de 2º turno). Usar type:'line' ligava esses pontos com uma
      // linha contínua, sugerindo visualmente uma tendência que os dados não sustentam. Como pontos
      // (scatter), nunca insinua trajetória — a linha comparável de verdade só existe no gráfico
      // "Evolução de [Candidato]" (Modo B), que usa buildTemporalSeries de fato.
      type: 'scatter',
      symbolSize: isReference ? 14 : 9,
      data: dataPoints,
      itemStyle: {
        color: colors[idx % colors.length],
      },
      emphasis: {
        focus: 'series',
        scale: 1.3,
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
      // Tooltip vertical com todos os candidatos DESSE cenário (nunca de outro cenário da mesma
      // data) — resolvido por índice de categoria, não por busca em dataRegistro (Fase 2/3 da
      // auditoria: candidato duplicado no tooltip).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: function (params: any) {
        if (!params || params.length === 0) return '';
        const dataIndex = params[0].dataIndex;
        const groupObj = pollGroups[dataIndex];
        if (!groupObj) return '';

        let html = `
          <div style="font-family: sans-serif; min-width: 240px;">
            <div style="font-size: 13px; font-weight: bold; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 6px;">
              ${groupObj.instituto}
              <div style="font-size: 10px; font-weight: normal; color: #9CA3AF; margin-top: 2px;">
                ${formatDateShort(groupObj.dataRegistro)} · TSE: ${groupObj.tseReg}
              </div>
              <div style="font-size: 10px; font-weight: normal; color: #67E8F9; margin-top: 2px;">
                ${groupObj.cenario} · ${groupObj.turno}º turno · ${groupObj.tipoPergunta}${groupObj.office ? ` · ${groupObj.office}` : ''}
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
        `;

        // Só entram candidatos com valor real NESTE cenário — o trigger "axis" do ECharts inclui
        // todas as séries no índice, mesmo com valor nulo; filtrar é o que impede misturar
        // candidatos de outros cenários/pesquisas no mesmo tooltip.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = params
          .filter((p: any) => p.value !== null && p.value !== undefined)
          .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.forEach((item: any) => {
          const val = item.value;
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
      bottom: 60,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categoryList,
      axisLabel: { color: '#9CA3AF', fontSize: 10, rotate: 30, interval: 0 },
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
    <section className="surface-primary p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] flex-wrap gap-2">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <ScatterChart size={15} className="text-cyan-400" /> Histórico Observado — Cenários Publicados
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Cada ponto é uma pesquisa + um cenário publicado — nunca uma tendência. Pontos não são conectados por linha: cenários diferentes não são necessariamente comparáveis entre si.
          </p>
        </div>

        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-sm font-bold tracking-wider uppercase">
          {pollGroups.length} Cenários · {candidateList.length} Candidatos
        </span>
      </div>

      <p className="text-slate-400 text-[11px] flex items-center gap-1.5">
        <Info size={12} className="text-cyan-400 shrink-0" />
        Passe o mouse sobre um ponto para ver instituto, registro TSE, cenário e a lista de candidatos daquele cenário específico.
      </p>

      <ReactECharts option={option} notMerge lazyUpdate style={{ height: 300, width: '100%' }} />
    </section>
  );
}
