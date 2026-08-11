'use server'

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabaseClient'
import { requireAuth } from '@/lib/auth/dal'
import { getTerritoriesByUf, getTerritoryByIbgeCode } from '@/lib/queries/territories'
import {
  isValidIbgeCode,
  type CreateTerritoryInput,
  type CreateBriefingInput,
  type Territory,
  type TerritoryBriefing,
} from '@/lib/types/territories'

export interface CreateBriefingResult {
  success: boolean
  briefing?: TerritoryBriefing
  error?: string
  message?: string
}

/**
 * Municípios de uma UF já presentes no catálogo territorial. Server Action
 * (não apenas query) porque é chamada a partir do seletor UF→Município no
 * client component da tela — mesmo padrão de fetchTargetsAction.
 */
export async function getMunicipiosByUfAction(uf: string): Promise<Territory[]> {
  await requireAuth()
  return getTerritoriesByUf(uf)
}

/**
 * Cria o município no catálogo territorial se ele ainda não existir,
 * identificado pela chave natural `codigo_ibge`. Idempotente: chamar de
 * novo com o mesmo código nunca duplica a linha, só atualiza `updated_at`.
 *
 * Bloco 2 não integra nenhuma fonte externa — esta função é a primitiva
 * que o futuro Motor IBGE (Bloco 3+) vai reaproveitar para popular o
 * catálogo. Ela não inventa dados: quem chama precisa fornecer uf/municipio
 * reais, vindos de uma fonte confiável.
 */
export async function createTerritoryIfMissing(input: CreateTerritoryInput): Promise<Territory> {
  await requireAuth()

  if (!isValidIbgeCode(input.codigo_ibge)) {
    throw new Error(`Código IBGE inválido: "${input.codigo_ibge}". Esperado 7 dígitos numéricos.`)
  }

  const client = createAdminClient()
  const { data, error } = await client
    .from('territories')
    .upsert(
      {
        codigo_ibge: input.codigo_ibge,
        uf: input.uf.toUpperCase(),
        municipio: input.municipio,
        regiao: input.regiao ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'codigo_ibge' }
    )
    .select()
    .single()

  if (error) {
    console.error('[createTerritoryIfMissing] Erro:', error.message)
    throw new Error(error.message)
  }

  return data as Territory
}

/**
 * Cria uma solicitação de briefing territorial em status `nao_iniciado`.
 * NÃO dispara o orquestrador n8n — isso entra em bloco posterior, quando
 * o motor estiver conectado. Esta ação só registra a intenção e reserva
 * o `request_id` que os futuros collection_runs vão usar para correlação.
 */
export async function createTerritoryBriefingRequest(
  input: CreateBriefingInput
): Promise<CreateBriefingResult> {
  const session = await requireAuth()

  if (!isValidIbgeCode(input.codigo_ibge)) {
    return {
      success: false,
      error: 'INVALID_IBGE_CODE',
      message: `Código IBGE inválido: "${input.codigo_ibge}". Esperado 7 dígitos numéricos.`,
    }
  }

  const isAdmin = session.role === 'admin'
  const allowedTargetIds = isAdmin ? null : session.allowedTargetIds ?? []

  // Autorização: usuário não-admin só pode gerar briefing para um target
  // dentro do seu próprio escopo (mesma regra de allowedTargetIds usada em
  // todo o restante do projeto). target_id ausente = briefing genérico do
  // território, permitido para qualquer usuário autenticado.
  if (input.target_id && !isAdmin) {
    if (!allowedTargetIds || !allowedTargetIds.includes(input.target_id)) {
      return {
        success: false,
        error: 'TARGET_NOT_ALLOWED',
        message: 'Você não tem permissão para gerar briefing para este candidato.',
      }
    }
  }

  const territory = await getTerritoryByIbgeCode(input.codigo_ibge)
  if (!territory) {
    return {
      success: false,
      error: 'TERRITORY_NOT_FOUND',
      message: 'Território não encontrado na base territorial. A base ainda não foi inicializada para esta cidade.',
    }
  }

  const client = createAdminClient()
  const { data, error } = await client
    .from('territory_briefings')
    .insert({
      territory_id: territory.id,
      target_id: input.target_id ?? null,
      requested_by: session.userId,
      request_id: randomUUID(),
      status: 'nao_iniciado',
    })
    .select()
    .single()

  if (error) {
    console.error('[createTerritoryBriefingRequest] Erro:', error.message)
    return {
      success: false,
      error: 'BRIEFING_CREATE_FAILED',
      message: error.message,
    }
  }

  return { success: true, briefing: data as TerritoryBriefing }
}
