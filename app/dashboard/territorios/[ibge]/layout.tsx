import React from 'react';
import { getTerritoryDossierContext } from '@/lib/territorios/dossier-helpers';
import TerritorySidebar from '@/components/dashboard/territorios/TerritorySidebar';
import DossierHeader from '@/components/dashboard/territorios/DossierHeader';
import DossierBreadcrumbs from '@/components/dashboard/territorios/DossierBreadcrumbs';

export const metadata = {
  title: 'Dossiê Territorial | PolitixOS',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ ibge: string }>;
};

export default async function DossierLayout({ children, params }: Props) {
  const { ibge } = await params;
  const dossier = getTerritoryDossierContext(ibge);

  const cityName = dossier?.cityName ?? 'Território';
  const uf = dossier?.uf ?? 'MG';

  return (
    <div className="dossier-layout flex items-start h-full w-full bg-[var(--background)] relative overflow-hidden">
      {/* 1. SIDEBAR DOS CADERNOS DOSSIÊ */}
      <TerritorySidebar ibge={ibge} />

      <div className="flex-1 flex flex-col min-w-0 max-w-full relative h-full overflow-y-auto custom-scrollbar">
        <div className="flex-1 w-full pb-24 relative p-4 md:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto space-y-4">
            {/* BREADCRUMBS EXECUTIVOS */}
            <DossierBreadcrumbs ibge={ibge} cityName={cityName} uf={uf} />

            {/* CABEÇALHO DO DOSSIÊ */}
            {dossier && <DossierHeader dossier={dossier} />}

            {/* CONTEÚDO DO CADERNO ATIVO */}
            <div className="w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
