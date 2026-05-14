import { requireAuth } from '@/lib/auth/dal';
import OverviewDashboardClient from '@/components/dashboard/overview/OverviewDashboardClient';
import {
  getOverviewKPIs,
  getCrisisOverview,
  getChannelDistribution,
  getPriorityAlerts,
  getDominantTopics,
  getSentimentOverview,
  getRiskOverview,
  getTrendOverview,
  getStrategicActions,
  getExecutiveTable,
  getOverviewFiltersOptions
} from '@/lib/queries/overview';

export const metadata = {
  title: 'Visão Geral | PolitixOS',
  description: 'Consolidação executiva de inteligência política.',
};

export default async function OverviewPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth();
  const searchParams = await props.searchParams;
  const readParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const allowedTargetIds =
    session.role === 'admin'
      ? null
      : session.allowedTargetIds ?? [];

  console.log("[AUTH DEBUG]", {
    role: session.role,
    allowedTargetIds: session.allowedTargetIds
  });

  console.log("[overview auth]", {
    role: session.role,
    allowedTargetIds,
    isAdmin: session.role === "admin"
  });

  const requestedCandidate = readParam(searchParams.candidate);
  const requestedPeriod = readParam(searchParams.period);
  const period = ['all', '1', '7', '30'].includes(requestedPeriod || '')
    ? requestedPeriod
    : 'all';

  const filters = {
    candidate: requestedCandidate && !['todos', 'all'].includes(requestedCandidate) ? requestedCandidate : null,
    period,
    allowedTargetIds
  };

  // Fetch all data in parallel for initial state
  const [
    kpis,
    crisis,
    channels,
    alerts,
    topics,
    sentiment,
    risk,
    trend,
    actions,
    table,
    candidates
  ] = await Promise.all([
    getOverviewKPIs(filters),
    getCrisisOverview(filters),
    getChannelDistribution(filters),
    getPriorityAlerts(filters),
    getDominantTopics(filters),
    getSentimentOverview(filters),
    getRiskOverview(filters),
    getTrendOverview(filters),
    getStrategicActions(filters),
    getExecutiveTable(filters),
    getOverviewFiltersOptions(allowedTargetIds)
  ]);

  const initialData = {
    kpis,
    crisis,
    channels,
    alerts,
    topics,
    sentiment,
    risk,
    trend,
    actions,
    table
  };

  return (
    <OverviewDashboardClient
      initialData={initialData}
      candidates={candidates}
      currentCandidate={filters.candidate}
      currentPeriod={filters.period}
    />
  );
}
