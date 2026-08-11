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
  comparison?: { rmbh?: string; mg?: string; similar?: string };
  evidence?: EvidenceTrace;
}

export type InsightObservationType = 'FATO' | 'INTERPRETAÇÃO' | 'HIPÓTESE';

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
  ageGroupDistrib: Array<{ group: string; percentage: number }>;
}

export interface SecurityNotebook extends BaseNotebook {
  generalIndicator: TerritoryIndicator;
  monthlyEvolution: Array<{ period: string; value: number }>;
  topNatureRanking: Array<{ nature: string; count: number; variation: string; trend: 'up' | 'down' | 'stable' }>;
  strategicReading: string;
  violentCrimes?: TerritoryIndicator;
  propertyCrimes?: TerritoryIndicator;
}

export interface HealthNotebook extends BaseNotebook {
  basicCoverage: TerritoryIndicator;
  hospitalDemand: 'CRÍTICA' | 'ALTA' | 'MODERADA' | 'BAIXA';
  mainPressurePoints: string[];
  statusQualitative: string;
}

export interface ElectoralNotebook extends BaseNotebook {
  electorate: TerritoryIndicator;
  participation: TerritoryIndicator;
  abstention: TerritoryIndicator;
  historicalTrend: string;
  competitiveness?: string;
}

export interface EconomyNotebook extends BaseNotebook {
  mainActivity: string;
  employmentTrend: string;
  dependencyOnPublicServices: 'ALTA' | 'MODERADA' | 'BAIXA';
  predominantSectors: string[];
}

export interface EmploymentNotebook extends BaseNotebook {
  formalJobs?: TerritoryIndicator;
  unemploymentRate?: TerritoryIndicator;
  expandingSectors?: string[];
}

export interface EducationNotebook extends BaseNotebook {
  ideb?: TerritoryIndicator;
  municipalSchools?: TerritoryIndicator;
  enrollments?: TerritoryIndicator;
}

export interface InfrastructureNotebook extends BaseNotebook {
  waterCoverage?: TerritoryIndicator;
  sewageCoverage?: TerritoryIndicator;
}

export interface MobilityNotebook extends BaseNotebook {
  fleet?: TerritoryIndicator;
  motorizationRate?: TerritoryIndicator;
}

export interface SocialDevelopmentNotebook extends BaseNotebook {
  povertyRate?: TerritoryIndicator;
  cadUnico?: TerritoryIndicator;
}

export interface PublicFinancesNotebook extends BaseNotebook {
  revenue?: TerritoryIndicator;
  investmentCapacity?: TerritoryIndicator;
}

export interface TerritoryUrbanizationNotebook extends BaseNotebook {
  area?: string;
  urbanGrowth?: string;
}

export interface PoliticalEnvironmentNotebook extends BaseNotebook {
  dominantThemes: string[];
  recentEvents: string[];
  politicalRisks: string[];
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
  
  // Inteligência
  integratedAnalysis: IntegratedTerritoryAnalysis;
  aiRecommendation: AIRecommendationData;
}
