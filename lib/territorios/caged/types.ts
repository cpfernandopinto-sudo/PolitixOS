export type CagedSourceKind = 'MOV' | 'FOR' | 'EXC';

export interface CagedSourceVintage {
  kind: CagedSourceKind;
  declarationMonth: string;
  sourceUrl: string;
  sha256: string;
  sizeBytes: number;
  collectedAt: string;
  status: 'available' | 'processed' | 'failed';
  storagePath: string;
  storageProvider?: 'local' | 'supabase';
  storageBucket?: string | null;
  storageObjectKey?: string;
  layoutVersion: string | null;
  processedAt: string | null;
}

export interface CagedEventRecord {
  referenceMonth: string;
  cagedMunicipality: string;
  movementBalance: number;
}

export interface CagedEventEffect {
  referenceMonth: string;
  cagedMunicipality: string;
  admissionsDelta: number;
  dismissalsDelta: number;
  balanceDelta: number;
}

export interface CagedMunicipalAggregate {
  ibgeCode: string;
  cagedMunicipality: string;
  referenceMonth: string;
  admissions: number;
  dismissals: number;
  balance: number;
  rowsRead: number;
}

export type CagedOfficialSector = 'agropecuaria' | 'industria_geral' | 'construcao' | 'comercio' | 'servicos' | 'nao_classificado';

export interface CagedSectorAggregate extends CagedMunicipalAggregate {
  sector: CagedOfficialSector;
}

export interface CagedSectorSummary {
  methodVersion: string;
  mappingVersion: string;
  nationalTotals: Record<CagedOfficialSector, { admissions: number; dismissals: number; balance: number; rowsRead: number }>;
  aggregates: CagedSectorAggregate[];
}

export interface CagedParseSummary {
  kind: CagedSourceKind;
  rowsRead: number;
  rowsAccepted: number;
  rowsDiscarded: number;
  invalidMunicipalities: number;
  reservedMunicipalityEvents: number;
  unresolvedMunicipalityEvents: number;
  distinctUnresolvedMunicipalityCodes: string[];
  nationalTotals: { admissions: number; dismissals: number; balance: number };
  referenceMonthsTouched: string[];
  municipalitiesTouched: string[];
  aggregates: CagedMunicipalAggregate[];
  sectors: CagedSectorSummary;
  header: string[];
  layoutHash: string;
  elapsedMs: number;
  peakRssBytes: number;
}

export type CagedFailureStage = 'DISCOVERY' | 'DOWNLOAD' | 'HASH' | 'STORAGE' | 'EXTRACTION' | 'LAYOUT' | 'PARSE' | 'RECONCILIATION' | 'PERSISTENCE';
export interface CagedSourceFailure { kind: CagedSourceKind; code: string; message: string; stage: CagedFailureStage; }
