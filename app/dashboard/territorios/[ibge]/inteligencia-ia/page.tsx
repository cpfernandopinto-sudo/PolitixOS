import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { NotebookHeader } from '@/components/dashboard/territorios/AnalyticalComponents';
import { 
  BrainCircuit, Lightbulb, TrendingUp, TrendingDown, Minus, 
  Activity, CloudRain, ShieldAlert, Target, Rocket, Search,
  GitMerge, AlertTriangle, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';
import React from 'react';

export default async function InteligenciaIAPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;

  if (!dossier) return null;

  const { diagnostic, integratedAnalysis, radar } = dossier;
  const quickRead = integratedAnalysis?.quickRead || { mood: 'Cauteloso', pressure: 'Infraestrutura', asset: 'Economia', opportunity: 'Logística' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <NotebookHeader 
        title="Análise Integrada Politix IA" 
        summary="Síntese estratégica gerada a partir do cruzamento multidimensional de Demografia, Economia, Eleições, Radar e Serviços."
      />

      {/* SÍNTESE EXECUTIVA & 60 SEGUNDOS (Integrados) */}
      <section className="bg-[#111726] border border-violet-500/30 rounded-xl overflow-hidden flex flex-col xl:flex-row relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <BrainCircuit size={200} />
        </div>
        
        <div className="p-6 md:p-8 xl:w-2/3 border-b xl:border-b-0 xl:border-r border-white/5 relative z-10">
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BrainCircuit size={16} /> Síntese Estratégica do Território
          </h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>O território apresenta crescimento econômico consistente impulsionado pelo setor de serviços e logística, gerando forte saldo de empregos formais (+3.000 no ano). Este dinamismo, contudo, mascara gargalos estruturais críticos que começam a afetar a avaliação da gestão pública.</p>
            <p>A atenção primária de saúde não acompanhou o crescimento populacional recente e a expansão imobiliária. Observa-se um descolamento entre a percepção pública de pujança econômica (positiva) e a experiência de uso da zeladoria e mobilidade nos bairros (negativa).</p>
            <p>A estabilidade política local depende majoritariamente da capacidade de traduzir a tração do polo industrial em melhorias rápidas de infraestrutura urbana, especialmente nas áreas limítrofes, evitando a fadiga eleitoral do discurso de 'cidade do emprego'.</p>
          </div>
        </div>

        <div className="p-6 md:p-8 xl:w-1/3 bg-black/20 flex flex-col justify-center gap-4 relative z-10">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CloudRain size={12}/> CLIMA TERRITORIAL</span>
            <span className="text-amber-400 font-bold text-sm">Atenção Moderada</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={12}/> MAIOR PRESSÃO</span>
            <span className="text-white font-bold text-sm">Saúde + Zeladoria</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5"><Target size={12}/> MAIOR ATIVO</span>
            <span className="text-white font-bold text-sm">Economia + Emprego</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-1.5"><Rocket size={12}/> OPORTUNIDADE</span>
            <span className="text-white font-bold text-sm">Infraestrutura</span>
          </div>
        </div>
      </section>

      {/* O QUE MUDOU (Horizontal) */}
      <section className="bg-[#111726] border border-white/5 rounded-xl p-6">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <Activity size={14} /> O Que Mudou Recentemente
        </h2>
        <div className="flex flex-nowrap overflow-x-auto gap-4 custom-scrollbar pb-2">
          {[
            { val: "+18%", label: "Furtos de veículos", period: "12 meses", origin: "Segurança", trend: 'up', color: 'rose' },
            { val: "+3.200", label: "Vagas formais", period: "YTD", origin: "Emprego", trend: 'up', color: 'emerald' },
            { val: "+4.5 pp", label: "Cobertura ESF", period: "12 meses", origin: "Saúde", trend: 'up', color: 'emerald' },
            { val: "+21%", label: "Fila Especializada", period: "6 meses", origin: "Saúde", trend: 'up', color: 'rose' },
            { val: "+8%", label: "Arrecadação ISS", period: "YTD", origin: "Finanças", trend: 'up', color: 'emerald' },
          ].map((item, idx) => (
            <div key={idx} className="shrink-0 w-48 bg-white/5 border border-white/5 rounded-lg p-4 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-lg font-bold text-${item.color}-400`}>{item.val}</span>
                {item.trend === 'up' && item.color === 'emerald' ? <TrendingUp size={16} className="text-emerald-500" /> :
                 item.trend === 'up' && item.color === 'rose' ? <TrendingUp size={16} className="text-rose-500" /> :
                 <Minus size={16} className="text-slate-500" />}
              </div>
              <span className="text-xs font-medium text-white mb-1">{item.label}</span>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-auto pt-3 border-t border-white/5">
                <span>{item.period}</span>
                <span>{item.origin}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTRADIÇÕES (Protagonista) */}
      <section className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-6 md:p-8">
        <h2 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <AlertTriangle size={14} /> Contradições do Território
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111726]/80 p-5 rounded-lg border border-white/5 relative">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Economia Acelera</span>
               <span className="text-xs font-bold text-slate-500">VS</span>
               <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Infra. Pressionada</span>
             </div>
             <p className="text-sm text-slate-300 leading-relaxed">
               A atração de novas indústrias gerou saldo formal positivo inédito, mas o tráfego pesado destruiu pavimentos nas vias arteriais periféricas. A população sente o emprego, mas pune a gestão pelos buracos e lentidão no trânsito.
             </p>
          </div>
          
          <div className="bg-[#111726]/80 p-5 rounded-lg border border-white/5 relative">
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Criminalidade Cai</span>
               <span className="text-xs font-bold text-slate-500">VS</span>
               <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Furtos Disparam</span>
             </div>
             <p className="text-sm text-slate-300 leading-relaxed">
               Homicídios e crimes violentos atingiram a mínima histórica (impacto do novo batalhão central). Porém, o furto de veículos nas áreas comerciais explodiu, mantendo a percepção crônica de insegurança no eleitorado formador de opinião.
             </p>
          </div>
        </div>
      </section>

      {/* MELHORANDO VS PIORANDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-[#111726] border border-white/5 rounded-xl p-6">
          <h3 className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={14} /> Frentes em Melhoria
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Geração de Emprego Formal', sub: '+12% YTD', intensity: 'Alta' },
              { label: 'Arrecadação Municipal (ISS)', sub: '+8% YTD', intensity: 'Média' },
              { label: 'Redução Homicídios', sub: '-15% (12m)', intensity: 'Alta' },
              { label: 'Cobertura ESF', sub: '+4.5p.p.', intensity: 'Baixa' }
            ].map((i, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">{i.label}</span>
                  <span className="text-[10px] text-slate-400">{i.sub}</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{i.intensity}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#111726] border border-white/5 rounded-xl p-6">
          <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingDown size={14} /> Frentes em Deterioração
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Furtos e Roubos de Veículos', sub: '+18% (12m)', intensity: 'Alta' },
              { label: 'Fila de Especialidades Médicas', sub: '+21% (6m)', intensity: 'Alta' },
              { label: 'Abstenção Eleitoral (Estimada)', sub: 'Tendência Alta', intensity: 'Média' },
              { label: 'Estelionato Digital', sub: '+30% (YTD)', intensity: 'Alta' }
            ].map((i, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5 hover:border-rose-500/30 transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-white">{i.label}</span>
                  <span className="text-[10px] text-slate-400">{i.sub}</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">{i.intensity}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* CONEXÕES IDENTIFICADAS */}
      <section className="bg-[#111726] border border-cyan-500/20 rounded-xl p-6 overflow-hidden">
        <h2 className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <GitMerge size={14} /> Conexões Entre Cadernos
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full">
          <div className="flex-1 bg-cyan-950/30 border border-cyan-500/20 p-4 rounded-lg w-full text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Causa Raiz (Economia)</span>
            <span className="text-sm font-bold text-white">Expansão Logística e Polo Industrial</span>
          </div>
          <ChevronRight className="text-cyan-500/50 hidden md:block" />
          <div className="flex-1 bg-cyan-950/30 border border-cyan-500/20 p-4 rounded-lg w-full text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Efeito 1 (Demografia/Emprego)</span>
            <span className="text-sm font-bold text-white">Aumento do Fluxo Pendular</span>
          </div>
          <ChevronRight className="text-cyan-500/50 hidden md:block" />
          <div className="flex-1 bg-cyan-950/30 border border-cyan-500/20 p-4 rounded-lg w-full text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Impacto (Mobilidade/Infra)</span>
            <span className="text-sm font-bold text-white">Deterioração Asfáltica Acelerada</span>
          </div>
        </div>
      </section>

      {/* SINAIS EMERGENTES & HIPÓTESES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-[#111726] border border-white/5 rounded-xl p-6">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Lightbulb size={14} /> Sinais Emergentes
          </h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded">Saúde</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10}/> Confiança: Alta</span>
              </div>
              <p className="text-sm text-slate-200 mb-3">Aumento vertiginoso da pressão por especialistas médicos via redes sociais e queixas no Radar.</p>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Últimos 30 dias</span>
                <span>Fonte: Radar + IG + Dados SUS</span>
              </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded">Zeladoria</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10}/> Confiança: Média</span>
              </div>
              <p className="text-sm text-slate-200 mb-3">Reclamações sobre mato alto e dengue crescem desproporcionalmente antes do período chuvoso habitual.</p>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Últimos 15 dias</span>
                <span>Fonte: Notícias + Radar</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#111726] border border-white/5 rounded-xl p-6">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Search size={14} /> Hipóteses para Investigação
          </h2>
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="mb-2 pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Evidência Base (Fato)</span>
                <p className="text-xs text-slate-300">Sobrecarga nas UPAs contrasta com subutilização de postos básicos recém-entregues.</p>
              </div>
              <div className="mb-3">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block mb-1">Hipótese IA</span>
                <p className="text-sm text-white font-medium">Há um erro agudo de comunicação institucional sobre o uso da rede primária, sobrecarregando a urgência e gerando crise artificial de saúde.</p>
              </div>
              <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest bg-cyan-500/10 px-2 py-1.5 rounded flex items-center gap-2">
                <FileText size={12}/> Sugestão: Cruzar fluxo UPA x Endereço do paciente
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* IMPLICAÇÕES TERRITORIAIS */}
      <section className="bg-gradient-to-br from-[#111726] to-[#0d121f] border border-white/10 rounded-xl p-6 md:p-8 relative overflow-hidden">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-5 flex items-center gap-2">
          Implicações Estratégicas
        </h2>
        <div className="space-y-4 text-slate-300 text-sm md:text-[15px] leading-relaxed max-w-5xl">
          <p>As métricas macroeconômicas formam um "colchão" político invejável para o território. Com o emprego em alta, a propensão ao radicalismo eleitoral tende a ser menor. No entanto, o eleitorado que tem emprego passa a exigir mais "qualidade de vida": asfalto, consultas rápidas, menos tempo no trânsito.</p>
          <p>Se a gestão continuar focada em vender "A Cidade do Emprego" enquanto o cidadão torce a roda do carro no buraco a caminho da UPA lotada, haverá um curto-circuito na comunicação política. O momento exige transição de narrativa: do desenvolvimento econômico para a zeladoria inteligente de bairro.</p>
        </div>
      </section>
    </div>
  );
}
