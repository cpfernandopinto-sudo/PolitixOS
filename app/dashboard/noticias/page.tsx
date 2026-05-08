import React from 'react';
import FilterBar from '@/components/FilterBar';
import KpiCard from '@/components/ui/KpiCard';
import ChartCard from '@/components/ui/ChartCard';
import GaugeChart from '@/components/charts/GaugeChart';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import DataTable from '@/components/ui/DataTable';

import { 
  getKPIs, 
  getGaugeScore, 
  getNoticiasPorTempo, 
  getSentimento, 
  getFontes, 
  getRiscosPorFonte, 
  getTemas, 
  getEntidades, 
  getRiscos, 
  getRiscoTempo, 
  getFeedNoticias 
} from '@/lib/queries/noticias';

export default async function NoticiasDashboard() {
  // Fetch mock data concurrently
  const [
    kpis, 
    gauge, 
    tempoData, 
    sentimentoData, 
    fontesData, 
    riscosFonteData, 
    temasData, 
    entidadesData, 
    riscosData, 
    riscoTempoData, 
    feedData
  ] = await Promise.all([
    getKPIs(),
    getGaugeScore(),
    getNoticiasPorTempo(),
    getSentimento(),
    getFontes(),
    getRiscosPorFonte(),
    getTemas(),
    getEntidades(),
    getRiscos(),
    getRiscoTempo(),
    getFeedNoticias()
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Radar de Notícias</h2>
          <p className="text-gray-400 text-sm mt-1">Monitoramento em tempo real de citações, sentimento e risco político.</p>
        </div>
      </div>

      <FilterBar />

      {/* SEÇÃO 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={idx === 0 ? "lg:col-span-2" : "col-span-1"}>
            <KpiCard title={kpi.title} value={kpi.value} status={kpi.status} />
          </div>
        ))}
        <div className="lg:col-span-2 row-span-2">
          <ChartCard title="Termômetro de Crise" className="h-full flex flex-col items-center justify-center pt-8">
            <GaugeChart score={gauge.score} level={gauge.level as any} />
            <div className="text-center mt-[-30px]">
              <span className={`text-xl font-bold px-4 py-1 rounded-full ${
                gauge.level === 'danger' ? 'bg-[#FF3B3B]/10 text-[#FF3B3B]' : 
                gauge.level === 'warning' ? 'bg-[#FACC15]/10 text-[#FACC15]' : 
                'bg-[#22C55E]/10 text-[#22C55E]'
              }`}>
                {gauge.statusText}
              </span>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* SEÇÃO 2: ANÁLISE PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Evolução da Relevância no Tempo">
          <LineChart dates={tempoData.dates} values={tempoData.values} />
        </ChartCard>
        <ChartCard title="Volume por Fonte">
          <BarChart categories={fontesData.categories} values={fontesData.values} horizontal={true} />
        </ChartCard>
        <ChartCard title="Distribuição de Sentimento">
          <DonutChart data={sentimentoData} />
        </ChartCard>
        <ChartCard title="Riscos por Fonte" danger={true}>
          <BarChart categories={riscosFonteData.categories} values={riscosFonteData.values} color="#FF3B3B" horizontal={true} />
        </ChartCard>
      </div>

      {/* SEÇÃO 3: INTELIGÊNCIA */}
      <h3 className="text-xl font-bold text-white tracking-tight mt-10 mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-[#00FFFF] rounded-full"></span> Inteligência Tática
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Temas Mais Citados">
          <BarChart categories={temasData.categories} values={temasData.values} color="#22C55E" horizontal={true} />
        </ChartCard>
        <ChartCard title="Entidades Mais Citadas">
          <BarChart categories={entidadesData.categories} values={entidadesData.values} color="#00FFFF" horizontal={true} />
        </ChartCard>
        <ChartCard title="Riscos Mais Recorrentes" danger={true}>
          <BarChart categories={riscosData.categories} values={riscosData.values} color="#FF3B3B" horizontal={true} />
        </ChartCard>
        <ChartCard title="Evolução do Risco">
          <LineChart 
            dates={riscoTempoData.dates} 
            seriesData={[
              { name: 'Baixo', data: riscoTempoData.baixo, color: '#22C55E' },
              { name: 'Médio', data: riscoTempoData.medio, color: '#FACC15' },
              { name: 'Alto', data: riscoTempoData.alto, color: '#FF3B3B' }
            ]} 
          />
        </ChartCard>
      </div>

      {/* SEÇÃO 4: FEED DE NOTÍCIAS */}
      <h3 className="text-xl font-bold text-white tracking-tight mt-10 mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-[#2563EB] rounded-full"></span> Feed de Notícias em Tempo Real
      </h3>
      <DataTable data={feedData} />

    </div>
  );
}
