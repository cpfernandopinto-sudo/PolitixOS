// lib/territorios/types.ts

export type DataSourceMode = 'real' | 'demo' | 'loading' | 'error' | 'unavailable';

export interface BaseSource {
  mode: DataSourceMode;
  lastUpdated?: string;
}

// ---------------------------------------------------------
// COMPONENTES BASE DE INTELIGÊNCIA
// ---------------------------------------------------------

export interface EvidenceTrace {
  source: string;
  dataset: string;
  period: string;
  lastUpdated: string;
  methodology?: string;
  confidence: 'ALTA' | 'MÉDIA' | 'BAIXA';
  indicatorUsed?: string;
  transformationApplied?: string;
}

export interface TerritoryIndicator {
  value: string | number;
  label?: string;
  trend?: 'up' | 'down' | 'stable';
  variation?: string;
  historicalSeries?: Array<{ period: string; value: number }>;
  comparison?: { rmbh?: string; mg?: string; similar?: string; contagem?: string };
  evidence?: EvidenceTrace;
}

export type InsightObservationType = 'FATO' | 'INTERPRETAÇÃO' | 'HIPÓTESE' | 'MÉTRICA DERIVADA';

export interface TerritoryTopicInsight {
  title: string;
  type: InsightObservationType;
  analysis: string[];
  evidence: EvidenceTrace[];
  confidence: 'ALTA' | 'MÉDIA' | 'BAIXA';
  confidenceReasoning?: string;
}

export interface BaseNotebook extends BaseSource {
  executiveSummary?: string;
  insight?: TerritoryTopicInsight;
}

// ---------------------------------------------------------
// CADERNOS TEMÁTICOS (NOTEBOOKS)
// ---------------------------------------------------------

export interface DemographyNotebook extends BaseNotebook {
  population: TerritoryIndicator;
  density: TerritoryIndicator;
  urbanization: TerritoryIndicator;
  ageGroupDistrib: Array<{ group: string; percentage: number, male: number, female: number }>;
  historicalPopulation: Array<{ period: string; value: number }>;
  intercensalGrowth?: string;
  agingIndex?: TerritoryIndicator;
  dependencyRatio?: TerritoryIndicator;
  medianAge?: TerritoryIndicator;
  benchmarks?: {
    population?: { contagem: number; rmbh: number; mg: number };
    density?: { contagem: number; rmbh: number; mg: number };
    agingIndex?: { contagem: number; rmbh: number; mg: number };
  };
}

export interface SecurityNotebook extends BaseNotebook {
  generalIndicator: TerritoryIndicator;
  monthlyEvolution: Array<{ period: string; value: number }>;
  historicalSeries: Array<{ period: string; violentos: number; patrimoniais: number; homicidios: number; roubos: number; furtos: number; veiculos: number }>;
  topNatureRanking: Array<{ nature: string; count: number; variation: string; trend: 'up' | 'down' | 'stable' }>;
  growingCrimes: Array<{ nature: string; count: number; variation: string }>;
  fallingCrimes: Array<{ nature: string; count: number; variation: string }>;
  strategicReading: string;
  violentCrimes?: TerritoryIndicator;
  propertyCrimes?: TerritoryIndicator;
  homicides?: TerritoryIndicator;
  thefts?: TerritoryIndicator;
  robberies?: TerritoryIndicator;
  vehicles?: TerritoryIndicator;
  seasonality?: Array<{ month: string; index: number }>;
  benchmarks?: {
    violentCrimesPer100k?: { contagem: number; rmbh: number; mg: number };
    homicidesPer100k?: { contagem: number; rmbh: number; mg: number };
  };
}

export interface HealthNotebook extends BaseNotebook {
  basicCoverage: TerritoryIndicator;
  historicalBasicCoverage: Array<{ period: string; value: number }>;
  establishments: number;
  ubs: number;
  hospitals: number;
  beds: TerritoryIndicator;
  historicalBeds: Array<{ period: string; value: number }>;
  utiBeds: TerritoryIndicator;
  doctors: TerritoryIndicator;
  historicalDoctors: Array<{ period: string; value: number }>;
  nurses: number;
  specialists: number;
  internations: TerritoryIndicator;
  historicalInternations: Array<{ period: string; value: number }>;
  topInternationCauses: Array<{ cause: string; value: number }>;
  mortality: TerritoryIndicator;
  historicalMortality: Array<{ period: string; value: number }>;
  vaccination?: TerritoryIndicator;
  capacityVsDemand: Array<{ category: string; capacity: number; demand: number }>;
  hospitalDemand: 'CRÍTICA' | 'ALTA' | 'MODERADA' | 'BAIXA';
  mainPressurePoints: string[];
  statusQualitative: string;
  benchmarks?: {
    doctorsPer10k?: { contagem: number; rmbh: number; mg: number };
    bedsPer1k?: { contagem: number; rmbh: number; mg: number };
    esfCoverage?: { contagem: number; rmbh: number; mg: number };
  };
}

export interface ElectoralNotebook extends BaseNotebook {
  electorate: TerritoryIndicator;
  historicalElectorate: Array<{ period: string; value: number }>;
  participation: TerritoryIndicator;
  historicalParticipation: Array<{ period: string; value: number }>;
  abstention: TerritoryIndicator;
  historicalAbstention: Array<{ period: string; value: number }>;
  validVotes?: TerritoryIndicator;
  blankVotes?: TerritoryIndicator;
  nullVotes?: TerritoryIndicator;
  margin?: TerritoryIndicator;
  concentration?: 'CONCENTRADO' | 'MODERADO' | 'FRAGMENTADO';
  fragmentation?: string;
  historicalTrend: string;
  competitiveness?: string;
  candidateResults: Array<{ name: string; party: string; votes: number; percentage: number }>;
  partyEvolution: Array<{ party: string; data: Array<{ period: string; votes: number }> }>;
  topParties?: Array<{ party: string; seats: number; percentage: number }>;
  whatChangedInElectorate?: string;
}

export interface EconomyNotebook extends BaseNotebook {
  mainActivity: string;
  employmentTrend: string;
  dependencyOnPublicServices: 'ALTA' | 'MODERADA' | 'BAIXA';
  predominantSectors: string[];
  gdp: TerritoryIndicator;
  gdpPerCapita: TerritoryIndicator;
  valueAdded: TerritoryIndicator;
  historicalGdp: Array<{ period: string; value: number }>;
  historicalGdpPerCapita: Array<{ period: string; value: number }>;
  sectorComposition: Array<{ sector: string; value: number }>;
  historicalSectorComposition: Array<{ period: string; industry: number; services: number; agro: number; public: number }>;
  benchmarks?: {
    gdpPerCapita?: { contagem: number; rmbh: number; mg: number };
    growthRate?: { contagem: string; rmbh: string; mg: string };
  };
}

export interface EmploymentNotebook extends BaseNotebook {
  formalJobs?: TerritoryIndicator;
  admissions?: number;
  dismissals?: number;
  balance?: TerritoryIndicator;
  averageSalary?: TerritoryIndicator;
  incomePerCapita?: TerritoryIndicator;
  monthlyBalance: Array<{ period: string; admissions: number; dismissals: number; balance: number }>;
  sectorBalance: Array<{ sector: string; balance: number }>;
  topHiringSector?: string;
  topFiringSector?: string;
  historicalSalary: Array<{ period: string; value: number }>;
  historicalFormalJobs?: Array<{ period: string; value: number }>;
  benchmarks?: {
    averageSalary?: { contagem: number; rmbh: number; mg: number };
  };
}

export interface EducationNotebook extends BaseNotebook {
  ideb?: TerritoryIndicator;
  municipalSchools?: TerritoryIndicator;
  enrollments?: TerritoryIndicator;
  idebElementary?: TerritoryIndicator;
  idebHighSchool?: TerritoryIndicator;
  enrollmentsByLevel?: Array<{ level: string; value: number }>;
  historicalIdeb?: Array<{ period: string; value: number; mg?: number }>;
  historicalEnrollments?: Array<{ period: string; value: number }>;
  approvalRate?: TerritoryIndicator;
  dropoutRate?: TerritoryIndicator;
  ageDistortionRate?: TerritoryIndicator;
  daycares?: number;
  publicSchools?: number;
  benchmarks?: {
    ideb?: { contagem: number; rmbh: number; mg: number; brazil: number };
  };
}

export interface InfrastructureNotebook extends BaseNotebook {
  waterCoverage?: TerritoryIndicator;
  sewageCoverage?: TerritoryIndicator;
  garbageCollection?: TerritoryIndicator;
  pavement?: TerritoryIndicator;
  streetLighting?: TerritoryIndicator;
  internetCoverage?: TerritoryIndicator;
  historicalWater?: Array<{ period: string; value: number }>;
  historicalSewage?: Array<{ period: string; value: number }>;
  infrastructureGap?: Array<{ area: string; covered: number; gap: number }>;
  benchmarks?: {
    water?: { contagem: number; rmbh: number; mg: number };
    sewage?: { contagem: number; rmbh: number; mg: number };
  };
}

export interface MobilityNotebook extends BaseNotebook {
  fleet?: TerritoryIndicator;
  motorizationRate?: TerritoryIndicator;
  accidents?: TerritoryIndicator;
  pendularFlow?: TerritoryIndicator;
  publicTransport?: TerritoryIndicator;
  avgCommute?: TerritoryIndicator;
  historicalFleet?: Array<{ period: string; value: number }>;
  historicalAccidents?: Array<{ period: string; value: number }>;
  pendularInOut?: Array<{ direction: string; value: number }>;
  strategicCorridors?: Array<{ name: string; status: string; flow: string }>;
}

export interface SocialDevelopmentNotebook extends BaseNotebook {
  povertyRate?: TerritoryIndicator;
  extremePovertyRate?: TerritoryIndicator;
  cadUnico?: TerritoryIndicator;
  transfers?: TerritoryIndicator;
  giniIndex?: TerritoryIndicator;
  socialVulnerability?: TerritoryIndicator;
  historicalPoverty?: Array<{ period: string; value: number }>;
  historicalCadUnico?: Array<{ period: string; value: number }>;
  incomeDistribution?: Array<{ bracket: string; percentage: number }>;
  benchmarks?: {
    poverty?: { contagem: number; rmbh: number; mg: number };
    gini?: { contagem: number; rmbh: number; mg: number };
  };
}

export interface PublicFinancesNotebook extends BaseNotebook {
  revenue?: TerritoryIndicator;
  ownRevenue?: TerritoryIndicator;
  transfers?: TerritoryIndicator;
  expenditure?: TerritoryIndicator;
  investment?: TerritoryIndicator;
  personnelExpenditure?: TerritoryIndicator;
  debt?: TerritoryIndicator;
  fiscalAutonomy?: TerritoryIndicator;
  historicalRevenue?: Array<{ period: string; revenue: number; expenditure: number }>;
  historicalInvestment?: Array<{ period: string; value: number }>;
  revenueComposition?: Array<{ source: string; value: number }>;
  expenditureComposition?: Array<{ area: string; value: number }>;
  spendingByFunction?: Array<{ function: string; value: number; percentage: number }>;
}

export interface TerritoryUrbanizationNotebook extends BaseNotebook {
  area?: string;
  urbanGrowth?: string;
}

export interface PoliticalEnvironmentNotebook extends BaseNotebook {
  dominantThemes: string[];
  recentEvents: string[];
  politicalRisks: string[];
  executiveName?: string;
  executiveParty?: string;
  executiveTerm?: string;
  chamberComposition?: Array<{ party: string; seats: number; percentage: number }>;
  institutionalTimeline?: Array<{ year: string; event: string; impact: string }>;
  agendaPriorities?: string[];
}

export interface RadarNotebook extends BaseNotebook {
  events?: Array<{
    id: string;
    date: string;
    category: string;
    title: string;
    summary: string;
    source: string;
    impact: 'ALTO' | 'MÉDIO' | 'BAIXO';
    tags: string[];
  }>;
  intensityByTheme?: Array<{ theme: string; count: number; avgImpact: number }>;
  emergingSignals?: string[];
}

// ---------------------------------------------------------
// COMPONENTES TRANSVERSAIS E VISÃO GERAL (COCKPIT)
// ---------------------------------------------------------

export interface TerritorySourcesCoverage {
  ibge: DataSourceMode;
  security: DataSourceMode;
  health: DataSourceMode;
  electoral: DataSourceMode;
  economy: DataSourceMode;
  news: DataSourceMode;
  [key: string]: DataSourceMode; // Extensível
}

export interface TerritoryDiagnostic extends BaseSource {
  diagnosis: string;
  primaryOpportunity: string;
  primaryRisk: string;
  politicalPriority: 'ALTA' | 'MODERADA' | 'BAIXA';
  attentionLevel: 'CRÍTICO' | 'ALTO' | 'MODERADO' | 'BAIXO';
  trend: 'ALTA' | 'ESTÁVEL' | 'BAIXA';
  whatChanged?: Array<{
    theme: string;
    trend: 'up' | 'down' | 'stable';
    description: string;
    period?: string;
  }>;
  improving?: string[];
  worsening?: string[];
}

export interface TerritoryKPIs extends BaseSource {
  population: string;
  analyzedIndicators: number;
  priority: string;
  generalRisk: string;
  securityStatus: string;
  healthStatus: string;
}

export interface ThemeRadarData extends BaseSource {
  themes: Array<{
    theme: string;
    intensity: number; // 0-100
    relevance: number; // 0-100
    presence: number; // 0-100
  }>;
}

export interface LocalRadarItem {
  id: string;
  title: string;
  source: string;
  date: string;
  theme: string;
  relevance: 'ALTA' | 'MÉDIA' | 'BAIXA';
}

export interface LocalRadarData extends BaseSource {
  items: LocalRadarItem[];
}

export interface RiskOpportunityItem {
  id: string;
  title: string;
  description: string;
  evidence: string;
  priority: 'ALTA' | 'MÉDIA' | 'BAIXA';
}

export interface RiskOpportunityBoardData extends BaseSource {
  risks: RiskOpportunityItem[];
  opportunities: RiskOpportunityItem[];
}

export interface FieldBriefingItem {
  text: string;
  traceability?: string;
}

export interface AIRecommendationData extends BaseSource {
  priorityTheme: FieldBriefingItem;
  listenTo: FieldBriefingItem[];
  avoidPitfalls: FieldBriefingItem[];
  powerfulQuestions: FieldBriefingItem[];
  tractionMessages: FieldBriefingItem[];
  agendaOpportunities: FieldBriefingItem[];
}

export interface IntegratedAnalysisVisualization {
  type: 'line' | 'bar' | 'comparison' | 'trend';
  metric: string;
  title: string;
  data: unknown; 
}

export interface IntegratedAnalysisInsight {
  text: string;
  evidence: string[];
  confidence?: 'ALTA' | 'MÉDIA' | 'BAIXA';
}

export interface IntegratedAnalysisSection {
  title: string;
  paragraphs: string[];
  insight?: IntegratedAnalysisInsight;
  visualization?: IntegratedAnalysisVisualization;
}

export interface IntegratedTerritoryAnalysis extends BaseSource {
  executiveSummary: string[];
  quickRead: {
    mood: string;
    pressure: string;
    asset: string;
    opportunity: string;
  };
  politicalImplications: {
    title: string;
    paragraphs: string[];
  };
  sections: IntegratedAnalysisSection[];
  sourcesCoverage: TerritorySourcesCoverage;
  generatedAt: string;
}

// ---------------------------------------------------------
// DOSSIÊ COMPLETO
// ---------------------------------------------------------

export interface TerritoryDossier {
  ibgeCode: string;
  cityName: string;
  uf: string;
  lastUpdated: string;
  coverage: TerritorySourcesCoverage;
  
  // Visão Geral
  diagnostic: TerritoryDiagnostic;
  kpis: TerritoryKPIs;
  themeRadar: ThemeRadarData;
  localRadar: LocalRadarData;
  riskOpportunities: RiskOpportunityBoardData;
  
  // Cadernos Temáticos
  demography: DemographyNotebook;
  security: SecurityNotebook;
  health: HealthNotebook;
  electoral: ElectoralNotebook;
  economy: EconomyNotebook;
  employment?: EmploymentNotebook;
  education?: EducationNotebook;
  infrastructure?: InfrastructureNotebook;
  mobility?: MobilityNotebook;
  socialDevelopment?: SocialDevelopmentNotebook;
  publicFinances?: PublicFinancesNotebook;
  territoryUrbanization?: TerritoryUrbanizationNotebook;
  politicalEnvironment?: PoliticalEnvironmentNotebook;
  radar?: RadarNotebook;
  
  // Inteligência
  integratedAnalysis: IntegratedTerritoryAnalysis;
  aiRecommendation: AIRecommendationData;
}
