import { notFound, redirect } from 'next/navigation';
import {
  getInvestigationById,
  getInvestigationSources,
  getInvestigationEntities,
  getInvestigationTimeline,
  getInvestigationQueries,
} from '@/lib/queries/investigations';
import { requireAuth, getAllowedTargetIds } from '@/lib/auth/dal';
import DossierClient from './DossierClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DossierPage({ params }: Props) {
  const { id } = await params;
  console.info('[Investigação] Rota de dossiê recebeu id:', id);

  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('investigacoes')) {
    redirect('/dashboard/sem-permissao');
  }

  const allowedTargetIds = await getAllowedTargetIds();
  const investigation = await getInvestigationById(id, allowedTargetIds);

  if (!investigation) {
    console.warn('[Investigação] Dossiê não encontrado para id:', id);
    notFound();
  }

  console.info('[Investigação] Status do dossiê carregado:', {
    id: investigation.id,
    status: investigation.status,
    hasExecutiveSummary: Boolean(investigation.executive_summary),
    hasFullReport: investigation.full_report != null,
  });

  const [sources, entities, timeline, queries] = await Promise.all([
    getInvestigationSources(id),
    getInvestigationEntities(id),
    getInvestigationTimeline(id),
    getInvestigationQueries(id),
  ]);

  return (
    <DossierClient
      investigation={investigation}
      sources={sources}
      entities={entities}
      timeline={timeline}
      queries={queries}
    />
  );
}
