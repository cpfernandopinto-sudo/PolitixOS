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

  const [kpis, registeredPolls, results, filterOptions] = await Promise.all([
    getPesquisasKpis(),
    listPolls(),
    listPollResultsWithPoll(),
    getAvailableFilterOptions(),
  ]);

  const source = getPesquisasSourceDescriptor();

  return (
    <PesquisasCockpitView
      registeredPolls={registeredPolls}
      allResults={results}
      filterOptions={filterOptions}
      kpis={kpis}
      source={{ portalUrl: source.portalUrl, sourceUrl: source.sourceUrl }}
      isAdmin={session.role === 'admin'}
    />
  );
}
