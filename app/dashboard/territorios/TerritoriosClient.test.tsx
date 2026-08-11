// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerritoriosClient from './TerritoriosClient';

const { mockCreateBriefing, mockGetMunicipios } = vi.hoisted(() => ({
  mockCreateBriefing: vi.fn(),
  mockGetMunicipios: vi.fn(),
}));

vi.mock('@/lib/actions/territories', () => ({
  createTerritoryBriefingRequest: mockCreateBriefing,
  getMunicipiosByUfAction: mockGetMunicipios,
}));

describe('TerritoriosClient — comportamento com base territorial vazia', () => {
  it('mostra o estado vazio profissional quando não há UFs carregadas, sem opções falsas', () => {
    render(<TerritoriosClient initialUfs={[]} />);

    expect(screen.getByText('Base territorial ainda não inicializada.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/UF/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar briefing/i })).not.toBeInTheDocument();
  });
});

describe('TerritoriosClient — base territorial com UFs disponíveis', () => {
  it('renderiza o seletor e mantém "Gerar Briefing" desabilitado até selecionar um município', () => {
    render(<TerritoriosClient initialUfs={['MG', 'SP']} />);

    expect(screen.queryByText('Base territorial ainda não inicializada.')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: /gerar briefing/i });
    expect(button).toBeDisabled();
  });

  it('cria a solicitação de briefing (status nao_iniciado) ao selecionar município e confirmar', async () => {
    mockGetMunicipios.mockResolvedValue([
      { id: 't1', codigo_ibge: '3118601', uf: 'MG', municipio: 'Contagem', regiao: null, geometria: null, metadata: {}, created_at: '', updated_at: '' },
    ]);
    mockCreateBriefing.mockResolvedValue({
      success: true,
      briefing: { id: 'b1', territory_id: 't1', target_id: null, requested_by: 'u1', request_id: 'r1', status: 'nao_iniciado', content: null, model: null, prompt_version: null, generated_at: null, expires_at: null, error_message: null, created_at: '', updated_at: '' },
    });

    const user = userEvent.setup();
    render(<TerritoriosClient initialUfs={['MG']} />);

    await user.selectOptions(screen.getByLabelText('UF'), 'MG');
    await screen.findByText('Contagem');
    await user.selectOptions(screen.getByLabelText('Município'), '3118601');

    const button = screen.getByRole('button', { name: /gerar briefing/i });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(mockCreateBriefing).toHaveBeenCalledWith({ codigo_ibge: '3118601' });
    expect(await screen.findByText('Não iniciado')).toBeInTheDocument();
  });
});
