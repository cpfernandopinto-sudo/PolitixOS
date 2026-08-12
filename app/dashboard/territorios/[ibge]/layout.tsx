import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';

import TerritorySidebar from '@/components/dashboard/territorios/TerritorySidebar';

export const metadata = {
  title: 'Dossiê Territorial | PolitixOS',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ ibge: string }>;
};

export default async function DossierLayout({ children, params }: Props) {
  const { ibge } = await params;
  
  // No MVP, utilizamos a fixture de Contagem. 
  // Em produção, isso bateria numa API
  const dossier = ibge === '3118601' ? CONTAGEM_DEMO : null;

  if (!dossier) {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-2xl font-bold text-white mb-2">Município não encontrado</h2>
        <p className="text-slate-400">O IBGE {ibge} não possui dossiê configurado neste ambiente.</p>
      </div>
    );
  }

  return (
    <div className="dossier-layout flex items-start h-full w-full bg-[var(--background)] relative overflow-hidden">
      {/* 1. SIDEBAR DOS CADERNOS */}
      <TerritorySidebar ibge={ibge} />

      <div className="flex-1 flex flex-col min-w-0 max-w-full relative h-full overflow-y-auto custom-scrollbar">
        {/* 2. CONTEÚDO DO CADERNO ATIVO */}
        <div className="flex-1 w-full pb-24 relative mt-4">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
