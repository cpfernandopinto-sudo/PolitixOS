'use client';

import { useState, useCallback } from 'react';
import {
  Edit2, Power, PowerOff,
  ChevronDown, ChevronUp, ExternalLink, Users, Wifi, WifiOff,
} from 'lucide-react';
import {
  toggleTargetActive,
  toggleSocialAccountActive,
  type TargetWithAccounts,
} from '@/lib/queries/candidatos';

// Social platform icons (SVG inline)
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
  </svg>
);
const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const PLATFORM_META: Record<string, { label: string; icon: React.FC; color: string }> = {
  instagram: { label: 'Instagram', icon: InstagramIcon, color: '#E1306C' },
  facebook: { label: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
  tiktok: { label: 'TikTok', icon: TikTokIcon, color: '#69C9D0' },
  youtube: { label: 'YouTube', icon: YouTubeIcon, color: '#FF0000' },
};

interface Props {
  targets: TargetWithAccounts[];
  onEdit: (target: TargetWithAccounts) => void;
  onRefresh: () => void;
}

export default function CandidatoList({ targets, onEdit, onRefresh }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTarget = useCallback(async (id: string, currentActive: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(id));
    try {
      await toggleTargetActive(id, !currentActive);
      onRefresh();
    } catch (err) {
      console.error('[CandidatoList] toggleTarget error:', err);
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [onRefresh]);

  const handleToggleAccount = useCallback(async (accountId: string, currentActive: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(accountId));
    try {
      await toggleSocialAccountActive(accountId, !currentActive);
      onRefresh();
    } catch (err) {
      console.error('[CandidatoList] toggleAccount error:', err);
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(accountId); return s; });
    }
  }, [onRefresh]);

  if (targets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-600">
        <Users size={48} className="opacity-20" />
        <p className="text-lg font-medium text-gray-500">Nenhum candidato cadastrado</p>
        <p className="text-sm text-gray-600">Clique em &quot;Novo Candidato&quot; para começar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {targets.map((t) => {
        const isExpanded = expandedIds.has(t.id);
        const isToggling = togglingIds.has(t.id);
        const accountCount = t.social_accounts?.length ?? 0;
        const activeAccounts = t.social_accounts?.filter((a) => a.is_active).length ?? 0;

        return (
          <div
            key={t.id}
            className={`bg-[#12192A] border rounded-2xl overflow-hidden transition-all ${
              t.is_active ? 'border-white/5' : 'border-white/5 opacity-60'
            }`}
          >
            {/* Cabeçalho do candidato */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm border ${
                  t.is_active
                    ? 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/20'
                    : 'bg-white/5 text-gray-500 border-white/5'
                }`}>
                  {t.candidate_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-semibold text-sm truncate">{t.candidate_name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      t.is_active
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`}>
                      {t.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {(t.city || t.state) && (
                      <span className="text-gray-500 text-xs truncate">
                        {[t.city, t.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    <span className="text-gray-600 text-xs">
                      {activeAccounts}/{accountCount} conta{accountCount !== 1 ? 's' : ''} ativas
                    </span>
                    {t.keywords && (
                      <span className="text-[#00FFFF]/50 text-xs truncate max-w-[200px]">
                        {t.keywords}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Platform badges */}
              <div className="hidden md:flex items-center gap-1.5 mx-4">
                {(t.social_accounts ?? []).map((acc) => {
                  const meta = PLATFORM_META[acc.platform];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <span
                      key={acc.id}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
                      style={{
                        backgroundColor: `${meta.color}22`,
                        color: acc.is_active ? meta.color : '#555',
                        opacity: acc.is_active ? 1 : 0.4,
                      }}
                      title={`${meta.label}: ${acc.handle}`}
                    >
                      <Icon />
                    </span>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  id={`edit_target_${t.id}`}
                  onClick={() => onEdit(t)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Editar candidato"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  id={`toggle_target_${t.id}`}
                  onClick={() => handleToggleTarget(t.id, t.is_active)}
                  disabled={isToggling}
                  className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                    t.is_active
                      ? 'text-green-400 hover:text-red-400 hover:bg-red-400/10'
                      : 'text-gray-500 hover:text-green-400 hover:bg-green-400/10'
                  }`}
                  title={t.is_active ? 'Desativar candidato' : 'Ativar candidato'}
                >
                  {t.is_active ? <Power size={15} /> : <PowerOff size={15} />}
                </button>
                <button
                  id={`expand_target_${t.id}`}
                  onClick={() => toggleExpand(t.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                  title={isExpanded ? 'Recolher' : 'Expandir contas'}
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {/* Contas sociais expandidas */}
            {isExpanded && (
              <div className="border-t border-white/5 px-5 pb-4 pt-3 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Contas Sociais</p>

                {(t.social_accounts ?? []).length === 0 && (
                  <p className="text-gray-600 text-sm py-2">Nenhuma conta social cadastrada.</p>
                )}

                {(t.social_accounts ?? []).map((acc) => {
                  const meta = PLATFORM_META[acc.platform];
                  const Icon = meta?.icon ?? InstagramIcon;
                  const isAccToggling = togglingIds.has(acc.id);

                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                        acc.is_active
                          ? 'border-white/5 bg-white/2'
                          : 'border-white/5 bg-transparent opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${meta?.color ?? '#555'}22`, color: meta?.color ?? '#aaa' }}
                        >
                          <Icon />
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium">{acc.handle}</p>
                          <p className="text-gray-500 text-xs capitalize">{meta?.label ?? acc.platform}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {acc.profile_url && (
                          <a
                            href={acc.profile_url}
                            target="_blank"
                            rel="noreferrer"
                            id={`open_account_${acc.id}`}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-all"
                            title="Abrir perfil"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          id={`toggle_account_${acc.id}`}
                          onClick={() => handleToggleAccount(acc.id, acc.is_active)}
                          disabled={isAccToggling}
                          className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${
                            acc.is_active
                              ? 'text-green-400 hover:text-red-400 hover:bg-red-400/10'
                              : 'text-gray-500 hover:text-green-400 hover:bg-green-400/10'
                          }`}
                          title={acc.is_active ? 'Desativar conta' : 'Ativar conta'}
                        >
                          {acc.is_active ? <Wifi size={13} /> : <WifiOff size={13} />}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          acc.is_active
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                        }`}>
                          {acc.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
