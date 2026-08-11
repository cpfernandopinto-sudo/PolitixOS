'use server';

import { createAdminClient } from '@/lib/supabaseClient';
import { requireAuth } from '@/lib/auth/dal';
import {
  runSecurityCollection,
  type RunSecurityCollectionInput,
  type SecurityCollectionResult,
} from '@/lib/territorios/seguranca-collector';

export interface RunSecurityCollectionActionResult {
  success: boolean;
  result?: SecurityCollectionResult;
  error?: string;
  message?: string;
}

/**
 * Server Action para disparar o Motor Segurança Pública (MG/SEJUSP) a partir
 * do próprio PolitixOS — mesmo padrão de `runIbgeCollectionAction`: restrita
 * a admin, mesma lógica central do endpoint machine-to-machine
 * (`app/api/territorios/seguranca/collect/route.ts`), sem duplicação de
 * regra de persistência entre os dois caminhos de entrada.
 */
export async function runSecurityCollectionAction(
  input: RunSecurityCollectionInput
): Promise<RunSecurityCollectionActionResult> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'Apenas administradores podem disparar a carga de segurança pública territorial.',
    };
  }

  try {
    const client = createAdminClient();
    const result = await runSecurityCollection(client, input);
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido no Motor Segurança Pública.';
    console.error('[runSecurityCollectionAction] Erro:', message);
    return { success: false, error: 'SEGURANCA_COLLECTION_FAILED', message };
  }
}
