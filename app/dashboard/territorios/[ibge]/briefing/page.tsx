import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import { 
  AlertTriangle, ShieldAlert, Target, Headphones, Calendar, MessageCircle, 
  BrainCircuit, Search, CheckCircle2, XCircle, ChevronRight, MapPin
} from 'lucide-react';
import { NotebookHeader } from '@/components/dashboard/territorios/AnalyticalComponents';

export default async function BriefingPage({ params }: { params: Promise<{ ibge: string }> }) {
  await params;
  const data = CONTAGEM_DEMO.aiRecommendation;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-start md:items-end flex-col md:flex-row gap-4">
        <NotebookHeader 
          title="Briefing Executivo de Campo" 
          summary="Recomendações estratégicas e inteligência preditiva para visitação no território."
        />
        <div className="flex items-center gap-2 shrink-0 mb-8">
          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 font-bold text-[10px] tracking-widest border border-amber-500/20 flex items-center gap-1.5 uppercase">
            <AlertTriangle size={12}/> Dados Demonstrativos
          </span>
        </div>
      </div>

      {/* 1. SE A VISITA FOSSE HOJE */}
      {data.priorityTheme && (
        <section className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-6 md:p-8">
          <h2 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Target size={14} /> Se a Visita Fosse Hoje
          </h2>
          <p className="text-xl md:text-2xl text-white font-medium leading-tight mb-3">{data.priorityTheme.text}</p>
          {data.priorityTheme.traceability && (
            <p className="text-sm text-indigo-300/70 border-t border-indigo-500/20 pt-3 mt-3">{data.priorityTheme.traceability}</p>
          )}
        </section>
      )}

      {/* 2. DIRETRIZ ESTRATÉGICA POLITIX IA */}
      <section className="bg-gradient-to-br from-[#111726] to-[#0d121f] border border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(34,211,238,0.15)] rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <BrainCircuit size={200} />
        </div>
        
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
          <BrainCircuit size={16} /> Diretriz Estratégica Politix IA
        </h2>
        
        <div className="space-y-4 relative z-10">
          
          {/* PRIORIDADE 1 */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-cyan-500/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Prioridade 1</span>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">Segurança Patrimonial</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Recomendação IA
                </span>
                <span className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={10}/> Confiança: Alta
                </span>
              </div>
            </div>
            
            <p className="text-[15px] text-white font-medium mb-4 leading-relaxed bg-black/20 p-3 rounded-md border border-white/5">
              &ldquo;Dar prioridade à segurança urbana e prevenção patrimonial, principalmente nos eixos de mobilidade e áreas comerciais.&rdquo;
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Por Quê (Evidências)</span>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Furtos de veículos: +18% (12m)</li>
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Estelionato: +25% (YTD)</li>
                  <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span> Crimes violentos: Estáveis</li>
                </ul>
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">Interpretação</span>
                <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-purple-500/30 pl-3">
                  A pressão eleitoral e a percepção de insegurança estão fortemente concentradas em crimes patrimoniais, mascarando a estabilidade da violência letal. Prometer &ldquo;redução de homicídios&rdquo; não dialoga com a dor diária do eleitorado mediano.
                </p>
              </div>
            </div>
          </div>

          {/* PRIORIDADE 2 */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-cyan-500/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Prioridade 2</span>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">Saúde Especializada</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Recomendação IA
                </span>
                <span className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  Confiança: Média
                </span>
              </div>
            </div>
            
            <p className="text-[15px] text-white font-medium mb-4 leading-relaxed bg-black/20 p-3 rounded-md border border-white/5">
              &ldquo;A expansão da Atenção Básica deve ser acompanhada de uma estratégia explícita para atração de médicos especialistas e redução de filas cirúrgicas.&rdquo;
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1">Por Quê (Fato)</span>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> Cobertura ESF cresceu 4,5 p.p</li>
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Fila especializada subiu 21%</li>
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Lotação em UPAs no Radar Temas</li>
                </ul>
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5">Hipótese a Validar</span>
                <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-amber-500/30 pl-3">
                  Existe gargalo na fixação de especialistas devido ao valor das tabelas regionais. O fluxo da atenção básica deságua numa rede secundária que não suporta a vazão. Avaliar criação de consórcios regionais.
                </p>
              </div>
            </div>
          </div>

          {/* PRIORIDADE 3 */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:border-cyan-500/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Prioridade 3</span>
                <h3 className="text-base font-bold text-white uppercase tracking-wide">Mobilidade + Crescimento</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Recomendação IA
                </span>
                <span className="px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={10}/> Confiança: Alta
                </span>
              </div>
            </div>
            
            <p className="text-[15px] text-white font-medium mb-4 leading-relaxed bg-black/20 p-3 rounded-md border border-white/5">
              &ldquo;O avanço logístico e do emprego precisa ser imediatamente amparado por uma forte agenda de infraestrutura de mobilidade, sob risco de colapso viário.&rdquo;
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-1">Por Quê (Fato)</span>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> Saldo de +3.000 vagas YTD</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span> Expansão de galpões logísticos</li>
                  <li className="flex items-start gap-2"><span className="text-rose-400 mt-0.5">•</span> Aumento grave de fluxo pendular diário</li>
                </ul>
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">Interpretação</span>
                <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-purple-500/30 pl-3">
                  Crescimento econômico → mais trabalhadores no entorno → mais carretas → asfalto deteriorado → tempo de deslocamento sobe. O eleitor não separa desenvolvimento de engarrafamento.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. DEFENDER / EVITAR / INVESTIGAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* O QUE DEFENDER */}
        <div className="bg-[#111726] rounded-xl p-6 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest">O Que Defender</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Desenvolvimento atrelado à logística</span>
                <span className="text-[9px] text-slate-500 uppercase">Evidência: +3.000 Vagas</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Capilaridade da atenção primária</span>
                <span className="text-[9px] text-slate-500 uppercase">Evidência: Crescimento ESF</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Arrecadação robusta para investimentos</span>
                <span className="text-[9px] text-slate-500 uppercase">Evidência: Receitas em alta (+8%)</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Queda de crimes violentos severos</span>
                <span className="text-[9px] text-slate-500 uppercase">Evidência: Taxa de Homicídios</span>
              </div>
            </li>
          </ul>
        </div>

        {/* O QUE EVITAR */}
        <div className="bg-[#111726] rounded-xl p-6 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-rose-400" />
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest">O Que Evitar</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold mt-0.5 shrink-0 px-1">×</span>
              <div>
                <span className="text-xs font-medium text-slate-200 block leading-tight">Afirmar que a segurança melhorou apenas focando em homicídios.</span>
                <span className="text-[9px] text-slate-500 uppercase mt-0.5 block">Eleitor sofre com roubos de carros</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold mt-0.5 shrink-0 px-1">×</span>
              <div>
                <span className="text-xs font-medium text-slate-200 block leading-tight">Prometer redução imediata de filas médicas sem citar gargalo regional.</span>
                <span className="text-[9px] text-slate-500 uppercase mt-0.5 block">Exige atração de especialistas</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold mt-0.5 shrink-0 px-1">×</span>
              <div>
                <span className="text-xs font-medium text-slate-200 block leading-tight">Tratar a mobilidade de forma avulsa ao modelo econômico da cidade.</span>
                <span className="text-[9px] text-slate-500 uppercase mt-0.5 block">A logística agrava a via</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 font-bold mt-0.5 shrink-0 px-1">×</span>
              <div>
                <span className="text-xs font-medium text-slate-200 block leading-tight">Divulgar números nominais de PIB sem citar a piora da infraestrutura periférica.</span>
                <span className="text-[9px] text-slate-500 uppercase mt-0.5 block">Atenção ao contraste social</span>
              </div>
            </li>
          </ul>
        </div>

        {/* O QUE INVESTIGAR */}
        <div className="bg-[#111726] rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-amber-400" />
            <h3 className="text-[13px] font-bold text-white uppercase tracking-widest">A Investigar na Visita</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-200 block leading-tight">Quais especialidades possuem a fila real mais incômoda nas UPAs hoje?</span>
            </li>
            <li className="flex items-start gap-2">
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-200 block leading-tight">Em quais bairros o furto de veículos causou maior mudança de comportamento?</span>
            </li>
            <li className="flex items-start gap-2">
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-200 block leading-tight">Quais vias e corredores exatos travam por conta da nova logística do anel viário?</span>
            </li>
            <li className="flex items-start gap-2">
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-xs font-medium text-slate-200 block leading-tight">O andamento físico (real, não no papel) das obras de canalização de enchentes.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* 4. FATOS NA PONTA DA LÍNGUA E TEMAS PARA OUVIR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111726] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Fatos na Ponta da Língua</h3>
          </div>
          <div className="space-y-4">
            {(data.tractionMessages ?? []).map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="text-green-500 font-bold mt-0.5 text-sm">{idx + 1}.</div>
                <div>
                  <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>
                  {item.traceability && <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 block">Fonte: {item.traceability}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111726] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Headphones className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Temas para Ouvir</h3>
          </div>
          <div className="space-y-4">
            {(data.listenTo ?? []).map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="text-cyan-500 font-bold mt-0.5 text-sm">{idx + 1}.</div>
                <div>
                  <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>
                  {item.traceability && <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 block">Sinal: {item.traceability}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. PONTOS DE ATENÇÃO E PERGUNTAS IMPORTANTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111726] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pontos Adicionais de Atenção</h3>
          </div>
          <div className="space-y-4">
            {(data.avoidPitfalls ?? []).map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>
                  {item.traceability && <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 block">Risco: {item.traceability}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111726] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Perguntas a Fazer Localmente</h3>
          </div>
          <div className="space-y-4">
            {(data.powerfulQuestions ?? []).map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="text-blue-500 font-bold mt-0.5 text-sm">{idx + 1}.</div>
                <div>
                  <p className="text-xs text-slate-200 italic leading-relaxed">&ldquo;{item.text}&rdquo;</p>
                  {item.traceability && <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5 block">Alvo: {item.traceability}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. AGENDA */}
      <div className="bg-[#111726] rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Oportunidades de Agenda</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data.agendaOpportunities ?? []).map((item, idx) => (
            <div key={idx} className="bg-white/5 p-4 rounded-lg border border-white/5 flex items-start gap-3">
              <MapPin size={16} className="text-indigo-400 mt-0.5 shrink-0"/>
              <div>
                <p className="text-xs text-slate-200 font-medium mb-1.5">{item.text}</p>
                {item.traceability && <p className="text-[9px] text-slate-500 uppercase tracking-widest">{item.traceability}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
