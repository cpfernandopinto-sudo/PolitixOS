// ---------------------------------------------------------------------------
// Resolução de território pelo código municipal de 6 dígitos da SEJUSP-MG —
// Motor Segurança Pública (Bloco 4.2, Seção 5).
// ---------------------------------------------------------------------------
// O dataset da SEJUSP-MG usa `cod_municipio` de 6 dígitos (ex.: "311860"),
// sem o dígito verificador. O PolitixOS usa `codigo_ibge` de 7 dígitos
// (ex.: "3118601") como chave natural de `territories` (Motor IBGE).
//
// Regra de resolução (não inventa o 7º dígito): um território corresponde a
// um código SEJUSP de 6 dígitos quando `LEFT(codigo_ibge, 6) = cod6`. Nunca
// escolhe arbitrariamente entre múltiplos candidatos — 0 ou >1 correspondência
// é sempre um erro explícito, nunca um match "chutado".
// ---------------------------------------------------------------------------

import type { createAdminClient } from '@/lib/supabaseClient';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface ResolvedTerritory {
  id: string;
  codigo_ibge: string;
  municipio: string;
  uf: string;
}

export type TerritoryResolution =
  | { status: 'found'; territory: ResolvedTerritory }
  | { status: 'unmatched' }
  | { status: 'ambiguous'; candidates: ResolvedTerritory[] };

/**
 * Resolve UM código SEJUSP de 6 dígitos para o território correspondente,
 * via `LEFT(codigo_ibge, 6) = cod6` (implementado como `.like('codigo_ibge',
 * cod6 + '%')` — como `codigo_ibge` é sempre exatamente 7 dígitos numéricos,
 * isso é equivalente ao LEFT/6, mas continua validando a contagem de
 * resultados em vez de presumir isso).
 */
export async function resolveTerritoryBySejuspCode(
  client: AdminClient,
  cod6: string
): Promise<TerritoryResolution> {
  const { data, error } = await client
    .from('territories')
    .select('id, codigo_ibge, municipio, uf')
    .like('codigo_ibge', `${cod6}%`);

  if (error) {
    throw new Error(`Falha ao resolver território para código SEJUSP "${cod6}": ${error.message}`);
  }

  const rows = (data ?? []) as ResolvedTerritory[];
  if (rows.length === 0) return { status: 'unmatched' };
  if (rows.length > 1) return { status: 'ambiguous', candidates: rows };
  return { status: 'found', territory: rows[0] };
}

/**
 * Constrói, em UMA única query, o mapa (código SEJUSP 6 dígitos → território)
 * para todos os territórios de uma UF — usado no mode=mg para não fazer 853
 * queries individuais. Mesma regra de resolução do `resolveTerritoryBySejuspCode`
 * (LEFT(codigo_ibge,6)), aplicada em memória sobre o resultado da query única.
 * Prefixos colidentes (não deveria acontecer com `codigo_ibge` bem formado,
 * mas não presumimos isso) são reportados em `ambiguous`, nunca resolvidos
 * arbitrariamente.
 */
export async function resolveTerritoriesMapForUf(
  client: AdminClient,
  uf: string
): Promise<{ map: Map<string, ResolvedTerritory>; ambiguous: Map<string, ResolvedTerritory[]> }> {
  const { data, error } = await client.from('territories').select('id, codigo_ibge, municipio, uf').eq('uf', uf);

  if (error) {
    throw new Error(`Falha ao carregar territórios da UF "${uf}": ${error.message}`);
  }

  const map = new Map<string, ResolvedTerritory>();
  const ambiguous = new Map<string, ResolvedTerritory[]>();

  for (const row of (data ?? []) as ResolvedTerritory[]) {
    const cod6 = row.codigo_ibge.slice(0, 6);
    if (ambiguous.has(cod6)) {
      ambiguous.get(cod6)!.push(row);
      continue;
    }
    const existing = map.get(cod6);
    if (existing) {
      map.delete(cod6);
      ambiguous.set(cod6, [existing, row]);
      continue;
    }
    map.set(cod6, row);
  }

  return { map, ambiguous };
}
