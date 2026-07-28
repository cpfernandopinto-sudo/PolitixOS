import { AlertTriangle, TrendingUp, Flame, Users, ArrowLeftRight, Sparkles, ExternalLink } from 'lucide-react';
import type { ExecutiveSynthesis, ExecutiveSynthesisField } from '@/lib/analytics/executive-summary';

interface Props {
  synthesis: ExecutiveSynthesis;
}

const PRIMARY_FIELD_META: Array<{
  key: keyof ExecutiveSynthesis;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'estadoGeral', label: 'Estado Geral', icon: <Sparkles size={18} className="text-cyan-400" /> },
  { key: 'principalRisco', label: 'Principal Risco', icon: <AlertTriangle size={18} className="text-red-400" /> },
];

const SECONDARY_FIELD_META: Array<{
  key: keyof ExecutiveSynthesis;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'principalOportunidade', label: 'Principal Oportunidade', icon: <TrendingUp size={14} className="text-teal-400" /> },
  { key: 'temaEmDestaque', label: 'Tema em Destaque', icon: <Flame size={14} className="text-orange-400" /> },
  { key: 'maiorExposicao', label: 'Maior Exposição', icon: <Users size={14} className="text-purple-400" /> },
  { key: 'mudancaRelevante', label: 'Mudança Relevante', icon: <ArrowLeftRight size={14} className="text-blue-400" /> },
];

function PrimaryTile({ label, icon, field }: { label: string; icon: React.ReactNode; field: ExecutiveSynthesisField }) {
  return (
    <div className="bg-white/[0.04] border border-white/5 rounded-xl p-5 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-label">{label}</span>
      </div>

      {field.semDados ? (
        <p className="text-sm text-gray-500 italic">Dados insuficientes para síntese</p>
      ) : (
        <>
          <p className="text-lg font-bold text-white leading-snug">{field.valor}</p>
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

function SecondaryTile({ label, icon, field }: { label: string; icon: React.ReactNode; field: ExecutiveSynthesisField }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3.5 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-label">{label}</span>
      </div>

      {field.semDados ? (
        <p className="text-xs text-gray-500 italic">Dados insuficientes para síntese</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-white leading-snug truncate">{field.valor}</p>
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{field.justificativa}</p>
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
 *
 * Sprint 5: hierarquia em dois níveis — Estado Geral e Principal Risco em
 * destaque (nível 1, mesmo peso que o resto do hero), os outros 4 campos
 * como tiles secundários menores (nível 2) — evita a "parede de 6 cards
 * iguais" identificada em docs/AUDITORIA_VISUAL_SPRINT_5.md (achado #3).
 */
export default function ExecutiveScenarioSummary({ synthesis }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRIMARY_FIELD_META.map(({ key, label, icon }) => (
          <PrimaryTile key={key} label={label} icon={icon} field={synthesis[key]} />
        ))}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {SECONDARY_FIELD_META.map(({ key, label, icon }) => (
          <SecondaryTile key={key} label={label} icon={icon} field={synthesis[key]} />
        ))}
      </div>
    </div>
  );
}
