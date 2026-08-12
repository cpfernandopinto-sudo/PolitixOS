import { NotebookHeader } from '@/components/dashboard/territorios/AnalyticalComponents';
import { 
  Search, Globe, ChevronRight, FileText, Sparkles, AlertTriangle, 
  MapPin, Clock, Newspaper, Camera, MessageCircle, Activity, 
  TrendingUp, TrendingDown, Minus, CheckCircle2, ShieldAlert, BrainCircuit
} from 'lucide-react';
import React from 'react';

export default async function InteligenciaExternaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <NotebookHeader 
          title="Inteligência Externa" 
          summary="Central de investigação contextual. Busca web agnóstica cruzada com achados internos do PolitixOS para enriquecimento de evidências."
        />
        
        {/* JANELA TEMPORAL E FILTRO IMPLÍCITO */}
        <div className="flex items-center gap-3 shrink-0 mb-8">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 rounded-md text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <MapPin size={12} /> Contagem — MG
          </div>
          <select className="bg-[#111726] border border-white/10 rounded-md text-[10px] font-bold text-cyan-400 uppercase tracking-widest px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500">
            <option>24 HORAS</option>
            <option>72 HORAS</option>
            <option selected>7 DIAS</option>
            <option>30 DIAS</option>
            <option>90 DIAS</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* COLUNA ESQUERDA: PANORAMA INTERNO */}
        <div className="lg:col-span-1 space-y-6">
          
          <section className="bg-[#111726] p-5 rounded-xl border border-white/5">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} /> Sinais Captados (PolitixOS)
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                <span className="flex items-center gap-2 text-xs text-slate-300"><Newspaper size={14}/> Notícias</span>
                <span className="text-xs font-bold text-white">12</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                <span className="flex items-center gap-2 text-xs text-slate-300"><Camera size={14}/> Instagram</span>
                <span className="text-xs font-bold text-white">43</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                <span className="flex items-center gap-2 text-xs text-slate-300"><MessageCircle size={14}/> X / Twitter</span>
                <span className="text-xs font-bold text-white">28</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                <span className="flex items-center gap-2 text-xs text-slate-300"><Globe size={14}/> Radar Temas</span>
                <span className="text-xs font-bold text-white">5</span>
              </div>
            </div>
          </section>

          <section className="bg-[#111726] p-5 rounded-xl border border-white/5">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} /> Temas em Movimento
            </h2>
            <ul className="space-y-3">
              <li className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-slate-300 font-medium">Segurança</span>
                <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 uppercase tracking-widest"><TrendingUp size={12}/> Forte Aumento</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-slate-300 font-medium">Saúde</span>
                <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 uppercase tracking-widest"><TrendingUp size={12}/> Aumento</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-slate-300 font-medium">Mobilidade</span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest"><Minus size={12}/> Estável</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-xs text-slate-300 font-medium">Infraestrutura</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-widest"><TrendingUp size={12}/> Leve Aumento</span>
              </li>
            </ul>
          </section>
        </div>

        {/* COLUNA CENTRAL/DIREITA: BUSCA E FEED */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* SEARCH BAR (INVESTIGAR TERRITÓRIO) */}
          <section className="bg-gradient-to-br from-[#111726] to-[#0d121f] p-6 rounded-xl border border-cyan-500/30 shadow-2xl relative">
            <div className="flex items-center gap-2 mb-4">
              <Search size={16} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Investigar Território (Busca Externa)</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                className="block w-full pl-4 pr-12 py-4 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                placeholder="Ex: Existem evidências recentes de deterioração na segurança?"
                defaultValue="Quais foram os principais acontecimentos da saúde municipal nos últimos 7 dias?"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-md transition-colors flex items-center justify-center">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* BRIEFING DA INVESTIGAÇÃO */}
          <section className="bg-[#111726] border border-white/10 rounded-xl overflow-hidden relative opacity-90">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Briefing da Investigação</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-500 font-bold tracking-widest uppercase border border-amber-500/20">
                PROVIDER NÃO CONECTADO
              </span>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Achados Principais</span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  A investigação nas fontes locais indica duas inaugurações recentes de Unidades Básicas de Saúde (UBS), com ampla cobertura na mídia institucional. Contudo, relatos no Instagram oficial da prefeitura e em grupos locais apontam escassez imediata de médicos pediatras nestas mesmas unidades, resultando em sobrecarga na UPA do centro nas últimas 48 horas.
                </p>
              </div>
              
              <div className="bg-rose-950/20 p-4 rounded-lg border border-rose-500/20">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1 flex items-center gap-1.5"><AlertTriangle size={12}/> Contradições Encontradas</span>
                <p className="text-xs text-slate-300">As notícias institucionais reportam expansão de rede (Fonte 1), mas os dados de redes sociais e veículos independentes indicam desassistência pediátrica grave e aumento real de tempo de espera (Fonte 3).</p>
              </div>
              
              <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-semibold text-white transition-colors">
                  <FileText size={14} /> Salvar como Evidência
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded text-[11px] font-semibold text-cyan-400 transition-colors">
                  <BrainCircuit size={14} /> Enviar para Análise IA
                </button>
              </div>
            </div>
          </section>

          {/* FEED TERRITORIAL / FONTES */}
          <section className="bg-[#111726] border border-white/5 rounded-xl p-6">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Globe size={14} /> Feed Territorial & Fontes
            </h3>
            <div className="space-y-3">
              {[
                { name: 'O Tempo - Contagem', type: 'Notícia Local', date: 'Hoje', theme: 'Saúde', rel: 'Alta', icon: Newspaper, mock: true },
                { name: 'Instagram (@prefeituradecontagem)', type: 'Sinal Social', date: 'Ontem', theme: 'Infraestrutura', rel: 'Média', icon: Camera, mock: true },
                { name: 'Portal da Transparência', type: 'Institucional', date: 'Ontem', theme: 'Finanças', rel: 'Alta', icon: ShieldAlert, mock: true },
              ].map((f, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded bg-white/5 border border-white/5 hover:border-white/10 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0">
                      <f.icon size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{f.name}</span>
                        {f.mock && <span className="text-[8px] font-bold bg-white/10 text-slate-400 px-1 rounded uppercase">DEMO</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                        <span>{f.type}</span> • <span>{f.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 text-slate-400 border border-white/5 uppercase tracking-widest">{f.theme}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${
                      f.rel === 'Alta' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-white/5'
                    }`}>Rel: {f.rel}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
