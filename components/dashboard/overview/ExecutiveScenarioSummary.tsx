import { AlertTriangle, TrendingUp, Flame, Users, ArrowLeftRight, Sparkles, ExternalLink } from 'lucide-react';
import type { ExecutiveSynthesis, ExecutiveSynthesisField } from '@/lib/analytics/executive-summary';

interface Props {
  synthesis: ExecutiveSynthesis;
  /**
   * Versão compacta: grid 2×2 com 4 campos — Estado Geral, Principal
   * Risco, Principal Oportunidade, Mudança Relevante — usada na linha
   * Síntese + Leitura Executiva (Sprint UX — Etapa 2). Tema em Destaque e
   * Maior Exposição continuam disponíveis na versão completa, não
   * removidos do sistema — apenas ocultos nesta variante.
   */
  compact?: boolean;
  layout?: 'grid' | 'stack';
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

/**
 * Grid 2×2 unificado da versão compacta (Sprint UX — Etapa 2). Substitui o
 * antigo esquema de 2 tiles grandes + 2 tiles pequenos (dois pesos visuais
 * diferentes) — os 4 campos agora têm o MESMO tratamento visual, como partes
 * de uma única síntese, separados por divisórias internas sutis em vez de
 * 4 caixas isoladas com borda própria.
 */
const COMPACT_FIELD_META: Array<{
  key: keyof ExecutiveSynthesis;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'estadoGeral', label: 'Estado Geral', icon: <Sparkles size={14} className="text-cyan-400" aria-hidden="true" /> },
  { key: 'principalRisco', label: 'Principal Risco', icon: <AlertTriangle size={14} className="text-red-400" aria-hidden="true" /> },
  { key: 'principalOportunidade', label: 'Principal Oportunidade', icon: <TrendingUp size={14} className="text-teal-400" aria-hidden="true" /> },
  { key: 'mudancaRelevante', label: 'Mudança Relevante', icon: <ArrowLeftRight size={14} className="text-blue-400" aria-hidden="true" /> },
];

function CompactCell({ label, icon, field, borderRight, borderBottom }: { label: string; icon: React.ReactNode; field: ExecutiveSynthesisField; borderRight: boolean; borderBottom: boolean }) {
  return (
    <div
      className={[
        'p-2.5 min-w-0 flex flex-col justify-center',
        borderRight ? 'sm:border-r sm:border-white/[0.08]' : '',
        borderBottom ? 'border-b border-white/[0.08]' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-label">{label}</span>
      </div>
      {field.semDados ? (
        <p className="text-xs text-slate-500 italic">Dados insuficientes para síntese.</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{field.valor}</p>
          {field.evidenceRefs.length > 0 && field.evidenceRefs[0].url && (
            <a
              href={field.evidenceRefs[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider mt-1.5"
            >
              Ver evidência <ExternalLink size={9} aria-hidden="true" />
            </a>
          )}
        </>
      )}
    </div>
  );
}

function PrimaryTile({ label, icon, field, compact }: { label: string; icon: React.ReactNode; field: ExecutiveSynthesisField; compact: boolean }) {
  return (
    <div className={`bg-white/[0.02] border border-white/[0.08] rounded flex flex-col gap-2 min-w-0 ${compact ? 'p-4' : 'p-5 gap-2.5'}`}>
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
    <div className="bg-white/[0.01] border border-white/[0.08] rounded p-3.5 flex flex-col gap-1.5 min-w-0">
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
 * `compact` (usado na linha Síntese+Leitura Executiva da Visão Geral,
 * Sprint UX — Etapa 2): grid 2×2 unificado com os 4 campos executivos
 * (Estado Geral, Principal Risco, Principal Oportunidade, Mudança
 * Relevante), mesmo tratamento visual para os 4 — Tema em Destaque e Maior
 * Exposição continuam calculados (não removidos do sistema), só não
 * aparecem nesta variante. Sem `compact`: versão completa com os 6 campos
 * (não usada atualmente por nenhuma página — preservada para os testes e
 * para eventual reuso).
 */
export default function ExecutiveScenarioSummary({ synthesis, compact = false, layout = 'grid' }: Props) {
  if (compact) {
    const isStack = layout === 'stack';
    return (
      <div
        className={[
          'grid -m-1',
          isStack
            ? 'grid-cols-1 divide-y divide-white/[0.08]'
            : 'grid-cols-1 sm:grid-cols-2 sm:divide-y-0 divide-y divide-white/[0.08]',
        ].join(' ')}
      >
        {COMPACT_FIELD_META.map(({ key, label, icon }, i) => (
          <CompactCell
            key={key}
            label={label}
            icon={icon}
            field={synthesis[key]}
            borderRight={!isStack && i % 2 === 0}
            borderBottom={isStack ? i < 3 : i < 2}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRIMARY_FIELD_META.map(({ key, label, icon }) => (
          <PrimaryTile key={key} label={label} icon={icon} field={synthesis[key]} compact={false} />
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
