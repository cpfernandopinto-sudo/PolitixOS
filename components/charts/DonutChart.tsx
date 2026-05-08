'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface DonutChartProps {
  data: { name: string; value: number; itemStyle?: { color: string } }[];
}

export default function DonutChart({ data }: DonutChartProps) {
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#12192A',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#FFFFFF' },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#9CA3AF' }
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '80%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false, position: 'center' },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
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

  return <ReactECharts option={option} style={{ height: '300px', width: '100%' }} />;
}
