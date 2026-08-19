import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { runPesquisasCollector } from '@/lib/pesquisas/collector';

export const maxDuration = 120;

/**
 * Endpoint controlado de coleta (PARTE 12) — execução manual, sem
 * scheduler. Diferente dos coletores territoriais (que usam um segredo de
 * cabeçalho para chamadas do n8n), este é acionado por um admin autenticado
 * pela própria interface do PolitixOS.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const result = await runPesquisasCollector();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, code: 'COLLECTOR_FAILED', error: message }, { status: 502 });
  }
}
