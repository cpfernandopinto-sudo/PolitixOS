import { isRealCandidate } from './types';

interface MinimalScenarioResult {
  cenario: string;
  turno: number;
  tipoPergunta: string;
  office?: string | null;
  candidateName: string;
  verified?: boolean;
}

/**
 * Sprint 2A (Fase 2, item P0.6 da auditoria) — escolhe o "cenário de
 * referência" de uma pesquisa de forma determinística, nunca pela ordem em
 * que o banco devolveu as linhas. `listPollResultsWithPoll`/
 * `getPriorityRacePolls` não têm `ORDER BY` — a ordem física do Postgres não
 * é parte do contrato da API e não pode ser regra de negócio (era isso que
 * `results[0]?.cenario` fazia implicitamente antes desta função existir).
 *
 * Regra, nesta ordem:
 * 1. Se um candidato de referência foi informado, restringe a escolha aos
 *    cenários que o contêm — nunca escolhe um cenário que excluiria o
 *    candidato analisado (ex.: nunca cairia em "sem Cleitinho" quando
 *    Cleitinho está selecionado no filtro).
 * 2. Entre os cenários restantes, escolhe o que tem MAIS candidatos reais —
 *    o cenário "mais completo" (chapa cheia) é o mais representativo da
 *    corrida como um todo; cenários que testam a exclusão de 1 candidato ou
 *    confrontos de 2º turno (2-3 nomes) são, por construção, recortes mais
 *    estreitos do mesmo levantamento.
 * 3. Empate de contagem: prioriza cenários onde todas as linhas têm
 *    `verified=true`.
 * 4. Empate ainda: ordena pelo texto do cenário (determinístico e estável)
 *    e usa o primeiro.
 *
 * Nunca inventa um "cenário principal" sem dado — retorna `null` se
 * `results` estiver vazio ou não houver nenhum candidato real.
 */
export function selectPrimaryCenario<T extends MinimalScenarioResult>(
  results: T[],
  referenceCandidateName?: string | null
): string | null {
  if (results.length === 0) return null;

  const groups = new Map<string, T[]>();
  for (const r of results) {
    const key = `${r.cenario}::${r.turno}::${r.tipoPergunta}::${r.office ?? ''}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  let candidateGroups = Array.from(groups.values());

  if (referenceCandidateName) {
    const normalized = referenceCandidateName.toLowerCase().trim();
    const containing = candidateGroups.filter((g) =>
      g.some((r) => r.candidateName.toLowerCase().trim() === normalized)
    );
    if (containing.length > 0) candidateGroups = containing;
  }

  const scored = candidateGroups.map((g) => ({
    cenario: g[0].cenario,
    realCandidateCount: g.filter((r) => isRealCandidate(r.candidateName)).length,
    allVerified: g.every((r) => r.verified !== false),
  }));

  scored.sort((a, b) => {
    if (b.realCandidateCount !== a.realCandidateCount) return b.realCandidateCount - a.realCandidateCount;
    if (a.allVerified !== b.allVerified) return a.allVerified ? -1 : 1;
    return a.cenario.localeCompare(b.cenario);
  });

  return scored[0]?.cenario ?? null;
}
