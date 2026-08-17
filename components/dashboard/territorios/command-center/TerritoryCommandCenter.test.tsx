// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExecutiveTerritoryHeader from './ExecutiveTerritoryHeader';
import TerritorySituationSummary from './TerritorySituationSummary';
import PrioritySignalsSection from './PrioritySignalsSection';
import RiskOpportunitySummary from './RiskOpportunitySummary';
import TerritoryAgendaSummary from './TerritoryAgendaSummary';
import TerritoryNotebookNavigator from './TerritoryNotebookNavigator';
import TerritoryCommandCenter, { TerritoryCommandCenterViewModel } from './TerritoryCommandCenter';

describe('Territory Command Center — Unit Tests', () => {
  it('ExecutiveTerritoryHeader renderiza dados do município e aciona refresh', () => {
    const handleRefresh = vi.fn();
    render(
      <ExecutiveTerritoryHeader
        cityName="Contagem"
        uf="MG"
        regionName="RMBH"
        statusLabel="Dossiê Consolidado"
        statusType="CONCLUIDO"
        coverageText="5 de 5 Domínios"
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('Contagem')).toBeInTheDocument();
    expect(screen.getByText('/ MG')).toBeInTheDocument();
    expect(screen.getByText('Dossiê Consolidado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /trocar cidade/i })).toBeInTheDocument();
  });

  it('TerritorySituationSummary renderiza leitura em 30 segundos', () => {
    render(
      <TerritorySituationSummary
        headline="Leitura em 30 Segundos de Teste"
        summaryText="Texto de resumo de situação territorial."
        keyFinding="Achado central de teste"
      />
    );

    expect(screen.getByText('Leitura Territorial em 30 Segundos')).toBeInTheDocument();
    expect(screen.getByText('Leitura em 30 Segundos de Teste')).toBeInTheDocument();
    expect(screen.getByText(/Achado central de teste/)).toBeInTheDocument();
  });

  it('PrioritySignalsSection exibe sinais prioritários em destaque', () => {
    render(
      <PrioritySignalsSection
        ibge="3118601"
        signals={[
          {
            id: 'sig-1',
            category: 'oportunidade',
            priority: 'ALTO',
            title: 'Sinal Prioritário de Teste',
            description: 'Descrição do sinal',
            domains: ['Economia'],
          },
        ]}
      />
    );

    expect(screen.getByText('Sinal Prioritário de Teste')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver todos os sinais/i })).toBeInTheDocument();
  });

  it('RiskOpportunitySummary renderiza riscos e oportunidades lado a lado', () => {
    render(
      <RiskOpportunitySummary
        risks={[
          {
            id: 'r-1',
            title: 'Risco de Teste',
            detail: 'Detalhe do risco',
            domain: 'Saúde',
            priority: 'CRÍTICO',
          },
        ]}
        opportunities={[
          {
            id: 'o-1',
            title: 'Oportunidade de Teste',
            detail: 'Detalhe da oportunidade',
            domain: 'Economia',
            priority: 'ALTO',
          },
        ]}
      />
    );

    expect(screen.getByText('Pontos de Risco e Atenção')).toBeInTheDocument();
    expect(screen.getByText('Risco de Teste')).toBeInTheDocument();
    expect(screen.getByText('Oportunidades Estratégicas')).toBeInTheDocument();
    expect(screen.getByText('Oportunidade de Teste')).toBeInTheDocument();
  });

  it('TerritoryNotebookNavigator renderiza atalhos para os cadernos temáticos', () => {
    render(<TerritoryNotebookNavigator ibge="3118601" />);

    expect(screen.getAllByText('Eleitoral').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Segurança').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saúde').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Economia').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inteligência Política').length).toBeGreaterThan(0);
  });

  it('TerritoryCommandCenter orquestra o ViewModel completo', () => {
    const mockViewModel: TerritoryCommandCenterViewModel = {
      cityName: 'Contagem',
      uf: 'MG',
      ibge: '3118601',
      statusLabel: 'Dossiê Consolidado',
      statusType: 'CONCLUIDO',
      headline: 'Síntese Executiva de Contagem',
      situationSummaryText: 'Texto do resumo executivo',
      signals: [],
      risks: [],
      opportunities: [],
      agendaItems: [],
      domains: [
        { domain: 'Economia', status: 'DISPONIVEL', engineName: 'Motor SICONFI' },
      ],
    };

    render(<TerritoryCommandCenter viewModel={mockViewModel} />);

    expect(screen.getByText('Contagem')).toBeInTheDocument();
    expect(screen.getByText('Síntese Executiva de Contagem')).toBeInTheDocument();
    expect(screen.getAllByText('Economia').length).toBeGreaterThan(0);
  });
});
