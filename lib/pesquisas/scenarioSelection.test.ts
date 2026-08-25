import { describe, it, expect } from 'vitest';
import { selectPrimaryCenario } from './scenarioSelection';

interface R {
  cenario: string;
  turno: number;
  tipoPergunta: string;
  office?: string | null;
  candidateName: string;
  verified?: boolean;
}

function r(cenario: string, candidateName: string, overrides: Partial<R> = {}): R {
  return { cenario, turno: 1, tipoPergunta: 'estimulada', office: 'Governador', candidateName, verified: true, ...overrides };
}

describe('selectPrimaryCenario — escolha determinística do cenário de referência', () => {
  it('sem resultados → null', () => {
    expect(selectPrimaryCenario([])).toBeNull();
  });

  it('CASO REAL MG034902026: escolhe "com Cleitinho" (8 candidatos) em vez de "sem Cleitinho" (7), mesmo em ordem de array invertida', () => {
    const comCleitinho = [
      r('Cenário 1 (com Cleitinho)', 'Cleitinho'),
      r('Cenário 1 (com Cleitinho)', 'Alexandre Kalil'),
      r('Cenário 1 (com Cleitinho)', 'Patrus Ananias'),
      r('Cenário 1 (com Cleitinho)', 'Mateus Simões'),
      r('Cenário 1 (com Cleitinho)', 'Gabriel Azevedo'),
      r('Cenário 1 (com Cleitinho)', 'Ben Mendes'),
      r('Cenário 1 (com Cleitinho)', 'Flávio Roscoe'),
      r('Cenário 1 (com Cleitinho)', 'Maria da Consolação'),
    ];
    const semCleitinho = [
      r('Cenário 4 (sem Cleitinho)', 'Alexandre Kalil'),
      r('Cenário 4 (sem Cleitinho)', 'Patrus Ananias'),
      r('Cenário 4 (sem Cleitinho)', 'Mateus Simões'),
      r('Cenário 4 (sem Cleitinho)', 'Gabriel Azevedo'),
      r('Cenário 4 (sem Cleitinho)', 'Flávio Roscoe'),
      r('Cenário 4 (sem Cleitinho)', 'Ben Mendes'),
      r('Cenário 4 (sem Cleitinho)', 'Maria da Consolação'),
    ];

    // Ordem A: "sem" antes de "com" — se a regra dependesse de array[0], escolheria "sem".
    expect(selectPrimaryCenario([...semCleitinho, ...comCleitinho])).toBe('Cenário 1 (com Cleitinho)');
    // Ordem B: invertida — resultado tem que ser o MESMO (prova que não depende de ordem).
    expect(selectPrimaryCenario([...comCleitinho, ...semCleitinho])).toBe('Cenário 1 (com Cleitinho)');
  });

  it('candidato de referência informado: nunca escolhe um cenário que o exclui', () => {
    const comCleitinho = [r('Cenário 1 (com Cleitinho)', 'Cleitinho'), r('Cenário 1 (com Cleitinho)', 'Kalil')];
    const semCleitinho = [
      r('Cenário 4 (sem Cleitinho)', 'Kalil'),
      r('Cenário 4 (sem Cleitinho)', 'Ananias'),
      r('Cenário 4 (sem Cleitinho)', 'Simões'),
    ];
    // "sem Cleitinho" tem MAIS candidatos, mas Cleitinho está sendo analisado — nunca pode ganhar.
    expect(selectPrimaryCenario([...semCleitinho, ...comCleitinho], 'Cleitinho')).toBe('Cenário 1 (com Cleitinho)');
  });

  it('empate de contagem de candidatos: prioriza cenário totalmente verificado', () => {
    const a = [r('Cenário A', 'X', { verified: false }), r('Cenário A', 'Y', { verified: false })];
    const b = [r('Cenário B', 'X'), r('Cenário B', 'Y')];
    expect(selectPrimaryCenario([...a, ...b])).toBe('Cenário B');
  });

  it('empate total: desempata por ordem alfabética do texto do cenário (determinístico)', () => {
    const a = [r('Cenário Zebra', 'X'), r('Cenário Zebra', 'Y')];
    const b = [r('Cenário Alfa', 'X'), r('Cenário Alfa', 'Y')];
    expect(selectPrimaryCenario([...a, ...b])).toBe('Cenário Alfa');
  });

  it('agrupa por cenario+turno+tipoPergunta+office — nunca mistura confronto de 2º turno com 1º turno mesmo com nome de cenário parecido', () => {
    const turno1 = [r('Cenário 1', 'A'), r('Cenário 1', 'B'), r('Cenário 1', 'C')];
    const turno2 = [r('Cenário 1', 'A', { turno: 2 }), r('Cenário 1', 'B', { turno: 2 })];
    // turno1 tem mais candidatos reais (3 vs 2) e vence mesmo compartilhando o texto "Cenário 1".
    expect(selectPrimaryCenario([...turno2, ...turno1])).toBe('Cenário 1');
    const winnerGroup = [...turno2, ...turno1].filter((x) => x.cenario === 'Cenário 1' && x.turno === 1);
    expect(winnerGroup).toHaveLength(3);
  });

  it('não-candidatos (Indecisos/Branco-Nulo) não contam para o tamanho do cenário', () => {
    const maisIndecisos = [
      r('Cenário Inflado', 'A'),
      r('Cenário Inflado', 'Indecisos'),
      r('Cenário Inflado', 'Branco/Nulo'),
    ];
    const maisReal = [r('Cenário Real', 'A'), r('Cenário Real', 'B')];
    expect(selectPrimaryCenario([...maisIndecisos, ...maisReal])).toBe('Cenário Real');
  });
});
