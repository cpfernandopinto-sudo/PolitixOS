import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isValidIbgeCode } from '@/lib/types/territories'

const { mockRequireAuth } = vi.hoisted(() => ({ mockRequireAuth: vi.fn() }))
vi.mock('@/lib/auth/dal', () => ({
  requireAuth: mockRequireAuth,
}))

const { mockGetTerritoryByIbgeCode } = vi.hoisted(() => ({ mockGetTerritoryByIbgeCode: vi.fn() }))
vi.mock('@/lib/queries/territories', () => ({
  getTerritoryByIbgeCode: mockGetTerritoryByIbgeCode,
}))

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: mockFrom }),
  createClient: () => ({ from: mockFrom }),
}))

import { createTerritoryIfMissing, createTerritoryBriefingRequest } from './territories'

// ─── Helpers ────────────────────────────────────────────────────────────────

function chainReturning(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.upsert = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  return chain
}

function session(overrides: Partial<{ role: string; allowedTargetIds: string[]; userId: string }> = {}) {
  return {
    userId: 'user-1',
    name: 'Teste',
    email: 'teste@politixos.com',
    role: 'gestor',
    permissions: ['territorios'],
    allowedTargetIds: [],
    expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
    ...overrides,
  }
}

function territory(overrides: Partial<{ id: string; codigo_ibge: string }> = {}) {
  return {
    id: 'territory-1',
    codigo_ibge: '3118601',
    uf: 'MG',
    municipio: 'Contagem',
    regiao: null,
    geometria: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── isValidIbgeCode ──────────────────────────────────────────────────────────

describe('isValidIbgeCode', () => {
  it('aceita código de 7 dígitos', () => {
    expect(isValidIbgeCode('3118601')).toBe(true)
  })

  it('rejeita código com letras, tamanho errado ou vazio', () => {
    expect(isValidIbgeCode('abc1234')).toBe(false)
    expect(isValidIbgeCode('123')).toBe(false)
    expect(isValidIbgeCode('12345678')).toBe(false)
    expect(isValidIbgeCode('')).toBe(false)
  })
})

// ─── createTerritoryIfMissing ─────────────────────────────────────────────────

describe('createTerritoryIfMissing', () => {
  it('rejeita código IBGE inválido sem tocar o banco', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'admin' }))

    await expect(createTerritoryIfMissing({ codigo_ibge: 'invalido', uf: 'MG', municipio: 'Contagem' })).rejects.toThrow(
      /Código IBGE inválido/
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('faz upsert por codigo_ibge (idempotente) — mesma chamada duas vezes não duplica', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'admin' }))
    const chain = chainReturning({ data: territory(), error: null })
    mockFrom.mockReturnValue(chain)

    await createTerritoryIfMissing({ codigo_ibge: '3118601', uf: 'mg', municipio: 'Contagem' })
    await createTerritoryIfMissing({ codigo_ibge: '3118601', uf: 'mg', municipio: 'Contagem' })

    expect(mockFrom).toHaveBeenCalledWith('territories')
    expect(chain.upsert).toHaveBeenCalledTimes(2)
    const [payload, options] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(payload.codigo_ibge).toBe('3118601')
    expect(payload.uf).toBe('MG') // normalizado para maiúsculas
    expect(options).toEqual({ onConflict: 'codigo_ibge' })
  })
})

// ─── createTerritoryBriefingRequest ───────────────────────────────────────────

describe('createTerritoryBriefingRequest', () => {
  it('rejeita código IBGE inválido antes de consultar o território', async () => {
    mockRequireAuth.mockResolvedValue(session())

    const result = await createTerritoryBriefingRequest({ codigo_ibge: 'xx' })

    expect(result).toEqual({
      success: false,
      error: 'INVALID_IBGE_CODE',
      message: expect.stringContaining('Código IBGE inválido'),
    })
    expect(mockGetTerritoryByIbgeCode).not.toHaveBeenCalled()
  })

  it('retorna TERRITORY_NOT_FOUND quando a base territorial está vazia', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'admin' }))
    mockGetTerritoryByIbgeCode.mockResolvedValue(null)

    const result = await createTerritoryBriefingRequest({ codigo_ibge: '3118601' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('TERRITORY_NOT_FOUND')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('bloqueia usuário não-admin gerando briefing para target fora de allowedTargetIds', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'gestor', allowedTargetIds: ['target-a'] }))

    const result = await createTerritoryBriefingRequest({ codigo_ibge: '3118601', target_id: 'target-b' })

    expect(result).toEqual({
      success: false,
      error: 'TARGET_NOT_ALLOWED',
      message: expect.stringContaining('permissão'),
    })
    expect(mockGetTerritoryByIbgeCode).not.toHaveBeenCalled()
  })

  it('permite usuário não-admin gerando briefing para target dentro de allowedTargetIds', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'gestor', allowedTargetIds: ['target-a'] }))
    mockGetTerritoryByIbgeCode.mockResolvedValue(territory())
    const chain = chainReturning({
      data: { id: 'briefing-1', territory_id: 'territory-1', target_id: 'target-a', status: 'nao_iniciado' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await createTerritoryBriefingRequest({ codigo_ibge: '3118601', target_id: 'target-a' })

    expect(result.success).toBe(true)
    expect(result.briefing?.status).toBe('nao_iniciado')
  })

  it('admin ignora allowedTargetIds (bypass) mesmo com target_id fora de qualquer escopo', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'admin', allowedTargetIds: [] }))
    mockGetTerritoryByIbgeCode.mockResolvedValue(territory())
    const chain = chainReturning({
      data: { id: 'briefing-1', territory_id: 'territory-1', target_id: 'qualquer-target', status: 'nao_iniciado' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await createTerritoryBriefingRequest({ codigo_ibge: '3118601', target_id: 'qualquer-target' })

    expect(result.success).toBe(true)
  })

  it('target_id nullable — briefing genérico do território sem candidato associado', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'gestor', allowedTargetIds: [] }))
    mockGetTerritoryByIbgeCode.mockResolvedValue(territory())
    const chain = chainReturning({
      data: { id: 'briefing-1', territory_id: 'territory-1', target_id: null, status: 'nao_iniciado' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await createTerritoryBriefingRequest({ codigo_ibge: '3118601' })

    expect(result.success).toBe(true)
    expect(result.briefing?.target_id).toBeNull()
    const [payload] = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(payload.target_id).toBeNull()
    expect(payload.status).toBe('nao_iniciado')
    expect(typeof payload.request_id).toBe('string')
  })

  it('propaga erro estruturado quando a inserção falha no banco', async () => {
    mockRequireAuth.mockResolvedValue(session({ role: 'admin' }))
    mockGetTerritoryByIbgeCode.mockResolvedValue(territory())
    const chain = chainReturning({ data: null, error: { message: 'relation "territory_briefings" does not exist' } })
    mockFrom.mockReturnValue(chain)

    const result = await createTerritoryBriefingRequest({ codigo_ibge: '3118601' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('BRIEFING_CREATE_FAILED')
  })
})
