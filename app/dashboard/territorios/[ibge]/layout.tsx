import React from 'react';
import { CONTAGEM_DEMO } from '@/lib/territorios/fixtures/contagem';
import DossierHeader from '@/components/dashboard/territorios/DossierHeader';
import DossierNavigation from '@/components/dashboard/territorios/DossierNavigation';

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
    <div className="min-h-screen bg-[#060911] relative">
      {/* 1. CABEÇALHO GLOBAL DO TERRITÓRIO */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6">
        <DossierHeader dossier={dossier} />
      </div>

      {/* 2. NAVEGAÇÃO DOS CADERNOS */}
      <DossierNavigation ibge={ibge} />

      {/* 3. CONTEÚDO DO CADERNO ATIVO */}
      <div className="max-w-[1600px] mx-auto pb-24 relative">
        {children}
      </div>
    </div>
  );
}
