import { createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralPoll, ElectoralPollUpsert } from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Subconjunto de `targets` relevante para o matcher de pesquisas — nunca o
 * candidato inteiro (sem keywords de campanha, sem client_id) fora daqui.
 */
export interface MonitoredTarget {
  id: string;
  candidateName: string;
  keywords: string | null;
  state: string | null;
  office: string | null;
}

function mapTargetRow(row: Record<string, unknown>): MonitoredTarget {
  return {
    id: row.id as string,
    candidateName: row.candidate_name as string,
    keywords: (row.keywords as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    office: (row.poll_monitoring_office as string | null) ?? null,
  };
}

/**
 * Targets com captura de pesquisas eleitorais ligada — única fonte de
 * verdade de "quem o PolitixOS monitora" para o coletor seletivo (PESQUISAS-
 * N8N-01, Fase 2). `is_active=false` nunca entra, mesmo com o flag ligado —
 * evita coletar para candidato desativado.
 */
export async function getPollMonitoringTargets(client: AdminClient, targetIds?: string[]): Promise<MonitoredTarget[]> {
  let query = client
    .from('targets')
    .select('id, candidate_name, keywords, state, poll_monitoring_office')
    .eq('poll_monitoring_enabled', true)
    .eq('is_active', true);
  if (targetIds && targetIds.length > 0) query = query.in('id', targetIds);
  const { data, error } = await query;

  if (error) {
    console.error('[targetMatcher] getPollMonitoringTargets error:', error.message);
    return [];
  }
  return (data ?? []).map(mapTargetRow);
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Mesma tolerância de substring já usada em comparability.ts — nunca igualdade estrita para texto livre do TSE. */
function substringMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

/**
 * Um poll é relevante quando pelo menos 1 target monitorado tem UF e cargo
 * compatíveis com a pesquisa (Fase 3) — nome de candidato NÃO entra aqui
 * porque o poll (registro TSE) ainda não carrega resultado/candidato, só
 * ficha técnica. Match por UF+cargo é a única correspondência "segura"
 * possível neste estágio; o candidato é confirmado depois, no resultado
 * (matchCandidateNameToTarget), antes de a corrida virar persistência.
 */
export function matchPollToTargets(
  poll: ElectoralPollUpsert | ElectoralPoll,
  targets: MonitoredTarget[]
): MonitoredTarget[] {
  if (!poll.cargo) return [];
  const pollUf = poll.uf ?? poll.abrangencia ?? null;

  return targets.filter((t) => {
    if (!t.office) return false; // monitoramento ligado mas sem cargo definido — nunca casa "por via das dúvidas"
    const officeMatch = substringMatch(poll.cargo!, t.office);
    if (!officeMatch) return false;

    if (!t.state) return true; // sem UF no target — não bloqueia por UF (ex.: corrida nacional/Presidente)
    if (!pollUf) return false; // target tem UF mas poll não informa — não assume match
    return normalize(pollUf) === normalize(t.state);
  });
}

/**
 * Resolve candidate_name (como veio na pesquisa) → target monitorado, para
 * (a) preencher electoral_poll_results.candidate_id com segurança e (b)
 * confirmar que a corrida realmente contém o candidato que motivou a
 * ingestão do poll. Compara contra candidate_name e contra os tokens de
 * `keywords` (separados por vírgula) — nunca só substring livre do texto
 * inteiro de keywords, que geraria falso positivo fácil (blob longo).
 */
export function matchCandidateNameToTarget(candidateName: string, targets: MonitoredTarget[]): MonitoredTarget | null {
  const normalizedCandidate = normalize(candidateName);
  if (!normalizedCandidate) return null;

  for (const target of targets) {
    if (normalize(target.candidateName) === normalizedCandidate) return target;
  }

  for (const target of targets) {
    if (!target.keywords) continue;
    const tokens = target.keywords.split(',').map((k) => normalize(k.trim())).filter(Boolean);
    if (tokens.includes(normalizedCandidate)) return target;
  }

  return null;
}
