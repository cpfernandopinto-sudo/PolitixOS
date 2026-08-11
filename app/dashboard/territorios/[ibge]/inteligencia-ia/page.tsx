import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import IntegratedAnalysis from '@/components/dashboard/territorios/IntegratedAnalysis';
import AIRecommendation from '@/components/dashboard/territorios/AIRecommendation';

export default async function inteligenciaiaPage({ params }: { params: Promise<{ ibge: string }> }) {
  const { ibge } = await params;
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;
  if (!dossier) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6">Inteligência IA</h2>
      <IntegratedAnalysis data={dossier.integratedAnalysis} />
      <div className="mt-8">
        <AIRecommendation data={dossier.aiRecommendation} />
      </div>
    </div>
  );
}
