'use client';

import { useState } from 'react';
import { Plus, Trash2, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  type TargetWithAccounts,
  type SocialAccountInput,
  type TargetInput,
} from '@/lib/queries/candidatos';
import { createCandidateAction, updateCandidateAction } from '@/lib/actions/candidatos';

// Social platform icons (SVG inline)
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" />
  </svg>
);
const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: InstagramIcon, color: '#E1306C' },
  { value: 'facebook', label: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
  { value: 'tiktok', label: 'TikTok', icon: TikTokIcon, color: '#69C9D0' },
  { value: 'youtube', label: 'YouTube', icon: YouTubeIcon, color: '#FF0000' },
];

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

interface NewSocialAccount extends SocialAccountInput {
  _tempId: string; // client-side ID for new accounts before save
  id?: string;     // real DB id for existing accounts
}

interface Props {
  target?: TargetWithAccounts | null;
  onSuccess: (action: 'created' | 'updated') => void;
  onCancel: () => void;
}

function generateTempId() {
  return `temp-${Math.random().toString(36).slice(2)}`;
}

export default function CandidatoForm({ target, onSuccess, onCancel }: Props) {
  const isEditing = !!target;

  const [form, setForm] = useState<TargetInput>({
    candidate_name: target?.candidate_name ?? '',
    city: target?.city ?? '',
    state: target?.state ?? '',
    keywords: target?.keywords ?? '',
    is_active: target?.is_active ?? true,
  });

  const [accounts, setAccounts] = useState<NewSocialAccount[]>(
    target?.social_accounts?.map((a) => ({
      _tempId: a.id,
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      profile_url: a.profile_url ?? '',
      is_active: a.is_active,
    })) ?? []
  );

  const [deletedAccountIds, setDeletedAccountIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  function validate() {
    const errs: Record<string, string> = {};

    if (!form.candidate_name.trim()) {
      errs.candidate_name = 'Nome do candidato é obrigatório.';
    }

    // Check duplicate handle+platform within the form
    const seen = new Set<string>();
    accounts.forEach((a, i) => {
      if (!a.platform) {
        errs[`account_${i}_platform`] = 'Selecione uma plataforma.';
      }
      if (!a.handle.trim()) {
        errs[`account_${i}_handle`] = 'Handle obrigatório.';
      }
      const key = `${a.platform}:${a.handle.trim().toLowerCase()}`;
      if (seen.has(key)) {
        errs[`account_${i}_handle`] = 'Handle duplicado para esta plataforma.';
      }
      seen.add(key);
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // -------------------------------------------------------------------------
  // Add / remove account rows
  // -------------------------------------------------------------------------
  function addAccount() {
    setAccounts((prev) => [
      ...prev,
      { _tempId: generateTempId(), platform: 'instagram', handle: '', profile_url: '', is_active: true },
    ]);
  }

  function removeAccount(tempId: string) {
    const acc = accounts.find((a) => a._tempId === tempId);
    if (acc?.id) {
      // Existing DB record — mark for deletion
      setDeletedAccountIds((prev) => [...prev, acc.id!]);
    }
    setAccounts((prev) => prev.filter((a) => a._tempId !== tempId));
  }

  function updateAccount(tempId: string, field: keyof SocialAccountInput, value: string | boolean) {
    setAccounts((prev) =>
      prev.map((a) => (a._tempId === tempId ? { ...a, [field]: value } : a))
    );
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    setFeedback(null);

    try {
      if (isEditing && target) {
        // 1. Prepare accounts for update
        const accountsToSave = accounts.map<SocialAccountInput>((a) => ({
          platform: a.platform,
          handle: a.handle.trim(),
          profile_url: a.profile_url,
          is_active: a.is_active,
        }));

        const result = await updateCandidateAction(target.id, form, accountsToSave, deletedAccountIds);

        if (!result.success) {
          throw new Error(result.error);
        }

        setFeedback({ type: 'success', message: 'Candidato atualizado com sucesso!' });
        onSuccess('updated');
      } else {
        // Create
        const accountsInput = accounts.map<SocialAccountInput>((a) => ({
          platform: a.platform,
          handle: a.handle.trim(),
          profile_url: a.profile_url,
          is_active: a.is_active,
        }));

        const result = await createCandidateAction(form, accountsInput);

        if (!result.success) {
          throw new Error(result.error);
        }

        setFeedback({ type: 'success', message: 'Candidato cadastrado com sucesso!' });
        onSuccess('created');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.';
      setFeedback({ type: 'error', message: `Erro ao salvar: ${msg}` });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${feedback.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {feedback.message}
        </div>
      )}

      {/* ── Dados do candidato ─────────────────────────────────────────── */}
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-5">
        <h3 className="text-white font-semibold text-base flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#2563EB]/20 text-[#2563EB] flex items-center justify-center text-xs font-bold border border-[#2563EB]/20">1</span>
          Dados do Candidato
        </h3>

        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
            Nome do candidato <span className="text-red-400">*</span>
          </label>
          <input
            id="candidate_name"
            type="text"
            value={form.candidate_name}
            onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
            placeholder="Ex: João da Silva"
            className={`w-full bg-[#0D0D0D] border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 transition-all ${errors.candidate_name ? 'border-red-500/50' : 'border-white/5 focus:border-[#2563EB]/50'
              }`}
          />
          {errors.candidate_name && (
            <p className="text-red-400 text-xs mt-1">{errors.candidate_name}</p>
          )}
        </div>

        {/* Cidade + Estado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Cidade
            </label>
            <input
              id="city"
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ex: São Paulo"
              className="w-full bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Estado
            </label>
            <select
              id="state"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">— Estado —</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Palavras-chave */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
            Palavras-chave
          </label>
          <input
            id="keywords"
            type="text"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            placeholder="Ex: saúde, educação, segurança (separadas por vírgula)"
            className="w-full bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]/50 transition-all"
          />
          <p className="text-gray-600 text-xs mt-1">Separe por vírgula para múltiplas palavras</p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <button
            id="toggle_is_active"
            type="button"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 ${form.is_active ? 'bg-[#2563EB]' : 'bg-white/10'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
          <span className={`text-sm font-medium ${form.is_active ? 'text-green-400' : 'text-gray-500'}`}>
            {form.is_active ? 'Candidato ativo' : 'Candidato inativo'}
          </span>
        </div>
      </section>

      {/* ── Contas sociais ─────────────────────────────────────────────── */}
      <section className="bg-[#12192A] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#2563EB]/20 text-[#2563EB] flex items-center justify-center text-xs font-bold border border-[#2563EB]/20">2</span>
            Contas Sociais
          </h3>
          <span className="text-gray-500 text-xs">{accounts.length} conta{accounts.length !== 1 ? 's' : ''}</span>
        </div>

        {accounts.length === 0 && (
          <div className="border border-dashed border-white/10 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-600">
            <Plus size={24} className="opacity-40" />
            <p className="text-sm">Nenhuma conta adicionada</p>
            <p className="text-xs">Clique em &quot;Adicionar conta&quot; para começar</p>
          </div>
        )}

        {accounts.map((acc, i) => {
          const platform = PLATFORMS.find((p) => p.value === acc.platform);
          const PlatformIcon = platform?.icon ?? InstagramIcon;

          return (
            <div
              key={acc._tempId}
              className="border border-white/5 rounded-xl p-4 space-y-3 bg-[#0D0D0D]/40 relative group"
            >
              {/* Header da conta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${platform?.color ?? '#555'}22`, color: platform?.color ?? '#aaa' }}
                  >
                    <PlatformIcon />
                  </span>
                  <span className="text-white text-sm font-medium">
                    {platform?.label ?? 'Conta'} #{i + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle ativo */}
                  <button
                    type="button"
                    id={`toggle_account_${i}_active`}
                    onClick={() => updateAccount(acc._tempId, 'is_active', !acc.is_active)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${acc.is_active ? 'bg-[#2563EB]' : 'bg-white/10'
                      }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${acc.is_active ? 'translate-x-5' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <span className={`text-xs ${acc.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                    {acc.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                  <button
                    type="button"
                    id={`remove_account_${i}`}
                    onClick={() => removeAccount(acc._tempId)}
                    className="ml-2 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Remover conta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Plataforma */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                    Plataforma <span className="text-red-400">*</span>
                  </label>
                  <select
                    id={`account_${i}_platform`}
                    value={acc.platform}
                    onChange={(e) => updateAccount(acc._tempId, 'platform', e.target.value)}
                    className={`w-full bg-[#0D0D0D] border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 transition-all appearance-none cursor-pointer ${errors[`account_${i}_platform`] ? 'border-red-500/50' : 'border-white/5 focus:border-[#2563EB]/50'
                      }`}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {errors[`account_${i}_platform`] && (
                    <p className="text-red-400 text-xs mt-1">{errors[`account_${i}_platform`]}</p>
                  )}
                </div>

                {/* Handle */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                    Handle (@) <span className="text-red-400">*</span>
                  </label>
                  <input
                    id={`account_${i}_handle`}
                    type="text"
                    value={acc.handle}
                    onChange={(e) => updateAccount(acc._tempId, 'handle', e.target.value)}
                    placeholder="@usuario"
                    className={`w-full bg-[#0D0D0D] border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 transition-all ${errors[`account_${i}_handle`] ? 'border-red-500/50' : 'border-white/5 focus:border-[#2563EB]/50'
                      }`}
                  />
                  {errors[`account_${i}_handle`] && (
                    <p className="text-red-400 text-xs mt-1">{errors[`account_${i}_handle`]}</p>
                  )}
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                    URL do perfil
                  </label>
                  <input
                    id={`account_${i}_url`}
                    type="url"
                    value={acc.profile_url}
                    onChange={(e) => updateAccount(acc._tempId, 'profile_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#0D0D0D] border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]/50 transition-all"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão Adicionar conta */}
        <button
          type="button"
          id="add_social_account"
          onClick={addAccount}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2563EB]/30 rounded-xl text-[#2563EB] hover:bg-[#2563EB]/5 hover:border-[#2563EB]/50 transition-all text-sm font-medium"
        >
          <Plus size={16} />
          Adicionar conta
        </button>
      </section>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          id="cancel_form"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium disabled:opacity-50"
        >
          <X size={16} />
          Cancelar
        </button>
        <button
          type="button"
          id="save_candidato"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#2563EB]/20"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              {isEditing ? 'Salvar alterações' : 'Cadastrar candidato'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
