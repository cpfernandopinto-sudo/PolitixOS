// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PoliticalIntelligenceSummary from './PoliticalIntelligenceSummary';
import PoliticalSignalStack from './PoliticalSignalStack';
import EvidencePanel from './EvidencePanel';
import AnalysisCoveragePanel from './AnalysisCoveragePanel';
import TemporalCoveragePanel from './TemporalCoveragePanel';
import StrategicRecommendationCard from './StrategicRecommendationCard';
import TerritoryAgendaPanel from './TerritoryAgendaPanel';
import ExecutiveBriefing from './ExecutiveBriefing';
import IntelligenceExplicabilityPanel from './IntelligenceExplicabilityPanel';
import InterpretationCard, { ZeroInterpretationState } from './InterpretationCard';

describe('Political Intelligence Visual System — Unit Tests', () => {
  it('PoliticalIntelligenceSummary exibe síntese executiva e badges de confiança', () => {
    render(
      <PoliticalIntelligenceSummary
        headline="Síntese Executiva de Contagem"
        summaryParagraphs={['Parágrafo de diagnóstico 1.', 'Parágrafo de diagnóstico 2.']}
        coverageRatio="5 de 5 domínios"
        confidenceLevel="ALTA"
      />
    );

    expect(screen.getByText('Síntese Executiva de Contagem')).toBeInTheDocument();
    expect(screen.getByText('Parágrafo de diagnóstico 1.')).toBeInTheDocument();
    expect(screen.getByText('5 de 5 domínios')).toBeInTheDocument();
    expect(screen.getByText('ALTA')).toBeInTheDocument();
  });

  it('PoliticalSignalStack exibe pilha de sinais prioritários e aciona drawer de evidência', async () => {
    const user = userEvent.setup();
    const handleOpenEvidence = vi.fn();

    render(
      <PoliticalSignalStack
        signals={[
          {
            id: 'sig-1',
            category: 'atencao',
            priority: 'CRÍTICO',
            title: 'Sinal de Pressão Assistencial em Saúde',
            description: 'Taxa de ocupação de leitos superior a 88%.',
            domains: ['Saúde', 'Demografia'],
            evidenceText: 'CNES/DATASUS 2024.',
          },
        ]}
        onOpenEvidence={handleOpenEvidence}
      />
    );

    expect(screen.getByText('Sinal de Pressão Assistencial em Saúde')).toBeInTheDocument();
    expect(screen.getByText(/CRÍTICO/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Evidências Detalhadas/i));
    expect(handleOpenEvidence).toHaveBeenCalledTimes(1);
  });

  it('InterpretationCard exibe declaração L4, ressalvas e aciona rastreabilidade', async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();

    render(
      <InterpretationCard
        interpretation={{
          id: 'interp-1',
          statement: 'Elevada vulnerabilidade fiscal por dependência de repasses estaduais.',
          domains: ['ECONOMIA'],
          confidence: { label: 'Evidência Direta', level: 'ALTA', description: 'Sustentada por SICONFI' },
          originLabel: 'Provedor IA',
          modelProvenanceText: 'Provedor: OpenAI · Modelo: gpt-4o',
          basedOnSignalsCount: 2,
          evidenceRefs: ['ev-1', 'ev-2'],
          caveats: ['Ressalva de inflação não deflacionada.'],
        }}
        onOpenEvidence={handleOpen}
      />
    );

    expect(screen.getByText('Interpretação Analítica (L4)')).toBeInTheDocument();
    expect(screen.getByText('Elevada vulnerabilidade fiscal por dependência de repasses estaduais.')).toBeInTheDocument();
    expect(screen.getByText('ALTA CONFIANÇA')).toBeInTheDocument();
    expect(screen.getByText(/Ressalva de inflação/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Ver Rastreabilidade de Evidências/i));
    expect(handleOpen).toHaveBeenCalledWith(['ev-1', 'ev-2']);
  });

  it('InterpretationCard renderiza ZeroInterpretationState graciosamente quando lista é vazia', () => {
    render(<InterpretationCard interpretations={[]} />);

    expect(screen.getByText('Status da Camada de Interpretação (L4)')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma interpretação validada está disponível/i)).toBeInTheDocument();
  });

  it('StrategicRecommendationCard exibe ação proposta e atalho para evidências', async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();

    render(
      <StrategicRecommendationCard
        recommendation={{
          id: 'rec-1',
          title: 'Reestruturação da Rede Básica',
          action: 'Pactuar ampliação do tempo de atendimento nas UBSs.',
          rationale: 'Reduzir sobrecarga em UPAs centrais.',
          priority: 'ALTO',
          domains: ['Saúde'],
        }}
        onOpenEvidence={handleOpen}
      />
    );

    expect(screen.getByText('Reestruturação da Rede Básica')).toBeInTheDocument();
    expect(screen.getByText('Pactuar ampliação do tempo de atendimento nas UBSs.')).toBeInTheDocument();

    await user.click(screen.getByText('Ver Rastreabilidade de Evidências'));
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('EvidencePanel abre drawer de transparência e exibe métricas primárias', () => {
    const handleClose = vi.fn();
    render(
      <EvidencePanel
        isOpen={true}
        onClose={handleClose}
        title="Detalhe de Evidências"
        evidences={[
          {
            id: 'ev-test-1',
            evidenceHash: 'hash-test-123',
            label: 'Taxa de Ocorrências',
            value: '199,4',
            unit: 'por 100k',
            period: '2024',
            source: 'SEJUSP MG',
            domain: 'Segurança',
          },
        ]}
      />
    );

    expect(screen.getByText('Evidence Trace — Rastreabilidade PolitixOS')).toBeInTheDocument();
    expect(screen.getByText('199,4 por 100k')).toBeInTheDocument();
    expect(screen.getByText(/Fonte: SEJUSP MG/)).toBeInTheDocument();
  });

  it('AnalysisCoveragePanel e TemporalCoveragePanel exibem matrizes de transparência', () => {
    render(
      <div>
        <AnalysisCoveragePanel
          domains={[
            { domain: 'Demografia', status: 'DISPONIVEL', engineName: 'Motor IBGE' },
            { domain: 'Saúde', status: 'PARCIAL', engineName: 'Motor DATASUS' },
          ]}
        />
        <TemporalCoveragePanel
          temporalDomains={[
            { domain: 'Demografia', referenceYear: '2022-2024', source: 'IBGE' },
            { domain: 'Economia', referenceYear: '2023', source: 'IBGE', lagNote: 'Defasagem de 2 anos' },
          ]}
        />
      </div>
    );

    expect(screen.getByText('Motor IBGE')).toBeInTheDocument();
    expect(screen.getByText('Motor DATASUS')).toBeInTheDocument();
    expect(screen.getByText('Defasagem de 2 anos')).toBeInTheDocument();
  });

  it('TerritoryAgendaPanel renderiza pautas prioritárias e perguntas chave', () => {
    render(
      <TerritoryAgendaPanel
        municipioName="Contagem / MG"
        items={[
          {
            type: 'pauta_prioritaria',
            title: 'Expansão da Rede Hospitalar',
            detail: 'Abordar novos leitos de retaguarda.',
            sourceDomain: 'Saúde',
          },
        ]}
      />
    );

    expect(screen.getByText('Agenda de Inteligência para Visita Territorial')).toBeInTheDocument();
    expect(screen.getByText('Expansão da Rede Hospitalar')).toBeInTheDocument();
  });

  it('ExecutiveBriefing renderiza versão compacta de leitura rápida em 1 página', () => {
    render(
      <ExecutiveBriefing
        municipioName="Contagem / MG"
        synthesisHeadline="Síntese de Leitura Rápida"
        criticalSignals={[
          {
            id: 'sig-1',
            category: 'risco',
            priority: 'ALTO',
            title: 'Sinal de Risco em Segurança',
            description: 'Descrição de risco.',
            domains: ['Segurança'],
          },
        ]}
        topRecommendations={[
          {
            id: 'rec-1',
            title: 'Ação Recomendada em Campo',
            action: 'Instalar comitê comunitário.',
            rationale: 'Melhoria na percepção.',
            priority: 'ALTO',
            domains: ['Segurança'],
          },
        ]}
      />
    );

    expect(screen.getByText(/Briefing Executivo/i)).toBeInTheDocument();
    expect(screen.getByText('Síntese de Leitura Rápida')).toBeInTheDocument();
    expect(screen.getByText('Sinal de Risco em Segurança')).toBeInTheDocument();
  });

  it('IntelligenceExplicabilityPanel exibe transparência metodológica sem prompts', () => {
    render(
      <IntelligenceExplicabilityPanel
        sourcesCount={5}
        evidenceCount={14}
        coverageRatio="5 de 5 domínios"
      />
    );

    expect(screen.getByText(/chegamos a esta leitura/i)).toBeInTheDocument();
    expect(screen.getByText(/5 Fontes Oficiais/i)).toBeInTheDocument();
    expect(screen.getByText(/14 Métricas/i)).toBeInTheDocument();
  });
});
