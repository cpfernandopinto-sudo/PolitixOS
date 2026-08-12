import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { runTseCollection, TseCollectionError, MUNICIPAL_YEARS } from '@/lib/territorios/tse-collector';
import { TseSourceError } from '@/lib/territorios/tse-client';

export const maxDuration = 300;

function isAuthorized(req: NextRequest, expected: string): boolean {
  const provided = req.headers.get('x-territorios-tse-secret');
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.TERRITORIOS_TSE_CALLBACK_SECRET;
  if (!secret) return NextResponse.json({ success: false, code: 'TERRITORIOS_ENV_MISSING', error: 'Serviço não configurado.' }, { status: 503 });
  if (!isAuthorized(req, secret)) return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Não autorizado.' }, { status: 401 });
  let payload: { codigo_ibge?: string; request_id?: string; years?: number[] };
  try { payload = await req.json(); } catch { return NextResponse.json({ success: false, code: 'INVALID_PAYLOAD', error: 'Payload inválido.' }, { status: 400 }); }
  if (!payload.codigo_ibge) return NextResponse.json({ success: false, code: 'MISSING_CODIGO_IBGE', error: 'Campo codigo_ibge é obrigatório.' }, { status: 400 });
  if (payload.years && (!Array.isArray(payload.years) || payload.years.some((year) => !Number.isInteger(year) || year < 1994 || year > 2100))) return NextResponse.json({ success: false, code: 'INVALID_YEARS', error: 'Campo years inválido.' }, { status: 400 });
  try {
    const result = await runTseCollection(createAdminClient(), { codigoIbge: payload.codigo_ibge, requestId: payload.request_id, years: payload.years ?? [...MUNICIPAL_YEARS] });
    return NextResponse.json({
      success: result.overallStatus !== 'failed',
      result: {
        requestId: result.requestId,
        territory: result.territory,
        referenceYears: result.dataset.metadata.referenceYears,
        totalsCollected: result.dataset.totals.length,
        candidateResultsCollected: result.dataset.results.length,
        partyResultsCollected: result.dataset.parties.length,
        indicatorsPersisted: result.indicatorsPersisted,
        evidencePersisted: result.evidencePersisted,
        overallStatus: result.overallStatus,
        errors: result.errors,
      },
    });
  } catch (error) {
    if (error instanceof TseCollectionError) {
      const status = error.kind === 'invalid_input' ? 400 : error.kind === 'territory_not_found' ? 404 : error.kind === 'mapping_not_found' ? 422 : 500;
      return NextResponse.json({ success: false, code: error.kind.toUpperCase(), error: error.message }, { status });
    }
    if (error instanceof TseSourceError) return NextResponse.json({ success: false, code: 'SOURCE_FETCH_FAILED', error: error.message }, { status: 502 });
    return NextResponse.json({ success: false, code: 'TSE_COLLECTION_FAILED', error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
