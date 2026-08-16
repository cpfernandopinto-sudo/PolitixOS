import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { runHealthCollection } from '@/lib/territorios/saude-collector';

export const maxDuration = 300;

function isAuthorized(req: NextRequest, expected: string): boolean {
  const provided = req.headers.get('x-territorios-saude-secret');
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.TERRITORIOS_SAUDE_CALLBACK_SECRET;
  if (!secret) return NextResponse.json({ success: false, code: 'TERRITORIOS_ENV_MISSING', error: 'Serviço não configurado.' }, { status: 503 });
  if (!isAuthorized(req, secret)) return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Não autorizado.' }, { status: 401 });

  let payload: { codigo_ibge?: unknown; codigoIbge?: unknown; force_refresh?: unknown; request_id?: unknown };
  try { payload = await req.json(); } catch { return NextResponse.json({ success: false, code: 'INVALID_PAYLOAD', error: 'Payload inválido.' }, { status: 400 }); }
  const codigoIbge = payload.codigo_ibge ?? payload.codigoIbge;
  if (typeof codigoIbge !== 'string' || !/^\d{7}$/.test(codigoIbge)) return NextResponse.json({ success: false, code: 'INVALID_CODIGO_IBGE', error: 'Campo codigo_ibge é obrigatório e deve conter 7 dígitos.' }, { status: 400 });
  if (payload.force_refresh !== undefined && typeof payload.force_refresh !== 'boolean') return NextResponse.json({ success: false, code: 'INVALID_FORCE_REFRESH', error: 'Campo force_refresh deve ser booleano.' }, { status: 400 });
  if (payload.request_id !== undefined && typeof payload.request_id !== 'string') return NextResponse.json({ success: false, code: 'INVALID_REQUEST_ID', error: 'Campo request_id deve ser string.' }, { status: 400 });

  try {
    const result = await runHealthCollection(createAdminClient(), { codigoIbge, forceRefresh: payload.force_refresh ?? false, requestId: payload.request_id as string | undefined });
    return NextResponse.json({
      engine: 'saude', status: result.status, codigo_ibge: result.codigoIbge, requestId: result.requestId,
      updated: result.inserted + result.updated > 0, recordsPersisted: result.recordsPersisted,
      lastUpdated: result.lastUpdated, coverage: result.coverage, cacheHit: result.cacheHit, error: result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'TERRITORY_NOT_FOUND') return NextResponse.json({ engine: 'saude', status: 'not_available', codigo_ibge: codigoIbge, requestId: payload.request_id ?? null, updated: false, recordsPersisted: 0, lastUpdated: null, coverage: null, cacheHit: false, error: message }, { status: 404 });
    return NextResponse.json({ engine: 'saude', status: 'failed', codigo_ibge: codigoIbge, requestId: payload.request_id ?? null, updated: false, recordsPersisted: 0, lastUpdated: null, coverage: null, cacheHit: false, error: message }, { status: 502 });
  }
}
