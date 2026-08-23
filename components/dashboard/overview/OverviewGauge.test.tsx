// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewGauge from './OverviewGauge';

vi.mock('echarts-for-react', () => ({ default: () => null }));

describe('OverviewGauge — Termômetro de Crise Master (reintegração Sprint 6)', () => {
  const props = { score: 42, status: 'morno', breakdown: { noticias: 40, x: 45, instagram: 38, facebook: 20 } };

  it('renderiza o score consolidado e o breakdown por canal (pesos vindos da config única, lib/config/channel-weights.ts)', () => {
    render(<OverviewGauge {...props} />);
    expect(screen.getByText('Termômetro de Crise Master')).toBeInTheDocument();
    expect(screen.getByText('Notícias (45%)')).toBeInTheDocument();
    expect(screen.getByText('X/Twitter (27%)')).toBeInTheDocument();
    expect(screen.getByText('Instagram (18%)')).toBeInTheDocument();
    expect(screen.getByText('Facebook (10%)')).toBeInTheDocument();
  });

  it('explica a diferença em relação ao Estado Político (não é uma duplicidade confusa)', () => {
    render(<OverviewGauge {...props} />);
    expect(screen.getByText(/resumido no Estado Político/i)).toBeInTheDocument();
  });
});
