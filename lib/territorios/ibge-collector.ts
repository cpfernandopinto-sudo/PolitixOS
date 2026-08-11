import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  fetchEstadoBySigla,
  fetchMunicipiosByUf,
  fetchMunicipioByCodigo,
  fetchPopulacaoByUfId,
  fetchPopulacaoByCodigo,
  normalizeMunicipio,
  IbgeApiError,
  POPULACAO_TABELA,
  type NormalizedMunicipio,
  type PopulacaoIndicador,
} from './ibge-client';

export const WORKFLOW_NAME = 'politix-territorios-ibge';
export const WORKFLOW_VERSION = '1.0.0';

export type CollectionMode = 'single' | 'uf' | 'national';

export interface RunIbgeCollectionInput {
  mode: CollectionMode;
  uf?: string | null;
  codigoIbge?: string | null;
  requestId?: string | null;
}

export interface TerritoryCollectionOutcome {
  codigo_ibge: string;
  municipio: string;
  status: 'completed' | 'partial' | 'failed';
  territoryUpserted: boolean;
  indicatorUpserted: boolean;
  error?: string;
}

export interface IbgeCollectionResult {
  requestId: string;
  mode: CollectionMode;
  uf: string | null;
  blocked: boolean;
  blockedReason?: string;
  itemsExpected: number;
  itemsReceived: number;
  itemsPersisted: number;
  itemsDiscarded: number;
  itemsFailed: number;
  errors: string[];
  outcomes: TerritoryCollectionOutcome[];
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Upsert de indicador respeitando a MESMA semântica de idempotência do
 * índice único de `territory_indicators` (natural key com COALESCE — ver
 * supabase_migration_territories_foundation.sql). O upsert nativo do
 * Supabase/PostgREST (`.upsert({...}, { onConflict })`) só aceita uma lista
 * de colunas simples, não expressões — não é capaz de casar com um índice
 * único definido sobre `coalesce(col, sentinela)`. Por isso a idempotência
 * aqui é feita em duas etapas na aplicação (SELECT pela chave natural,
 * depois UPDATE ou INSERT), reproduzindo exatamente a regra do banco:
 * `source_dataset`/`periodo_inicio`/`periodo_fim` nulos só colidem com
 * outros nulos (via `.is(col, null)`), nunca com um valor real.
 */
async function upsertIndicador(
  client: AdminClient,
  params: {
    territory_id: string;
    categoria: string;
    indicador: string;
    valor: number;
    unidade: string;
    periodo_inicio: string | null;
    periodo_fim: string | null;
    fonte: string;
    source_dataset: string | null;
    source_record_id: string | null;
    source_updated_at: string;
    metodologia: string;
  }
): Promise<{ error?: string }> {
  let query = client
    .from('territory_indicators')
    .select('id')
    .eq('territory_id', params.territory_id)
    .eq('categoria', params.categoria)
    .eq('indicador', params.indicador)
    .eq('fonte', params.fonte);

  query = params.source_dataset ? query.eq('source_dataset', params.source_dataset) : query.is('source_dataset', null);
  query = params.periodo_inicio ? query.eq('periodo_inicio', params.periodo_inicio) : query.is('periodo_inicio', null);
  query = params.periodo_fim ? query.eq('periodo_fim', params.periodo_fim) : query.is('periodo_fim', null);

  const { data: existing, error: selectError } = await query.maybeSingle();
  if (selectError) return { error: selectError.message };

  const payload = {
    valor: params.valor,
    unidade: params.unidade,
    source_record_id: params.source_record_id,
    source_updated_at: params.source_updated_at,
    metodologia: params.metodologia,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await client.from('territory_indicators').update(payload).eq('id', existing.id);
    return { error: error?.message };
  }

  const { error } = await client.from('territory_indicators').insert({
    territory_id: params.territory_id,
    categoria: params.categoria,
    indicador: params.indicador,
    fonte: params.fonte,
    source_dataset: params.source_dataset,
    periodo_inicio: params.periodo_inicio,
    periodo_fim: params.periodo_fim,
    ...payload,
  });
  return { error: error?.message };
}

/**
 * Persiste um único município (upsert em `territories`) + seu indicador de
 * população (se disponível) + um registro próprio em
 * `territory_collection_runs`.
 *
 * Nota de arquitetura (Seção 5 do briefing do Bloco 3): uma carga de
 * catálogo por UF/nacional não tem um único `territory_id` aplicável ao
 * nível agregado da execução, e `territory_collection_runs.territory_id`
 * é NOT NULL por desenho (cada execução de motor é sobre um território).
 * Alterar o schema para admitir uma linha "agregada" com território nulo
 * foi avaliado e descartado — não era necessário: resolvendo o catálogo
 * território a território (upsert do território ANTES de abrir seu
 * collection_run), cada linha sempre tem um `territory_id` real, nunca
 * fictício. O agregado (totais, status geral) não é armazenado como linha
 * própria — é computado em memória durante o loop e devolvido ao chamador
 * (Server Action / rota) no resultado da execução; também pode ser
 * reconstruído depois via `SELECT ... WHERE request_id = X`. Isso evita
 * qualquer alteração de schema e qualquer território fictício.
 */
async function persistMunicipio(
  client: AdminClient,
  normalized: NormalizedMunicipio,
  populacao: PopulacaoIndicador | null,
  requestId: string
): Promise<TerritoryCollectionOutcome> {
  const startedAt = new Date().toISOString();

  const { data: territoryRow, error: territoryError } = await client
    .from('territories')
    .upsert(
      {
        codigo_ibge: normalized.codigo_ibge,
        uf: normalized.uf,
        municipio: normalized.municipio,
        regiao: normalized.regiao,
        metadata: normalized.metadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'codigo_ibge' }
    )
    .select('id')
    .single();

  if (territoryError || !territoryRow) {
    return {
      codigo_ibge: normalized.codigo_ibge,
      municipio: normalized.municipio,
      status: 'failed',
      territoryUpserted: false,
      indicatorUpserted: false,
      error: territoryError?.message ?? 'Falha desconhecida ao gravar território.',
    };
  }

  const territoryId = territoryRow.id as string;

  let indicatorUpserted = false;
  let indicatorError: string | undefined;

  if (populacao) {
    const { error } = await upsertIndicador(client, {
      territory_id: territoryId,
      categoria: 'demografia',
      indicador: 'populacao_total',
      valor: populacao.valor,
      unidade: populacao.unidade,
      periodo_inicio: `${populacao.periodo}-01-01`,
      periodo_fim: `${populacao.periodo}-12-31`,
      fonte: 'IBGE',
      source_dataset: `SIDRA_${POPULACAO_TABELA}`,
      source_record_id: populacao.codigoIbge,
      source_updated_at: new Date().toISOString(),
      metodologia: 'Estimativas de população residente (IBGE/SIDRA, tabela 6579, variável 9324)',
    });
    indicatorUpserted = !error;
    indicatorError = error;
  }

  const finishedAt = new Date().toISOString();
  const status: TerritoryCollectionOutcome['status'] = !populacao || indicatorUpserted ? 'completed' : 'partial';

  await client.from('territory_collection_runs').insert({
    territory_id: territoryId,
    request_id: requestId,
    source: 'ibge',
    status,
    workflow_name: WORKFLOW_NAME,
    workflow_version: WORKFLOW_VERSION,
    started_at: startedAt,
    finished_at: finishedAt,
    items_collected: 1,
    items_processed: indicatorUpserted ? 1 : 0,
    items_discarded: populacao && !indicatorUpserted ? 1 : 0,
    error_message: indicatorError ?? null,
    metadata: { codigo_ibge: normalized.codigo_ibge, tem_populacao: Boolean(populacao) },
  });

  return {
    codigo_ibge: normalized.codigo_ibge,
    municipio: normalized.municipio,
    status,
    territoryUpserted: true,
    indicatorUpserted,
    error: indicatorError,
  };
}

function summarize(requestId: string, mode: CollectionMode, uf: string | null, outcomes: TerritoryCollectionOutcome[]): IbgeCollectionResult {
  return {
    requestId,
    mode,
    uf,
    blocked: false,
    itemsExpected: outcomes.length,
    itemsReceived: outcomes.length,
    itemsPersisted: outcomes.filter((o) => o.status !== 'failed').length,
    itemsDiscarded: outcomes.filter((o) => o.status === 'partial').length,
    itemsFailed: outcomes.filter((o) => o.status === 'failed').length,
    errors: outcomes.filter((o) => o.error).map((o) => `${o.codigo_ibge} (${o.municipio}): ${o.error}`),
    outcomes,
  };
}

/**
 * Orquestra a coleta territorial do IBGE. `mode`:
 *  - 'single': um município (`codigoIbge`).
 *  - 'uf': todos os municípios de uma UF (`uf`), MG usado como lote de
 *    homologação neste bloco.
 *  - 'national': todos os municípios do Brasil — BLOQUEADO por padrão
 *    (Seção 21 do briefing: só depois de homologação humana explícita).
 *    A implementação já suporta o modo estruturalmente (mesmo código de
 *    `mode: 'uf'` rodado para cada UF); o bloqueio é só um guard de
 *    execução, para não mudar nada estrutural quando for liberado.
 */
export async function runIbgeCollection(
  client: AdminClient,
  input: RunIbgeCollectionInput
): Promise<IbgeCollectionResult> {
  const requestId = input.requestId ?? randomUUID();

  if (input.mode === 'national') {
    if (process.env.TERRITORIOS_ALLOW_NATIONAL_LOAD !== 'true') {
      return {
        requestId,
        mode: 'national',
        uf: null,
        blocked: true,
        blockedReason:
          'Carga nacional bloqueada até homologação humana explícita (defina TERRITORIOS_ALLOW_NATIONAL_LOAD=true para liberar).',
        itemsExpected: 0,
        itemsReceived: 0,
        itemsPersisted: 0,
        itemsDiscarded: 0,
        itemsFailed: 0,
        errors: [],
        outcomes: [],
      };
    }
    // Estrutural: seria a mesma implementação de 'uf', chamada uma vez por
    // UF (a lista de UFs já vem de `fetchEstados()`). Não implementado
    // neste bloco — fora do escopo homologado da Etapa 21 mesmo com a env
    // var setada, para não haver caminho de execução nacional acidental.
    throw new IbgeApiError('http_error', 'Execução nacional não implementada neste bloco (fora do escopo homologado).');
  }

  if (input.mode === 'single') {
    if (!input.codigoIbge) {
      throw new IbgeApiError('invalid_response', 'mode=single requer codigoIbge.');
    }
    const raw = await fetchMunicipioByCodigo(input.codigoIbge);
    const normalized = normalizeMunicipio(raw);
    let populacao: PopulacaoIndicador | null = null;
    try {
      populacao = await fetchPopulacaoByCodigo(normalized.codigo_ibge);
    } catch {
      populacao = null;
    }
    const outcome = await persistMunicipio(client, normalized, populacao, requestId);
    return summarize(requestId, 'single', normalized.uf, [outcome]);
  }

  // mode === 'uf'
  if (!input.uf) {
    throw new IbgeApiError('invalid_response', 'mode=uf requer uf.');
  }
  const estado = await fetchEstadoBySigla(input.uf);
  const municipiosRaw = await fetchMunicipiosByUf(input.uf);
  let populacaoPorCodigo = new Map<string, PopulacaoIndicador>();
  try {
    populacaoPorCodigo = await fetchPopulacaoByUfId(estado.id);
  } catch {
    populacaoPorCodigo = new Map();
  }

  const outcomes: TerritoryCollectionOutcome[] = [];
  for (const raw of municipiosRaw) {
    try {
      const normalized = normalizeMunicipio(raw);
      const populacao = populacaoPorCodigo.get(normalized.codigo_ibge) ?? null;
      outcomes.push(await persistMunicipio(client, normalized, populacao, requestId));
    } catch (err) {
      outcomes.push({
        codigo_ibge: String(raw.id ?? 'desconhecido'),
        municipio: raw.nome ?? 'desconhecido',
        status: 'failed',
        territoryUpserted: false,
        indicatorUpserted: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summarize(requestId, 'uf', estado.sigla, outcomes);
}
