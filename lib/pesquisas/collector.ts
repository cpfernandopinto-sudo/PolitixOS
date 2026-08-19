import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabaseClient';
import { getPesquisasSourceDescriptor } from './source';
import { parseZipCsvResources, type ParsedCsvResource } from './csv';
import { normalizePesquisaRow } from './normalizer';
import type { ElectoralPollUpsert } from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

export type CollectorRunStatus = 'completed' | 'partial' | 'failed';

export interface DiscoveredResource {
  fileName: string;
  headers: string[];
  rowCount: number;
}

export interface CollectorResult {
  runId: string;
  status: CollectorRunStatus;
  reason: string;
  discoveredResources?: DiscoveredResource[];
  pollsInserted: number;
}

const SOURCE_KEY = 'TSE/PESQUISA_ELEITORAL';
const SCOPE = 'BR';

async function startRun(client: AdminClient): Promise<string> {
  const { data, error } = await client
    .from('source_collection_runs')
    .insert({
      source: SOURCE_KEY,
      scope: SCOPE,
      status: 'running',
      workflow_name: 'pesquisas-eleitorais-collector',
      workflow_version: '0.1.0',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Falha ao registrar execução do coletor: ${error?.message}`);
  return data.id as string;
}

async function finishRun(
  client: AdminClient,
  runId: string,
  status: CollectorRunStatus,
  metadata: Record<string, unknown>,
  itemsCollected = 0,
  errorMessage: string | null = null
): Promise<void> {
  await client
    .from('source_collection_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      items_collected: itemsCollected,
      items_processed: 0,
      items_discarded: 0,
      error_message: errorMessage,
      metadata,
    })
    .eq('id', runId);
}

/**
 * Coletor MVP — chega até "baixar + descobrir schema real", mas
 * deliberadamente NÃO insere nenhuma pesquisa em `electoral_polls`: o
 * mapeamento coluna-do-TSE → campo-do-PolitixOS ainda não foi verificado
 * contra dados reais (ver docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md).
 * Quando o acesso à fonte funcionar, esta execução grava os headers reais
 * descobertos em `source_collection_runs.metadata.discovered_resources` —
 * é esse relatório, gerado automaticamente, que autoriza escrever o
 * mapeamento real na próxima rodada (PESQUISAS-01B), não suposição.
 */
export async function runPesquisasCollector(): Promise<CollectorResult> {
  const client = createAdminClient();
  const runId = await startRun(client);
  const source = getPesquisasSourceDescriptor();

  let response: Response;
  try {
    response = await fetch(source.sourceUrl, { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(client, runId, 'failed', { reason: 'NETWORK_ERROR', source_url: source.sourceUrl, error: message }, 0, message);
    return { runId, status: 'failed', reason: 'NETWORK_ERROR', pollsInserted: 0 };
  }

  if (!response.ok) {
    const reason = response.status === 403 ? 'BLOCKED_BY_SOURCE_ACCESS' : 'HTTP_ERROR';
    const message = `TSE respondeu HTTP ${response.status} para ${source.sourceUrl}`;
    await finishRun(client, runId, 'failed', { reason, http_status: response.status, source_url: source.sourceUrl }, 0, message);
    return { runId, status: 'failed', reason, pollsInserted: 0 };
  }

  const zipBuffer = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(zipBuffer).digest('hex');

  let resources: ParsedCsvResource[];
  try {
    resources = await parseZipCsvResources(zipBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(
      client,
      runId,
      'failed',
      { reason: 'ZIP_OR_CSV_PARSE_ERROR', source_url: source.sourceUrl, sha256, error: message },
      0,
      message
    );
    return { runId, status: 'failed', reason: 'ZIP_OR_CSV_PARSE_ERROR', pollsInserted: 0 };
  }

  const discoveredResources: DiscoveredResource[] = resources.map((r) => ({
    fileName: r.fileName,
    headers: r.headers,
    rowCount: r.rows.length,
  }));

  // Ingestão real (schema verificado por download em 2026-08-19 — ver
  // lib/pesquisas/normalizer.ts). O arquivo "BRASIL" é o rollup nacional
  // completo — usar só ele evita contar a mesma pesquisa duas vezes (uma
  // vez no rollup, outra no arquivo por UF); a constraint UNIQUE em
  // tse_registration_number + upsert torna isso seguro de qualquer forma.
  const canonicalResource = resources.find((r) => r.fileName.toUpperCase().includes('BRASIL')) ?? null;

  if (!canonicalResource) {
    await finishRun(
      client,
      runId,
      'partial',
      { reason: 'CANONICAL_RESOURCE_NOT_FOUND', source_url: source.sourceUrl, sha256, discovered_resources: discoveredResources },
      0
    );
    return { runId, status: 'partial', reason: 'CANONICAL_RESOURCE_NOT_FOUND', discoveredResources, pollsInserted: 0 };
  }

  const normalized = canonicalResource.rows.map(normalizePesquisaRow).filter((p): p is ElectoralPollUpsert => p !== null);
  const skipped = canonicalResource.rows.length - normalized.length;

  let upserted = 0;
  try {
    const result = await upsertPolls(client, normalized);
    upserted = result.upserted;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(
      client,
      runId,
      'failed',
      { reason: 'DB_WRITE_ERROR', source_url: source.sourceUrl, sha256, discovered_resources: discoveredResources, error: message },
      0,
      message
    );
    return { runId, status: 'failed', reason: 'DB_WRITE_ERROR', discoveredResources, pollsInserted: 0 };
  }

  await finishRun(
    client,
    runId,
    'completed',
    {
      reason: 'OK',
      source_url: source.sourceUrl,
      sha256,
      discovered_resources: discoveredResources,
      canonical_resource: canonicalResource.fileName,
      rows_read: canonicalResource.rows.length,
      rows_skipped_no_identity: skipped,
    },
    upserted
  );

  return {
    runId,
    status: 'completed',
    reason: 'OK',
    discoveredResources,
    pollsInserted: upserted,
  };
}

export async function getLastCollectorRun(client: AdminClient) {
  const { data } = await client
    .from('source_collection_runs')
    .select('*')
    .eq('source', SOURCE_KEY)
    .eq('scope', SCOPE)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { status: string; finished_at: string | null; metadata: Record<string, unknown> } | null;
}

/**
 * Upsert idempotente por `tse_registration_number` (PARTE 4 — nunca duplicar
 * uma pesquisa já ingerida). Não é chamada hoje pelo coletor (ver acima),
 * mas fica pronta e testada isoladamente (fixture, não CSV real) para o
 * momento em que a normalização de PESQUISAS-01B estiver pronta.
 */
export async function upsertPolls(client: AdminClient, polls: ElectoralPollUpsert[]): Promise<{ upserted: number }> {
  if (polls.length === 0) return { upserted: 0 };

  const rows = polls.map((p) => ({
    tse_registration_number: p.tseRegistrationNumber,
    source: p.source,
    source_url: p.sourceUrl,
    source_dataset: p.sourceDataset,
    election_year: p.electionYear,
    uf: p.uf,
    municipio: p.municipio,
    cargo: p.cargo,
    abrangencia: p.abrangencia,
    instituto: p.instituto,
    contratante: p.contratante,
    pagante: p.pagante,
    valor: p.valor,
    metodologia: p.metodologia,
    data_registro: p.dataRegistro,
    campo_inicio: p.campoInicio,
    campo_fim: p.campoFim,
    amostra: p.amostra,
    margem_erro: p.margemErro,
    nivel_confianca: p.nivelConfianca,
    raw_source_row: p.rawSourceRow ?? null,
    ingested_at: p.ingestedAt,
  }));

  const { error, count } = await client
    .from('electoral_polls')
    .upsert(rows, { onConflict: 'tse_registration_number', ignoreDuplicates: false, count: 'exact' });
  if (error) throw new Error(`Falha ao gravar pesquisas: ${error.message}`);
  return { upserted: count ?? rows.length };
}
