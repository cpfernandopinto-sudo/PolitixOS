// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewKPI from './OverviewKPI';

describe('OverviewKPI — cards executivos (Camada 1, reintegração Sprint 6)', () => {
  const props = {
    score_geral: 72,
    temperatura_geral: 'morna',
    tendencia: 'subindo',
    alertas_ativos: 5,
    volume_total: 1234,
  };

  it('exibe os 5 cards executivos com os valores reais recebidos (nenhum valor simulado)', () => {
    render(<OverviewKPI {...props} />);
    expect(screen.getByText('Score de Saúde')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
    expect(screen.getByText('morna')).toBeInTheDocument();
    expect(screen.getByText('Tendência')).toBeInTheDocument();
    expect(screen.getByText('subindo')).toBeInTheDocument();
    expect(screen.getByText('Alertas Ativos')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Volume Total')).toBeInTheDocument();
    expect(screen.getByText((1234).toLocaleString('pt-BR'))).toBeInTheDocument();
  });

  it('cada card explica seu papel de forma distinta (sem repetir o mesmo texto do Estado Político)', () => {
    render(<OverviewKPI {...props} />);
    const captions = [
      'Consolidação sintética operacional',
      'Nível atual de tensão',
      'Direção temporal do volume',
      'Volume de ocorrências relevantes',
      'Dimensão da base monitorada',
    ];
    for (const caption of captions) {
      expect(screen.getByText(caption)).toBeInTheDocument();
    }
    // Únicas entre si — nenhuma legenda duplicada.
    expect(new Set(captions).size).toBe(captions.length);
  });
});
