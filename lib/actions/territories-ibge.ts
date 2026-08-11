'use server';

import { createAdminClient } from '@/lib/supabaseClient';
import { requireAuth } from '@/lib/auth/dal';
import { runIbgeCollection, type RunIbgeCollectionInput, type IbgeCollectionResult } from '@/lib/territorios/ibge-collector';

export interface RunIbgeCollectionActionResult {
  success: boolean;
  result?: IbgeCollectionResult;
  error?: string;
  message?: string;
}

/**
 * Server Action para disparar o Motor IBGE a partir do próprio PolitixOS
 * (uso administrativo/homologação). Restrita a admin — carregar/atualizar
 * o catálogo territorial global não é uma ação de usuário comum.
 *
 * Esta é a MESMA lógica central que `app/api/territorios/ibge/collect/route.ts`
 * expõe para chamada máquina-a-máquina (futuro workflow n8n) — ver
 * `lib/territorios/ibge-collector.ts`. Nenhuma duplicação de regra de
 * persistência entre os dois caminhos de entrada.
 */
export async function runIbgeCollectionAction(input: RunIbgeCollectionInput): Promise<RunIbgeCollectionActionResult> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'Apenas administradores podem disparar a carga do catálogo territorial.',
    };
  }

  try {
    const client = createAdminClient();
    const result = await runIbgeCollection(client, input);
    if (result.blocked) {
      return { success: false, error: 'NATIONAL_LOAD_BLOCKED', message: result.blockedReason, result };
    }
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no Motor IBGE.';
    console.error('[runIbgeCollectionAction] Erro:', message);
    return { success: false, error: 'IBGE_COLLECTION_FAILED', message };
  }
}
