import { describe, expect, it } from 'vitest';
import { CagedMunicipalityResolver } from './municipality-resolver';

describe('CagedMunicipalityResolver', () => {
  const resolver = CagedMunicipalityResolver.fromIbgeRows([{ id: 3118601 }, { id: 3106705 }, { id: 3106200 }], '2026-08-16T00:00:00Z');
  it.each([['311860', '3118601'], ['310670', '3106705'], ['310620', '3106200']])('resolve %s', (caged, ibge) => expect(resolver.resolve(caged)).toBe(ibge));
  it('não inventa município', () => expect(resolver.resolve('999999')).toBeNull());
  it('versiona o dicionário por hash', () => expect(resolver.metadata.sha256).toMatch(/^[a-f0-9]{64}$/));
});

