'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ShieldQuestion, CheckCircle2 } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import type { PoliticalStatusResult } from '@/lib/analytics/political-status';

interface Props {
  status: PoliticalStatusResult;
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
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Minus size={12} /> Estável vs. período anterior
      </span>
    );
  }
  const Icon = direcao === 'up' ? ArrowUpRight : ArrowDownRight;
  const color = direcao === 'up' ? 'text-orange-400' : 'text-cyan-400';
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} /> {Math.abs(variacaoPercentual)}% vs. período anterior
    </span>
  );
}

/**
 * Estado Político (Sprint 3; redesign Sprint UX — Etapa 3). Classificação
 * vem de lib/analytics/political-status.ts (função pura, testada
 * isoladamente) — esta etapa é só de layout, nenhum cálculo mudou.
 *
 * Hierarquia executiva nova: status grande em destaque → índice (barra
 * fina, mesmo `status.score` de antes) → lista compacta de fatores com
 * ícone. O gauge (GaugeChart, compartilhado com Notícias/Instagram/X) saiu
 * do card: o Termômetro de Crise Master ao lado já mostra um gauge com o
 * mesmo tipo de leitura — repeti-lo aqui era o principal gerador do espaço
 * vazio identificado nesta etapa. Estrutura do wrapper (padding, borda,
 * raio) agora idêntica à de OverviewGauge.tsx, para os dois cards lerem
 * como um único painel dividido em dois módulos.
 */
export default function PoliticalStatusCard({ status }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  if (status.semDados) {
    return (
      <div className="surface-primary p-5 h-full flex flex-col items-center justify-center text-center gap-3 min-h-[240px]">
        <ShieldQuestion size={28} className="text-slate-600" aria-hidden="true" />
        <p className="text-slate-400 text-sm">Dados insuficientes para calcular o estado político no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="surface-primary p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-white font-bold text-base tracking-tight">Estado Político</h3>
        <button
          type="button"
          onClick={() => setShowMethodology(true)}
          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/60 rounded"
        >
          Entenda o cálculo
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">Detalhamento e fatores que compõem a classificação executiva.</p>

      {/* Abaixo de 1024px: empilhado (status/índice, depois divisória
          horizontal, depois fatores) — igual à Etapa 3. Em 1024px+: duas
          zonas lado a lado (42%/58%) com divisória vertical sutil, para
          aproveitar a largura do card em vez de concentrar tudo à
          esquerda. Nenhum dado/cálculo muda — só o agrupamento visual. */}
      <div className="flex-1 flex flex-col lg:flex-row lg:items-center min-h-0">
        {/* Zona esquerda (~42% em desktop): título já está acima; aqui só
            status, variação e índice. */}
        <div className="lg:w-[42%] lg:pr-6 lg:border-r lg:border-white/[0.08] flex flex-col justify-center">
          {/* Status grande — elemento de maior destaque do card. Tamanho
              reduzido ~8% (36px → 33px) para não competir tanto com o
              valor central do Termômetro ao lado. */}
          <div className={`text-[33px] font-black tracking-tight leading-none uppercase ${SEVERITY_TEXT[status.severidade]}`}>
            {status.label}
          </div>
          {status.variacao && (
            <div className="mt-2">
              <TrendIndicator direcao={status.variacao.direcao} variacaoPercentual={status.variacao.variacaoPercentual} />
            </div>
          )}

          {/* Índice — mesmo status.score de antes, barra fina em vez de gauge próprio. */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-label">Índice</span>
              <span className="text-xs font-bold text-slate-300">{status.score}/100</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden" role="progressbar" aria-valuenow={status.score} aria-valuemin={0} aria-valuemax={100} aria-label="Índice do Estado Político">
              <div className={`h-full rounded-full ${SEVERITY_BAR[status.severidade]}`} style={{ width: `${status.score}%` }} />
            </div>
          </div>
        </div>

        {/* Zona direita (~58% em desktop): fatores — lista compacta, um
            ícone por item (mesmo status.fatores de antes), nunca cards. */}
        <ul className="mt-4 pt-3 border-t border-white/[0.08] space-y-1.5 lg:mt-0 lg:pt-0 lg:border-t-0 lg:pl-6 lg:w-[58%] lg:space-y-2.5 lg:flex lg:flex-col lg:justify-center">
          {status.fatores.map((fator, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
              <CheckCircle2 size={13} className="text-cyan-400/80 mt-0.5 shrink-0" aria-hidden="true" />
              {fator}
            </li>
          ))}
        </ul>
      </div>

      <Drawer
        open={showMethodology}
        onClose={() => setShowMethodology(false)}
        title="Como o Estado Político é calculado"
        subtitle="Metodologia e evidências"
      >
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Regra</h4>
          <p className="text-sm text-slate-200 bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 leading-relaxed">
            {status.justificativa}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Score atual</div>
            <div className="text-sm text-white font-medium">{status.score}/100</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Classificação</div>
            <div className="text-sm text-white font-medium">{status.label}</div>
          </div>
        </div>

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

        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fatores considerados</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            {status.fatores.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
        </div>

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
    </div>
  );
}
