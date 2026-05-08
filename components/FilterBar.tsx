import { Calendar, Filter, MapPin, Target, Type } from 'lucide-react';

export default function FilterBar() {
  return (
    <div className="bg-[#12192A] border border-white/5 rounded-xl p-4 flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2 text-gray-400 border-r border-white/5 pr-4">
        <Filter size={18} />
        <span className="text-sm font-medium">Filtros</span>
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-3">
        {/* Candidato */}
        <div className="relative group">
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors" size={16} />
          <select className="appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-8 text-sm text-gray-300 focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer">
            <option value="">Candidato: Todos</option>
            <option value="candidato1">Carlos Eduardo</option>
            <option value="candidato2">Maria Silva</option>
          </select>
        </div>

        {/* Cidade */}
        <div className="relative group">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors" size={16} />
          <select className="appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-8 text-sm text-gray-300 focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer">
            <option value="">Cidade: Todas</option>
            <option value="sp">São Paulo</option>
            <option value="rj">Rio de Janeiro</option>
          </select>
        </div>

        {/* Fonte */}
        <div className="relative group">
          <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors" size={16} />
          <select className="appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-8 text-sm text-gray-300 focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer">
            <option value="">Fonte: Todas</option>
            <option value="g1">G1</option>
            <option value="folha">Folha de S.Paulo</option>
          </select>
        </div>

        {/* Data */}
        <div className="relative group">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00FFFF] transition-colors" size={16} />
          <select className="appearance-none bg-[#0D0D0D] border border-white/5 rounded-lg py-2 pl-9 pr-8 text-sm text-gray-300 focus:outline-none focus:border-[#00FFFF]/50 hover:border-white/10 transition-all cursor-pointer">
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      <button className="bg-[#2563EB] hover:bg-[#2563EB]/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
        Aplicar
      </button>
    </div>
  );
}
