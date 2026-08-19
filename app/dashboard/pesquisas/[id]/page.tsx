import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireAuth } from '@/lib/auth/dal';
import { getPollById, getPollResults } from '@/lib/pesquisas/repository';

interface Props {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</dt>
      <dd className="text-sm text-white mt-0.5">{value ?? <span className="text-gray-600">Não disponível</span>}</dd>
    </div>
  );
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

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <Link href="/dashboard/pesquisas" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft size={14} /> Voltar para Pesquisas Eleitorais
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{poll.instituto ?? 'Instituto não informado'}</h2>
        <p className="text-gray-400 text-sm mt-1">Registro TSE {poll.tseRegistrationNumber}</p>
      </div>

      {/* Ficha técnica (PARTE 22) — somente campos existentes */}
      <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Ficha Técnica</h3>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Registro TSE" value={poll.tseRegistrationNumber} />
          <Field label="Instituto" value={poll.instituto} />
          <Field label="Contratante" value={poll.contratante} />
          <Field label="Pagante" value={poll.pagante} />
          <Field label="Valor" value={poll.valor} />
          <Field label="Campo (início)" value={poll.campoInicio} />
          <Field label="Campo (fim)" value={poll.campoFim} />
          <Field label="Amostra" value={poll.amostra} />
          <Field label="Margem de Erro" value={poll.margemErro ? `±${poll.margemErro}%` : null} />
          <Field label="Nível de Confiança" value={poll.nivelConfianca ? `${poll.nivelConfianca}%` : null} />
          <Field label="Unidade Eleitoral de Registro" value={poll.abrangencia} />
          <Field label="Cargo" value={poll.cargo} />
          <Field label="UF" value={poll.uf} />
          <Field label="Município" value={poll.municipio} />
          <Field label="Metodologia" value={poll.metodologia} />
          <Field label="Data de Registro" value={poll.dataRegistro} />
        </dl>
        {/* Evidência/provenance (PARTE 23) — sempre presente, nunca uma pesquisa sem fonte */}
        <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-gray-500">
          <span>Fonte: {poll.source}</span>
          {poll.sourceUrl && (
            <a href={poll.sourceUrl} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline inline-flex items-center gap-1">
              Consultar registro original <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Resultados — só se comprovadamente existentes (PARTE 8/9) */}
      <div className="bg-[#12192A] border border-white/5 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Resultados de Intenção de Voto</h3>
        {results.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">Resultados divulgados ainda não integrados para esta pesquisa.</p>
        ) : (
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/5">
                <span className="text-white">{r.candidateName} <span className="text-gray-500 text-xs">({r.cenario}, {r.turno}º turno, {r.tipoPergunta})</span></span>
                <span className="text-[#2563EB] font-bold">{r.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
