import { MapPinOff } from 'lucide-react';

export default function TerritoryEmptyState() {
  return (
    <div className="bg-[#12192A] border border-white/5 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center">
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <MapPinOff size={22} className="text-gray-500" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <p className="text-white font-semibold">Base territorial ainda não inicializada.</p>
        <p className="text-gray-400 text-sm">
          Nenhum município foi carregado no catálogo territorial ainda. A seleção de UF e Município
          ficará disponível assim que a base for populada por uma fonte oficial (IBGE).
        </p>
      </div>
    </div>
  );
}
