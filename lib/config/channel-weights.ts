/**
 * Fonte única de verdade dos pesos por canal usados no Termômetro de Crise
 * Master (Visão Geral) e em qualquer texto/label que precise descrevê-los.
 *
 * Antes desta config existir, o peso 50/30/20 (Notícias/X/Instagram) estava
 * hardcoded em 4 lugares independentes: duas vezes em lib/queries/overview.ts
 * (getOverviewKPIs e getCrisisOverview), uma vez como prosa em
 * lib/analytics/political-status.ts, e uma vez como texto JSX em
 * components/dashboard/overview/OverviewGauge.tsx. Adicionar o Facebook exigiu
 * eliminar essa duplicação — todo consumidor deve importar CHANNEL_WEIGHTS
 * (ou os helpers abaixo) em vez de repetir o número.
 *
 * Distribuição decidida ao integrar o Facebook (peso inicial de maturidade
 * de canal, não uma medida de importância definitiva — pode ser recalibrada
 * futuramente): os três canais históricos preservam exatamente a proporção
 * relativa 5:3:2 que já tinham dentro dos 90% restantes; o Facebook entra
 * com 10%.
 */

export const CHANNEL_WEIGHTS = {
  noticias: 0.45,
  x: 0.27,
  instagram: 0.18,
  facebook: 0.10,
} as const;

export type ChannelKey = keyof typeof CHANNEL_WEIGHTS;

export const CHANNEL_ORDER: ChannelKey[] = ['noticias', 'x', 'instagram', 'facebook'];

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  noticias: 'Notícias',
  x: 'X/Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

/** Rótulo curto pronto para exibição ("Notícias (45%)") — usado no detalhamento do Termômetro Master. */
export function channelWeightLabel(channel: ChannelKey): string {
  return `${CHANNEL_LABELS[channel]} (${Math.round(CHANNEL_WEIGHTS[channel] * 100)}%)`;
}

/** Prosa "notícias (peso 45%), X (peso 27%), Instagram (peso 18%) e Facebook (peso 10%)" — usada na justificativa do estado político. */
export function channelWeightsProse(): string {
  const parts = CHANNEL_ORDER.map((c) => `${CHANNEL_LABELS[c]} (peso ${Math.round(CHANNEL_WEIGHTS[c] * 100)}%)`);
  return parts.length <= 1
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/**
 * Valida que os pesos somam 1.00 (com tolerância de ponto flutuante).
 * Chamada uma vez no import deste módulo — se um canal for adicionado,
 * removido ou tiver o peso alterado sem ajustar os demais, a aplicação
 * falha imediatamente ao subir, em vez de produzir um Termômetro de Crise
 * com soma de pesos incorreta silenciosamente.
 */
export function assertChannelWeightsSumToOne(weights: Record<string, number> = CHANNEL_WEIGHTS): void {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`CHANNEL_WEIGHTS deve somar 1.00 — soma atual: ${total}`);
  }
}

assertChannelWeightsSumToOne();

/**
 * Monta as entradas para `weightedAverage` (lib/queries/overview.ts) a partir
 * dos pesos centralizados — nenhum chamador precisa mais escrever o número
 * do peso, só o valor/contagem observados por canal.
 */
export function buildChannelWeightedEntries(
  perChannel: Partial<Record<ChannelKey, { value: number; count: number }>>
): Array<{ value: number; weight: number; count: number }> {
  return CHANNEL_ORDER.map((channel) => ({
    value: perChannel[channel]?.value ?? 0,
    weight: CHANNEL_WEIGHTS[channel],
    count: perChannel[channel]?.count ?? 0,
  }));
}
