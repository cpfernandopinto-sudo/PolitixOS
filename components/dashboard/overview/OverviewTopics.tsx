interface Topic {
  tema: string;
  frequencia: number;
  sentimento: number;
}

interface Props {
  topics: Topic[];
}

export default function OverviewTopics({ topics }: Props) {
  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 h-full">
      <h3 className="text-white font-bold text-lg mb-6">Temas Dominantes</h3>
      {topics.length === 0 ? (
        <div className="h-full min-h-[140px] flex items-center justify-center text-gray-500 text-sm italic">
          Nenhum tema identificado no período selecionado.
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((t, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-32 text-xs text-gray-400 truncate">{t.tema}</div>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${t.sentimento > 0.2 ? 'bg-green-500' : t.sentimento < -0.2 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (t.frequencia / topics[0].frequencia) * 100)}%` }}
                />
              </div>
              <div className="w-10 text-right text-xs font-bold text-white">{t.frequencia}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
