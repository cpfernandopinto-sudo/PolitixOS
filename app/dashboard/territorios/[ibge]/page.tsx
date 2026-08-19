import React from 'react';
import TerritoryCommandCenter, { type TerritoryCommandCenterViewModel } from '@/components/dashboard/territorios/command-center/TerritoryCommandCenter';
import type { ExecutiveKpiItem } from '@/components/dashboard/territorios/command-center/CommandCenterKpiStrip';
import type { EvidenceDetail } from '@/components/dashboard/territorios/intelligence/EvidencePanel';
import type { PrioritizedSignal } from '@/components/dashboard/territorios/intelligence/PoliticalSignalStack';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import type { DomainExecutiveSignal } from '@/lib/territorios/intelligence/command-center';
import type { Fact } from '@/lib/territorios/intelligence/contracts';
import { loadTerritoryIntelligenceRuntime } from '@/lib/territorios/intelligence/territory-runtime';

function factByKey(facts: Fact[], key: string): Fact | undefined {
  return facts.find((fact) => fact.key === key && fact.supported);
}

function numberValue(fact: Fact | undefined): number | null {
  const value = Number(fact?.value);
  return fact && Number.isFinite(value) ? value : null;
}

function executiveSignalToUi(signal: DomainExecutiveSignal, ibge: string): PrioritizedSignal | null {
  if (signal.status !== 'AVAILABLE' || !signal.signalId) return null;
  const domain = String(signal.domain);
  const notebook = domain === 'economia' ? 'economia' : domain === 'eleitoral' ? 'eleicoes' : 'seguranca';
  return {
    id: signal.signalId,
    category: signal.direction === 'RISING' ? 'tendencia' : signal.direction === 'FALLING' ? 'mudanca' : 'atencao',
    priority: signal.severity === 'HIGH' ? 'ALTO' : signal.severity === 'MODERATE' ? 'MÉDIO' : 'BAIXO',
    title: signal.headline,
    description: `Período ${signal.period ?? 'não informado'} · ${signal.evidenceRefs.length} evidência(s) oficial(is).`,
    domains: [domain],
    evidenceText: signal.evidenceRefs.join(' · '),
    sourceNotebookHref: `/dashboard/territorios/${ibge}/${notebook}`,
    sourceNotebookLabel: 'Abrir caderno de origem',
  };
}

export default async function DossierOverviewPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);
  const cityName = territory?.municipio ?? 'Território';
  const uf = territory?.uf ?? '—';
  if (!territory) {
    return <TerritoryCommandCenter viewModel={{ cityName, uf, ibge, statusLabel: 'Território não localizado', statusType: 'ERRO', headline: `Visão Geral Territorial: ${cityName}`, situationSummaryText: 'Não foi possível resolver o município solicitado.', signals: [], risks: [], opportunities: [], agendaItems: [], domains: [], evidences: [] }} />;
  }

  const runtime = await loadTerritoryIntelligenceRuntime(createAdminClient(), territory);
  const populationRaw = territory.metadata?.populacao_2022 ?? territory.metadata?.populacao;
  const population = Number(populationRaw);
  const rolling12 = numberValue(factByKey(runtime.economyFacts, 'rolling12'));
  const mom = numberValue(factByKey(runtime.economyFacts, 'mom_change'));
  const securityCurrent = numberValue(factByKey(runtime.securityFacts, 'current_value'));
  const securityDelta = numberValue(factByKey(runtime.securityFacts, 'delta'));
  const turnout = numberValue(factByKey(runtime.electoralFacts, 'turnout_rate'));
  const kpiStrip: ExecutiveKpiItem[] = [
    { id: 'kpi-pop', label: 'População Total', value: Number.isFinite(population) ? population.toLocaleString('pt-BR') : 'Indisponível', unit: Number.isFinite(population) ? 'habitantes' : undefined, period: 'Censo 2022 IBGE', domain: 'Demografia', status: Number.isFinite(population) ? 'real' : 'unavailable' },
    { id: 'kpi-caged', label: 'Saldo CAGED (12m)', value: rolling12 === null ? 'Indisponível' : `${rolling12 >= 0 ? '+' : ''}${rolling12.toLocaleString('pt-BR')}`, unit: rolling12 === null ? undefined : 'vínculos', period: factByKey(runtime.economyFacts, 'rolling12')?.period ?? 'Novo CAGED', domain: 'Economia', deltaText: mom === null ? undefined : `MoM: ${mom >= 0 ? '+' : ''}${mom.toLocaleString('pt-BR')}`, deltaDirection: mom === null ? undefined : mom > 0 ? 'up' : mom < 0 ? 'down' : 'neutral', status: rolling12 === null ? 'unavailable' : 'real' },
    { id: 'kpi-seg', label: 'Índice de Crimes Violentos', value: securityCurrent === null ? 'Indisponível' : securityCurrent.toLocaleString('pt-BR'), unit: securityCurrent === null ? undefined : 'ocorrências', period: factByKey(runtime.securityFacts, 'current_value')?.period ?? 'SEJUSP-MG', domain: 'Segurança', deltaText: securityDelta === null ? undefined : `Variação: ${securityDelta >= 0 ? '+' : ''}${securityDelta.toLocaleString('pt-BR')}`, deltaDirection: securityDelta === null ? undefined : securityDelta > 0 ? 'up' : securityDelta < 0 ? 'down' : 'neutral', status: securityCurrent === null ? 'unavailable' : 'real' },
    { id: 'kpi-elec', label: 'Comparecimento Eleitoral', value: turnout === null ? 'Indisponível' : `${turnout.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, unit: turnout === null ? undefined : 'do eleitorado apto', period: factByKey(runtime.electoralFacts, 'turnout_rate')?.period ?? 'TSE', domain: 'Eleitoral', status: turnout === null ? 'unavailable' : 'real' },
  ];
  const signals = [runtime.executiveSignals.economy, runtime.executiveSignals.electoral, runtime.executiveSignals.security].map((signal) => executiveSignalToUi(signal, ibge)).filter((signal): signal is PrioritizedSignal => signal !== null);
  const evidences: EvidenceDetail[] = Object.values(runtime.evidenceIndex).map((evidence) => ({ id: evidence.id, evidenceHash: evidence.evidenceHash, label: String(evidence.metadata.label ?? evidence.indicator), value: evidence.value === null ? '—' : String(evidence.value), unit: evidence.unit ?? undefined, period: evidence.period, source: evidence.source, dataset: evidence.dataset, domain: evidence.domain }));
  const risks = runtime.briefing.attention.filter((item) => item.category === 'RISK').map((item) => ({ id: item.signalId, title: item.headline, detail: `${item.evidenceRefs.length} evidência(s) · ${item.confidence ?? 'contexto limitado'}`, domain: String(item.domain), priority: 'ALTO' as const }));
  const opportunities = runtime.briefing.attention.filter((item) => item.category === 'OPPORTUNITY').map((item) => ({ id: item.signalId, title: item.headline, detail: `${item.evidenceRefs.length} evidência(s) · ${item.confidence ?? 'contexto limitado'}`, domain: String(item.domain), priority: 'ALTO' as const }));
  const available = [runtime.economyFacts, runtime.electoralFacts, runtime.securityFacts].filter((facts) => facts.some((fact) => fact.supported)).length;
  const viewModel: TerritoryCommandCenterViewModel = {
    cityName, uf, ibge, regionName: uf === 'MG' ? 'Minas Gerais' : undefined,
    statusLabel: available === 3 ? 'Dossiê com Indicadores Oficiais' : available > 0 ? 'Leitura Parcial de Domínios' : 'Primeira Análise Necessária',
    statusType: available === 3 ? 'CONCLUIDO' : available > 0 ? 'PARCIAL' : 'COLETA_NECESSARIA',
    headline: signals[0]?.title ?? `Visão Geral Territorial: ${cityName} / ${uf}`,
    situationSummaryText: signals.length ? `${signals.length} domínio(s) apresentam sinais analíticos ativos e rastreáveis.` : 'Não há sinal analítico ativo com evidência suficiente para este território.',
    keyFinding: signals[0]?.description, kpiStrip, signals, risks, opportunities,
    agendaItems: runtime.briefing.attention.filter((item) => item.category === 'MONITOR').map((item) => ({ type: 'ponto_atencao', title: item.headline, detail: item.evidenceRefs.join(' · '), sourceDomain: String(item.domain) })),
    domains: [
      { domain: 'Demografia', status: Number.isFinite(population) ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: runtime.electoralFacts.length ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor TSE' },
      { domain: 'Segurança', status: runtime.securityFacts.length ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor SEJUSP-MG' },
      { domain: 'Economia', status: runtime.economyFacts.length ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor CAGED' },
    ], evidences,
  };
  return <TerritoryCommandCenter viewModel={viewModel} />;
}
