'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface BarChartProps {
  categories: string[];
  values: number[];
  color?: string;
  horizontal?: boolean;
}

export default function BarChart({ categories, values, color = '#2563EB', horizontal = true }: BarChartProps) {
  const xAxis = horizontal ? { type: 'value', axisLabel: { color: '#9CA3AF' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } } } : { type: 'category', data: categories, axisLabel: { color: '#9CA3AF' } };
  const yAxis = horizontal ? { type: 'category', data: categories, axisLabel: { color: '#9CA3AF' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } } : { type: 'value', axisLabel: { color: '#9CA3AF' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } } };

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#12192A',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#FFFFFF' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: xAxis,
    yAxis: yAxis,
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: {
          color: color,
          borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
        },
        barWidth: '60%'
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '300px', width: '100%' }} />;
}
