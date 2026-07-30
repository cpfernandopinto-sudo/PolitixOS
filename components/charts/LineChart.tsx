'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface LineChartProps {
  dates: string[];
  values?: number[]; // Simple line
  seriesData?: { name: string; data: number[]; color: string }[]; // Multi-line
  height?: number | string;
}

export default function LineChart({ dates, values, seriesData, height = 280 }: LineChartProps) {
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
    legend: {
      show: true,
      textStyle: { color: '#8b9ab1', fontSize: 10 },
      top: '0',
      right: '10%'
    },
    grid: { left: 16, right: 16, bottom: 8, top: 32, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: dates,
      axisLabel: {
        color: '#8b9ab1',
        hideOverlap: true,
        fontSize: 10,
        interval: dates.length > 6 ? Math.floor(dates.length / 6) - 1 : 0
      },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8b9ab1', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
      boundaryGap: [0, '15%']
    },
    series: series
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: '100%', minHeight: typeof height === 'number' ? height : 220 }}
    />
  );
}
