import React from 'react';
import TerritoryCommandCenter, { TerritoryCommandCenterViewModel } from '@/components/dashboard/territorios/command-center/TerritoryCommandCenter';
import type { EvidenceDetail } from '@/components/dashboard/territorios/intelligence/EvidencePanel';
import { getTerritoryByIbgeCode } from '@/lib/queries/territories';
import { createAdminClient } from '@/lib/supabaseClient';
import { getCagedMunicipalSeries } from '@/lib/territorios/caged/series-query';
import { loadElectoralNotebook } from '@/lib/territorios/tse-notebook-repository';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

export default async function DossierOverviewPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const territory = await getTerritoryByIbgeCode(ibge);

  const cityName = territory?.municipio ?? (ibge === '3118601' ? 'Contagem' : 'Território');
  const uf = territory?.uf ?? 'MG';
  const isMg = uf.toUpperCase() === 'MG';

  let popValue: string | null = null;
  let cagedBalance: number | null = null;
  let violentCrimes: number | null = null;
  let electoralDataPresent = false;
  let isDemo = false;

  if (territory) {
    const client = createAdminClient();

    // 1. Demografia Real
    const metaPop = territory.metadata?.populacao_2022 ?? territory.metadata?.populacao;
    if (metaPop) {
      popValue = Number(metaPop).toLocaleString('pt-BR');
    } else {
      try {
        const { data: popRows } = await client
          .from('territory_indicators')
          .select('valor')
          .eq('territory_id', territory.id)
          .eq('categoria', 'demografia')
          .ilike('indicador', '%populacao%')
          .maybeSingle();
        if (popRows?.valor) popValue = Number(popRows.valor).toLocaleString('pt-BR');
      } catch {}
    }

    // 2. Economia CAGED Real
    try {
      const caged = await getCagedMunicipalSeries(client, { territoryId: territory.id, from: '202401', to: '202606' });
      if (caged.points.length > 0) {
        const last12 = caged.points.slice(-12);
        cagedBalance = last12.reduce((acc, pt) => acc + pt.balance, 0);
      }
    } catch {}

    // 3. Segurança SEJUSP-MG Real
    if (isMg) {
      try {
        const { data: segRows } = await client
          .from('territory_indicators')
          .select('valor')
          .eq('territory_id', territory.id)
          .eq('categoria', 'seguranca_publica')
          .eq('fonte', 'SEJUSP-MG')
          .ilike('indicador', '%violento%')
          .limit(1);
        if (segRows && segRows.length > 0) {
          violentCrimes = Number(segRows[0].valor ?? 0);
        }
      } catch {}
    }

    // 4. Eleitoral TSE Real
    try {
      const resolvedElec = await loadElectoralNotebook(client, ibge, null);
      if (resolvedElec.notebook && resolvedElec.notebook.mode === 'real') {
        electoralDataPresent = true;
      }
    } catch {}
  }

  // Fallback ONLY for Contagem (3118601) with explicit DEMO label
  if (ibge === '3118601' && !cagedBalance && !popValue) {
    popValue = String(CONTAGEM_DEMO.demography?.population.value ?? '621.865');
    cagedBalance = (CONTAGEM_DEMO.economy as any)?.cagedBalance ?? 2420;
    violentCrimes = 199.4;
    electoralDataPresent = true;
    isDemo = true;
  }

  const hasAnyData = Boolean(popValue || cagedBalance !== null || violentCrimes !== null || electoralDataPresent);

  // Evidences List constructed from real available indicators using EvidenceDetail interface
  const evidences: EvidenceDetail[] = [];

  if (popValue) {
    evidences.push({
      id: `ev-pop-${ibge}`,
      evidenceHash: `hash-pop-${ibge}`,
      label: 'População Total Oficial',
      value: popValue,
      unit: 'hab',
      period: '2022',
      source: 'IBGE',
      domain: 'Demografia',
    });
  }

  if (cagedBalance !== null) {
    evidences.push({
      id: `ev-caged-${ibge}`,
      evidenceHash: `hash-caged-${ibge}`,
      label: 'Saldo do Emprego Formal (12m)',
      value: cagedBalance >= 0 ? `+${cagedBalance.toLocaleString('pt-BR')}` : cagedBalance.toLocaleString('pt-BR'),
      unit: 'vagas',
      period: '2025-2026',
      source: 'MTE / Novo CAGED',
      domain: 'Economia',
    });
  }

  if (violentCrimes !== null) {
    evidences.push({
      id: `ev-seg-${ibge}`,
      evidenceHash: `hash-seg-${ibge}`,
      label: 'Crimes Violentos (SEJUSP)',
      value: String(violentCrimes),
      unit: 'por 100k hab',
      period: '2024',
      source: 'SEJUSP-MG',
      domain: 'Segurança',
    });
  }

  const viewModel: TerritoryCommandCenterViewModel = {
    cityName,
    uf,
    ibge,
    regionName: uf === 'MG' ? 'Minas Gerais' : undefined,
    statusLabel: hasAnyData ? (isDemo ? 'Dossiê Demonstrativo (Contagem)' : 'Dossiê com Indicadores Oficiais') : 'Primeira Análise Necessária',
    statusType: hasAnyData ? (isDemo ? 'PARCIAL' : 'CONCLUIDO') : 'COLETA_NECESSARIA',
    headline: `Visão Geral Territorial: ${cityName} / ${uf}`,
    situationSummaryText: hasAnyData
      ? `O município de ${cityName} possui indicadores oficiais consolidados pelos motores territoriais (População, Emprego CAGED, SEJUSP e TSE).`
      : `Os indicadores do município de ${cityName} serão consolidados na primeira execução da análise territorial.`,
    keyFinding: hasAnyData
      ? `Indicadores primários oficiais disponíveis e acessíveis nos cadernos temáticos.`
      : `Aguardando consolidação de indicadores para o município.`,
    signals: isDemo ? [
      {
        id: 'sig-demo-1',
        category: 'oportunidade',
        priority: 'ALTO',
        title: 'Crescimento e Diversificação do Setor Produtivo (Demonstrativo)',
        description: 'Expansão continuada no segmento de comércio e serviços locais.',
        domains: ['Economia'],
        evidenceText: 'Crescimento no saldo de empregos formais (Fixture Contagem).',
        sourceNotebookHref: `/dashboard/territorios/${ibge}/economia`,
        sourceNotebookLabel: 'Abrir Caderno Economia',
      },
    ] : [],
    risks: [],
    opportunities: [],
    agendaItems: [],
    domains: [
      { domain: 'Demografia', status: popValue ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor IBGE' },
      { domain: 'Eleitoral', status: electoralDataPresent ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor TSE' },
      { domain: 'Segurança', status: violentCrimes !== null ? 'DISPONIVEL' : (isMg ? 'INDISPONIVEL' : 'INDISPONIVEL'), engineName: 'Motor SEJUSP-MG' },
      { domain: 'Economia', status: cagedBalance !== null ? 'DISPONIVEL' : 'INDISPONIVEL', engineName: 'Motor CAGED' },
    ],
    evidences,
  };

  return <TerritoryCommandCenter viewModel={viewModel} />;
}
