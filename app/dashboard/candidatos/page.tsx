'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users, RefreshCw, Search, X, Filter } from 'lucide-react';
import CandidatoForm from '@/components/candidatos/CandidatoForm';
import CandidatoList from '@/components/candidatos/CandidatoList';
import { fetchTargets, type TargetWithAccounts } from '@/lib/queries/candidatos';

type View = 'list' | 'form';

export default function CandidatosPage() {
  const [view, setView] = useState<View>('list');
  const [targets, setTargets] = useState<TargetWithAccounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetWithAccounts | null>(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadTargets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchTargets();
      setTargets(data);
    } catch (err) {
      console.error('[CandidatosPage] loadTargets error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNewCandidato = () => {
    setEditingTarget(null);
    setView('form');
  };

  const handleEdit = (target: TargetWithAccounts) => {
    setEditingTarget(target);
    setView('form');
  };

  const handleFormSuccess = (action: 'created' | 'updated') => {
    console.log(`[CandidatosPage] Form success: ${action}`);
    // Small delay to let user see the success banner before switching views
    setTimeout(() => {
      setView('list');
      setEditingTarget(null);
      loadTargets(true);
    }, 1200);
  };

  const handleCancel = () => {
    setView('list');
    setEditingTarget(null);
  };

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = targets.filter((t) => {
    const matchSearch =
      !search ||
      t.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.state ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.keywords ?? '').toLowerCase().includes(search.toLowerCase());

    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active' && t.is_active) ||
      (filterActive === 'inactive' && !t.is_active);

    return matchSearch && matchActive;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: targets.length,
    active: targets.filter((t) => t.is_active).length,
    inactive: targets.filter((t) => !t.is_active).length,
    accounts: targets.reduce((acc, t) => acc + (t.social_accounts?.length ?? 0), 0),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {view === 'form'
              ? editingTarget
                ? `Editar: ${editingTarget.candidate_name}`
                : 'Novo Candidato'
              : 'Candidatos'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {view === 'form'
              ? 'Preencha os dados e contas sociais do candidato.'
              : 'Gerencie os candidatos monitorados pelo PolitixOS.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {view === 'list' && (
            <>
              <button
                id="refresh_candidatos"
                onClick={() => loadTargets(true)}
                disabled={refreshing}
                className="p-2.5 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                title="Atualizar lista"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                id="new_candidato"
                onClick={handleNewCandidato}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-all shadow-lg shadow-[#2563EB]/20"
              >
                <UserPlus size={16} />
                Novo Candidato
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats cards (only in list view) */}
      {view === 'list' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/5' },
            { label: 'Ativos', value: stats.active, color: 'text-green-400', bg: 'bg-green-500/5' },
            { label: 'Inativos', value: stats.inactive, color: 'text-gray-500', bg: 'bg-white/2' },
            { label: 'Contas Sociais', value: stats.accounts, color: 'text-[#00FFFF]', bg: 'bg-[#00FFFF]/5' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-4`}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form view */}
      {view === 'form' && (
        <CandidatoForm
          target={editingTarget}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Search + filter */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                id="search_candidatos"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, cidade, estado, palavras-chave..."
                className="w-full bg-[#12192A] border border-white/5 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB]/40 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 bg-[#12192A] border border-white/5 rounded-xl p-1">
              <Filter size={13} className="text-gray-500 ml-1" />
              {(['all', 'active', 'inactive'] as const).map((opt) => (
                <button
                  key={opt}
                  id={`filter_${opt}`}
                  onClick={() => setFilterActive(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterActive === opt
                      ? 'bg-[#2563EB] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {opt === 'all' ? 'Todos' : opt === 'active' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          {(search || filterActive !== 'all') && (
            <p className="text-gray-500 text-xs">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#12192A] border border-white/5 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-white/5 rounded-lg" />
                      <div className="h-3 w-32 bg-white/5 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <CandidatoList
              targets={filtered}
              onEdit={handleEdit}
              onRefresh={() => loadTargets(true)}
            />
          )}
        </>
      )}
    </div>
  );
}
