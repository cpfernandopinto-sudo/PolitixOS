import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runPesquisasCollector } from '@/lib/pesquisas/collector';

// ---------------------------------------------------------------------------
// PESQUISAS-N8N-01 — Endpoint máquina-a-máquina do coletor SELETIVO de
// Pesquisas Eleitorais. Diferente de POST /api/pesquisas/collect (sessão
// admin, botão manual em CollectButton.tsx, mode='all' — não muda), este
// endpoint é para o workflow n8n e sempre roda em mode='monitored': só
// persiste pesquisa relevante para um target com poll_monitoring_enabled=true
// (lib/pesquisas/monitoring.ts).
//
// Autenticação: mesmo padrão já usado pelos coletores territoriais (ver
// app/api/territorios/ibge/collect/route.ts) — segredo compartilhado em
// PESQUISAS_CALLBACK_SECRET (server-only, nunca em NEXT_PUBLIC_*), enviado
// no header `x-pesquisas-secret`, comparado em tempo constante.
// ---------------------------------------------------------------------------

interface CollectPayload {
  mode?: 'monitored';
  targetId?: string;
  force?: boolean;
}

function isAuthorized(req: NextRequest, expectedSecret: string): boolean {
  const provided = req.headers.get('x-pesquisas-secret');
  if (!provided) return false;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expectedSecret);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  const secret = process.env.PESQUISAS_CALLBACK_SECRET;

  if (!secret) {
    console.error('[automation/pesquisas/collect] PESQUISAS_CALLBACK_SECRET não configurada.');
    return NextResponse.json(
      { success: false, error: 'Serviço não configurado.', code: 'PESQUISAS_ENV_MISSING' },
      { status: 503 }
    );
  }

  if (!isAuthorized(req, secret)) {
    console.warn('[automation/pesquisas/collect] Requisição sem segredo válido.');
    return NextResponse.json({ success: false, error: 'Não autorizado.', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  let payload: CollectPayload;
  try {
    payload = req.headers.get('content-length') === '0' || !req.headers.get('content-length') ? {} : await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido.', code: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  console.info('[automation/pesquisas/collect] Coleta seletiva iniciada:', { targetId: payload.targetId ?? null });

  try {
    const result = await runPesquisasCollector({
      mode: 'monitored',
      targetIds: payload.targetId ? [payload.targetId] : undefined,
    });

    console.info('[automation/pesquisas/collect] Coleta concluída:', {
      runId: result.runId,
      status: result.status,
      pollsInserted: result.pollsInserted,
      monitored: result.monitored,
    });

    if (result.status === 'failed') {
      return NextResponse.json({ success: false, error: result.reason, result }, { status: 502 });
    }

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no coletor de Pesquisas Eleitorais.';
    console.error('[automation/pesquisas/collect] Falha na coleta:', message);
    return NextResponse.json({ success: false, error: message, code: 'PESQUISAS_COLLECTION_FAILED' }, { status: 502 });
  }
}
