'use client';

import { useEffect, useState, useRef, useId } from 'react';
import { Loader2, MapPin, Search, ChevronDown, Check, X } from 'lucide-react';
import { getMunicipiosByUfAction } from '@/lib/actions/territories';
import type { Territory } from '@/lib/types/territories';

interface Props {
  ufs: string[];
  onSelect: (territory: Territory | null) => void;
  selectedTerritory?: Territory | null;
}

const UF_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

export default function TerritorySelector({ ufs, onSelect, selectedTerritory }: Props) {
  const [uf, setUf] = useState('');
  const [municipios, setMunicipios] = useState<Territory[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  
  // Search & Combobox states
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedMuni, setSelectedMuni] = useState<Territory | null>(selectedTerritory ?? null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const ufInputId = useId();
  const municipioInputId = useId();

  // Load municipalities when UF changes
  useEffect(() => {
    if (!uf) {
      setMunicipios([]);
      setSelectedMuni(null);
      setSearchTerm('');
      onSelect(null);
      return;
    }

    let cancelled = false;
    setLoadingMunicipios(true);
    setSelectedMuni(null);
    setSearchTerm('');
    onSelect(null);

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

  // Sync external selectedTerritory if provided
  useEffect(() => {
    if (selectedTerritory !== undefined) {
      setSelectedMuni(selectedTerritory);
      if (selectedTerritory) {
        setSearchTerm(selectedTerritory.municipio);
      }
    }
  }, [selectedTerritory]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter municipalities based on search term
  const filteredMunicipios = municipios.filter((m) =>
    m.municipio.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleUfChange = (value: string) => {
    setUf(value);
    setIsOpen(false);
  };

  const handleSelectMunicipio = (territory: Territory) => {
    setSelectedMuni(territory);
    setSearchTerm(territory.municipio);
    setIsOpen(false);
    setFocusedIndex(-1);
    onSelect(territory);
  };

  const handleClearSelection = () => {
    setSelectedMuni(null);
    setSearchTerm('');
    setIsOpen(true);
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filteredMunicipios.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredMunicipios.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredMunicipios.length) {
        handleSelectMunicipio(filteredMunicipios[focusedIndex]);
      } else if (filteredMunicipios.length > 0) {
        handleSelectMunicipio(filteredMunicipios[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[focusedIndex] as HTMLElement;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UF Selector */}
        <div className="md:col-span-1">
          <label
            htmlFor={ufInputId}
            className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
          >
            UF / Estado
          </label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none" />
            <select
              id={ufInputId}
              aria-label="UF"
              className="w-full appearance-none bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-9 pr-8 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 hover:border-white/20 transition-all cursor-pointer font-medium"
              value={uf}
              onChange={(e) => handleUfChange(e.target.value)}
            >
              <option value="">Selecione a UF</option>
              {ufs.map((ufCode) => (
                <option key={ufCode} value={ufCode}>
                  {ufCode} {UF_NAMES[ufCode] ? `— ${UF_NAMES[ufCode]}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Municipality Autocomplete */}
        <div className="md:col-span-2" ref={containerRef}>
          <label
            htmlFor={municipioInputId}
            className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between"
          >
            <span>Município</span>
            {uf && municipios.length > 0 && (
              <span className="text-[10px] text-cyan-400/80 font-normal">
                {municipios.length} municípios disponíveis
              </span>
            )}
          </label>
          <div className="relative">
            {loadingMunicipios ? (
              <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />
            ) : (
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            )}

            <input
              ref={inputRef}
              id={municipioInputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-label="Município"
              placeholder={!uf ? 'Selecione a UF primeiro' : loadingMunicipios ? 'Carregando municípios...' : 'Digite para pesquisar o município...'}
              disabled={!uf || loadingMunicipios}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
                setFocusedIndex(0);
                if (selectedMuni && e.target.value !== selectedMuni.municipio) {
                  setSelectedMuni(null);
                  onSelect(null);
                }
              }}
              onFocus={() => {
                if (uf && municipios.length > 0) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#0B0F19] border border-white/10 rounded-xl py-3 pl-9 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            />

            {/* Clear or Dropdown Toggle */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {selectedMuni ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-1 text-gray-400 hover:text-white rounded-md transition-colors"
                  title="Limpar seleção"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
                />
              )}
            </div>

            {/* Hidden native select for standard test suites compatibility */}
            <select
              aria-hidden="true"
              tabIndex={-1}
              className="sr-only"
              value={selectedMuni?.codigo_ibge ?? ''}
              onChange={(e) => {
                const found = municipios.find((m) => m.codigo_ibge === e.target.value);
                if (found) handleSelectMunicipio(found);
              }}
            >
              <option value="">Selecione o município</option>
              {municipios.map((m) => (
                <option key={m.codigo_ibge} value={m.codigo_ibge}>
                  {m.municipio}
                </option>
              ))}
            </select>
          </div>

          {/* Autocomplete Dropdown List */}
          {isOpen && uf && !loadingMunicipios && (
            <div className="relative z-50 mt-1.5 w-full bg-[#12192A] border border-cyan-500/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
              <ul
                ref={listRef}
                role="listbox"
                className="max-h-60 overflow-y-auto py-1.5 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10"
              >
                {filteredMunicipios.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-gray-400 italic text-center">
                    Nenhum município encontrado para &quot;{searchTerm}&quot;
                  </li>
                ) : (
                  filteredMunicipios.map((m, idx) => {
                    const isSelected = selectedMuni?.codigo_ibge === m.codigo_ibge;
                    const isFocused = idx === focusedIndex;

                    return (
                      <li
                        key={m.codigo_ibge}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectMunicipio(m)}
                        onMouseEnter={() => setFocusedIndex(idx)}
                        className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                            : isFocused
                            ? 'bg-white/10 text-white'
                            : 'text-gray-200 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className={isSelected ? 'text-cyan-400' : 'text-gray-500'} />
                          <span>{m.municipio}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 font-mono">IBGE: {m.codigo_ibge}</span>
                          {isSelected && <Check size={14} className="text-cyan-400" />}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
