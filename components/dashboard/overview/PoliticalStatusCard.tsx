'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ShieldQuestion } from 'lucide-react';
import GaugeChart from '@/components/charts/GaugeChart';
import Drawer from '@/components/ui/Drawer';
import type { PoliticalStatusResult } from '@/lib/analytics/political-status';

interface Props {
  status: PoliticalStatusResult;
}

const SEVERITY_LEVEL: Record<PoliticalStatusResult['severidade'], 'success' | 'warning' | 'danger'> = {
  baixo: 'success',
  medio: 'warning',
  alto: 'warning',
  critico: 'danger',
};

const SEVERITY_STYLES: Record<PoliticalStatusResult['severidade'], string> = {
  baixo: 'border-l-green-500 bg-green-500/5',
  medio: 'border-l-yellow-500 bg-yellow-500/5',
  alto: 'border-l-orange-500 bg-orange-500/5',
  critico: 'border-l-red-500 bg-red-500/5',
};

function TrendIndicator({ direcao, variacaoPercentual }: { direcao: 'up' | 'down' | 'stable'; variacaoPercentual: number }) {
  if (direcao === 'stable') {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
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
 * Evolução executiva do Termômetro de Crise (Sprint 3). Reaproveita o
 * mesmo GaugeChart já usado em notícias/Instagram/X para o visual — não
 * introduz biblioteca nova. A classificação vem de
 * lib/analytics/political-status.ts (função pura, testada isoladamente).
 */
export default function PoliticalStatusCard({ status }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  if (status.semDados) {
    return (
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center gap-3 min-h-[280px]">
        <ShieldQuestion size={28} className="text-gray-600" />
        <p className="text-gray-400 text-sm">Dados insuficientes para calcular o estado político no período selecionado.</p>
      </div>
    );
  }

  return (
    <div className={`bg-[#1A1A1A] border border-white/5 border-l-4 rounded-xl p-6 h-full flex flex-col ${SEVERITY_STYLES[status.severidade]}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-white font-bold text-lg tracking-tight">Estado Político</h3>
        <button
          type="button"
          onClick={() => setShowMethodology(true)}
          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider transition-colors"
        >
          Entenda o cálculo
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-32 shrink-0 -my-4">
          <GaugeChart score={status.score} level={SEVERITY_LEVEL[status.severidade]} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-black text-white tracking-tight">{status.label}</div>
          {status.variacao && <TrendIndicator direcao={status.variacao.direcao} variacaoPercentual={status.variacao.variacaoPercentual} />}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 flex-1">
        {status.fatores.map((fator, i) => (
          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-gray-600 mt-1.5 shrink-0" />
            {fator}
          </li>
        ))}
      </ul>

      <Drawer
        open={showMethodology}
        onClose={() => setShowMethodology(false)}
        title="Como o Estado Político é calculado"
        subtitle="Metodologia e evidências"
      >
        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Regra</h4>
          <p className="text-sm text-gray-200 bg-white/5 border border-white/5 rounded-lg p-4 leading-relaxed">
            {status.justificativa}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Score atual</div>
            <div className="text-sm text-white font-medium">{status.score}/100</div>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Classificação</div>
            <div className="text-sm text-white font-medium">{status.label}</div>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Thresholds</h4>
          <ul className="text-xs text-gray-400 space-y-1 bg-white/5 border border-white/5 rounded-lg p-4">
            <li>Score &gt; 75 → Crítico</li>
            <li>Score &gt; 50 → Tensão elevada</li>
            <li>Score &gt; 25 → Atenção</li>
            <li>Score ≤ 25 → Estável</li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Janela temporal</h4>
          <p className="text-xs text-gray-400">Período selecionado nos filtros da Visão Geral. A variação (quando exibida) compara com o período imediatamente anterior de mesma duração.</p>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fatores considerados</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            {status.fatores.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Limitações</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            O score é um indicador sintético — não substitui a leitura das evidências individuais (notícias, posts e alertas). Não representa opinião, previsão eleitoral ou recomendação política.
          </p>
        </div>

        <p className="text-[10px] text-gray-600">
          Regras detalhadas dos alertas que alimentam este score: <code>docs/REGRAS_ALERTAS_POLITIXOS.md</code> e <code>docs/METODOLOGIA_CENTRO_EXECUTIVO.md</code>.
        </p>
      </Drawer>
    </div>
  );
}
