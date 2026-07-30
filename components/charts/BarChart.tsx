'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';

interface BarChartProps {
  categories: string[];
  values: number[];
  color?: string;
  horizontal?: boolean;
  height?: number | string;
  isPercent?: boolean;
  limit?: 5 | 10;
  gridLeft?: number;
  labelWidth?: number;
}

export default function BarChart({
  categories,
  values,
  color = '#2563EB',
  horizontal = true,
  height = 280,
  isPercent = false,
  limit = 10,
  gridLeft,
  labelWidth
}: BarChartProps) {
  const xAxis = horizontal
    ? {
        type: 'value',
        axisLabel: { color: '#9CA3AF' },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' }
        }
      }
    : { type: 'category', data: categories, axisLabel: { color: '#9CA3AF' } };

  const yAxis = horizontal
    ? {
        type: 'category',
        data: categories,
        axisLabel: {
          color: '#94A3B8',
          fontSize: 10,
          align: 'right',
          margin: 10,
          ...(labelWidth !== undefined
            ? {
                width: labelWidth,
                overflow: 'truncate',
                ellipsis: '…'
              }
            : {
                formatter: function (value: string) {
                  if (value && value.length > 12) {
                    return value.substring(0, 10) + '...';
                  }
                  return value;
                }
              })
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      }
    : {
        type: 'value',
        axisLabel: { color: '#9CA3AF' },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' }
        }
      };

  const grid = {
    left: gridLeft !== undefined ? gridLeft : '3%',
    right: 42, // Espaço reservado à direita para os valores numéricos
    top: 18,
    bottom: 26,
    containLabel: gridLeft !== undefined ? false : true
  };

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#12192A',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#FFFFFF' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: function (params: any) {
        if (!params || params.length === 0) return '';
        const param = params[0];
        const name = param.name;
        const val = param.value;
        const indexInCategories = categories.indexOf(name);
        const rank = indexInCategories !== -1 ? (categories.length - indexInCategories) : '';
        const suffix = isPercent ? '%' : '';
        return `
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 4px; font-weight: bold;">
              #${rank} no Ranking
            </div>
            <div style="font-size: 13px; color: #FFFFFF; font-weight: 600; line-height: 1.4; margin-bottom: 4px; word-break: break-all; white-space: normal; max-width: 250px;">
              ${name}
            </div>
            <div style="font-size: 12px; color: ${color}; font-weight: bold;">
              ${isPercent ? 'Proporção' : 'Pontuação'}: ${val}${suffix}
            </div>
          </div>
        `;
      }
    },
    grid: grid,
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
        label: {
          show: true,
          position: horizontal ? 'right' : 'top',
          color: '#8b9ab1',
          fontSize: 10,
          formatter: isPercent ? '{c}%' : '{c}'
        },
        barWidth: limit === 10 ? 8 : 14
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
