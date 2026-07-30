/**
 * Instrumentação TEMPORÁRIA de performance (auditoria da Visão Geral).
 *
 * Mede duração e volume de cada consulta relevante do carregamento de
 * /dashboard/overview. Não loga tokens, cookies, credenciais, conteúdo
 * sensível nem valores de variáveis de ambiente — apenas nome da consulta,
 * duração e contagem de registros.
 *
 * Remover depois que a causa raiz da lentidão for confirmada e corrigida
 * (ver docs/AUDITORIA_PERFORMANCE_OVERVIEW.md).
 */
export async function withTiming<T>(
  label: string,
  // PromiseLike (não Promise): os query builders do Supabase (PostgrestFilterBuilder)
  // são "thenable" mas não implementam a interface Promise completa
  // (faltam .catch/.finally) — PromiseLike aceita ambos sem exigir cast em
  // cada chamador.
  fn: () => PromiseLike<T>,
  countOf?: (result: T) => number | string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    const count = countOf ? countOf(result) : undefined;
    console.log(`[PERF] ${label} — ${duration}ms${count !== undefined ? ` — ${count} registro(s)` : ''}`);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`[PERF] ${label} — ERRO após ${duration}ms — ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
