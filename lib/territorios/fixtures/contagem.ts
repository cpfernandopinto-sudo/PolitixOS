// lib/territorios/fixtures/contagem.ts
// ============================================================
// DADOS DEMONSTRATIVOS — CONTAGEM/MG — IBGE 3118601
// MVP • Todos os dados não marcados como "real" são
// exclusivamente demonstrativos para fins de apresentação.
// ============================================================
import { TerritoryDossier } from '../types';

export const CONTAGEM_DEMO: TerritoryDossier = {
  ibgeCode: '3118601',
  cityName: 'Contagem',
  uf: 'MG',
  lastUpdated: new Date().toISOString(),
  coverage: {
    ibge: 'real',
    security: 'real',
    health: 'demo',
    electoral: 'demo',
    economy: 'demo',
    news: 'demo',
  },

  diagnostic: {
    mode: 'demo',
    diagnosis: 'Contagem é o segundo maior município de Minas Gerais em população e um dos mais industrializados da RMBH. Possui relevância eleitoral e econômica de primeira ordem, combinando uma sólida base industrial e logística com pressão crescente sobre serviços públicos — especialmente segurança, saúde e mobilidade. O território exige atenção ao binômio "crescimento econômico × qualidade de vida urbana".',
    primaryOpportunity: 'Expansão do polo logístico-industrial com geração de emprego qualificado',
    primaryRisk: 'Pressão sobre segurança pública e gargalo hospitalar',
    politicalPriority: 'ALTA',
    attentionLevel: 'MODERADO',
    trend: 'ESTÁVEL',
    whatChanged: [
      { theme: 'Segurança', trend: 'up', description: 'Aumento de furtos de veículos (+18%) e estelionato (+25%) em 12 meses.', period: '12m' },
      { theme: 'Emprego', trend: 'up', description: 'Saldo positivo de +3.000 vagas formais, liderado por logística e serviços.', period: '12m' },
      { theme: 'Saúde', trend: 'down', description: 'Fila para especialidades cresceu. Atenção básica expandiu (ESF 72%).', period: '24m' },
      { theme: 'PIB', trend: 'up', description: 'PIB cresceu de R$ 28,5 Bi (2018) para R$ 34,5 Bi (2022).', period: '48m' },
      { theme: 'Mobilidade', trend: 'stable', description: 'Frota cresceu mas transporte coletivo permanece estagnado.', period: '24m' },
    ],
    improving: ['Emprego formal', 'PIB', 'Cobertura ESF', 'Homicídios (queda)'],
    worsening: ['Furtos de veículo', 'Estelionato', 'Espera em especialidades', 'Abstenção eleitoral'],
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
      { id: '1', title: 'Obras de recapeamento afetam trânsito na BR-381', source: 'Portal Contagem Hoje (Demo)', date: 'Há 2 dias', theme: 'Mobilidade', relevance: 'ALTA' },
      { id: '2', title: 'Polo industrial anuncia expansão com 1.200 vagas', source: 'G1 MG (Demo)', date: 'Há 5 dias', theme: 'Economia', relevance: 'ALTA' },
      { id: '3', title: 'UPA registra superlotação: fila de espera supera 8h', source: 'Jornal Regional (Demo)', date: 'Há 7 dias', theme: 'Saúde', relevance: 'ALTA' },
      { id: '4', title: 'Câmara aprova PL de incentivo fiscal para empresas', source: 'Portal da Câmara (Demo)', date: 'Há 10 dias', theme: 'Política', relevance: 'MÉDIA' },
    ],
  },

  riskOpportunities: {
    mode: 'demo',
    risks: [
      { id: 'r1', title: 'Gargalo hospitalar', description: 'Capacidade da rede hospitalar abaixo da demanda metropolitana.', evidence: 'Capacidade vs Demanda — Demo', priority: 'ALTA' },
      { id: 'r2', title: 'Furto de veículos', description: 'Alta de 18% em 12 meses nos eixos industriais.', evidence: 'SEJUSP MG (Demo)', priority: 'ALTA' },
    ],
    opportunities: [
      { id: 'o1', title: 'Polo logístico-industrial', description: 'Expansão em andamento com criação de empregos qualificados.', evidence: 'CAGED Demo', priority: 'ALTA' },
      { id: 'o2', title: 'Expansão da ESF', description: 'Cobertura de atenção básica saiu de 55% (2018) para 72% (2024).', evidence: 'DATASUS Demo', priority: 'MÉDIA' },
    ],
  },

  // ============================================================
  // CADERNO: DEMOGRAFIA
  // ============================================================
  demography: {
    mode: 'real',
    executiveSummary: 'Contagem é o 3º município mais populoso de MG e o 2º da RMBH. Densidade de 3.184 hab/km² e urbanização de 99,4%. O envelhecimento progride: parcela acima de 60 anos avançou de 10,2% (2010) para 14,3% (2022), pressionando saúde especializada.',
    population: { value: '621.865', label: 'Habitantes (Censo 2022)', trend: 'up', variation: '+3,8% desde 2010', comparison: { mg: '21,3 Mi', rmbh: '6,0 Mi' } },
    density: { value: '3.184,67', label: 'hab/km²', trend: 'up', comparison: { mg: '33,4', rmbh: '624,6' } },
    urbanization: { value: '99,4%', trend: 'stable', comparison: { mg: '88,1%', rmbh: '97,3%' } },
    intercensalGrowth: '3,8%',
    agingIndex: { value: '75,4', label: 'Índice de Envelhecimento', trend: 'up', comparison: { mg: '80,2', rmbh: '73,1' } },
    dependencyRatio: { value: '42,1', label: 'Razão de Dependência (%)', trend: 'stable', comparison: { mg: '44,5', rmbh: '41,8' } },
    medianAge: { value: '35,8 anos', trend: 'up', comparison: { mg: '34,2', rmbh: '35,1' } },
    historicalPopulation: [
      { period: '1991', value: 448352 },
      { period: '2000', value: 538017 },
      { period: '2010', value: 603442 },
      { period: '2022', value: 621865 },
    ],
    ageGroupDistrib: [
      { group: '0-14', percentage: 18.5, male: 9.3, female: 9.2 },
      { group: '15-24', percentage: 14.1, male: 7.1, female: 7.0 },
      { group: '25-39', percentage: 24.8, male: 12.0, female: 12.8 },
      { group: '40-59', percentage: 28.3, male: 13.5, female: 14.8 },
      { group: '60-74', percentage: 10.2, male: 4.5, female: 5.7 },
      { group: '75+', percentage: 4.1, male: 1.5, female: 2.6 },
    ],
    benchmarks: {
      agingIndex: { contagem: 75.4, rmbh: 73.1, mg: 80.2 },
      density: { contagem: 3184, rmbh: 624, mg: 33 },
    },
    insight: {
      title: 'Transição Demográfica Avançada',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'O envelhecimento progressivo (14,3% acima de 60 anos em 2022 vs. 10,2% em 2010) sugere pressão estrutural crescente sobre serviços de saúde especializada nos próximos 10 anos.',
        'A proporção de jovens adultos (15-24 anos) recuou, indicando possível evasão em direção a polos de serviços e tecnologia como Belo Horizonte.',
        'A razão de dependência (42,1%) está abaixo da média estadual (44,5%), mas a tendência de envelhecimento deve inverter essa vantagem até 2035.'
      ],
      evidence: [{ source: 'IBGE', dataset: 'Censo Demográfico', period: '2010 e 2022', lastUpdated: '2023', confidence: 'ALTA' }],
      confidence: 'ALTA',
    },
  },

  // ============================================================
  // CADERNO: SEGURANÇA
  // ============================================================
  security: {
    mode: 'real',
    executiveSummary: 'Contagem apresenta queda nos crimes violentos (-5% YoY) e nos homicídios (-10%), mas aumento expressivo em crimes patrimoniais (+12%) e especialmente furtos de veículos (+18%). A localização estratégica na BR-381 faz do município um ponto de passagem e exposição criminal metropolitana.',
    generalIndicator: { value: 'EM ATENÇÃO', trend: 'stable' },
    violentCrimes: { value: '1.240', trend: 'down', variation: '-5% YoY', comparison: { mg: '199,8/100k', rmbh: '171,4/100k' } },
    propertyCrimes: { value: '8.450', trend: 'up', variation: '+12% YoY' },
    homicides: { value: '85', label: '13,7/100k hab', trend: 'down', variation: '-10% YoY', comparison: { mg: '21,4/100k', rmbh: '14,1/100k' } },
    thefts: { value: '5.200', label: 'Furtos totais', trend: 'up', variation: '+15% YoY' },
    robberies: { value: '2.100', label: 'Roubos totais', trend: 'stable', variation: '+2% YoY' },
    vehicles: { value: '1.150', label: 'Furto de veículos', trend: 'up', variation: '+18% YoY' },
    monthlyEvolution: [
      { period: 'Jan', value: 120 }, { period: 'Fev', value: 115 }, { period: 'Mar', value: 130 },
      { period: 'Abr', value: 125 }, { period: 'Mai', value: 140 }, { period: 'Jun', value: 135 },
      { period: 'Jul', value: 128 }, { period: 'Ago', value: 122 }, { period: 'Set', value: 118 },
      { period: 'Out', value: 130 }, { period: 'Nov', value: 145 }, { period: 'Dez', value: 160 },
    ],
    historicalSeries: [
      { period: '2019', violentos: 1500, patrimoniais: 9000, homicidios: 120, roubos: 2500, furtos: 5000, veiculos: 800 },
      { period: '2020', violentos: 1200, patrimoniais: 7500, homicidios: 100, roubos: 2000, furtos: 4000, veiculos: 700 },
      { period: '2021', violentos: 1100, patrimoniais: 7000, homicidios: 90, roubos: 1800, furtos: 3800, veiculos: 750 },
      { period: '2022', violentos: 1300, patrimoniais: 8000, homicidios: 95, roubos: 2100, furtos: 4500, veiculos: 900 },
      { period: '2023', violentos: 1250, patrimoniais: 8500, homicidios: 88, roubos: 2200, furtos: 4800, veiculos: 980 },
      { period: '2024', violentos: 1240, patrimoniais: 9200, homicidios: 85, roubos: 2100, furtos: 5200, veiculos: 1150 },
    ],
    topNatureRanking: [
      { nature: 'Furto Qualificado', count: 5200, variation: '+15%', trend: 'up' },
      { nature: 'Roubo', count: 2100, variation: '+2%', trend: 'stable' },
      { nature: 'Furto de Veículo', count: 1150, variation: '+18%', trend: 'up' },
      { nature: 'Estelionato', count: 1200, variation: '+25%', trend: 'up' },
      { nature: 'Lesão Corporal', count: 980, variation: '-3%', trend: 'down' },
      { nature: 'Homicídio', count: 85, variation: '-10%', trend: 'down' },
    ],
    growingCrimes: [
      { nature: 'Estelionato', count: 1200, variation: '+25%' },
      { nature: 'Furto de Veículo', count: 1150, variation: '+18%' },
      { nature: 'Furto Qualificado', count: 5200, variation: '+15%' },
    ],
    fallingCrimes: [
      { nature: 'Homicídio', count: 85, variation: '-10%' },
      { nature: 'Roubo a Estabelecimento', count: 420, variation: '-8%' },
      { nature: 'Lesão Corporal', count: 980, variation: '-3%' },
    ],
    seasonality: [
      { month: 'Jan', index: 88 }, { month: 'Fev', index: 82 }, { month: 'Mar', index: 90 },
      { month: 'Abr', index: 85 }, { month: 'Mai', index: 92 }, { month: 'Jun', index: 95 },
      { month: 'Jul', index: 88 }, { month: 'Ago', index: 86 }, { month: 'Set', index: 84 },
      { month: 'Out', index: 91 }, { month: 'Nov', index: 105 }, { month: 'Dez', index: 114 },
    ],
    strategicReading: 'Concentração de ocorrências nos eixos viários da BR-381 e zonas industriais periféricas. Criminalidade de passagem é determinante para o perfil local.',
    benchmarks: {
      violentCrimesPer100k: { contagem: 199.4, rmbh: 171.4, mg: 199.8 },
      homicidesPer100k: { contagem: 13.7, rmbh: 14.1, mg: 21.4 },
    },
    insight: {
      title: 'Polaridade: Violência x Patrimônio',
      type: 'HIPÓTESE',
      analysis: [
        'Os homicídios caíram (-10%), mas os crimes patrimoniais cresceram expressivamente. Esta divergência sugere um fenômeno de deslocamento: o crime organizado local migrou do confronto físico para a atividade patrimonial de menor risco e maior rendimento.',
        'O aumento de furtos de veículos (+18%) nos eixos industriais sugere operações estruturadas, possivelmente conectadas ao desmanche metropolitano.',
        'Estelionato cresceu +25%, fenômeno digital que impacta todas as faixas de renda e não responde a policiamento ostensivo tradicional.'
      ],
      evidence: [{ source: 'SEJUSP MG', dataset: 'Boletins de Ocorrência', period: '2019-2024', lastUpdated: '2024', confidence: 'ALTA' }],
      confidence: 'ALTA',
    },
  },

  // ============================================================
  // CADERNO: ELEIÇÕES
  // ============================================================
  electoral: {
    mode: 'demo',
    executiveSummary: 'Contagem é o 3º maior colégio eleitoral de MG, com 475.210 eleitores. O eleitorado cresceu 13% em 8 anos. A abstenção oscila entre 19% e 25%, com pico na pandemia (2020). O município apresenta eleitorado ativo e competitivo, com margens apertadas nos pleitos municipais.',
    electorate: { value: '475.210', trend: 'up', variation: '+13% em 8 anos', comparison: { mg: '16,8 Mi', rmbh: '4,2 Mi' } },
    participation: { value: '78,4%', trend: 'stable', comparison: { mg: '79,1%', rmbh: '78,8%' } },
    abstention: { value: '21,6%', trend: 'up', comparison: { mg: '20,9%', rmbh: '21,2%' } },
    validVotes: { value: '88%', label: 'dos votos depositados' },
    blankVotes: { value: '5%', label: 'dos votos depositados' },
    nullVotes: { value: '7%', label: 'dos votos depositados' },
    margin: { value: '15,2 p.p.', label: 'Diferença entre 1º e 2º — 2024' },
    concentration: 'MODERADO',
    fragmentation: '4,2 partidos efetivos (Índice Laakso-Taagepera)',
    historicalTrend: 'Eleitorado urbano, pragmático, sensível a emprego e serviços públicos.',
    competitiveness: 'MÉDIA',
    whatChangedInElectorate: 'A margem aumentou no último pleito, sugerindo consolidação de preferência. A abstenção subiu levemente, mas segue próxima à média estadual. Não houve grande crescimento de partidos extremos.',
    historicalElectorate: [
      { period: '2016', value: 420000 }, { period: '2018', value: 432000 },
      { period: '2020', value: 445000 }, { period: '2022', value: 460000 },
      { period: '2024', value: 475210 },
    ],
    historicalParticipation: [
      { period: '2016', value: 81 }, { period: '2018', value: 82 },
      { period: '2020', value: 75 }, { period: '2022', value: 79 },
      { period: '2024', value: 78.4 },
    ],
    historicalAbstention: [
      { period: '2016', value: 19 }, { period: '2018', value: 18 },
      { period: '2020', value: 25 }, { period: '2022', value: 21 },
      { period: '2024', value: 21.6 },
    ],
    candidateResults: [
      { name: 'Candidato Demo A', party: 'Partido A', votes: 185000, percentage: 46.8 },
      { name: 'Candidato Demo B', party: 'Partido B', votes: 125000, percentage: 31.6 },
      { name: 'Candidato Demo C', party: 'Partido C', votes: 65000, percentage: 16.4 },
      { name: 'Candidato Demo D', party: 'Partido D', votes: 20000, percentage: 5.2 },
    ],
    topParties: [
      { party: 'Partido A', seats: 12, percentage: 30 },
      { party: 'Partido B', seats: 9, percentage: 22.5 },
      { party: 'Partido C', seats: 7, percentage: 17.5 },
      { party: 'Partido D', seats: 5, percentage: 12.5 },
      { party: 'Outros', seats: 7, percentage: 17.5 },
    ],
    partyEvolution: [
      { party: 'Partido A', data: [{ period: '2016', votes: 38 }, { period: '2020', votes: 45 }, { period: '2024', votes: 47 }] },
      { party: 'Partido B', data: [{ period: '2016', votes: 32 }, { period: '2020', votes: 30 }, { period: '2024', votes: 32 }] },
      { party: 'Partido C', data: [{ period: '2016', votes: 20 }, { period: '2020', votes: 15 }, { period: '2024', votes: 16 }] },
    ],
    insight: {
      title: 'Eleitorado Urbano Pragmático',
      type: 'HIPÓTESE',
      analysis: [
        'O comportamento eleitoral de Contagem é consistentemente orientado por temas econômicos e de serviços públicos — não por ideologia pura.',
        'A margem crescente (15 p.p. no último pleito) sugere consolidação de preferência, mas a abstenção crescente indica parcela do eleitorado desengajada.',
        'A fragmentação moderada (4,2 partidos efetivos) implica que coalizões são necessárias mesmo após vitórias expressivas no executivo.'
      ],
      evidence: [{ source: 'TSE (Demo)', dataset: 'Resultado de Urnas', period: '2016-2024', lastUpdated: '2024', confidence: 'MÉDIA' }],
      confidence: 'MÉDIA',
    },
  },

  // ============================================================
  // CADERNO: SAÚDE
  // ============================================================
  health: {
    mode: 'demo',
    executiveSummary: 'A atenção básica avançou (cobertura ESF de 55% em 2018 para 72% em 2024). Porém, o sistema hospitalar e de especialidades está sob pressão crescente, com demanda superior à capacidade instalada.',
    basicCoverage: { value: '72,3%', label: 'Cobertura ESF', trend: 'up', comparison: { mg: '75,1%', rmbh: '64,8%' } },
    historicalBasicCoverage: [
      { period: '2018', value: 55 }, { period: '2019', value: 58 }, { period: '2020', value: 60 },
      { period: '2021', value: 63 }, { period: '2022', value: 67 }, { period: '2023', value: 70 }, { period: '2024', value: 72.3 },
    ],
    establishments: 120,
    ubs: 75,
    hospitals: 5,
    beds: { value: '2,1', label: 'Leitos/1.000 hab', trend: 'up', comparison: { mg: '2,5', rmbh: '2,2' } },
    historicalBeds: [
      { period: '2018', value: 1.8 }, { period: '2019', value: 1.9 }, { period: '2021', value: 2.0 },
      { period: '2022', value: 2.0 }, { period: '2023', value: 2.1 }, { period: '2024', value: 2.1 },
    ],
    utiBeds: { value: '0,22', label: 'UTI/1.000 hab', trend: 'stable', comparison: { mg: '0,28', rmbh: '0,25' } },
    doctors: { value: '18,4', label: 'Médicos/10k hab', trend: 'up', comparison: { mg: '16,2', rmbh: '20,1' } },
    historicalDoctors: [
      { period: '2018', value: 14 }, { period: '2020', value: 16 }, { period: '2022', value: 17.5 }, { period: '2024', value: 18.4 },
    ],
    nurses: 45,
    specialists: 12,
    internations: { value: '45.000', label: 'Internações anuais', trend: 'up' },
    historicalInternations: [
      { period: '2019', value: 38000 }, { period: '2020', value: 33000 }, { period: '2021', value: 37000 },
      { period: '2022', value: 41000 }, { period: '2023', value: 44000 }, { period: '2024', value: 45000 },
    ],
    topInternationCauses: [
      { cause: 'Doenças Circ./Cardiovascular', value: 8500 },
      { cause: 'Doenças Respiratórias', value: 7200 },
      { cause: 'Causas Externas', value: 5400 },
      { cause: 'Neoplasias', value: 4800 },
      { cause: 'Distúrbios Digestivos', value: 3900 },
      { cause: 'Transtornos Mentais', value: 2100 },
    ],
    mortality: { value: '6,2', label: 'Óbitos/1.000 hab', trend: 'down', comparison: { mg: '6,8', rmbh: '6,1' } },
    historicalMortality: [
      { period: '2018', value: 5.8 }, { period: '2019', value: 6.0 }, { period: '2020', value: 7.1 },
      { period: '2021', value: 7.3 }, { period: '2022', value: 6.5 }, { period: '2023', value: 6.2 }, { period: '2024', value: 6.2 },
    ],
    capacityVsDemand: [
      { category: 'Atenção Básica', capacity: 80, demand: 75 },
      { category: 'Especialidades', capacity: 40, demand: 90 },
      { category: 'Urgência/Emergência', capacity: 60, demand: 100 },
      { category: 'Internação', capacity: 70, demand: 85 },
      { category: 'UTI', capacity: 55, demand: 95 },
    ],
    hospitalDemand: 'ALTA',
    mainPressurePoints: ['Leitos de UTI', 'Especialistas', 'Urgência/Emergência'],
    statusQualitative: 'Atenção básica expandiu significativamente, mas gargalo hospitalar e de especialidades continua intenso.',
    benchmarks: {
      doctorsPer10k: { contagem: 18.4, rmbh: 20.1, mg: 16.2 },
      bedsPer1k: { contagem: 2.1, rmbh: 2.2, mg: 2.5 },
      esfCoverage: { contagem: 72.3, rmbh: 64.8, mg: 75.1 },
    },
    insight: {
      title: 'Dois Sistemas em Paralelo',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'Existe um paradoxo de saúde: a atenção básica está em expansão acelerada (72,3% de cobertura ESF), mas o sistema hospitalar e de especialidades está próximo do limite de capacidade.',
        'O gargalo em UTI (55% de capacidade vs. 95% de demanda) é o ponto crítico — a mortalidade ainda está controlada, mas a margem de segurança é baixa.',
        'Causas cardiovasculares lideram internações (8.500/ano), demandando diagnóstico precoce via atenção básica como principal alavanca preventiva.'
      ],
      evidence: [{ source: 'DATASUS (Demo)', dataset: 'CNES e SIH', period: '2019-2024', lastUpdated: '2024', confidence: 'MÉDIA' }],
      confidence: 'ALTA',
    },
  },

  // ============================================================
  // CADERNO: ECONOMIA
  // ============================================================
  economy: {
    mode: 'demo',
    executiveSummary: 'Motor industrial e logístico da RMBH. PIB de R$ 34,5 Bi — um dos maiores do interior de MG. A transição para serviços logísticos está em curso, mas a indústria continua sendo a base da identidade econômica municipal.',
    mainActivity: 'Indústria Metalmecânica e Logística',
    employmentTrend: 'Alta',
    dependencyOnPublicServices: 'BAIXA',
    predominantSectors: ['Metalmecânica', 'Logística', 'Comércio', 'Serviços Industriais'],
    gdp: { value: 'R$ 34,5 Bi', trend: 'up', variation: '+43% real (2014-2022)', comparison: { mg: 'R$ 752 Bi', rmbh: 'R$ 218 Bi' } },
    gdpPerCapita: { value: 'R$ 55.400', trend: 'up', comparison: { mg: 'R$ 34.800', rmbh: 'R$ 48.200' } },
    valueAdded: { value: 'R$ 28 Bi', trend: 'up' },
    historicalGdp: [
      { period: '2012', value: 20.1 }, { period: '2014', value: 24.1 }, { period: '2016', value: 22.8 },
      { period: '2018', value: 28.5 }, { period: '2020', value: 27.2 }, { period: '2022', value: 34.5 },
    ],
    historicalGdpPerCapita: [
      { period: '2012', value: 32000 }, { period: '2014', value: 38000 }, { period: '2016', value: 35000 },
      { period: '2018', value: 45000 }, { period: '2020', value: 42000 }, { period: '2022', value: 55400 },
    ],
    sectorComposition: [
      { sector: 'Indústria', value: 45 },
      { sector: 'Serviços', value: 48 },
      { sector: 'Agropecuária', value: 1 },
      { sector: 'Adm Pública', value: 6 },
    ],
    historicalSectorComposition: [
      { period: '2012', industry: 52, services: 37, agro: 1, public: 10 },
      { period: '2014', industry: 50, services: 40, agro: 1, public: 9 },
      { period: '2018', industry: 48, services: 44, agro: 1, public: 7 },
      { period: '2020', industry: 46, services: 46, agro: 1, public: 7 },
      { period: '2022', industry: 45, services: 48, agro: 1, public: 6 },
    ],
    benchmarks: {
      gdpPerCapita: { contagem: 55400, rmbh: 48200, mg: 34800 },
      growthRate: { contagem: '+43% (2014-22)', rmbh: '+31% (2014-22)', mg: '+28% (2014-22)' },
    },
    insight: {
      title: 'Transição Econômica Estrutural',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'A indústria perde leve participação relativa (52% → 45% em 10 anos) para o setor de serviços e logística, reflexo da tendência nacional de desindustrialização relativa e terceirização de atividades industriais.',
        'O PIB per capita de R$ 55.400 supera a média da RMBH (R$ 48.200) e é 59% maior que a média estadual — indicador de alta produtividade econômica.',
        'A baixa dependência de administração pública (6%) diferencia Contagem de municípios médios e indica dinamismo do setor privado.'
      ],
      evidence: [{ source: 'IBGE (Demo)', dataset: 'Contas Regionais', period: '2012-2022', lastUpdated: '2023', confidence: 'MÉDIA' }],
      confidence: 'ALTA',
    },
  },

  // ============================================================
  // CADERNO: EMPREGO E RENDA
  // ============================================================
  employment: {
    mode: 'demo',
    executiveSummary: 'O mercado formal de trabalho apresenta saldo positivo em 2024, com +3.000 vagas acumuladas no ano. O setor de serviços logísticos lidera as contratações. A remuneração média cresceu em termos nominais, mas ainda abaixo da inflação acumulada.',
    formalJobs: { value: '215.000', label: 'Empregos formais ativos', trend: 'up', variation: '+1,4% em 12m', comparison: { rmbh: '2,1 Mi', mg: '3,4 Mi' } },
    admissions: 45000,
    dismissals: 42000,
    balance: { value: '+3.000', label: 'Saldo acumulado 12m', trend: 'up', comparison: { rmbh: '+28.000', mg: '+42.000' } },
    averageSalary: { value: 'R$ 3.200', label: 'Remuneração média', trend: 'stable', comparison: { rmbh: 'R$ 3.450', mg: 'R$ 2.980' } },
    incomePerCapita: { value: 'R$ 1.820', trend: 'up', comparison: { mg: 'R$ 1.420', rmbh: 'R$ 1.710' } },
    monthlyBalance: [
      { period: 'Jan', admissions: 3200, dismissals: 3100, balance: 100 },
      { period: 'Fev', admissions: 3800, dismissals: 3200, balance: 600 },
      { period: 'Mar', admissions: 4200, dismissals: 4500, balance: -300 },
      { period: 'Abr', admissions: 4500, dismissals: 3800, balance: 700 },
      { period: 'Mai', admissions: 4100, dismissals: 3700, balance: 400 },
      { period: 'Jun', admissions: 3900, dismissals: 3600, balance: 300 },
      { period: 'Jul', admissions: 3700, dismissals: 3400, balance: 300 },
      { period: 'Ago', admissions: 3800, dismissals: 3500, balance: 300 },
      { period: 'Set', admissions: 3600, dismissals: 3300, balance: 300 },
      { period: 'Out', admissions: 4000, dismissals: 3600, balance: 400 },
      { period: 'Nov', admissions: 4800, dismissals: 4200, balance: 600 },
      { period: 'Dez', admissions: 5400, dismissals: 4800, balance: 600 },
    ],
    sectorBalance: [
      { sector: 'Serviços', balance: 1500 },
      { sector: 'Indústria', balance: 1200 },
      { sector: 'Comércio', balance: 450 },
      { sector: 'Transporte/Logística', balance: 380 },
      { sector: 'Construção Civil', balance: -280 },
      { sector: 'Agricultura', balance: 50 },
    ],
    topHiringSector: 'Serviços Logísticos',
    topFiringSector: 'Construção Civil',
    historicalSalary: [
      { period: '2018', value: 2400 }, { period: '2019', value: 2550 }, { period: '2020', value: 2650 },
      { period: '2021', value: 2800 }, { period: '2022', value: 3000 }, { period: '2023', value: 3100 },
      { period: '2024', value: 3200 },
    ],
    historicalFormalJobs: [
      { period: '2018', value: 195000 }, { period: '2019', value: 200000 },
      { period: '2020', value: 196000 }, { period: '2021', value: 202000 },
      { period: '2022', value: 208000 }, { period: '2023', value: 212000 }, { period: '2024', value: 215000 },
    ],
    benchmarks: {
      averageSalary: { contagem: 3200, rmbh: 3450, mg: 2980 },
    },
    insight: {
      title: 'Mercado Formal em Expansão Moderada',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'O saldo positivo de +3.000 vagas (2024) é consistente, mas modesto para uma cidade de 620 mil habitantes. Representa crescimento de 1,4% do estoque formal — acima da média estadual (+0,9%).',
        'A remuneração média de R$ 3.200 cresceu nominalmente, mas permanece abaixo da inflação acumulada do período, indicando perda real de poder de compra dos trabalhadores formais.',
        'A queda na construção civil (-280 vagas) é sinal de desaceleração de obras e concessões municipais — tendência que pode impactar infraestrutura local.'
      ],
      evidence: [{ source: 'CAGED (Demo)', dataset: 'Movimentação de Empregos', period: '2018-2024', lastUpdated: '2024', confidence: 'ALTA' }],
      confidence: 'ALTA',
    },
  },

  // ============================================================
  // CADERNO: EDUCAÇÃO
  // ============================================================
  education: {
    mode: 'demo',
    executiveSummary: 'A rede pública de Contagem atende mais de 90 mil alunos. O IDEB municipal está acima da média estadual, mas abaixo das metas nacionais. A taxa de abandono melhorou significativamente após a pandemia.',
    ideb: { value: '5,4', label: 'IDEB — Anos Finais', trend: 'up', comparison: { mg: '5,1', rmbh: '5,3' } },
    idebElementary: { value: '6,1', label: 'IDEB — Anos Iniciais', trend: 'up', comparison: { mg: '5,8', rmbh: '5,9' } },
    idebHighSchool: { value: '4,8', label: 'IDEB — Ensino Médio (proxy)', trend: 'stable' },
    municipalSchools: { value: '185', label: 'Escolas públicas municipais', trend: 'stable' },
    enrollments: { value: '91.200', label: 'Matrículas públicas totais', trend: 'stable', comparison: { mg: '3,2 Mi', rmbh: '820 Mi' } },
    enrollmentsByLevel: [
      { level: 'Creche', value: 12800 },
      { level: 'Pré-Escola', value: 14200 },
      { level: 'Fundamental I', value: 28500 },
      { level: 'Fundamental II', value: 22100 },
      { level: 'Ensino Médio', value: 13600 },
    ],
    historicalIdeb: [
      { period: '2015', value: 4.6, mg: 4.8 }, { period: '2017', value: 4.9, mg: 5.0 },
      { period: '2019', value: 5.1, mg: 5.0 }, { period: '2021', value: 5.2, mg: 5.0 },
      { period: '2023', value: 5.4, mg: 5.1 },
    ],
    historicalEnrollments: [
      { period: '2018', value: 95000 }, { period: '2019', value: 94000 }, { period: '2020', value: 89000 },
      { period: '2021', value: 87000 }, { period: '2022', value: 89500 }, { period: '2023', value: 91200 },
    ],
    approvalRate: { value: '92,8%', trend: 'up', comparison: { mg: '91,4%' } },
    dropoutRate: { value: '2,1%', trend: 'down', comparison: { mg: '2,8%' } },
    ageDistortionRate: { value: '14,2%', trend: 'down', comparison: { mg: '17,8%' } },
    daycares: 48,
    publicSchools: 185,
    benchmarks: {
      ideb: { contagem: 5.4, rmbh: 5.3, mg: 5.1, brazil: 5.3 },
    },
    insight: {
      title: 'Acima da Média, Abaixo da Meta',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'O IDEB de Contagem (5,4 nos anos finais) supera a média estadual (5,1), mas ainda não alcançou a meta nacional de 6,0 para o período.',
        'A queda na taxa de abandono (de 3,8% em 2019 para 2,1% em 2023) indica melhoria na retenção escolar, resultado possível de políticas de acompanhamento pós-pandemia.',
        'A distorção idade-série (14,2%) continua elevada e é fator de risco para abandono futuro — especialmente no Ensino Fundamental II.'
      ],
      evidence: [{ source: 'INEP (Demo)', dataset: 'Censo Escolar e SAEB', period: '2015-2023', lastUpdated: '2023', confidence: 'MÉDIA' }],
      confidence: 'MÉDIA',
    },
  },

  // ============================================================
  // CADERNO: INFRAESTRUTURA
  // ============================================================
  infrastructure: {
    mode: 'demo',
    executiveSummary: 'A cobertura de água encanada e coleta de lixo é quase universal em Contagem. O esgotamento sanitário ainda apresenta lacunas. A pavimentação urbana avançou, mas bairros periféricos ainda carecem de tratamento viário adequado.',
    waterCoverage: { value: '97,8%', label: 'Cobertura de água', trend: 'up', comparison: { mg: '88,4%', rmbh: '96,2%' } },
    sewageCoverage: { value: '82,4%', label: 'Esgotamento sanitário', trend: 'up', comparison: { mg: '74,2%', rmbh: '88,1%' } },
    garbageCollection: { value: '99,1%', label: 'Coleta de lixo', trend: 'stable', comparison: { mg: '92,3%', rmbh: '98,7%' } },
    pavement: { value: '78,5%', label: 'Ruas pavimentadas', trend: 'up', comparison: { mg: '65,2%', rmbh: '81,3%' } },
    streetLighting: { value: '94,2%', label: 'Iluminação pública', trend: 'stable' },
    internetCoverage: { value: '88,3%', label: 'Domicílios com internet', trend: 'up', comparison: { mg: '82,1%', rmbh: '89,4%' } },
    historicalWater: [
      { period: '2010', value: 91 }, { period: '2015', value: 94 }, { period: '2018', value: 96 },
      { period: '2020', value: 97 }, { period: '2022', value: 97.5 }, { period: '2024', value: 97.8 },
    ],
    historicalSewage: [
      { period: '2010', value: 68 }, { period: '2015', value: 72 }, { period: '2018', value: 76 },
      { period: '2020', value: 79 }, { period: '2022', value: 81 }, { period: '2024', value: 82.4 },
    ],
    infrastructureGap: [
      { area: 'Esgoto', covered: 82, gap: 18 },
      { area: 'Pavimentação', covered: 79, gap: 21 },
      { area: 'Internet', covered: 88, gap: 12 },
      { area: 'Iluminação', covered: 94, gap: 6 },
      { area: 'Água', covered: 98, gap: 2 },
    ],
    benchmarks: {
      water: { contagem: 97.8, rmbh: 96.2, mg: 88.4 },
      sewage: { contagem: 82.4, rmbh: 88.1, mg: 74.2 },
    },
    insight: {
      title: 'Gap de Esgotamento como Prioridade',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'O maior gap de infraestrutura está no esgotamento sanitário (17,6% sem cobertura). Considerando a densidade populacional, isso representa cerca de 110.000 pessoas sem saneamento adequado.',
        'A pavimentação de 78,5% é elevada para o porte, mas a concentração do déficit em bairros periféricos industriais cria vulnerabilidade de logística de último quilômetro.',
        'A conectividade digital (88,3%) está acima da média estadual, refletindo o perfil urbano-industrial do município e a presença de infraestrutura de telecomunicações para uso industrial.'
      ],
      evidence: [{ source: 'IBGE (Demo)', dataset: 'Censo Demográfico e SNIS', period: '2010-2024', lastUpdated: '2024', confidence: 'MÉDIA' }],
      confidence: 'MÉDIA',
    },
  },

  // ============================================================
  // CADERNO: MOBILIDADE
  // ============================================================
  mobility: {
    mode: 'demo',
    executiveSummary: 'Contagem é cruzada por eixos viários metropolitanos de alto fluxo. A frota cresceu acima da população. O fluxo pendular é intenso: mais de 120 mil trabalhadores entram ou saem do município diariamente.',
    fleet: { value: '312.400', label: 'Veículos registrados', trend: 'up', variation: '+18% em 5 anos' },
    motorizationRate: { value: '502', label: 'Veículos/1.000 hab', trend: 'up', comparison: { mg: '478', rmbh: '488' } },
    accidents: { value: '4.850', label: 'Acidentes de trânsito/ano', trend: 'down', variation: '-8% em 3 anos' },
    pendularFlow: { value: '124.000', label: 'Trabalhadores pendulares/dia', trend: 'up' },
    publicTransport: { value: '42 linhas', label: 'Linhas de ônibus urbano', trend: 'stable' },
    avgCommute: { value: '52 min', label: 'Tempo médio de deslocamento', trend: 'stable', comparison: { rmbh: '58 min', mg: '38 min' } },
    historicalFleet: [
      { period: '2018', value: 265000 }, { period: '2019', value: 272000 }, { period: '2020', value: 270000 },
      { period: '2021', value: 282000 }, { period: '2022', value: 295000 }, { period: '2023', value: 305000 },
      { period: '2024', value: 312400 },
    ],
    historicalAccidents: [
      { period: '2018', value: 5800 }, { period: '2019', value: 5600 }, { period: '2020', value: 4200 },
      { period: '2021', value: 5100 }, { period: '2022', value: 5300 }, { period: '2023', value: 5100 }, { period: '2024', value: 4850 },
    ],
    pendularInOut: [
      { direction: 'Entram (trabalhadores externos)', value: 68000 },
      { direction: 'Saem (trabalhadores residentes)', value: 56000 },
    ],
    strategicCorridors: [
      { name: 'BR-381 (Rio-BH)', status: 'CONGESTIONADO', flow: '120k veíc/dia' },
      { name: 'Av. João César de Oliveira', status: 'MODERADO', flow: '48k veíc/dia' },
      { name: 'Anel Rodoviário', status: 'INTENSO', flow: '95k veíc/dia' },
      { name: 'BR-262 (Oeste)', status: 'MODERADO', flow: '32k veíc/dia' },
    ],
    insight: {
      title: 'Mobilidade Pendular como Desafio Central',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'O fluxo pendular de 124 mil trabalhadores/dia é um dos maiores da RMBH, resultado direto do polo industrial que atrai mão de obra de toda a região.',
        'O crescimento da frota (+18% em 5 anos) acima do crescimento populacional (3,8% no mesmo período) indica aumento da dependência do transporte individual.',
        'A queda de acidentes (-8%) é positiva, mas pode ser parcialmente explicada pela redução de deslocamentos não essenciais durante e após a pandemia.'
      ],
      evidence: [{ source: 'DENATRAN (Demo)', dataset: 'Frota de Veículos', period: '2018-2024', lastUpdated: '2024', confidence: 'MÉDIA' }],
      confidence: 'MÉDIA',
    },
  },

  // ============================================================
  // CADERNO: DESENVOLVIMENTO SOCIAL
  // ============================================================
  socialDevelopment: {
    mode: 'demo',
    executiveSummary: 'Contagem apresenta perfil socioeconômico heterogêneo: coexistem áreas de alta renda industrial com bolsões de vulnerabilidade social nos bairros periféricos. O CadÚnico registra mais de 80 mil famílias.',
    povertyRate: { value: '12,4%', label: 'Taxa de pobreza', trend: 'down', comparison: { mg: '16,2%', rmbh: '10,8%' } },
    extremePovertyRate: { value: '3,8%', label: 'Extrema pobreza', trend: 'down', comparison: { mg: '5,4%', rmbh: '3,1%' } },
    cadUnico: { value: '82.400', label: 'Famílias no CadÚnico', trend: 'stable' },
    transfers: { value: 'R$ 145 Mi', label: 'Transferências sociais/ano', trend: 'up' },
    giniIndex: { value: '0,52', label: 'Índice de Gini', trend: 'stable', comparison: { mg: '0,54', rmbh: '0,50' } },
    socialVulnerability: { value: 'MODERADO', trend: 'stable' },
    historicalPoverty: [
      { period: '2010', value: 21.8 }, { period: '2015', value: 18.4 }, { period: '2018', value: 15.2 },
      { period: '2020', value: 16.8 }, { period: '2022', value: 13.1 }, { period: '2024', value: 12.4 },
    ],
    historicalCadUnico: [
      { period: '2018', value: 75000 }, { period: '2020', value: 89000 }, { period: '2022', value: 84000 },
      { period: '2023', value: 83000 }, { period: '2024', value: 82400 },
    ],
    incomeDistribution: [
      { bracket: 'Até 1 SM', percentage: 28 },
      { bracket: '1-2 SM', percentage: 34 },
      { bracket: '2-5 SM', percentage: 24 },
      { bracket: '5-10 SM', percentage: 9 },
      { bracket: '10+ SM', percentage: 5 },
    ],
    benchmarks: {
      poverty: { contagem: 12.4, rmbh: 10.8, mg: 16.2 },
      gini: { contagem: 0.52, rmbh: 0.50, mg: 0.54 },
    },
    insight: {
      title: 'Heterogeneidade Social Marcante',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'Contagem concentra tanto alta produção industrial quanto bolsões de pobreza. A coexistência de regiões de alta renda (próximas aos polos industriais) com periferias vulneráveis é o principal desafio de coesão social.',
        'O aumento do CadÚnico em 2020 (+18%) refletiu a pandemia; a redução gradual desde então indica recuperação econômica, mas o índice ainda está acima do nível pré-pandemia.',
        '62% das famílias vivem com até 2 salários mínimos — contexto que amplifica a sensibilidade eleitoral a temas de custo de vida, emprego e serviços públicos.'
      ],
      evidence: [{ source: 'MDS (Demo)', dataset: 'CadÚnico e SAGI', period: '2010-2024', lastUpdated: '2024', confidence: 'MÉDIA' }],
      confidence: 'MÉDIA',
    },
  },

  // ============================================================
  // CADERNO: FINANÇAS PÚBLICAS
  // ============================================================
  publicFinances: {
    mode: 'demo',
    executiveSummary: 'O orçamento municipal de Contagem é de R$ 3,2 Bi (2024). A receita própria (IPTU, ISS, taxas) responde por 42% das receitas totais, acima da média municipal brasileira. O município possui autonomia fiscal relevante para um município do porte.',
    revenue: { value: 'R$ 3,2 Bi', label: 'Receita total 2024', trend: 'up', variation: '+12% nominal vs 2023' },
    ownRevenue: { value: 'R$ 1,34 Bi', label: 'Receita própria (42%)', trend: 'up', comparison: { mg: '31%', rmbh: '38%' } },
    transfers: { value: 'R$ 1,86 Bi', label: 'Transferências (58%)', trend: 'stable' },
    expenditure: { value: 'R$ 3,0 Bi', label: 'Despesa total 2024', trend: 'up' },
    investment: { value: 'R$ 380 Mi', label: 'Investimentos (12,7%)', trend: 'up', comparison: { mg: '8,2%', rmbh: '10,4%' } },
    personnelExpenditure: { value: 'R$ 1,08 Bi', label: 'Pessoal e Encargos (36%)', trend: 'stable' },
    debt: { value: 'R$ 220 Mi', label: 'Dívida consolidada', trend: 'stable' },
    fiscalAutonomy: { value: '42%', label: 'Autonomia fiscal', trend: 'up', comparison: { mg: '31%' } },
    historicalRevenue: [
      { period: '2018', revenue: 2100, expenditure: 2050 },
      { period: '2019', revenue: 2280, expenditure: 2240 },
      { period: '2020', revenue: 2200, expenditure: 2300 },
      { period: '2021', revenue: 2500, expenditure: 2420 },
      { period: '2022', revenue: 2750, expenditure: 2680 },
      { period: '2023', revenue: 2850, expenditure: 2780 },
      { period: '2024', revenue: 3200, expenditure: 3000 },
    ],
    historicalInvestment: [
      { period: '2018', value: 210 }, { period: '2019', value: 240 }, { period: '2020', value: 195 },
      { period: '2021', value: 280 }, { period: '2022', value: 320 }, { period: '2023', value: 345 },
      { period: '2024', value: 380 },
    ],
    revenueComposition: [
      { source: 'IPTU', value: 480 },
      { source: 'ISS', value: 620 },
      { source: 'Outras Próprias', value: 240 },
      { source: 'FPM', value: 520 },
      { source: 'ICMS-VAF', value: 880 },
      { source: 'SUS/FUNDEB', value: 460 },
    ],
    expenditureComposition: [
      { area: 'Saúde', value: 870 },
      { area: 'Educação', value: 780 },
      { area: 'Administração', value: 450 },
      { area: 'Infraestrutura', value: 380 },
      { area: 'Assistência Social', value: 280 },
      { area: 'Outros', value: 240 },
    ],
    spendingByFunction: [
      { function: 'Saúde', value: 870, percentage: 29 },
      { function: 'Educação', value: 780, percentage: 26 },
      { function: 'Administração Geral', value: 450, percentage: 15 },
      { function: 'Infraestrutura Urbana', value: 380, percentage: 12.7 },
      { function: 'Assistência Social', value: 280, percentage: 9.3 },
      { function: 'Outros', value: 240, percentage: 8 },
    ],
    insight: {
      title: 'Finanças Saudáveis com Capacidade de Investimento',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'A autonomia fiscal de 42% é expressiva para um município do porte. Isso significa que Contagem depende menos de transferências federais que a média brasileira, conferindo maior estabilidade orçamentária.',
        'O investimento de R$ 380 Mi (12,7% da despesa) supera a média estadual (8,2%), indicando capacidade de expansão de obras e projetos públicos.',
        'O comprometimento de pessoal (36%) está abaixo do limite legal da LRF (60%), criando margem para compromissos futuros de contratação ou expansão de serviços.'
      ],
      evidence: [{ source: 'SICONFI (Demo)', dataset: 'Execução Orçamentária', period: '2018-2024', lastUpdated: '2024', confidence: 'ALTA' }],
      confidence: 'ALTA',
    },
  },

  territoryUrbanization: { mode: 'loading' },

  // ============================================================
  // CADERNO: AMBIENTE POLÍTICO
  // ============================================================
  politicalEnvironment: {
    mode: 'demo',
    executiveSummary: 'O ambiente institucional de Contagem é marcado por coalizões amplas no executivo e pluralismo no legislativo. A pauta municipal concentra-se em infraestrutura, emprego e segurança pública.',
    dominantThemes: ['Segurança Pública', 'Emprego', 'Saúde', 'Mobilidade', 'Infraestrutura'],
    recentEvents: [
      'Aprovação de incentivos fiscais para novas instalações industriais',
      'Debate sobre concessão de transporte coletivo',
      'Inauguração de nova UBS no setor norte',
    ],
    politicalRisks: [
      'Fragmentação partidária na câmara (4,2 partidos efetivos)',
      'Tensão entre agenda de desenvolvimento e demandas por serviços sociais',
    ],
    executiveName: 'Prefeito Demo (Demonstrativo)',
    executiveParty: 'Partido A (Demo)',
    executiveTerm: '2021-2024 / 2025-2028',
    chamberComposition: [
      { party: 'Partido A (Demo)', seats: 10, percentage: 25 },
      { party: 'Partido B (Demo)', seats: 8, percentage: 20 },
      { party: 'Partido C (Demo)', seats: 7, percentage: 17.5 },
      { party: 'Partido D (Demo)', seats: 6, percentage: 15 },
      { party: 'Outros', seats: 9, percentage: 22.5 },
    ],
    institutionalTimeline: [
      { year: '2020', event: 'Eleição municipal com menor comparecimento histórico', impact: 'Pandemia afetou dinâmica eleitoral' },
      { year: '2021', event: 'Início de nova gestão municipal', impact: 'Prioridade a saúde e recuperação econômica' },
      { year: '2022', event: 'Eleições gerais — alta polarização nacional', impact: 'Reflexos no debate local' },
      { year: '2023', event: 'Aprovação de pacote de infraestrutura urbana', impact: 'Investimento de R$ 320 Mi' },
      { year: '2024', event: 'Reeleição com margem de 15 p.p.', impact: 'Consolidação da base governista' },
    ],
    agendaPriorities: [
      'Expansão da rede de saúde (UBSs e especialidades)',
      'Programa de qualificação profissional para setor industrial',
      'Obras de mobilidade urbana: corredor de ônibus',
      'Habitação de interesse social em áreas periféricas',
    ],
    insight: {
      title: 'Governabilidade Consolidada, Pauta Técnica',
      type: 'INTERPRETAÇÃO',
      analysis: [
        'A reeleição com margem expressiva (15 p.p.) indica consolidação política, o que facilita a implementação de projetos de médio prazo.',
        'A câmara fragmentada (4,2 partidos efetivos) requer gestão constante de coalizão, mas a história recente mostra aprovação de pautas estratégicas (incentivos fiscais, infraestrutura).',
        'A agenda municipal é predominantemente técnica e orientada a serviços — não há evidência de polarização ideológica intensa no plano local.'
      ],
      evidence: [{ source: 'TSE / Câmara Municipal (Demo)', dataset: 'Resultado Eleitoral e Composição da Câmara', period: '2020-2024', lastUpdated: '2024', confidence: 'MÉDIA' }],
      confidence: 'MÉDIA',
    },
  },

  // ============================================================
  // CADERNO: RADAR TERRITORIAL
  // ============================================================
  radar: {
    mode: 'demo',
    executiveSummary: 'O radar territorial de Contagem registra 18 eventos relevantes nos últimos 90 dias. Os temas dominantes são Economia (expansão industrial) e Segurança (crimes patrimoniais). Não há eventos críticos em aberto.',
    events: [
      { id: 'e1', date: '2026-08-05', category: 'ECONOMIA', title: 'Polo industrial anuncia expansão com 1.200 vagas', summary: 'Empresa do setor metalmecânico confirmou ampliação da planta industrial, prevendo contratação de mão de obra especializada até o 1T 2027.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'ALTO', tags: ['Emprego', 'Indústria', 'Investimento'] },
      { id: 'e2', date: '2026-08-03', category: 'SEGURANÇA', title: 'Operação policial desmonta rede de receptação de veículos', summary: 'PMMG e PCMG realizaram operação integrada que apreendeu 38 veículos e prendeu 6 suspeitos vinculados a esquema de desmanche.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'ALTO', tags: ['Segurança', 'Veículos', 'Operação'] },
      { id: 'e3', date: '2026-07-29', category: 'SAÚDE', title: 'UPA registra superlotação: fila de espera supera 8h', summary: 'A UPA Norte registrou ocupação de 140% da capacidade instalada por 3 dias consecutivos. Prefeitura anunciou reforço de pessoal temporário.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'ALTO', tags: ['Saúde', 'UPA', 'Superlotação'] },
      { id: 'e4', date: '2026-07-22', category: 'MOBILIDADE', title: 'Obras de recapeamento BR-381 afetam trânsito metropolitano', summary: 'DNIT iniciou obras de recapeamento na BR-381 entre Contagem e Betim. Previsão de impacto até novembro/2026.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'MÉDIO', tags: ['Mobilidade', 'BR-381', 'Obras'] },
      { id: 'e5', date: '2026-07-18', category: 'POLÍTICA', title: 'Câmara aprova incentivo fiscal para empresas de tecnologia', summary: 'PL aprovado com 28 votos favoráveis cria zona de benefícios tributários para empresas de tecnologia que se instalarem no município.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'MÉDIO', tags: ['Política', 'Economia', 'Tecnologia'] },
      { id: 'e6', date: '2026-07-10', category: 'EDUCAÇÃO', title: 'Resultado SAEB 2025: Contagem supera média estadual', summary: 'Prefeitura divulga resultados do SAEB 2025. Contagem mantém desempenho acima da média de MG em Português e Matemática.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'MÉDIO', tags: ['Educação', 'SAEB', 'Resultado'] },
      { id: 'e7', date: '2026-07-05', category: 'INFRAESTRUTURA', title: 'Inauguração de nova UBS no Setor Norte', summary: 'Nova Unidade Básica de Saúde foi inaugurada no Bairro Industrial Norte, ampliando a cobertura ESF em mais 8.000 pessoas.', source: 'CONTEÚDO DEMONSTRATIVO', impact: 'MÉDIO', tags: ['Saúde', 'ESF', 'Infraestrutura'] },
    ],
    intensityByTheme: [
      { theme: 'Segurança', count: 5, avgImpact: 80 },
      { theme: 'Economia', count: 4, avgImpact: 75 },
      { theme: 'Saúde', count: 4, avgImpact: 85 },
      { theme: 'Mobilidade', count: 3, avgImpact: 65 },
      { theme: 'Política', count: 3, avgImpact: 60 },
      { theme: 'Educação', count: 2, avgImpact: 55 },
      { theme: 'Infraestrutura', count: 2, avgImpact: 60 },
    ],
    emergingSignals: [
      'Crescimento contínuo de estelionato digital — sem contrapartida de educação financeira municipal',
      'Expansão de condomínios logísticos gerando novos vetores de mobilidade pendular',
      'Pressão por ampliação de UTIs: questão que pode entrar na pauta eleitoral de 2028',
    ],
    insight: {
      title: 'Sinais Emergentes',
      type: 'HIPÓTESE',
      analysis: [
        'Os eventos das últimas semanas reforçam a hipótese de que Contagem vive uma tensão entre crescimento econômico (expansão industrial positiva) e qualidade de vida urbana (segurança, saúde, mobilidade).',
        'A operação policial contra receptação de veículos é um sinal positivo de resposta institucional, mas o volume de ocorrências sugere que o problema está além da capacidade da resposta pontual.',
        'A superlotação da UPA é o evento de maior impacto imediato para a população e o mais provável de gerar demanda política urgente.'
      ],
      evidence: [{ source: 'Monitoramento Demo', dataset: 'Radar Territorial (Demonstrativo)', period: 'Jul-Ago 2026', lastUpdated: '2026-08-05', confidence: 'BAIXA' }],
      confidence: 'BAIXA',
    },
  },

  // ============================================================
  // ANÁLISE INTEGRADA
  // ============================================================
  integratedAnalysis: {
    mode: 'demo',
    generatedAt: new Date().toISOString(),
    executiveSummary: [
      'Contagem é um dos territórios mais estratégicos de Minas Gerais. Com 621 mil habitantes, PIB de R$ 34,5 Bi e uma base industrial entre as maiores do estado, o município combina potencial econômico de primeira ordem com desafios urbanos significativos — segurança pública, saúde hospitalar e mobilidade.',
      'O mercado de trabalho formal apresenta saldo positivo (+3.000 vagas em 2024), puxado pela logística e serviços industriais. A remuneração média cresceu nominalmente, mas ainda não repõe a inflação do período.',
      'Na segurança pública, o dado mais preocupante é a ascensão dos crimes patrimoniais (+12% YoY), com destaque para furtos de veículos (+18%) e estelionato (+25%). Em contraste, os homicídios caíram -10%.',
      'A atenção básica de saúde avançou bem (cobertura ESF: 72,3%), mas o sistema hospitalar e de especialidades opera próximo ao limite — UTIs com pressão de demanda superior a 95%.',
      'O perfil eleitoral é pragmático e orientado a serviços. A última eleição resultou em reeleição com margem expressiva (15 p.p.), sinalizando mandato consolidado e espaço para projetos de médio prazo.',
      'O Dossiê a seguir apresenta a inteligência completa do território organizada por cadernos temáticos, com séries históricas, benchmarks e insights interpretativos gerados pelo Politix IA.',
    ],
    quickRead: {
      mood: 'ATENÇÃO MODERADA',
      pressure: 'Saúde Hospitalar e Furtos',
      asset: 'Polo Industrial e PIB',
      opportunity: 'Logística e Emprego Qualificado',
    },
    politicalImplications: {
      title: 'Implicações Estratégicas',
      paragraphs: [
        'A combinação de crescimento econômico com pressão sobre serviços públicos cria um eleitorado simultaneamente otimista (emprego) e exigente (saúde, segurança).',
        'Quem dominar a narrativa de segurança e saúde sem comprometer a pauta econômica terá vantagem estrutural no pleito de 2028.',
      ],
    },
    sections: [],
    sourcesCoverage: {
      ibge: 'real',
      security: 'real',
      health: 'demo',
      electoral: 'demo',
      economy: 'demo',
      news: 'demo',
    },
  },

  // ============================================================
  // BRIEFING EXECUTIVO
  // ============================================================
  aiRecommendation: {
    mode: 'demo',
    priorityTheme: {
      text: 'Segurança pública e saúde hospitalar',
      traceability: 'Maior presença temática no radar local. Ambos com tendência de agravamento nos últimos 12 meses.',
    },
    tractionMessages: [
      { text: 'Contagem gerou +3.000 empregos formais em 2024 — crescimento acima da média estadual.', traceability: 'CAGED 2024 (Demo)' },
      { text: 'A cobertura da Atenção Básica saltou de 55% para 72% nos últimos 6 anos.', traceability: 'DATASUS/ESF Demo' },
      { text: 'Os homicídios caíram 10% no último ano — menor índice desde 2015.', traceability: 'SEJUSP MG Demo' },
      { text: 'O PIB per capita de Contagem (R$ 55.400) supera a média da RMBH em 15%.', traceability: 'IBGE Contas Regionais Demo' },
      { text: 'A rede de UBS cresceu 18% desde 2020, com nova unidade inaugurada em julho.', traceability: 'Secretaria Municipal de Saúde Demo' },
    ],
    listenTo: [
      { text: 'Como a superlotação das UPAs está afetando o dia a dia dos moradores?', traceability: 'Sinal: Eventos de Saúde no Radar' },
      { text: 'O furto de veículos está sendo percebido como problema prioritário nas zonas industriais?', traceability: 'Sinal: Alta de 18% em furtos de veículos' },
      { text: 'Há percepção de melhora ou piora na segurança da região central?', traceability: 'Sinal: Crimes patrimoniais em alta' },
      { text: 'O tempo de deslocamento até o trabalho está aumentando?', traceability: 'Sinal: Crescimento de frota vs. capacidade viária' },
    ],
    avoidPitfalls: [
      { text: 'Evitar promessas sobre tempo de espera em especialidades médicas sem dados precisos do sistema.', traceability: 'Risco: Dado pode divergir por faixa de especialidade' },
      { text: 'Não classificar Contagem como "cidade violenta" com base apenas nos crimes patrimoniais — o índice de homicídios está abaixo da média regional.', traceability: 'SEJUSP MG Demo' },
      { text: 'Não usar dados de trânsito fora da BR-381 como representativos do município inteiro.', traceability: 'Sinal: perfis viários muito distintos' },
    ],
    powerfulQuestions: [
      { text: '"O que falta para Contagem se tornar o maior polo logístico do Centro-Oeste de MG?"' },
      { text: '"Quantas famílias de Contagem estão esperando há mais de 6 meses por uma consulta especializada?"' },
      { text: '"O crescimento industrial está chegando para quem mora nos bairros periféricos?"' },
      { text: '"Qual é o plano para o transporte coletivo nos próximos 4 anos?"' },
      { text: '"Como a cidade está se preparando para o envelhecimento da população?"' },
    ],
    agendaOpportunities: [
      { text: 'Visita a polo industrial em expansão — demonstrar compreensão da vocação econômica local', traceability: 'Ativo: Crescimento industrial' },
      { text: 'Reunião com lideranças sindicais e patronais sobre mercado de trabalho', traceability: 'Ativo: Saldo de empregos positivo' },
      { text: 'Audiência na UPA ou hospital municipal — mostrar escuta ativa sobre a pressão na saúde', traceability: 'Pressão: Superlotação hospitalar' },
      { text: 'Visita a nova UBS inaugurada — reforçar narrativa positiva de expansão da atenção básica', traceability: 'Ativo: Expansão ESF' },
    ],
  },
};
