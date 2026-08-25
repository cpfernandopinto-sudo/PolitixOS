import type { ElectoralPollResultWithPoll } from './types';
import { isRealCandidate } from './types';

export interface CenarioPollGroup {
  pollId: string;
  cenario: string;
  turno: number;
  tipoPergunta: string;
  office: string | null;
  instituto: string;
  dataRegistro: string;
  tseReg: string;
  amostra: number | null;
  results: { candidateName: string; percentage: number }[];
}

/**
 * Agrupa resultados por poll_id + cenário + office — nunca só por data. Uma
 * pesquisa com vários cenários (ex.: "com Cleitinho" / "sem Cleitinho", ou
 * vários confrontos de 2º turno) na MESMA data vira múltiplos grupos
 * distintos, cada um com sua própria lista de candidatos — é isso que evita
 * o "Cenário Eleitoral no Período" misturar/duplicar candidatos de cenários
 * diferentes sob o mesmo ponto do eixo (causa raiz confirmada na auditoria
 * MG/Governador: MG034902026 tem "Cenário 1 (com Cleitinho)" e "Cenário 4
 * (sem Cleitinho)" na mesma data_registro).
 *
 * Dentro do mesmo poll_id+cenario+office, um candidato nunca aparece
 * duplicado — se a fonte repetir a linha, mantém a primeira leitura.
 */
export function buildCenarioPollGroups(results: ElectoralPollResultWithPoll[]): CenarioPollGroup[] {
  const map = new Map<string, CenarioPollGroup>();

  for (const r of results) {
    if (!r.poll || !isRealCandidate(r.candidateName)) continue;
    const key = `${r.pollId}::${r.cenario}::${r.office ?? ''}`;
    const existing = map.get(key) ?? {
      pollId: r.pollId,
      cenario: r.cenario,
      turno: r.turno,
      tipoPergunta: r.tipoPergunta,
      office: r.office,
      instituto: r.poll.instituto ?? 'TSE/PesqEle',
      dataRegistro: r.poll.dataRegistro ?? 'N/A',
      tseReg: r.poll.tseRegistrationNumber,
      amostra: r.poll.amostra,
      results: [],
    };

    if (!existing.results.some((res) => res.candidateName === r.candidateName)) {
      existing.results.push({ candidateName: r.candidateName, percentage: r.percentage });
    }

    map.set(key, existing);
  }

  return Array.from(map.values()).sort(
    (a, b) => a.dataRegistro.localeCompare(b.dataRegistro) || a.cenario.localeCompare(b.cenario)
  );
}
