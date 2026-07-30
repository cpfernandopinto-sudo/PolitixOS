/**
 * Agrupamento determinístico da timeline consolidada por tema (Sprint 3).
 *
 * Não usa IA generativa — agrupa exclusivamente por identidade de tema
 * (string já normalizada pela análise de IA existente, ex.: `ai_topics`),
 * com fallback para "evento isolado" quando o item não tem tema associado.
 * A entrada já vem deduplicada por `lib/queries/overview.ts#buildTimelineEvents`
 * (chave `canal:id`) — este módulo não duplica nem descarta eventos, apenas
 * os reorganiza em grupos.
 */

export interface TimelineEventWithMeta {
  id: string;
  canal: 'Notícias' | 'Instagram' | 'X';
  titulo: string;
  data: string;
  severidade: 'alta' | 'media';
  url: string | null;
  tema: string | null;
  entidade: string | null;
  sentimento: 'positivo' | 'negativo' | 'neutro' | null;
}

export interface TimelineGroup {
  chave: string;
  tema: string;
  eventos: TimelineEventWithMeta[];
  quantidade: number;
  severidadeMax: 'alta' | 'media';
  entidadesAssociadas: string[];
  sentimentoPredominante: 'positivo' | 'negativo' | 'neutro' | null;
  dataMaisRecente: string;
}

export function groupTimelineEvents(events: TimelineEventWithMeta[]): TimelineGroup[] {
  const buckets = new Map<string, TimelineEventWithMeta[]>();

  events.forEach((event) => {
    const key = event.tema ? `tema:${event.tema.toLowerCase()}` : `evento:${event.canal}:${event.id}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(event);
  });

  const groups: TimelineGroup[] = Array.from(buckets.entries()).map(([chave, eventos]) => {
    const ordenados = [...eventos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const tema = eventos[0].tema || eventos[0].titulo;
    const severidadeMax: 'alta' | 'media' = eventos.some((e) => e.severidade === 'alta') ? 'alta' : 'media';

    const entidadesAssociadas = Array.from(
      new Set(eventos.map((e) => e.entidade).filter((e): e is string => Boolean(e)))
    );

    const sentimentCounts: Record<string, number> = {};
    eventos.forEach((e) => {
      if (e.sentimento) sentimentCounts[e.sentimento] = (sentimentCounts[e.sentimento] || 0) + 1;
    });
    const sentimentoPredominante = (Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as
      | 'positivo'
      | 'negativo'
      | 'neutro'
      | null;

    return {
      chave,
      tema,
      eventos: ordenados,
      quantidade: eventos.length,
      severidadeMax,
      entidadesAssociadas,
      sentimentoPredominante,
      dataMaisRecente: ordenados[0].data,
    };
  });

  return groups.sort((a, b) => new Date(b.dataMaisRecente).getTime() - new Date(a.dataMaisRecente).getTime());
}
