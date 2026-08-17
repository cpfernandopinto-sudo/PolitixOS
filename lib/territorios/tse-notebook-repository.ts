import type { createAdminClient } from '@/lib/supabaseClient';
import type { ElectoralNotebook, EvidenceTrace, TerritoryIndicator } from './types';
import { resolveElectoralNotebook, type ElectoralResolution, type ElectoralRealBlock } from './electoral-resolver';

type AdminClient = ReturnType<typeof createAdminClient>;

interface IndicatorRow {
  indicador: string;
  valor: number | string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  source_dataset: string | null;
  source_record_id: string | null;
  source_updated_at: string | null;
  collected_at: string;
  metodologia: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ElectoralNotebookResult extends ElectoralResolution {
  latestMunicipalYear: number | null;
}

function numeric(value: number | string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metaNumber(row: IndicatorRow, key: string): number {
  return numeric(row.metadata?.[key] as number | string | null);
}

function metaString(row: IndicatorRow, key: string): string {
  const value = row.metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function isMunicipalExecutive(row: IndicatorRow): boolean {
  const round = metaNumber(row, 'turno') || metaNumber(row, 'round');
  const office = metaString(row, 'cargo') || metaString(row, 'office');
  return round === 1 && office.toLocaleLowerCase('pt-BR') === 'prefeito';
}

function evidence(row: IndicatorRow, transformationApplied?: string): EvidenceTrace {
  return {
    source: 'Tribunal Superior Eleitoral',
    dataset: row.source_dataset ?? 'TSE — Resultados',
    period: row.periodo_inicio?.slice(0, 4) ?? 'não informado',
    lastUpdated: row.source_updated_at ?? row.collected_at,
    methodology: row.metodologia ?? undefined,
    confidence: 'ALTA',
    indicatorUsed: row.indicador,
    transformationApplied,
  };
}

function totalRow(rows: IndicatorRow[], prefix: string, year: number): IndicatorRow | undefined {
  return rows.find((row) => row.indicador.startsWith(`${prefix}_${year}_`) && isMunicipalExecutive(row));
}

function percentIndicator(numerator: IndicatorRow, denominator: IndicatorRow, label: string): TerritoryIndicator {
  const total = numeric(denominator.valor);
  const percentage = total > 0 ? (numeric(numerator.valor) / total) * 100 : 0;
  return {
    value: `${percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
    label,
    evidence: evidence(numerator, `${numerator.indicador} ÷ ${denominator.indicador} × 100`),
  };
}

function latestYear(rows: IndicatorRow[]): number | null {
  const years = rows
    .filter((row) => row.indicador.startsWith('eleitorado_total_') && isMunicipalExecutive(row))
    .map((row) => metaNumber(row, 'ano') || metaNumber(row, 'year'))
    .filter(Boolean);
  return years.length ? Math.max(...years) : null;
}

export function buildElectoralRealBlock(rows: IndicatorRow[]): { block: ElectoralRealBlock; latestYear: number | null } {
  const year = latestYear(rows);
  if (!year) return { block: {}, latestYear: null };

  const electorate = totalRow(rows, 'eleitorado_total', year);
  const turnout = totalRow(rows, 'comparecimento_total', year);
  const abstention = totalRow(rows, 'abstencao_total', year);
  const valid = totalRow(rows, 'votos_validos_total', year);
  const blank = totalRow(rows, 'votos_brancos_total', year);
  const nullVotes = totalRow(rows, 'votos_nulos_total', year);
  const block: ElectoralRealBlock = {};

  if (electorate) {
    block.electorate = {
      value: numeric(electorate.valor).toLocaleString('pt-BR'),
      label: `eleitores aptos — eleição municipal de ${year}`,
      evidence: evidence(electorate),
    };
  }
  if (turnout && electorate) block.participation = percentIndicator(turnout, electorate, 'do eleitorado apto');
  if (abstention && electorate) block.abstention = percentIndicator(abstention, electorate, 'do eleitorado apto');
  if (valid && turnout) block.validVotes = percentIndicator(valid, turnout, 'do comparecimento total');
  if (blank && turnout) block.blankVotes = percentIndicator(blank, turnout, 'do comparecimento total');
  if (nullVotes && turnout) block.nullVotes = percentIndicator(nullVotes, turnout, 'do comparecimento total');

  const years = [...new Set(rows.filter((row) => row.indicador.startsWith('eleitorado_total_') && isMunicipalExecutive(row)).map((row) => metaNumber(row, 'ano') || metaNumber(row, 'year')))].sort();
  block.historicalElectorate = years.flatMap((itemYear) => {
    const row = totalRow(rows, 'eleitorado_total', itemYear);
    return row ? [{ period: String(itemYear), value: numeric(row.valor) }] : [];
  });
  block.historicalParticipation = years.flatMap((itemYear) => {
    const numerator = totalRow(rows, 'comparecimento_total', itemYear);
    const denominator = totalRow(rows, 'eleitorado_total', itemYear);
    return numerator && denominator && numeric(denominator.valor) > 0
      ? [{ period: String(itemYear), value: (numeric(numerator.valor) / numeric(denominator.valor)) * 100 }]
      : [];
  });
  block.historicalAbstention = years.flatMap((itemYear) => {
    const numerator = totalRow(rows, 'abstencao_total', itemYear);
    const denominator = totalRow(rows, 'eleitorado_total', itemYear);
    return numerator && denominator && numeric(denominator.valor) > 0
      ? [{ period: String(itemYear), value: (numeric(numerator.valor) / numeric(denominator.valor)) * 100 }]
      : [];
  });

  const candidates = rows
    .filter((row) => row.indicador.startsWith(`resultado_candidato_${year}_`) && isMunicipalExecutive(row))
    .map((row) => ({
      name: metaString(row, 'ballotName') || metaString(row, 'candidateName'),
      party: metaString(row, 'party'),
      votes: numeric(row.valor),
      percentage: metaNumber(row, 'percentage'),
    }))
    .filter((candidate) => candidate.name && candidate.votes > 0)
    .sort((a, b) => b.votes - a.votes);
  if (candidates.length) block.candidateResults = candidates;
  if (candidates.length >= 2) {
    const margin = candidates[0].percentage - candidates[1].percentage;
    const candidateRow = rows.find((row) => row.indicador.startsWith(`resultado_candidato_${year}_`) && isMunicipalExecutive(row));
    block.margin = {
      value: `${margin.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`,
      label: `diferença entre 1º e 2º — ${year}`,
      evidence: candidateRow ? evidence(candidateRow, 'percentual do 1º colocado − percentual do 2º colocado') : undefined,
    };
  }

  const electedCouncil = rows.filter((row) => {
    if (!row.indicador.startsWith(`resultado_candidato_${year}_`)) return false;
    const office = metaString(row, 'office').toLocaleLowerCase('pt-BR');
    const status = metaString(row, 'status').trim();
    return office === 'vereador' && /^ELEITO(?:$|\s)/i.test(status);
  });
  if (electedCouncil.length) {
    const seats = new Map<string, number>();
    for (const row of electedCouncil) {
      const party = metaString(row, 'party');
      if (party) seats.set(party, (seats.get(party) ?? 0) + 1);
    }
    block.topParties = [...seats.entries()]
      .map(([party, count]) => ({ party, seats: count, percentage: (count / electedCouncil.length) * 100 }))
      .sort((a, b) => b.seats - a.seats || a.party.localeCompare(b.party));
  }

  return { block, latestYear: year };
}

export async function loadElectoralNotebook(
  client: AdminClient,
  codigoIbge: string,
  demo?: ElectoralNotebook | null
): Promise<ElectoralNotebookResult> {
  const { data: territory, error: territoryError } = await client
    .from('territories')
    .select('id')
    .eq('codigo_ibge', codigoIbge)
    .maybeSingle();
  if (territoryError || !territory) return { ...resolveElectoralNotebook(demo, null), latestMunicipalYear: null };

  const { data, error } = await client
    .from('territory_indicators')
    .select('indicador, valor, periodo_inicio, periodo_fim, source_dataset, source_record_id, source_updated_at, collected_at, metodologia, metadata')
    .eq('territory_id', territory.id)
    .eq('categoria', 'eleicoes')
    .eq('fonte', 'TSE');
  if (error) return { ...resolveElectoralNotebook(demo, null), latestMunicipalYear: null };
  const { block, latestYear: referenceYear } = buildElectoralRealBlock((data ?? []) as IndicatorRow[]);
  return { ...resolveElectoralNotebook(demo, block), latestMunicipalYear: referenceYear };
}
