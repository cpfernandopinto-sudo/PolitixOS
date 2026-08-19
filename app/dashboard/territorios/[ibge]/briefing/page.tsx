import React from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, Eye, Target } from 'lucide-react';
import { NotebookHeader } from '@/components/dashboard/territorios/AnalyticalComponents';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import { loadTerritoryIntelligenceRuntime } from '@/lib/territorios/intelligence/territory-runtime';

export default async function BriefingPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);
  const cityName = territory?.municipio ?? 'Município';
  const runtime = territory ? await loadTerritoryIntelligenceRuntime(createAdminClient(), territory) : null;
  const briefing = runtime?.briefing;
  const hasContent = Boolean(briefing && (briefing.facts.length || briefing.topSignals.length));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <NotebookHeader title={`Briefing Executivo de Campo — ${cityName}`} summary="Leitura determinística dos fatos e sinais oficiais disponíveis no território." />
      {hasContent && briefing ? (
        <>
          <section className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-6 md:p-8">
            <h2 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-mono"><Target size={14} /> Se a visita fosse hoje</h2>
            <p className="text-xl md:text-2xl text-white font-medium leading-tight">{briefing.topSignals[0]?.title ?? 'Há fatos oficiais disponíveis, mas nenhum sinal ativo atingiu evidência suficiente.'}</p>
            {briefing.topSignals[0] && <p className="text-sm text-indigo-300/70 border-t border-indigo-500/20 pt-3 mt-4">{briefing.topSignals[0].summary}</p>}
          </section>

          <section className="bg-gradient-to-br from-[#111726] to-[#0d121f] border border-cyan-500/30 rounded-xl p-6 md:p-8">
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-mono"><BrainCircuit size={16} /> Sinais prioritários</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {briefing.topSignals.map((signal, index) => (
                <article key={signal.id} className="bg-white/5 border border-white/10 rounded-lg p-5">
                  <div className="flex items-center justify-between gap-2 mb-3"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Prioridade {index + 1}</span><span className="text-[9px] font-bold text-cyan-400 uppercase font-mono">{signal.confidence ?? 'contexto limitado'}</span></div>
                  <h3 className="text-base font-bold text-white mb-2">{signal.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{signal.summary}</p>
                  <p className="text-[10px] text-slate-500 mt-4 font-mono">{signal.period} · {signal.evidenceRefs.length} evidência(s)</p>
                </article>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['RISK', 'OPPORTUNITY', 'MONITOR'] as const).map((category) => {
              const items = briefing.attention.filter((item) => item.category === category);
              const label = category === 'RISK' ? 'Pontos de atenção' : category === 'OPPORTUNITY' ? 'Oportunidades' : 'Monitorar';
              const borderClass = category === 'RISK' ? 'border-rose-500/20' : category === 'OPPORTUNITY' ? 'border-emerald-500/20' : 'border-amber-500/20';
              return <section key={category} className={`bg-[#111726] rounded-xl p-6 border ${borderClass}`}><h3 className="text-[13px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Eye size={16} /> {label}</h3><div className="space-y-3">{items.length ? items.map((item) => <div key={item.signalId} className="text-xs text-slate-200"><p className="font-semibold">{item.headline}</p><p className="text-[10px] text-slate-500 mt-1">{item.domain} · {item.evidenceRefs.length} evidência(s)</p></div>) : <p className="text-xs text-slate-500 italic">Nenhum item sustentado nesta categoria.</p>}</div></section>;
            })}
          </div>

          <section className="bg-[#111726] border border-white/10 rounded-xl p-6">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle2 size={15} className="text-cyan-400" /> Fatos oficiais disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{briefing.facts.filter((fact) => fact.supported).slice(0, 12).map((fact) => <div key={fact.id} className="bg-black/20 border border-white/5 rounded-lg p-4"><p className="text-xs text-slate-400">{fact.label}</p><p className="text-base font-semibold text-white mt-1">{String(fact.value)} {fact.unit ?? ''}</p><p className="text-[10px] text-slate-500 mt-2 font-mono">{fact.period}</p></div>)}</div>
          </section>

          {briefing.limitations.length > 0 && <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5"><h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Limitações</h2><ul className="space-y-1 text-xs text-slate-300">{briefing.limitations.map((item) => <li key={item}>• {item}</li>)}</ul></section>}
        </>
      ) : <AnalyticalEmptyState reason="nao_coletado" title="Briefing ainda indisponível" description="Não há fatos ou sinais oficiais suficientes para montar o briefing deste município." />}
    </div>
  );
}
