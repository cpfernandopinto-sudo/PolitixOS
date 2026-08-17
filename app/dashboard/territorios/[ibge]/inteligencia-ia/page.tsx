import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { NotebookHeader } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { 
  BrainCircuit, Lightbulb, TrendingUp, TrendingDown, Minus, 
  Activity, CloudRain, ShieldAlert, Target, Rocket, Search,
  GitMerge, AlertTriangle, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';
import React from 'react';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';

export default async function InteligenciaIAPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  const isDemo = Boolean(dossier);
  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Município');

  return (
    <DossierNotebookContainer
      title={`Análise Integrada Politix IA — ${cityName}`}
      description="Síntese estratégica gerada a partir do cruzamento multidimensional de Demografia, Economia, Eleições, Radar e Serviços."
      engineName="Motor Inteligência IA"
      status={dossier ? 'PARCIAL' : 'SEM_DADOS'}
      sourceName={isDemo ? 'Inteligência Politix IA (Demonstrativo — Fixture Contagem)' : 'Inteligência Politix IA Oficial'}
    >
      {isDemo && dossier ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono flex items-center justify-between">
            <span>Selo de Transparência: Dados de inteligência IA demonstrativos pré-carregados (Fixture Contagem).</span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold uppercase">DEMONSTRATIVO</span>
          </div>

          <NotebookHeader 
            title="Análise Integrada Politix IA" 
            summary="Síntese estratégica gerada a partir do cruzamento multidimensional de Demografia, Economia, Eleições, Radar e Serviços."
          />

          {/* SÍNTESE EXECUTIVA & 60 SEGUNDOS */}
          <section className="bg-[#111726] border border-violet-500/30 rounded-xl overflow-hidden flex flex-col xl:flex-row relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <BrainCircuit size={200} />
            </div>
            
            <div className="p-6 md:p-8 xl:w-2/3 border-b xl:border-b-0 xl:border-r border-white/5 relative z-10 space-y-4 font-mono text-xs">
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                <BrainCircuit size={16} /> Síntese Estratégica do Território
              </h2>
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed font-sans">
                <p>O território apresenta crescimento econômico consistente impulsionado pelo setor de serviços e logística, gerando forte saldo de empregos formais (+3.000 no ano). Este dinamismo, contudo, mascara gargalos estruturais críticos que começam a afetar a avaliação da gestão pública.</p>
                <p>A atenção primária de saúde não acompanhou o crescimento populacional recente e a expansão imobiliária. Observa-se um descolamento entre a percepção pública de pujança econômica (positiva) e a experiência de uso da zeladoria e mobilidade nos bairros (negativa).</p>
              </div>
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
