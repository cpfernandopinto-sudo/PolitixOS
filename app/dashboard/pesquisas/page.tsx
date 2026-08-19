import { redirect } from 'next/navigation';
import { LineChart, AlertTriangle, Building2, FileText, TrendingUp, ExternalLink } from 'lucide-react';
import { requireAuth } from '@/lib/auth/dal';
import KpiCard from '@/components/ui/KpiCard';
import { listPolls, getPesquisasKpis } from '@/lib/pesquisas/repository';
import { getPesquisasSourceDescriptor } from '@/lib/pesquisas/source';
import CollectButton from './CollectButton';

export const metadata = {
  title: 'Pesquisas Eleitorais | PolitixOS',
  description: 'Monitoramento e comparação das pesquisas registradas no TSE/PesqEle.',
};

export const dynamic = 'force-dynamic';

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca executado';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default async function PesquisasPage() {
  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('pesquisas')) {
    redirect('/dashboard/sem-permissao');
  }

  const [kpis, polls] = await Promise.all([getPesquisasKpis(), listPolls()]);
  const source = getPesquisasSourceDescriptor();
  const isBlocked = kpis.sourceStatus === 'BLOCKED_BY_SOURCE_ACCESS';
  const neverRun = kpis.sourceStatus === 'NEVER_RUN';

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho (PARTE 16) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <LineChart size={24} className="text-[#2563EB]" />
            Pesquisas Eleitorais
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Monitoramento e comparação das pesquisas registradas no TSE/PesqEle.
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>
              Fonte oficial: <a href={source.portalUrl} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline inline-flex items-center gap-1">TSE / PesqEle <ExternalLink size={11} /></a>
            </span>
            <span className="text-gray-700">•</span>
            <span>Última verificação: {formatDate(kpis.lastSyncAt)}</span>
          </div>
        </div>
        {session.role === 'admin' && <CollectButton />}
      </div>

      {/* Disclosure honesto de bloqueio de fonte (PARTE 32 — nunca "0 pesquisas" silencioso) */}
      {(isBlocked || neverRun) && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3.5">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-semibold">
              {neverRun ? 'Coleta ainda não executada' : 'Fonte oficial indisponível'}
            </p>
            <p className="text-amber-200/70 text-xs mt-1">
              {neverRun
                ? 'Nenhuma execução do coletor foi registrada ainda. Use "Verificar fonte oficial" para tentar.'
                : 'O Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br / cdn.tse.jus.br) não respondeu à última tentativa de coleta. Os números abaixo refletem apenas o que já está no banco — não uma ausência real de pesquisas registradas. Ver ficha técnica em docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md.'}
            </p>
          </div>
        </div>
      )}

      {/* KPIs (PARTE 17) — todos de contagem real */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Pesquisas Registradas" value={kpis.totalPolls} status={kpis.totalPolls > 0 ? 'success' : 'neutral'} compact />
        <KpiCard title="Pesquisas Recentes (30d)" value={kpis.recentPolls30d} compact />
        <KpiCard title="Institutos Monitorados" value={kpis.institutesCount} compact />
        <KpiCard title="Estados Cobertos" value={kpis.ufsCovered} compact />
        <KpiCard title="Cargo Mais Pesquisado" value={kpis.topCargo ?? 'Não disponível'} compact />
        <KpiCard title="Último Registro" value={kpis.lastRegistrationDate ? formatDate(kpis.lastRegistrationDate) : 'Não disponível'} compact />
      </div>

      {/* Pesquisas recentes (PARTE 18) */}
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={15} className="text-[#2563EB]" /> Pesquisas Recentes
        </h3>
        {polls.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            Nenhuma pesquisa registrada disponível no banco no momento.
          </p>
        ) : (
          <div className="space-y-2">
            {polls.slice(0, 10).map((poll) => (
              <a
                key={poll.id}
                href={`/dashboard/pesquisas/${poll.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{poll.instituto ?? 'Instituto não informado'} — {poll.cargo ?? 'Cargo não informado'}</p>
                  <p className="text-gray-500 text-xs">Registro TSE {poll.tseRegistrationNumber} · {poll.uf ?? 'UF não informada'}</p>
                </div>
                <span className="text-gray-500 text-xs shrink-0">{formatDate(poll.dataRegistro)}</span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Evolução de intenção de voto (PARTE 19) — empty state honesto, sem mock */}
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-[#2563EB]" /> Evolução das Intenções de Voto
        </h3>
        <div className="py-10 text-center">
          <p className="text-gray-400 text-sm">Resultados divulgados ainda não integrados.</p>
          <p className="text-gray-600 text-xs mt-1">
            O dataset oficial de registro do TSE/PesqEle ainda não teve resultado de intenção de voto por candidato confirmado nesta fonte (ver ficha técnica no relatório).
          </p>
        </div>
      </section>

      {/* Comparação entre pesquisas (PARTE 20) — empty state honesto */}
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Comparação Entre Pesquisas</h3>
        <div className="py-10 text-center">
          <p className="text-gray-400 text-sm">Nenhuma pesquisa comparável disponível ainda.</p>
          <p className="text-gray-600 text-xs mt-1">
            Só pesquisas com mesmo cargo, turno, tipo de pergunta, cenário e abrangência entram na mesma leitura comparativa.
          </p>
        </div>
      </section>

      {/* Institutos (PARTE 21) — sem ranking qualitativo */}
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <Building2 size={15} className="text-[#2563EB]" /> Institutos
        </h3>
        {kpis.institutesCount === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">Nenhum instituto identificado ainda.</p>
        ) : (
          <p className="text-gray-400 text-sm">{kpis.institutesCount} institutos com pesquisas registradas no banco.</p>
        )}
      </section>
    </div>
  );
}
