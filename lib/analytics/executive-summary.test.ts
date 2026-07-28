import { describe, it, expect } from 'vitest';
import {
  splitByPeriod,
  computeSentimentShares,
  deriveRisksFromAlerts,
  selectPrimaryRisk,
  evaluateOpportunities,
  explainOpportunityAbsence,
  selectPrimaryOpportunity,
  selectKeyChanges,
  rankEntities,
  rankThemes,
  composeExecutiveSynthesis,
  type EntityRankItem,
} from './executive-summary';
import type { UnifiedAlert } from '@/lib/queries/alerts';
import { classifyPoliticalStatus } from './political-status';

function makeAlert(overrides: Partial<UnifiedAlert> = {}): UnifiedAlert {
  return {
    id: 'a1',
    ruleId: 'r',
    nome: 'Regra teste',
    origem: 'noticias',
    severidade: 'alto',
    entidade: 'Candidato A',
    titulo: 'Título do alerta',
    descricao: 'Descrição',
    metricaAtual: 'x = 90',
    referencia: '> 80',
    data: new Date().toISOString(),
    url: 'https://example.com',
    ...overrides,
  };
}

describe('splitByPeriod', () => {
  const now = Date.now();
  const hoursAgo = (h: number) => now - h * 60 * 60 * 1000;

  it('sem timestamps suficientes, retorna tudo em "current" e nada em "previous"', () => {
    const result = splitByPeriod([{ t: hoursAgo(1) }], (i) => i.t, 'all');
    expect(result.previous).toEqual([]);
    expect(result.current).toHaveLength(1);
  });

  it('período "all" divide ao meio pelo intervalo observado', () => {
    const items = [{ t: hoursAgo(10) }, { t: hoursAgo(5) }, { t: hoursAgo(1) }, { t: hoursAgo(0.5) }];
    const result = splitByPeriod(items, (i) => i.t, 'all');
    expect(result.current.length + result.previous.length).toBe(items.length);
    expect(result.previous.length).toBeGreaterThan(0);
  });

  it('período numérico (dias) compara últimos N dias com os N dias anteriores', () => {
    // period=7 → janela atual: últimas 168h; janela anterior: 168h-336h atrás.
    const items = [
      { t: hoursAgo(400) }, // fora de ambas as janelas (>336h atrás)
      { t: hoursAgo(200) }, // dentro dos 7 dias anteriores (168h-336h atrás)
      { t: hoursAgo(24) }, // dentro dos últimos 7 dias
    ];
    const result = splitByPeriod(items, (i) => i.t, '7');
    expect(result.current).toHaveLength(1);
    expect(result.previous).toHaveLength(1);
  });

  it('não fabrica período anterior quando os itens não cobrem uma janela anterior real', () => {
    const items = [{ t: hoursAgo(1) }, { t: hoursAgo(0.5) }];
    const result = splitByPeriod(items, (i) => i.t, '7');
    expect(result.previous).toEqual([]);
  });
});

describe('computeSentimentShares', () => {
  it('ignora itens sem análise de sentimento', () => {
    const stats = computeSentimentShares([{ ai_sentiment: null }], [{ sentiment: 'Sem análise' }], []);
    expect(stats.total).toBe(0);
  });

  it('calcula shares corretamente', () => {
    const stats = computeSentimentShares(
      [{ ai_sentiment: 0.5 }, { ai_sentiment: -0.5 }],
      [{ sentiment: 'negativo' }],
      [{ sentiment: 'positivo' }]
    );
    expect(stats.total).toBe(4);
    expect(stats.positivoCount).toBe(2);
    expect(stats.negativoCount).toBe(2);
    expect(stats.positivoShare).toBe(0.5);
    expect(stats.negativoShare).toBe(0.5);
  });
});

describe('deriveRisksFromAlerts / selectPrimaryRisk', () => {
  it('filtra apenas severidade alto/crítico, ignorando médio', () => {
    const alerts = [makeAlert({ id: '1', severidade: 'medio' }), makeAlert({ id: '2', severidade: 'alto' })];
    const risks = deriveRisksFromAlerts(alerts);
    expect(risks).toHaveLength(1);
    expect(risks[0].id).toBe('2');
  });

  it('limita ao número solicitado (top 3 por padrão)', () => {
    const alerts = Array.from({ length: 5 }, (_, i) => makeAlert({ id: `${i}`, severidade: 'alto' }));
    expect(deriveRisksFromAlerts(alerts)).toHaveLength(3);
  });

  it('gera evidência com URL quando o alerta tem URL', () => {
    const risks = deriveRisksFromAlerts([makeAlert({ url: 'https://evidencia.com' })]);
    expect(risks[0].evidencia).toEqual({ tipo: 'alerta', id: 'a1', url: 'https://evidencia.com', descricao: 'Título do alerta' });
  });

  it('não gera evidência quando o alerta não tem URL (alerta agregado)', () => {
    const risks = deriveRisksFromAlerts([makeAlert({ url: null })]);
    expect(risks[0].evidencia).toBeNull();
  });

  it('selectPrimaryRisk retorna null quando não há riscos', () => {
    expect(selectPrimaryRisk([])).toBeNull();
  });
});

describe('evaluateOpportunities', () => {
  const entities: EntityRankItem[] = [
    { nome: 'Candidato A', volume: 50, sentimentoPredominante: 'positivo', riscoPredominante: 'baixo', alertas: 0, temaPrincipal: 'Saúde' , targetId: null},
  ];

  it('não gera nenhuma oportunidade sem comparação anterior e sem entidade elegível', () => {
    const opportunities = evaluateOpportunities(
      { total: 10, positivoCount: 2, negativoCount: 2, positivoShare: 0.2, negativoShare: 0.2 },
      null,
      []
    );
    expect(opportunities).toEqual([]);
  });

  it('gera "queda de negatividade" quando negativoShare cai >= 10pp', () => {
    const current = { total: 10, positivoCount: 5, negativoCount: 1, positivoShare: 0.5, negativoShare: 0.1 };
    const previous = { total: 10, positivoCount: 3, negativoCount: 3, positivoShare: 0.3, negativoShare: 0.3 };
    const opportunities = evaluateOpportunities(current, previous, []);
    expect(opportunities.some((o) => o.id === 'queda_negatividade')).toBe(true);
  });

  it('NÃO gera oportunidade quando a queda é menor que o threshold (rejeição de falsa oportunidade)', () => {
    const current = { total: 10, positivoCount: 5, negativoCount: 2, positivoShare: 0.5, negativoShare: 0.2 };
    const previous = { total: 10, positivoCount: 5, negativoCount: 2.3, positivoShare: 0.5, negativoShare: 0.23 };
    const opportunities = evaluateOpportunities(current, previous, []);
    expect(opportunities.some((o) => o.id === 'queda_negatividade')).toBe(false);
  });

  it('gera "alta exposição com risco baixo" apenas para entidade top-3 com 0 alertas e risco baixo/nulo', () => {
    const opportunities = evaluateOpportunities({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, entities);
    expect(opportunities.some((o) => o.id.startsWith('alta_exposicao_baixo_risco'))).toBe(true);
  });

  it('rejeição de falsa oportunidade: entidade com alerta ativo NÃO gera "alta exposição baixo risco"', () => {
    const withAlert: EntityRankItem[] = [{ ...entities[0], alertas: 1 }];
    const opportunities = evaluateOpportunities({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, withAlert);
    expect(opportunities.some((o) => o.id.startsWith('alta_exposicao_baixo_risco'))).toBe(false);
  });

  it('rejeição de falsa oportunidade: risco baixo isolado sem estar no top-3 de volume não basta', () => {
    // Quarta posição em volume não entra no corte top-3 (limit aplicado antes do filtro)
    const manyEntities: EntityRankItem[] = [
      { nome: 'A', volume: 100, sentimentoPredominante: null, riscoPredominante: 'alto', alertas: 1, temaPrincipal: null , targetId: null},
      { nome: 'B', volume: 90, sentimentoPredominante: null, riscoPredominante: 'alto', alertas: 1, temaPrincipal: null , targetId: null},
      { nome: 'C', volume: 80, sentimentoPredominante: null, riscoPredominante: 'alto', alertas: 1, temaPrincipal: null , targetId: null},
      { nome: 'D', volume: 5, sentimentoPredominante: null, riscoPredominante: 'baixo', alertas: 0, temaPrincipal: null , targetId: null},
    ];
    const opportunities = evaluateOpportunities({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, manyEntities);
    expect(opportunities.some((o) => o.entidade === 'D')).toBe(false);
  });

  it('selectPrimaryOpportunity retorna null quando não há oportunidades', () => {
    expect(selectPrimaryOpportunity([])).toBeNull();
  });
});

describe('explainOpportunityAbsence', () => {
  it('explica falta de período anterior comparável', () => {
    const reasons = explainOpportunityAbsence({ total: 10, positivoCount: 5, negativoCount: 5, positivoShare: 0.5, negativoShare: 0.5 }, null, []);
    expect(reasons.some((r) => r.includes('período anterior comparável'))).toBe(true);
  });

  it('explica ausência de melhora de sentimento quando há período anterior mas sem variação relevante', () => {
    const current = { total: 10, positivoCount: 5, negativoCount: 5, positivoShare: 0.5, negativoShare: 0.5 };
    const previous = { total: 10, positivoCount: 5, negativoCount: 5, positivoShare: 0.5, negativoShare: 0.5 };
    const reasons = explainOpportunityAbsence(current, previous, []);
    expect(reasons.some((r) => r.includes('melhora relevante de sentimento'))).toBe(true);
    expect(reasons.some((r) => r.includes('crescimento relevante de sentimento positivo'))).toBe(true);
  });

  it('explica que nenhuma entidade top-3 está livre de risco/alertas', () => {
    const withRisk: EntityRankItem[] = [{ nome: 'A', volume: 10, sentimentoPredominante: null, riscoPredominante: 'alto', alertas: 1, temaPrincipal: null, targetId: null }];
    const reasons = explainOpportunityAbsence({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, withRisk);
    expect(reasons.some((r) => r.includes('livre de alertas ou risco'))).toBe(true);
  });

  it('nunca inventa um motivo fora das 3 regras conhecidas (no máx. 3 motivos)', () => {
    const reasons = explainOpportunityAbsence({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, []);
    expect(reasons.length).toBeLessThanOrEqual(2);
  });
});

describe('selectKeyChanges', () => {
  it('não fabrica nenhuma mudança quando não há período anterior real', () => {
    const changes = selectKeyChanges({ total: 10, positivoCount: 5, negativoCount: 5, positivoShare: 0.5, negativoShare: 0.5 }, null, null);
    expect(changes).toEqual([]);
  });

  it('gera mudança de sentimento negativo quando a diferença é real e relevante', () => {
    const current = { total: 10, positivoCount: 2, negativoCount: 6, positivoShare: 0.2, negativoShare: 0.6 };
    const previous = { total: 10, positivoCount: 5, negativoCount: 2, positivoShare: 0.5, negativoShare: 0.2 };
    const changes = selectKeyChanges(current, previous, null);
    const negChange = changes.find((c) => c.id === 'sentimento_negativo');
    expect(negChange).toBeDefined();
    expect(negChange?.interpretacao).toBe('desfavoravel');
    expect(negChange?.valorAtual).toBe(60);
    expect(negChange?.valorAnterior).toBe(20);
  });

  it('interpreta queda de negatividade como favorável', () => {
    const current = { total: 10, positivoCount: 5, negativoCount: 1, positivoShare: 0.5, negativoShare: 0.1 };
    const previous = { total: 10, positivoCount: 3, negativoCount: 5, positivoShare: 0.3, negativoShare: 0.5 };
    const changes = selectKeyChanges(current, previous, null);
    expect(changes.find((c) => c.id === 'sentimento_negativo')?.interpretacao).toBe('favoravel');
  });

  it('inclui mudança de volume apenas quando a tendência não é estável', () => {
    const stable = selectKeyChanges({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, { direcao: 'stable', variacaoPercentual: 0 });
    expect(stable.find((c) => c.id === 'volume')).toBeUndefined();

    const rising = selectKeyChanges({ total: 0, positivoCount: 0, negativoCount: 0, positivoShare: 0, negativoShare: 0 }, null, { direcao: 'up', variacaoPercentual: 30 });
    expect(rising.find((c) => c.id === 'volume')).toBeDefined();
  });
});

describe('rankEntities', () => {
  it('agrega volume por candidato entre notícias, Instagram e X', () => {
    const entities = rankEntities(
      [{ candidate_name: 'Candidato A', ai_sentiment: 0.5, local_relevance: 50, ai_topics: ['Saúde'] }],
      [{ candidate_name: 'Candidato A', sentiment: 'positivo', risk: 'baixo', topic: 'Saúde' }],
      [{ candidate_name: 'Candidato B', sentiment: 'negativo', risk: 'alto', topic: 'Segurança' }],
      []
    );
    expect(entities.find((e) => e.nome === 'Candidato A')?.volume).toBe(2);
    expect(entities.find((e) => e.nome === 'Candidato B')?.volume).toBe(1);
  });

  it('ordena por volume decrescente', () => {
    const entities = rankEntities(
      [
        { candidate_name: 'A', ai_sentiment: null, local_relevance: null, ai_topics: [] },
        { candidate_name: 'B', ai_sentiment: null, local_relevance: null, ai_topics: [] },
        { candidate_name: 'B', ai_sentiment: null, local_relevance: null, ai_topics: [] },
      ],
      [],
      [],
      []
    );
    expect(entities[0].nome).toBe('B');
  });

  it('ignora entradas sem candidato identificado ("—")', () => {
    const entities = rankEntities([{ candidate_name: '—', ai_sentiment: null, local_relevance: null, ai_topics: [] }], [], [], []);
    expect(entities).toEqual([]);
  });

  it('conta alertas associados à entidade', () => {
    const entities = rankEntities(
      [{ candidate_name: 'Candidato A', ai_sentiment: null, local_relevance: null, ai_topics: [] }],
      [],
      [],
      [makeAlert({ entidade: 'Candidato A' })]
    );
    expect(entities[0].alertas).toBe(1);
  });

  it('cenário sem dados: retorna lista vazia sem lançar erro', () => {
    expect(rankEntities([], [], [], [])).toEqual([]);
  });
});

describe('rankThemes', () => {
  it('ordena por frequência decrescente e respeita o limite', () => {
    const themes = rankThemes(
      [
        { tema: 'A', frequencia: 3, sentimento: 0 },
        { tema: 'B', frequencia: 10, sentimento: 0 },
        { tema: 'C', frequencia: 5, sentimento: 0 },
      ],
      2
    );
    expect(themes.map((t) => t.tema)).toEqual(['B', 'C']);
  });
});

describe('composeExecutiveSynthesis', () => {
  const semDadosStatus = classifyPoliticalStatus({
    crisisScore: 0,
    volumeTotal: 0,
    criticalAlertCount: 0,
    highAlertCount: 0,
    predominantSentiment: null,
    predominantRisk: null,
    volumeTrend: null,
  });

  it('cenário sem dados: todos os campos ficam semDados=true, sem valor fabricado', () => {
    const synthesis = composeExecutiveSynthesis({
      politicalStatus: semDadosStatus,
      risks: [],
      opportunities: [],
      themes: [],
      entities: [],
      keyChanges: [],
    });
    expect(synthesis.estadoGeral.semDados).toBe(true);
    expect(synthesis.estadoGeral.valor).toBeNull();
    expect(synthesis.principalRisco.semDados).toBe(true);
    expect(synthesis.principalOportunidade.semDados).toBe(true);
    expect(synthesis.temaEmDestaque.semDados).toBe(true);
    expect(synthesis.maiorExposicao.semDados).toBe(true);
    expect(synthesis.mudancaRelevante.semDados).toBe(true);
  });

  it('cenário parcial: apenas risco disponível, demais campos permanecem sem dados', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 60,
      volumeTotal: 5,
      criticalAlertCount: 0,
      highAlertCount: 1,
      predominantSentiment: 'negativo',
      predominantRisk: 'alto',
      volumeTrend: null,
    });
    const risks = deriveRisksFromAlerts([makeAlert({ severidade: 'alto' })]);
    const synthesis = composeExecutiveSynthesis({ politicalStatus: status, risks, opportunities: [], themes: [], entities: [], keyChanges: [] });
    expect(synthesis.estadoGeral.semDados).toBe(false);
    expect(synthesis.principalRisco.semDados).toBe(false);
    expect(synthesis.principalOportunidade.semDados).toBe(true);
    expect(synthesis.mudancaRelevante.semDados).toBe(true);
  });

  it('cenário de falha de canal: entities/themes vazios (ex.: Instagram indisponível) não quebram a síntese', () => {
    const synthesis = composeExecutiveSynthesis({
      politicalStatus: semDadosStatus,
      risks: [],
      opportunities: [],
      themes: [],
      entities: [], // simula canal Instagram/X ausente
      keyChanges: [],
    });
    expect(synthesis.maiorExposicao.valor).toBeNull();
    expect(() => synthesis).not.toThrow();
  });

  it('é determinística: mesma entrada produz a mesma saída', () => {
    const input = {
      politicalStatus: semDadosStatus,
      risks: deriveRisksFromAlerts([makeAlert()]),
      opportunities: [],
      themes: [{ tema: 'Saúde', frequencia: 5, sentimento: 0.1 }],
      entities: [{ nome: 'Candidato A', volume: 10, sentimentoPredominante: 'positivo', riscoPredominante: 'baixo', alertas: 0, temaPrincipal: 'Saúde' , targetId: null}],
      keyChanges: [],
    };
    expect(composeExecutiveSynthesis(input)).toEqual(composeExecutiveSynthesis(input));
  });
});
