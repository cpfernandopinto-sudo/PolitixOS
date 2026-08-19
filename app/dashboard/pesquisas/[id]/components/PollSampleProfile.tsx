'use client';

import { useState } from 'react';
import type { ExtractedPollMetadata, SampleProfileItem } from '@/lib/pesquisas/types';
import { Users2, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface Props {
  metadata: ExtractedPollMetadata;
  rawPlanoAmostral: string | null;
}

function MiniBarGroup({ title, items }: { title: string; items: SampleProfileItem[] }) {
  const maxPct = Math.max(...items.map((i) => i.percentage), 100);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">{title}</h4>
      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const widthPct = Math.min(Math.max((item.percentage / maxPct) * 100, 4), 100);
          return (
            <div key={idx} className="flex items-center text-xs gap-3">
              <span className="w-28 truncate text-gray-400 text-[11px]" title={item.label}>
                {item.label}
              </span>
              <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono font-medium text-white text-[11px]">
                {item.percentage.toFixed(1).replace('.', ',')}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PollSampleProfile({ metadata, rawPlanoAmostral }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);

  const gender = metadata.genderDistribution?.value;
  const age = metadata.ageDistribution?.value;
  const edu = metadata.educationDistribution?.value;
  const income = metadata.incomeDistribution?.value;

  const hasStructuredData = Boolean(gender || age || edu || income);

  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <Users2 size={16} className="text-blue-400" />
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Perfil da Amostra</h3>
          </div>
          {hasStructuredData && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
              Extração conservadora
            </span>
          )}
        </div>

        {hasStructuredData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gender && <MiniBarGroup title="Sexo / Gênero" items={gender} />}
            {age && <MiniBarGroup title="Faixa Etária" items={age} />}
            {edu && <MiniBarGroup title="Escolaridade" items={edu} />}
            {income && <MiniBarGroup title="Nível de Renda" items={income} />}
          </div>
        ) : (
          <div className="py-6 px-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-2">
            <p className="text-sm text-gray-400 font-medium">Detalhamento não estruturado no registro.</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              O registro oficial TSE contém o plano amostral em prosa textual sem tabela atômica normalizada.
            </p>
          </div>
        )}
      </div>

      {rawPlanoAmostral && (
        <div className="pt-3 border-t border-white/5 mt-4">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg bg-white/5"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} className="text-blue-400" />
              {showOriginal ? 'Ocultar plano amostral completo' : 'Ver plano amostral completo (texto oficial)'}
            </span>
            {showOriginal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showOriginal && (
            <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
              {rawPlanoAmostral}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
