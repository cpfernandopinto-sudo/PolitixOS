import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CagedArtifactStorage, sha256File } from './artifact-storage';

describe('sha256File', () => {
  const directories: string[] = [];
  afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true }))); });
  it('é estável para o mesmo raw e muda com um byte', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'caged-hash-test-')); directories.push(directory);
    const first = path.join(directory, 'first.7z'), same = path.join(directory, 'same.7z'), changed = path.join(directory, 'changed.7z');
    await Promise.all([fs.writeFile(first, Buffer.from([1, 2, 3])), fs.writeFile(same, Buffer.from([1, 2, 3])), fs.writeFile(changed, Buffer.from([1, 2, 4]))]);
    expect(await sha256File(first)).toBe(await sha256File(same));
    expect(await sha256File(first)).not.toBe(await sha256File(changed));
  });
});

describe('CagedArtifactStorage local', () => {
  const directories: string[] = [];
  afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true }))); });
  async function setup() { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'caged-storage-test-')); directories.push(root); return { root, storage: new CagedArtifactStorage(root) }; }
  it('commit/read/cache preservam a mesma vintage imutável', async () => { const { root, storage } = await setup(); const first = path.join(root, 'first.tmp'); await fs.writeFile(first, 'artifact'); const vintage = await storage.commitDownloaded('MOV', '202606', 'official', first); const same = path.join(root, 'same.tmp'); await fs.writeFile(same, 'artifact'); const repeated = await storage.commitDownloaded('MOV', '202606', 'official', same); expect(repeated.sha256).toBe(vintage.sha256); expect(await storage.readCurrentVintage('MOV', '202606')).toMatchObject({ sha256: vintage.sha256, storageProvider: 'local' }); });
  it('corrupção do objeto invalida o manifesto', async () => { const { root, storage } = await setup(); const temp = path.join(root, 'raw.tmp'); await fs.writeFile(temp, 'artifact'); const vintage = await storage.commitDownloaded('MOV', '202606', 'official', temp); await fs.writeFile(vintage.storagePath, 'corrupt'); expect(await storage.readCurrentVintage('MOV', '202606')).toBeNull(); });
  it('manifesto divergente é rejeitado', async () => { const { root, storage } = await setup(); const temp = path.join(root, 'raw.tmp'); await fs.writeFile(temp, 'artifact'); const vintage = await storage.commitDownloaded('MOV', '202606', 'official', temp); await fs.writeFile(storage.manifestPath('MOV', '202606'), JSON.stringify({ ...vintage, sizeBytes: 999 })); expect(await storage.readCurrentVintage('MOV', '202606')).toBeNull(); });
});
