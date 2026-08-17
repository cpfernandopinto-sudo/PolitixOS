/**
 * Fixtures isoladas estritamente de desenvolvimento visual (DEMO/DEV).
 * Utilizadas exclusivamente pela rota de sandbox (/dashboard/territorios/sandbox).
 * NÃO PERSISTIDAS E NÃO VINCULADAS A PRODUÇÃO.
 * NÃO UTILIZAR CIDADES REAIS EM FIXTURES POLÍTICAS.
 */

export const DEV_SANDBOX_METRICS = [
  {
    label: 'População Estimada',
    value: '621.865',
    unit: 'hab',
    period: '2024',
    source: 'IBGE (Estimativas)',
    methodology: 'Projeção populacional estatística baseada no Censo Demográfico.',
    variation: '+0,8%',
    trend: 'up' as const,
    context: 'Crescimento concentrado no vetor norte.',
    status: 'CONCLUIDO' as const,
  },
  {
    label: 'PIB per Capita',
    value: 'R$ 55.400',
    unit: 'R$/hab',
    period: '2023',
    source: 'IBGE / SICONFI',
    methodology: 'Valor Adicionado Bruto dividido pela população residente.',
    variation: '+3,2%',
    trend: 'up' as const,
    context: 'Impactado pelo polo industrial de transformação.',
    status: 'CONCLUIDO' as const,
  },
  {
    label: 'Taxa de Ocorrências Violentas',
    value: '199,4',
    unit: 'por 100k hab',
    period: '2024',
    source: 'SEJUSP MG',
    variation: '-4,5%',
    trend: 'down' as const,
    context: 'Queda gradual observada nos últimos 12 meses.',
    status: 'CONCLUIDO' as const,
  },
  {
    label: 'Cobertura Atenção Básica',
    value: '72,4%',
    unit: '%',
    period: '2024',
    source: 'DATASUS / CNES',
    variation: '0,0%',
    trend: 'stable' as const,
    context: 'Estabilidade em relação ao semestre anterior.',
    status: 'PARCIAL' as const,
  },
];

export const DEV_SANDBOX_TIME_SERIES = [
  { period: '2020', pib: 28.5, empregos: 180 },
  { period: '2021', pib: 30.2, empregos: 192 },
  { period: '2022', pib: 32.1, empregos: 204 },
  { period: '2023', pib: 34.5, empregos: 215 },
  { period: '2024', pib: 36.8, empregos: 228 },
];

export const DEV_SANDBOX_COMPOSITION = [
  { category: 'Serviços & Comércio', value: 18500, percentage: 52.5, color: '#3b82f6' },
  { category: 'Indústria de Transformação', value: 12400, percentage: 35.2, color: '#f59e0b' },
  { category: 'Administração Pública', value: 4300, percentage: 12.3, color: '#8b5cf6' },
];

export const DEV_SANDBOX_COMPARISON = [
  { label: 'PIB per Capita (R$)', municipioValue: '55.400', previousValue: '53.200', rmbhValue: '48.200', mgValue: '42.100', brazilValue: '44.100' },
  { label: 'Taxa Homicídios / 100k', municipioValue: '13,7', previousValue: '14,2', rmbhValue: '18,5', mgValue: '22,4', brazilValue: '20,1' },
  { label: 'Cobertura Saúde (%)', municipioValue: '72,4%', previousValue: '70,1%', rmbhValue: '68,2%', mgValue: '75,0%', brazilValue: '73,5%' },
];

export const DEV_SANDBOX_SIGNALS = [
  {
    category: 'oportunidade' as const,
    title: 'Expansão do Polo Logístico Regional',
    description: 'Atração de novos centros de distribuição alavancando a geração de empregos formais.',
    evidence: 'CAGED 2024 (+2.140 vagas no setor).',
    source: 'Motor Economia',
    confidence: 'ALTA' as const,
  },
  {
    category: 'atencao' as const,
    title: 'Pressão sobre Unidades de Urgência Central',
    description: 'Tempo de espera de atendimento 25% acima da média da região metropolitana.',
    evidence: 'Relatório CNES 2024.',
    source: 'Motor Saúde',
    confidence: 'MÉDIA' as const,
  },
];

// =========================================================
// 10 CENÁRIOS DEV VISUAIS DE INTELIGÊNCIA POLÍTICA (A a J)
// =========================================================

export const DEV_INTELLIGENCE_SCENARIOS = {
  // CENÁRIO A: Cobertura Completa (5 de 5 motores)
  scenarioA: {
    id: 'cenario-a',
    title: 'Cenário A — Cobertura Completa (5 Domínios)',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO ALFA',
    headline: 'Estabilidade Econômica impulsionada pela Indústria com Atenção na Rede Hospitalar',
    summaryParagraphs: [
      'O Município Demonstrativo Alfa apresenta forte dinamismo na matriz industrial com arrecadação acima da média regional.',
      'Entretanto, a taxa de ocupação dos leitos de pronto atendimento demanda atenção governamental prioritária.',
    ],
    coverageRatio: '5 de 5 domínios',
    confidenceLevel: 'ALTA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'DISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-a1',
        category: 'oportunidade' as const,
        priority: 'ALTO' as const,
        title: 'Crescimento da Arrecadação de ISSQN Industrial',
        description: 'Expansão de 8,4% na receita própria de serviços e comércio.',
        domains: ['Economia'],
        evidenceText: 'SICONFI Balanço 2024.',
      },
    ],
  },

  // CENÁRIO B: Cobertura Parcial (3 de 5 motores)
  scenarioB: {
    id: 'cenario-b',
    title: 'Cenário B — Cobertura Parcial (3 Domínios)',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO BETA',
    headline: 'Leitura Preliminar Territorial com Cobertura de Dados Parcial',
    summaryParagraphs: [
      'Os dados demográficos, eleitorais e econômicos já foram consolidados.',
      'As bases de Saúde e Segurança Pública aguardam a próxima rodada de carga oficial.',
    ],
    coverageRatio: '3 de 5 domínios',
    confidenceLevel: 'MÉDIA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'INDISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'INDISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-b1',
        category: 'tendencia' as const,
        priority: 'MÉDIO' as const,
        title: 'Renovação do Eleitorado Jovem',
        description: 'Aumento de 12% no alistamento eleitoral entre 16 e 18 anos.',
        domains: ['Eleitoral', 'Demografia'],
        evidenceText: 'TSE Estatísticas de Eleitorado 2024.',
      },
    ],
  },

  // CENÁRIO C: Evidência Insuficiente para Conclusão
  scenarioC: {
    id: 'cenario-c',
    title: 'Cenário C — Evidência Insuficiente para Conclusão',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO GAMA',
    headline: 'Análise Suspensa — Evidências Primárias Insuficientes',
    summaryParagraphs: [
      'A quantidade de métricas homologadas para este município ainda não atinge o limiar mínimo de consistência para geração da síntese executiva.',
    ],
    coverageRatio: '1 de 5 domínios',
    confidenceLevel: 'BAIXA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'INDISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'INDISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'INDISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'INDISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [],
  },

  // CENÁRIO D: Sinal Crítico Prioritário
  scenarioD: {
    id: 'cenario-d',
    title: 'Cenário D — Sinal Crítico Prioritário Alerta Máximo',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO DELTA',
    headline: 'Alerta Territorial: Gargalo Crítico Assistencial em Saúde Coletiva',
    summaryParagraphs: [
      'Identificada sobrecarga severa no sistema de urgência municipal combinada com queda na cobertura vacinal básica.',
    ],
    coverageRatio: '5 de 5 domínios',
    confidenceLevel: 'ALTA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'DISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-d1',
        category: 'risco' as const,
        priority: 'CRÍTICO' as const,
        title: 'Superlotação Extrema na Emergência Hospitalar',
        description: 'Tempo médio de espera 45% superior ao teto recomendado pelo protocolo assistencial.',
        domains: ['Saúde'],
        evidenceText: 'DATASUS Relatório Hospitalar 2024.',
      },
    ],
  },

  // CENÁRIO E: Múltiplos Sinais Cruzados
  scenarioE: {
    id: 'cenario-e',
    title: 'Cenário E — Múltiplos Sinais Cruzados (Economia x Segurança)',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO EPSILON',
    headline: 'Dinâmica Complexa: Crescimento Comercial vs Aumento de Furtos',
    summaryParagraphs: [
      'A expansão do centro comercial central impulsionou os empregos formais, porém registrou alta concomitante nos furtos comerciais noturnos.',
    ],
    coverageRatio: '5 de 5 domínios',
    confidenceLevel: 'ALTA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'DISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-e1',
        category: 'atencao' as const,
        priority: 'ALTO' as const,
        title: 'Elevação das Ocorrências de Furtos Comerciais',
        description: 'Aumento de 14% nos boletins de ocorrência no quadrilátero central.',
        domains: ['Segurança', 'Economia'],
        evidenceText: 'SEJUSP MG Relatório Trimestral.',
      },
      {
        id: 'sig-e2',
        category: 'oportunidade' as const,
        priority: 'MÉDIO' as const,
        title: 'Aumento das Vagas no Comércio Varejista',
        description: 'Saldo positivo de 450 novos postos com carteira assinada.',
        domains: ['Economia'],
        evidenceText: 'CAGED 2024.',
      },
    ],
  },

  // CENÁRIO F: Intersetorial (Cross-Domain)
  scenarioF: {
    id: 'cenario-f',
    title: 'Cenário F — Cruzamento Intersetorial Tríplice',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO ZETA',
    headline: 'Vetor de Expansão Urbana Exige Repactuação de Serviços',
    summaryParagraphs: [
      'Migração populacional para a zona oeste criou um polo populacional de alta densidade sem equipamentos públicos proporcionais.',
    ],
    coverageRatio: '5 de 5 domínios',
    confidenceLevel: 'ALTA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'DISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-f1',
        category: 'mudanca' as const,
        priority: 'ALTO' as const,
        title: 'Deslocamento Populacional para Vetor Oeste',
        description: 'Crescimento demográfico de 4,2% ao ano no novo distrito residencial.',
        domains: ['Demografia', 'Saúde', 'Eleitoral'],
        evidenceText: 'IBGE Projeções + TSE Seções Eleitorais 2024.',
      },
    ],
  },

  // CENÁRIO G: Fontes com Defasagem Temporal Diferente
  scenarioG: {
    id: 'cenario-g',
    title: 'Cenário G — Transparência de Defasagem Temporal Diferenciada',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO ETA',
    headline: 'Análise Multi-Período: Segurança 2026 vs PIB 2023',
    summaryParagraphs: [
      'A análise integra boletins de segurança de 2026 com o PIB municipal consolidado de 2023 (versão oficial mais recente do IBGE).',
    ],
    coverageRatio: '5 de 5 domínios',
    confidenceLevel: 'ALTA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'DISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-g1',
        category: 'tendencia' as const,
        priority: 'MÉDIO' as const,
        title: 'Manutenção do Perfil Exportador',
        description: 'Base econômica sólida confirmada pelo PIB de 2023 com dados operacionais recentes de 2026.',
        domains: ['Economia'],
        evidenceText: 'IBGE Contas Regionais 2023 / SICONFI 2025.',
      },
    ],
  },

  // CENÁRIO H: Recomendação Estratégica com Ressalva
  scenarioH: {
    id: 'cenario-h',
    title: 'Cenário H — Recomendação Estratégica com Ressalva Metodológica',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO THETA',
    headline: 'Proposta de Reestruturação Fiscal com Ressalva de Cadastro',
    summaryParagraphs: [
      'Recomenda-se a revisão do código tributário municipal para estimular a retenção de serviços.',
    ],
    coverageRatio: '4 de 5 domínios',
    confidenceLevel: 'MÉDIA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'INDISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [],
  },

  // CENÁRIO I: Análise em Processamento
  scenarioI: {
    id: 'cenario-i',
    title: 'Cenário I — Motor em Processamento de Carga',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO IOTA',
    headline: 'Síntese em Processamento pelo Orquestrador',
    summaryParagraphs: [
      'A inteligência territorial está consolidando as tabelas primárias recebidas dos motores.',
    ],
    coverageRatio: '0 de 5 domínios',
    confidenceLevel: 'BAIXA' as const,
    domains: [
      { domain: 'Demografia', status: 'PARCIAL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'PARCIAL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'PARCIAL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'PARCIAL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'PARCIAL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [],
  },

  // CENÁRIO J: Divergência entre Fontes / Leitura com Cautela
  scenarioJ: {
    id: 'cenario-j',
    title: 'Cenário J — Divergência de Fontes / Leitura Requer Cautela',
    territoryName: 'MUNICÍPIO DEMONSTRATIVO KAPPA',
    headline: 'Divergência entre Estimativa Populacional e Cadastro Eleitoral',
    summaryParagraphs: [
      'O número de eleitores aptos registrados pelo TSE supera em 4% a população projetada pelo Censo IBGE.',
      'Esta divergência é típica de municípios dormitório com migração pendular intensa.',
    ],
    coverageRatio: '5 de 5 domínios',
    confidenceLevel: 'MÉDIA' as const,
    domains: [
      { domain: 'Demografia', status: 'DISPONIVEL' as const, engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: 'DISPONIVEL' as const, engineName: 'Motor TSE' },
      { domain: 'Segurança', status: 'DISPONIVEL' as const, engineName: 'Motor SEJUSP' },
      { domain: 'Saúde', status: 'DISPONIVEL' as const, engineName: 'Motor DATASUS' },
      { domain: 'Economia', status: 'DISPONIVEL' as const, engineName: 'Motor SICONFI' },
    ],
    signals: [
      {
        id: 'sig-j1',
        category: 'atencao' as const,
        priority: 'ALTO' as const,
        title: 'Divergência Demográfica x Eleitoral',
        description: 'Diferença de 4,2% entre eleitores cadastrados e residentes estimativos.',
        domains: ['Demografia', 'Eleitoral'],
        evidenceText: 'IBGE Censo 2022 vs TSE Eleitorado 2024.',
      },
    ],
  },
};
