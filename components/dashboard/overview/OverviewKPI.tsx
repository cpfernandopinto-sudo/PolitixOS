'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Thermometer, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Info, ChevronRight, Vote } from 'lucide-react';
import type { PoliticalStatusResult } from '@/lib/analytics/political-status';
import Drawer from '@/components/ui/Drawer';

export interface ElectoralPollSignalKPI {
  movementPp: number | null;
  currentPercentage: number | null;
  label?: string | null;
  comparability: 'sufficient' | 'insufficient';
  confidence?: 'baixa' | 'media' | 'alta';
  pollCount?: number | null;
  leader?: string | null;
}

interface KPIProps {
  score_geral: number;
  temperatura_geral: string;
  tendencia: string;
  alertas_ativos: number;
  volume_total: number;
  politicalStatus: PoliticalStatusResult;
  pesquisasSignal?: ElectoralPollSignalKPI | null;
}

const SEVERITY_TEXT: Record<PoliticalStatusResult['severidade'], string> = {
  baixo: 'text-green-400',
  medio: 'text-yellow-400',
  alto: 'text-orange-400',
  critico: 'text-red-400',
};

const SEVERITY_BAR: Record<PoliticalStatusResult['severidade'], string> = {
  baixo: 'bg-green-500',
  medio: 'bg-yellow-500',
  alto: 'bg-orange-500',
  critico: 'bg-red-500',
};

function TrendIndicator({ direcao, variacaoPercentual }: { direcao: 'up' | 'down' | 'stable'; variacaoPercentual: number }) {
  if (direcao === 'stable') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-slate-400">
        <Minus size={10} /> Estável vs. período anterior
      </span>
    );
  }
  const Icon = direcao === 'up' ? ArrowUpRight : ArrowDownRight;
  const color = direcao === 'up' ? 'text-orange-400' : 'text-cyan-400';
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${color}`}>
      <Icon size={10} /> {Math.abs(variacaoPercentual)}% vs. período anterior
    </span>
  );
}

export default function OverviewKPI({
  score_geral,
  temperatura_geral,
  tendencia,
  alertas_ativos,
  volume_total,
  politicalStatus,
  pesquisasSignal,
}: KPIProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  // Add a slight delay to close so it doesn't flicker when moving mouse to popover
  const [isHovered, setIsHovered] = useState(false);

  const getTempColor = (t: string) => {
    switch (t) {
      case 'crítica': return 'text-red-500';
      case 'quente': return 'text-orange-500';
      case 'morna': return 'text-yellow-500';
      default: return 'text-cyan-400';
    }
  };

  const getTempBgColor = (t: string) => {
    switch (t) {
      case 'crítica': return 'bg-red-500';
      case 'quente': return 'bg-orange-500';
      case 'morna': return 'bg-yellow-500';
      default: return 'bg-cyan-500';
    }
  };

  const getTrendIcon = (t: string) => {
    switch (t) {
      case 'subindo': return <TrendingUp className="text-green-400" size={16} />;
      case 'caindo': return <TrendingDown className="text-red-400" size={16} />;
      default: return <Minus className="text-slate-400" size={16} />;
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        {/* 1. Estado Político — Agora consolidado com Popover Executivo */}
        <div
          className={`surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-cyan-400/30 transition-colors relative col-span-2 sm:col-span-1 lg:col-span-1 bg-gradient-to-br from-white/[0.04] to-transparent cursor-pointer ${isHovered ? 'z-50' : 'z-10'}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={() => setIsHovered(false)}
          tabIndex={0}
          role="button"
          aria-label="Ver detalhes do Estado Político"
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wider truncate flex items-center gap-1.5">
              Estado Político
              <Info size={10} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </span>
            <Activity className="text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity shrink-0 animate-pulse" size={16} />
          </div>
          <div className="flex flex-col mb-1.5">
            <div className="flex items-baseline justify-between">
              <div className={`text-2xl font-black uppercase tracking-tight leading-none ${politicalStatus.semDados ? 'text-slate-500' : SEVERITY_TEXT[politicalStatus.severidade]}`}>
                {politicalStatus.semDados ? 'S/D' : politicalStatus.label}
              </div>
              {!politicalStatus.semDados && (
                <div className="text-[11px] text-slate-400 font-semibold bg-white/[0.05] px-1.5 py-0.5 rounded-sm">
                  {politicalStatus.score}/100
                </div>
              )}
            </div>
            {!politicalStatus.semDados && politicalStatus.variacao && (
              <div className="mt-1">
                <TrendIndicator direcao={politicalStatus.variacao.direcao} variacaoPercentual={politicalStatus.variacao.variacaoPercentual} />
              </div>
            )}
            {politicalStatus.semDados && (
              <div className="text-[10px] text-slate-500 font-medium truncate mt-1">Dados insuficientes</div>
            )}
          </div>
          {/* Accent Solid Line */}
          <div className="absolute bottom-0 left-0 h-1 w-full bg-white/[0.04] overflow-hidden">
            {!politicalStatus.semDados && (
              <div className={`h-full ${SEVERITY_BAR[politicalStatus.severidade]}`} style={{ width: `${politicalStatus.score}%` }} />
            )}
          </div>

          {/* POPOVER EXECUTIVO */}
          {isHovered && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[320px] bg-[#0E1524] border border-white/[0.12] rounded-lg shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-white/[0.08] flex items-start justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estado Político</h4>
                  <div className={`text-lg font-black uppercase tracking-tight leading-none ${politicalStatus.semDados ? 'text-slate-500' : SEVERITY_TEXT[politicalStatus.severidade]}`}>
                    {politicalStatus.semDados ? 'Sem Dados' : politicalStatus.label}
                  </div>
                </div>
                {!politicalStatus.semDados && (
                  <div className="text-xs font-bold text-slate-300 bg-white/[0.05] px-2 py-1 rounded">
                    Índice {politicalStatus.score}/100
                  </div>
                )}
              </div>

              {!politicalStatus.semDados ? (
                <div className="p-4 bg-white/[0.02]">
                  <ul className="space-y-2 text-xs text-slate-300">
                    {politicalStatus.fatores.map((fator, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-500 mt-0.5">•</span>
                        <span>{fator}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-4 text-xs text-slate-500 bg-white/[0.02]">
                  Não há evidências suficientes no período selecionado para compor a classificação.
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMethodology(true);
                  setIsHovered(false);
                }}
                className="w-full p-3 flex items-center justify-between text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors border-t border-white/[0.08]"
              >
                ENTENDA O CÁLCULO
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 2. Pesquisas Eleitorais */}
        <div
          className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-cyan-400/30 transition-colors relative overflow-hidden col-span-1"
          title="Sinal de evolução eleitoral baseado em séries metodologicamente comparáveis do TSE/PesqEle."
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Pesquisas</span>
            <Vote className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
          </div>
          {/* Linha principal: percentual ou movimento */}
          {pesquisasSignal ? (
            <div>
              {pesquisasSignal.comparability === 'sufficient' && pesquisasSignal.movementPp !== null ? (
                // Série comparável: mostra movimento em p.p.
                <div className={`text-xl font-bold font-mono leading-none ${pesquisasSignal.movementPp > 0 ? 'text-emerald-400' : pesquisasSignal.movementPp < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {pesquisasSignal.movementPp > 0 ? `+${pesquisasSignal.movementPp}` : `${pesquisasSignal.movementPp}`} <span className="text-xs font-normal">p.p.</span>
                </div>
              ) : pesquisasSignal.currentPercentage !== null ? (
                // Sem série mas com dado atual: mostra percentual
                <div className="text-xl font-bold font-mono leading-none text-cyan-300">
                  {pesquisasSignal.currentPercentage}% <span className="text-xs font-normal text-slate-500">intenção</span>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400 leading-none">Coletando...</div>
              )}
              <div className="text-[10px] text-slate-400 font-medium truncate mt-1">
                {pesquisasSignal.pollCount ? `${pesquisasSignal.pollCount} levant.` : ''}
                {pesquisasSignal.pollCount && pesquisasSignal.comparability === 'sufficient' ? ' · série compar.' : ''}
                {pesquisasSignal.pollCount && pesquisasSignal.comparability !== 'sufficient' ? ' · sem tendência' : ''}
                {!pesquisasSignal.pollCount && pesquisasSignal.currentPercentage !== null ? 'Último levantamento' : ''}
                {!pesquisasSignal.pollCount && pesquisasSignal.currentPercentage === null ? 'Aguardando dados' : ''}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-bold text-slate-500 leading-none">Sem dados</div>
              <div className="text-[10px] text-slate-600 font-medium truncate mt-1">Selecione um candidato</div>
            </div>
          )}
          {/* Accent Line */}
          <div className="absolute bottom-0 left-0 h-1 w-full bg-cyan-400/20">
            <div
              className={`h-full ${
                pesquisasSignal && pesquisasSignal.comparability === 'sufficient' && pesquisasSignal.movementPp !== null
                  ? pesquisasSignal.movementPp >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                  : 'bg-slate-600'
              }`}
              style={{ width: pesquisasSignal && pesquisasSignal.comparability === 'sufficient' ? '100%' : '30%' }}
            />
          </div>
        </div>

        {/* 3. Score de Saúde */}
        <div
          className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-cyan-400/30 transition-colors relative overflow-hidden col-span-1"
          title="Consolidação sintética operacional — inverso do risco consolidado usado no Estado Político e no Termômetro de Crise (100 − risco)."
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Saúde</span>
            <Activity className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
          </div>
          <div className="text-2xl font-bold text-white leading-none">
            {score_geral}
            <span className="text-xs text-slate-500 ml-1 font-normal">/100</span>
          </div>
          <div className="text-[10px] text-cyan-400/80 font-medium truncate mb-1">Consolidação sintética</div>
          {/* Accent Progress Line */}
          <div className="absolute bottom-0 left-0 h-1 w-full bg-cyan-400/20">
            <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${score_geral}%` }} />
          </div>
        </div>

        {/* 4. Temperatura */}
        <div
          className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-orange-400/30 transition-colors relative overflow-hidden col-span-1"
          title="Nível atual de tensão — rótulo qualitativo derivado do mesmo score de crise, sem a classificação executiva do Estado Político."
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Temperatura</span>
            <Thermometer className="text-orange-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
          </div>
          <div className={`text-2xl font-bold capitalize leading-none ${getTempColor(temperatura_geral)}`}>
            {temperatura_geral}
          </div>
          <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Nível de tensão</div>
          {/* Accent Solid Line */}
          <div className={`absolute bottom-0 left-0 h-1 w-full ${getTempBgColor(temperatura_geral)}`} />
        </div>

        {/* 5. Tendência */}
        <div
          className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-blue-400/30 transition-colors relative overflow-hidden col-span-1"
          title="Direção temporal do volume monitorado no período, comparado ao período imediatamente anterior."
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Tendência</span>
            {getTrendIcon(tendencia)}
          </div>
          <div className="text-2xl font-bold text-white capitalize leading-none">
            {tendencia}
          </div>
          <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Variação de volume</div>
        </div>

        {/* 6. Alertas */}
        <div
          className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-red-400/30 transition-colors relative overflow-hidden col-span-1"
          title="Volume de ocorrências relevantes (contagem) — a leitura de severidade fica em Riscos Prioritários e Alertas Prioritários."
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Alertas</span>
            <AlertTriangle className="text-red-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
          </div>
          <div className="text-2xl font-bold text-white leading-none">{alertas_ativos}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Ocorrências ativas</div>
        </div>

        {/* 7. Volume */}
        <div
          className="surface-primary px-4 py-3.5 h-[92px] flex flex-col justify-between group hover:border-purple-400/30 transition-colors relative overflow-hidden col-span-1"
          title="Dimensão bruta da base monitorada (notícias + posts) no período selecionado."
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Volume</span>
            <BarChart3 className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" size={16} />
          </div>
          <div className="text-2xl font-bold text-white leading-none">{volume_total.toLocaleString('pt-BR')}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate mb-1">Base monitorada</div>
        </div>
      </div>

      {/* DRAWER ENTENDA O CÁLCULO */}
      <Drawer
        open={showMethodology}
        onClose={() => setShowMethodology(false)}
        title="Como o Estado Político é calculado"
        subtitle="Metodologia e evidências"
      >
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Regra</h4>
          <p className="text-sm text-slate-200 bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 leading-relaxed">
            {politicalStatus.justificativa || 'Regra de classificação consolidada.'}
          </p>
        </div>

        {!politicalStatus.semDados && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Score atual</div>
              <div className="text-sm text-white font-medium">{politicalStatus.score}/100</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Classificação</div>
              <div className="text-sm text-white font-medium">{politicalStatus.label}</div>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Thresholds</h4>
          <ul className="text-xs text-slate-400 space-y-1 bg-white/[0.02] border border-white/[0.08] rounded-lg p-4">
            <li>Score &gt; 75 → Crítico</li>
            <li>Score &gt; 50 → Tensão elevada</li>
            <li>Score &gt; 25 → Atenção</li>
            <li>Score ≤ 25 → Estável</li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Janela temporal</h4>
          <p className="text-xs text-slate-400">Período selecionado nos filtros da Visão Geral. A variação (quando exibida) compara com o período imediatamente anterior de mesma duração.</p>
        </div>

        {politicalStatus.fatores && politicalStatus.fatores.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fatores considerados</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              {politicalStatus.fatores.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Limitações</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            O score é um indicador sintético — não substitui a leitura das evidências individuais (notícias, posts e alertas). Não representa opinião, previsão eleitoral ou recomendação política.
          </p>
        </div>

        <p className="text-[10px] text-slate-600">
          Regras detalhadas dos alertas que alimentam este score: <code>docs/REGRAS_ALERTAS_POLITIXOS.md</code> e <code>docs/METODOLOGIA_CENTRO_EXECUTIVO.md</code>.
        </p>
      </Drawer>
    </>
  );
}
