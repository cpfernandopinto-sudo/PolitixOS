// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DossierBreadcrumbs from '@/components/dashboard/territorios/DossierBreadcrumbs';
import DossierNotebookContainer from '@/components/dashboard/territorios/DossierNotebookContainer';
import { getTerritoryDossierContext, LEGACY_PRELOADED_IBGE } from '@/lib/territorios/dossier-helpers';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/territorios/3118601/demografia',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('DossierShell — DossierBreadcrumbs', () => {
  it('renderiza os breadcrumbs executivos corretamente com o contexto do município', () => {
    render(<DossierBreadcrumbs ibge="3118601" cityName="Contagem" uf="MG" />);

    expect(screen.getByText('Politix Territórios')).toBeInTheDocument();
    expect(screen.getByText('MG')).toBeInTheDocument();
    expect(screen.getByText('Contagem')).toBeInTheDocument();
    expect(screen.getByText('Demografia')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /trocar cidade/i })).toBeInTheDocument();
  });
});

describe('DossierShell — DossierNotebookContainer', () => {
  it('renderiza estado CONCLUIDO com conteúdo de filhos quando os dados estão consolidados', () => {
    render(
      <DossierNotebookContainer
        title="Demografia e Estrutura Social"
        description="Perfil da população"
        engineName="Motor IBGE"
        status="CONCLUIDO"
      >
        <div data-testid="notebook-content">Conteúdo Analítico Real</div>
      </DossierNotebookContainer>
    );

    expect(screen.getByText('Demografia e Estrutura Social')).toBeInTheDocument();
    expect(screen.getByText('Consolidado')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-content')).toBeInTheDocument();
  });

  it('renderiza card informativo neutro sem jargões técnicos para estado COLETA_NECESSARIA sem filhos', () => {
    render(
      <DossierNotebookContainer
        title="Economia & Finanças"
        description="Indicadores econômicos"
        engineName="Motor Economia"
        status="COLETA_NECESSARIA"
      />
    );

    expect(screen.getByText('Economia & Finanças')).toBeInTheDocument();
    expect(screen.getByText('Primeira análise necessária')).toBeInTheDocument();
    expect(screen.getByText('Caderno em Preparação')).toBeInTheDocument();
    expect(screen.queryByText(/cache/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/payload/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/requestId/i)).not.toBeInTheDocument();
  });
});

describe('DossierShell — Legacy Helpers', () => {
  it('retorna o dossiê pré-carregado apenas para Contagem (3118601)', () => {
    const contagem = getTerritoryDossierContext(LEGACY_PRELOADED_IBGE);
    expect(contagem).not.toBeNull();
    expect(contagem?.cityName).toBe('Contagem');

    const outro = getTerritoryDossierContext('3106200');
    expect(outro).toBeNull();
  });
});
