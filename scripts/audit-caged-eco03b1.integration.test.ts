import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { executeCagedEco03B1Audit } from './audit-caged-eco03b1';

describe.skipIf(process.env.CAGED_RUN_REAL_AUDIT !== '1')('ECO-03B1 real integration audit', () => {
  it('processa fontes oficiais, reconcilia e persiste agregados controlados', async () => {
    const result = await executeCagedEco03B1Audit();
    await fs.writeFile('/private/tmp/eco03b1-audit.json', `${JSON.stringify(result, null, 2)}\n`);
    expect(result.recent.national).toEqual(result.recent.expectedNational);
    expect(result.recent.pilots.every((item) => item.status === 'PASS')).toBe(true);
    expect(result.historical.pilots.every((item) => item.status === 'PASS')).toBe(true);
    expect(result.idempotency.rawCacheHitsSecondRun).toBe(3);
    expect(result.idempotency.sameCurrent).toBe(true);
    expect(result.idempotency.secondRunAddedIndicatorRows).toBe(0);
  }, 1_200_000);
});

