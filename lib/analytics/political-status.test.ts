import { describe, it, expect } from 'vitest';
import { classifyPoliticalStatus, type PoliticalStatusInput } from './political-status';

function baseInput(overrides: Partial<PoliticalStatusInput> = {}): PoliticalStatusInput {
  return {
    crisisScore: 10,
    volumeTotal: 50,
    criticalAlertCount: 0,
    highAlertCount: 0,
    predominantSentiment: 'neutro',
    predominantRisk: 'baixo',
    volumeTrend: null,
    ...overrides,
  };
}

describe('classifyPoliticalStatus', () => {
  it('classifica como Estável quando score <= 25', () => {
    const result = classifyPoliticalStatus(baseInput({ crisisScore: 20 }));
    expect(result.status).toBe('estavel');
    expect(result.label).toBe('Estável');
    expect(result.severidade).toBe('baixo');
  });

  it('classifica como Atenção quando score entre 25 e 50', () => {
    const result = classifyPoliticalStatus(baseInput({ crisisScore: 40 }));
    expect(result.status).toBe('atencao');
    expect(result.severidade).toBe('medio');
  });

  it('classifica como Tensão elevada quando score entre 50 e 75', () => {
    const result = classifyPoliticalStatus(baseInput({ crisisScore: 60 }));
    expect(result.status).toBe('tensao_elevada');
    expect(result.severidade).toBe('alto');
  });

  it('classifica como Crítico quando score > 75', () => {
    const result = classifyPoliticalStatus(baseInput({ crisisScore: 90 }));
    expect(result.status).toBe('critico');
    expect(result.severidade).toBe('critico');
  });

  it('retorna semDados=true quando não há volume (cenário sem dados)', () => {
    const result = classifyPoliticalStatus(baseInput({ volumeTotal: 0, crisisScore: 90 }));
    expect(result.semDados).toBe(true);
    expect(result.label).toBe('Sem dados suficientes');
    expect(result.fatores).toEqual([]);
  });

  it('não inclui variação quando volumeTrend é null (não fabrica dado)', () => {
    const result = classifyPoliticalStatus(baseInput({ volumeTrend: null }));
    expect(result.variacao).toBeNull();
  });

  it('inclui variação real quando volumeTrend é fornecido', () => {
    const result = classifyPoliticalStatus(baseInput({ volumeTrend: { direcao: 'up', variacaoPercentual: 15 } }));
    expect(result.variacao).toEqual({ direcao: 'up', variacaoPercentual: 15, metrica: 'volume de menções' });
  });

  it('lista os fatores a partir dos números reais informados', () => {
    const result = classifyPoliticalStatus(
      baseInput({ criticalAlertCount: 2, highAlertCount: 3, predominantSentiment: 'negativo', predominantRisk: 'alto' })
    );
    expect(result.fatores).toContain('2 alerta(s) crítico(s) ativo(s)');
    expect(result.fatores).toContain('3 alerta(s) de risco alto ativo(s)');
    expect(result.fatores).toContain('Sentimento predominante: negativo');
    expect(result.fatores).toContain('Risco predominante: alto');
  });

  it('é determinístico — mesma entrada produz a mesma saída', () => {
    const input = baseInput({ crisisScore: 55, criticalAlertCount: 1 });
    expect(classifyPoliticalStatus(input)).toEqual(classifyPoliticalStatus(input));
  });
});
