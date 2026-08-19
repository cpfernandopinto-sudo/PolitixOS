import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI, PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { HeartPulse, Stethoscope, Building2, Bed, Activity, ShieldCheck, Hospital } from 'lucide-react';
import { LineChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import { getCnesTypeIndicatorLabel } from '@/lib/territorios/saude-indicator-labels';

interface IndicatorRow {
  indicador: string;
  valor: number | string | null;
  periodo_inicio: string | null;
}

export default async function SaudePage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  let realData: any = null;
  let isDemo = false;
  let unitTypesBarData: Array<{ type: string; count: number }> = [];

  if (territory) {
    try {
      const client = createAdminClient();
      const { data: rows } = await client
        .from('territory_indicators')
        .select('indicador, valor, periodo_inicio')
        .eq('territory_id', territory.id)
        .in('categoria', ['saude', 'saude_publica'])
        .order('valor', { ascending: false });

      if (rows && rows.length > 0) {
        let totalEst = 0;
        let susEst = 0;
        let ambEst = 0;
        let hospEst = 0;
        let surgEst = 0;
        let obsEst = 0;
        let ubsEst = 0;
        let urgenciaEst = 0;

        const typeItems: Array<{ type: string; count: number }> = [];

        rows.forEach((r: IndicatorRow) => {
          const ind = r.indicador.toLowerCase();
          const val = Number(r.valor ?? 0);

          if (ind === 'estabelecimentos_total') totalEst = val;
          else if (ind === 'estabelecimentos_atendimento_ambulatorial_sus') susEst = val;
          else if (ind === 'estabelecimentos_atendimento_ambulatorial') ambEst = val;
          else if (ind === 'estabelecimentos_atendimento_hospitalar') hospEst = val;
          else if (ind === 'estabelecimentos_centro_cirurgico') surgEst = val;
          else if (ind === 'estabelecimentos_centro_obstetrico') obsEst = val;
          else if (ind === 'estabelecimentos_unidades_basicas') ubsEst = val;
          else if (ind === 'estabelecimentos_urgencia_emergencia') urgenciaEst = val;

          // Check if unit type code indicator
          const typeLabelObj = getCnesTypeIndicatorLabel(ind);
          if (typeLabelObj && val > 0) {
            typeItems.push({ type: typeLabelObj.label, count: val });
          }
        });

        unitTypesBarData = typeItems.slice(0, 8); // Top 8 unit types

        if (totalEst > 0 || typeItems.length > 0) {
          realData = {
            mode: 'real',
            totalEstablishments: { value: totalEst || typeItems.reduce((acc, t) => acc + t.count, 0), label: 'estabelecimentos de saúde ativos no CNES' },
            susCoverage: { value: susEst, label: 'unidades com atendimento SUS' },
            ambulatory: { value: ambEst, label: 'atendimento ambulatorial' },
            hospital: { value: hospEst, label: 'atendimento hospitalar' },
            surgical: { value: surgEst, label: 'centro cirúrgico' },
            obstetric: { value: obsEst, label: 'centro obstétrico' },
            ubs: { value: ubsEst, label: 'unidades básicas de saúde' },
            urgencyEmergency: { value: urgenciaEst, label: 'urgência/emergência' },
          };
        }
      }
    } catch {
      // Query fallback
    }
  }

  // Explicit DEMONSTRATIVO fallback ONLY for Contagem (3118601) if query empty
  if (!realData && ibge === '3118601') {
    const demoHealth = CONTAGEM_DEMO.health;
    realData = {
      mode: 'demo',
      basicCoverage: demoHealth.basicCoverage,
      beds: demoHealth.beds,
      utiBeds: demoHealth.utiBeds,
      doctors: demoHealth.doctors,
      internations: demoHealth.internations,
      mortality: demoHealth.mortality,
      historicalBasicCoverage: demoHealth.historicalBasicCoverage,
      historicalDoctors: demoHealth.historicalDoctors,
      historicalBeds: demoHealth.historicalBeds,
      insight: demoHealth.insight,
    };
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const statusKey = realData ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  return (
    <DossierNotebookContainer
      title={`Saúde Pública: Capacidade e Infraestrutura CNES — ${cityName}`}
      description="Infraestrutura de estabelecimentos de saúde, leitos e cobertura do Cadastro Nacional de Estabelecimentos de Saúde (CNES)."
      engineName="Motor Saúde / CNES Real"
      status={statusKey}
      sourceName={isDemo ? 'CNES / DATASUS (Demonstrativo — Fixture Contagem)' : 'CNES / DATASUS (Ministério da Saúde — Dados Oficiais)'}
    >
      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Dados de saúde demonstrativos pré-carregados (Fixture Contagem).</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>
      )}

      {realData ? (
        <div className="space-y-8">
          {realData.mode === 'real' ? (
            <>
              {/* Real CNES KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
                <ContextualKPI label="Total Estabelecimentos" indicator={realData.totalEstablishments} icon={Hospital} />
                <ContextualKPI label="Unidades Básicas (UBS)" indicator={realData.ubs} icon={Building2} />
                <ContextualKPI label="Atendimento SUS" indicator={realData.susCoverage} icon={ShieldCheck} />
                <ContextualKPI label="Ambulatorial" indicator={realData.ambulatory} icon={Stethoscope} />
                <ContextualKPI label="Hospitalar" indicator={realData.hospital} icon={Bed} />
                <ContextualKPI label="Urgência/Emergência" indicator={realData.urgencyEmergency} icon={Activity} />
                <ContextualKPI label="Centro Cirúrgico" indicator={realData.surgical} icon={Activity} />
                <ContextualKPI label="Centro Obstétrico" indicator={realData.obstetric} icon={HeartPulse} />
              </div>

              {/* Unit Types Breakdown Bar Chart */}
              {unitTypesBarData.length > 0 && (
                <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 font-mono">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                        Distribuição por Tipos de Unidade CNES
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Classificação oficial dos estabelecimentos de saúde ativos no município.
                      </p>
                    </div>
                    <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Catálogo Oficial CNES
                    </span>
                  </div>

                  <BarChart
                    data={unitTypesBarData}
                    xAxisKey="type"
                    barKey="count"
                    name="Estabelecimentos"
                    color="#06b6d4"
                    height={280}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Demo KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
                <ContextualKPI label="Cobertura ESF" indicator={realData.basicCoverage} icon={HeartPulse} />
                <ContextualKPI label="Leitos/1k hab" indicator={realData.beds} icon={Bed} />
                <ContextualKPI label="UTI/1k hab" indicator={realData.utiBeds} />
                <ContextualKPI label="Médicos/10k hab" indicator={realData.doctors} icon={Stethoscope} />
                <ContextualKPI label="Internações" indicator={realData.internations} icon={Activity} />
                <ContextualKPI label="Mortalidade" indicator={realData.mortality} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Evolução Cobertura ESF</h3>
                  {realData.historicalBasicCoverage && realData.historicalBasicCoverage.length > 0 ? (
                    <LineChart
                      data={realData.historicalBasicCoverage}
                      xAxisKey="period"
                      lineKeys={[{ key: 'value', name: 'Cobertura %', color: '#10b981' }]}
                      height={200}
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados históricos</div>
                  )}
                </div>

                <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Médicos por 10k Hab</h3>
                  {realData.historicalDoctors && realData.historicalDoctors.length > 0 ? (
                    <LineChart
                      data={realData.historicalDoctors}
                      xAxisKey="period"
                      lineKeys={[{ key: 'value', name: 'Médicos', color: '#3b82f6' }]}
                      height={200}
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados históricos</div>
                  )}
                </div>

                <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Leitos por 1k Hab</h3>
                  {realData.historicalBeds && realData.historicalBeds.length > 0 ? (
                    <LineChart
                      data={realData.historicalBeds}
                      xAxisKey="period"
                      lineKeys={[{ key: 'value', name: 'Leitos', color: '#f43f5e' }]}
                      height={200}
                    />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs font-mono">Sem dados históricos</div>
                  )}
                </div>
              </div>

              {realData.insight && <PolitixInsight insight={realData.insight} />}
            </>
          )}
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Saúde / CNES Real"
          title="Dados de Saúde Pública Ainda Não Consolidados"
          description={`As informações de infraestrutura de saúde e estabelecimentos CNES para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
