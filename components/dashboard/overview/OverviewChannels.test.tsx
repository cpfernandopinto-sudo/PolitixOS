// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewChannels from './OverviewChannels';

// Captura a `option` passada ao ECharts sem renderizar Canvas real (jsdom
// não suporta a Canvas API) — mesmo padrão já usado em outros testes de
// gráfico deste projeto (ver PoliticalStatusCard.test.tsx).
interface RadarOption {
  radar: { indicator: Array<{ name: string }> };
  series: Array<{ data: Array<{ name: string; value: number[] }> }>;
}
let lastOption: RadarOption | null = null;
vi.mock('echarts-for-react', () => ({
  default: (props: { option: RadarOption }) => {
    lastOption = props.option;
    return null;
  },
}));

function getCapturedOption(): RadarOption {
  if (!lastOption) throw new Error('ECharts option não foi capturada — o componente não renderizou.');
  return lastOption;
}

const data = {
  noticias: { sentimento_medio: 0.1, risco_medio: 0.2, volume: 50 },
  instagram: { sentimento_medio: -0.1, risco_medio: 0.3, engajamento: 800, volume: 30 },
  x: { sentimento_medio: 0.2, risco_medio: 0.1, polarização: 0.4, volume: 20, posts: [] },
};

describe('OverviewChannels — radar (reintegração Sprint 6)', () => {
  it('não inclui dimensões fabricadas ("Alcance" ou "Polarização" para todos os canais)', () => {
    render(<OverviewChannels data={data} />);
    const indicatorNames = getCapturedOption().radar.indicator.map((i: { name: string }) => i.name);
    expect(indicatorNames).not.toContain('Alcance');
    expect(indicatorNames).not.toContain('Polarização');
  });

  it('usa apenas dimensões com dado real disponível para os três canais', () => {
    render(<OverviewChannels data={data} />);
    const indicatorNames = getCapturedOption().radar.indicator.map((i: { name: string }) => i.name);
    expect(indicatorNames).toEqual(['Sentimento', 'Risco', 'Volume/Engajamento']);
  });

  it('não recalcula os dados no client — usa exatamente os valores já preparados no servidor', () => {
    render(<OverviewChannels data={data} />);
    const series = getCapturedOption().series[0].data;
    expect(series[0].value[0]).toBe(data.noticias.sentimento_medio);
    expect(series[0].value[1]).toBe(data.noticias.risco_medio);
  });

  it('identifica claramente os três canais na legenda', () => {
    render(<OverviewChannels data={data} />);
    const names = getCapturedOption().series[0].data.map((d: { name: string }) => d.name);
    expect(names).toEqual(['Notícias', 'Instagram', 'X (Twitter)']);
  });

  it('explica o que o gráfico responde', () => {
    render(<OverviewChannels data={data} />);
    expect(screen.getByText(/Como cada canal contribui/)).toBeInTheDocument();
  });
});
