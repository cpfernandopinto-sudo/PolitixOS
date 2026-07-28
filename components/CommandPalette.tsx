'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Newspaper, UserPlus, Zap, FileSearch, UserCog, User, Loader2 } from 'lucide-react';
import { searchCandidatesAction, type SearchCandidateResult } from '@/lib/actions/search';

export const OPEN_COMMAND_PALETTE_EVENT = 'politixos:open-command-palette';

export interface CommandPalettePermissions {
  role: string;
  permissions: string[];
}

interface NavCommand {
  href: string;
  label: string;
  screenKey: string;
  icon: React.ReactNode;
}

const NAV_COMMANDS: NavCommand[] = [
  { href: '/dashboard/overview', label: 'Visão Geral', screenKey: 'dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/dashboard/noticias', label: 'Radar de Notícias', screenKey: 'noticias', icon: <Newspaper size={16} /> },
  { href: '/dashboard/instagram', label: 'Radar Instagram', screenKey: 'instagram', icon: <Newspaper size={16} /> },
  { href: '/dashboard/x', label: 'Radar X', screenKey: 'x', icon: <Newspaper size={16} /> },
  { href: '/dashboard/investigacoes', label: 'Investigações', screenKey: 'investigacoes', icon: <FileSearch size={16} /> },
  { href: '/dashboard/candidatos', label: 'Candidatos', screenKey: 'candidatos', icon: <UserPlus size={16} /> },
  { href: '/dashboard/automacoes', label: 'Automação', screenKey: 'automacoes', icon: <Zap size={16} /> },
  { href: '/dashboard/usuarios', label: 'Usuários', screenKey: 'usuarios', icon: <UserCog size={16} /> },
];

export default function CommandPalette({ permissions }: { permissions: CommandPalettePermissions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<SearchCandidateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = permissions.role === 'admin';
  const canSee = (screenKey: string) => {
    if (screenKey === 'usuarios') return isAdmin;
    return isAdmin || permissions.permissions.includes(screenKey);
  };

  const navResults = NAV_COMMANDS.filter(
    (cmd) => canSee(cmd.screenKey) && cmd.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const totalResults = navResults.length + candidates.length;

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setCandidates([]);
    setActiveIndex(0);
  }, []);

  // Ctrl+K / Cmd+K global + botão do cabeçalho
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setCandidates([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Busca de candidatos com debounce — não busca a cada tecla.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCandidatesAction(trimmed);
        setCandidates(results);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const goToNav = (cmd: NavCommand) => {
    router.push(cmd.href);
    close();
  };

  const goToCandidate = (candidate: SearchCandidateResult) => {
    router.push(`/dashboard/overview?candidate=${encodeURIComponent(candidate.id)}`);
    close();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (totalResults === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % totalResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + totalResults) % totalResults);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex < navResults.length) {
        goToNav(navResults[activeIndex]);
      } else {
        const candidate = candidates[activeIndex - navResults.length];
        if (candidate) goToCandidate(candidate);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-xl bg-[#12192A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar módulos ou candidatos…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          {loading && <Loader2 size={14} className="animate-spin text-gray-500 shrink-0" />}
          <kbd className="hidden sm:inline text-[10px] text-gray-500 border border-white/10 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {navResults.length > 0 && (
            <div className="mb-2">
              <p className="px-4 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Navegação</p>
              {navResults.map((cmd, i) => (
                <button
                  key={cmd.href}
                  type="button"
                  onClick={() => goToNav(cmd)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                    activeIndex === i ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {cmd.icon}
                  {cmd.label}
                </button>
              ))}
            </div>
          )}

          {candidates.length > 0 && (
            <div>
              <p className="px-4 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Candidatos</p>
              {candidates.map((candidate, i) => {
                const idx = navResults.length + i;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => goToCandidate(candidate)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      activeIndex === idx ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <User size={16} className="shrink-0 text-gray-500" />
                    <span className="truncate">{candidate.name}</span>
                    {candidate.city && <span className="text-xs text-gray-600 ml-auto shrink-0">{candidate.city}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {query.trim().length >= 2 && !loading && totalResults === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Nenhum resultado para &quot;{query}&quot;.</p>
          )}

          {query.trim().length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-gray-600">
              Digite para buscar módulos ou candidatos. Use ↑ ↓ para navegar e Enter para abrir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
