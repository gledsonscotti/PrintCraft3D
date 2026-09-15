import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  X,
  Mail,
  Phone,
  Key,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Building2,
  Check,
  Lock,
  Eye
} from 'lucide-react';
import { AppUser, AppUserRole, AppUserStatus } from '../types';

interface CompanyTeamViewProps {
  companyId: string;
  companyName: string;
  isSuperadmin?: boolean;
  currentUser?: AppUser | null;
  theme?: string;
}

interface ModuleOption {
  key: string;
  label: string;
  description: string;
}

const AVAILABLE_MODULES: ModuleOption[] = [
  { key: 'analyzer', label: 'Analisador 3D', description: 'Upload de STL/OBJ, visualizador 3D e estimativas' },
  { key: 'calculator', label: 'Calculadora de Custos', description: 'Cálculo de custos de impressão, hora-máquina e orçamentos' },
  { key: 'products', label: 'Catálogo de Produtos', description: 'Gestão de modelos, itens cadastrados e fichas técnicas' },
  { key: 'clients', label: 'Pessoas (Clientes & Equipe)', description: 'Cadastro e histórico de clientes e gestão da equipe' },
  { key: 'stock', label: 'Estoque de Insumos', description: 'Filamentos, resinas, bicos, peças e componentes' },
  { key: 'production', label: 'PCP & Produção', description: 'Fila de impressão, ordens de serviço (OPs) e status de máquinas' },
  { key: 'sales', label: 'Vendas & Faturamento', description: 'Registro de vendas, expedição e relatórios financeiros' },
  { key: 'settings', label: 'Ajustes do Sistema', description: 'Parâmetros de energia, depreciação e padrões da oficina' },
];

export const CompanyTeamView: React.FC<CompanyTeamViewProps> = ({
  companyId,
  companyName,
  isSuperadmin = false,
  currentUser,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{
    id: string;
    name: string;
    plan_name: string;
    max_users: number;
    used_users: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for creating / editing user
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<AppUserRole>('operator');
  const [formStatus, setFormStatus] = useState<AppUserStatus>('active');
  const [formPermissions, setFormPermissions] = useState<string[]>(['production', 'stock']);
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const activeUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('printcraft_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const canManageTeam = isSuperadmin || activeUser?.role === 'admin' || activeUser?.role === 'superadmin';

  const loadCompanyUsers = async () => {
    const targetId = companyId || (isSuperadmin ? 'superadmin' : 'comp-1');
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/company/${targetId}/users`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao carregar usuários da empresa.');
      }
      const data = await res.json();
      setUsers(data.users || []);
      setCompanyInfo(data.company || null);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Erro ao buscar equipe.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyUsers();
    setFeedback(null);
  }, [companyId, isSuperadmin]);

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole('operator');
    setFormStatus('active');
    setFormPermissions(['production', 'stock']);
    setIsUserFormOpen(true);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUserId(u.id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPhone(u.phone || '');
    setFormPassword(''); // leave blank unless changing
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormPermissions(u.permissions || []);
    setIsUserFormOpen(true);
  };

  const handleTogglePermission = (permKey: string) => {
    if (formPermissions.includes('all')) {
      setFormPermissions(AVAILABLE_MODULES.map(m => m.key).filter(k => k !== permKey));
      return;
    }
    if (formPermissions.includes(permKey)) {
      setFormPermissions(formPermissions.filter(p => p !== permKey));
    } else {
      setFormPermissions([...formPermissions, permKey]);
    }
  };

  const handleSelectAllPermissions = () => {
    if (formPermissions.length === AVAILABLE_MODULES.length || formPermissions.includes('all')) {
      setFormPermissions([]);
    } else {
      setFormPermissions(AVAILABLE_MODULES.map(m => m.key));
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Nome e E-mail são obrigatórios.');
      return;
    }

    if (!editingUserId && (!formPassword || formPassword.length < 4)) {
      alert('A senha de acesso deve ter pelo menos 4 caracteres.');
      return;
    }

    const targetId = companyId || (isSuperadmin ? 'superadmin' : 'comp-1');

    setIsSaving(true);
    setFeedback(null);

    try {
      if (editingUserId) {
        // Update user
        const body: any = {
          name: formName.trim(),
          phone: formPhone.trim(),
          role: formRole,
          status: formStatus,
          permissions: formRole === 'admin' ? ['all'] : formPermissions,
        };
        if (formPassword.trim()) {
          body.password = formPassword.trim();
        }

        const res = await fetch(`/api/company/${targetId}/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro ao atualizar dados do usuário.');
        }

        setFeedback({ type: 'success', message: 'Dados e permissões do usuário atualizados com sucesso!' });
      } else {
        // Create user
        const res = await fetch(`/api/company/${targetId}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            password: formPassword.trim(),
            phone: formPhone.trim(),
            role: formRole,
            permissions: formRole === 'admin' ? ['all'] : formPermissions,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro ao adicionar usuário na empresa.');
        }

        setFeedback({ type: 'success', message: 'Novo membro adicionado com sucesso!' });
      }

      setIsUserFormOpen(false);
      loadCompanyUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUserConfirmed = async () => {
    if (!userToDelete) return;

    const isSelf = Boolean(
      (activeUser?.id && userToDelete.id === activeUser.id) ||
      (activeUser?.email && userToDelete.email && userToDelete.email.trim().toLowerCase() === activeUser.email.trim().toLowerCase())
    );

    if (isSelf) {
      alert('Você não pode excluir sua própria conta enquanto estiver conectado ao sistema.');
      setUserToDelete(null);
      return;
    }

    const targetId = companyId || (isSuperadmin ? 'superadmin' : 'comp-1');

    try {
      const res = await fetch(`/api/company/${targetId}/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao remover usuário.');
      }
      setFeedback({ type: 'success', message: `Usuário "${userToDelete.name}" removido com sucesso.` });
      setUserToDelete(null);
      loadCompanyUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar usuário.');
    }
  };

  const isQuotaReached = companyInfo
    ? companyInfo.max_users !== -1 && companyInfo.used_users >= companyInfo.max_users
    : false;

  return (
    <div className="space-y-5">
      {/* Header & Plan Capacity Bento Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#131316] border border-white/[0.08] p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Equipe & Operadores da Oficina</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {companyName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cadastre operadores, defina senhas e configure quais módulos cada colaborador tem permissão para acessar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {companyInfo && (
            <div className="flex items-center gap-2 text-xs bg-[#0A0A0B] border border-white/[0.08] px-3 py-1.5 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{companyInfo.plan_name}:</span>
              </div>
              <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                isQuotaReached
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {companyInfo.used_users} de {companyInfo.max_users === -1 ? 'Ilimitados' : companyInfo.max_users} membros
              </span>
            </div>
          )}

          {canManageTeam && (
            <button
              id="btn-add-team-member"
              type="button"
              onClick={openCreateModal}
              disabled={isQuotaReached && !isSuperadmin}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Membro</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission Notice if Operator */}
      {!canManageTeam && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
          <Eye className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Modo de visualização: Apenas administradores da empresa têm permissão para cadastrar ou editar operadores da equipe.</span>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quota reached notice */}
      {isQuotaReached && (
        <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Limite de equipe atingido:</strong> Seu plano atual ({companyInfo?.plan_name}) atingiu o limite contratado de operadores. Para cadastrar novos membros, solicite um upgrade de plano ao suporte ou administrador.
          </span>
        </div>
      )}

      {/* Team Members List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 bg-[#131316] border border-white/[0.08] rounded-2xl">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Carregando membros da equipe da empresa...
        </div>
      ) : users.length === 0 ? (
        <div className="py-14 text-center space-y-2.5 bg-[#131316] border border-white/[0.08] rounded-2xl p-6">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Nenhum operador adicional cadastrado</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cadastre membros da sua equipe para liberar acesso controlado aos módulos de produção, estoque e vendas.
          </p>
          {canManageTeam && (
            <button
              onClick={openCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Adicionar Primeiro Membro
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((u) => {
            const isAdmin = u.role === 'admin';
            const isSuperadminUser = u.role === 'superadmin';
            const isSelf = Boolean(
              (activeUser?.id && u.id === activeUser.id) ||
              (activeUser?.email && u.email && u.email.trim().toLowerCase() === activeUser.email.trim().toLowerCase())
            );
            const hasAllPerms = isAdmin || isSuperadminUser || (u.permissions && u.permissions.includes('all'));
            // An administrator can remove another administrator or team member, as long as the user being deleted is not currently logged in (not self)
            const canDeleteThisUser = canManageTeam && !isSelf && (!isSuperadminUser || isSuperadmin);

            return (
              <div
                key={u.id}
                className="bg-[#131316] border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 flex flex-col justify-between transition space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white">{u.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAdmin
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {isAdmin ? 'Admin da Oficina' : u.role.toUpperCase()}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                              Sua Conta (Logado)
                            </span>
                          )}
                          {u.company_name && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {u.company_name}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            u.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {u.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{u.email}</span>
                          </span>
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{u.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modules Pills */}
                  <div className="pt-2 border-t border-white/[0.06] text-xs">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1.5">Permissões de Módulo:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {hasAllPerms ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                          Acesso Total a Todos os Módulos
                        </span>
                      ) : u.permissions && u.permissions.length > 0 ? (
                        u.permissions.map((pk) => {
                          const mod = AVAILABLE_MODULES.find(m => m.key === pk);
                          return (
                            <span
                              key={pk}
                              className="text-[10px] font-medium px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-md"
                            >
                              {mod ? mod.label : pk}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] italic text-rose-400">
                          Nenhum módulo liberado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                {canManageTeam && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Editar</span>
                    </button>
                    {canDeleteThisUser ? (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs rounded-lg border border-rose-500/20 flex items-center gap-1.5 transition cursor-pointer"
                        title={isAdmin ? "Excluir Administrador não conectado" : "Excluir membro da equipe"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    ) : isSelf ? (
                      <span className="text-[11px] text-slate-500 italic px-2 py-1 select-none">
                        (Conta em uso)
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add or Edit Team Member */}
      {isUserFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-[#131316] border border-white/[0.1] rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  {editingUserId ? 'Editar Membro da Equipe' : 'Cadastrar Novo Membro da Equipe'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Operador <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ex: Lucas Lima"
                    required
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail de Acesso <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="lucas@oficina.com"
                    disabled={Boolean(editingUserId)}
                    required
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingUserId ? 'Nova Senha (opcional)' : 'Senha Provisória'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUserId ? 'Deixe em branco para manter' : 'Mínimo 4 caracteres'}
                    required={!editingUserId}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/[0.08]">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Função / Cargo
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as AppUserRole)}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                  >
                    <option value="operator">Operador (Acesso personalizado)</option>
                    <option value="admin">Administrador da Empresa (Acesso Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status da Conta
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AppUserStatus)}
                    className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                  >
                    <option value="active">Ativo (Permitir Login)</option>
                    <option value="inactive">Inativo (Bloquear Temporariamente)</option>
                  </select>
                </div>
              </div>

              {/* Module Permissions Checklist */}
              {formRole !== 'admin' ? (
                <div className="pt-2 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Módulos Permitidos para Este Operador:
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      {formPermissions.length === AVAILABLE_MODULES.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {AVAILABLE_MODULES.map((m) => {
                      const isChecked = formPermissions.includes(m.key) || formPermissions.includes('all');
                      return (
                        <label
                          key={m.key}
                          onClick={() => handleTogglePermission(m.key)}
                          className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center border transition shrink-0 ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'border-white/20 bg-transparent'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-semibold block">{m.label}</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">{m.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-2 text-xs text-purple-300">
                  <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Administradores da empresa possuem acesso irrestrito a todos os módulos e recursos.</span>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(false)}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editingUserId ? 'Salvar Alterações' : 'Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131316] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {userToDelete.role === 'admin' ? 'Remover Administrador?' : 'Remover Membro da Equipe?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {userToDelete.role === 'admin'
                    ? 'Este administrador não está atualmente logado. A conta e credenciais serão permanentemente excluídas.'
                    : 'Esta ação revogará imediatamente o acesso do colaborador à oficina.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white font-medium flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200">{userToDelete.name}</span>
                <span className="text-slate-400 text-[11px] block">{userToDelete.email}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                userToDelete.role === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {userToDelete.role === 'admin' ? 'Admin da Oficina' : userToDelete.role.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUserConfirmed}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
