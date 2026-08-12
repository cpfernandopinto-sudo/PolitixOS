import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader } from '@/components/dashboard/territorios/AnalyticalComponents';
import { BrainCircuit, AlertTriangle, Zap, Target, ArrowUpRight, ArrowDownRight, Lightbulb, FileSearch } from 'lucide-react';
import { LineChart, BarChart } from '@/components/dashboard/territorios/PolitixCharts';

export default async function AnaliseIntegradaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;

  const data = dossier.integratedAnalysis;
  const isDemo = data.mode === 'demo';

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
         <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
            <BrainCircuit className="text-cyan-400" size={24} />
         </div>
         <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Síntese Estratégica Politix IA</h1>
            <p className="text-sm text-slate-400">Leitura transversal automatizada a partir das evidências do território.</p>
         </div>
      </div>

      {isDemo && (
        <div className="mb-8 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <strong>Demonstrativo:</strong> Este relatório narrativo é gerado localmente como template para validação do Codex. Na versão de produção, este texto será sintetizado pela Politix IA utilizando o contexto dos Motores.
          </p>
        </div>
      )}

      {/* Território em 60 Segundos */}
      <section className="mb-12">
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Zap size={16} /> O Território em 60 Segundos
        </h2>
        <div className="prose prose-invert max-w-none">
          {data.executiveSummary.map((p, i) => (
             <p key={i} className="text-[15px] leading-relaxed text-slate-300 mb-4">{p}</p>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

      {/* O Que Mudou / Melhorou / Piorou */}
      <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-6">
            <div>
               <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <ArrowUpRight size={14} /> O que está melhorando
               </h3>
               <div className="bg-[#111726] border border-emerald-500/10 rounded-xl p-4">
                 <p className="text-sm text-slate-300 leading-relaxed mb-3">Geração de emprego formal impulsionada pelo setor logístico, com forte contratação nos últimos 12 meses, gerando aumento de renda per capita em microrregiões específicas.</p>
                 <EvidenceFooter source="CAGED" period="2024-2025" confidence="ALTA" limit="Dado sujeito a sazonalidade de fim de ano." />
               </div>
            </div>
            
            <div>
               <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <ArrowDownRight size={14} /> O que está piorando
               </h3>
               <div className="bg-[#111726] border border-rose-500/10 rounded-xl p-4">
                 <p className="text-sm text-slate-300 leading-relaxed mb-3">A pressão sobre a rede hospitalar aumentou substancialmente. Apesar da expansão da ESF, as filas para especialidades dobraram em relação a 2022.</p>
                 <EvidenceFooter source="DATASUS / Ouvidoria" period="Últimos 24 meses" confidence="MÉDIA" limit="Depende da integração total dos registros municipais." />
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div>
               <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Target size={14} /> Contradições
               </h3>
               <div className="bg-[#111726] border border-amber-500/10 rounded-xl p-4">
                 <p className="text-sm text-slate-300 leading-relaxed mb-3">Há uma dissonância entre o crescimento industrial forte (ativo) e a percepção de segurança na área central (passivo), que tem afastado o comércio local do polo principal à noite.</p>
                 <EvidenceFooter source="Cruzamento Economia x Segurança" period="2025" confidence="BAIXA" limit="Hipótese baseada em correlação não causal." />
               </div>
            </div>
            
            <div>
               <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Lightbulb size={14} /> Sinais Emergentes
               </h3>
               <div className="bg-[#111726] border border-cyan-500/10 rounded-xl p-4">
                 <p className="text-sm text-slate-300 leading-relaxed mb-3">Envelhecimento populacional acelerado e evasão de jovens adultos (15-24 anos) em busca de polos tecnológicos fora da RMBH industrial tradicional.</p>
                 <EvidenceFooter source="IBGE (Censo Demográfico)" period="2010 vs 2022" confidence="ALTA" limit="Tendência estrutural longa." />
               </div>
            </div>
         </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

      {/* Hipóteses e Questões */}
      <section className="mb-12">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Hipóteses Estratégicas e Questões em Aberto</h2>
        
        <div className="space-y-6">
           <div className="surface-primary border border-white/5 p-6 rounded-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
             <h4 className="text-sm font-bold text-white mb-2">Hipótese H1: A "Fadiga Metropolitana"</h4>
             <p className="text-sm text-slate-300 leading-relaxed mb-4">A análise sugere que a insatisfação com serviços de saúde e mobilidade não deriva da falta de investimento local, mas sim do uso destes serviços por populações de municípios menores no entorno, criando uma "fadiga" no núcleo logístico.</p>
             <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-4">Questões a validar em campo:</h5>
             <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
               <li>O hospital municipal comporta a triagem pendular?</li>
               <li>Há ressentimento local contra a integração metropolitana?</li>
             </ul>
           </div>
        </div>
      </section>

    </div>
  );
}

function EvidenceFooter({ source, period, confidence, limit }: { source: string, period: string, confidence: string, limit: string }) {
  return (
    <div className="pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
      <div className="space-y-1">
        <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-widest"><FileSearch size={12} /> Evidência Base</span>
        <span className="text-slate-400 block"><strong className="text-slate-300">Fonte:</strong> {source}</span>
        <span className="text-slate-400 block"><strong className="text-slate-300">Período:</strong> {period}</span>
      </div>
      <div className="space-y-1">
        <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-widest"><Target size={12} /> Qualidade</span>
        <span className="text-slate-400 block"><strong className="text-slate-300">Confiança:</strong> <span className={confidence === 'ALTA' ? 'text-emerald-400 font-bold' : confidence === 'MÉDIA' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>{confidence}</span></span>
        <span className="text-slate-400 block line-clamp-2" title={limit}><strong className="text-slate-300">Limitação:</strong> {limit}</span>
      </div>
    </div>
  );
}
