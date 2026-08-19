import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import CagedEmploymentSection from '@/components/dashboard/territorios/analytical/CagedEmploymentSection';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import InterpretationCard from '@/components/dashboard/territorios/intelligence/InterpretationCard';
import { Briefcase, Scale, TrendingUp, PieChart, Calendar, Award, AlertCircle } from 'lucide-react';
import { LineChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { createAdminClient } from '@/lib/supabaseClient';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { getCagedMunicipalSeries } from '@/lib/territorios/caged/series-query';
import type { CagedOfficialSector } from '@/lib/territorios/caged/types';
import type { CagedEmploymentViewModel } from '@/lib/territorios/intelligence/frontend-adapters';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

const SECTORS_LIST: Array<{ key: CagedOfficialSector; label: string }> = [
  { key: 'agropecuaria', label: 'Agropecuária' },
  { key: 'industria_geral', label: 'Indústria' },
  { key: 'construcao', label: 'Construção' },
  { key: 'comercio', label: 'Comércio' },
  { key: 'servicos', label: 'Serviços' },
];

export default async function EconomiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  let cagedViewModel: CagedEmploymentViewModel | null = null;
  let cagedHistoricalChartData: Array<{ period: string; balance: number; admissions: number; dismissals: number }> = [];
  let cagedRolling12ChartData: Array<{ period: string; rollingBalance: number }> = [];
  let cagedSectorBarData: Array<{ sector: string; balance: number; admissions: number; dismissals: number }> = [];
  let momVariation: number | null = null;
  let yoyVariation: number | null = null;
  let r12Balance: number | null = null;
  let bestMonth: { period: string; balance: number } | null = null;
  let worstMonth: { period: string; balance: number } | null = null;
  let streakInfo: { count: number; isPositive: boolean } | null = null;
  let isDemo = false;

  if (territory) {
    try {
      const client = createAdminClient();
      // Query 30 months of real CAGED total series (janela homologada: 2024-01 a 2026-06)
      const totalSeries = await getCagedMunicipalSeries(client, {
        territoryId: territory.id,
        from: '202401',
        to: '202606',
      });

      if (totalSeries.points.length > 0) {
        cagedHistoricalChartData = totalSeries.points.map((pt) => ({
          period: `${pt.referenceMonth.slice(0, 4)}/${pt.referenceMonth.slice(4)}`,
          balance: pt.balance,
          admissions: pt.admissions,
          dismissals: pt.dismissals,
        }));

        // Calculate Rolling 12m for each month with at least 12 previous months
        cagedRolling12ChartData = [];
        for (let i = 11; i < totalSeries.points.length; i++) {
          const window = totalSeries.points.slice(i - 11, i + 1);
          const sum = window.reduce((acc, p) => acc + p.balance, 0);
          const pt = totalSeries.points[i];
          cagedRolling12ChartData.push({
            period: `${pt.referenceMonth.slice(0, 4)}/${pt.referenceMonth.slice(4)}`,
            rollingBalance: sum,
          });
        }

        // Mathematical derived best/worst month
        const sortedByBal = [...cagedHistoricalChartData].sort((a, b) => b.balance - a.balance);
        bestMonth = sortedByBal[0] ? { period: sortedByBal[0].period, balance: sortedByBal[0].balance } : null;
        worstMonth = sortedByBal.at(-1) ? { period: sortedByBal.at(-1)!.period, balance: sortedByBal.at(-1)!.balance } : null;

        // Mathematical streak calculation
        let currentStreak = 0;
        let streakPositive = true;
        if (cagedHistoricalChartData.length > 0) {
          streakPositive = cagedHistoricalChartData.at(-1)!.balance >= 0;
          for (let i = cagedHistoricalChartData.length - 1; i >= 0; i--) {
            const isPos = cagedHistoricalChartData[i].balance >= 0;
            if (isPos === streakPositive) {
              currentStreak++;
            } else {
              break;
            }
          }
          streakInfo = { count: currentStreak, isPositive: streakPositive };
        }

        // Calculate R12 (Rolling 12 months balance)
        const last12Points = totalSeries.points.slice(-12);
        r12Balance = last12Points.reduce((acc, pt) => acc + pt.balance, 0);
        const totalAdmissionsR12 = last12Points.reduce((acc, pt) => acc + pt.admissions, 0);
        const totalDismissalsR12 = last12Points.reduce((acc, pt) => acc + pt.dismissals, 0);

        // MoM calculation (last point vs previous point)
        if (totalSeries.points.length >= 2) {
          const last = totalSeries.points.at(-1)!;
          const prev = totalSeries.points.at(-2)!;
          momVariation = last.balance - prev.balance;
        }

        // YoY calculation (last point vs 12 months ago)
        if (totalSeries.points.length >= 13) {
          const last = totalSeries.points.at(-1)!;
          const yearAgo = totalSeries.points.at(-13)!;
          yoyVariation = last.balance - yearAgo.balance;
        }

        // Fetch sector series
        const sectorItems = await Promise.all(
          SECTORS_LIST.map(async (sec) => {
            try {
              const secSeries = await getCagedMunicipalSeries(client, {
                territoryId: territory.id,
                from: '202401',
                to: '202606',
                sector: sec.key,
              });
              const secLast12 = secSeries.points.slice(-12);
              const secAdm = secLast12.reduce((a, p) => a + p.admissions, 0);
              const secDis = secLast12.reduce((a, p) => a + p.dismissals, 0);
              const secBal = secLast12.reduce((a, p) => a + p.balance, 0);
              return { sector: sec.label, admissions: secAdm, dismissals: secDis, balance: secBal };
            } catch {
              return { sector: sec.label, admissions: 0, dismissals: 0, balance: 0 };
            }
          })
        );

        cagedSectorBarData = sectorItems.map((s) => ({
          sector: s.sector,
          balance: s.balance,
          admissions: s.admissions,
          dismissals: s.dismissals,
        }));

        cagedViewModel = {
          period: `${totalSeries.coverage.firstAvailablePeriod ?? '202401'} — ${totalSeries.coverage.lastAvailablePeriod ?? '202606'} (30m)`,
          totalAdmissions: totalAdmissionsR12,
          totalDismissals: totalDismissalsR12,
          totalBalance: r12Balance,
          sectors: sectorItems,
          pendingMetrics: [
            { name: 'Estoque Formal de Empregos', status: 'METHODOLOGY_PENDING' },
            { name: 'Variação Relativa de Estoque', status: 'METHODOLOGY_PENDING' },
            { name: 'Salário Médio de Admissão', status: 'METHODOLOGY_PENDING' },
          ],
        };
      }
    } catch {
      // CAGED query error
    }
  }

  // Explicit DEMONSTRATIVO fallback ONLY for Contagem (3118601) if query empty
  if (!cagedViewModel && ibge === '3118601') {
    const data = CONTAGEM_DEMO.economy as any;
    cagedViewModel = {
      period: '2024 (Acumulado 12m)',
      totalAdmissions: Number(data?.cagedAdmissions ?? 14250),
      totalDismissals: Number(data?.cagedDismissals ?? 11830),
      totalBalance: Number(data?.cagedBalance ?? 2420),
      sectors: [
        { sector: 'Agropecuária', admissions: 420, dismissals: 310, balance: 110 },
        { sector: 'Indústria', admissions: 4850, dismissals: 3920, balance: 930 },
        { sector: 'Construção', admissions: 2100, dismissals: 1850, balance: 250 },
        { sector: 'Comércio', admissions: 3400, dismissals: 2950, balance: 450 },
        { sector: 'Serviços', admissions: 3480, dismissals: 2800, balance: 680 },
      ],
      pendingMetrics: [
        { name: 'Estoque Formal de Empregos', status: 'METHODOLOGY_PENDING' },
        { name: 'Variação Relativa de Estoque', status: 'METHODOLOGY_PENDING' },
        { name: 'Salário Médio de Admissão', status: 'METHODOLOGY_PENDING' },
      ],
    };
    cagedSectorBarData = cagedViewModel.sectors;
    bestMonth = { period: '2024/05', balance: 930 };
    worstMonth = { period: '2024/12', balance: -410 };
    streakInfo = { count: 4, isPositive: true };
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const statusKey = cagedViewModel ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  return (
    <DossierNotebookContainer
      title={`Atividade Econômica e Emprego Formal — ${cityName}`}
      description="Série temporal de 30 meses do Novo CAGED, dinâmica setorial, saldo acumulado R12 e gráficos comparativos."
      engineName="Motor Economia / CAGED Real"
      status={statusKey}
      sourceName={isDemo ? 'MTE / CAGED (Demonstrativo — Fixture Contagem)' : 'MTE / Novo CAGED (Dados Oficiais Real)'}
    >
      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Dados de economia demonstrativos pré-carregados (Fixture Contagem).</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>
      )}

      {cagedViewModel ? (
        <div className="space-y-8">
          {/* Top Executive KPIs for Real CAGED */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111726] border border-cyan-500/20 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="uppercase font-bold tracking-wider">Saldo R12 (12m)</span>
                <Briefcase size={16} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {cagedViewModel.totalBalance >= 0 ? `+${cagedViewModel.totalBalance.toLocaleString('pt-BR')}` : cagedViewModel.totalBalance.toLocaleString('pt-BR')}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">Acumulado do Emprego Formal</span>
            </div>

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="uppercase font-bold tracking-wider">Variação MoM (Mês/Mês)</span>
                <Scale size={16} className="text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">
                {momVariation !== null ? (momVariation >= 0 ? `+${momVariation.toLocaleString('pt-BR')}` : momVariation.toLocaleString('pt-BR')) : '—'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">Variação em relação ao mês anterior</span>
            </div>

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="uppercase font-bold tracking-wider">Variação YoY (12 Meses)</span>
                <TrendingUp size={16} className="text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">
                {yoyVariation !== null ? (yoyVariation >= 0 ? `+${yoyVariation.toLocaleString('pt-BR')}` : yoyVariation.toLocaleString('pt-BR')) : '—'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">Comparativo com o mesmo mês do ano anterior</span>
            </div>

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="uppercase font-bold tracking-wider">Admissões x Desligamentos</span>
                <PieChart size={16} className="text-slate-400" />
              </div>
              <div className="text-sm font-bold text-white font-mono flex items-center justify-between pt-1">
                <span className="text-emerald-400">{cagedViewModel.totalAdmissions.toLocaleString('pt-BR')} adm.</span>
                <span className="text-amber-400">{cagedViewModel.totalDismissals.toLocaleString('pt-BR')} des.</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">Fluxo total do período de análise</span>
            </div>
          </div>

          {/* Compact Secondary Mathematical Derived Insights Strip */}
          {(bestMonth || worstMonth || streakInfo) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-[#0B0F19] border border-white/5 p-4 rounded-xl font-mono text-xs">
              {bestMonth && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Award size={12} className="text-emerald-400" /> Pico Mensal de Saldo
                  </span>
                  <div className="text-sm font-bold text-white">
                    {bestMonth.period} · <span className="text-emerald-400">+{bestMonth.balance.toLocaleString('pt-BR')} vagas</span>
                  </div>
                </div>
              )}

              {worstMonth && (
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <AlertCircle size={12} className="text-rose-400" /> Menor Saldo Mensal
                  </span>
                  <div className="text-sm font-bold text-white">
                    {worstMonth.period} · <span className="text-rose-400">{worstMonth.balance.toLocaleString('pt-BR')} vagas</span>
                  </div>
                </div>
              )}

              {streakInfo && (
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Calendar size={12} className="text-cyan-400" /> Sequência Atual
                  </span>
                  <div className="text-sm font-bold text-white">
                    {streakInfo.count} {streakInfo.count === 1 ? 'mês' : 'meses'} consecutivas de saldo {streakInfo.isPositive ? 'positivo' : 'negativo'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Dinâmica do Emprego Formal Novo CAGED */}
          <CagedEmploymentSection cagedData={cagedViewModel} />

          {/* Grid of Real Analytical Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: 30-Month Real CAGED Historical Balance Line Chart */}
            {cagedHistoricalChartData.length > 0 && (
              <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                      Série Histórica do Saldo de Empregos (30 Meses)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Evolução do saldo líquido de contratações formais mês a mês.
                    </p>
                  </div>
                </div>

                <LineChart
                  data={cagedHistoricalChartData}
                  xAxisKey="period"
                  lineKeys={[
                    { key: 'balance', name: 'Saldo Líquido', color: '#10b981' },
                    { key: 'admissions', name: 'Admissões', color: '#0ea5e9' },
                    { key: 'dismissals', name: 'Desligamentos', color: '#f59e0b' },
                  ]}
                  height={280}
                />
              </div>
            )}

            {/* Chart 2: Sector Balance Bar Chart */}
            {cagedSectorBarData.length > 0 && (
              <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                      Saldo de Empregos por Setor Econômico
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Comparação do saldo líquido acumulado entre os 5 setores oficiais.
                    </p>
                  </div>
                </div>

                <BarChart
                  data={cagedSectorBarData}
                  xAxisKey="sector"
                  barKey="balance"
                  name="Saldo do Setor"
                  color="#06b6d4"
                  height={280}
                />
              </div>
            )}

            {/* Chart 3: Rolling 12-Month Acumulado Trend */}
            {cagedRolling12ChartData.length > 0 && (
              <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4 lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                      Tendência Acumulada em 12 Meses (Rolling 12M)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Soma móvel do saldo de empregos nos 12 meses anteriores a cada ponto da série.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Soma Móvel R12
                  </span>
                </div>

                <LineChart
                  data={cagedRolling12ChartData}
                  xAxisKey="period"
                  lineKeys={[
                    { key: 'rollingBalance', name: 'Saldo Acumulado 12M', color: '#8b5cf6' },
                  ]}
                  height={260}
                />
              </div>
            )}
          </div>

          {/* Interpretation Layer */}
          <InterpretationCard />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Economia / CAGED Real"
          title="Dados do CAGED Real Ainda Não Disponíveis"
          description={`Os dados oficiais do Novo CAGED para ${cityName} (IBGE: ${ibge}) ainda não estão persistidos. Pilotos com séries de 30 meses atualmente disponíveis: Belo Horizonte (3106200), Betim (3106705) e Contagem (3118601).`}
        />
      )}
    </DossierNotebookContainer>
  );
}
