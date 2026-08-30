import { describe, expect, it } from 'vitest';
import {
  chunkInstagramPostIds,
  emptyExternalContract,
  instagramAnalyticsRanges,
  intersectInstagramTargetScope,
  resolveExternalAuthor,
  resolveExternalDiscovery,
} from './instagram-ui';

describe('Instagram UI server scope', () => {
  it('não permite candidato fora de allowedTargetIds', () => {
    expect(intersectInstagramTargetScope(['target-b'], ['target-a'])).toEqual([]);
  });

  it('intersecta seleção com allowedTargetIds sem confiar no frontend', () => {
    expect(intersectInstagramTargetScope(['target-a', 'target-b'], ['target-a', 'target-c'])).toEqual(['target-a']);
  });

  it('admin preserva escopo global ou seleção explícita', () => {
    expect(intersectInstagramTargetScope(undefined, null)).toBeNull();
    expect(intersectInstagramTargetScope(['target-a'], null)).toEqual(['target-a']);
  });

  it('divide listas grandes em lotes seguros sem perder ou duplicar IDs', () => {
    const ids = Array.from({ length: 652 }, (_, index) => `post-${index}`);
    const chunks = chunkInstagramPostIds(ids, 150);
    expect(chunks.map((chunk) => chunk.length)).toEqual([150, 150, 150, 150, 52]);
    expect(chunks.flat()).toEqual(ids);
  });

  it.each([
    { total: 1999, expectedLoaded: 1999, expectedComplete: true },
    { total: 2000, expectedLoaded: 2000, expectedComplete: true },
    { total: 3800, expectedLoaded: 3800, expectedComplete: true },
    { total: 12000, expectedLoaded: 10000, expectedComplete: false },
  ])('pagina universo analítico de $total sem truncamento silencioso', ({ total, expectedLoaded, expectedComplete }) => {
    const ranges = instagramAnalyticsRanges(total);
    const loaded = ranges.reduce((sum, range) => sum + range.to - range.from + 1, 0);
    expect(loaded).toBe(expectedLoaded);
    expect(loaded === total).toBe(expectedComplete);
    expect(ranges.every((range) => range.to - range.from < 500)).toBe(true);
  });

  describe('External mentions helpers', () => {
    it('extrai autor corretamente do raw_json com user.username', () => {
      const author = resolveExternalAuthor({ user: { username: 'magrao_apresentador', full_name: 'Magrão' } });
      expect(author.username).toBe('magrao_apresentador');
      expect(author.fullName).toBe('Magrão');
    });

    it('extrai autor com fallback para desconhecido se ausente', () => {
      const author = resolveExternalAuthor({});
      expect(author.username).toBe('desconhecido');
      expect(author.fullName).toBeNull();
    });

    it('classifica descoberta mention como Marcou o candidato', () => {
      const discovery = resolveExternalDiscovery({
        discovery_source: 'mention',
        match_type: 'mention_of_target',
        match_term: 'delegadomoreira',
      });
      expect(discovery.source).toBe('mention');
      expect(discovery.label).toBe('Marcou o candidato');
      expect(discovery.explanation).toContain('@delegadomoreira');
    });

    it('classifica descoberta search como Descoberta externa', () => {
      const discovery = resolveExternalDiscovery({
        discovery_source: 'search',
        match_type: 'search',
        match_term: 'Edson Moreira',
      });
      expect(discovery.source).toBe('search');
      expect(discovery.label).toBe('Descoberta externa');
      expect(discovery.explanation).toContain('Edson Moreira');
    });

    it('emptyExternalContract inicializa estrutura vazia sem NaN', () => {
      const contract = emptyExternalContract();
      expect(contract.kpis.total).toBe(0);
      expect(contract.kpis.positivePct).toBe(0);
      expect(contract.kpis.negativePct).toBe(0);
      expect(contract.kpis.highOrCriticalRiskPct).toBe(0);
      expect(contract.posts).toHaveLength(0);
    });
  });
});

