import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { PolitixInsight } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { BarChart } from '@/components/dashboard/territorios/PolitixCharts';
import { AlertTriangle, ActivitySquare } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function RadarPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.radar;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Radar Territorial — ${cityName}`}
      description="Monitoramento de intensidade por tema, sinais emergentes e cronologia de acontecimentos."
      engineName="Motor Radar Territorial"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'Fontes Locais (Demonstrativo — Fixture Contagem)' : 'Monitoramento de Redes e Notícias'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados do radar demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Intensidade por Tema</h3>
            <BarChart data={data.intensityByTheme ?? []} xAxisKey="theme" barKey="count" name="Ocorrências" color="#8b5cf6" height={200} />
          </div>

          <PolitixInsight insight={data.insight} />
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Radar Territorial"
          title="Dados do Radar Territorial Ainda Não Consolidados"
          description={`As informações do radar temático para ${cityName} (IBGE: ${ibge}) ainda não estão disponíveis no catálogo territorial.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
