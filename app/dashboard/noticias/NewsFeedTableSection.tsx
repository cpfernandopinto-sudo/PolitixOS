'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Tag, Users, ShieldQuestion } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import ViewToggle from '@/components/ui/ViewToggle';
import Drawer from '@/components/ui/Drawer';
import BadgeStatus from '@/components/ui/BadgeStatus';
import { resolveViewPreference } from '@/lib/utils/viewPreference';
import type { Noticia, MencaoRow } from '@/lib/types/noticias';

const STORAGE_KEY = 'politixos_news_view';
const PAGE_SIZE = 12;

function parseJsonField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string') as string[];
    } catch { /* ignora */ }
  }
  return [];
}

/** Status honesto da análise: só existem "concluída" e "sem análise" no schema atual — não inventa "pendente"/"erro". */
function analysisStatus(raw: MencaoRow | undefined): 'concluida' | 'sem_analise' {
  if (!raw) return 'sem_analise';
  const hasTopics = parseJsonField(raw.ai_topics).length > 0;
  const hasEntities = parseJsonField(raw.ai_entities).length > 0;
  if (raw.ai_sentiment !== null || hasTopics || hasEntities || raw.ai_takeaways) return 'concluida';
  return 'sem_analise';
}

interface Props {
  data: Noticia[];
  rawRows: MencaoRow[];
}

export default function NewsFeedTableSection({ data, rawRows }: Props) {
  const [view, setView] = useState<'feed' | 'table'>('feed');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Noticia | null>(null);

  useEffect(() => {
    // Lê a preferência salva só após montar (localStorage não existe no
    // render do servidor) — evita mismatch de hidratação entre servidor e
    // cliente. Preferência inicial ('feed') é a mesma renderizada no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(resolveViewPreference(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const handleViewChange = (next: 'feed' | 'table') => {
    setView(next);
    localStorage.setItem(STORAGE_KEY, next);
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = data.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const rawFor = (id: string) => rawRows.find((r) => r.id === id || r.hash === id);
  const selectedRaw = selected ? rawFor(selected.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-xs text-gray-500">
          {data.length === 0
            ? 'Nenhum registro para os filtros atuais'
            : `Mostrando ${currentPage * PAGE_SIZE + 1}–${Math.min(data.length, (currentPage + 1) * PAGE_SIZE)} de ${data.length}`}
        </span>
        <ViewToggle value={view} onChange={handleViewChange} />
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-[#1A1A1A] border border-white/5 rounded-xl">
          Nenhuma notícia corresponde aos filtros selecionados.
        </div>
      ) : view === 'table' ? (
        <DataTable data={pageItems} rawRows={rawRows} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pageItems.map((item) => {
            const raw = rawFor(item.id);
            const topics = parseJsonField(raw?.ai_topics).slice(0, 2);
            const status = analysisStatus(raw);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="text-left bg-[#1A1A1A] border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{item.fonte}</span>
                  <span className="text-[10px] text-gray-600 shrink-0">{item.data}</span>
                </div>

                <h4 className="text-sm font-semibold text-white line-clamp-2">{item.titulo}</h4>

                {status === 'sem_analise' ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 italic">
                    <ShieldQuestion size={12} /> Análise de IA ainda não disponível para este item
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 line-clamp-2">{item.resumo}</p>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  {status === 'concluida' && <BadgeStatus type="sentimento" value={item.sentimento} />}
                  {status === 'concluida' && <BadgeStatus type="risco" value={item.risco} />}
                  {raw?.city && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                      <MapPin size={10} /> {raw.city}
                    </span>
                  )}
                  {topics.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                      <Tag size={10} /> {t}
                    </span>
                  ))}
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider mt-auto pt-1"
                >
                  Abrir matéria original <ExternalLink size={11} />
                </a>
              </button>
            );
          })}
        </div>
      )}

      {data.length > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-gray-500">{currentPage + 1} / {totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.titulo || ''}
        subtitle={selected ? `${selected.fonte} · ${selected.data}` : undefined}
        footer={
          selected && (
            <a
              href={selected.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 text-black text-sm font-bold hover:bg-cyan-400 transition-colors"
            >
              Abrir matéria original <ExternalLink size={14} />
            </a>
          )
        }
      >
        {selected && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <BadgeStatus type="sentimento" value={selected.sentimento} />
              <BadgeStatus type="risco" value={selected.risco} />
              <BadgeStatus type="crise" value={selected.crise} />
            </div>

            {analysisStatus(selectedRaw) === 'sem_analise' && (
              <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <ShieldQuestion size={14} className="shrink-0" />
                Esta notícia ainda não possui análise de IA concluída. Os campos abaixo refletem apenas dados brutos disponíveis.
              </div>
            )}

            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Resumo</h4>
              <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {selected.resumo}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Relevância</div>
                <div className="text-sm text-white font-medium">{selected.relevancia.toFixed(1)}/10</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Localidade</div>
                <div className="text-sm text-white font-medium">{selectedRaw?.city || 'Não informada'}</div>
              </div>
            </div>

            {(parseJsonField(selectedRaw?.ai_topics).length > 0) && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Tag size={11} /> Temas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {parseJsonField(selectedRaw?.ai_topics).map((t) => (
                    <span key={t} className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-full border border-white/5">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {(parseJsonField(selectedRaw?.ai_entities).length > 0) && (
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Users size={11} /> Entidades identificadas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {parseJsonField(selectedRaw?.ai_entities).map((e) => (
                    <span key={e} className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-full border border-white/5">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
