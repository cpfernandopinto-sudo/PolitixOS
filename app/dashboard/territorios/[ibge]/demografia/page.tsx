import React from 'react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { ContextualKPI } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { Users, MapPin, Info } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

export default async function DemografiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  let realPopulation: string | null = null;
  let isDemo = false;
  let demoData: any = null;

  if (territory) {
    // Try to extract real population from territory metadata or territory_indicators
    const metaPop = territory.metadata?.populacao_2022 ?? territory.metadata?.populacao;
    if (metaPop) {
      realPopulation = Number(metaPop).toLocaleString('pt-BR');
    } else {
      try {
        const client = createAdminClient();
        const { data: rows } = await client
          .from('territory_indicators')
          .select('valor')
          .eq('territory_id', territory.id)
          .eq('categoria', 'demografia')
          .ilike('indicador', '%populacao%')
          .maybeSingle();
        if (rows?.valor) {
          realPopulation = Number(rows.valor).toLocaleString('pt-BR');
        }
      } catch {
        // Query error
      }
    }
  }

  // Explicit DEMONSTRATIVO fallback ONLY for Contagem (3118601) if real pop query is null
  if (!realPopulation && ibge === '3118601') {
    demoData = CONTAGEM_DEMO.demography;
    realPopulation = demoData.population.value;
    isDemo = true;
  }

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');
  const statusKey = realPopulation ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'SEM_DADOS';

  return (
    <DossierNotebookContainer
      title={`Demografia e Perfil Populacional — ${cityName}`}
      description="População total oficial apurada pelo Censo Demográfico e estimativas estatísticas do IBGE."
      engineName="Motor IBGE Real"
      status={statusKey}
      sourceName={isDemo ? 'IBGE (Demonstrativo — Fixture Contagem)' : 'IBGE (Censo Demográfico 2022 / SIDRA 6579)'}
    >
      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
          <span>Selo de Transparência: Dados demográficos demonstrativos pré-carregados (Fixture Contagem).</span>
          <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
        </div>
      )}

      {realPopulation ? (
        <div className="space-y-8">
          {/* Main Real Population KPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ContextualKPI
              label="População Total Oficial"
              indicator={{
                value: realPopulation,
                label: 'habitantes — Censo IBGE 2022',
                evidence: {
                  source: 'IBGE',
                  dataset: 'SIDRA Tabela 6579',
                  period: '2022',
                  lastUpdated: '2022',
                  confidence: 'ALTA',
                },
              }}
              icon={Users}
            />

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

          {/* Disclosure Box for Detailed Demographic Data */}
          <div className="p-5 bg-[#111726] border border-white/5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-mono text-xs font-bold">
              <Info size={16} className="text-cyan-400" />
              <span>Transparência de Cobertura Demográfica (IBGE)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              O indicador de população total acima provém da base oficial de dados do IBGE. Detalhamentos censitários adicionais (pirâmide etária, composição por sexo e domicílios) serão integrados na próxima rodada de consolidação do Motor IBGE.
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
