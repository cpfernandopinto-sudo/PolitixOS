'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface LineChartProps {
  dates: string[];
  values?: number[]; // Simple line
  seriesData?: { name: string; data: number[]; color: string }[]; // Multi-line
}

export default function LineChart({ dates, values, seriesData }: LineChartProps) {
  const series = seriesData ? seriesData.map(s => ({
    name: s.name,
    type: 'line',
    smooth: true,
    data: s.data,
    itemStyle: { color: s.color },
    lineStyle: { width: 3 },
    symbolSize: 8,
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: `${s.color}66` },
          { offset: 1, color: `${s.color}00` }
        ]
      }
    }
  })) : [{
    data: values,
    type: 'line',
    smooth: true,
    itemStyle: { color: '#00FFFF' },
    lineStyle: { width: 3, color: '#00FFFF' },
    symbolSize: 8,
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(0, 255, 255, 0.4)' },
          { offset: 1, color: 'rgba(0, 255, 255, 0)' }
        ]
      }
    }
  }];

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#12192A',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#FFFFFF' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: { color: '#9CA3AF' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9CA3AF' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
    },
    series: series
  };

  return <ReactECharts option={option} style={{ height: '300px', width: '100%' }} />;
}
