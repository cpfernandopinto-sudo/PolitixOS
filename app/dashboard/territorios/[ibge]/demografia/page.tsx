import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { Users, MapPin, Info, TrendingUp, TrendingDown, UserRound, Baby } from 'lucide-react';
import { LineChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

interface DemografiaRow {
  indicador: string;
  valor: number | string | null;
  periodo_inicio: string | null;
  source_dataset: string | null;
}

export default async function DemografiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  let populationHistory: Array<{ period: string; value: number }> = [];
  const censusMap: Record<string, number> = {};
  let isDemo = false;

  if (territory) {
    try {
      const client = createAdminClient();
      const { data: rows } = await client
        .from('territory_indicators')
        .select('indicador, valor, periodo_inicio, source_dataset')
        .eq('territory_id', territory.id)
        .eq('categoria', 'demografia')
        .order('periodo_inicio', { ascending: true });

      (rows as DemografiaRow[] | null)?.forEach((r) => {
        const valor = Number(r.valor ?? 0);
        if (r.indicador === 'populacao_total' && r.periodo_inicio) {
          populationHistory.push({ period: r.periodo_inicio.slice(0, 4), value: valor });
        } else if (r.source_dataset === 'SIDRA_9514') {
          censusMap[r.indicador] = valor;
        }
      });
    } catch {
      // Query error
    }
  }

  // Explicit DEMONSTRATIVO fallback ONLY for Contagem (3118601) quando não há série real nenhuma.
  if (populationHistory.length === 0 && ibge === '3118601') {
    const demoData = CONTAGEM_DEMO.demography;
    populationHistory = [{ period: '2022', value: Number(String(demoData.population.value).replace(/\./g, '')) }];
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const hasData = populationHistory.length > 0;
  const statusKey = hasData ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  const latest = populationHistory.at(-1) ?? null;
  const first = populationHistory[0] ?? null;
  const growthAbs = latest && first && latest !== first ? latest.value - first.value : null;
  const growthPct = growthAbs !== null && first!.value !== 0 ? Number(((growthAbs / first!.value) * 100).toFixed(1)) : null;

  const sexComposition = censusMap['populacao_masculina'] !== undefined && censusMap['populacao_feminina'] !== undefined
    ? [
        { sexo: 'Masculino', value: censusMap['populacao_masculina'] },
        { sexo: 'Feminino', value: censusMap['populacao_feminina'] },
      ]
    : [];

  const ageStructure = ['percentual_criancas', 'percentual_jovens', 'percentual_adultos', 'percentual_idosos'].every((k) => censusMap[k] !== undefined)
    ? [
        { faixa: 'Crianças (0-14)', value: censusMap['percentual_criancas'] },
        { faixa: 'Jovens (15-29)', value: censusMap['percentual_jovens'] },
        { faixa: 'Adultos (30-59)', value: censusMap['percentual_adultos'] },
        { faixa: 'Idosos (60+)', value: censusMap['percentual_idosos'] },
      ]
    : [];

  return (
    <DossierNotebookContainer
      title={`Demografia e Perfil Populacional — ${cityName}`}
      description="Evolução populacional anual, composição por sexo e estrutura etária censitária do IBGE."
      engineName="Motor IBGE Real"
      status={statusKey}
      sourceName={isDemo ? 'IBGE (Demonstrativo — Fixture Contagem)' : 'IBGE (SIDRA 6579 — estimativa anual / SIDRA 9514 — Censo 2022)'}
    >
      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Dados demográficos demonstrativos pré-carregados (Fixture Contagem).</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>
      )}

      {hasData ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            <ContextualKPI
              label="População Atual"
              icon={Users}
              indicator={{
                value: latest!.value.toLocaleString('pt-BR'),
                label: `habitantes — estimativa IBGE ${latest!.period}`,
                evidence: { source: 'IBGE', dataset: 'SIDRA Tabela 6579', period: latest!.period, lastUpdated: latest!.period, confidence: 'ALTA' },
              }}
            />

            {growthPct !== null && (
              <ContextualKPI
                label="Variação Populacional"
                icon={growthPct >= 0 ? TrendingUp : TrendingDown}
                indicator={{
                  value: `${growthPct > 0 ? '+' : ''}${growthPct}%`,
                  label: `desde ${first!.period}`,
                  trend: growthPct > 0 ? 'up' : growthPct < 0 ? 'down' : 'stable',
                  variation: `${growthAbs! > 0 ? '+' : ''}${growthAbs!.toLocaleString('pt-BR')} hab.`,
                  evidence: { source: 'IBGE', dataset: 'SIDRA Tabela 6579', period: `${first!.period}–${latest!.period}`, lastUpdated: latest!.period, confidence: 'ALTA' },
                }}
              />
            )}

            {censusMap['percentual_feminino'] !== undefined && (
              <ContextualKPI
                label="% Feminino"
                icon={UserRound}
                indicator={{ value: `${censusMap['percentual_feminino']}%`, label: 'do total censitário', evidence: { source: 'IBGE', dataset: 'SIDRA 9514 — Censo 2022', period: '2022', lastUpdated: '2022', confidence: 'ALTA' } }}
              />
            )}

            {censusMap['percentual_masculino'] !== undefined && (
              <ContextualKPI
                label="% Masculino"
                icon={UserRound}
                indicator={{ value: `${censusMap['percentual_masculino']}%`, label: 'do total censitário', evidence: { source: 'IBGE', dataset: 'SIDRA 9514 — Censo 2022', period: '2022', lastUpdated: '2022', confidence: 'ALTA' } }}
              />
            )}

            {censusMap['percentual_jovens'] !== undefined && (
              <ContextualKPI
                label="% Jovens (15-29)"
                icon={Baby}
                indicator={{ value: `${censusMap['percentual_jovens']}%`, label: 'do total censitário', evidence: { source: 'IBGE', dataset: 'SIDRA 9514 — Censo 2022', period: '2022', lastUpdated: '2022', confidence: 'ALTA' } }}
              />
            )}

            {censusMap['percentual_idosos'] !== undefined && (
              <ContextualKPI
                label="% Idosos (60+)"
                icon={Users}
                indicator={{ value: `${censusMap['percentual_idosos']}%`, label: 'do total censitário', evidence: { source: 'IBGE', dataset: 'SIDRA 9514 — Censo 2022', period: '2022', lastUpdated: '2022', confidence: 'ALTA' } }}
              />
            )}

            <div className="bg-[#111726] border border-white/5 rounded-xl p-5 flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="uppercase font-bold tracking-wider">Unidade Territorial</span>
                <MapPin size={16} className="text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono">
                {cityName} / {territory?.uf ?? 'MG'}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Código IBGE: {ibge}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Evolução Populacional (IBGE/SIDRA 6579)</h3>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">IBGE</span>
              </div>
              {populationHistory.length > 1 ? (
                <>
                  <LineChart data={populationHistory} xAxisKey="period" lineKeys={[{ key: 'value', name: 'População', color: '#22d3ee' }]} height={300} />
                  <p className="text-[10px] text-slate-500 font-mono">Anos sem publicação oficial na fonte (ex.: 2007, 2010, 2022, 2023) não aparecem no eixo — nenhum valor foi interpolado.</p>
                </>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs font-mono">Série histórica insuficiente</div>
              )}
            </div>

            <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Composição por Sexo</h3>
              </div>
              {sexComposition.length > 0 ? (
                <BarChart data={sexComposition} xAxisKey="sexo" barKey="value" name="Habitantes" color="#a855f7" height={300} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 text-xs font-mono">Composição por sexo indisponível</div>
              )}
            </div>
          </div>

          <div className="surface-primary rounded-xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">Estrutura Etária — Censo 2022 (%)</h3>
            </div>
            {ageStructure.length > 0 ? (
              <BarChart data={ageStructure} xAxisKey="faixa" barKey="value" name="% da população" color="#f59e0b" height={280} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-500 text-xs font-mono">Estrutura etária indisponível</div>
            )}
          </div>

          <div className="p-5 bg-[#111726] border border-white/5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-bold">
              <Info size={16} className="text-cyan-400" />
              <span>Cobertura e Limitações Declaradas</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              A série de população utiliza exclusivamente pontos oficialmente publicados pelo IBGE (SIDRA 6579), sem interpolação. A composição por sexo e a estrutura etária vêm do Censo Demográfico 2022 (SIDRA 9514) — uma fotografia censitária, não uma série anual. Domicílios, taxa de urbanização e idade média/mediana ainda não possuem fonte municipal atual homologada neste motor e não são exibidos como dado real.
            </p>
          </div>
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor IBGE Real"
          title="Dados Demográficos Ainda Não Consolidados"
          description={`Os dados de população do IBGE para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
