import { FileSearch } from 'lucide-react';
import { getInvestigations } from '@/lib/queries/investigations';
import InvestigacoesClient from './InvestigacoesClient';

export const dynamic = 'force-dynamic';

export default async function InvestigacoesPage() {
  const investigations = await getInvestigations();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <FileSearch size={24} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Investigações</h1>
          <p className="text-gray-400 text-sm mt-0.5">Dossiês de inteligência gerados por IA</p>
        </div>
      </div>

      <InvestigacoesClient investigations={investigations} />
    </div>
  );
}
