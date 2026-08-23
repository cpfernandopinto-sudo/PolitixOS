import { describe, expect, it } from 'vitest';
import { classifyFacebookContentType } from './content-type';

describe('classifyFacebookContentType', () => {
  it('classifica image (tipo real observado nos 8 posts reais da Michelle)', () => {
    expect(classifyFacebookContentType({ mediaType: 'image' })).toBe('IMAGE');
    expect(classifyFacebookContentType({ mediaType: 'photo' })).toBe('IMAGE');
  });

  it('classifica reel e video', () => {
    expect(classifyFacebookContentType({ mediaType: 'reel' })).toBe('REEL');
    expect(classifyFacebookContentType({ mediaType: 'video' })).toBe('VIDEO');
  });

  it('classifica album/carousel como CAROUSEL', () => {
    expect(classifyFacebookContentType({ mediaType: 'album' })).toBe('CAROUSEL');
    expect(classifyFacebookContentType({ mediaType: 'carousel' })).toBe('CAROUSEL');
  });

  it('usa raw_json como fallback quando mediaType estruturado está ausente', () => {
    expect(classifyFacebookContentType({ rawJson: { media_type: 'video' } })).toBe('VIDEO');
  });

  it('nunca inventa tipo: fallback é OUTRO para tipos não mapeados ou ausentes', () => {
    expect(classifyFacebookContentType({})).toBe('OUTRO');
    expect(classifyFacebookContentType({ mediaType: 'link' })).toBe('OUTRO');
  });
});
