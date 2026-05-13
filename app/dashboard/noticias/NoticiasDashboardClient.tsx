'use client';

import React, { useState, useMemo } from 'react';
import KpiCard from '@/components/ui/KpiCard';
import ChartCard from '@/components/ui/ChartCard';
import GaugeChart from '@/components/charts/GaugeChart';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import DataTable from '@/components/ui/DataTable';
import { 
  AlertTriangle, SearchX, Clock, Activity, Target, ShieldAlert, Zap, 
  ArrowUpRight, ArrowDownRight, Filter, Settings2, BarChart3, ListFilter 
} from 'lucide-react';
import clsx from 'clsx';

import {
  getKPIs,
  getGaugeScore,
  getNoticiasPorTempo,
  getSentimento,
  getFontes,
  getRiscosPorFonte,
  getTemas,
  getRiscoTempo,
  getFeedNoticias,
  getRealTimeStatus,
  getNegativeThemesPareto,
  getImpactSources,
  getCrisisTimeline24h,
} from '@/lib/queries/noticias';
import type { MencaoRow, Noticia } from '@/lib/types/noticias';
import { ChartFilterPopover } from './ChartFilterPopover';

interface Props {
  initialRows: MencaoRow[];
}

export default function NoticiasDashboardClient({ initialRows }: Props) {
  // --- Local Filters State ---
  const [gaugeConfig, setGaugeConfig] = useState({ base: 'mix', window: '24h' });
  const [themesConfig, setThemesConfig] = useState({ topN: 5, minRisk: 0 });
  const [sourcesConfig, setSourcesConfig] = useState({ metric: 'impact', topN: 5 });
  const [timelineConfig, setTimelineConfig] = useState({ zoom: '1x', showPeaks: true });
  const [feedConfig, setFeedConfig] = useState({ priority: 'all', limit: 5 });

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
    
    // Se a janela selecionada não tiver dados, mas houver dados no painel, 
    // retorna todos os dados para não exibir "Sem dados".
    return rows.length > 0 ? rows : filteredRows;
  }, [filteredRows, gaugeConfig.window]);

  const gauge = useMemo(() => getGaugeScore(gaugeRows), [gaugeRows]);
  const realTimeStatus = useMemo(() => getRealTimeStatus(filteredRows), [filteredRows]);
  const negativeThemesPareto = useMemo(() => {
    const data = getNegativeThemesPareto(filteredRows);
    return data.slice(0, themesConfig.topN);
  }, [filteredRows, themesConfig.topN]);
  
  const impactSources = useMemo(() => {
    const data = getImpactSources(filteredRows);
    return data.slice(0, sourcesConfig.topN);
  }, [filteredRows, sourcesConfig.topN]);

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

  if (initialRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-500">
        <SearchX size={48} className="text-gray-600" />
        <p className="text-lg font-medium text-gray-400">Nenhuma notícia encontrada</p>
        <p className="text-sm">Tente ajustar ou limpar os filtros globais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <KpiCard key={idx} title={kpi.title} value={kpi.value} status={kpi.status} />
        ))}
      </div>

      {/* 2. TERMÔMETRO + STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 md:col-span-2 order-1">
          <ChartCard 
            title="Termômetro de Crise" 
            className="h-full flex flex-col items-center justify-center pt-12 relative overflow-hidden"
            extra={
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Base de Cálculo</label>
                    <select 
                      value={gaugeConfig.base} 
                      onChange={e => setGaugeConfig(prev => ({ ...prev, base: e.target.value }))}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
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
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
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
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider",
                realTimeStatus?.hasRecentPeak ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" : "bg-green-500/20 text-green-400 border border-green-500/30"
              )}>
                <Activity size={12} />
                {realTimeStatus?.hasRecentPeak ? 'Pico Detectado' : 'Estável'}
              </div>
            </div>

            <div className="w-full max-w-md mx-auto">
              <GaugeChart score={gauge.score} level={gauge.level} />
            </div>
            
            <div className="text-center mt-[-40px] pb-8 z-10">
              <div className={clsx(
                "text-4xl font-black mb-2 tracking-tighter",
                gauge.level === 'danger' ? 'text-[#FF3B3B]' : gauge.level === 'warning' ? 'text-[#FACC15]' : 'text-[#22C55E]'
              )}>
                {gauge.score}<span className="text-xl opacity-50 ml-1">/100</span>
              </div>
              <span className={clsx(
                'text-lg font-bold px-6 py-1.5 rounded-full border',
                gauge.level === 'danger'  ? 'bg-[#FF3B3B]/10 text-[#FF3B3B] border-[#FF3B3B]/20' :
                gauge.level === 'warning' ? 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20' :
                                            'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20'
              )}>
                {gauge.statusText}
              </span>

              <div className="grid grid-cols-3 gap-8 mt-10 px-6">
                <div className="text-center">
                  <div className="text-gray-400 text-xs uppercase mb-1">Tendência</div>
                  <div className="flex items-center justify-center gap-1 font-bold text-white">
                    {gauge.score > 50 ? <ArrowUpRight size={16} className="text-red-500" /> : <ArrowDownRight size={16} className="text-green-500" />}
                    {gauge.score > 60 ? 'Crescente' : gauge.score > 30 ? 'Estável' : 'Queda'}
                  </div>
                </div>
                <div className="text-center border-x border-white/5">
                  <div className="text-gray-400 text-xs uppercase mb-1">Sentimento Médio</div>
                  <div className={clsx(
                    "font-bold",
                    gauge.score > 40 ? "text-red-400" : "text-green-400"
                  )}>
                    {gauge.score > 40 ? 'Negativo' : 'Positivo'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-xs uppercase mb-1">Pico 6h</div>
                  <div className="font-bold text-white">
                    {realTimeStatus?.hasRecentPeak ? 'Sim' : 'Não'}
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        <div className="lg:col-span-5 md:col-span-2 order-3 lg:order-2">
          <ChartCard title="Status em Tempo Real" className="h-full">
            <div className="flex items-center gap-2 mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-green-500 text-xs font-bold uppercase tracking-widest">Ao Vivo</span>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                <div className="flex items-center gap-2 text-red-400 mb-2 font-bold text-sm uppercase tracking-tight">
                  <ShieldAlert size={16} />
                  Última Menção Crítica
                </div>
                <p className="text-white font-medium line-clamp-2 text-sm">
                  {realTimeStatus?.lastCriticalTitle}
                </p>
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                  <Clock size={12} />
                  há {realTimeStatus?.timeSinceLastCritical}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Fonte Dominante</div>
                  <div className="text-white font-bold text-sm truncate">{realTimeStatus?.dominantSource}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Tema Dominante</div>
                  <div className="text-white font-bold text-sm truncate">{realTimeStatus?.dominantTheme}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Fonte Mais Ativa</div>
                  <div className="text-white font-bold text-sm truncate">{realTimeStatus?.mostActiveSource}</div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Velocidade</div>
                  <div className="text-white font-bold text-sm">{realTimeStatus?.velocity}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#00FFFF]/5 rounded-lg border border-[#00FFFF]/10">
                <div className="flex items-center gap-2 text-[#00FFFF]">
                  <Zap size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Ação Recomendada</span>
                </div>
                <span className="text-white text-xs font-medium">Monitoramento Ativo</span>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* 3. TEMAS NEGATIVOS + FONTES IMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 order-4">
        <ChartCard 
          title="Principais Temas Negativos"
          extra={
            <ChartFilterPopover>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Exibir Top</label>
                  <select 
                    value={themesConfig.topN} 
                    onChange={e => setThemesConfig(prev => ({ ...prev, topN: Number(e.target.value) }))}
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Risco Mínimo</label>
                  <input 
                    type="range" min="0" max="100" step="10"
                    value={themesConfig.minRisk}
                    onChange={e => setThemesConfig(prev => ({ ...prev, minRisk: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00FFFF]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1 uppercase">
                    <span>Todos</span>
                    <span>Críticos</span>
                  </div>
                </div>
              </div>
            </ChartFilterPopover>
          }
        >
          <div className="space-y-4 mt-2">
            {negativeThemesPareto.length > 0 ? (
              negativeThemesPareto.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-white">{item.name}</span>
                    <span className="text-red-400">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-500 italic text-sm">
                Sem temas negativos no período.
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard 
          title="Fontes com Maior Impacto"
          extra={
            <ChartFilterPopover>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Métrica</label>
                  <select 
                    value={sourcesConfig.metric} 
                    onChange={e => setSourcesConfig(prev => ({ ...prev, metric: e.target.value }))}
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                  >
                    <option value="impact">Impacto Calculado</option>
                    <option value="volume">Volume Bruto</option>
                    <option value="risk">Somente Riscos</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Top N</label>
                  <select 
                    value={sourcesConfig.topN} 
                    onChange={e => setSourcesConfig(prev => ({ ...prev, topN: Number(e.target.value) }))}
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                  </select>
                </div>
              </div>
            </ChartFilterPopover>
          }
        >
          <div className="space-y-4 mt-2">
            {impactSources.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-white">{item.name}</span>
                  <span className="text-[#00FFFF]">{item.score} pts</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#00FFFF]/80 to-[#00FFFF] h-full rounded-full transition-all duration-1000"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* 4. LINHA DO TEMPO */}
      <ChartCard 
        title="Linha do Tempo de Crise — Últimas 24 horas" 
        className="w-full overflow-hidden"
        extra={
          <ChartFilterPopover>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white">Exibir Picos</span>
                <input 
                  type="checkbox" checked={timelineConfig.showPeaks}
                  onChange={e => setTimelineConfig(prev => ({ ...prev, showPeaks: e.target.checked }))}
                  className="accent-[#00FFFF]"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Agrupamento</label>
                <select 
                  className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                  defaultValue="1h"
                >
                  <option value="1h">1 Hora</option>
                  <option value="3h">3 Horas</option>
                </select>
              </div>
            </div>
          </ChartFilterPopover>
        }
      >
        <div className="relative mt-4 mb-8">
          <div className="flex h-12 w-full rounded-lg overflow-hidden bg-white/5 border border-white/10">
            {crisisTimeline.map((step, i) => (
              <div 
                key={i} 
                className={clsx(
                  "flex-1 border-r border-white/5 transition-all hover:opacity-80 group relative",
                  step.status === 'red' ? 'bg-red-500/40' : step.status === 'yellow' ? 'bg-yellow-500/30' : 'bg-green-500/10'
                )}
              >
                {timelineConfig.showPeaks && step.risk > 4 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldAlert size={16} className="text-red-500 animate-bounce" />
                  </div>
                )}
                
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="bg-[#12192A] border border-white/10 rounded-lg p-2 shadow-2xl min-w-[200px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#00FFFF] font-bold text-[10px]">{step.hour}</span>
                      <span className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded uppercase font-black",
                        step.status === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      )}>
                        {step.risk > 0 ? `${step.risk} Riscos` : 'Normal'}
                      </span>
                    </div>
                    {step.topNews && (
                      <p className="text-white text-[10px] leading-tight line-clamp-2">
                        {step.topNews.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </ChartCard>

      {/* 5. EVOLUÇÃO, IMPACTO E FEED CRÍTICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 order-5 lg:order-none">
        <div className="lg:col-span-4 md:col-span-1">
          <ChartCard title="Evolução do Risco" className="h-full">
            <LineChart
              dates={riscoTempoData.dates}
              seriesData={[
                { name: 'Geral', data: riscoTempoData.alto.map((v, i) => v + riscoTempoData.medio[i]), color: '#FF3B3B' },
                { name: 'Crítico', data: riscoTempoData.alto, color: '#991B1B' },
              ]}
            />
          </ChartCard>
        </div>

        <div className="lg:col-span-4 md:col-span-1">
          <ChartCard title="Distribuição do Impacto" className="h-full">
            <DonutChart 
              data={fontesData.categories.slice(0, 5).map((cat, i) => ({
                name: cat,
                value: fontesData.values[i],
                itemStyle: { color: i === 0 ? '#00FFFF' : i === 1 ? '#2563EB' : i === 2 ? '#7C3AED' : i === 3 ? '#DB2777' : '#4B5563' }
              }))} 
            />
          </ChartCard>
        </div>

        <div className="lg:col-span-4 md:col-span-2 order-2 lg:order-none">
          <ChartCard 
            title="Feed Crítico — Últimas" 
            className="h-full"
            extra={
              <ChartFilterPopover>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Prioridade</label>
                    <select 
                      value={feedConfig.priority}
                      onChange={e => setFeedConfig(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="all">Todas as Recentes</option>
                      <option value="high">Apenas Críticas</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Limite</label>
                    <select 
                      value={feedConfig.limit}
                      onChange={e => setFeedConfig(prev => ({ ...prev, limit: Number(e.target.value) }))}
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value={5}>5 notícias</option>
                      <option value={10}>10 notícias</option>
                      <option value={20}>20 notícias</option>
                    </select>
                  </div>
                </div>
              </ChartFilterPopover>
            }
          >
            <div className="space-y-4">
              {feedData.map((news, i) => (
                <div key={i} className="group cursor-pointer" onClick={() => window.open(news.link, '_blank')}>
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      "mt-1 w-2 h-2 rounded-full shrink-0",
                      news.risco === 'alto' ? 'bg-red-500 animate-pulse' : news.risco === 'médio' ? 'bg-yellow-500' : 'bg-green-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={clsx(
                          "text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                          news.risco === 'alto' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        )}>
                          {news.risco === 'alto' ? 'Urgente' : news.risco === 'médio' ? 'Atenção' : 'Monitorar'}
                        </span>
                        <span className="text-[10px] text-gray-500">{news.data.split(' ')[1]}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-[#00FFFF] transition-colors line-clamp-2">
                        {news.titulo}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 truncate">{news.fonte}</span>
                        <span className="text-[10px] text-gray-600">•</span>
                        <span className="text-[10px] text-gray-400">Impacto {news.relevancia > 7 ? 'Alto' : news.relevancia > 4 ? 'Médio' : 'Baixo'}</span>
                      </div>
                    </div>
                  </div>
                  {i < feedData.length - 1 && <div className="h-px bg-white/5 mt-4" />}
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="pt-10">
        <h3 className="text-xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF]" /> Base Completa de Monitoramento
        </h3>
        <DataTable data={fullTableData} />
      </div>
    </div>
  );
}
