import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Crown, TrendingUp, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { requireAuth } from '@/lib/auth/dal';
import { getPriorityRacePolls, type PriorityRacePoll } from '@/lib/pesquisas/results-repository';
import KpiCard from '@/components/ui/KpiCard';
import BarChart from '@/components/charts/BarChart';
import type { ElectoralPollResult } from '@/lib/pesquisas/types';

export const metadata = {
  title: 'Visão Executiva — Pesquisas Eleitorais | PolitixOS',
};

export const dynamic = 'force-dynamic';

/**
 * PESQUISAS-01B — 3 corridas prioritárias fixas (PARTE 4-6 do briefing).
 * Presidente sempre pareia com Brasil; Governador pareia com DF ou MG —
 * não é um cruzamento livre cargo×território, é exatamente o que a
 * apresentação de amanhã precisa (PARTE 9: "Presidente → Brasil padrão;
 * Governador → DF/MG").
 */
const RACES = {
  presidente_br: { uf: 'BR', cargoLike: 'Presidente', label: 'Presidente — Brasil', cargoLabel: 'Presidente', territorioLabel: 'Brasil' },
  governador_df: { uf: 'DF', cargoLike: 'Governador', label: 'Governador — Distrito Federal', cargoLabel: 'Governador', territorioLabel: 'Distrito Federal / Brasília' },
  governador_mg: { uf: 'MG', cargoLike: 'Governador', label: 'Governador — Minas Gerais', cargoLabel: 'Governador', territorioLabel: 'Minas Gerais' },
} as const;

type RaceKey = keyof typeof RACES;

function isRaceKey(v: string | undefined): v is RaceKey {
  return v === 'presidente_br' || v === 'governador_df' || v === 'governador_mg';
}

// Categorias que não são candidatos reais — nunca entram no ranking de liderança.
const NON_CANDIDATE_LABELS = new Set([
  'branco/nulo', 'branco/nulo/não vai votar', 'nulo/branco', 'indecisos', 'não sabe/não respondeu', 'outros',
]);
function isRealCandidate(name: string) {
  return !NON_CANDIDATE_LABELS.has(name.toLowerCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Não disponível';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function groupResultsByCenario(results: ElectoralPollResult[]): Map<string, ElectoralPollResult[]> {
  const map = new Map<string, ElectoralPollResult[]>();
  for (const r of results) {
    const list = map.get(r.cenario) ?? [];
    list.push(r);
    map.set(r.cenario, list);
  }
  return map;
}

export default async function ExecutivoPage({ searchParams }: { searchParams: Promise<{ race?: string }> }) {
  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('pesquisas')) {
    redirect('/dashboard/sem-permissao');
  }

  const sp = await searchParams;
  const raceKey: RaceKey = isRaceKey(sp.race) ? sp.race : 'presidente_br';
  const race = RACES[raceKey];

  const polls: PriorityRacePoll[] = await getPriorityRacePolls(race.uf, race.cargoLike);
  const mostRecent = polls[0] ?? null;

  const t1Results = mostRecent?.results.filter((r) => r.turno === 1) ?? [];
  const t1ByCenario = groupResultsByCenario(t1Results);
  const primaryCenario = t1Results[0]?.cenario ?? null;
  const primaryScenario = primaryCenario ? (t1ByCenario.get(primaryCenario) ?? []) : [];
  const ranked = primaryScenario.filter((r) => isRealCandidate(r.candidateName)).sort((a, b) => b.percentage - a.percentage);
  const leader = ranked[0] ?? null;
  const runnerUp = ranked[1] ?? null;
  const diff = leader && runnerUp ? Math.round((leader.percentage - runnerUp.percentage) * 10) / 10 : null;

  const t2Results = mostRecent?.results.filter((r) => r.turno === 2) ?? [];
  const t2ByCenario = groupResultsByCenario(t2Results);

  // Média entre pesquisas: só faria sentido com 2+ pesquisas comparáveis
  // (mesmo cargo/território/cenário/turno/tipo de pergunta) — PARTE 7/9,
  // "não calcular média simples entre cenários incompatíveis". Hoje há
  // exatamente 1 pesquisa verificada por corrida prioritária.
  const comparablePollsCount = polls.length;
  const canAverage = comparablePollsCount >= 2;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Visão Executiva — Pesquisas Prioritárias</h2>
        <p className="text-gray-400 text-sm mt-1">
          Presidente/Brasil, Governador/Distrito Federal e Governador/Minas Gerais — somente resultados com fonte pública verificada.
        </p>
      </div>

      {/* Controles: Cargo + Território (PARTE 9) */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(RACES) as RaceKey[]).map((key) => (
          <Link
            key={key}
            href={`/dashboard/pesquisas/executivo?race=${key}`}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              key === raceKey
                ? 'bg-[#2563EB] border-[#2563EB] text-white'
                : 'bg-[#12192A] border-white/5 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {RACES[key].label}
          </Link>
        ))}
      </div>

      {!mostRecent && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3.5">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-semibold">Resultados divulgados ainda não integrados</p>
            <p className="text-amber-200/70 text-xs mt-1">
              Nenhuma pesquisa com resultado verificado para {race.label} nesta rodada.
            </p>
          </div>
        </div>
      )}

      {mostRecent && (
        <>
          {/* Cards executivos (PARTE 9) */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard title="Pesquisa Mais Recente" value={mostRecent.instituto ?? 'Não disponível'} compact />
            <KpiCard title="Líder Atual" value={leader ? `${leader.candidateName} (${leader.percentage}%)` : 'Não disponível'} status={leader ? 'success' : 'neutral'} compact />
            <KpiCard title="Diferença 1º × 2º" value={diff !== null ? `${diff} p.p.` : 'Não disponível'} compact />
            <KpiCard title="Média das Pesquisas" value={canAverage ? 'Ver abaixo' : 'Indisponível (1 pesquisa)'} compact />
            <KpiCard title="Pesquisas c/ Resultado" value={comparablePollsCount} compact />
            <KpiCard title="Última Atualização" value={formatDate(mostRecent.dataRegistro)} compact />
          </div>

          {/* Ranking + gráfico horizontal (PARTE 4/19) */}
          {ranked.length > 0 && (
            <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                <Crown size={15} className="text-[#2563EB]" /> Ranking — 1º Turno
              </h3>
              <p className="text-gray-500 text-xs mb-4">{primaryCenario}</p>
              <BarChart
                categories={ranked.map((r) => r.candidateName).reverse()}
                values={ranked.map((r) => r.percentage).reverse()}
                horizontal
                isPercent
                height={Math.max(180, ranked.length * 34)}
              />
            </section>
          )}

          {/* Cenários de 2º turno (PARTE 4, sem misturar cenários) */}
          {t2ByCenario.size > 0 && (
            <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Cenários de 2º Turno</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(t2ByCenario.entries()).map(([cenario, results]) => {
                  const sorted = [...results].sort((a, b) => b.percentage - a.percentage);
                  return (
                    <div key={cenario} className="bg-white/5 rounded-xl p-4">
                      <p className="text-white text-sm font-semibold mb-3">{cenario}</p>
                      <div className="space-y-1.5">
                        {sorted.map((r) => (
                          <div key={r.candidateName} className="flex items-center justify-between text-sm">
                            <span className={isRealCandidate(r.candidateName) ? 'text-gray-300' : 'text-gray-500 text-xs'}>{r.candidateName}</span>
                            <span className={isRealCandidate(r.candidateName) ? 'text-[#2563EB] font-bold' : 'text-gray-500 text-xs'}>{r.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Evolução temporal — só com 2+ pesquisas comparáveis (PARTE 7) */}
          <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-[#2563EB]" /> Evolução Temporal
            </h3>
            {canAverage ? (
              <p className="text-gray-400 text-sm">Comparação entre {comparablePollsCount} pesquisas comparáveis.</p>
            ) : (
              <div className="py-6 text-center">
                <p className="text-gray-400 text-sm">Ainda não há pesquisas suficientes para uma linha temporal.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Requer 2 ou mais pesquisas com resultado verificado, mesmo cargo/território/cenário/turno/tipo de pergunta — hoje há {comparablePollsCount}.
                </p>
              </div>
            )}
          </section>

          {/* Proveniência (PARTE 8/23) */}
          <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={15} className="text-[#2563EB]" /> Proveniência
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">Fonte do registro: <span className="text-white">TSE / PesqEle</span> — Registro {mostRecent.tseRegistrationNumber}</p>
              {leader?.sourceName && <p className="text-gray-400">Fonte do resultado: <span className="text-white">{leader.sourceName}</span></p>}
              {leader?.sourceUrl && (
                <a href={leader.sourceUrl} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline inline-flex items-center gap-1 text-sm">
                  Ver publicação original <ExternalLink size={11} />
                </a>
              )}
              {leader?.sourceDate && <p className="text-gray-400">Data de divulgação: <span className="text-white">{formatDate(leader.sourceDate)}</span></p>}
            </div>
          </section>

          <div className="text-center">
            <Link href={`/dashboard/pesquisas/${mostRecent.id}`} className="text-sm text-[#2563EB] hover:underline">
              Ver ficha técnica completa desta pesquisa →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
