interface Topic {
  tema: string;
  frequencia: number;
  sentimento: number;
}

interface Props {
  topics: Topic[];
}

export default function OverviewTopics({ topics }: Props) {
  // Fase 2 do refinamento visual: mostrar só os 5 temas dominantes — a
  // referência de produção não usa scroll nesta visualização.
  const top5 = topics.slice(0, 5);

  return (
    <div className="bg-[#0E1727] border border-blue-300/10 rounded-xl p-5 h-full flex flex-col">
      <h3 className="text-white font-bold text-lg">Temas Dominantes</h3>
      <p className="text-xs text-slate-500 mb-3">Top 5 pautas monitoradas</p>
      {top5.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm italic">
          Nenhum tema identificado no período selecionado.
        </div>
      ) : (
        <div className="h-[300px] flex flex-col justify-center gap-5">
          {top5.map((t, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-xs text-slate-300 font-medium" title={t.tema}>{t.tema}</span>
                <span className="text-sm font-bold text-white shrink-0">{t.frequencia}</span>
              </div>
              <div className="w-full h-2.5 bg-blue-500/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${t.sentimento > 0.2 ? 'bg-green-500' : t.sentimento < -0.2 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (t.frequencia / top5[0].frequencia) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
