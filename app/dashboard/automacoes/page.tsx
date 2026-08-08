import AutomationPanel from '@/components/AutomationPanel';

export const metadata = {
  title: 'Automação | PolitixOS',
  description: 'Acionamento manual dos fluxos de coleta e análise do PolitixOS.',
};

export default function AutomacoesPage() {
  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Automação</h2>
        <p className="text-gray-400 text-sm mt-1">
          Acione manualmente os processos de coleta e análise de dados do PolitixOS.
        </p>
      </div>

      {/* Panel */}
      <AutomationPanel />
    </div>
  );
}
