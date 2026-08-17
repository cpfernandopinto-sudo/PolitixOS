import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CagedSourceKind, CagedSourceVintage } from './types';

export const CAGED_STORAGE_BUCKET = 'politixos-caged-raw';
export interface CagedArtifactStorageAdapter {
  readonly provider: 'local' | 'supabase';
  readCurrentVintage(kind: CagedSourceKind, declarationMonth: string): Promise<CagedSourceVintage | null>;
  commitDownloaded(kind: CagedSourceKind, declarationMonth: string, sourceUrl: string, tempPath: string): Promise<CagedSourceVintage>;
  writeManifest(vintage: CagedSourceVintage): Promise<void>;
  materialize(vintage: CagedSourceVintage): Promise<{ path: string; cleanup: () => Promise<void> }>;
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => createReadStream(filePath).on('data', (chunk) => hash.update(chunk)).on('error', reject).on('end', resolve));
  return hash.digest('hex');
}

export class CagedArtifactStorage implements CagedArtifactStorageAdapter {
  readonly provider = 'local' as const;
  constructor(public readonly root: string) {}

  rawDirectory(declarationMonth: string): string { return path.join(this.root, 'caged', 'raw', declarationMonth.slice(0, 4), declarationMonth); }
  manifestPath(kind: CagedSourceKind, declarationMonth: string): string { return path.join(this.rawDirectory(declarationMonth), `${kind}.manifest.json`); }

  async readCurrentVintage(kind: CagedSourceKind, declarationMonth: string): Promise<CagedSourceVintage | null> {
    try {
      const vintage = JSON.parse(await fs.readFile(this.manifestPath(kind, declarationMonth), 'utf8')) as CagedSourceVintage;
      const stat = await fs.stat(vintage.storagePath);
      if (stat.size !== vintage.sizeBytes || await sha256File(vintage.storagePath) !== vintage.sha256) return null;
      return vintage;
    } catch { return null; }
  }

  async commitDownloaded(kind: CagedSourceKind, declarationMonth: string, sourceUrl: string, tempPath: string): Promise<CagedSourceVintage> {
    const sizeBytes = (await fs.stat(tempPath)).size;
    if (sizeBytes <= 0) throw new Error('CAGED_DOWNLOAD_FAILED: arquivo vazio.');
    const sha256 = await sha256File(tempPath);
    const directory = this.rawDirectory(declarationMonth);
    await fs.mkdir(directory, { recursive: true });
    const storagePath = path.join(directory, `CAGED${kind}${declarationMonth}.${sha256}.7z`);
    try { await fs.access(storagePath); await fs.unlink(tempPath); } catch { await fs.rename(tempPath, storagePath); }
    const vintage: CagedSourceVintage = { kind, declarationMonth, sourceUrl, sha256, sizeBytes, collectedAt: new Date().toISOString(), status: 'available', storagePath, storageProvider: 'local', storageBucket: null, storageObjectKey: path.relative(this.root, storagePath), layoutVersion: null, processedAt: null };
    await this.writeManifest(vintage);
    return vintage;
  }

  async writeManifest(vintage: CagedSourceVintage): Promise<void> {
    const manifest = this.manifestPath(vintage.kind, vintage.declarationMonth);
    await fs.mkdir(path.dirname(manifest), { recursive: true });
    const partial = `${manifest}.partial`;
    await fs.writeFile(partial, `${JSON.stringify(vintage, null, 2)}\n`);
    await fs.rename(partial, manifest);
  }
  async materialize(vintage: CagedSourceVintage) { return { path: vintage.storagePath, cleanup: async () => undefined }; }
}

type StorageClient = { storage: { from(bucket: string): { download(key: string): Promise<{ data: Blob | null; error: { message: string } | null }>; upload(key: string, body: ArrayBuffer, options: { contentType: string; upsert: boolean }): Promise<{ error: { message: string; statusCode?: string } | null }>; }; }; };

export class SupabaseCagedArtifactStorage implements CagedArtifactStorageAdapter {
  readonly provider = 'supabase' as const;
  constructor(private readonly client: StorageClient, private readonly cacheRoot: string, private readonly bucket = CAGED_STORAGE_BUCKET) {}
  private objectKey(kind: CagedSourceKind, month: string, sha: string) { return `${month.slice(0, 4)}/${month}/${kind}/${sha}.7z`; }
  private manifestKey(kind: CagedSourceKind, month: string) { return `${month.slice(0, 4)}/${month}/${kind}/current.manifest.json`; }
  private async downloadJson(key: string): Promise<CagedSourceVintage | null> { const result = await this.client.storage.from(this.bucket).download(key); return result.error || !result.data ? null : JSON.parse(await result.data.text()) as CagedSourceVintage; }
  async readCurrentVintage(kind: CagedSourceKind, declarationMonth: string) {
    const vintage = await this.downloadJson(this.manifestKey(kind, declarationMonth)); if (!vintage) return null;
    const local = await this.materialize(vintage); try { return (await sha256File(local.path)) === vintage.sha256 && (await fs.stat(local.path)).size === vintage.sizeBytes ? vintage : null; } finally { await local.cleanup(); }
  }
  async commitDownloaded(kind: CagedSourceKind, declarationMonth: string, sourceUrl: string, tempPath: string) {
    const sizeBytes = (await fs.stat(tempPath)).size; if (sizeBytes <= 0) throw new Error('CAGED_DOWNLOAD_FAILED: arquivo vazio.');
    const sha256 = await sha256File(tempPath), objectKey = this.objectKey(kind, declarationMonth, sha256), remote = this.client.storage.from(this.bucket);
    const existing = await remote.download(objectKey);
    if (existing.error) { const bytes = await fs.readFile(tempPath); const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; const upload = await remote.upload(objectKey, body, { contentType: 'application/x-7z-compressed', upsert: false }); if (upload.error && upload.error.statusCode !== '409') throw new Error(`CAGED_STORAGE_FAILED: ${upload.error.message}`); }
    await fs.unlink(tempPath).catch(() => undefined);
    const vintage: CagedSourceVintage = { kind, declarationMonth, sourceUrl, sha256, sizeBytes, collectedAt: new Date().toISOString(), status: 'available', storagePath: `supabase://${this.bucket}/${objectKey}`, storageProvider: 'supabase', storageBucket: this.bucket, storageObjectKey: objectKey, layoutVersion: null, processedAt: null };
    await this.writeManifest(vintage); return vintage;
  }
  async writeManifest(vintage: CagedSourceVintage) { const bytes = new TextEncoder().encode(`${JSON.stringify(vintage, null, 2)}\n`); const result = await this.client.storage.from(this.bucket).upload(this.manifestKey(vintage.kind, vintage.declarationMonth), bytes.buffer, { contentType: 'application/json', upsert: true }); if (result.error) throw new Error(`CAGED_STORAGE_FAILED: ${result.error.message}`); }
  async materialize(vintage: CagedSourceVintage) { await fs.mkdir(this.cacheRoot, { recursive: true }); const directory = await fs.mkdtemp(path.join(this.cacheRoot, 'caged-materialize-')), target = path.join(directory, `${vintage.sha256}.7z`); const key = vintage.storageObjectKey ?? vintage.storagePath.replace(`supabase://${this.bucket}/`, ''); const result = await this.client.storage.from(this.bucket).download(key); if (result.error || !result.data) { await fs.rm(directory, { recursive: true, force: true }); throw new Error(`CAGED_STORAGE_FAILED: ${result.error?.message ?? 'objeto ausente'}`); } await fs.writeFile(target, new Uint8Array(await result.data.arrayBuffer())); return { path: target, cleanup: () => fs.rm(directory, { recursive: true, force: true }) }; }
}
