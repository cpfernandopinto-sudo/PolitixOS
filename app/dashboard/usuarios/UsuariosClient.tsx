'use client';

import { useState, useActionState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Power,
  Key,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AppUser, UserFormState } from '@/lib/auth/types';
import { ALL_SCREENS } from '@/lib/auth/types';
import {
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  changePasswordAction,
  getUserWithRelations,
} from '@/lib/auth/actions';


// ─── Types ────────────────────────────────────────────────────────────────────

interface TargetOption {
  id: string;
  name: string;
}

interface Props {
  initialUsers: AppUser[];
  targets: TargetOption[];
}

// ─── Screen labels ────────────────────────────────────────────────────────────

const SCREEN_LABELS: Record<string, string> = {
  dashboard: 'Visão Geral',
  noticias: 'Radar de Notícias',
  instagram: 'Radar Instagram',
  x: 'Radar X',
  candidatos: 'Candidatos',
  automacoes: 'Automações',
  gestao_crise: 'Gestão de Crise',
  apoiadores: 'Apoiadores',
  configuracoes: 'Configurações',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  visualizador: 'Visualizador',
};

const ROLE_COLOR: Record<string, string> = {
  admin: 'text-[#2563EB] bg-blue-500/10 border-blue-500/30',
  gestor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  visualizador: 'text-gray-400 bg-white/5 border-white/10',
};

// ─── User Form Modal ──────────────────────────────────────────────────────────

interface UserFormProps {
  editUserId?: string;
  targets: TargetOption[];
  onClose: () => void;
  onSuccess: () => void;
}

function UserFormModal({ editUserId, targets, onClose, onSuccess }: UserFormProps) {
  const isEdit = !!editUserId;

  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    role: string;
  }>({ name: '', email: '', role: 'gestor' });

  // Load existing data for edit
  useEffect(() => {
    if (!editUserId) return;
    getUserWithRelations(editUserId).then((result) => {
      if (!result) return;
      setFormData({
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      });
      setIsActive(result.user.is_active);
      setSelectedTargets(result.targetIds);
      setSelectedScreens(result.permissionKeys);
      setLoading(false);
    });
  }, [editUserId]);

  const [state, formAction, isPending] = useActionState<UserFormState | undefined, FormData>(
    isEdit ? updateUserAction : createUserAction,
    undefined
  );

  // On success, close and refresh
  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  const toggleTarget = (id: string) =>
    setSelectedTargets((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const toggleScreen = (key: string) =>
    setSelectedScreens((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#12192A] rounded-2xl p-8 border border-white/10 flex items-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form
          action={(fd) => {
            // Inject multi-value fields and booleans
            selectedTargets.forEach((tid) => fd.append('target_ids', tid));
            selectedScreens.forEach((sk) => fd.append('screen_keys', sk));
            fd.set('is_active', String(isActive));
            if (isEdit) fd.set('user_id', editUserId!);
            formAction(fd);
          }}
          className="p-6 space-y-6"
        >
          {state?.error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{state.error}</p>
            </div>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome *</label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">E-mail *</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Senha {isEdit ? '(deixe em branco para não alterar)' : '*'}
            </label>
            <input
              name="password"
              type="password"
              required={!isEdit}
              minLength={isEdit ? undefined : 6}
              placeholder={isEdit ? '••••••' : 'Mínimo 6 caracteres'}
              className="w-full bg-[#12192A] border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all"
            />
          </div>

          {/* Role + IsActive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Perfil *</label>
              <select
                name="role"
                value={formData.role}
                onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-[#12192A] border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#2563EB]/50 transition-all"
              >
                <option value="admin">Administrador</option>
                <option value="gestor">Gestor</option>
                <option value="visualizador">Visualizador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all ${isActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
              >
                <span>{isActive ? 'Ativo' : 'Inativo'}</span>
                <Power size={16} />
              </button>
            </div>
          </div>

          {/* Candidatos permitidos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Candidatos Permitidos
              <span className="ml-2 text-xs text-gray-500">(Admin vê todos automaticamente)</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTarget(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${selectedTargets.includes(t.id)
                    ? 'bg-[#2563EB]/10 border-blue-500/30 text-[#2563EB]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedTargets.includes(t.id)
                      ? 'bg-[#2563EB] border-[#2563EB]'
                      : 'border-white/20'
                      }`}
                  >
                    {selectedTargets.includes(t.id) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Telas permitidas */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Telas Permitidas
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SCREENS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleScreen(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${selectedScreens.includes(key)
                    ? 'bg-[#2563EB]/10 border-blue-500/30 text-[#2563EB]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedScreens.includes(key)
                      ? 'bg-[#2563EB] border-[#2563EB]'
                      : 'border-white/20'
                      }`}
                  >
                    {selectedScreens.includes(key) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="truncate">{SCREEN_LABELS[key] ?? key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-60 text-white font-medium transition-all"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = fd.get('password') as string;
    const pw2 = fd.get('password2') as string;
    if (pw !== pw2) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    setError(undefined);
    const result = await changePasswordAction(userId, pw);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Alterar Senha — {userName}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-sm">Senha alterada com sucesso!</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nova Senha *</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full bg-[#12192A] border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha *</label>
            <input
              name="password2"
              type="password"
              required
              className="w-full bg-[#12192A] border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB]/50 transition-all"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-60 text-white font-medium transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsuariosClient({ initialUsers, targets }: Props) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [pwUserId, setPwUserId] = useState<string | undefined>();
  const [pwUserName, setPwUserName] = useState<string>('');
  const [toggling, setToggling] = useState<string | null>(null);

  const reloadUsers = async () => {
    // Refetch via server action is tricky in client; use router.refresh approach or re-fetch
    window.location.reload();
  };

  const handleToggle = async (user: AppUser) => {
    setToggling(user.id);
    await toggleUserActiveAction(user.id, !user.is_active);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    );
    setToggling(null);
  };

  return (
    <>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <Shield size={24} className="text-[#2563EB]" />
              Gestão de Usuários
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Controle de acesso multiusuário da plataforma.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            id="btn-novo-usuario"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            <Plus size={18} />
            Novo Usuário
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: users.length, color: 'text-white' },
            { label: 'Ativos', value: users.filter((u) => u.is_active).length, color: 'text-emerald-400' },
            { label: 'Inativos', value: users.filter((u) => !u.is_active).length, color: 'text-gray-500' },
            { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, color: 'text-[#2563EB]' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#12192A] border border-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#12192A] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Usuário</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Perfil</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Criado em</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhum usuário cadastrado. Clique em &quot;Novo Usuário&quot; para começar.
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLOR[user.role]}`}
                      >
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.is_active
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-gray-500 bg-white/5 border-white/10'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-gray-600'}`}
                        />
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Edit */}
                        <button
                          onClick={() => setEditId(user.id)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        {/* Change Password */}
                        <button
                          onClick={() => {
                            setPwUserId(user.id);
                            setPwUserName(user.name);
                          }}
                          title="Alterar Senha"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#00FFFF] hover:bg-[#00FFFF]/10 transition-colors"
                        >
                          <Key size={15} />
                        </button>
                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={toggling === user.id}
                          title={user.is_active ? 'Desativar' : 'Ativar'}
                          className={`p-1.5 rounded-lg transition-colors ${user.is_active
                            ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                        >
                          {toggling === user.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Power size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <UserFormModal
          targets={targets}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            reloadUsers();
          }}
        />
      )}
      {editId && (
        <UserFormModal
          editUserId={editId}
          targets={targets}
          onClose={() => setEditId(undefined)}
          onSuccess={() => {
            setEditId(undefined);
            reloadUsers();
          }}
        />
      )}
      {pwUserId && (
        <ChangePasswordModal
          userId={pwUserId}
          userName={pwUserName}
          onClose={() => { setPwUserId(undefined); setPwUserName(''); }}
        />
      )}
    </>
  );
}
