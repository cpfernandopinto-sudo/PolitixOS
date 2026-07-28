import { AlertTriangle, TrendingUp, Flame, Users, ArrowLeftRight, Sparkles, ExternalLink } from 'lucide-react';
import type { ExecutiveSynthesis, ExecutiveSynthesisField } from '@/lib/analytics/executive-summary';

interface Props {
  synthesis: ExecutiveSynthesis;
}

const FIELD_META: Array<{
  key: keyof ExecutiveSynthesis;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'estadoGeral', label: 'Estado Geral', icon: <Sparkles size={16} className="text-cyan-400" /> },
  { key: 'principalRisco', label: 'Principal Risco', icon: <AlertTriangle size={16} className="text-red-400" /> },
  { key: 'principalOportunidade', label: 'Principal Oportunidade', icon: <TrendingUp size={16} className="text-green-400" /> },
  { key: 'temaEmDestaque', label: 'Tema em Destaque', icon: <Flame size={16} className="text-orange-400" /> },
  { key: 'maiorExposicao', label: 'Maior Exposição', icon: <Users size={16} className="text-purple-400" /> },
  { key: 'mudancaRelevante', label: 'Mudança Relevante', icon: <ArrowLeftRight size={16} className="text-blue-400" /> },
];

function SummaryTile({ label, icon, field }: { label: string; icon: React.ReactNode; field: ExecutiveSynthesisField }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
      </div>

      {field.semDados ? (
        <p className="text-sm text-gray-500 italic">Dados insuficientes para síntese</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-white leading-snug">{field.valor}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{field.justificativa}</p>
          {field.limitacoes && <p className="text-[10px] text-gray-600 italic">{field.limitacoes}</p>}
          {field.evidenceRefs.length > 0 && field.evidenceRefs[0].url && (
            <a
              href={field.evidenceRefs[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider mt-1"
            >
              Ver evidência <ExternalLink size={10} />
            </a>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Síntese executiva do período — 6 campos determinísticos compostos em
 * lib/analytics/executive-summary.ts#composeExecutiveSynthesis. Nenhuma
 * frase aqui é gerada por IA; todo texto vem de template determinístico
 * a partir dos dados reais.
 */
export default function ExecutiveScenarioSummary({ synthesis }: Props) {
  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
      <h2 className="text-white font-bold text-lg tracking-tight mb-4">Síntese do Cenário</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {FIELD_META.map(({ key, label, icon }) => (
          <SummaryTile key={key} label={label} icon={icon} field={synthesis[key]} />
        ))}
      </div>
    </div>
  );
}
