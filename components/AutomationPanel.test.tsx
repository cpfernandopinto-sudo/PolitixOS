// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { triggerXAutomation } = vi.hoisted(() => ({ triggerXAutomation: vi.fn() }));
vi.mock('@/lib/n8n', () => ({
  WEBHOOKS: {
    noticias: 'configured', posts: 'configured', comentarios: 'configured', analise: 'configured', reprocessamento: 'configured',
    xPosts: 'x-server-side', xReplies: 'x-server-side', xAiAnalysis: 'x-server-side', xReprocess: 'x-server-side',
  },
  isInstagramFlowKey: (key: string) => ['posts', 'comentarios', 'analise', 'reprocessamento'].includes(key),
  triggerInstagramAutomation: vi.fn(),
  triggerN8nWebhook: vi.fn(),
  triggerXAutomation,
}));

import AutomationPanel from './AutomationPanel';

beforeEach(() => {
  vi.clearAllMocks();
  triggerXAutomation.mockResolvedValue('accepted');
});

describe('AutomationPanel — X server-side trigger', () => {
  for (const [label, mode] of [
    ['Coletar Posts X', 'posts'],
    ['Coletar Comentários/Replies X', 'replies'],
    ['Rodar Análise de IA X', 'ai'],
    ['Reprocessar Posts sem Análise X', 'reprocess'],
  ] as const) {
    it(`mapeia ${label} para mode=${mode}`, async () => {
      render(<AutomationPanel />);
      const cardTitle = screen.getByText(label);
      const card = cardTitle.parentElement?.parentElement?.parentElement;
      expect(card).not.toBeNull();
      fireEvent.click(card!.querySelector('button')!);
      await waitFor(() => expect(triggerXAutomation).toHaveBeenCalledWith(mode));
      expect(await screen.findByText('Solicitação enviada ao pipeline')).toBeInTheDocument();
    });
  }
});
