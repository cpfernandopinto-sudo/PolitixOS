import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { executeCagedEco03B3AAudit } from './audit-caged-eco03b3a';

describe.skipIf(process.env.CAGED_RUN_REAL_AUDIT !== '1')('ECO-03B3A real historical integration audit', () => {
  it('reconstrói a janela real revision-aware para os três pilotos', async () => {
    const result = await executeCagedEco03B3AAudit({ persist: process.env.CAGED_HISTORY_PERSIST === '1' });
    await fs.writeFile('/private/tmp/eco03b3a-audit.json', `${JSON.stringify(result, null, 2)}\n`);
    expect(result.series).toHaveLength(3);
    expect(result.series.every((item) => item.coverage.coverageStatus === 'COMPLETE')).toBe(true);
    expect(result.revisedExamples.length).toBeGreaterThan(0);
    expect(result.regression202606).toBe(true);
  }, 2_400_000);
});
