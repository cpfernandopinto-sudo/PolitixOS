'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface DonutChartProps {
  data: { name: string; value: number; itemStyle?: { color: string } }[];
  height?: number | string;
  radius?: [string, string];
  center?: [string, string];
}

export default function DonutChart({ data, height = 280, radius = ['52%', '78%'], center = ['50%', '42%'] }: DonutChartProps) {
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#12192A',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#FFFFFF' },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: '0',
      left: 'center',
      itemGap: 10,
      itemWidth: 9,
      itemHeight: 9,
      textStyle: {
        color: '#9CA3AF',
        fontSize: 10,
      },
      formatter: (name: string) => name.length > 15 ? `${name.slice(0, 14)}…` : name,
    },
    series: [
      {
        type: 'pie',
        radius: radius,
        center: center,
        avoidLabelOverlap: false,
        label: { show: false, position: 'center' },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold',
            color: '#FFFFFF'
          }
        },
        labelLine: { show: false },
        data: data,
        itemStyle: {
          borderWidth: 2,
          borderColor: '#0D0D0D'
        }
      }
    ]
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
