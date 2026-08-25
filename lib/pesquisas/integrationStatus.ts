export type PollIntegrationStatus = 'COM_RESULTADO' | 'AGUARDANDO_DIVULGACAO' | 'RESULTADO_NAO_INTEGRADO';

export interface PollIntegrationStatusResult {
  status: PollIntegrationStatus;
  label: string;
}

/**
 * Fase 6 da auditoria MG/Governador (2026-08-24) — separa dois estados que a
 * UI antes tratava como um único "Aguardando resultados":
 *
 * - AGUARDANDO_DIVULGACAO: a data legal de divulgação (`DT_DIVULGACAO` do
 *   registro TSE) ainda não chegou — não há nada a integrar, é esperado.
 * - RESULTADO_NAO_INTEGRADO: a data de divulgação já passou e mesmo assim
 *   não existe nenhuma linha em `electoral_poll_results` para essa pesquisa
 *   — o resultado já deveria estar publicamente disponível (imprensa/
 *   instituto), mas o PolitixOS não o capturou/curou ainda. É uma lacuna de
 *   integração real, não um estado esperado.
 *
 * Puramente baseada em datas — nunca infere/inventa se o resultado existe,
 * só classifica o que já se sabe (há ou não linha em electoral_poll_results,
 * a data de divulgação já passou ou não).
 */
export function classifyPollIntegrationStatus(
  hasResults: boolean,
  dtDivulgacaoRaw: string | null | undefined,
  now: Date = new Date()
): PollIntegrationStatusResult {
  if (hasResults) return { status: 'COM_RESULTADO', label: 'Com resultado' };

  const dtDivulgacao = dtDivulgacaoRaw ? new Date(dtDivulgacaoRaw) : null;
  const isValidDate = dtDivulgacao !== null && !Number.isNaN(dtDivulgacao.getTime());

  if (isValidDate && dtDivulgacao!.getTime() > now.getTime()) {
    return { status: 'AGUARDANDO_DIVULGACAO', label: 'Aguardando divulgação' };
  }

  return { status: 'RESULTADO_NAO_INTEGRADO', label: 'Resultado não integrado' };
}
