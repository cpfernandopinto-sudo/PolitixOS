import { describe, expect, it } from 'vitest';
import { assertValidGuardableStatements, confidenceFromEvidenceCount, validateGuardableStatements } from './guardrails';
import { consolidateConfidence } from './contracts';

const context = {
  supportedNumbers: [0.53, 2139220074.39, 4017044518.27, 2025],
  knownEntities: ['Município Demonstrativo'],
  knownEvidenceHashes: ['fixture-hash-transferencias-2025', 'fixture-hash-receita-corrente-2025'],
};

describe('INTEL-01 guardrails cross-domain (generaliza o validador eleitoral já provado)', () => {
  it('aceita uma afirmação bem suportada (números, entidade e evidência reais)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'ok-1',
      statement: 'Em 2025, o Município Demonstrativo registrou razão de 0,53 entre transferências e receita corrente.',
      basedOnSignals: ['signal:1'],
      evidenceRefs: ['fixture-hash-transferencias-2025', 'fixture-hash-receita-corrente-2025'],
    }]);
    expect(result.valid).toBe(true);
  });

  it('rejeita afirmação sem evidência (TRACEABILITY)', () => {
    const result = validateGuardableStatements(context, [{ id: 'no-evidence', statement: 'O município melhorou.', basedOnSignals: ['signal:1'], evidenceRefs: [] }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].guard).toBe('TRACEABILITY');
  });

  it('rejeita número não suportado pelo contexto (NUMBER)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'fabricated-number', statement: 'A razão foi de 0,99 no período.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.guard === 'NUMBER')).toBe(true);
  });

  it('rejeita entidade desconhecida (ENTITY)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'fabricated-entity', statement: 'João Silva venceu a disputa.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.guard === 'ENTITY')).toBe(true);
  });

  // INTEL-03C, seção 17-19 do gate — achado real do POC do INTEL-03B: "No VAB de
  // serviços..." era capturado como falsa entidade "No VAB" só por "No" (contração de
  // "em o") abrir a frase com maiúscula. Corrigido em `extractedProperNouns`.
  it('não dispara ENTITY para contração/artigo capitalizado no início de frase seguido de sigla ("No VAB...")', () => {
    const result = validateGuardableStatements(context, [{
      id: 'no-vab', statement: 'No VAB de serviços, houve queda consolidada no período.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'ENTITY')).toBe(false);
  });

  it('não dispara ENTITY para outras contrações comuns no início de frase (Do, Na, Pelo)', () => {
    for (const statement of ['Do PIB municipal, apenas uma parte é industrial.', 'Na OFFICIAL_SHARE, dois sinais divergem.', 'Pelo IBGE, o dado mais recente é de 2021.']) {
      const result = validateGuardableStatements(context, [{ id: 'leading-contraction', statement, basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'] }]);
      expect(result.errors.some((error) => error.guard === 'ENTITY')).toBe(false);
    }
  });

  // INTEL-03C.2 — mecanismo genérico de fragmento: um candidato que é substring de um
  // knownEntity mais longo é aceito; o inverso (knownEntity substring do candidato) não.
  it('ENTITY: candidato que é fragmento de um knownEntity mais longo é aceito', () => {
    const longEntityContext = { ...context, knownEntities: ['Administração, Defesa, Educação, Saúde Públicas e Seguridade Social'] };
    const result = validateGuardableStatements(longEntityContext, [{
      id: 'fragment-ok', statement: 'A Seguridade Social apresentou variação no período.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'ENTITY')).toBe(false);
  });

  it('ENTITY: candidato maior que "engloba" um knownEntity curto (padding) continua rejeitado', () => {
    const shortEntityContext = { ...context, knownEntities: ['Produto Interno Bruto'] };
    const result = validateGuardableStatements(shortEntityContext, [{
      id: 'padding-rejected', statement: 'Segundo o Instituto Produto Interno Bruto Nacional, os dados confirmam isso.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'ENTITY')).toBe(true);
  });

  it('entidade real precedida de artigo continua rejeitada ("O Instituto Fiscal Independente")', () => {
    const result = validateGuardableStatements(context, [{
      id: 'real-entity-with-article', statement: 'O Instituto Fiscal Independente confirma os dados.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'ENTITY')).toBe(true);
  });

  it('rejeita linguagem causal sem ressalva (CAUSALITY)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'causal', statement: 'A receita caiu porque a gestão falhou.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'CAUSALITY')).toBe(true);
  });

  it('aceita causalidade quando explicitamente ressalvada', () => {
    const result = validateGuardableStatements(context, [{
      id: 'causal-ressalvada', statement: 'Os dados não permitem determinar a causa da queda.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'CAUSALITY')).toBe(false);
  });

  it('rejeita previsão eleitoral/econômica (PREDICTION)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'prediction', statement: 'O candidato vai vencer facilmente.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'PREDICTION')).toBe(true);
  });

  it('rejeita recomendação vazando para a camada de interpretação (RECOMMENDATION_LEAK)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'reco-leak', statement: 'A campanha deve focar no tema da segurança.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'RECOMMENDATION_LEAK')).toBe(true);
  });

  it('rejeita rotulação ideológica (IDEOLOGY)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'ideology', statement: 'O prefeito é de direita.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'IDEOLOGY')).toBe(true);
  });

  it('rejeita inferência sensível sobre eleitor/indivíduo (SENSITIVE_INFERENCE)', () => {
    const result = validateGuardableStatements(context, [{
      id: 'sensitive', statement: 'O eleitor pensa que a gestão é ruim.', basedOnSignals: ['signal:1'], evidenceRefs: ['fixture-hash-transferencias-2025'],
    }]);
    expect(result.errors.some((error) => error.guard === 'SENSITIVE_INFERENCE')).toBe(true);
  });

  it('assertValidGuardableStatements lança ao encontrar violação', () => {
    expect(() => assertValidGuardableStatements(context, [{ id: 'x', statement: 'texto sem suporte', basedOnSignals: [], evidenceRefs: [] }])).toThrow('INTELLIGENCE_STATEMENT_REJECTED');
  });
});

describe('confidence — consolidação e derivação (seção 11)', () => {
  it('consolidateConfidence retorna a classe mais fraca do conjunto', () => {
    expect(consolidateConfidence(['DIRECTLY_SUPPORTED', 'LIMITED_CONTEXT', 'MULTI_SIGNAL_SUPPORTED'])).toBe('LIMITED_CONTEXT');
    expect(consolidateConfidence(['DIRECTLY_SUPPORTED'])).toBe('DIRECTLY_SUPPORTED');
    expect(consolidateConfidence([])).toBe('DIRECTLY_SUPPORTED');
  });

  it('confidenceFromEvidenceCount nunca fabrica confiança sem evidência', () => {
    expect(() => confidenceFromEvidenceCount(0, 0)).toThrow('INSUFFICIENT_EVIDENCE');
    expect(confidenceFromEvidenceCount(1, 1)).toBe('DIRECTLY_SUPPORTED');
    expect(confidenceFromEvidenceCount(2, 2)).toBe('MULTI_SIGNAL_SUPPORTED');
  });

  it('nunca produz um score percentual fabricado (contrato é sempre classe qualitativa)', () => {
    const classes = ['DIRECTLY_SUPPORTED', 'MULTI_SIGNAL_SUPPORTED', 'LIMITED_CONTEXT'];
    for (const value of [confidenceFromEvidenceCount(1, 1), confidenceFromEvidenceCount(3, 3)]) {
      expect(classes).toContain(value);
      expect(typeof value).toBe('string');
    }
  });
});
