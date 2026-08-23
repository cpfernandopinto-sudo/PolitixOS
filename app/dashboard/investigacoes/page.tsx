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
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
        <FileSearch size={14} className="text-purple-400 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-400 shrink-0">Inteligência Investigativa</span>
        <span className="h-3 w-px bg-white/[0.12] shrink-0" />
        <h1 className="text-[15px] font-bold text-white tracking-tight leading-none">Investigações</h1>
        <span className="text-[10px] text-slate-500 leading-none hidden sm:inline">Dossiês de inteligência e pesquisa aprofundada.</span>
      </div>

      <InvestigacoesClient investigations={investigations} />
    </div>
  );
}
