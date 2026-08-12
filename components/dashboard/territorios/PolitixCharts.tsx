'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { type EChartsOption } from 'echarts';

interface ChartProps {
  data: any[];
  height?: number;
  className?: string;
  theme?: string;
}

const DEFAULT_HEIGHT = 300;
const CHART_TEXT_COLOR = '#94a3b8'; // slate-400
const CHART_GRID_COLOR = 'rgba(255,255,255,0.05)';
const CHART_COLORS = [
  '#22d3ee', // cyan-400
  '#3b82f6', // blue-500
  '#818cf8', // indigo-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#34d399', // emerald-400
];

const defaultOptions: EChartsOption = {
  color: CHART_COLORS,
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'inherit',
    color: CHART_TEXT_COLOR,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255,255,255,0.1)',
    textStyle: {
      color: '#f8fafc',
    },
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#1e293b',
      },
    },
  },
  grid: {
    top: 30,
    right: 10,
    bottom: 0,
    left: 0,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { color: CHART_TEXT_COLOR },
  },
  yAxis: {
    type: 'value',
    splitNumber: 4,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: {
        color: CHART_GRID_COLOR,
        type: 'dashed',
      },
    },
    axisLabel: {
      color: CHART_TEXT_COLOR,
      formatter: (value: number) => {
        if (value >= 1000000) return (value / 1000000).toFixed(1).replace('.0', '') + ' Mi';
        if (value >= 1000) return (value / 1000).toFixed(1).replace('.0', '') + ' mil';
        return String(value);
      }
    }
  },
};

// Adaptive domain for line charts
const applyAdaptiveDomain = (option: EChartsOption): EChartsOption => {
  return {
    ...option,
    yAxis: {
      ...((option.yAxis as any) || {}),
      min: (value: { min: number; max: number }) => {
        const range = value.max - value.min;
        const padding = Math.max(range * 0.15, 1);
        return Math.floor(value.min - padding);
      },
      max: (value: { min: number; max: number }) => {
        const range = value.max - value.min;
        const padding = Math.max(range * 0.15, 1);
        return Math.ceil(value.max + padding);
      },
    },
  };
};

// 1. LineChart
export function LineChart({ data, xAxisKey, lineKeys, height = DEFAULT_HEIGHT, className }: ChartProps & { xAxisKey: string; lineKeys: { key: string; name?: string; color?: string }[] }) {
  const option: EChartsOption = {
    ...defaultOptions,
    xAxis: {
      ...defaultOptions.xAxis,
      data: data.map(d => d[xAxisKey]),
    },
    series: lineKeys.map(lk => ({
      name: lk.name || lk.key,
      type: 'line',
      data: data.map(d => d[lk.key]),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: lk.color ? { color: lk.color } : undefined,
    })),
  };

  return <ReactECharts option={applyAdaptiveDomain(option)} style={{ height }} className={className} opts={{ renderer: 'svg' }} />;
}

// 2. BarChart
export function BarChart({ data, xAxisKey, barKey, name, color, height = DEFAULT_HEIGHT, className }: ChartProps & { xAxisKey: string; barKey: string; name?: string; color?: string }) {
  const option: EChartsOption = {
    ...defaultOptions,
    xAxis: {
      ...defaultOptions.xAxis,
      data: data.map(d => d[xAxisKey]),
    },
    series: [
      {
        name: name || barKey,
        type: 'bar',
        data: data.map(d => d[barKey]),
        itemStyle: {
          color: color || CHART_COLORS[0],
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 40,
      }
    ],
  };

  return <ReactECharts option={option} style={{ height }} className={className} opts={{ renderer: 'svg' }} />;
}

// 3. HorizontalBarChart
export function HorizontalBarChart({ data, yAxisKey, barKey, name, color, height = DEFAULT_HEIGHT, className }: ChartProps & { yAxisKey: string; barKey: string; name?: string; color?: string }) {
  const option: EChartsOption = {
    ...defaultOptions,
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: CHART_GRID_COLOR, type: 'dashed' },
      },
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d[yAxisKey]),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    series: [
      {
        name: name || barKey,
        type: 'bar',
        data: data.map(d => d[barKey]),
        itemStyle: {
          color: color || CHART_COLORS[0],
          borderRadius: [0, 4, 4, 0],
        },
        barMaxWidth: 20,
      }
    ],
  };

  return <ReactECharts option={option} style={{ height }} className={className} opts={{ renderer: 'svg' }} />;
}

// 4. AreaChart
export function AreaChart({ data, xAxisKey, areaKey, name, color, height = DEFAULT_HEIGHT, className }: ChartProps & { xAxisKey: string; areaKey: string; name?: string; color?: string }) {
  const c = color || CHART_COLORS[0];
  const option: EChartsOption = {
    ...defaultOptions,
    xAxis: {
      ...(defaultOptions.xAxis as any),
      boundaryGap: false,
      data: data.map(d => d[xAxisKey]),
    },
    series: [
      {
        name: name || areaKey,
        type: 'line',
        data: data.map(d => d[areaKey]),
        smooth: true,
        symbol: 'none',
        itemStyle: { color: c },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: c },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
      }
    ],
  };

  return <ReactECharts option={applyAdaptiveDomain(option)} style={{ height }} className={className} opts={{ renderer: 'svg' }} />;
}

// 5. Sparkline
export function Sparkline({ data, height = 60, color, className }: { data: number[]; height?: number; color?: string; className?: string }) {
  const c = color || CHART_COLORS[0];
  const option: EChartsOption = {
    xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    tooltip: { show: false },
    series: [
      {
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: c },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: c },
              { offset: 1, color: 'transparent' }
            ]
          }
        },
      }
    ],
  };
  return <ReactECharts option={option} style={{ height, width: '100%' }} className={className} opts={{ renderer: 'svg' }} />;
}

// 6. PopulationPyramid
export function PopulationPyramid({ data, ageKey, maleKey, femaleKey, height = 400, className }: ChartProps & { ageKey: string; maleKey: string; femaleKey: string }) {
  const option: EChartsOption = {
    ...defaultOptions,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let html = `<b>${params[0].name}</b><br/>`;
        params.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: ${Math.abs(p.value)}<br/>`;
        });
        return html;
      }
    },
    legend: {
      data: ['Homens', 'Mulheres'],
      textStyle: { color: CHART_TEXT_COLOR },
      bottom: 0,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => Math.abs(value).toString()
      },
      splitLine: { lineStyle: { color: CHART_GRID_COLOR, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d[ageKey]),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Homens',
        type: 'bar',
        stack: 'Total',
        itemStyle: { color: CHART_COLORS[1], borderRadius: [4, 0, 0, 4] },
        data: data.map(d => -d[maleKey]) // negative for left side
      },
      {
        name: 'Mulheres',
        type: 'bar',
        stack: 'Total',
        itemStyle: { color: CHART_COLORS[3], borderRadius: [0, 4, 4, 0] },
        data: data.map(d => d[femaleKey])
      }
    ],
  };

  return <ReactECharts option={option} style={{ height }} className={className} opts={{ renderer: 'svg' }} />;
}

// Add map placeholder
export function MapPlaceholder({ title, height = 400 }: { title: string; height?: number }) {
  return (
    <div style={{ height }} className="bg-[#111726]/50 border border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/img/map-pattern-dark.png')] bg-cover bg-center opacity-10 grayscale" />
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-4xl mb-4 opacity-50">🗺️</span>
        <span className="text-sm font-bold uppercase tracking-widest">{title}</span>
        <span className="text-xs mt-2">Aguardando contrato geográfico</span>
      </div>
    </div>
  );
}
