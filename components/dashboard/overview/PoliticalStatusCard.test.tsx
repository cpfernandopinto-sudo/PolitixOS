// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PoliticalStatusCard from './PoliticalStatusCard';
import { classifyPoliticalStatus } from '@/lib/analytics/political-status';

// jsdom não implementa a Canvas API que o ECharts precisa para pintar —
// o gauge em si já foi validado visualmente por screenshot real (Playwright,
// ver docs/screenshots/sprint-4/). Aqui testamos apenas o comportamento do
// card (classificação, fatores, drawer), não a renderização do gráfico.
vi.mock('echarts-for-react', () => ({ default: () => null }));

describe('PoliticalStatusCard', () => {
  it('exibe estado "Sem dados suficientes" quando semDados', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 0,
      volumeTotal: 0,
      criticalAlertCount: 0,
      highAlertCount: 0,
      predominantSentiment: null,
      predominantRisk: null,
      volumeTrend: null,
    });
    render(<PoliticalStatusCard status={status} />);
    expect(screen.getByText(/Dados insuficientes/i)).toBeInTheDocument();
  });

  it('exibe a classificação, o score e os fatores quando há dados', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 60,
      volumeTotal: 40,
      criticalAlertCount: 3,
      highAlertCount: 2,
      predominantSentiment: 'negativo',
      predominantRisk: 'alto',
      volumeTrend: { direcao: 'up', variacaoPercentual: 15 },
    });
    render(<PoliticalStatusCard status={status} />);
    expect(screen.getByText('Tensão elevada')).toBeInTheDocument();
    expect(screen.getByText(/3 alerta\(s\) crítico\(s\)/)).toBeInTheDocument();
  });

  it('abre o drawer "Entenda o cálculo" ao clicar e mostra a metodologia', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 30,
      volumeTotal: 10,
      criticalAlertCount: 0,
      highAlertCount: 0,
      predominantSentiment: 'neutro',
      predominantRisk: 'baixo',
      volumeTrend: null,
    });
    render(<PoliticalStatusCard status={status} />);
    expect(screen.queryByText('Como o Estado Político é calculado')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Entenda o cálculo' }));

    expect(screen.getByText('Como o Estado Político é calculado')).toBeInTheDocument();
    expect(screen.getByText(/Score > 75 → Crítico/)).toBeInTheDocument();
  });

  it('fecha o drawer ao pressionar Esc', () => {
    const status = classifyPoliticalStatus({
      crisisScore: 30,
      volumeTotal: 10,
      criticalAlertCount: 0,
      highAlertCount: 0,
      predominantSentiment: 'neutro',
      predominantRisk: 'baixo',
      volumeTrend: null,
    });
    render(<PoliticalStatusCard status={status} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entenda o cálculo' }));
    expect(screen.getByText('Como o Estado Político é calculado')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByText('Como o Estado Político é calculado')).not.toBeInTheDocument();
  });
});
