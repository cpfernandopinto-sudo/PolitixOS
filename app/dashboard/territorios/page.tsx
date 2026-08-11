import { MapPin } from 'lucide-react';
import { getAvailableUfs } from '@/lib/queries/territories';
import TerritoriosClient from './TerritoriosClient';

export const dynamic = 'force-dynamic';

export default async function TerritoriosPage() {
  const ufs = await getAvailableUfs();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <MapPin size={24} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Politix Territórios</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Briefing Territorial — selecione uma cidade para preparar a inteligência territorial da visita.
          </p>
        </div>
      </div>

      <TerritoriosClient initialUfs={ufs} />
    </div>
  );
}
