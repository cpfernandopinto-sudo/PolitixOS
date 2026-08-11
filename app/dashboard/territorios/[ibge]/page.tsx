import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import TerritoryKPIs from '@/components/dashboard/territorios/TerritoryKPIs';
import { Sparkles, BarChart2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { ChangeAnalysis, TerritoryHeader } from '@/components/dashboard/territorios/CockpitComponents';
import { ConfidenceBadge } from '@/components/dashboard/territorios/EditorialComponents';

export default async function VisaoGeralPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;

  const { integratedAnalysis } = dossier;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      
      <TerritoryHeader 
        cityName={dossier.cityName}
        uf={dossier.uf}
        ibgeCode={dossier.ibgeCode}
        population={dossier.kpis.population}
        lastUpdated={dossier.lastUpdated}
      />
      
      {/* 01 - RESUMO EXECUTIVO */}
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={20} className="text-cyan-400" />
            Resumo Executivo
          </h2>
          <ConfidenceBadge level="ALTA" reasoning="Análise baseada na convergência de dados consolidados do IBGE, TSE e Segurança." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Síntese Estratégica</h3>
            <div className="space-y-4 text-[15px] font-medium text-slate-200 leading-relaxed">
              {integratedAnalysis.executiveSummary.map((p, pIdx) => (
                <p key={pIdx}>{p}</p>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Diagnóstico Rápido</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickPill label="Humor" value={integratedAnalysis.quickRead.mood} color="text-amber-400 border-amber-500/20 bg-amber-500/10" />
              <QuickPill label="Maior Pressão" value={integratedAnalysis.quickRead.pressure} color="text-rose-400 border-rose-500/20 bg-rose-500/10" />
              <QuickPill label="Maior Ativo" value={integratedAnalysis.quickRead.asset} color="text-emerald-400 border-emerald-500/20 bg-emerald-500/10" />
              <QuickPill label="Oportunidade" value={integratedAnalysis.quickRead.opportunity} color="text-cyan-400 border-cyan-500/20 bg-cyan-500/10" />
            </div>
            
            <div className="pt-4 mt-4 border-t border-white/5">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ShieldAlert size={12} />
                Implicações Políticas
              </h4>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">
                {integratedAnalysis.politicalImplications.paragraphs[1]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 02 - O QUE MUDOU */}
      <ChangeAnalysis 
        whatChanged={dossier.diagnostic.whatChanged}
        improving={dossier.diagnostic.improving}
        worsening={dossier.diagnostic.worsening}
      />

      {/* 03 - NAVEGAÇÃO DOS CADERNOS */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart2 size={16} className="text-cyan-400" />
          Aprofundar nos Cadernos Temáticos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <DeepLink href={`/dashboard/territorios/${ibge}/demografia`} label="Demografia" active />
          <DeepLink href={`/dashboard/territorios/${ibge}/eleicoes`} label="Eleições" active />
          <DeepLink href={`/dashboard/territorios/${ibge}/seguranca`} label="Segurança" active />
          <DeepLink href={`/dashboard/territorios/${ibge}/saude`} label="Saúde" active />
          <DeepLink href={`/dashboard/territorios/${ibge}/economia`} label="Economia" active />
          <DeepLink href={`/dashboard/territorios/${ibge}/inteligencia-ia`} label="Briefing IA" highlight />
        </div>
      </div>
      
      {/* 04 - METRICS & STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TerritoryKPIs data={dossier.kpis} />
        
        {/* Painel de Cobertura */}
        <div className="bg-[#111726] border border-white/5 rounded-xl p-5 md:p-6 h-full flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Cobertura de Dados</h3>
          <div className="space-y-3 flex-1">
            <CoverageItem name="Censo IBGE" status={dossier.coverage.ibge} />
            <CoverageItem name="TSE" status={dossier.coverage.electoral} />
            <CoverageItem name="Segurança (SEJUSP)" status={dossier.coverage.security} />
            <CoverageItem name="Saúde (DATASUS)" status={dossier.coverage.health} />
            <CoverageItem name="Economia (CAGED)" status={dossier.coverage.economy} />
          </div>
          <p className="text-[10px] font-medium text-slate-500 mt-6 text-center border-t border-white/5 pt-4">
            Dados sinalizados como "Demonstrativo" não representam a realidade e servem apenas para validação de interface.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickPill({ label, value, color }: { label: string; value: string; color: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#0B0F19] border border-white/5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${color} truncate`}>
        {value}
      </span>
    </div>
  );
}

function CoverageItem({ name, status }: { name: string; status: string }) {
  const isReal = status === 'real';
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
      <span className="text-xs font-medium text-slate-300">{name}</span>
      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
        isReal ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
      }`}>
        {isReal ? 'Real' : 'Demonstrativo'}
      </span>
    </div>
  );
}

function DeepLink({ href, label, active = false, highlight = false }: { href: string; label: string; active?: boolean; highlight?: boolean }) {
  return (
    <Link href={href} className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-center border ${
      highlight ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20' : 
      active ? 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20' : 
      'bg-transparent text-slate-500 border-white/5 hover:text-slate-300 cursor-not-allowed opacity-50'
    }`}>
      {label}
    </Link>
  );
}
