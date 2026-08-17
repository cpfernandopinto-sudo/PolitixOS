import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import CagedEmploymentSection from '@/components/dashboard/territorios/analytical/CagedEmploymentSection';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import InterpretationCard from '@/components/dashboard/territorios/intelligence/InterpretationCard';
import { Briefcase, Scale, TrendingUp, PieChart } from 'lucide-react';
import { LineChart } from '@/components/dashboard/territorios/PolitixCharts';
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
  let momVariation: number | null = null;
  let yoyVariation: number | null = null;
  let r12Balance: number | null = null;
  let isDemo = false;

  if (territory) {
    try {
      const client = createAdminClient();
      // Query 30 months of real CAGED total series (janela homologada ECO-03B3B: 2024-01 a 2026-06)
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
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const statusKey = cagedViewModel ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  return (
    <DossierNotebookContainer
      title={`Atividade Econômica e Emprego Formal — ${cityName}`}
      description="Série temporal de 30 meses do Novo CAGED, dinâmica setorial, PIB municipal nominal e valor adicionado."
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

          {/* Section: Dinâmica do Emprego Formal Novo CAGED */}
          <CagedEmploymentSection cagedData={cagedViewModel} />

          {/* 30-Month Real CAGED Historical Balance Line Chart */}
          {cagedHistoricalChartData.length > 0 && (
            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                    Série Histórica do Saldo de Empregos (30 Meses de Dados Oficiais)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Evolução do saldo líquido de contratações formais apurado mês a mês pelo Novo CAGED.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 self-start sm:self-auto">
                  30 Pontos de Dados Oficiais
                </span>
              </div>

              <LineChart
                data={cagedHistoricalChartData}
                xAxisKey="period"
                lineKeys={[
                  { key: 'balance', name: 'Saldo Líquido', color: '#10b981' },
                  { key: 'admissions', name: 'Admissões', color: '#0ea5e9' },
                  { key: 'dismissals', name: 'Desligamentos', color: '#f59e0b' },
                ]}
                height={320}
              />
            </div>
          )}

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
