import { AlertTriangle, TrendingUp, Flame, Users, ArrowLeftRight, Sparkles, ExternalLink } from 'lucide-react';
import type { ExecutiveSynthesis, ExecutiveSynthesisField } from '@/lib/analytics/executive-summary';

interface Props {
  synthesis: ExecutiveSynthesis;
  /**
   * Versão compacta (hotfix de apresentação): mostra apenas 4 campos —
   * Estado Geral, Principal Risco, Principal Oportunidade, Mudança
   * Relevante — para caber lado a lado com o Termômetro de Crise e o
   * Estado Político na primeira linha ("Diagnóstico Executivo"). Tema em
   * Destaque e Maior Exposição continuam disponíveis na versão completa,
   * não removidos do sistema — apenas ocultos nesta variante compacta.
   */
  compact?: boolean;
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

const COMPACT_SECONDARY_KEYS: ReadonlyArray<keyof ExecutiveSynthesis> = ['principalOportunidade', 'mudancaRelevante'];

function PrimaryTile({ label, icon, field, compact }: { label: string; icon: React.ReactNode; field: ExecutiveSynthesisField; compact: boolean }) {
  return (
    <div className={`bg-blue-400/[0.06] border border-blue-300/10 rounded-xl flex flex-col gap-2 min-w-0 ${compact ? 'p-4' : 'p-5 gap-2.5'}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-label">{label}</span>
      </div>

      {field.semDados ? (
        <p className="text-sm text-slate-500 italic">Dados insuficientes para síntese</p>
      ) : (
        <>
          <p className={`font-bold text-white leading-snug ${compact ? 'text-base' : 'text-lg'}`}>{field.valor}</p>
          {!compact && <p className="text-xs text-slate-500 leading-relaxed">{field.justificativa}</p>}
          {!compact && field.limitacoes && <p className="text-[10px] text-slate-600 italic">{field.limitacoes}</p>}
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
    <div className="bg-blue-400/[0.03] border border-blue-300/10 rounded-lg p-3.5 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-label">{label}</span>
      </div>

      {field.semDados ? (
        <p className="text-xs text-slate-500 italic">Dados insuficientes para síntese</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-white leading-snug truncate">{field.valor}</p>
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{field.justificativa}</p>
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
 * Hierarquia em dois níveis — Estado Geral e Principal Risco em destaque
 * (nível 1), os outros campos como tiles secundários menores (nível 2) —
 * evita a "parede de cards iguais" identificada em
 * docs/AUDITORIA_VISUAL_SPRINT_5.md (achado #3). `compact` (hotfix de
 * apresentação) reduz para 4 campos e menos padding, sem alterar dados.
 */
export default function ExecutiveScenarioSummary({ synthesis, compact = false }: Props) {
  const secondaryFields = compact
    ? SECONDARY_FIELD_META.filter((f) => COMPACT_SECONDARY_KEYS.includes(f.key))
    : SECONDARY_FIELD_META;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        {PRIMARY_FIELD_META.map(({ key, label, icon }) => (
          <PrimaryTile key={key} label={label} icon={icon} field={synthesis[key]} compact={compact} />
        ))}
      </div>
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 xl:grid-cols-4 gap-3'}>
        {secondaryFields.map(({ key, label, icon }) => (
          <SecondaryTile key={key} label={label} icon={icon} field={synthesis[key]} />
        ))}
      </div>
    </div>
  );
}
