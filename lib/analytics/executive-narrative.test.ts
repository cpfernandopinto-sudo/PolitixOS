import { describe, it, expect } from 'vitest';
import { buildExecutiveNarrative } from './executive-narrative';
import { classifyPoliticalStatus } from './political-status';
import type { RiskCard, OpportunityCard, KeyChange, EntityRankItem, ThemeRankItem } from './executive-summary';

const statusComDados = classifyPoliticalStatus({
  crisisScore: 60,
  volumeTotal: 40,
  criticalAlertCount: 3,
  highAlertCount: 2,
  predominantSentiment: 'negativo',
  predominantRisk: 'alto',
  volumeTrend: { direcao: 'up', variacaoPercentual: 15 },
});

const statusSemDados = classifyPoliticalStatus({
  crisisScore: 0,
  volumeTotal: 0,
  criticalAlertCount: 0,
  highAlertCount: 0,
  predominantSentiment: null,
  predominantRisk: null,
  volumeTrend: null,
});

const risk: RiskCard = {
  id: 'r1',
  tipo: 'Notícia de risco crítico',
  entidade: 'Flávio Bolsonaro',
  descricao: 'Notícia de risco crítico envolvendo Flávio Bolsonaro',
  metricaAtual: 'local_relevance = 90',
  referencia: '> 85',
  periodo: 'Período selecionado',
  severidade: 'critico',
  evidencia: { tipo: 'alerta', id: 'r1', url: 'https://example.com', descricao: 'Título original da notícia' },
};

const opportunity: OpportunityCard = {
  id: 'o1',
  tipo: 'Alta exposição com risco baixo',
  entidade: 'Candidato B',
  descricao: 'Alta exposição com risco baixo',
  metricaAtual: '50 menções, 0 alertas',
  referencia: 'Top 3 em volume, sem alertas críticos/altos',
  periodo: 'Período selecionado',
  prioridade: 'media',
  evidencia: null,
};

const change: KeyChange = {
  id: 'volume',
  label: 'Volume de menções',
  metrica: 'variação percentual de volume',
  valorAtual: 800,
  valorAnterior: 0,
  diferencaAbsoluta: 800,
  diferencaPercentual: 8,
  periodo: 'Período atual vs. período anterior',
  interpretacao: 'neutro',
};

const entity: EntityRankItem = {
  nome: 'Flávio Bolsonaro',
  volume: 446,
  sentimentoPredominante: 'negativo',
  riscoPredominante: 'alto',
  alertas: 3,
  temaPrincipal: 'política',
  targetId: 'target-1',
};

const theme: ThemeRankItem = { tema: 'política', frequencia: 16, sentimento: -0.2 };

describe('buildExecutiveNarrative', () => {
  it('quando não há dados, retorna narrativa honesta sem ações fabricadas', () => {
    const narrative = buildExecutiveNarrative({
      politicalStatus: statusSemDados,
      primaryRisk: null,
      primaryOpportunity: null,
      keyChanges: [],
      topEntity: null,
      topTheme: null,
    });
    expect(narrative.semDados).toBe(true);
    expect(narrative.acoes).toEqual([]);
    expect(narrative.fraseAtencao).toBeNull();
  });

  it('nunca usa o título de uma notícia como frase de atenção — usa a descrição executiva do risco', () => {
    const narrative = buildExecutiveNarrative({
      politicalStatus: statusComDados,
      primaryRisk: risk,
      primaryOpportunity: null,
      keyChanges: [change],
      topEntity: entity,
      topTheme: theme,
    });
    expect(narrative.fraseAtencao).not.toContain('Título original da notícia');
    expect(narrative.fraseAtencao).toContain(risk.descricao);
  });

  it('inclui ação real "Ver riscos" quando há risco prioritário', () => {
    const narrative = buildExecutiveNarrative({
      politicalStatus: statusComDados,
      primaryRisk: risk,
      primaryOpportunity: null,
      keyChanges: [],
      topEntity: null,
      topTheme: null,
    });
    expect(narrative.acoes).toContainEqual({ label: 'Ver riscos', href: '#riscos-oportunidades' });
  });

  it('quando não há risco mas há oportunidade, aponta para oportunidades (nunca inventa risco)', () => {
    const narrative = buildExecutiveNarrative({
      politicalStatus: statusComDados,
      primaryRisk: null,
      primaryOpportunity: opportunity,
      keyChanges: [],
      topEntity: null,
      topTheme: null,
    });
    expect(narrative.fraseAtencao).toContain(opportunity.descricao);
    expect(narrative.acoes).toContainEqual({ label: 'Ver oportunidades', href: '#oportunidades' });
  });

  it('adiciona ação de filtro apenas quando a entidade tem targetId real (nunca um link fabricado)', () => {
    const narrativeComTarget = buildExecutiveNarrative({
      politicalStatus: statusComDados,
      primaryRisk: null,
      primaryOpportunity: null,
      keyChanges: [],
      topEntity: entity,
      topTheme: null,
    });
    expect(narrativeComTarget.acoes.some((a) => a.href === '?candidate=target-1')).toBe(true);

    const semTarget: EntityRankItem = { ...entity, targetId: null };
    const narrativeSemTarget = buildExecutiveNarrative({
      politicalStatus: statusComDados,
      primaryRisk: null,
      primaryOpportunity: null,
      keyChanges: [],
      topEntity: semTarget,
      topTheme: null,
    });
    expect(narrativeSemTarget.acoes.some((a) => a.href.startsWith('?candidate='))).toBe(false);
  });

  it('a mesma entrada sempre produz a mesma saída (determinístico)', () => {
    const input = {
      politicalStatus: statusComDados,
      primaryRisk: risk,
      primaryOpportunity: null,
      keyChanges: [change],
      topEntity: entity,
      topTheme: theme,
    };
    expect(buildExecutiveNarrative(input)).toEqual(buildExecutiveNarrative(input));
  });

  it('sem mudança nem tema, a frase de contexto é honesta sobre a ausência de comparação', () => {
    const narrative = buildExecutiveNarrative({
      politicalStatus: statusComDados,
      primaryRisk: null,
      primaryOpportunity: null,
      keyChanges: [],
      topEntity: null,
      topTheme: null,
    });
    expect(narrative.fraseContexto).toContain('Não há comparação temporal real');
  });
});
