import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth/dal';
import { getPollById, getPollResults } from '@/lib/pesquisas/repository';
import { parsePollMetadata } from '@/lib/pesquisas/parser';

import { PollHeader } from './components/PollHeader';
import { PollSummaryCards } from './components/PollSummaryCards';
import { PollSampleProfile } from './components/PollSampleProfile';
import { PollMethodologySection } from './components/PollMethodologySection';
import { PollQualityRepresentativeness } from './components/PollQualityRepresentativeness';
import { PollQualityControl } from './components/PollQualityControl';
import { PollTerritorialCoverage } from './components/PollTerritorialCoverage';
import { PollResultsSection } from './components/PollResultsSection';
import { PollFooterAuditing } from './components/PollFooterAuditing';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PollDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();
  if (session.role !== 'admin' && !session.permissions.includes('pesquisas')) {
    redirect('/dashboard/sem-permissao');
  }

  const poll = await getPollById(id);
  if (!poll) notFound();

  const results = await getPollResults(poll.id);
  const metadata = parsePollMetadata(poll);

  const rawPlanoAmostral = poll.rawSourceRow?.DS_PLANO_AMOSTRAL ?? null;
  const rawDadoMunicipio = poll.rawSourceRow?.DS_DADO_MUNICIPIO ?? null;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Botão de retorno */}
      <div>
        <Link
          href="/dashboard/pesquisas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={15} /> Voltar para Pesquisas Eleitorais
        </Link>
      </div>

      {/* Header com Badges e Identidade */}
      <PollHeader poll={poll} hasResults={results.length > 0} />

      {/* BLOCO 1: Resumo da Pesquisa em Cards Compactos */}
      <PollSummaryCards poll={poll} metadata={metadata} />

      {/* Grid Principal 12 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BLOCO 2: Perfil da Amostra (7/12) */}
        <div className="lg:col-span-7">
          <PollSampleProfile metadata={metadata} rawPlanoAmostral={rawPlanoAmostral} />
        </div>

        {/* BLOCO 4: Qualidade e Representatividade (5/12) */}
        <div className="lg:col-span-5">
          <PollQualityRepresentativeness poll={poll} metadata={metadata} />
        </div>

        {/* BLOCO 3: Metodologia (7/12) */}
        <div className="lg:col-span-7">
          <PollMethodologySection poll={poll} metadata={metadata} />
        </div>

        {/* BLOCO 5: Controle de Qualidade (5/12) */}
        <div className="lg:col-span-5">
          <PollQualityControl poll={poll} metadata={metadata} />
        </div>

        {/* BLOCO 6: Cobertura Territorial (12/12) */}
        <div className="lg:col-span-12">
          <PollTerritorialCoverage metadata={metadata} rawDadoMunicipio={rawDadoMunicipio} />
        </div>

        {/* BLOCO 7: Resultados (12/12) */}
        <div className="lg:col-span-12">
          <PollResultsSection results={results} />
        </div>

        {/* BLOCO 8: Fonte e Auditoria (12/12) */}
        <div className="lg:col-span-12">
          <PollFooterAuditing poll={poll} />
        </div>
      </div>
    </div>
  );
}
