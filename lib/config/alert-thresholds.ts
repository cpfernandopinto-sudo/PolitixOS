/**
 * Central de thresholds e regras de alerta do PolitixOS.
 *
 * Todo número usado para decidir se algo vira um alerta deve estar aqui,
 * documentado, em vez de espalhado como "número mágico" dentro de componentes.
 *
 * As regras abaixo consolidam e documentam thresholds que já existiam de
 * forma implícita e duplicada no código (ex.: `getCrisisAlerts` em
 * lib/queries/noticias.ts, `getInstagramAlerts` em lib/queries/instagram.ts,
 * o filtro de "alto risco" em lib/queries/overview.ts). `lib/queries/alerts.ts`
 * é quem aplica estas regras para gerar a Central de Alertas
 * (`/dashboard/alertas`); os módulos de origem (Notícias/Instagram/X)
 * continuam com suas próprias visualizações locais inalteradas.
 *
 * Ver docs/REGRAS_ALERTAS_POLITIXOS.md para a explicação em linguagem de
 * produto de cada regra, exemplos e situações de falso positivo.
 */

export type AlertSeverity = 'critico' | 'alto' | 'medio';

export interface AlertRuleDefinition {
  id: string;
  nome: string;
  descricao: string;
  metrica: string;
  threshold: string;
  janela: string;
  severidade: AlertSeverity;
  justificativa: string;
  fonte: 'noticias' | 'instagram' | 'x' | 'facebook';
}

export const ALERT_RULES: Record<string, AlertRuleDefinition> = {
  noticia_risco_alto: {
    id: 'noticia_risco_alto',
    nome: 'Notícia de alto risco',
    descricao: 'Notícia com relevância/risco local acima do limite crítico.',
    metrica: 'local_relevance (0–100)',
    threshold: '> 80',
    janela: 'Item individual (sem janela temporal)',
    severidade: 'alto',
    justificativa: 'local_relevance > 80 já é o corte usado em getOverviewKPIs/getPriorityAlerts para "alertas ativos".',
    fonte: 'noticias',
  },
  noticia_risco_critico: {
    id: 'noticia_risco_critico',
    nome: 'Notícia de risco crítico',
    descricao: 'Notícia com relevância/risco local no patamar mais alto observado no projeto.',
    metrica: 'local_relevance (0–100)',
    threshold: '> 85',
    janela: 'Item individual',
    severidade: 'critico',
    justificativa: 'Mesmo corte usado em getRiskOverview (lib/queries/overview.ts) para classificar "crítico".',
    fonte: 'noticias',
  },
  noticia_volume_anormal: {
    id: 'noticia_volume_anormal',
    nome: 'Pico anormal de menções (24h)',
    descricao: 'Volume de notícias nas últimas 24h é 1,5x maior que a média diária dos 7 dias anteriores.',
    metrica: 'contagem de notícias/24h vs. média/dia dos 7 dias anteriores',
    threshold: 'volume_24h > média_7d_anterior × 1,5',
    janela: '24h vs. 7d anteriores',
    severidade: 'alto',
    justificativa: 'Regra já existente em getCrisisAlerts (lib/queries/noticias.ts), apenas centralizada aqui.',
    fonte: 'noticias',
  },
  noticia_sentimento_negativo: {
    id: 'noticia_sentimento_negativo',
    nome: 'Concentração de notícias negativas (24h)',
    descricao: 'Mais de 40% das notícias analisadas nas últimas 24h têm sentimento negativo.',
    metrica: '% de notícias com ai_sentiment < 0 sobre notícias analisadas, 24h',
    threshold: '> 40%',
    janela: '24h',
    severidade: 'alto',
    justificativa: 'Regra já existente em getCrisisAlerts (lib/queries/noticias.ts), apenas centralizada aqui.',
    fonte: 'noticias',
  },
  noticia_temas_sensiveis: {
    id: 'noticia_temas_sensiveis',
    nome: 'Concentração de temas sensíveis (24h)',
    descricao: 'Mais de 3 notícias nas últimas 24h citam temas de crise (corrupção, processo judicial, crise política etc.).',
    metrica: 'contagem de notícias com flags de crise, 24h',
    threshold: '> 3',
    janela: '24h',
    severidade: 'critico',
    justificativa: 'Regra já existente em getCrisisAlerts (lib/queries/noticias.ts): isCrise()/CRISE_FLAGS.',
    fonte: 'noticias',
  },
  instagram_risco_alto: {
    id: 'instagram_risco_alto',
    nome: 'Post do Instagram de alto risco',
    descricao: 'Post com classificação de risco "alto" pela análise de IA.',
    metrica: 'ai_analysis.risk_level',
    threshold: '= "alto"',
    janela: 'Item individual',
    severidade: 'alto',
    justificativa: 'Mesmo corte usado em getInstagramAlerts (lib/queries/instagram.ts).',
    fonte: 'instagram',
  },
  instagram_sentimento_negativo: {
    id: 'instagram_sentimento_negativo',
    nome: 'Concentração de posts negativos (Instagram)',
    descricao: 'Mais de 40% dos posts no período têm sentimento negativo.',
    metrica: '% de posts com sentiment = "negativo" sobre total de posts',
    threshold: '> 40%',
    janela: 'Período selecionado no filtro',
    severidade: 'alto',
    justificativa: 'Mesmo corte usado em getInstagramAlerts (lib/queries/instagram.ts).',
    fonte: 'instagram',
  },
  x_risco_alto: {
    id: 'x_risco_alto',
    nome: 'Post do X de risco alto ou crítico',
    descricao: 'Post com classificação de risco "alto" ou "crítico" pela análise de IA.',
    metrica: 'ai_analysis.risk_level',
    threshold: '∈ {"alto", "critico"}',
    janela: 'Item individual',
    severidade: 'alto',
    justificativa: 'Mesmo corte usado em getXAlert (lib/queries/x.ts).',
    fonte: 'x',
  },
  x_crise_score_alto: {
    id: 'x_crise_score_alto',
    nome: 'Score de crise elevado (X)',
    descricao: 'Post com crisisScore (combinação de negatividade, polarização e risco, já calculada em fetchXData) acima de 75.',
    metrica: 'crisisScore (0–100), calculado em getStrategicInsights (lib/queries/x.ts)',
    threshold: '> 75',
    janela: 'Item individual',
    severidade: 'critico',
    justificativa: 'crisisScore já é calculado por post em fetchXData; > 75 é o mesmo corte usado no badge "Crise" da tela X.',
    fonte: 'x',
  },
  facebook_risco_alto: {
    id: 'facebook_risco_alto',
    nome: 'Post do Facebook de alto risco',
    descricao: 'Post com classificação de risco "alto" pela análise de IA.',
    metrica: 'ai_analysis.risk_level',
    threshold: '= "alto"',
    janela: 'Item individual',
    severidade: 'alto',
    justificativa: 'Mesmo corte usado em instagram_risco_alto — mesma escala de risk_level (baixo/medio/alto/critico) em todo o projeto.',
    fonte: 'facebook',
  },
  facebook_sentimento_negativo: {
    id: 'facebook_sentimento_negativo',
    nome: 'Concentração de posts negativos (Facebook)',
    descricao: 'Mais de 40% dos posts no período têm sentimento negativo.',
    metrica: '% de posts com sentiment = "negativo" sobre total de posts',
    threshold: '> 40%',
    janela: 'Período selecionado no filtro',
    severidade: 'alto',
    justificativa: 'Mesmo corte usado em instagram_sentimento_negativo.',
    fonte: 'facebook',
  },
};

/** Ordem de severidade para ordenação (maior índice = mais severo). */
export const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  medio: 1,
  alto: 2,
  critico: 3,
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  medio: 'Médio',
  alto: 'Alto',
  critico: 'Crítico',
};
