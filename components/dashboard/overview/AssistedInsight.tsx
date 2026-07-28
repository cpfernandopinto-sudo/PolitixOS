'use client';

import { useState, useTransition } from 'react';
import {
  Sparkles, Loader2, RefreshCw, Copy, Check, AlertTriangle, ShieldQuestion,
  TrendingUp, HelpCircle, Info,
} from 'lucide-react';
import { generateExecutiveInsight } from '@/lib/actions/analytics-insight';
import type { AssistedInsightResult } from '@/lib/ai/analytics-schema';

interface Props {
  candidate: string | null;
  period: string | null;
}

const CONFIDENCE_LABEL: Record<'baixa' | 'media' | 'alta', string> = {
  baixa: 'Confiança baixa',
  media: 'Confiança média',
  alta: 'Confiança alta',
};
const CONFIDENCE_STYLE: Record<'baixa' | 'media' | 'alta', string> = {
  baixa: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  media: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  alta: 'bg-green-500/10 text-green-400 border-green-500/30',
};

function EvidenceChips({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {ids.map((id) => (
        <span key={id} className="text-[9px] font-mono bg-white/5 text-gray-500 px-1.5 py-0.5 rounded border border-white/5">
          {id}
        </span>
      ))}
    </div>
  );
}

/**
 * Leitura Analítica Assistida (Sprint 4) — bloco de IA sob demanda,
 * posicionado DEPOIS da síntese determinística (nunca antes). Nunca chama
 * o modelo automaticamente: só ao clicar em "Gerar leitura analítica".
 * A metodologia determinística continua sendo a fonte primária — este
 * bloco apenas explica, nunca substitui, os cálculos de
 * lib/analytics/executive-summary.ts.
 */
export default function AssistedInsight({ candidate, period }: Props) {
  const [result, setResult] = useState<AssistedInsightResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showLimitationsInfo, setShowLimitationsInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = isPending ? 'gerando' : result?.status ?? 'nao_gerado';

  const handleGenerate = (forceRefresh = false) => {
    startTransition(async () => {
      const res = await generateExecutiveInsight({ candidate, period, forceRefresh });
      setResult(res);
    });
  };

  const handleCopy = () => {
    if (!result?.output) return;
    const { output } = result;
    const text = [
      output.resumo,
      '',
      'Pontos principais:',
      ...output.pontosPrincipais.map((p) => `- ${p}`),
      '',
      'O que ainda não é possível concluir:',
      ...output.naoEpossivelConcluir.map((p) => `- ${p}`),
    ].join('\n');
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151b2e] border border-cyan-500/10 rounded-xl p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
          <Sparkles size={18} className="text-cyan-400" />
          Leitura Analítica Assistida
        </h3>
        <button
          type="button"
          onClick={() => setShowLimitationsInfo((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider"
        >
          <HelpCircle size={12} /> Entenda as limitações
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Explicação gerada por IA a partir da síntese determinística acima — nunca a substitui. Gerada somente sob demanda.
      </p>

      {showLimitationsInfo && (
        <div className="mb-4 bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-gray-400 space-y-1.5">
          <p>• A leitura assistida só usa os dados já calculados na síntese determinística acima — nunca busca dados novos.</p>
          <p>• Hipóteses são possibilidades não confirmadas, nunca fatos.</p>
          <p>• Nenhuma conclusão aqui é previsão eleitoral, recomendação de voto ou opinião política.</p>
          <p>• Evidências citadas referenciam apenas itens já exibidos nesta tela (riscos, oportunidades, temas, entidades).</p>
        </div>
      )}

      {status === 'nao_gerado' && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <p className="text-sm text-gray-500">Nenhuma leitura gerada para este período e filtros ainda.</p>
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-colors"
          >
            <Sparkles size={14} /> Gerar leitura analítica
          </button>
        </div>
      )}

      {status === 'gerando' && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin text-cyan-400" />
          <p className="text-sm">Gerando leitura analítica…</p>
        </div>
      )}

      {status === 'dados_insuficientes' && (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-gray-500">
          <ShieldQuestion size={22} />
          <p className="text-sm">Dados insuficientes no período selecionado para gerar uma leitura confiável.</p>
        </div>
      )}

      {status === 'indisponivel' && (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-gray-500">
          <AlertTriangle size={22} className="text-yellow-500" />
          <p className="text-sm">Leitura analítica assistida indisponível neste ambiente.</p>
          {result?.error && <p className="text-xs text-gray-600">{result.error}</p>}
          <p className="text-xs text-gray-600">A Visão Geral determinística acima continua completa e funcional.</p>
        </div>
      )}

      {status === 'erro' && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <AlertTriangle size={22} className="text-red-500" />
          <p className="text-sm text-gray-400">{result?.error || 'Não foi possível gerar a leitura analítica.'}</p>
          <button
            type="button"
            onClick={() => handleGenerate(true)}
            className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {status === 'disponivel' && result?.output && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
              Gerado por IA com base em dados monitorados
            </span>
            <span className={`px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${CONFIDENCE_STYLE[result.output.confianca]}`}>
              {CONFIDENCE_LABEL[result.output.confianca]}
            </span>
            <span className="text-gray-600">
              {result.generatedAt && new Date(result.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Resumo</h4>
            <p className="text-sm text-gray-200 leading-relaxed">{result.output.resumo}</p>
          </div>

          {result.output.pontosPrincipais.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Pontos principais</h4>
              <ul className="space-y-1">
                {result.output.pontosPrincipais.map((p, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-cyan-400 mt-2 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.output.riscosInterpretados.length > 0 && (
            <div className="border-l-2 border-red-500/40 pl-3">
              <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Riscos interpretados</h4>
              {result.output.riscosInterpretados.map((r, i) => (
                <div key={i} className="mb-2">
                  <p className="text-sm text-gray-300">{r.texto}</p>
                  <EvidenceChips ids={r.evidenciaIds} />
                </div>
              ))}
            </div>
          )}

          {result.output.oportunidadesInterpretadas.length > 0 && (
            <div className="border-l-2 border-green-500/40 pl-3">
              <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1.5">Oportunidades interpretadas</h4>
              {result.output.oportunidadesInterpretadas.map((o, i) => (
                <div key={i} className="mb-2">
                  <p className="text-sm text-gray-300">{o.texto}</p>
                  <EvidenceChips ids={o.evidenciaIds} />
                </div>
              ))}
            </div>
          )}

          {result.output.hipoteses.length > 0 && (
            <div className="border-l-2 border-purple-500/40 border-dashed pl-3">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <TrendingUp size={11} /> Hipóteses (não confirmadas)
              </h4>
              {result.output.hipoteses.map((h, i) => (
                <div key={i} className="mb-2">
                  <p className="text-sm text-gray-300 italic">{h.texto}</p>
                  <EvidenceChips ids={h.evidenciaIds} />
                </div>
              ))}
            </div>
          )}

          <div className="bg-white/5 border border-white/5 rounded-lg p-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Info size={11} /> O que ainda não é possível concluir
            </h4>
            <ul className="space-y-1">
              {result.output.naoEpossivelConcluir.map((p, i) => (
                <li key={i} className="text-xs text-gray-500">• {p}</li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
            >
              <RefreshCw size={11} /> Atualizar análise
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-200 uppercase tracking-wider"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copiado' : 'Copiar síntese'}
            </button>
            <span className="text-[10px] text-gray-600 ml-auto">
              {result.output.evidenciasCitadas.length} evidência(s) citada(s) · metodologia {result.methodologyVersion}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
