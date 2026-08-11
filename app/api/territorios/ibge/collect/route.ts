import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { runIbgeCollection, type CollectionMode, type RunIbgeCollectionInput } from '@/lib/territorios/ibge-collector';

// ---------------------------------------------------------------------------
// Endpoint máquina-a-máquina do Motor IBGE — Politix Territórios (Bloco 3).
//
// Este é o endpoint que um workflow n8n (futuro — ver
// docs/RELATORIO_TERRITORIOS_BLOCO3_MOTOR_IBGE.md, seção "Workflow n8n")
// chamaria depois de buscar dados do IBGE, OU que qualquer chamador
// autenticado com o segredo compartilhado pode usar para disparar a coleta
// diretamente (o próprio Next.js já faz a chamada real ao IBGE — ver
// lib/territorios/ibge-client.ts — o n8n não é pré-requisito técnico para
// este endpoint funcionar, só para orquestrar disparos futuros).
//
// Autenticação: segredo compartilhado em `TERRITORIOS_IBGE_CALLBACK_SECRET`
// (server-only, nunca em NEXT_PUBLIC_*), enviado no header
// `x-territorios-secret`. Comparação em tempo constante para evitar timing
// attack. Nunca logamos o valor do segredo nem o header recebido.
//
// Mesmo padrão de variáveis de ambiente server-side já usado em
// app/api/investigations/start/route.ts (N8N_INVESTIGATION_API_KEY).
// ---------------------------------------------------------------------------

interface CollectPayload {
  request_id?: string;
  mode?: CollectionMode;
  uf?: string;
  codigo_ibge?: string;
}

function isAuthorized(req: NextRequest, expectedSecret: string): boolean {
  const provided = req.headers.get('x-territorios-secret');
  if (!provided) return false;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expectedSecret);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  const secret = process.env.TERRITORIOS_IBGE_CALLBACK_SECRET;

  if (!secret) {
    console.error('[territorios/ibge/collect] TERRITORIOS_IBGE_CALLBACK_SECRET não configurada.');
    return NextResponse.json(
      { success: false, error: 'Serviço não configurado.', code: 'TERRITORIOS_ENV_MISSING' },
      { status: 503 }
    );
  }

  if (!isAuthorized(req, secret)) {
    console.warn('[territorios/ibge/collect] Requisição sem segredo válido.');
    return NextResponse.json({ success: false, error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let payload: CollectPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido.', code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const VALID_MODES: CollectionMode[] = ['single', 'uf', 'national'];
  if (!payload.mode || !VALID_MODES.includes(payload.mode)) {
    return NextResponse.json(
      { success: false, error: `Campo "mode" ausente ou inválido. Use um de: ${VALID_MODES.join(', ')}.`, code: 'INVALID_MODE' },
      { status: 400 }
    );
  }
  if (payload.mode === 'uf' && !payload.uf) {
    return NextResponse.json({ success: false, error: 'mode=uf requer "uf".', code: 'MISSING_UF' }, { status: 400 });
  }
  if (payload.mode === 'single' && !payload.codigo_ibge) {
    return NextResponse.json(
      { success: false, error: 'mode=single requer "codigo_ibge".', code: 'MISSING_CODIGO_IBGE' },
      { status: 400 }
    );
  }

  const input: RunIbgeCollectionInput = {
    mode: payload.mode,
    uf: payload.uf ?? null,
    codigoIbge: payload.codigo_ibge ?? null,
    requestId: payload.request_id ?? null,
  };

  console.info('[territorios/ibge/collect] Coleta iniciada:', { mode: input.mode, uf: input.uf, requestId: input.requestId });

  try {
    const client = createAdminClient();
    const result = await runIbgeCollection(client, input);

    if (result.blocked) {
      return NextResponse.json({ success: false, error: result.blockedReason, code: 'NATIONAL_LOAD_BLOCKED', result }, { status: 403 });
    }

    console.info('[territorios/ibge/collect] Coleta concluída:', {
      requestId: result.requestId,
      itemsReceived: result.itemsReceived,
      itemsPersisted: result.itemsPersisted,
      itemsFailed: result.itemsFailed,
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no Motor IBGE.';
    console.error('[territorios/ibge/collect] Falha na coleta:', message);
    return NextResponse.json({ success: false, error: message, code: 'IBGE_COLLECTION_FAILED' }, { status: 502 });
  }
}
