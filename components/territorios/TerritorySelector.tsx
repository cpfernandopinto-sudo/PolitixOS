'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { getMunicipiosByUfAction } from '@/lib/actions/territories';
import type { Territory } from '@/lib/types/territories';

interface Props {
  ufs: string[];
  onSelect: (territory: Territory | null) => void;
}

const SELECT_CLS =
  'w-full appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2.5 pl-9 pr-6 text-sm text-gray-200 ' +
  'focus:outline-none focus:border-cyan-400/50 hover:border-white/10 transition-all cursor-pointer ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export default function TerritorySelector({ ufs, onSelect }: Props) {
  const [uf, setUf] = useState('');
  const [municipios, setMunicipios] = useState<Territory[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [codigoIbge, setCodigoIbge] = useState('');

  useEffect(() => {
    if (!uf) {
      setMunicipios([]);
      return;
    }
    let cancelled = false;
    setLoadingMunicipios(true);
    getMunicipiosByUfAction(uf)
      .then((data) => {
        if (!cancelled) setMunicipios(data);
      })
      .catch((err) => {
        console.error('[TerritorySelector] Erro ao buscar municípios:', err);
        if (!cancelled) setMunicipios([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMunicipios(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uf]);

  const handleUfChange = (value: string) => {
    setUf(value);
    setCodigoIbge('');
    onSelect(null);
  };

  const handleMunicipioChange = (value: string) => {
    setCodigoIbge(value);
    const territory = municipios.find((m) => m.codigo_ibge === value) ?? null;
    onSelect(territory);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="territorios_uf" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">UF</label>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            id="territorios_uf"
            className={SELECT_CLS}
            value={uf}
            onChange={(e) => handleUfChange(e.target.value)}
          >
            <option value="">Selecione a UF</option>
            {ufs.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="territorios_municipio" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Município</label>
        <div className="relative">
          {loadingMunicipios ? (
            <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
          ) : (
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          )}
          <select
            id="territorios_municipio"
            className={SELECT_CLS}
            value={codigoIbge}
            onChange={(e) => handleMunicipioChange(e.target.value)}
            disabled={!uf || loadingMunicipios}
          >
            <option value="">
              {!uf ? 'Selecione a UF primeiro' : loadingMunicipios ? 'Carregando...' : 'Selecione o município'}
            </option>
            {municipios.map((m) => (
              <option key={m.codigo_ibge} value={m.codigo_ibge}>
                {m.municipio}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
