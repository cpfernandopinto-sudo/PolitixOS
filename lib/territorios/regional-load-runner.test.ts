import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getCanonicalRegion } from './regional-registry';
import { createRegionalCheckpoint, runRegionalLoad, validateCanonicalRegionForLoad } from './regional-load-runner';

const temporaryDirectories: string[] = [];
function checkpointPath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'politixos-rmbh-'));
  temporaryDirectories.push(directory);
  return path.join(directory, 'checkpoint.json');
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('executor regional controlado', () => {
  const region = getCanonicalRegion('RMBH');
  const outcome = { status: 'completed' as const, years: [2016, 2020, 2024], indicatorsProcessed: 1, evidenceProcessed: 5, errors: [], durationMs: 10 };

  it('recusa região externa e inventário canônico adulterado', () => {
    expect(() => validateCanonicalRegionForLoad({ ...region, code: 'OUTRA' as 'RMBH' })).toThrow('não autorizada');
    expect(() => validateCanonicalRegionForLoad({ ...region, territories: region.territories.slice(1) })).toThrow('esperados 34');
  });

  it('cria checkpoint com exatamente 34 municípios pendentes', () => {
    const checkpoint = createRegionalCheckpoint(region, '2026-08-11T00:00:00.000Z');
    expect(checkpoint.municipalities).toHaveLength(34);
    expect(checkpoint.municipalities.every((item) => item.status === 'PENDING')).toBe(true);
    expect(checkpoint.municipalities.some((item) => item.ibgeCode === '3106200')).toBe(true);
  });

  it('interrompe e retoma sem reprocessar COMPLETED', async () => {
    const file = checkpointPath();
    const calls: string[] = [];
    const collect = async (ibgeCode: string) => { calls.push(ibgeCode); return outcome; };
    const interrupted = await runRegionalLoad(region, { checkpointPath: file, collect, stopAfter: 2 });
    expect(interrupted.status).toBe('INTERRUPTED');
    expect(interrupted.municipalities.filter((item) => item.status === 'COMPLETED')).toHaveLength(2);
    const firstTwo = [...calls];
    const resumed = await runRegionalLoad(region, { checkpointPath: file, collect });
    expect(resumed.status).toBe('COMPLETED');
    expect(calls.filter((code) => firstTwo.includes(code))).toHaveLength(2);
    expect(new Set(calls)).toEqual(new Set(region.territories.map((item) => item.ibgeCode)));
  });

  it('mantém falha isolada e soma dos estados igual a 34', async () => {
    const failedIbge = region.territories[3].ibgeCode;
    const checkpoint = await runRegionalLoad(region, {
      checkpointPath: checkpointPath(),
      collect: async (ibgeCode) => {
        if (ibgeCode === failedIbge) throw new Error('falha controlada');
        return outcome;
      },
    });
    expect(checkpoint.municipalities.filter((item) => item.status === 'FAILED')).toHaveLength(1);
    expect(checkpoint.municipalities.filter((item) => item.status === 'COMPLETED')).toHaveLength(33);
    expect(checkpoint.municipalities).toHaveLength(34);
  });
});

