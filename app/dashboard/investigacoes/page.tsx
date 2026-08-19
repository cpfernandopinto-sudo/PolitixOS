import { FileSearch } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getInvestigations } from '@/lib/queries/investigations';
import { requireAuth, getAllowedTargetIds } from '@/lib/auth/dal';
import InvestigacoesClient from './InvestigacoesClient';

export const dynamic = 'force-dynamic';

export default async function InvestigacoesPage() {
  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('investigacoes')) {
    redirect('/dashboard/sem-permissao');
  }

  const allowedTargetIds = await getAllowedTargetIds();
  const investigations = await getInvestigations(allowedTargetIds);

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
