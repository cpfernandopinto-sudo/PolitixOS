import type { createAdminClient } from '@/lib/supabaseClient';
import { getCagedMunicipalSeries } from '../caged/series-query';
import {
  buildElectionTerritoryAnalysis,
  type ElectoralAnalyticsEvidence,
  type ElectoralAnalyticsIndicator,
} from '../electoral-analytics';
import { buildElectoralTerritoryIntelligence } from '../electoral-intelligence';
import { SECURITY_INDICATOR_CATALOG } from '../seguranca-analytics';
import { buildTerritoryExecutiveBriefing, type TerritoryExecutiveBriefing } from './briefing';
import { buildTerritoryExecutiveSignals, type TerritoryExecutiveSignals } from './command-center';
import type { AnalyticalSignal, Evidence, Fact } from './contracts';
import { buildCagedEmploymentSignals } from './economy/caged-employment-signals';
import { buildCagedFacts } from './economy/caged-facts';
import { buildElectoralFacts } from './electoral/electoral-facts';
import { buildElectoralAnalyticalSignals } from './electoral/electoral-signals';
import { buildTerritoryRadar, type RadarItem } from './radar';
import { buildSecurityFacts } from './security/security-facts';
import { buildSecurityCategoryShiftSignal, buildSecurityIndicatorSignals } from './security/security-signals';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface RuntimeTerritory {
  id: string;
  codigo_ibge: string;
  municipio: string;
  uf: string;
  metadata?: Record<string, unknown> | null;
}

export interface TerritoryIntelligenceRuntime {
  territoryId: string;
  facts: Fact[];
  signals: AnalyticalSignal[];
  evidenceIndex: Record<string, Evidence>;
  executiveSignals: TerritoryExecutiveSignals;
  briefing: TerritoryExecutiveBriefing;
  radar: RadarItem[];
  economyFacts: Fact[];
  electoralFacts: Fact[];
  securityFacts: Fact[];
}

interface IndicatorRow extends ElectoralAnalyticsIndicator {
  fonte?: string | null;
  metodologia?: string | null;
  collected_at?: string | null;
}

function evidenceFromFact(fact: Fact, source: string, dataset: string): Evidence[] {
  if (!fact.supported) return [];
  return fact.evidenceRefs.map((ref) => ({
    id: ref,
    territoryId: fact.territoryId,
    domain: fact.domain,
    indicator: fact.key,
    value: fact.value,
    unit: fact.unit,
    period: fact.period,
    source,
    dataset,
    evidenceHash: null,
    metadata: { factId: fact.id, label: fact.label },
  }));
}

function indexEvidence(items: Evidence[]): Record<string, Evidence> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

async function loadElectoral(client: AdminClient, territory: RuntimeTerritory) {
  const [{ data: indicatorRows }, { data: evidenceRows }] = await Promise.all([
    client
      .from('territory_indicators')
      .select('territory_id,indicador,valor,unidade,source_dataset,source_record_id,periodo_inicio,periodo_fim,metadata')
      .eq('territory_id', territory.id)
      .eq('categoria', 'eleicoes')
      .eq('fonte', 'TSE'),
    client
      .from('territory_evidence')
      .select('territory_id,source_hash,source_external_id')
      .eq('territory_id', territory.id)
      .eq('source_name', 'TSE'),
  ]);

  const rows = (indicatorRows ?? []) as IndicatorRow[];
  const evidence = (evidenceRows ?? []) as ElectoralAnalyticsEvidence[];
  if (rows.length === 0) return { facts: [] as Fact[], signals: [] as AnalyticalSignal[] };

  const analysis = buildElectionTerritoryAnalysis({
    id: territory.id,
    codigoIbge: territory.codigo_ibge,
    municipio: territory.municipio,
    uf: territory.uf,
  }, rows, evidence);
  const intelligence = buildElectoralTerritoryIntelligence(analysis, []);
  const facts = buildElectoralFacts(intelligence);
  return { facts, signals: buildElectoralAnalyticalSignals(territory.id, intelligence.signals, facts) };
}

async function loadSecurity(client: AdminClient, territory: RuntimeTerritory) {
  if (territory.uf.toUpperCase() !== 'MG') return { facts: [] as Fact[], signals: [] as AnalyticalSignal[] };
  const keys = SECURITY_INDICATOR_CATALOG.map((item) => item.indicatorKey);
  const { data } = await client
    .from('territory_indicators')
    .select('indicador,valor,periodo_inicio')
    .eq('territory_id', territory.id)
    .eq('categoria', 'seguranca_publica')
    .eq('fonte', 'SEJUSP-MG')
    .in('indicador', keys)
    .order('periodo_inicio', { ascending: true });

  const grouped = new Map<string, Array<{ period: string; value: number }>>();
  for (const row of data ?? []) {
    const key = String(row.indicador ?? '');
    const period = String(row.periodo_inicio ?? '').slice(0, 10);
    const value = Number(row.valor);
    if (!keys.includes(key) || !period || !Number.isFinite(value)) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), { period, value }]);
  }

  const series = SECURITY_INDICATOR_CATALOG.flatMap((entry) => {
    const points = grouped.get(entry.indicatorKey) ?? [];
    return points.length ? [{ indicatorKey: entry.indicatorKey, label: entry.label, points }] : [];
  });
  const indexSeries = series.find((item) => item.indicatorKey === 'indice_crimes_violentos');
  if (!indexSeries) return { facts: [] as Fact[], signals: [] as AnalyticalSignal[] };
  const peerSeries = series.filter((item) => item.indicatorKey !== 'indice_crimes_violentos');
  const facts = buildSecurityFacts(territory.id, indexSeries.indicatorKey, indexSeries.label, indexSeries.points, { peerSeries });
  const signals = [
    ...buildSecurityIndicatorSignals(territory.id, indexSeries.label, facts),
    ...buildSecurityCategoryShiftSignal(territory.id, facts),
  ];
  return { facts, signals };
}

export async function loadTerritoryIntelligenceRuntime(
  client: AdminClient,
  territory: RuntimeTerritory
): Promise<TerritoryIntelligenceRuntime> {
  const [cagedResult, electoral, security] = await Promise.all([
    getCagedMunicipalSeries(client, { territoryId: territory.id, from: '202401', to: '202606' })
      .then((series) => {
        const facts = buildCagedFacts(territory.id, series.points.map((point) => ({
          referenceMonth: point.referenceMonth,
          admissions: point.admissions,
          dismissals: point.dismissals,
          balance: point.balance,
          metadata: point.revisionMetadata,
        })));
        return { facts, signals: buildCagedEmploymentSignals(territory.id, facts) };
      })
      .catch(() => ({ facts: [] as Fact[], signals: [] as AnalyticalSignal[] })),
    loadElectoral(client, territory).catch(() => ({ facts: [] as Fact[], signals: [] as AnalyticalSignal[] })),
    loadSecurity(client, territory).catch(() => ({ facts: [] as Fact[], signals: [] as AnalyticalSignal[] })),
  ]);

  const facts = [...cagedResult.facts, ...electoral.facts, ...security.facts];
  const signals = [...cagedResult.signals, ...electoral.signals, ...security.signals];
  const executiveSignals = buildTerritoryExecutiveSignals(territory.id, {
    economySignals: cagedResult.signals,
    electoralSignals: electoral.signals,
    securitySignals: security.signals,
  });
  const briefing = buildTerritoryExecutiveBriefing(territory.id, facts, signals);
  const radar = buildTerritoryRadar(territory.id, signals);
  const evidence = [
    ...cagedResult.facts.flatMap((fact) => evidenceFromFact(fact, 'MTE / Novo CAGED', 'Novo CAGED')),
    ...electoral.facts.flatMap((fact) => evidenceFromFact(fact, 'Tribunal Superior Eleitoral', 'TSE')),
    ...security.facts.flatMap((fact) => evidenceFromFact(fact, 'SEJUSP-MG', 'Crimes Violentos')),
  ];

  return {
    territoryId: territory.id,
    facts,
    signals,
    evidenceIndex: indexEvidence(evidence),
    executiveSignals,
    briefing,
    radar,
    economyFacts: cagedResult.facts,
    electoralFacts: electoral.facts,
    securityFacts: security.facts,
  };
}
