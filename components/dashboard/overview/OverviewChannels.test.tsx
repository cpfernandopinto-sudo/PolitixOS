// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverviewChannels from './OverviewChannels';

const data = {
  noticias: { sentimento_medio: 0.1, risco_medio: 0.2, volume: 50 },
  instagram: { sentimento_medio: -0.1, risco_medio: 0.3, engajamento: 800, volume: 30 },
  x: { sentimento_medio: 0.2, risco_medio: 0.1, polarização: 0.4, volume: 20, posts: [] },
  facebook: { sentimento_medio: 0, risco_medio: 0, engajamento: 0, volume: 0 },
};

describe('OverviewChannels — painel executivo (recuperação de UX)', () => {
  it('não inclui dimensões fabricadas ("Alcance" ou "Polarização") em lugar nenhum da tela', () => {
    render(<OverviewChannels data={data} />);
    expect(screen.queryByText(/Alcance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Polarização$/)).not.toBeInTheDocument();
  });

  it('identifica claramente os quatro canais', () => {
    render(<OverviewChannels data={data} />);
    expect(screen.getByText('Notícias')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('X (Twitter)')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('usa exatamente o volume já calculado no servidor, sem recalcular no client', () => {
    render(<OverviewChannels data={data} />);
    // total = 50 + 30 + 20 + 0 = 100 — percentuais batem exatamente com o volume de cada canal
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('· 50%')).toBeInTheDocument();
    expect(screen.getByText('· 30%')).toBeInTheDocument();
    expect(screen.getByText('· 20%')).toBeInTheDocument();
  });

  it('ordena do maior para o menor volume e destaca o canal dominante', () => {
    render(<OverviewChannels data={data} />);
    const names = screen.getAllByText(/^(Notícias|Instagram|X \(Twitter\)|Facebook)$/).map((el) => el.textContent);
    expect(names).toEqual(['Notícias', 'Instagram', 'X (Twitter)', 'Facebook']);
    expect(screen.getByText('Dominante')).toBeInTheDocument();
  });

  it('mostra o total consolidado como a soma real dos quatro canais', () => {
    render(<OverviewChannels data={data} />);
    expect(screen.getByText('100 itens')).toBeInTheDocument();
  });

  it('Facebook participa do total consolidado quando tem volume real', () => {
    const withFacebookVolume = { ...data, facebook: { sentimento_medio: 0.3, risco_medio: 0.1, engajamento: 500, volume: 10 } };
    render(<OverviewChannels data={withFacebookVolume} />);
    expect(screen.getByText('110 itens')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('explica o que o painel mostra', () => {
    render(<OverviewChannels data={data} />);
    expect(screen.getByText(/Volume, sentimento e risco por canal/)).toBeInTheDocument();
  });

  it('estado vazio é honesto quando não há volume em nenhum canal', () => {
    const empty = {
      noticias: { sentimento_medio: 0, risco_medio: 0, volume: 0 },
      instagram: { sentimento_medio: 0, risco_medio: 0, engajamento: 0, volume: 0 },
      x: { sentimento_medio: 0, risco_medio: 0, polarização: 0, volume: 0, posts: [] },
      facebook: { sentimento_medio: 0, risco_medio: 0, engajamento: 0, volume: 0 },
    };
    render(<OverviewChannels data={empty} />);
    expect(screen.getByText(/Nenhum item monitorado no período selecionado/)).toBeInTheDocument();
  });
});
