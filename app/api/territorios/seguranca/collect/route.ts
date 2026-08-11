import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  runSecurityCollection,
  SecurityCollectionError,
  MIN_MONTHS,
  MAX_MONTHS,
  DEFAULT_MONTHS,
  MAX_BATCH_SIZE,
  type SecurityCollectionMode,
  type RunSecurityCollectionInput,
} from '@/lib/territorios/seguranca-collector';
import { SegurancaSourceError } from '@/lib/territorios/seguranca-mg-client';

// Sem isto, a rota herda o timeout padrão da Vercel (10s no Hobby, 15s no Pro
// sem config) — a homologação real do Bloco 4.6 mediu 12,8s para um lote de 5
// municípios em primeira coleta (caminho INSERT), já acima do default do
// Hobby. 60s cobre esse caminho com folga confortável; um lote que caia no
// caminho de UPDATE (reprocessamento) pode ultrapassar isso — ver relatório.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Endpoint máquina-a-máquina do Motor Segurança Pública (MG/SEJUSP) —
// Politix Territórios (Bloco 4.2). Endpoint PRÓPRIO, não reutiliza
// `/api/territorios/ibge/collect` (Seção 11 do briefing) — contrato,
// secret e header de autenticação são todos independentes do Motor IBGE.
//
// Autenticação: segredo compartilhado em
// `TERRITORIOS_SEGURANCA_CALLBACK_SECRET` (server-only), enviado no header
// `x-territorios-seguranca-secret`. Comparação em tempo constante. Mesmo
// padrão do Motor IBGE (route.ts de /ibge/collect), secret PRÓPRIO — nunca
// reaproveita `TERRITORIOS_IBGE_CALLBACK_SECRET`.
// ---------------------------------------------------------------------------

interface BatchTerritoryInput {
  codigo_ibge?: string;
}

interface CollectPayload {
  request_id?: string;
  mode?: SecurityCollectionMode;
  codigo_ibge?: string;
  /** Só para mode=batch — até MAX_BATCH_SIZE itens, ex.: [{ "codigo_ibge": "3118601" }]. */
  territories?: BatchTerritoryInput[];
  months?: number;
}

function isAuthorized(req: NextRequest, expectedSecret: string): boolean {
  const provided = req.headers.get('x-territorios-seguranca-secret');
  if (!provided) return false;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expectedSecret);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  const secret = process.env.TERRITORIOS_SEGURANCA_CALLBACK_SECRET;

  if (!secret) {
    console.error('[territorios/seguranca/collect] TERRITORIOS_SEGURANCA_CALLBACK_SECRET não configurada.');
    return NextResponse.json(
      { success: false, error: 'Serviço não configurado.', code: 'TERRITORIOS_ENV_MISSING' },
      { status: 503 }
    );
  }

  if (!isAuthorized(req, secret)) {
    console.warn('[territorios/seguranca/collect] Requisição sem segredo válido.');
    return NextResponse.json({ success: false, error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let payload: CollectPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido.', code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const VALID_MODES: SecurityCollectionMode[] = ['single', 'mg', 'batch'];
  if (!payload.mode || !VALID_MODES.includes(payload.mode)) {
    return NextResponse.json(
      { success: false, error: `Campo "mode" ausente ou inválido. Use um de: ${VALID_MODES.join(', ')}.`, code: 'INVALID_MODE' },
      { status: 400 }
    );
  }
  if (payload.mode === 'single' && !payload.codigo_ibge) {
    return NextResponse.json(
      { success: false, error: 'mode=single requer "codigo_ibge".', code: 'MISSING_CODIGO_IBGE' },
      { status: 400 }
    );
  }

  let codigosIbge: string[] | null = null;
  if (payload.mode === 'batch') {
    const territories = payload.territories;
    if (!Array.isArray(territories) || territories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'mode=batch requer "territories" com ao menos 1 item (ex.: [{ "codigo_ibge": "3118601" }]).', code: 'EMPTY_BATCH' },
        { status: 400 }
      );
    }
    if (territories.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `mode=batch aceita no máximo ${MAX_BATCH_SIZE} territórios por chamada (recebido: ${territories.length}).`, code: 'BATCH_TOO_LARGE' },
        { status: 400 }
      );
    }
    const invalidIndex = territories.findIndex((t) => !t || typeof t.codigo_ibge !== 'string' || t.codigo_ibge.trim() === '');
    if (invalidIndex !== -1) {
      return NextResponse.json(
        { success: false, error: `territories[${invalidIndex}] precisa de um "codigo_ibge" (string não vazia).`, code: 'INVALID_BATCH_ITEM' },
        { status: 400 }
      );
    }
    codigosIbge = territories.map((t) => (t.codigo_ibge as string).trim());
  }

  const months = payload.months ?? DEFAULT_MONTHS;
  if (!Number.isInteger(months) || months < MIN_MONTHS || months > MAX_MONTHS) {
    return NextResponse.json(
      { success: false, error: `Campo "months" deve ser um inteiro entre ${MIN_MONTHS} e ${MAX_MONTHS}.`, code: 'INVALID_MONTHS' },
      { status: 400 }
    );
  }

  const input: RunSecurityCollectionInput = {
    mode: payload.mode,
    codigoIbge: payload.codigo_ibge ?? null,
    codigosIbge,
    months,
    requestId: payload.request_id ?? null,
  };

  console.info('[territorios/seguranca/collect] Coleta iniciada:', {
    mode: input.mode,
    codigoIbge: input.codigoIbge,
    batchSize: codigosIbge?.length,
    months,
    requestId: input.requestId,
  });

  try {
    const client = createAdminClient();
    const result = await runSecurityCollection(client, input);

    console.info('[territorios/seguranca/collect] Coleta concluída:', {
      requestId: result.requestId,
      territoriesProcessed: result.territoriesProcessed,
      indicatorsPersisted: result.indicatorsPersisted,
      overallStatus: result.overallStatus,
    });

    return NextResponse.json(
      {
        success: result.overallStatus !== 'failed',
        request_id: result.requestId,
        source: result.source,
        dataset: result.dataset,
        mode: result.mode,
        months: result.monthsRequested,
        window: result.window,
        territories_expected: result.territoriesExpected,
        territories_processed: result.territoriesProcessed,
        indicators_persisted: result.indicatorsPersisted,
        rows_received: result.rowsReceived,
        rows_discarded: result.rowsDiscarded,
        unknown_natures: result.unknownNatures,
        excluded_out_of_scope_natures: result.excludedOutOfScopeNatures,
        unmatched_municipalities: result.unmatchedMunicipalities,
        territories: result.territoryResults.map((t) => ({
          codigo_ibge: t.codigoIbge,
          status: t.status,
          request_id: t.requestId,
          indicators_persisted: t.indicatorsPersisted,
          error: t.error,
          duration_ms: t.durationMs,
        })),
        files_downloaded: result.filesDownloaded,
        timings: {
          download_ms: result.timings.downloadMs,
          parse_ms: result.timings.parseMs,
          normalization_ms: result.timings.normalizationMs,
          processing_ms: result.timings.processingMs,
          persistence_ms: result.timings.persistenceMs,
          total_ms: result.timings.totalMs,
        },
        overall_status: result.overallStatus,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SecurityCollectionError && err.kind === 'invalid_input') {
      return NextResponse.json({ success: false, error: err.message, code: 'INVALID_INPUT' }, { status: 400 });
    }
    if (err instanceof SecurityCollectionError && err.kind === 'territory_not_found') {
      return NextResponse.json({ success: false, error: err.message, code: 'TERRITORY_NOT_FOUND' }, { status: 404 });
    }
    if (err instanceof SegurancaSourceError) {
      console.error('[territorios/seguranca/collect] Falha na fonte SEJUSP-MG:', err.kind, err.message);
      return NextResponse.json({ success: false, error: err.message, code: 'SOURCE_FETCH_FAILED' }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : 'Erro desconhecido no Motor Segurança Pública.';
    console.error('[territorios/seguranca/collect] Falha na coleta:', message);
    return NextResponse.json({ success: false, error: message, code: 'SEGURANCA_COLLECTION_FAILED' }, { status: 502 });
  }
}
