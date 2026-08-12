import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ parse: vi.fn(), open: vi.fn() }));
vi.mock('csv-parse/sync', () => ({ parse: mocks.parse }));
vi.mock('unzipper', () => ({ default: { Open: { buffer: mocks.open } } }));

import { clearTseProcessCache, downloadTseCsv, getTseCacheKey, getTseCacheStats } from './tse-client';

beforeEach(() => {
  clearTseProcessCache();
  vi.restoreAllMocks();
  mocks.parse.mockReturnValue([{ CD_MUNICIPIO: '43710', SG_UF: 'MG' }]);
  mocks.open.mockResolvedValue({ files: [{ path: 'arquivo_MG.csv', type: 'File', buffer: async () => Buffer.from('csv') }] });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from('zip') }));
});

describe('cache de processo do TSE', () => {
  it('separa dataset, pleito e UF na chave determinística', () => {
    expect(getTseCacheKey(2024, 'mg', 'detail')).toBe('tse:detail:2024:MG');
    expect(getTseCacheKey(2020, 'MG', 'detail')).not.toBe(getTseCacheKey(2024, 'MG', 'detail'));
    expect(getTseCacheKey(2024, 'SP', 'detail')).not.toBe(getTseCacheKey(2024, 'MG', 'detail'));
    expect(getTseCacheKey(2024, 'MG', 'candidate')).not.toBe(getTseCacheKey(2024, 'MG', 'detail'));
  });

  it('compartilha download e parsing e preserva hash/metadados', async () => {
    const [first, second] = await Promise.all([
      downloadTseCsv(2024, 'MG', 'detail'),
      downloadTseCsv(2024, 'MG', 'detail'),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(mocks.parse).toHaveBeenCalledTimes(1);
    expect(first.cache.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(second.cache.sha256).toBe(first.cache.sha256);
    expect(second.cache.cacheHit).toBe(true);
    expect(first.rowsByMunicipality.get('43710')).toHaveLength(1);
    expect(getTseCacheStats()).toMatchObject({ downloads: 1, hits: 1, misses: 1, parses: 1 });
  });

  it('remove promessa com falha para permitir reexecução segura', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('indisponível'));
    await expect(downloadTseCsv(2024, 'MG', 'detail')).rejects.toThrow('indisponível');
    await expect(downloadTseCsv(2024, 'MG', 'detail')).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
