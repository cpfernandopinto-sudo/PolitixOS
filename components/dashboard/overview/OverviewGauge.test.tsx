// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewGauge from './OverviewGauge';

vi.mock('echarts-for-react', () => ({ default: () => null }));

describe('OverviewGauge — Termômetro de Crise Master (reintegração Sprint 6)', () => {
  const props = { score: 42, status: 'morno', breakdown: { noticias: 40, x: 45, instagram: 38 } };

  it('renderiza o score consolidado e o breakdown por canal (mesmos pesos preservados)', () => {
    render(<OverviewGauge {...props} />);
    expect(screen.getByText('Termômetro de Crise Master')).toBeInTheDocument();
    expect(screen.getByText('Notícias (50%)')).toBeInTheDocument();
    expect(screen.getByText('X/Twitter (30%)')).toBeInTheDocument();
    expect(screen.getByText('Instagram (20%)')).toBeInTheDocument();
  });

  it('explica a diferença em relação ao Estado Político (não é uma duplicidade confusa)', () => {
    render(<OverviewGauge {...props} />);
    expect(screen.getByText(/resumido no Estado Político/i)).toBeInTheDocument();
  });
});
