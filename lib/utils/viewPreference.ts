export type ViewPreference = 'feed' | 'table';

/**
 * Resolve a preferência de visualização (Feed/Tabela) persistida em
 * localStorage. Função pura e testável — não acessa localStorage
 * diretamente, apenas decide o valor a partir do que já foi lido.
 */
export function resolveViewPreference(
  stored: string | null,
  fallback: ViewPreference = 'feed'
): ViewPreference {
  return stored === 'feed' || stored === 'table' ? stored : fallback;
}
