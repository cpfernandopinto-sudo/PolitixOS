import type { ElectoralNotebook, TerritoryIndicator } from './types';

export type ElectoralFieldMode = 'REAL' | 'DEMO' | 'DERIVADO' | 'IA' | 'INDISPONIVEL';

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

const FIELDS: (keyof ElectoralRealBlock)[] = [
  'electorate',
  'participation',
  'abstention',
  'validVotes',
  'blankVotes',
  'nullVotes',
  'historicalElectorate',
  'historicalParticipation',
  'historicalAbstention',
  'candidateResults',
  'topParties',
];

export function resolveElectoralNotebook(
  demo: ElectoralNotebook | null | undefined,
  real: ElectoralRealBlock | null
): ElectoralResolution {
  const hasAnyRealValue = FIELDS.some((field) => {
    const value = real?.[field];
    return value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0);
  });

  const baseNotebook: Partial<ElectoralNotebook> = demo ? { ...demo } : {};
  const mode = hasAnyRealValue ? 'real' : demo ? 'demo' : 'no_data';
  const notebook: ElectoralNotebook = {
    ...baseNotebook,
    mode: mode as any,
  } as ElectoralNotebook;

  const fieldModes: Record<string, ElectoralFieldMode> = {};
  let realCount = 0;

  for (const field of FIELDS) {
    const value = real?.[field];
    const available = value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0);
    if (available) {
      Object.assign(notebook, { [field]: value });
      fieldModes[field] = 'REAL';
      realCount++;
    } else {
      fieldModes[field] = demo ? 'DEMO' : 'INDISPONIVEL';
    }
  }

  if (real?.margin) {
    notebook.margin = real.margin;
    fieldModes.margin = 'DERIVADO';
  } else {
    fieldModes.margin = demo ? 'DEMO' : 'INDISPONIVEL';
  }

  fieldModes.concentration = demo ? 'DEMO' : 'INDISPONIVEL';
  fieldModes.fragmentation = demo ? 'DEMO' : 'INDISPONIVEL';
  fieldModes.competitiveness = demo ? 'DEMO' : 'INDISPONIVEL';

  return {
    notebook,
    fieldModes,
    realCoveragePercent: (realCount / FIELDS.length) * 100,
    demoCoveragePercent: demo ? ((FIELDS.length - realCount) / FIELDS.length) * 100 : 0,
  };
}
