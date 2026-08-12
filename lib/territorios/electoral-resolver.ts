import type { ElectoralNotebook, TerritoryIndicator } from './types';

export type ElectoralFieldMode = 'REAL' | 'DEMO' | 'DERIVADO' | 'IA';

export interface ElectoralResolution {
  notebook: ElectoralNotebook;
  fieldModes: Record<string, ElectoralFieldMode>;
  realCoveragePercent: number;
  demoCoveragePercent: number;
}

export interface ElectoralRealBlock {
  electorate?: TerritoryIndicator;
  participation?: TerritoryIndicator;
  abstention?: TerritoryIndicator;
  validVotes?: TerritoryIndicator;
  blankVotes?: TerritoryIndicator;
  nullVotes?: TerritoryIndicator;
  historicalElectorate?: ElectoralNotebook['historicalElectorate'];
  historicalParticipation?: ElectoralNotebook['historicalParticipation'];
  historicalAbstention?: ElectoralNotebook['historicalAbstention'];
  candidateResults?: ElectoralNotebook['candidateResults'];
  topParties?: ElectoralNotebook['topParties'];
  margin?: ElectoralNotebook['margin'];
}

const FIELDS: (keyof ElectoralRealBlock)[] = ['electorate', 'participation', 'abstention', 'validVotes', 'blankVotes', 'nullVotes', 'historicalElectorate', 'historicalParticipation', 'historicalAbstention', 'candidateResults', 'topParties'];

export function resolveElectoralNotebook(demo: ElectoralNotebook, real: ElectoralRealBlock | null): ElectoralResolution {
  const hasAnyRealValue = FIELDS.some((field) => {
    const value = real?.[field];
    return value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0);
  });
  const notebook: ElectoralNotebook = { ...demo, mode: hasAnyRealValue ? 'real' : 'demo' };
  const fieldModes: Record<string, ElectoralFieldMode> = {};
  let realCount = 0;
  for (const field of FIELDS) {
    const value = real?.[field];
    const available = value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0);
    if (available) {
      Object.assign(notebook, { [field]: value });
      fieldModes[field] = 'REAL';
      realCount++;
    } else fieldModes[field] = 'DEMO';
  }
  if (real?.margin) {
    notebook.margin = real.margin;
    fieldModes.margin = 'DERIVADO';
  } else fieldModes.margin = 'DEMO';
  fieldModes.concentration = 'DEMO';
  fieldModes.fragmentation = 'DEMO';
  fieldModes.competitiveness = 'DEMO';
  return { notebook, fieldModes, realCoveragePercent: (realCount / FIELDS.length) * 100, demoCoveragePercent: ((FIELDS.length - realCount) / FIELDS.length) * 100 };
}
