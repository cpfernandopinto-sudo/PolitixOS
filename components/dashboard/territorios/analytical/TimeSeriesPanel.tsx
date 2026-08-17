'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { LineChart } from '@/components/dashboard/territorios/PolitixCharts';
import SourceMetadataPanel from './SourceMetadataPanel';

export interface SeriesConfig {
  key: string;
  name: string;
  color: string;
}

export interface TimeSeriesPanelProps {
  title: string;
  subtitle?: string;
  data: Array<Record<string, any>>;
  xAxisKey: string;
  series: SeriesConfig[];
  height?: number;
  source?: string;
  dataset?: string;
  lastUpdated?: string;
  period?: string;
}

export default function TimeSeriesPanel({
  title,
  subtitle,
  data,
  xAxisKey,
  series,
  height = 280,
  source,
  dataset,
  lastUpdated,
  period,
}: TimeSeriesPanelProps) {
  const hasData = data && data.length > 0;

  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Activity size={15} className="text-cyan-400" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {period && (
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20 self-start sm:self-auto">
            Período: {period}
          </span>
        )}
      </div>

      {hasData ? (
        <LineChart
          data={data}
          xAxisKey={xAxisKey}
          lineKeys={series}
          height={height}
        />
      ) : (
        <div
          style={{ height }}
          className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs gap-1"
        >
          <span>Série temporal não disponível para o período selecionado</span>
        </div>
      )}

      {(source || dataset || lastUpdated) && (
        <SourceMetadataPanel
          source={source}
          dataset={dataset}
          lastUpdated={lastUpdated}
          period={period}
          compact
        />
      )}
    </div>
  );
}
