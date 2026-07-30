'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface GaugeChartProps {
  score: number;
  level: 'success' | 'warning' | 'danger';
  showValue?: boolean;
  height?: number | string;
}

export default function GaugeChart({ score, level, showValue = true, height = 200 }: GaugeChartProps) {
  const color = level === 'success' ? '#22C55E' : level === 'warning' ? '#FACC15' : '#FF3B3B';

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '100%',
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [0.3, '#22C55E'],
              [0.7, '#FACC15'],
              [1, '#FF3B3B']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: '#9CA3AF',
          distance: -60,
          formatter: function (value: number) {
            if (value === 0 || value === 50 || value === 100) {
              return value + '';
            }
            return '';
          }
        },
        title: {
          offsetCenter: [0, '-20%'],
          fontSize: 20
        },
        detail: {
          show: showValue,
          fontSize: 30,
          offsetCenter: [0, '0%'],
          valueAnimation: true,
          formatter: function (value: number) {
            return Math.round(value) + '';
          },
          color: 'auto'
        },
        data: [
          {
            value: score,
            name: ''
          }
        ]
      }
    ]
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: '100%', minHeight: typeof height === 'number' ? height : 180 }}
    />
  );
}
