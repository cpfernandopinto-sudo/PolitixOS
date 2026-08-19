import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { ShieldAlert, TrendingDown, TrendingUp, AlertTriangle, Calendar, Activity, Award, BarChart3 } from 'lucide-react';
import { LineChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { createAdminClient } from '@/lib/supabaseClient';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

interface IndicatorRow {
  indicador: string;
  valor: number | string | null;
  periodo_inicio: string | null;
  metadata: Record<string, unknown> | null;
}

export default async function SegurancaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const isMgTerritory = !territory || territory.uf?.toUpperCase() === 'MG';
  let realData: any = null;
  let isDemo = false;
  let peakMonth: { period: string; value: number } | null = null;
  let lowestMonth: { period: string; value: number } | null = null;
  let monthlyAverage: number | null = null;
  let overallDelta: number | null = null;
  let categoryBarData: Array<{ category: string; count: number }> = [];

  if (territory && isMgTerritory) {
    try {
      const client = createAdminClient();
      const { data: rows } = await client
        .from('territory_indicators')
        .select('indicador, valor, periodo_inicio, metadata')
        .eq('territory_id', territory.id)
        .eq('categoria', 'seguranca_publica')
        .eq('fonte', 'SEJUSP-MG')
        .order('periodo_inicio', { ascending: true });

      if (rows && rows.length > 0) {
        // Group by month
        const monthlyMap = new Map<string, Record<string, number>>();
        rows.forEach((r: IndicatorRow) => {
          const month = r.periodo_inicio ? r.periodo_inicio.slice(0, 7) : '2024';
          const current = monthlyMap.get(month) ?? {};
          current[r.indicador] = Number(r.valor ?? 0);
          monthlyMap.set(month, current);
        });

        const historicalSeries = Array.from(monthlyMap.entries()).map(([month, vals]) => ({
          period: month.replace('-', '/'),
          violentos: vals['indice_crimes_violentos'] ?? vals['crimes_violentos_total'] ?? 0,
          patrimoniais: vals['roubo_consumado'] ?? 0,
          homicidios: vals['homicidio_consumado'] ?? 0,
          sequestros: vals['sequestro_carcere_privado_consumado'] ?? 0,
        }));

        // Mathematical peak and lowest month calculation
        const sortedByViolent = [...historicalSeries].sort((a, b) => b.violentos - a.violentos);
        peakMonth = sortedByViolent[0] ? { period: sortedByViolent[0].period, value: sortedByViolent[0].violentos } : null;
        lowestMonth = sortedByViolent.at(-1) ? { period: sortedByViolent.at(-1)!.period, value: sortedByViolent.at(-1)!.violentos } : null;

        // Mathematical average calculation
        if (historicalSeries.length > 0) {
          const totalVal = historicalSeries.reduce((acc, h) => acc + h.violentos, 0);
          monthlyAverage = Number((totalVal / historicalSeries.length).toFixed(1));

          if (historicalSeries.length >= 2) {
            overallDelta = Number((historicalSeries.at(-1)!.violentos - historicalSeries[0].violentos).toFixed(1));
          }
        }

        // Latest month values for KPIs
        const latestVals = Array.from(monthlyMap.values()).at(-1) ?? {};

        // Category bar composition. `furto_consumado`/`veiculos_roubo_furto` foram removidos: não
        // existem no catálogo real de 14 chaves da SEJUSP-MG (crimes-violentos) — ver
        // lib/territorios/seguranca-nature-map.ts. Substituídas por extorsão e sequestro/cárcere
        // privado, que são chaves reais ainda não exibidas no caderno.
        categoryBarData = [
          { category: 'Extorsão', count: latestVals['extorsao_consumado'] ?? 0 },
          { category: 'Roubos', count: latestVals['roubo_consumado'] ?? 0 },
          { category: 'Sequestro/Cárcere', count: latestVals['sequestro_carcere_privado_consumado'] ?? 0 },
          { category: 'Homicídios', count: latestVals['homicidio_consumado'] ?? 0 },
        ].filter((c) => c.count > 0);

        realData = {
          mode: 'real',
          violentCrimes: { value: latestVals['indice_crimes_violentos'] ?? latestVals['crimes_violentos_total'] ?? 0, label: 'índice agregado — 100k hab' },
          propertyCrimes: { value: latestVals['roubo_consumado'] ?? 0, label: 'roubos registrados' },
          homicides: { value: latestVals['homicidio_consumado'] ?? 0, label: 'homicídios consumados' },
          robberies: { value: latestVals['roubo_consumado'] ?? 0, label: 'roubos' },
          extortion: { value: latestVals['extorsao_consumado'] ?? 0, label: 'extorsões consumadas' },
          kidnapping: { value: latestVals['sequestro_carcere_privado_consumado'] ?? 0, label: 'sequestro/cárcere privado consumado' },
          historicalSeries,
        };
      }
    } catch {
      // SEJUSP query fallback
    }
  }

  // Explicit DEMONSTRATIVO fallback ONLY for Contagem (3118601) if query empty
  if (!realData && ibge === '3118601') {
    realData = CONTAGEM_DEMO.security;
    peakMonth = { period: '2024/03', value: 220.5 };
    lowestMonth = { period: '2024/11', value: 199.4 };
    monthlyAverage = 208.5;
    overallDelta = -21.1;
    categoryBarData = [
      { category: 'Extorsão', count: 145 },
      { category: 'Roubos', count: 680 },
      { category: 'Sequestro/Cárcere', count: 32 },
      { category: 'Homicídios', count: 42 },
    ];
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const statusKey = realData ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  return (
    <DossierNotebookContainer
      title={`Segurança Pública — ${cityName}`}
      description="Indicadores de ocorrências criminais, séries temporais de 11 meses e estatísticas oficiais da SEJUSP-MG."
      engineName="Motor SEJUSP-MG Real"
      status={statusKey}
      sourceName={isDemo ? 'SEJUSP MG (Demonstrativo — Fixture Contagem)' : 'SEJUSP MG (Secretaria de Estado de Justiça e Segurança Pública)'}
    >
      {!isMgTerritory && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>Limitação de Cobertura Regional: O Motor SEJUSP-MG é restrito ao estado de Minas Gerais. O município selecionado pertence à UF {territory?.uf}.</span>
        </div>
      )}

      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Dados de segurança demonstrativos pré-carregados (Fixture Contagem).</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>
      )}

      {realData ? (
        <div className="space-y-8">
          {/* Main 6 KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Crimes Violentos" indicator={realData.violentCrimes} icon={ShieldAlert} />
            <ContextualKPI label="Crimes Patrimoniais" indicator={realData.propertyCrimes} />
            <ContextualKPI label="Homicídios" indicator={realData.homicides} />
            <ContextualKPI label="Roubos" indicator={realData.robberies} />
            <ContextualKPI label="Extorsão" indicator={realData.extortion} />
            <ContextualKPI label="Sequestro/Cárcere Privado" indicator={realData.kidnapping} />
          </div>

          {/* Mathematical Derived Highlights (Peak, Lowest, Monthly Average, Overall Delta) */}
          {(peakMonth || lowestMonth || monthlyAverage !== null || overallDelta !== null) && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 bg-[#0B0F19] border border-white/5 p-4 rounded-xl font-mono text-xs">
              {peakMonth && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <AlertTriangle size={12} className="text-rose-400" /> Pico de Ocorrências
                  </span>
                  <div className="text-sm font-bold text-white">
                    {peakMonth.period} · <span className="text-rose-400">{peakMonth.value}</span>
                  </div>
                </div>
              )}

              {lowestMonth && (
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Award size={12} className="text-emerald-400" /> Menor Registrado
                  </span>
                  <div className="text-sm font-bold text-white">
                    {lowestMonth.period} · <span className="text-emerald-400">{lowestMonth.value}</span>
                  </div>
                </div>
              )}

              {monthlyAverage !== null && (
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Activity size={12} className="text-cyan-400" /> Média Mensal
                  </span>
                  <div className="text-sm font-bold text-white">
                    {monthlyAverage} <span className="text-[10px] text-slate-400 font-normal">por mês</span>
                  </div>
                </div>
              )}

              {overallDelta !== null && (
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" /> Variação no Período
                  </span>
                  <div className={`text-sm font-bold flex items-center gap-1 ${overallDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {overallDelta <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{overallDelta > 0 ? `+${overallDelta}` : overallDelta}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main evolution chart + Category composition */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                  Evolução Histórica Mensal de Ocorrências (11 Meses)
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  SEJUSP-MG
                </span>
              </div>
              {realData.historicalSeries && realData.historicalSeries.length > 0 ? (
                <LineChart
                  data={realData.historicalSeries}
                  xAxisKey="period"
                  lineKeys={[
                    { key: 'violentos', name: 'Violentos', color: '#f43f5e' },
                    { key: 'patrimoniais', name: 'Patrimoniais', color: '#eab308' },
                    { key: 'homicidios', name: 'Homicídios', color: '#9f1239' },
                    { key: 'sequestros', name: 'Sequestro/Cárcere', color: '#3b82f6' },
                  ]}
                  height={300}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs font-mono">Dados históricos não disponíveis</div>
              )}
            </div>

            {/* Category Composition Bar Chart */}
            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-cyan-400" />
                  <span>Composição de Ocorrências</span>
                </h3>
              </div>
              {categoryBarData.length > 0 ? (
                <BarChart
                  data={categoryBarData}
                  xAxisKey="category"
                  barKey="count"
                  name="Registros"
                  color="#f43f5e"
                  height={300}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados de categorias</div>
              )}
            </div>
          </div>

          {realData.insight && <PolitixInsight insight={realData.insight} />}
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor SEJUSP-MG Real"
          title="Dados de Segurança Pública Ainda Não Consolidados"
          description={`As ocorrências policiais oficiais da SEJUSP-MG para ${cityName} (IBGE: ${ibge}) ainda não foram carregadas na base territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
