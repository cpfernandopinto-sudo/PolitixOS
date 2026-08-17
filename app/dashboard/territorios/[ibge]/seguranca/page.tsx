import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { ShieldAlert, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, HorizontalBarChart } from '@/components/dashboard/territorios/PolitixCharts';
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
          veiculos: vals['veiculos_roubo_furto'] ?? 0,
        }));

        // Latest month values for KPIs
        const latestVals = Array.from(monthlyMap.values()).at(-1) ?? {};

        realData = {
          mode: 'real',
          violentCrimes: { value: latestVals['indice_crimes_violentos'] ?? latestVals['crimes_violentos_total'] ?? 0, label: 'índice agregado — 100k hab' },
          propertyCrimes: { value: latestVals['roubo_consumado'] ?? 0, label: 'roubos registrados' },
          homicides: { value: latestVals['homicidio_consumado'] ?? 0, label: 'homicídios consumados' },
          robberies: { value: latestVals['roubo_consumado'] ?? 0, label: 'roubos' },
          thefts: { value: latestVals['furto_consumado'] ?? 0, label: 'furtos' },
          vehicles: { value: latestVals['veiculos_roubo_furto'] ?? 0, label: 'roubos/furtos de veículos' },
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
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const statusKey = realData ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  return (
    <DossierNotebookContainer
      title={`Segurança Pública — ${cityName}`}
      description="Indicadores de ocorrências criminais, séries temporais e estatísticas oficiais da SEJUSP-MG."
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
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
        </div>
      )}

      {realData ? (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI label="Crimes Violentos" indicator={realData.violentCrimes} icon={ShieldAlert} />
            <ContextualKPI label="Crimes Patrimoniais" indicator={realData.propertyCrimes} />
            <ContextualKPI label="Homicídios" indicator={realData.homicides} />
            <ContextualKPI label="Roubos" indicator={realData.robberies} />
            <ContextualKPI label="Furtos" indicator={realData.thefts} />
            <ContextualKPI label="Furtos de Veículos" indicator={realData.vehicles} />
          </div>

          {/* Main evolution chart + High/Low crimes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                  Evolução Histórica Mensal de Ocorrências
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Série Temporal SEJUSP-MG</span>
              </div>
              {realData.historicalSeries && realData.historicalSeries.length > 0 ? (
                <LineChart
                  data={realData.historicalSeries}
                  xAxisKey="period"
                  lineKeys={[
                    { key: 'violentos', name: 'Violentos', color: '#f43f5e' },
                    { key: 'patrimoniais', name: 'Patrimoniais', color: '#eab308' },
                    { key: 'homicidios', name: 'Homicídios', color: '#9f1239' },
                    { key: 'veiculos', name: 'Roubo/Furto Veíc.', color: '#3b82f6' },
                  ]}
                  height={300}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs font-mono">Dados históricos não disponíveis</div>
              )}
            </div>

            {/* Crimes em Alta / Baixa se disponíveis */}
            <div className="space-y-4">
              <div className="surface-primary rounded-xl p-5 border border-white/5">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
                  <TrendingUp size={14} /> Ocorrências de Atenção
                </h4>
                <div className="space-y-3 font-mono text-xs text-slate-300">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span>Homicídios Consumados</span>
                    <span className="font-bold text-white">{realData.homicides?.value ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span>Roubos Consumados</span>
                    <span className="font-bold text-white">{realData.robberies?.value ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Furtos de Veículos</span>
                    <span className="font-bold text-white">{realData.vehicles?.value ?? 0}</span>
                  </div>
                </div>
              </div>
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
