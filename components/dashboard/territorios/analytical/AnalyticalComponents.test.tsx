// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  formatInteger,
  formatPercentage,
  formatCurrency,
  formatCompactNumber,
  formatDate,
} from '@/lib/utils/formatters';
import MetricCard from './MetricCard';
import TrendIndicator from './TrendIndicator';
import AnalyticalTable from './AnalyticalTable';
import SourceMetadataPanel from './SourceMetadataPanel';
import AnalyticalEmptyState from './AnalyticalEmptyState';
import AIInsightPanel from './AIInsightPanel';
import CagedEmploymentSection from './CagedEmploymentSection';

describe('Formatters — lib/utils/formatters.ts', () => {
  it('formata inteiros em pt-BR corretamente', () => {
    expect(formatInteger(1240500)).toBe('1.240.500');
    expect(formatInteger(0)).toBe('0');
    expect(formatInteger(null)).toBe('—');
  });

  it('formata percentuais em pt-BR corretamente', () => {
    expect(formatPercentage(78.4)).toBe('78,4%');
    expect(formatPercentage(100, 0)).toBe('100%');
    expect(formatPercentage(null)).toBe('—');
  });

  it('formata moedas em Reais corretamente', () => {
    expect(formatCurrency(55400)).toContain('55.400');
    expect(formatCurrency(null)).toBe('—');
  });

  it('formata números grandes em formato compacto executivo em pt-BR', () => {
    expect(formatCompactNumber(4475980236, true)).toContain('R$ 4,48 bi');
    expect(formatCompactNumber(1200000)).toBe('1,2 mi');
    expect(formatCompactNumber(350000)).toBe('350 mil');
    expect(formatCompactNumber(null)).toBe('—');
  });

  it('formata datas para o padrão pt-BR', () => {
    expect(formatDate('2026-08-16T10:00:00Z')).toContain('16/08/2026');
    expect(formatDate(null)).toBe('—');
  });
});

describe('Analytical Component Library — Unit Tests', () => {
  it('MetricCard renderiza rótulo, valor, unidade e fonte corretamente', () => {
    render(
      <MetricCard
        label="População Estimada"
        value="621.865"
        unit="hab"
        period="2024"
        source="IBGE"
        trend="up"
        variation="+0,8%"
      />
    );

    expect(screen.getByText('População Estimada')).toBeInTheDocument();
    expect(screen.getByText('621.865')).toBeInTheDocument();
    expect(screen.getByText('hab')).toBeInTheDocument();
    expect(screen.getByText(/Fonte: IBGE/)).toBeInTheDocument();
    expect(screen.getByText('(+0,8%)')).toBeInTheDocument();
  });

  it('TrendIndicator renderiza direções de tendência semanticamente neutras', () => {
    const { rerender } = render(<TrendIndicator direction="up" value="+3,2%" label="Alta" />);
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('(+3,2%)')).toBeInTheDocument();

    rerender(<TrendIndicator direction="down" value="-4,5%" label="Queda" />);
    expect(screen.getByText('Queda')).toBeInTheDocument();
    expect(screen.getByText('(-4,5%)')).toBeInTheDocument();

    rerender(<TrendIndicator direction="unknown" />);
    expect(screen.getByText('Indeterminado')).toBeInTheDocument();
  });

  it('CagedEmploymentSection renderiza KPIs de admissões, desligamentos, saldo e 5 setores', () => {
    render(
      <CagedEmploymentSection
        cagedData={{
          period: '2024 (12m)',
          totalAdmissions: 12000,
          totalDismissals: 9500,
          totalBalance: 2500,
          sectors: [
            { sector: 'Agropecuária', admissions: 300, dismissals: 200, balance: 100 },
            { sector: 'Indústria', admissions: 4000, dismissals: 3000, balance: 1000 },
            { sector: 'Construção', admissions: 1700, dismissals: 1500, balance: 200 },
            { sector: 'Comércio', admissions: 3000, dismissals: 2600, balance: 400 },
            { sector: 'Serviços', admissions: 3000, dismissals: 2200, balance: 800 },
          ],
          pendingMetrics: [
            { name: 'Estoque Formal de Empregos', status: 'METHODOLOGY_PENDING' },
          ],
        }}
      />
    );

    expect(screen.getByText('Dinâmica do Emprego Formal (Novo CAGED)')).toBeInTheDocument();
    expect(screen.getByText('12.000')).toBeInTheDocument();
    expect(screen.getByText('9.500')).toBeInTheDocument();
    expect(screen.getByText('+2.500')).toBeInTheDocument();
    // Agropecuária (menor saldo) e Indústria (maior saldo) agora também aparecem nos
    // cards de destaque "Setor Líder"/"Setor em Maior Retração", além da tabela — por
    // isso usamos getAllByText em vez de getByText (que exige ocorrência única).
    expect(screen.getAllByText('Agropecuária').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Indústria').length).toBeGreaterThan(0);
    expect(screen.getByText(/METHODOLOGY_PENDING/i)).toBeInTheDocument();
  });

  it('AnalyticalTable exibe dados e permite ordenação por colunas', async () => {
    const user = userEvent.setup();
    render(
      <AnalyticalTable
        title="Tabela de Teste"
        columns={[
          { key: 'nome', header: 'Nome', sortable: true },
          { key: 'qtd', header: 'Quantidade', sortable: true, align: 'right' },
        ]}
        data={[
          { nome: 'Item B', qtd: 200 },
          { nome: 'Item A', qtd: 100 },
        ]}
      />
    );

    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();

    // Click header to sort
    await user.click(screen.getByText('Nome'));
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Item A');
    expect(rows[2]).toHaveTextContent('Item B');
  });

  it('SourceMetadataPanel exibe fonte, conjunto de dados e metodologia', () => {
    render(
      <SourceMetadataPanel
        source="SEJUSP MG"
        dataset="Ocorrências Criminais"
        period="2024"
        methodology="Apuração mensal de boletins."
      />
    );

    expect(screen.getByText('SEJUSP MG')).toBeInTheDocument();
    expect(screen.getByText('Ocorrências Criminais')).toBeInTheDocument();
    expect(screen.getByText(/Apuração mensal/)).toBeInTheDocument();
  });

  it('AnalyticalEmptyState mapeia os motivos e renderiza mensagens limpas', () => {
    render(<AnalyticalEmptyState reason="nao_coletado" engineName="Motor IBGE" />);
    expect(screen.getByText('Dados Ainda Não Coletados')).toBeInTheDocument();
    expect(screen.getByText('Motor IBGE')).toBeInTheDocument();
  });

  it('AIInsightPanel renderiza títulos, parágrafos e evidências', () => {
    render(
      <AIInsightPanel
        title="Síntese de Teste"
        paragraphs={['Parágrafo 1 de análise.', 'Parágrafo 2 de análise.']}
        evidences={[{ dataset: 'Censo 2022', source: 'IBGE', period: '2022' }]}
        confidenceLevel="ALTA"
      />
    );

    expect(screen.getByText('Síntese de Teste')).toBeInTheDocument();
    expect(screen.getByText('Parágrafo 1 de análise.')).toBeInTheDocument();
    expect(screen.getByText('Parágrafo 2 de análise.')).toBeInTheDocument();
    expect(screen.getByText(/Censo 2022/)).toBeInTheDocument();
  });
});
