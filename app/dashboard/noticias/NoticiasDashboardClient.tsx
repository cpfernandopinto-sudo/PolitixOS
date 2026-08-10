'use client';

import React, { useState, useMemo } from 'react';
import KpiCard from '@/components/ui/KpiCard';
import ChartCard from '@/components/ui/ChartCard';
import GaugeChart from '@/components/charts/GaugeChart';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import DataTable from '@/components/ui/DataTable';
import NewsDetailModal from '@/components/news/NewsDetailModal';
import {
  AlertTriangle, SearchX, Clock, Activity, ShieldAlert, Zap,
  ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import InvestigationButton from '@/components/investigations/InvestigationButton';

import {
  getKPIs,
  getGaugeScore,
  getFeedNoticias,
  getRealTimeStatus,
  getNegativeThemesPareto,
  getImpactSources,
  getCrisisTimeline24h,
  getRiscoTempo,
  getFontes
} from '@/lib/queries/noticias';
import type { MencaoRow, Noticia } from '@/lib/types/noticias';
import { ChartFilterPopover } from './ChartFilterPopover';

interface Props {
  initialRows: MencaoRow[];
}

const CRISE_FLAGS = new Set([
  'crise_politica', 'crise_financeira', 'crise_economica',
  'corrupcao', 'crime_acusacao', 'processo_judicial',
  'Gestão de Crise', 'Acusação',
]);

function parseJsonField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string') as string[];
    } catch {}
  }
  return [];
}

function checkIsCrise(flagsField: unknown): boolean {
  const flags = parseJsonField(flagsField);
  return flags.length >= 2 || flags.some((f) => CRISE_FLAGS.has(f));
}

export default function NoticiasDashboardClient({ initialRows }: Props) {
  // --- Local Filters State ---
  const [gaugeConfig, setGaugeConfig] = useState({ base: 'mix', window: '24h' });
  const [sourcesConfig, setSourcesConfig] = useState({ metric: 'impact' });
  const [timelineConfig, setTimelineConfig] = useState({ zoom: '1x', showPeaks: true });
  const [feedConfig, setFeedConfig] = useState({ priority: 'all', limit: 5 });

  const [topicsLimit, setTopicsLimit] = useState<5 | 10>(10);
  const [sourcesLimit, setSourcesLimit] = useState<5 | 10>(10);

  // Modal State
  const [selectedNews, setSelectedNews] = useState<{ news: Noticia; raw?: MencaoRow } | null>(null);

  // --- Calculations (Memoized) ---
  const filteredRows = useMemo(() => initialRows, [initialRows]);
  const kpis = useMemo(() => getKPIs(filteredRows), [filteredRows]);

  // Local window filter for Gauge
  const gaugeRows = useMemo(() => {
    const now = new Date();
    let hours = 24;
    if (gaugeConfig.window === '6h') hours = 6;
    else if (gaugeConfig.window === '48h') hours = 48;

    const limit = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const rows = filteredRows.filter(r => r.published_at && new Date(r.published_at) >= limit);

    return rows.length > 0 ? rows : filteredRows;
  }, [filteredRows, gaugeConfig.window]);

  const gauge = useMemo(() => getGaugeScore(gaugeRows), [gaugeRows]);
  const realTimeStatus = useMemo(() => getRealTimeStatus(filteredRows), [filteredRows]);

  const sortedThemes = useMemo(() => {
    const data = getNegativeThemesPareto(filteredRows);
    return [...data].sort((a, b) => b.percentage - a.percentage);
  }, [filteredRows]);

  const visibleThemes = useMemo(() => {
    return sortedThemes.slice(0, topicsLimit);
  }, [sortedThemes, topicsLimit]);

  const sortedSources = useMemo(() => {
    const data = getImpactSources(filteredRows);
    return [...data].sort((a, b) => b.score - a.score);
  }, [filteredRows]);

  const visibleSources = useMemo(() => {
    return sortedSources.slice(0, sourcesLimit);
  }, [sortedSources, sourcesLimit]);

  const crisisTimeline = useMemo(() => getCrisisTimeline24h(filteredRows), [filteredRows]);
  const riscoTempoData = useMemo(() => getRiscoTempo(filteredRows), [filteredRows]);
  const fontesData = useMemo(() => getFontes(filteredRows), [filteredRows]);

  const feedData = useMemo(() => {
    let data = getFeedNoticias(filteredRows, 50);
    if (feedConfig.priority === 'high') {
      data = data.filter(n => n.risco === 'alto');
    }
    return data.slice(0, feedConfig.limit);
  }, [filteredRows, feedConfig.priority, feedConfig.limit]);

  const fullTableData = useMemo(() => getFeedNoticias(filteredRows, 100), [filteredRows]);

  // Auxiliares para ECharts de Barras
  const themeCategories = useMemo(() => visibleThemes.map(item => item.name).reverse(), [visibleThemes]);
  const themeValues = useMemo(() => visibleThemes.map(item => item.percentage).reverse(), [visibleThemes]);

  const sourceCategories = useMemo(() => visibleSources.map(item => item.name).reverse(), [visibleSources]);
  const sourceValues = useMemo(() => visibleSources.map(item => item.score).reverse(), [visibleSources]);

  // Auxiliar para a timeline vertical
  const maxTimelineCount = useMemo(() => {
    const counts = crisisTimeline.map(t => t.count);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [crisisTimeline]);

  const isTimelineEmpty = useMemo(() => {
    return crisisTimeline.every(t => t.count === 0);
  }, [crisisTimeline]);

  if (initialRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500">
        <SearchX size={48} className="text-gray-600" />
        <p className="text-lg font-medium text-gray-400">Nenhuma notícia encontrada</p>
        <p className="text-sm">Tente ajustar ou limpar os filtros globais.</p>
      </div>
    );
  }

  const handleScrollToTable = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('base-monitoramento')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* 1. INDICADORES EXECUTIVOS (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi, idx) => {
          const isDanger = kpi.status === 'danger';
          const isWarning = kpi.status === 'warning';
          const isSuccess = kpi.status === 'success';

          const borderHoverClass = isDanger 
            ? 'hover:border-red-500/30' 
            : isWarning 
            ? 'hover:border-yellow-500/30' 
            : isSuccess 
            ? 'hover:border-green-500/30' 
            : 'hover:border-cyan-400/30';

          const progressColorClass = isDanger 
            ? 'bg-red-500' 
            : isWarning 
            ? 'bg-yellow-500' 
            : isSuccess 
            ? 'bg-green-500' 
            : 'bg-cyan-400';

          const progressBgClass = isDanger 
            ? 'bg-red-500/10' 
            : isWarning 
            ? 'bg-yellow-500/10' 
            : isSuccess 
            ? 'bg-green-500/10' 
            : 'bg-cyan-400/10';

          const labelColorClass = isDanger 
            ? 'text-red-400/80' 
            : isWarning 
            ? 'text-yellow-400/80' 
            : isSuccess 
            ? 'text-green-400/80' 
            : 'text-cyan-400/80';

          return (
            <div
              key={idx}
              className={clsx(
                "surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group border border-white/[0.08] rounded-xl transition-all duration-300 relative overflow-hidden",
                borderHoverClass
              )}
              title={kpi.title}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">
                  {kpi.title}
                </span>
                <TrendingUp className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
              </div>
              <div className={clsx(
                "text-2xl font-bold leading-none mt-1",
                isDanger ? "text-red-500" : isWarning ? "text-yellow-500" : "text-white"
              )}>
                {kpi.value}
              </div>
              <div className={clsx("text-[9px] font-medium truncate mb-1", labelColorClass)}>
                {isDanger ? 'Crítico / Exige mitigação' : isWarning ? 'Atenção operacional' : 'Métrica sob controle'}
              </div>
              <div className={clsx("absolute bottom-0 left-0 h-1 w-full", progressBgClass)}>
                <div className={clsx("h-full transition-all duration-500", progressColorClass)} style={{ width: '100%' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. TERMÔMETRO + STATUS (DUAS COLUNAS LADO A LADO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Card 1: Termômetro de Crise */}
        <div className="lg:col-span-5 flex">
          <ChartCard
            title="Termômetro de Crise"
            className="flex flex-col justify-between w-full h-[340px] !p-4 relative overflow-hidden bg-[#161B26] border border-white/[0.08] rounded-xl"
            extra={
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Base de Cálculo</label>
                    <select
                      value={gaugeConfig.base}
                      onChange={e => setGaugeConfig(prev => ({ ...prev, base: e.target.value }))}
                      className="w-full bg-[#0B1423] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="mix">Misto (Sentimento + Risco)</option>
                      <option value="sentiment">Apenas Sentimento</option>
                      <option value="risk">Apenas Risco</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Janela Temporal</label>
                    <select
                      value={gaugeConfig.window}
                      onChange={e => setGaugeConfig(prev => ({ ...prev, window: e.target.value }))}
                      className="w-full bg-[#0B1423] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="6h">Últimas 6 horas</option>
                      <option value="24h">Últimas 24 horas</option>
                      <option value="48h">Últimas 48 horas</option>
                    </select>
                  </div>
                </div>
              </ChartFilterPopover>
            }
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <div className={clsx(
                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                realTimeStatus?.hasRecentPeak
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                  : "bg-green-500/20 text-green-400 border border-green-500/30"
              )}>
                <Activity size={10} />
                {realTimeStatus?.hasRecentPeak ? 'Pico Detectado' : 'Estável'}
              </div>
            </div>

            {/* Gauge Chart */}
            <div className="w-full mx-auto pt-0 flex items-center justify-center -mt-2">
              <GaugeChart score={gauge.score} level={gauge.level} showValue={false} height={155} />
            </div>

            {/* Consolidated Value & Status (No duplication) */}
            <div className="text-center z-10 -mt-7 mb-1">
              <span className={clsx(
                "text-base font-black tracking-tight",
                gauge.level === 'danger' ? 'text-[#FF3B3B]' : gauge.level === 'warning' ? 'text-[#FACC15]' : 'text-[#22C55E]'
              )}>
                {gauge.score}<span className="text-xs opacity-50 ml-0.5">/100</span> · {gauge.statusText}
              </span>
            </div>

            {/* Indicators Grid */}
            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2.5 mt-1 text-center text-[10px]">
              <div>
                <div className="text-slate-500 uppercase tracking-tight mb-0.5 font-bold">Tendência</div>
                <div className="flex items-center justify-center gap-0.5 font-black text-white">
                  {gauge.score > 50 ? <ArrowUpRight size={12} className="text-red-500" /> : <ArrowDownRight size={12} className="text-green-500" />}
                  {gauge.score > 60 ? 'Crescente' : gauge.score > 30 ? 'Estável' : 'Queda'}
                </div>
              </div>
              <div className="border-x border-white/5">
                <div className="text-slate-500 uppercase tracking-tight mb-0.5 font-bold">Sentimento</div>
                <div className={clsx("font-black", gauge.score > 40 ? "text-red-400" : "text-green-400")}>
                  {gauge.score > 40 ? 'Negativo' : 'Positivo'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-tight mb-0.5 font-bold">Pico 6h</div>
                <div className="font-black text-white">
                  {realTimeStatus?.hasRecentPeak ? 'Sim' : 'Não'}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Card 2: Status em Tempo Real */}
        <div className="lg:col-span-7 flex">
          <ChartCard
            title="Status em Tempo Real"
            className="flex flex-col justify-between w-full h-[340px] !p-4 bg-[#161B26] border border-white/[0.08] rounded-xl"
            extra={
              <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Ao Vivo</span>
              </div>
            }
          >
            <div className="flex-1 flex flex-col justify-between gap-2.5">
              {/* Última Menção Crítica */}
              <div
                onClick={() => {
                  const critRow = filteredRows.find(r => checkIsCrise(r.ai_risk_flags));
                  if (critRow) {
                    const news = getFeedNoticias([critRow], 1)[0];
                    setSelectedNews({ news, raw: critRow });
                  }
                }}
                className="bg-[#EF4444]/[0.05] border border-[#EF4444]/10 rounded-lg p-2 cursor-pointer transition-all hover:scale-[1.01] hover:bg-[#EF4444]/[0.08]"
              >
                <div className="flex items-center gap-1 text-red-400 mb-0.5 font-bold text-[10px] uppercase tracking-tight">
                  <ShieldAlert size={12} />
                  Última Menção Crítica
                </div>
                <p className="text-white font-bold text-xs truncate leading-snug">
                  {realTimeStatus?.lastCriticalTitle}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Fonte: {realTimeStatus?.dominantSource}</span>
                  <span>há {realTimeStatus?.timeSinceLastCritical}</span>
                </div>
              </div>

              {/* Grid de Informações 2x2 */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-1.5 bg-[#1E2532]/50 border border-white/[0.08] rounded-lg">
                  <div className="text-slate-500 font-bold uppercase tracking-tight text-[10px]">Fonte Dominante</div>
                  <div className="text-white font-black truncate mt-0.5 text-xs">{realTimeStatus?.dominantSource}</div>
                </div>
                <div className="p-1.5 bg-[#1E2532]/50 border border-white/[0.08] rounded-lg">
                  <div className="text-slate-500 font-bold uppercase tracking-tight text-[10px]">Tema Dominante</div>
                  <div className="text-white font-black truncate mt-0.5 text-xs">{realTimeStatus?.dominantTheme}</div>
                </div>
                <div className="p-1.5 bg-[#1E2532]/50 border border-white/[0.08] rounded-lg">
                  <div className="text-slate-500 font-bold uppercase tracking-tight text-[10px]">Fonte Mais Ativa</div>
                  <div className="text-white font-black truncate mt-0.5 text-xs">{realTimeStatus?.mostActiveSource}</div>
                </div>
                <div className="p-1.5 bg-[#1E2532]/50 border border-white/[0.08] rounded-lg">
                  <div className="text-slate-500 font-bold uppercase tracking-tight text-[10px]">Velocidade</div>
                  <div className="text-white font-black mt-0.5 text-xs">{realTimeStatus?.velocity}</div>
                </div>
              </div>

              {/* Diretriz Recomendada */}
              <div className="p-2 bg-[#22D3EE]/[0.06] border border-[#22D3EE]/10 rounded-lg flex items-start gap-2">
                <Zap size={14} className="text-[#22D3EE] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[#22D3EE] text-[10px] font-bold uppercase tracking-wider mb-0.5">Diretriz Recomendada</div>
                  <p className="text-white text-[10px] leading-relaxed font-medium line-clamp-2">
                    {realTimeStatus?.hasRecentPeak
                      ? "Instaurar protocolo de crise e notificar assessoria sobre os temas dominantes."
                      : gauge.level === 'danger'
                      ? "Revisar publicações em canais dominantes e preparar relatórios de risco urgentes."
                      : gauge.level === 'warning'
                      ? "Monitorar tendências a cada 2h e acompanhar engajamento das fontes mais ativas."
                      : "Manter monitoramento de rotina e compilar resumos diários de sentimento."}
                  </p>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* 3. FEED CRÍTICO — ÚLTIMAS MENÇÕES (LARGURA COMPLETA) */}
      <div className="mt-6">
        <ChartCard
          title="Feed Crítico — Últimas Ocorrências sob Alerta"
          className="bg-[#161B26] border border-white/[0.08] rounded-xl !p-4"
          extra={
            <div className="flex items-center gap-2">
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Prioridade</label>
                    <select
                      value={feedConfig.priority}
                      onChange={e => setFeedConfig(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full bg-[#0B1423] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="all">Todas as Recentes</option>
                      <option value="high">Apenas Críticas</option>
                    </select>
                  </div>
                </div>
              </ChartFilterPopover>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            {feedData.slice(0, 4).map((news, index) => {
              const isHigh = news.risco === 'alto';
              const isMedium = news.risco === 'médio';
              const raw = filteredRows.find(r => r.id === news.id || r.hash === news.id);

              return (
                <div
                  key={news.id}
                  onClick={() => setSelectedNews({ news, raw })}
                  className="p-3 bg-[#1E2532]/40 hover:bg-[#1E2532]/80 border border-white/[0.06] hover:border-cyan-500/20 rounded-xl transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left part: Time, severity, candidate and source */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={clsx(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                        isHigh ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        isMedium ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {isHigh ? <AlertTriangle size={10} /> : <Clock size={10} />}
                        {isHigh ? 'Crítico' : isMedium ? 'Atenção' : 'Monitorar'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {news.fonte}
                      </span>
                      {news.candidato && (
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/5 px-1.5 py-0.5 rounded">
                          {news.candidato}
                        </span>
                      )}
                      <span className="text-slate-500 text-[10px] font-medium ml-auto md:ml-0">
                        {news.data}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {news.titulo}
                    </h4>
                  </div>

                  {/* Right part: Impact badge and CTA action button */}
                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Relevância:</span>
                      <span className="text-sm font-black text-white">{news.relevancia.toFixed(1)}/10</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {raw && (
                        <InvestigationButton
                          mention={{
                            id: raw.id,
                            candidate_name: raw.candidate_name,
                            candidate_id: raw.candidate_name ?? raw.id,
                            original_title: raw.title ?? news.titulo,
                            original_summary: raw.ai_takeaways ?? raw.summary ?? news.resumo,
                            title: raw.title ?? news.titulo,
                            summary: raw.ai_takeaways ?? raw.summary ?? news.resumo,
                            url: raw.url ?? news.link,
                            source: raw.source,
                            published_at: raw.published_at,
                            city: raw.city,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* 4. SEÇÃO LEITURA ANALÍTICA (5 GRÁFICOS EM CAMADAS) */}
      <div className="flex items-center gap-2 mb-4 mt-6">
        <Activity size={16} className="text-cyan-400 shrink-0" aria-hidden="true" />
        <p role="heading" aria-level={2} className="text-[22px] text-white font-bold tracking-tight">Leitura Analítica</p>
        <span className="text-xs text-slate-500 hidden sm:inline">— Temas negativos, canais, sentimento e evolução do risco consolidados.</span>
        <div className="flex-1 h-px bg-blue-500/5 ml-2" />
      </div>

      <div className="space-y-4">
        {/* PRIMEIRA LINHA — TRÊS CARDS (COMPOSIÇÃO DOS GRÁFICOS) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Card 1: Principais Temas Negativos */}
          <ChartCard
            title="Principais Temas Negativos"
            className="min-w-0 h-[300px] bg-[#161B26] border border-white/[0.08] rounded-xl"
            extra={
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Exibir Top</label>
                    <select
                      value={topicsLimit}
                      onChange={e => setTopicsLimit(Number(e.target.value) as 5 | 10)}
                      aria-label="Quantidade de temas negativos exibidos"
                      className="w-full bg-[#0B1423] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                    </select>
                  </div>
                </div>
              </ChartFilterPopover>
            }
          >
            <div className="flex-1 flex items-center justify-center min-h-0">
              {themeCategories.length > 0 ? (
                <BarChart
                  key={`topics-${topicsLimit}`}
                  categories={themeCategories}
                  values={themeValues}
                  color="#FF3B3B"
                  horizontal={true}
                  isPercent={true}
                  height={200}
                  limit={topicsLimit}
                  gridLeft={118}
                  labelWidth={105}
                />
              ) : (
                <div className="text-slate-500 italic text-xs">Sem temas no período.</div>
              )}
            </div>
          </ChartCard>

          {/* Card 2: Fontes com Maior Impacto */}
          <ChartCard
            title="Fontes com Maior Impacto"
            className="min-w-0 h-[300px] bg-[#161B26] border border-white/[0.08] rounded-xl"
            extra={
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Métrica</label>
                    <select
                      value={sourcesConfig.metric}
                      onChange={e => setSourcesConfig(prev => ({ ...prev, metric: e.target.value }))}
                      className="w-full bg-[#0B1423] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="impact">Impacto Calculado</option>
                      <option value="volume">Volume Bruto</option>
                      <option value="risk">Somente Riscos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Exibir Top</label>
                    <select
                      value={sourcesLimit}
                      onChange={e => setSourcesLimit(Number(e.target.value) as 5 | 10)}
                      aria-label="Quantidade de fontes exibidas"
                      className="w-full bg-[#0B1423] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                    </select>
                  </div>
                </div>
              </ChartFilterPopover>
            }
          >
            <div className="flex-1 flex items-center justify-center min-h-0">
              {sourceCategories.length > 0 ? (
                <BarChart
                  key={`sources-${sourcesLimit}`}
                  categories={sourceCategories}
                  values={sourceValues}
                  color="#00FFFF"
                  horizontal={true}
                  isPercent={false}
                  height={200}
                  limit={sourcesLimit}
                  gridLeft={126}
                  labelWidth={112}
                />
              ) : (
                <div className="text-slate-500 italic text-xs">Sem dados de impacto.</div>
              )}
            </div>
          </ChartCard>

          {/* Card 3: Distribuição do Impacto */}
          <ChartCard
            title="Distribuição do Impacto"
            className="min-w-0 h-[300px] bg-[#161B26] border border-white/[0.08] rounded-xl"
          >
            <div className="flex-1 flex items-center justify-center min-h-0 w-full">
              {fontesData.categories.length > 0 ? (
                <DonutChart
                  data={fontesData.categories.slice(0, 5).map((cat, i) => ({
                    name: cat,
                    value: fontesData.values[i],
                    itemStyle: {
                      color: i === 0 ? '#00FFFF' : i === 1 ? '#2563EB' : i === 2 ? '#7C3AED' : i === 3 ? '#DB2777' : '#4B5563'
                    }
                  }))}
                  height={200}
                  radius={['45%', '65%']}
                  center={['50%', '45%']}
                />
              ) : (
                <div className="text-slate-500 italic text-xs">Sem fontes identificadas.</div>
              )}
            </div>
          </ChartCard>

        </div>

        {/* SEGUNDA LINHA — DOIS CARDS (TEMPORAL: EVOLUÇÃO E LINHA DO TEMPO) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">

          {/* Card 1: Evolução do Risco */}
          <ChartCard
            title="Evolução do Risco"
            className="min-w-0 h-[300px] bg-[#161B26] border border-white/[0.08] rounded-xl"
          >
            <div className="flex-1 flex items-center justify-center min-h-0 w-full">
              {riscoTempoData.dates.length > 0 ? (
                <LineChart
                  dates={riscoTempoData.dates}
                  seriesData={[
                    { name: 'Geral', data: riscoTempoData.alto.map((v, i) => v + riscoTempoData.medio[i]), color: '#00FFFF' },
                    { name: 'Crítico', data: riscoTempoData.alto, color: '#FF3B3B' },
                  ]}
                  height={200}
                />
              ) : (
                <div className="text-slate-500 italic text-xs">Aguardando novos dados históricos.</div>
              )}
            </div>
          </ChartCard>

          {/* Card 2: Linha do Tempo de Crise — Últimas 24 horas */}
          <ChartCard
            title="Linha do Tempo de Crise — Últimas 24 horas"
            className="min-w-0 h-[300px] relative overflow-hidden bg-[#161B26] border border-white/[0.08] rounded-xl"
            extra={!isTimelineEmpty && (
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white">Exibir Picos</span>
                    <input
                      type="checkbox"
                      checked={timelineConfig.showPeaks}
                      onChange={e => setTimelineConfig(prev => ({ ...prev, showPeaks: e.target.checked }))}
                      className="accent-[#00FFFF]"
                    />
                  </div>
                </div>
              </ChartFilterPopover>
            )}
          >
            {isTimelineEmpty ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 italic text-xs py-16">
                Nenhum evento de crise identificado nas últimas 24 horas.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between mt-2">
                {/* Barras Verticais de Atividade */}
                <div className="flex items-end justify-between h-[150px] w-full gap-0.5 sm:gap-1 px-1">
                  {crisisTimeline.map((step, i) => {
                    const pctHeight = maxTimelineCount > 0 ? Math.max(8, (step.count / maxTimelineCount) * 100) : 8;
                    return (
                      <div
                        key={i}
                        className="flex-1 group relative flex flex-col justify-end h-full cursor-pointer"
                      >
                        {/* Event Peak Indicator Bounce */}
                        {timelineConfig.showPeaks && step.risk > 4 && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 block animate-ping" />
                          </div>
                        )}

                        {/* Styled Vertical Activity Bar */}
                        <div
                          className={clsx(
                            "w-full rounded-t-sm transition-all duration-300 group-hover:opacity-85",
                            step.status === 'red' ? 'bg-[#FF3B3B]' :
                            step.status === 'yellow' ? 'bg-[#FACC15]' :
                            step.count > 0 ? 'bg-[#22C55E]' : 'bg-white/5'
                          )}
                          style={{ height: `${pctHeight}%` }}
                        />

                        {/* Rich timeline tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <div className="bg-[#161B26] border border-white/[0.08] rounded-lg p-2.5 shadow-2xl min-w-[220px] text-xs">
                            <div className="flex justify-between items-center mb-1.5 font-bold border-b border-white/5 pb-1">
                              <span className="text-cyan-400">{step.hour}</span>
                              <span className={clsx(
                                "px-1.5 py-0.5 rounded text-[10px] uppercase",
                                step.status === 'red' ? 'bg-red-500/10 text-red-400' :
                                step.status === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-green-500/10 text-green-400'
                              )}>
                                {step.status === 'red' ? 'Crise' : step.status === 'yellow' ? 'Atenção' : 'Normal'}
                              </span>
                            </div>
                            <div className="space-y-1 text-[10px] text-slate-300">
                              <div className="flex justify-between">
                                <span>Menções:</span>
                                <span className="text-white font-bold">{step.count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Pontos de Risco:</span>
                                <span className="text-white font-bold">{step.risk}</span>
                              </div>
                              {step.topNews && (
                                <div className="mt-1.5 border-t border-white/5 pt-1.5">
                                  <span className="text-slate-400 font-bold block mb-0.5 text-left">Notícia Principal:</span>
                                  <p className="text-white leading-snug line-clamp-2 text-left">
                                    {step.topNews.title}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Marcações de Horário */}
                <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-white/5 pt-1.5">
                  <span>00:00</span>
                  <span>04:00</span>
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                  <span>24:00</span>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* 5. BASE COMPLETA DE MONITORAMENTO */}
      <div id="base-monitoramento" className="pt-4">
        <h3 className="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF]" /> Base Completa de Monitoramento
        </h3>
        <DataTable
          data={fullTableData}
          rawRows={initialRows}
          onSelectNews={(news, raw) => setSelectedNews({ news, raw })}
        />
      </div>

      {/* Root Details Modal */}
      {selectedNews && (
        <NewsDetailModal
          selection={selectedNews}
          onClose={() => setSelectedNews(null)}
        />
      )}
    </div>
  );
}
