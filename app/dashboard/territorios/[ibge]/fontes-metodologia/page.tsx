import React from 'react';
import { ShieldCheck, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function FontesMetodologiaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
        <ShieldCheck className="w-10 h-10 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Evidências e Metodologia</h1>
          <p className="text-slate-400">Rastreabilidade completa das fontes utilizadas e metodologia de análise.</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">Cobertura por Motor</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="p-3 rounded-tl-lg font-medium">Motor</th>
                <th className="p-3 font-medium">Fonte</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Cobertura Real</th>
                <th className="p-3 rounded-tr-lg font-medium">Cobertura Demo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="p-3 font-medium text-slate-200">Motor IBGE</td>
                <td className="p-3">IBGE Sidra + Censo</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Integrado
                  </span>
                </td>
                <td className="p-3">100%</td>
                <td className="p-3 text-slate-500">—</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Motor Segurança</td>
                <td className="p-3">SEJUSP MG</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Integrado
                  </span>
                </td>
                <td className="p-3">80%</td>
                <td className="p-3 text-amber-400">20%</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Motor TSE</td>
                <td className="p-3">TSE API 5.3</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" />
                    Arquitetado
                  </span>
                </td>
                <td className="p-3">0%</td>
                <td className="p-3 text-amber-400">100%</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Motor DATASUS</td>
                <td className="p-3">DataSUS</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Mapeado
                  </span>
                </td>
                <td className="p-3">0%</td>
                <td className="p-3 text-amber-400">100%</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-200">Motor CAGED/RAIS</td>
                <td className="p-3">MTE</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" />
                    Arquitetado
                  </span>
                </td>
                <td className="p-3">0%</td>
                <td className="p-3 text-amber-400">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">Cobertura por Caderno</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Visão Geral</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: '60%' }}></div>
              <div className="bg-amber-500 h-full" style={{ width: '40%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 60%</span>
              <span>Demo 40%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Segurança</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: '80%' }}></div>
              <div className="bg-amber-500 h-full" style={{ width: '20%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 80%</span>
              <span>Demo 20%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Saúde</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Eleições</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Economia</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Emprego</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Educação</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Infraestrutura</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Mobilidade</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Desenv. Social</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Finanças</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Amb. Político</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">Radar</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DEMO</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Real 0%</span>
              <span>Demo 100%</span>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">Metodologia de Classificação</h2>
        <div className="space-y-4 text-slate-300">
          <p>
            <strong className="text-slate-100">FATO:</strong> Informação bruta e direta extraída das fontes de dados, sem processamento analítico (ex: &quot;População de 603 mil habitantes&quot;).
          </p>
          <p>
            <strong className="text-slate-100">MÉTRICA DERIVADA:</strong> Cálculo ou índice criado a partir do cruzamento de dois ou mais fatos (ex: &quot;Densidade demográfica&quot;, &quot;Renda per capita&quot;).
          </p>
          <p>
            <strong className="text-slate-100">INTERPRETAÇÃO:</strong> Análise de tendência ou contexto sobre uma métrica ou fato (ex: &quot;Crescimento populacional abaixo da média estadual&quot;).
          </p>
          <p>
            <strong className="text-slate-100">HIPÓTESE:</strong> Projeção ou recomendação gerada pela IA com base no conjunto de dados (ex: &quot;Potencial demanda por vagas em creches na região X&quot;).
          </p>
        </div>
      </div>
    </div>
  );
}
