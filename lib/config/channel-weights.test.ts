import { describe, expect, it } from 'vitest';
import {
  CHANNEL_WEIGHTS,
  CHANNEL_ORDER,
  CHANNEL_LABELS,
  channelWeightLabel,
  channelWeightsProse,
  assertChannelWeightsSumToOne,
  buildChannelWeightedEntries,
} from './channel-weights';

describe('CHANNEL_WEIGHTS — fonte única de verdade', () => {
  it('soma exatamente 1.00', () => {
    const total = Object.values(CHANNEL_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1, 9);
  });

  it('preserva a distribuição decidida: notícias 45%, x 27%, instagram 18%, facebook 10%', () => {
    expect(CHANNEL_WEIGHTS).toEqual({ noticias: 0.45, x: 0.27, instagram: 0.18, facebook: 0.10 });
  });

  it('CHANNEL_ORDER e CHANNEL_LABELS cobrem exatamente as mesmas 4 chaves de CHANNEL_WEIGHTS', () => {
    const weightKeys = Object.keys(CHANNEL_WEIGHTS).sort();
    expect([...CHANNEL_ORDER].sort()).toEqual(weightKeys);
    expect(Object.keys(CHANNEL_LABELS).sort()).toEqual(weightKeys);
  });

  it('assertChannelWeightsSumToOne não lança para os pesos reais', () => {
    expect(() => assertChannelWeightsSumToOne()).not.toThrow();
  });

  it('assertChannelWeightsSumToOne detecta regressão: canal adicionado sem rebalancear', () => {
    expect(() => assertChannelWeightsSumToOne({ ...CHANNEL_WEIGHTS, tiktok: 0.10 })).toThrow(/deve somar 1\.00/);
  });

  it('assertChannelWeightsSumToOne detecta regressão: canal removido sem rebalancear', () => {
    const rest = Object.fromEntries(Object.entries(CHANNEL_WEIGHTS).filter(([key]) => key !== 'facebook'));
    expect(() => assertChannelWeightsSumToOne(rest)).toThrow(/deve somar 1\.00/);
  });
});

describe('channelWeightLabel', () => {
  it('formata rótulo com percentual arredondado', () => {
    expect(channelWeightLabel('noticias')).toBe('Notícias (45%)');
    expect(channelWeightLabel('x')).toBe('X/Twitter (27%)');
    expect(channelWeightLabel('instagram')).toBe('Instagram (18%)');
    expect(channelWeightLabel('facebook')).toBe('Facebook (10%)');
  });
});

describe('channelWeightsProse', () => {
  it('monta a frase com todos os 4 canais na ordem histórica', () => {
    expect(channelWeightsProse()).toBe(
      'Notícias (peso 45%), X/Twitter (peso 27%), Instagram (peso 18%) e Facebook (peso 10%)'
    );
  });
});

describe('buildChannelWeightedEntries', () => {
  it('usa os pesos centralizados e 0 para canais não informados', () => {
    const entries = buildChannelWeightedEntries({
      noticias: { value: 80, count: 10 },
      x: { value: 60, count: 5 },
    });
    expect(entries).toEqual([
      { value: 80, weight: 0.45, count: 10 },
      { value: 60, weight: 0.27, count: 5 },
      { value: 0, weight: 0.18, count: 0 },
      { value: 0, weight: 0.10, count: 0 },
    ]);
  });
});
