import { describe, expect, it } from 'vitest';
import { classifyInstagramContentType, withCanonicalContentType } from './content-type';

describe('classifyInstagramContentType', () => {
  it('classifica imagem como IMAGE', () => {
    expect(classifyInstagramContentType({ mediaType: 'image' })).toBe('IMAGE');
  });

  it('classifica video + clips como REEL', () => {
    expect(classifyInstagramContentType({ mediaType: 'video', productType: 'clips' })).toBe('REEL');
  });

  it('classifica carrossel como CAROUSEL', () => {
    expect(classifyInstagramContentType({ mediaType: 'carousel' })).toBe('CAROUSEL');
  });

  it('classifica vídeo não-clips como VIDEO', () => {
    expect(classifyInstagramContentType({ mediaType: 'video', productType: 'feed' })).toBe('VIDEO');
  });

  it('classifica tipo inesperado como OUTRO', () => {
    expect(classifyInstagramContentType({ mediaType: 'broadcast' })).toBe('OUTRO');
  });

  it('usa raw_json parcial como fallback seguro', () => {
    expect(classifyInstagramContentType({ rawJson: { media_type: 2, product_type: 'clips' } })).toBe('REEL');
  });

  it('classifica payload incompleto e product_type null sem fabricar Reel', () => {
    expect(classifyInstagramContentType({ rawJson: {} })).toBe('OUTRO');
    expect(classifyInstagramContentType({ mediaType: 'video', productType: null })).toBe('VIDEO');
  });

  it('não classifica X ou outros canais', () => {
    expect(classifyInstagramContentType({ platform: 'x', mediaType: 'video', productType: 'clips' })).toBeNull();
  });
});

describe('withCanonicalContentType', () => {
  const parent = {
    id: 'post-parent',
    platform: 'instagram',
    platform_post_id: 'external-parent',
    target_id: 'target-1',
    client_id: 'client-1',
    media_type: 'carousel',
    raw_json: { product_type: 'carousel_container', carousel_media: [{ id: 'slide-1' }, { id: 'slide-2' }] },
  };

  it('é determinístico e idempotente', () => {
    const once = withCanonicalContentType(parent);
    const twice = withCanonicalContentType(once);
    expect(twice).toEqual(once);
  });

  it('mantém um carrossel como um único post pai e preserva IDs/client_id', () => {
    const classified = [parent].map(withCanonicalContentType);
    expect(classified).toHaveLength(1);
    expect(classified[0]).toMatchObject({
      id: 'post-parent',
      platform_post_id: 'external-parent',
      target_id: 'target-1',
      client_id: 'client-1',
      content_type: 'CAROUSEL',
    });
    expect(classified[0].raw_json.carousel_media).toHaveLength(2);
  });

  it('não cria outra identidade para Reel já coletado no feed', () => {
    const reel = withCanonicalContentType({
      ...parent,
      media_type: 'video',
      raw_json: { product_type: 'clips' },
    });
    expect(reel.id).toBe(parent.id);
    expect(reel.platform_post_id).toBe(parent.platform_post_id);
    expect(reel.content_type).toBe('REEL');
  });
});
