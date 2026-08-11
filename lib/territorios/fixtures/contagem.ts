// lib/territorios/fixtures/contagem.ts
import { TerritoryDossier } from '../types';

export const CONTAGEM_DEMO: TerritoryDossier = {
  ibgeCode: '3118601',
  cityName: 'Contagem',
  uf: 'MG',
  lastUpdated: new Date().toISOString(),
  coverage: {
    ibge: 'demo',
    security: 'demo',
    health: 'demo',
    electoral: 'demo',
    economy: 'demo',
    news: 'demo',
  },
  
  diagnostic: {
    mode: 'demo',
    diagnosis: 'Contagem apresenta elevada relevância estratégica pela dimensão populacional, integração metropolitana e atividade econômica. O território combina oportunidades relacionadas à geração de emprego e infraestrutura com pontos de atenção em segurança e serviços públicos.',
    primaryOpportunity: 'Expansão de infraestrutura industrial',
    primaryRisk: 'Pressão sobre segurança e saúde',
    politicalPriority: 'ALTA',
    attentionLevel: 'MODERADO',
    trend: 'ESTÁVEL',
  },
  kpis: {
    mode: 'demo',
    population: '621.865',
    analyzedIndicators: 154,
    priority: 'ALTA',
    generalRisk: 'MODERADO',
    securityStatus: 'EM ATENÇÃO',
    healthStatus: 'SOBRECARGA',
  },
  themeRadar: {
    mode: 'demo',
    themes: [
      { theme: 'Segurança', intensity: 85, relevance: 90, presence: 80 },
      { theme: 'Saúde', intensity: 75, relevance: 85, presence: 70 },
      { theme: 'Mobilidade', intensity: 80, relevance: 75, presence: 85 },
      { theme: 'Emprego', intensity: 60, relevance: 80, presence: 65 },
      { theme: 'Infraestrutura', intensity: 70, relevance: 70, presence: 60 },
      { theme: 'Educação', intensity: 50, relevance: 60, presence: 55 },
    ],
  },
  localRadar: {
    mode: 'demo',
    items: [
      { id: '1', title: 'Exemplo: Obras de recapeamento afetam trânsito no centro', source: 'Portal Local', date: 'Há 2 dias', theme: 'Mobilidade', relevance: 'ALTA' },
      { id: '2', title: 'Exemplo: Inauguração de nova UPA é adiada', source: 'Notícias da Região', date: 'Há 5 dias', theme: 'Saúde', relevance: 'ALTA' },
      { id: '3', title: 'Exemplo: Polícia Militar realiza operação integrada', source: 'Diário Metropolitano', date: 'Há 1 semana', theme: 'Segurança', relevance: 'MÉDIA' },
      { id: '4', title: 'Exemplo: Índice de emprego na indústria apresenta alta', source: 'Economia MG', date: 'Há 2 semanas', theme: 'Emprego', relevance: 'MÉDIA' },
    ],
  },
  riskOpportunities: {
    mode: 'demo',
    risks: [
      { id: 'r1', title: 'Segurança Metropolitana', description: 'Elevação da sensação de insegurança associada a gargalos de integração.', evidence: 'Demonstrativo: Dados de crimes patrimoniais', priority: 'ALTA' },
      { id: 'r2', title: 'Gargalos na Saúde', description: 'Morosidade em atendimentos especializados causando insatisfação aguda.', evidence: 'Demonstrativo: Reclamações mapeadas', priority: 'ALTA' },
    ],
    opportunities: [
      { id: 'o1', title: 'Apoio à Indústria', description: 'Forte aderência a propostas de fomento industrial e qualificação técnica.', evidence: 'Demonstrativo: Perfil de Contagem', priority: 'ALTA' },
      { id: 'o2', title: 'Infraestrutura Logística', description: 'Oportunidade para debater concessões e parcerias em eixos viários.', evidence: 'Demonstrativo: Análise econômica', priority: 'MÉDIA' },
    ],
  },

  // ---------------------------------------------
  // CADERNOS TEMÁTICOS ENRIQUECIDOS
  // ---------------------------------------------
  demography: {
    mode: 'demo',
    executiveSummary: 'Contagem possui a 3ª maior população de Minas Gerais e uma densidade demográfica extrema de 3.184 hab/km². Com 99,4% de urbanização, a totalidade do crescimento populacional pressiona áreas consolidadas. A estrutura etária aponta para um envelhecimento populacional que exigirá adaptação das redes assistenciais.',
    population: { 
      value: '621.865', 
      label: 'Habitantes',
      trend: 'up',
      variation: '+3,8% em 10 anos',
      comparison: { mg: '3ª maior de MG', rmbh: '2ª da RMBH' },
      historicalSeries: [
        { period: '2010', value: 603442 },
        { period: '2022', value: 621865 },
      ],
      evidence: {
        source: 'IBGE',
        dataset: 'Censo Demográfico',
        period: '2022',
        lastUpdated: '28/06/2023',
        confidence: 'ALTA'
      }
    },
    density: { 
      value: '3.184,67', 
      label: 'hab/km²',
      trend: 'up',
      comparison: { mg: 'Top 5 mais densas' }
    },
    urbanization: { 
      value: '99,4%',
      trend: 'stable'
    },
    ageGroupDistrib: [
      { group: '0-14', percentage: 18.5 },
      { group: '15-24', percentage: 14.1 },
      { group: '25-39', percentage: 24.8 },
      { group: '40-59', percentage: 28.3 },
      { group: '60-74', percentage: 10.2 },
      { group: '75+', percentage: 4.1 },
    ],
    insight: {
      title: 'Transição Demográfica e Pressão Urbana',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'A estrutura populacional predominantemente urbana (99,4%) impõe desafios contínuos de infraestrutura.',
        'O envelhecimento progressivo (14,3% acima de 60 anos) sugere uma possível pressão sobre saúde especializada e mobilidade inclusiva nos próximos anos. Esta leitura deve ser monitorada junto à evolução da rede assistencial.'
      ],
      evidence: [
        {
          source: 'IBGE',
          dataset: 'Censo Demográfico',
          period: '2022',
          lastUpdated: '28/06/2023',
          methodology: 'Contagem da população residente e estrutura etária coletada via questionário.',
          confidence: 'ALTA'
        }
      ],
      confidence: 'ALTA',
      confidenceReasoning: 'Dados oficiais e recentes do Censo IBGE.'
    }
  },

  security: {
    mode: 'demo',
    executiveSummary: 'A localização estratégica e o fluxo metropolitano tornam Contagem suscetível a crimes patrimoniais. Nos últimos 6 meses, observou-se uma tendência de estabilização nos crimes violentos, mas houve aumento focalizado em roubos em vias de integração com Belo Horizonte.',
    generalIndicator: {
      value: 'EM ATENÇÃO',
      trend: 'stable',
      variation: 'Sem variação expressiva mensal'
    },
    monthlyEvolution: [
      { period: 'Jan', value: 120 },
      { period: 'Fev', value: 115 },
      { period: 'Mar', value: 130 },
      { period: 'Abr', value: 125 },
      { period: 'Mai', value: 140 },
      { period: 'Jun', value: 135 },
    ],
    topNatureRanking: [
      { nature: 'Roubo a Transeunte', count: 450, variation: '+5%', trend: 'up' },
      { nature: 'Furto de Veículo', count: 320, variation: '-2%', trend: 'down' },
      { nature: 'Lesão Corporal', count: 210, variation: '0%', trend: 'stable' },
    ],
    strategicReading: 'Concentração de ocorrências nos eixos de mobilidade metropolitana. Aumento leve em crimes patrimoniais.',
    insight: {
      title: 'Integração vs Segurança',
      type: 'HIPÓTESE',
      analysis: [
        'A flutuação nos crimes patrimoniais pode possuir correlação com o fluxo pendular metropolitano.',
        'Uma hipótese para investigação é avaliar se parte das ocorrências patrimoniais apresenta relação com fluxos de mobilidade e concentração populacional em vias de integração rápida.'
      ],
      evidence: [
        {
          source: 'SEJUSP-MG',
          dataset: 'Painel de Indicadores Criminais',
          period: 'Jan-Jun 2026',
          lastUpdated: '10/07/2026',
          methodology: 'Contagem de registros de REDS validados pela Polícia Militar.',
          confidence: 'ALTA'
        }
      ],
      confidence: 'ALTA',
      confidenceReasoning: 'Dados oficiais integrados via API de segurança pública, padronizados nacionalmente.'
    }
  },

  electoral: {
    mode: 'demo',
    executiveSummary: 'Com quase meio milhão de eleitores, Contagem é o 3º maior colégio eleitoral de MG. O comportamento das urnas revela um pragmatismo ancorado em pautas trabalhistas e de desenvolvimento urbano. A taxa de participação é madura, mas a polarização estadual reflete-se intensamente no município.',
    electorate: { 
      value: '475.210',
      trend: 'up',
      variation: '+12% em duas eleições',
      comparison: { mg: '3º maior de MG' },
      historicalSeries: [
        { period: '2016', value: 420000 },
        { period: '2020', value: 445000 },
        { period: '2024', value: 475210 },
      ],
      evidence: {
        source: 'TSE',
        dataset: 'Estatísticas do Eleitorado',
        period: '2024',
        lastUpdated: '01/08/2024',
        confidence: 'ALTA'
      }
    },
    participation: { 
      value: '78,4%',
      trend: 'stable',
      comparison: { mg: '2,1% acima da média estadual' }
    },
    abstention: { 
      value: '21,6%',
      trend: 'up',
      variation: '+1,2% vs eleição anterior'
    },
    historicalTrend: 'Alta polarização. Perfil de voto consolidado na região metropolitana, sensível a pautas econômicas e trabalhistas.',
    competitiveness: 'Alta Fragmentação no 1º Turno (média de 4 candidatos competitivos)',
    insight: {
      title: 'Comportamento do Eleitor',
      type: 'HIPÓTESE',
      analysis: [
        'Os dados sugerem uma possível sensibilidade maior a temas relacionados a emprego, infraestrutura e serviços públicos. Esta leitura deve ser tratada como hipótese analítica até que seja corroborada por pesquisas adicionais.',
        'O índice de comparecimento atesta a robustez do interesse eleitoral local, embora a leve alta na abstenção requeira monitoramento em áreas específicas.'
      ],
      evidence: [
        {
          source: 'TSE',
          dataset: 'Resultados das Eleições Municipais',
          period: '2016 - 2024',
          lastUpdated: '15/11/2024',
          methodology: 'Cálculo de variação histórica e cruzamento com bases de emprego e infraestrutura metropolitana.',
          confidence: 'MÉDIA'
        }
      ],
      confidence: 'MÉDIA',
      confidenceReasoning: 'A análise cruza dados quantitativos com inferências qualitativas pendentes de aferição primária.'
    }
  },

  health: {
    mode: 'demo',
    executiveSummary: 'A saúde enfrenta os gargalos típicos de um município núcleo metropolitano. A expansão da atenção básica não foi suficiente para frear a pressão sobre a alta complexidade, gerando sobrecarga hospitalar evidenciada nos atrasos e no monitoramento de reclamações públicas.',
    basicCoverage: { 
      value: '72,3%',
      trend: 'up',
      variation: '+4,5% a.a.'
    },
    hospitalDemand: 'ALTA',
    mainPressurePoints: ['Leitos de UTI', 'Pronto Atendimento', 'Falta de médicos especialistas'],
    statusQualitative: 'Atenção Básica em expansão, porém com forte gargalo hospitalar herdado da integração metropolitana.',
    insight: {
      title: 'Déficit Especializado',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'A ampliação da cobertura primária conseguiu mapear melhor as demandas crônicas da população, no entanto, a rede secundária e terciária sofre o impacto dessa triagem acelerada.',
        'Como município polo metropolitano, absorve também a demanda espontânea de cidades vizinhas.'
      ],
      evidence: [
        {
          source: 'DATASUS',
          dataset: 'Cadastro Nacional de Estabelecimentos de Saúde (CNES)',
          period: '2025',
          lastUpdated: '01/01/2026',
          methodology: 'Cálculo de leitos de UTI por mil habitantes e cobertura de ESF.',
          confidence: 'ALTA'
        }
      ],
      confidence: 'ALTA',
      confidenceReasoning: 'Dados oficiais baseados nos repasses ministeriais e cadastro ativo de leitos.'
    }
  },

  economy: {
    mode: 'demo',
    executiveSummary: 'Motor industrial e logístico da região metropolitana. A economia de Contagem mostra alta resiliência, apoiada na metalmecânica e um setor de serviços em franca expansão. A dependência do serviço público é moderada, com um mercado de trabalho privado forte.',
    mainActivity: 'Indústria de Transformação e Logística',
    employmentTrend: 'Tendência de Alta',
    dependencyOnPublicServices: 'MODERADA',
    predominantSectors: ['Metalmecânica', 'Logística', 'Comércio', 'Serviços'],
    insight: {
      title: 'Paradoxo do Crescimento e Logística',
      type: 'HIPÓTESE',
      analysis: [
        'O dinamismo econômico atrai fluxo de capital e geração de emprego, mas pode penalizar a mobilidade urbana devido ao trânsito de escoamento industrial.',
        'Políticas de desenvolvimento econômico integradas à infraestrutura viária podem mitigar esse risco e favorecer a atração de novos polos industriais.'
      ],
      evidence: [
        {
          source: 'Ministério do Trabalho',
          dataset: 'CAGED - Cadastro Geral de Empregados',
          period: '2025',
          lastUpdated: '10/02/2026',
          methodology: 'Análise do saldo de movimentações no setor da Indústria de Transformação.',
          confidence: 'ALTA'
        }
      ],
      confidence: 'ALTA',
      confidenceReasoning: 'Dados oficiais cruzados confirmam a predominância do setor industrial e logístico.'
    }
  },

  // ---------------------------------------------
  // INTELIGÊNCIA TRANSVERSAL
  // ---------------------------------------------
  aiRecommendation: {
    mode: 'demo',
    priorityTheme: {
      text: 'Integração metropolitana e desenvolvimento econômico como motores para solução de gargalos.',
      traceability: 'Ancorado no perfil industrial e histórico político pragmático.'
    },
    listenTo: [
      { text: 'Como a comunidade percebe o apoio do Estado na atração de novas empresas?', traceability: 'Radar Econômico aponta Emprego com intensidade 60/100.' },
      { text: 'Qual o nível real de atendimento da rede básica de saúde hoje?', traceability: 'Indicador Geral: Sobrecarga' }
    ],
    avoidPitfalls: [
      { text: 'Evitar discursos excessivamente teóricos ou descolados da realidade industrial.', traceability: 'Perfil de voto consolidado sensível a pautas trabalhistas.' },
      { text: 'Não prometer soluções rápidas para gargalos históricos de trânsito.', traceability: 'Infraestrutura e Mobilidade apresentam alta presença e intensidade.' }
    ],
    powerfulQuestions: [
      { text: 'Como o gargalo do trânsito na via expressa tem afetado o custo logístico local?' },
      { text: 'Quais os impactos da demora nos exames especializados para a força de trabalho?' }
    ],
    tractionMessages: [
      { text: 'Integração metropolitana de verdade.', traceability: 'Dificuldade nos serviços públicos herdada da conurbação.' },
      { text: 'Força da indústria mineira gerando emprego local.', traceability: 'Tendência de Alta no Emprego (Metalmecânica).' },
      { text: 'Segurança que funciona além da capital.', traceability: 'Segurança é o tema de maior intensidade (85/100).' }
    ],
    agendaOpportunities: [
      { text: 'Visita a polos industriais e associações comerciais.', traceability: 'Principal Ativo do Município' },
      { text: 'Encontro com lideranças comunitárias no eixo central.' },
      { text: 'Reunião focada com conselhos de segurança.', traceability: 'Ocorrências concentradas nos eixos de mobilidade' }
    ],
  },
  integratedAnalysis: {
    mode: 'demo',
    generatedAt: new Date().toISOString(),
    executiveSummary: [
      'Contagem combina força industrial e vocação para geração de emprego com uma pressão crônica sobre serviços públicos e segurança territorial. A economia desponta como o ativo mais valioso, sendo o motor da sustentação política na região.',
      'Em contrapartida, os gargalos de mobilidade e as dificuldades na saúde especializada representam passivos sociais. A segurança pública, muito afetada pela natureza de hub logístico metropolitano, requer extrema atenção.',
      'Politicamente, o caminho estratégico está na conexão entre o desenvolvimento econômico e melhorias palpáveis de infraestrutura, convertendo resultados econômicos macro em qualidade de vida local.'
    ],
    quickRead: {
      mood: 'ALERTA',
      pressure: 'SEGURANÇA E SAÚDE',
      asset: 'ECONOMIA E EMPREGO',
      opportunity: 'INFRAESTRUTURA',
    },
    politicalImplications: {
      title: 'O que isso significa politicamente',
      paragraphs: [
        'A intensidade do tema "Segurança" (85/100) aponta que números estatisticamente controlados não são suficientes para aplacar a percepção popular. A população associa seus problemas à complexidade da região metropolitana.',
        'Ao mesmo tempo, o pragmatismo eleitoral de Contagem (comportamento maduro de votos baseados em pautas reais do trabalho) indica pouca tolerância para discursos vazios. O eleitor não quer saber o que o Estado pretende planejar; ele quer saber de que forma o fomento estadual resolve a UPA atrasada e a via esburacada.'
      ]
    },
    sourcesCoverage: {
      ibge: 'real',
      security: 'real',
      health: 'demo',
      electoral: 'demo',
      economy: 'demo',
      news: 'demo',
    },
    sections: []
  },
};
