import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { executeCagedEco03B2Audit } from './audit-caged-eco03b2';

describe.skipIf(process.env.CAGED_RUN_REAL_AUDIT !== '1')('ECO-03B2 real integration audit', () => {
  it('reconcilia cinco setores oficiais e persiste somente os três pilotos', async () => {
    const result = await executeCagedEco03B2Audit();
    await fs.writeFile('/private/tmp/eco03b2-audit.json', `${JSON.stringify(result, null, 2)}\n`);
    expect(result.national.status).toBe('PASS');
    expect(result.pilots.every((pilot) => pilot.status === 'PASS')).toBe(true);
    expect(result.persistence.first.indicatorsProcessed).toBe(45);
    expect(result.persistence.second.inserted).toBe(0);
    expect(result.persistence.second.updated).toBe(0);
    expect(result.persistence.second.unchanged).toBe(45);
    expect(result.preservation.unchanged).toBe(true);
  }, 1_200_000);
});
