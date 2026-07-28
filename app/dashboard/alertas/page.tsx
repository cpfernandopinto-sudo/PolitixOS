import { requireAuth } from '@/lib/auth/dal';
import { getUnifiedAlerts, type AlertsFilters } from '@/lib/queries/alerts';
import { getOverviewFiltersOptions } from '@/lib/queries/overview';
import SectionBoundary from '@/components/ui/SectionBoundary';
import { BlockSkeleton } from '@/components/ui/BlockSkeleton';
import AlertasFilterBar from './AlertasFilterBar';
import AlertsList from './AlertsList';

export const metadata = {
  title: 'Central de Alertas | PolitixOS',
  description: 'Alertas gerados por regras objetivas a partir dos dados monitorados.',
};

async function AlertsSection({ filters }: { filters: AlertsFilters }) {
  const { alerts, errors } = await getUnifiedAlerts(filters);
  return <AlertsList alerts={alerts} errors={errors} />;
}

export default async function AlertasPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireAuth();
  const searchParams = await props.searchParams;
  const readParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const allowedTargetIds = session.role === 'admin' ? null : session.allowedTargetIds ?? [];

  const rawPeriod = readParam(searchParams.period);
  const period = ['all', '1', '7', '30'].includes(rawPeriod || '') ? rawPeriod : 'all';

  const rawSeverity = readParam(searchParams.severity);
  const severity = ['critico', 'alto', 'medio'].includes(rawSeverity || '')
    ? (rawSeverity as 'critico' | 'alto' | 'medio')
    : null;

  const rawType = readParam(searchParams.type);
  const type = ['noticias', 'instagram', 'x'].includes(rawType || '') ? rawType : null;

  const target = readParam(searchParams.target) || null;

  const filters: AlertsFilters = { period, severity, type, target, allowedTargetIds };

  const candidates = await getOverviewFiltersOptions(allowedTargetIds);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Central de Alertas</h1>
        <p className="text-gray-500 mt-1">
          Alertas gerados por regras objetivas e documentadas a partir dos dados monitorados — ver{' '}
          <span className="text-gray-400">docs/REGRAS_ALERTAS_POLITIXOS.md</span> para os critérios completos.
        </p>
      </div>

      <AlertasFilterBar candidates={candidates} />

      <SectionBoundary label="Alertas" fallback={<BlockSkeleton height={420} />} minHeight={420}>
        <AlertsSection filters={filters} />
      </SectionBoundary>
    </div>
  );
}
