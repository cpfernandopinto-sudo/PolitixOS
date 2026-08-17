/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TerritoriosClient from './TerritoriosClient';
import { createTerritoryBriefingRequest, getMunicipiosByUfAction } from '@/lib/actions/territories';
import { useRouter } from 'next/navigation';

vi.mock('@/lib/actions/territories', () => ({
  createTerritoryBriefingRequest: vi.fn(),
  getMunicipiosByUfAction: vi.fn().mockResolvedValue([]),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const mockGetMunicipiosAction = getMunicipiosByUfAction as unknown as ReturnType<typeof vi.fn>;
const mockCreateBriefing = createTerritoryBriefingRequest as unknown as ReturnType<typeof vi.fn>;
const mockUseRouter = useRouter as unknown as ReturnType<typeof vi.fn>;

describe('TerritoriosClient — Seleção Territorial sem Mock Automático', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
  });

  it('exibe estado inicial limpo e seletor de UF', () => {
    render(<TerritoriosClient initialUfs={['MG', 'SP']} />);
    expect(screen.getByText('Seleção do Território')).toBeInTheDocument();
    expect(screen.getByLabelText('UF')).toBeInTheDocument();
    expect(screen.queryByText('Briefing ainda não preparado')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar inteligência territorial|abrir briefing territorial/i })).not.toBeInTheDocument();
  });

  it('município sem dossiê pré-carregado: exibe estado neutro informativo "Briefing ainda não preparado" e habilita "Gerar Inteligência Territorial"', async () => {
    const list = [
      { id: 't2', codigo_ibge: '3156700', uf: 'MG', municipio: 'Sabará', regiao: null, geometria: null, metadata: {}, created_at: '', updated_at: '' },
    ];
    mockGetMunicipiosAction.mockResolvedValue(list);

    render(<TerritoriosClient initialUfs={['MG']} />);

    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'MG' } });
    
    const municipioInput = screen.getByRole('combobox', { name: /município/i });
    fireEvent.change(municipioInput, { target: { value: 'Sabará' } });
    
    const option = await screen.findByRole('option', { name: /Sabará/i });
    fireEvent.click(option);

    expect(screen.getByText('Briefing ainda não preparado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar inteligência territorial/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /abrir briefing territorial/i })).not.toBeInTheDocument();
  });

  it('cria a solicitação de briefing ao selecionar município sem dossiê e confirmar "Gerar Inteligência Territorial"', async () => {
    const list = [
      { id: 't3', codigo_ibge: '3156700', uf: 'MG', municipio: 'Sabará', regiao: null, geometria: null, metadata: {}, created_at: '', updated_at: '' },
    ];
    mockGetMunicipiosAction.mockResolvedValue(list);
    mockCreateBriefing.mockResolvedValue({
      success: true,
      briefing: { id: 'b1', territory_id: 't3', target_id: null, requested_by: 'u1', request_id: 'r1', status: 'nao_iniciado', content: null, model: null, prompt_version: null, generated_at: null, expires_at: null, error_message: null, created_at: '', updated_at: '' },
    });

    render(<TerritoriosClient initialUfs={['MG']} />);

    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'MG' } });
    
    const municipioInput = screen.getByRole('combobox', { name: /município/i });
    fireEvent.change(municipioInput, { target: { value: 'Sabará' } });
    
    const option = await screen.findByRole('option', { name: /Sabará/i });
    fireEvent.click(option);

    const button = screen.getByRole('button', { name: /gerar inteligência territorial/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(mockCreateBriefing).toHaveBeenCalledWith({ codigo_ibge: '3156700' });
    expect(await screen.findByText(/Preparando Inteligência Territorial/i)).toBeInTheDocument();
  });

  it('clica em "Abrir Briefing Territorial" e navega para o dossiê do município piloto', async () => {
    const list = [
      { id: 't1', codigo_ibge: '3118601', uf: 'MG', municipio: 'Contagem', regiao: null, geometria: null, metadata: {}, created_at: '', updated_at: '' },
    ];
    mockGetMunicipiosAction.mockResolvedValue(list);

    render(<TerritoriosClient initialUfs={['MG']} />);

    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'MG' } });
    
    const municipioInput = screen.getByRole('combobox', { name: /município/i });
    fireEvent.change(municipioInput, { target: { value: 'Contagem' } });
    
    const option = await screen.findByRole('option', { name: /Contagem/i });
    fireEvent.click(option);

    fireEvent.click(screen.getByRole('button', { name: /abrir briefing territorial/i }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/territorios/3118601');
  });
});
