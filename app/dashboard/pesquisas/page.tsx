import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/dal';
import {
  listPolls,
  getPesquisasKpis,
  getAvailableFilterOptions,
  listPollResultsWithPoll,
} from '@/lib/pesquisas/repository';
import { getPesquisasSourceDescriptor } from '@/lib/pesquisas/source';
import { PesquisasCockpitView } from './components/PesquisasCockpitView';

export const metadata = {
  title: 'Pesquisas Eleitorais | Cockpit Executivo | PolitixOS',
  description: 'Cockpit executivo de inteligência eleitoral e pesquisas registradas no TSE/PesqEle.',
};

export const dynamic = 'force-dynamic';

export default async function PesquisasPage() {
  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('pesquisas')) {
    redirect('/dashboard/sem-permissao');
  }

  const [kpis, polls, filterOptions, results] = await Promise.all([
    getPesquisasKpis(),
    listPolls(),
    getAvailableFilterOptions(),
    listPollResultsWithPoll(),
  ]);

  const source = getPesquisasSourceDescriptor();

  return (
    <PesquisasCockpitView
      initialPolls={polls}
      initialResults={results}
      kpis={kpis}
      source={{ portalUrl: source.portalUrl, sourceUrl: source.sourceUrl }}
      filterOptions={filterOptions}
      isAdmin={session.role === 'admin'}
    />
  );
}
