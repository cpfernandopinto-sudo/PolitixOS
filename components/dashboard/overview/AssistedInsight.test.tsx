// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssistedInsight from './AssistedInsight';
import type { AssistedInsightResult } from '@/lib/ai/analytics-schema';

const { mockGenerate } = vi.hoisted(() => ({ mockGenerate: vi.fn() }));
vi.mock('@/lib/actions/analytics-insight', () => ({
  generateExecutiveInsight: mockGenerate,
}));

function availableResult(overrides: Partial<NonNullable<AssistedInsightResult['output']>> = {}): AssistedInsightResult {
  return {
    status: 'disponivel',
    output: {
      resumo: 'Resumo do período monitorado.',
      pontosPrincipais: ['Ponto principal um'],
      riscosInterpretados: [{ texto: 'Risco interpretado de teste', evidenciaIds: ['risk-1'] }],
      oportunidadesInterpretadas: [],
      hipoteses: [{ texto: 'Hipótese não confirmada de teste', evidenciaIds: [] }],
      naoEpossivelConcluir: ['Não é possível concluir causalidade com os dados atuais.'],
      evidenciasCitadas: ['risk-1'],
      confianca: 'media',
      ...overrides,
    },
    contextHash: 'hash-1',
    generatedAt: new Date().toISOString(),
    model: 'claude-sonnet-5',
    promptVersion: 'v1',
    methodologyVersion: 'v1',
    error: null,
  };
}

describe('AssistedInsight', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it('estado inicial: mostra "Gerar leitura analítica" e não chama a action automaticamente', () => {
    render(<AssistedInsight candidate={null} period="all" />);
    expect(screen.getByRole('button', { name: /Gerar leitura analítica/ })).toBeInTheDocument();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('ao clicar, chama a action e exibe o resultado, diferenciando dado/interpretação/hipótese/limitação', async () => {
    mockGenerate.mockResolvedValueOnce(availableResult());
    render(<AssistedInsight candidate={null} period="all" />);

    fireEvent.click(screen.getByRole('button', { name: /Gerar leitura analítica/ }));

    await waitFor(() => expect(screen.getByText('Resumo do período monitorado.')).toBeInTheDocument());
    expect(mockGenerate).toHaveBeenCalledWith({ candidate: null, period: 'all', forceRefresh: false });

    // Dado (síntese) vs. interpretação vs. hipótese vs. limitação em seções distintas
    expect(screen.getByText('Riscos interpretados')).toBeInTheDocument();
    expect(screen.getByText('Risco interpretado de teste')).toBeInTheDocument();
    expect(screen.getByText(/Hipóteses/)).toBeInTheDocument();
    expect(screen.getByText('Hipótese não confirmada de teste')).toBeInTheDocument();
    expect(screen.getByText('O que ainda não é possível concluir')).toBeInTheDocument();
    expect(screen.getByText(/Não é possível concluir causalidade/)).toBeInTheDocument();
    expect(screen.getByText('Gerado por IA com base em dados monitorados')).toBeInTheDocument();
  });

  it('estado "gerando": mostra progresso discreto em vez de travar a tela', async () => {
    let resolvePromise: (value: AssistedInsightResult) => void = () => {};
    mockGenerate.mockReturnValueOnce(new Promise((resolve) => { resolvePromise = resolve; }));
    render(<AssistedInsight candidate={null} period="all" />);

    fireEvent.click(screen.getByRole('button', { name: /Gerar leitura analítica/ }));
    expect(await screen.findByText(/Organizando evidências e síntese/)).toBeInTheDocument();

    resolvePromise(availableResult());
    await waitFor(() => expect(screen.getByText('Resumo do período monitorado.')).toBeInTheDocument());
  });

  it('estado de erro: mensagem amigável e botão de tentar novamente, sem detalhe técnico para usuário comum', async () => {
    mockGenerate.mockResolvedValueOnce({
      status: 'erro',
      output: null,
      contextHash: 'h',
      generatedAt: null,
      model: null,
      promptVersion: 'v1',
      methodologyVersion: 'v1',
      error: 'timeout: ETIMEDOUT ao chamar o provedor',
    } satisfies AssistedInsightResult);

    render(<AssistedInsight candidate={null} period="all" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar leitura analítica/ }));

    await waitFor(() => expect(screen.getByText('Não foi possível gerar a leitura analítica agora.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument();
    expect(screen.queryByText(/ETIMEDOUT/)).not.toBeInTheDocument();
  });

  it('estado indisponível: explica o benefício, confirma que o resto funciona, e não expõe detalhe técnico para usuário comum', async () => {
    mockGenerate.mockResolvedValueOnce({
      status: 'indisponivel',
      output: null,
      contextHash: 'h',
      generatedAt: null,
      model: null,
      promptVersion: 'v1',
      methodologyVersion: 'v1',
      error: 'Provedor de IA não configurado neste ambiente (ANTHROPIC_API_KEY ausente).',
    } satisfies AssistedInsightResult);

    render(<AssistedInsight candidate={null} period="all" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar leitura analítica/ }));

    await waitFor(() => expect(screen.getByText(/ainda não está configurada neste ambiente/)).toBeInTheDocument());
    expect(screen.getByText(/O restante da Visão Geral continua funcionando normalmente/)).toBeInTheDocument();
    expect(screen.queryByText(/ANTHROPIC_API_KEY/)).not.toBeInTheDocument();
  });

  it('estado indisponível para admin: mostra o detalhe técnico em área secundária', async () => {
    mockGenerate.mockResolvedValueOnce({
      status: 'indisponivel',
      output: null,
      contextHash: 'h',
      generatedAt: null,
      model: null,
      promptVersion: 'v1',
      methodologyVersion: 'v1',
      error: 'Provedor de IA não configurado neste ambiente (ANTHROPIC_API_KEY ausente).',
    } satisfies AssistedInsightResult);

    render(<AssistedInsight candidate={null} period="all" isAdmin />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar leitura analítica/ }));

    await waitFor(() => expect(screen.getByText(/ANTHROPIC_API_KEY/)).toBeInTheDocument());
    expect(screen.getByText(/visível só para admin/)).toBeInTheDocument();
  });

  it('estado "desatualizado": avisa e permite atualizar quando os filtros mudam após uma geração', async () => {
    mockGenerate.mockResolvedValueOnce(availableResult());
    const { rerender } = render(<AssistedInsight candidate={null} period="all" />);

    fireEvent.click(screen.getByRole('button', { name: /Gerar leitura analítica/ }));
    await waitFor(() => expect(screen.getByText('Resumo do período monitorado.')).toBeInTheDocument());

    rerender(<AssistedInsight candidate="target-1" period="all" />);
    expect(screen.getByText(/pode estar desatualizada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Atualizar$/ })).toBeInTheDocument();
  });
});
