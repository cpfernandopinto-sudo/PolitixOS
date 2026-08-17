import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { BrainCircuit, AlertTriangle, Zap, Target, ArrowUpRight, ArrowDownRight, Lightbulb, FileSearch } from 'lucide-react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function AnaliseIntegradaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const data = dossier?.integratedAnalysis;
  const isDemo = Boolean(dossier && data);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Síntese Estratégica Politix IA — ${cityName}`}
      description="Leitura transversal automatizada a partir das evidências do território."
      engineName="Motor Inteligência IA"
      status={data ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'Inteligência Politix IA (Demonstrativo — Fixture Contagem)' : 'Inteligência Politix IA Oficial'}
    >
      {isDemo && data ? (
        <div className="space-y-6">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Relatório narrativo demonstrativo pré-carregado (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase font-mono">DEMONSTRATIVO</span>
          </div>

          <section className="mb-8">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
              <Zap size={16} /> O Território em 60 Segundos
            </h2>
            <div className="prose prose-invert max-w-none">
              {data.executiveSummary.map((p: string, i: number) => (
                 <p key={i} className="text-sm leading-relaxed text-slate-300 mb-4">{p}</p>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <AnalyticalEmptyState
          reason="nao_coletado"
          engineName="Motor Inteligência IA"
          title="Análise Integrada IA Ainda Não Gerada"
          description={`A síntese de inteligência integrada via IA para ${cityName} (IBGE: ${ibge}) ainda não foi executada.`}
        />
      )}
    </DossierNotebookContainer>
  );
}
