import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireAuth, mockGetAllowedTargetIds } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockGetAllowedTargetIds: vi.fn(),
}));
vi.mock('@/lib/auth/dal', () => ({
  requireAuth: mockRequireAuth,
  getAllowedTargetIds: mockGetAllowedTargetIds,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({
  createAdminClient: () => ({ from: mockFrom }),
  createClient: () => ({ from: mockFrom }),
}));

import {
  createCandidateAction,
  updateCandidateAction,
  deleteSocialAccountAction,
  toggleTargetActiveAction,
  toggleSocialAccountActiveAction,
  fetchTargetsAction,
} from './candidatos';

/** Chain genérica que resolve para `result` em qualquer terminal (.single()/await direto). */
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.insert = vi.fn(self);
  c.update = vi.fn(self);
  c.delete = vi.fn(self);
  c.upsert = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.order = vi.fn(self);
  c.single = vi.fn(() => Promise.resolve(result));
  // A maioria das chamadas do código-fonte faz `await` diretamente na chain
  // (sem `.single()`), então a própria chain precisa ser "thenable".
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}

const targetRow = { id: 't-allowed', candidate_name: 'Ana', city: null, state: null, keywords: null, is_active: true };

function targetInput(overrides: Partial<{ candidate_name: string; city: string; state: string; keywords: string; is_active: boolean }> = {}) {
  return { candidate_name: 'Ana', city: '', state: '', keywords: '', is_active: true, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ role: 'gestor' });
});

describe('createCandidateAction — qualquer usuário autenticado pode criar', () => {
  it('não checa allowedTargetIds (não há nada a checar para um candidato novo)', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    mockFrom.mockReturnValue(chain({ data: { ...targetRow, id: 'new-id' }, error: null }));

    const result = await createCandidateAction(targetInput(), []);

    expect(result.success).toBe(true);
    expect(mockGetAllowedTargetIds).not.toHaveBeenCalled();
  });
});

describe('updateCandidateAction — escopo a candidatos permitidos', () => {
  it('nega quando o target não está em allowedTargetIds (não-admin)', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);

    const result = await updateCandidateAction('t-forbidden', targetInput(), [], []);

    expect(result).toEqual({ success: false, error: 'Você não tem permissão para este candidato.' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('permite quando o target está em allowedTargetIds', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    mockFrom.mockReturnValue(chain({ data: targetRow, error: null }));

    const result = await updateCandidateAction('t-allowed', targetInput(), [], []);

    expect(result.success).toBe(true);
  });

  it('admin (allowedTargetIds=null) não é restrito a nenhum target específico', async () => {
    mockRequireAuth.mockResolvedValue({ role: 'admin' });
    mockGetAllowedTargetIds.mockResolvedValue(null);
    mockFrom.mockReturnValue(chain({ data: targetRow, error: null }));

    const result = await updateCandidateAction('qualquer-id', targetInput(), [], []);

    expect(result.success).toBe(true);
  });

  it('restringe a exclusão de contas sociais ao próprio target (defesa contra deletedAccountIds de outro candidato)', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    const targetChain = chain({ data: targetRow, error: null });
    const deleteChain = chain({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => (table === 'social_accounts' ? deleteChain : targetChain));

    await updateCandidateAction('t-allowed', targetInput(), [], ['acc-1']);

    expect(deleteChain.in).toHaveBeenCalledWith('id', ['acc-1']);
    expect(deleteChain.eq).toHaveBeenCalledWith('target_id', 't-allowed');
  });
});

describe('toggleTargetActiveAction — escopo a candidatos permitidos', () => {
  it('nega toggle em candidato fora do escopo', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);

    const result = await toggleTargetActiveAction('t-forbidden', false);

    expect(result).toEqual({ success: false, error: 'Você não tem permissão para este candidato.' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('permite toggle em candidato permitido', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    mockFrom.mockReturnValue(chain({ data: null, error: null }));

    const result = await toggleTargetActiveAction('t-allowed', true);

    expect(result.success).toBe(true);
  });
});

describe('deleteSocialAccountAction / toggleSocialAccountActiveAction — resolve target_id antes de autorizar', () => {
  it('nega quando a conta social pertence a um target fora do escopo', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    mockFrom.mockReturnValue(chain({ data: { target_id: 't-forbidden' }, error: null }));

    const result = await deleteSocialAccountAction('acc-1');

    expect(result).toEqual({ success: false, error: 'Você não tem permissão para esta conta social.' });
  });

  it('permite quando a conta social pertence a um target permitido', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    // A checagem consulta social_accounts, e a operação em si consulta social_accounts de novo — mesma chain serve para ambas.
    mockFrom.mockReturnValue(chain({ data: { target_id: 't-allowed' }, error: null }));

    const result = await toggleSocialAccountActiveAction('acc-1', false);

    expect(result.success).toBe(true);
  });
});

describe('fetchTargetsAction — lista filtrada por allowedTargetIds', () => {
  it('não-admin: aplica .in(id, allowedTargetIds)', async () => {
    mockGetAllowedTargetIds.mockResolvedValue(['t-allowed']);
    const c = chain({ data: [targetRow], error: null });
    mockFrom.mockReturnValue(c);

    const result = await fetchTargetsAction();

    expect(c.in).toHaveBeenCalledWith('id', ['t-allowed']);
    expect(result).toEqual([targetRow]);
  });

  it('não-admin sem nenhum candidato permitido → retorna [] sem consultar o banco', async () => {
    mockGetAllowedTargetIds.mockResolvedValue([]);

    const result = await fetchTargetsAction();

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('admin: não aplica filtro de id', async () => {
    mockRequireAuth.mockResolvedValue({ role: 'admin' });
    mockGetAllowedTargetIds.mockResolvedValue(null);
    const c = chain({ data: [targetRow], error: null });
    mockFrom.mockReturnValue(c);

    await fetchTargetsAction();

    expect(c.in).not.toHaveBeenCalled();
  });
});
