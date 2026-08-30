// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildInstagramUiContract } from '@/lib/instagram/ui-contract';
import InstagramIntelligenceDashboard from './InstagramIntelligenceDashboard';

vi.mock('@/components/charts/DonutChart', () => ({ default: () => <div data-testid="donut" /> }));
vi.mock('@/components/charts/LineChart', () => ({ default: () => <div data-testid="line-chart" /> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const post = {
  id: 'post-1', target_id: 'target-a', platform: 'instagram', caption: 'Prestação de contas', content_type: 'REEL', media_type: 'video', media_url: null,
  post_url: 'https://instagram.com/p/1', taken_at: '2026-08-20T12:00:00Z', collected_at: '2026-08-21T12:00:00Z', like_count: 25, comment_count: 4,
  raw_json: { product_type: 'clips', play_count: 100 },
};

describe('InstagramIntelligenceDashboard', () => {
  it('renderiza dados reais, indisponibilidade e abre/fecha o drawer por teclado', () => {
    const contract = buildInstagramUiContract({
      posts: [post], targetNames: new Map([['target-a', 'Candidata A']]),
      analyses: [{ content_id: 'post-1', sentiment: 'positivo', risk_level: 'alto', summary: 'Resumo', recommended_action: 'Responder', ai_topics: ['iluminação'] }],
      comments: [{ id: 'c1', instagram_comment_id: 'ig-1', post_id: 'post-1', comment_user: 'eleitor', comment_text: 'Comentário', like_count: 8, collected_at: '2026-08-21T11:00:00Z' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    expect(screen.getByText('25 likes')).toBeInTheDocument();
    expect(screen.getByText('Métricas desagregadas por formato; dados ausentes não são convertidos em zero')).toBeInTheDocument();
    expect(screen.getAllByText('iluminação')[0]).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('Análise de IA')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Responder')[0]).toBeInTheDocument();
    expect(screen.getByText('Data 20/08/2026')).toBeInTheDocument();
    expect(screen.getByText('Engajamento 29')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe a mesma recommended_action na tabela de prioridade, no drawer e na análise estratégica', () => {
    const contract = buildInstagramUiContract({
      posts: [post], comments: [], targetNames: new Map([['target-a', 'Candidata A']]),
      analyses: [{ content_id: 'post-1', sentiment: 'positivo', risk_level: 'alto', summary: 'Resumo executivo', recommended_action: 'Reforçar atendimento público' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    const matches = screen.getAllByText('Reforçar atendimento público');
    expect(matches.length).toBeGreaterThanOrEqual(2); // Priority table & Strategic table
    fireEvent.click(screen.getAllByText('Análise de IA')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Reforçar atendimento público').length).toBeGreaterThanOrEqual(3); // Drawer included
  });

  it('exibe ANÁLISE PENDENTE para posts sem análise e RECOMENDAÇÃO INDISPONÍVEL para análise sem recomendação', () => {
    const postSemAnalise = { ...post, id: 'post-sem-analise' };
    const postSemRecomendacao = { ...post, id: 'post-sem-rec' };
    const contract = buildInstagramUiContract({
      posts: [postSemAnalise, postSemRecomendacao],
      comments: [],
      analyses: [{ content_id: 'post-sem-rec', sentiment: 'neutro', risk_level: 'baixo', summary: 'Apenas resumo' }],
    });
    render(<InstagramIntelligenceDashboard contract={contract} />);
    expect(screen.getAllByText('ANÁLISE PENDENTE')[0]).toBeInTheDocument();
    expect(screen.getAllByText('RECOMENDAÇÃO INDISPONÍVEL')[0]).toBeInTheDocument();
  });

  it('mostra empty state sem fabricar indicadores', () => {
    render(<InstagramIntelligenceDashboard contract={buildInstagramUiContract({ posts: [], comments: [], analyses: [] })} />);
    expect(screen.getByText('Nenhuma publicação encontrada')).toBeInTheDocument();
  });

  it('renderiza a aba de Menções Externas com cards, KPIs isolados e abre o drawer externo', () => {
    const ownedContract = buildInstagramUiContract({ posts: [post], comments: [], analyses: [] });
    const externalContract = {
      kpis: {
        total: 1,
        positive: 1,
        positivePct: 100,
        negative: 0,
        negativePct: 0,
        highOrCriticalRisk: 0,
        highOrCriticalRiskPct: 0,
      },
      posts: [
        {
          id: 'ext-1',
          targetId: 'target-a',
          candidateName: 'Delegado Edson Moreira',
          author: { username: 'magrao_apresentador', fullName: 'Magrão' },
          discovery: {
            source: 'mention',
            label: 'Marcou o candidato',
            matchType: 'mention_of_target',
            matchTerm: 'delegadomoreira',
            explanation: 'Este perfil marcou diretamente o candidato (@delegadomoreira).',
          },
          contentType: 'REEL' as const,
          caption: 'Grande encontro com o Delegado Edson Moreira',
          publishedAt: '2026-08-28T12:00:00Z',
          collectedAt: '2026-08-28T13:00:00Z',
          url: 'https://instagram.com/p/ext1',
          mediaUrl: null,
          metrics: {
            likes: { value: 107, availability: 'AVAILABLE' as const, source: 'structured' as const },
            comments: { value: 5, availability: 'AVAILABLE' as const, source: 'structured' as const },
            views: { value: null, availability: 'UNAVAILABLE' as const, source: null },
          },
          analysis: {
            sentiment: 'positivo',
            risk: 'baixo',
            riskReason: 'Apoio explícito ao candidato.',
            themes: ['segurança pública'],
            summary: 'Apresentador Magrão apoia o delegado.',
            recommendedAction: 'Agradecer a menção nas redes.',
            confidence: 100,
            engagementQuality: { value: 'alto', availability: 'AVAILABLE' as const },
            polarizationLevel: { value: 'baixo', availability: 'AVAILABLE' as const },
          },
        },
      ],
      filterOptions: {
        formats: ['REEL' as const, 'IMAGE' as const, 'CAROUSEL' as const],
        risks: ['baixo'],
        sentiments: ['positivo'],
        origins: [{ value: 'mention', label: 'Marcou o candidato' }],
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      },
    };

    render(
      <InstagramIntelligenceDashboard
        contract={ownedContract}
        externalContract={externalContract}
        initialTab="owned"
      />
    );

    // Clica na aba de menções externas
    const externalTabButton = screen.getByRole('button', { name: /Menções Externas/i });
    fireEvent.click(externalTabButton);

    // Verifica se os dados de menções externas aparecem
    expect(screen.getByText('@magrao_apresentador')).toBeInTheDocument();
    expect(screen.getAllByText('Marcou o candidato')[0]).toBeInTheDocument();
    expect(screen.getByText('Grande encontro com o Delegado Edson Moreira')).toBeInTheDocument();
    expect(screen.getByText('107')).toBeInTheDocument();
    expect(screen.getByText('Agradecer a menção nas redes.')).toBeInTheDocument();

    // Abre o drawer externo
    fireEvent.click(screen.getByRole('button', { name: /Detalhes & IA/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Este perfil marcou diretamente o candidato (@delegadomoreira).')).toBeInTheDocument();
    expect(screen.getByText('Apoio explícito ao candidato.')).toBeInTheDocument();

    // Fecha o drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe empty state para menções externas quando a lista for vazia', () => {
    const ownedContract = buildInstagramUiContract({ posts: [post], comments: [], analyses: [] });
    const emptyExternal = {
      kpis: {
        total: 0,
        positive: 0,
        positivePct: 0,
        negative: 0,
        negativePct: 0,
        highOrCriticalRisk: 0,
        highOrCriticalRiskPct: 0,
      },
      posts: [],
      filterOptions: {
        formats: [],
        risks: [],
        sentiments: [],
        origins: [],
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      },
    };

    render(
      <InstagramIntelligenceDashboard
        contract={ownedContract}
        externalContract={emptyExternal}
        initialTab="external"
      />
    );

    expect(screen.getByText('Nenhuma menção externa relevante encontrada no período monitorado.')).toBeInTheDocument();
  });

  it('renderiza a Análise Estratégica consolidando OWNED e EXTERNAL com badges e abre os respectivos drawers', () => {
    const ownedPost = {
      ...post,
      id: 'post-owned-1',
      caption: 'Inauguração de obra própria',
      taken_at: '2026-08-20T12:00:00Z',
    };
    const ownedContract = buildInstagramUiContract({
      posts: [ownedPost],
      comments: [],
      targetNames: new Map([['target-a', 'Delegado Edson Moreira']]),
      analyses: [
        {
          content_id: 'post-owned-1',
          sentiment: 'positivo',
          risk_level: 'baixo',
          summary: 'Obra concluída',
          recommended_action: 'Divulgar nos stories',
          ai_topics: ['infraestrutura'],
        },
      ],
    });

    const externalContract = {
      kpis: {
        total: 1,
        positive: 1,
        positivePct: 100,
        negative: 0,
        negativePct: 0,
        highOrCriticalRisk: 0,
        highOrCriticalRiskPct: 0,
      },
      posts: [
        {
          id: 'post-ext-1',
          targetId: 'target-a',
          candidateName: 'Delegado Edson Moreira',
          author: { username: 'magrao_apresentador', fullName: 'Magrão' },
          discovery: {
            source: 'mention',
            label: 'Marcou o candidato',
            matchType: 'mention_of_target',
            matchTerm: 'delegadomoreira',
            explanation: 'Este perfil marcou diretamente o candidato (@delegadomoreira).',
          },
          contentType: 'REEL' as const,
          caption: 'Entrevista externa com Magrão',
          publishedAt: '2026-08-25T12:00:00Z', // Mais recente que o owned
          collectedAt: '2026-08-25T13:00:00Z',
          url: 'https://instagram.com/p/ext1',
          mediaUrl: null,
          metrics: {
            likes: { value: 100, availability: 'AVAILABLE' as const, source: 'structured' as const },
            comments: { value: 10, availability: 'AVAILABLE' as const, source: 'structured' as const },
            views: { value: null, availability: 'UNAVAILABLE' as const, source: null },
          },
          analysis: {
            sentiment: 'positivo',
            risk: 'baixo',
            riskReason: 'Apoio sem risco',
            themes: ['segurança pública'],
            summary: 'Podcast debate segurança',
            recommendedAction: 'Agradecer ao apresentador',
            confidence: 100,
            engagementQuality: { value: 'alto', availability: 'AVAILABLE' as const },
            polarizationLevel: { value: 'baixo', availability: 'AVAILABLE' as const },
          },
        },
      ],
      filterOptions: {
        formats: ['REEL' as const, 'IMAGE' as const, 'CAROUSEL' as const],
        risks: ['baixo'],
        sentiments: ['positivo'],
        origins: [{ value: 'mention', label: 'Marcou o candidato' }],
      },
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      },
    };

    render(
      <InstagramIntelligenceDashboard
        contract={ownedContract}
        externalContract={externalContract}
        initialTab="owned"
      />
    );

    // Verifica se os badges de Origem aparecem na tabela estratégica
    expect(screen.getByText('Próprio')).toBeInTheDocument();
    expect(screen.getByText('Externo')).toBeInTheDocument();

    // Verifica conteúdo e explicabilidade da linha EXTERNAL
    expect(screen.getByText('@magrao_apresentador')).toBeInTheDocument();
    expect(screen.getByText('Entrevista externa com Magrão')).toBeInTheDocument();
    expect(screen.getByText('Encontrado por: "Marcou o candidato"')).toBeInTheDocument();
    expect(screen.getByText('Agradecer ao apresentador')).toBeInTheDocument();

    // Verifica conteúdo da linha OWNED
    expect(screen.getAllByText('Inauguração de obra própria').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Divulgar nos stories').length).toBeGreaterThanOrEqual(1);

    // Clica em "Ver Detalhes" na linha EXTERNAL para abrir o Drawer de Menção Externa
    const detailButtons = screen.getAllByRole('button', { name: /Ver Detalhes/i });
    fireEvent.click(detailButtons[0]); // Mais recente = external (25/08)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Este perfil marcou diretamente o candidato (@delegadomoreira).')).toBeInTheDocument();

    // Fecha o drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});


