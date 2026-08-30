// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WhatsAppDashboard from './WhatsAppDashboard';
import {
  MOCK_WHATSAPP_MESSAGES,
  fetchWhatsAppSummary,
  fetchWhatsAppGroups,
  fetchWhatsAppFilters,
} from '@/lib/queries/whatsapp';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('WhatsAppDashboard component — Codex Contract', () => {
  it('renderiza os 6 cards executivos de KPI', async () => {
    const summary = await fetchWhatsAppSummary();
    const groups = await fetchWhatsAppGroups();
    const filterOptions = await fetchWhatsAppFilters();

    render(
      <WhatsAppDashboard
        summary={summary}
        items={MOCK_WHATSAPP_MESSAGES}
        groups={groups.items}
        filterOptions={filterOptions}
        criticalAlert={MOCK_WHATSAPP_MESSAGES[0]}
        nextCursor="token123"
        hasMore={true}
        completeness="100% dos canais WhatsApp operacionais"
      />
    );

    expect(screen.getAllByText(/Mensagens/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Grupos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Remetentes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Alertas Críticos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sentimento Negativo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tema Líder/i).length).toBeGreaterThan(0);
  });

  it('renderiza o banner de alerta de risco quando fornecido', async () => {
    const summary = await fetchWhatsAppSummary();
    const groups = await fetchWhatsAppGroups();
    const filterOptions = await fetchWhatsAppFilters();

    render(
      <WhatsAppDashboard
        summary={summary}
        items={MOCK_WHATSAPP_MESSAGES}
        groups={groups.items}
        filterOptions={filterOptions}
        criticalAlert={MOCK_WHATSAPP_MESSAGES[0]}
        nextCursor={null}
        hasMore={false}
        completeness="100% dos canais WhatsApp operacionais"
      />
    );

    expect(screen.getByText(/Alerta de Risco Reputacional no WhatsApp/i)).toBeDefined();
  });

  it('renderiza os cards do feed e permite abrir o Drawer', async () => {
    const summary = await fetchWhatsAppSummary();
    const groups = await fetchWhatsAppGroups();
    const filterOptions = await fetchWhatsAppFilters();

    render(
      <WhatsAppDashboard
        summary={summary}
        items={MOCK_WHATSAPP_MESSAGES}
        groups={groups.items}
        filterOptions={filterOptions}
        criticalAlert={null}
        nextCursor={null}
        hasMore={false}
        completeness="100% dos canais WhatsApp operacionais"
      />
    );

    expect(screen.getAllByText(/Carlos Mendonça/i).length).toBeGreaterThan(0);

    const firstCard = screen.getAllByText(/Carlos Mendonça/i)[0];
    fireEvent.click(firstCard);

    expect(screen.getByText(/Detalhamento da Mensagem WhatsApp/i)).toBeDefined();
    expect(screen.getAllByText(/Análise de IA/i).length).toBeGreaterThan(0);
  });

  it('permite alternar para a aba de Grupos Monitorados', async () => {
    const summary = await fetchWhatsAppSummary();
    const groups = await fetchWhatsAppGroups();
    const filterOptions = await fetchWhatsAppFilters();

    render(
      <WhatsAppDashboard
        summary={summary}
        items={MOCK_WHATSAPP_MESSAGES}
        groups={groups.items}
        filterOptions={filterOptions}
        criticalAlert={null}
        nextCursor={null}
        hasMore={false}
        completeness="100% dos canais WhatsApp operacionais"
      />
    );

    const groupsTabBtn = screen.getByRole('button', { name: /Grupos Monitorados/i });
    fireEvent.click(groupsTabBtn);

    expect(screen.getByText(/Nome do Grupo/i)).toBeDefined();
    expect(screen.getByText(/Total Mensagens/i)).toBeDefined();
  });

  it('renderiza estado vazio quando não há mensagens', async () => {
    const emptySummary = {
      totals: { messages: 0, groups: 0, unique_senders: 0, analyzed: 0, pending: 0, failed: 0, high_or_critical_risk: 0 },
      sentiment: [],
      risk: [],
      relevance: [],
      top_themes: [],
      freshness: { last_message_at: null, last_analysis_at: null },
    };

    const emptyFilters = {
      groups: [],
      sentiments: [],
      risk_levels: [],
      relevance_levels: [],
      themes: [],
      message_types: [],
    };

    render(
      <WhatsAppDashboard
        summary={emptySummary}
        items={[]}
        groups={[]}
        filterOptions={emptyFilters}
        criticalAlert={null}
        nextCursor={null}
        hasMore={false}
        completeness="100% dos canais WhatsApp operacionais"
      />
    );

    expect(screen.getByText(/Nenhuma mensagem de WhatsApp monitorada/i)).toBeDefined();
  });
});
