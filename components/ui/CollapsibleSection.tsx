'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Seção recolhível genérica — usada para agrupar análises complementares sem
 * removê-las. Fechada por padrão: altura pequena (ícone + título + descrição
 * curta), sem parecer um bloco perdido.
 *
 * Sprint UX — Etapa 6: abertura animada via transição de `max-height` +
 * opacidade (o truque de `grid-template-rows: 0fr → 1fr` foi testado
 * primeiro, mas o `1fr` não resolvia para a altura do conteúdo neste
 * layout — confirmado via inspeção ao vivo — por isso a troca para uma
 * técnica mais robusta). `children` continua montado o tempo todo: Server
 * Components assíncronos passados como `children` já são resolvidos no
 * servidor independente do estado `open`, que só controla a apresentação
 * no cliente — não há refetch nem atraso adicional ao abrir.
 */
export default function CollapsibleSection({ icon, title, subtitle, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="surface-muted overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-400/60"
      >
        {icon && (
          <span className="text-slate-500 shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-white font-bold text-sm tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown size={18} className={`text-slate-500 shrink-0 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${open ? 'max-h-[6000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-white/5">{children}</div>
      </div>
    </section>
  );
}
