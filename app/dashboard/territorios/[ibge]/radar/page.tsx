import React from 'react';
import { Activity } from 'lucide-react';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import AnalyticalEmptyState from '@/components/dashboard/territorios/analytical/AnalyticalEmptyState';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import { loadTerritoryIntelligenceRuntime } from '@/lib/territorios/intelligence/territory-runtime';

export default async function RadarPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);
  const runtime = territory ? await loadTerritoryIntelligenceRuntime(createAdminClient(), territory) : null;
  const items = runtime?.radar ?? [];
  return (
    <DossierNotebookContainer title="Radar Territorial" description="Mudanças mensuráveis derivadas exclusivamente de sinais ativos com evidência oficial." engineName="Radar Analítico" status={items.length ? 'PARCIAL' : 'SEM_DADOS'} sourceName="Motores territoriais oficiais">
      {items.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((item) => (
            <article key={item.id} className="bg-[#111726] border border-white/5 hover:border-cyan-500/30 rounded-xl p-5 transition-colors">
              <div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2 text-cyan-400"><Activity size={15} /><span className="text-[10px] font-bold uppercase tracking-widest font-mono">{item.domain}</span></div><span className="text-[10px] text-slate-500 font-mono">{item.period}</span></div>
              <h3 className="text-base font-bold text-white">{item.headline}</h3>
              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5 text-[10px] font-mono"><span className="text-slate-400">{item.confidence ?? 'contexto limitado'}</span><span className="text-slate-500">{item.evidenceRefs.length} evidência(s)</span></div>
            </article>
          ))}
        </div>
      ) : <AnalyticalEmptyState reason="nao_coletado" title="Nenhuma mudança mensurável detectada" description="O radar só exibirá itens quando houver um sinal analítico ativo sustentado por evidência oficial." />}
    </DossierNotebookContainer>
  );
}
