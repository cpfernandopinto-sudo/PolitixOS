import { describe, it, expect } from 'vitest';
import {
  translateConfidence,
  toEvidenceDetail,
  toEvidenceDetailList,
  toDomainCoverageList,
  toTemporalCoverageList,
  toPoliticalSignalViewModel,
  toInterpretationViewModel,
  toCagedEmploymentViewModel,
  extractRisksAndOpportunities,
  toCommandCenterViewModel,
} from './frontend-adapters';
import {
  pocEvidence,
  pocSignal,
  pocInterpretation,
  pocImplication,
  pocRecommendation,
  pocEvidenceIndex,
  POC_TERRITORY_ID,
} from './poc-fixture';
import type { TerritorialPoliticalIntelligenceBriefing, Evidence, Interpretation } from './contracts';

describe('FRONT-03 / FRONT-04 — Frontend Adapters Unit Tests', () => {
  it('translateConfidence traduz de forma qualitativa sem inventar porcentagem', () => {
    expect(translateConfidence('DIRECTLY_SUPPORTED').level).toBe('ALTA');
    expect(translateConfidence('MULTI_SIGNAL_SUPPORTED').level).toBe('MÉDIA');
    expect(translateConfidence('LIMITED_CONTEXT').level).toBe('BAIXA');
    expect(translateConfidence(null).level).toBe('BAIXA');
  });

  it('toEvidenceDetail preserva id e evidenceHash de forma estruturada sem usar regex', () => {
    const detail = toEvidenceDetail(pocEvidence[0]);

    expect(detail.id).toBe(pocEvidence[0].id);
    expect(detail.evidenceHash).toBe(pocEvidence[0].evidenceHash);
    expect(detail.label).toContain('TRANSFERENCIAS');
    expect(detail.source).toBe('Tesouro/SICONFI');
    expect(detail.dataset).toBe('SICONFI_DCA');
    expect(detail.period).toBe('2025');
    // Description should not rely on embedding ID or regex patterns
    expect(detail.description ?? '').not.toContain('ID:');
  });

  it('toInterpretationViewModel adapta a camada L4 com statement, provenance e caveats', () => {
    const interpWithModel: Interpretation = {
      ...pocInterpretation,
      origin: 'model',
      modelProvenance: {
        provider: 'openai',
        model: 'gpt-4o',
        modelVersion: '2024-05-13',
        promptId: 'prompt-123',
        promptVersion: 'v1',
        generatedAt: '2026-08-16T12:00:00Z',
      },
    };

    const vm = toInterpretationViewModel(interpWithModel);

    expect(vm.id).toBe(pocInterpretation.id);
    expect(vm.statement).toBe(pocInterpretation.statement);
    expect(vm.confidence.level).toBe('ALTA');
    expect(vm.originLabel).toBe('Provedor IA');
    expect(vm.modelProvenanceText).toContain('openai');
    expect(vm.evidenceRefs).toEqual(pocInterpretation.evidenceRefs);
    expect(vm.caveats).toEqual(pocInterpretation.caveats);
  });

  it('toCagedEmploymentViewModel adapta 5 setores e sinaliza métricas pendentes', () => {
    const economyMock = {
      cagedAdmissions: 5000,
      cagedDismissals: 4000,
      cagedBalance: 1000,
      cagedPeriod: '2024 (12m)',
      cagedSectors: [
        { sector: 'Agropecuária', admissions: 100, dismissals: 50, balance: 50 },
        { sector: 'Indústria', admissions: 1500, dismissals: 1200, balance: 300 },
        { sector: 'Construção', admissions: 800, dismissals: 700, balance: 100 },
        { sector: 'Comércio', admissions: 1200, dismissals: 1100, balance: 100 },
        { sector: 'Serviços', admissions: 1400, dismissals: 950, balance: 450 },
      ],
    };

    const cagedVM = toCagedEmploymentViewModel(economyMock);

    expect(cagedVM.totalAdmissions).toBe(5000);
    expect(cagedVM.totalDismissals).toBe(4000);
    expect(cagedVM.totalBalance).toBe(1000);
    expect(cagedVM.sectors).toHaveLength(5);
    expect(cagedVM.sectors[0].sector).toBe('Agropecuária');
    expect(cagedVM.pendingMetrics).toHaveLength(3);
    expect(cagedVM.pendingMetrics[0].status).toBe('METHODOLOGY_PENDING');
  });

  it('duas evidencias com mesmo rótulo e IDs diferentes permanecem distintas', () => {
    const ev1: Evidence = {
      ...pocEvidence[0],
      id: 'evidence:1',
      indicator: 'pib_per_capita',
      evidenceHash: 'hash-1',
    };
    const ev2: Evidence = {
      ...pocEvidence[0],
      id: 'evidence:2',
      indicator: 'pib_per_capita',
      evidenceHash: 'hash-2',
    };

    const d1 = toEvidenceDetail(ev1);
    const d2 = toEvidenceDetail(ev2);

    expect(d1.id).toBe('evidence:1');
    expect(d2.id).toBe('evidence:2');
    expect(d1.label).toBe(d2.label);
    expect(d1.evidenceHash).not.toBe(d2.evidenceHash);
  });

  it('toEvidenceDetailList resolve lineage entre Signal.evidenceRefs e EvidenceDetail.id', () => {
    const details = toEvidenceDetailList(pocSignal.evidenceRefs, pocEvidenceIndex);

    expect(details).toHaveLength(2);
    expect(details[0].id).toBe(pocEvidence[0].id);
    expect(details[1].id).toBe(pocEvidence[1].id);
  });

  it('toDomainCoverageList mapeia a cobertura sem transformar em confidence', () => {
    const coverageList = toDomainCoverageList({
      byDomain: {
        demografia: 'available',
        eleitoral: 'available',
        seguranca: 'partial',
        saude: 'unavailable',
        economia: 'available',
      },
      domainsAvailable: 3,
      domainsExpected: 5,
      missingData: [],
    });

    expect(coverageList).toHaveLength(5);
    expect(coverageList.find((d) => d.domain === 'Demografia')?.status).toBe('DISPONIVEL');
    expect(coverageList.find((d) => d.domain === 'Segurança')?.status).toBe('PARCIAL');
    expect(coverageList.find((d) => d.domain === 'Saúde')?.status).toBe('INDISPONIVEL');
  });

  it('toTemporalCoverageList preserva períodos sem fingir simultaneidade', () => {
    const temporalList = toTemporalCoverageList({
      periodStart: '2022',
      periodEnd: '2025',
      referencePeriodLabel: '2022-2025',
      sourceReferencePeriods: {
        demografia: '2025',
        eleitoral: '2024',
        seguranca: '2024',
        saude: '2024',
        economia: '2023',
      },
    });

    expect(temporalList.find((t) => t.domain === 'Economia')?.referenceYear).toBe('2023');
    expect(temporalList.find((t) => t.domain === 'Demografia')?.referenceYear).toBe('2025');
  });

  it('toPoliticalSignalViewModel compõe o sinal com interpretações sem adulterar SignalType', () => {
    const signalVM = toPoliticalSignalViewModel(pocSignal, [pocInterpretation], [pocImplication]);

    expect(signalVM.id).toBe(pocSignal.id);
    expect(signalVM.title).toBe(pocSignal.title);
    expect(signalVM.category).toBe('atencao'); // PRESSURE mapped to atencao
    expect(signalVM.priority).toBe('MÉDIO');
  });

  it('extractRisksAndOpportunities classifica implicações em riscos vs oportunidades', () => {
    const { risks } = extractRisksAndOpportunities([pocImplication]);

    expect(risks).toHaveLength(1);
    expect(risks[0].domain).toBe('gestao');
    expect(risks[0].detail).toBe(pocImplication.statement);
  });

  it('toCommandCenterViewModel converte um Briefing Canônico completo para a UI', () => {
    const canonicalBriefing: TerritorialPoliticalIntelligenceBriefing = {
      schemaVersion: '1.0',
      id: 'briefing-poc-1',
      territoryId: POC_TERRITORY_ID,
      generatedAt: '2026-08-16T12:00:00Z',
      referenceDate: '2025-12-31',
      coverage: {
        byDomain: {
          demografia: 'available',
          eleitoral: 'available',
          seguranca: 'available',
          saude: 'available',
          economia: 'available',
        },
        domainsAvailable: 5,
        domainsExpected: 5,
        missingData: [],
      },
      temporalCoverage: {
        periodStart: '2024',
        periodEnd: '2025',
        referencePeriodLabel: '2024-2025',
        sourceReferencePeriods: {
          demografia: '2025',
          eleitoral: '2024',
          seguranca: '2025',
          saude: '2024',
          economia: '2025',
        },
      },
      freshnessStatus: 'fresh',
      executiveSummary: {
        headline: 'Panorama Fiscal de Teste',
        summary: ['Alta dependência de transferências correntes.'],
        keySignals: [pocSignal.id],
        risks: [pocImplication.id],
        opportunities: [],
        attentionPoints: [],
        coverage: {
          byDomain: {
            demografia: 'available',
            eleitoral: 'available',
            seguranca: 'available',
            saude: 'available',
            economia: 'available',
          },
          domainsAvailable: 5,
          domainsExpected: 5,
          missingData: [],
        },
        limitations: [],
      },
      signals: [pocSignal],
      crossDomainSignals: [],
      interpretations: [pocInterpretation],
      implications: [pocImplication],
      recommendations: [pocRecommendation],
      agenda: [
        {
          id: 'agenda-1',
          title: 'Pauta Fiscal de Teste',
          rationale: 'Reunião de acompanhamento fiscal.',
          basedOnRecommendations: [pocRecommendation.id],
          basedOnImplications: [pocImplication.id],
        },
      ],
      limitations: [],
      evidenceIndex: pocEvidenceIndex,
      methodology: { methodId: 'poc-method', methodVersion: 'v1', description: 'POC Fixture' },
      explainability: {
        evidenceRefs: [pocEvidence[0].id, pocEvidence[1].id],
        sourceRefs: ['SICONFI'],
        methodology: 'POC',
        coverage: {
          byDomain: {
            demografia: 'available',
            eleitoral: 'available',
            seguranca: 'available',
            saude: 'available',
            economia: 'available',
          },
          domainsAvailable: 5,
          domainsExpected: 5,
          missingData: [],
        },
        limitations: [],
      },
      reviewStatus: 'not_reviewed',
      guardrails: { mode: 'FAIL_CLOSED', assertionClassesUsed: ['FACT', 'SIGNAL', 'INTERPRETATION'] },
    };

    const vm = toCommandCenterViewModel(canonicalBriefing, 'Município Demonstrativo', 'MG');

    expect(vm.cityName).toBe('Município Demonstrativo');
    expect(vm.headline).toBe('Panorama Fiscal de Teste');
    expect(vm.signals).toHaveLength(1);
    expect(vm.risks).toHaveLength(1);
    expect(vm.evidences).toHaveLength(2);
    expect(vm.evidences?.[0]?.id).toBe(pocEvidence[0].id);
    expect(vm.domains).toHaveLength(5);
  });
});
