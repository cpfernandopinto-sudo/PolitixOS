import type { PesquisasFilters } from './types';

/**
 * Sprint 2A, item 5 — data que ancora o filtro "Período". `dataRegistro`
 * (DT_REGISTRO) é a data burocrática de registro no TSE, não quando o
 * levantamento de campo aconteceu. `campoFim`/`campoInicio`
 * (DT_FIM_PESQUISA/DT_INICIO_PESQUISA) são a janela real de campo — usamos
 * `campoFim` (fim do campo) como a data mais representativa de "quando essa
 * leitura de opinião foi capturada", com fallback para `campoInicio` e só
 * por último `dataRegistro`. Esse é o MESMO fallback já usado hoje para
 * exibir a data de uma pesquisa na Base Oficial (`PesquisasListView.tsx`:
 * `poll.campoFim ?? poll.dataRegistro`) — não é uma escolha nova, é a
 * formalização de uma convenção que já existia na UI.
 */
export function getPeriodAnchorDate(poll: {
  campoFim?: string | null;
  campoInicio?: string | null;
  dataRegistro?: string | null;
}): string | null {
  return poll.campoFim ?? poll.campoInicio ?? poll.dataRegistro ?? null;
}

function diffDays(now: Date, date: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Sprint 2A, item 5 — o filtro "Período" era decorativo (mudava o estado,
 * mas nenhum filtro o lia). Regra: sem data conhecida, a pesquisa NUNCA
 * entra num filtro temporal explícito (nunca assume "está dentro do
 * período" por falta de dado) — só passa quando period === 'all'.
 */
export function isWithinPeriod(
  dateStr: string | null | undefined,
  period: PesquisasFilters['period'] | null | undefined,
  now: Date = new Date()
): boolean {
  if (!period || period === 'all') return true;

  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const days = diffDays(now, date);
  switch (period) {
    case '30d':
      return days <= 30 && days >= 0;
    case '60d':
      return days <= 60 && days >= 0;
    case '90d':
      return days <= 90 && days >= 0;
    case 'year':
      return date.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}
