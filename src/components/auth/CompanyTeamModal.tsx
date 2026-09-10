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
  Lock,
  Building2,
  Check,
  Zap,
  Sliders,
  Sparkles
} from 'lucide-react';
import { AppUser, AppUserRole, AppUserStatus } from '../../types';

interface CompanyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  isSuperadmin?: boolean;
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
  { key: 'clients', label: 'Clientes & CRM', description: 'Cadastro e histórico de clientes e pedidos' },
  { key: 'stock', label: 'Estoque de Insumos', description: 'Filamentos, resinas, bicos, peças e componentes' },
  { key: 'production', label: 'PCP & Produção', description: 'Fila de impressão, ordens de serviço (OPs) e status de máquinas' },
  { key: 'sales', label: 'Vendas & Faturamento', description: 'Registro de vendas, expedição e relatórios financeiros' },
  { key: 'settings', label: 'Ajustes do Sistema', description: 'Parâmetros de energia, depreciação e padrões da oficina' },
];

export const CompanyTeamModal: React.FC<CompanyTeamModalProps> = ({
  isOpen,
  onClose,
  companyId,
  companyName,
  isSuperadmin = false,
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
    if (isOpen) {
      loadCompanyUsers();
      setFeedback(null);
    }
  }, [isOpen, companyId, isSuperadmin]);

  if (!isOpen) return null;

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
      // If user had all, switch to individual selections
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

        const targetId = companyId || (isSuperadmin ? 'superadmin' : 'comp-1');

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
        const targetId = companyId || (isSuperadmin ? 'superadmin' : 'comp-1');

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

        setFeedback({ type: 'success', message: 'Novo usuário adicionado com sucesso!' });
      }

      setIsUserFormOpen(false);
      loadCompanyUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (u: AppUser) => {
    if (!window.confirm(`Deseja realmente remover o usuário "${u.name}" da equipe da empresa?`)) return;

    const targetId = companyId || (isSuperadmin ? 'superadmin' : 'comp-1');

    try {
      const res = await fetch(`/api/company/${targetId}/users/${u.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao remover usuário.');
      }
      setFeedback({ type: 'success', message: `Usuário "${u.name}" removido com sucesso.` });
      loadCompanyUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar usuário.');
    }
  };

  const isQuotaReached = companyInfo
    ? companyInfo.max_users !== -1 && companyInfo.used_users >= companyInfo.max_users
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">Equipe & Acessos da Empresa</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {companyName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre membros e defina quais módulos do PrintCraft cada operador tem permissão para acessar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Capacity & Action Bar */}
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {companyInfo ? (
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Plano Contratado:</span>
                <span className="font-bold text-emerald-400">{companyInfo.plan_name}</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Capacidade de Usuários:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md ${
                  isQuotaReached
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-200'
                }`}>
                  {companyInfo.used_users} de {companyInfo.max_users === -1 ? 'Ilimitados' : companyInfo.max_users} em uso
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Carregando capacidade do plano...</div>
          )}

          <button
            id="btn-add-company-user"
            onClick={openCreateModal}
            disabled={isQuotaReached && !isSuperadmin}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Novo Membro</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}>
            <div className="flex items-center space-x-2">
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
          <div className="mx-6 mt-4 p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center space-x-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Limite de operadores atingido:</strong> Seu plano atual ({companyInfo?.plan_name}) atingiu o limite de contas. Para cadastrar novos operadores, solicite upgrade de plano ao Super Administrador da plataforma.
            </span>
          </div>
        )}

        {/* Users Table / List */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Carregando lista de membros da empresa...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Nenhum operador adicional cadastrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Clique no botão "Adicionar Novo Membro" acima para permitir que outros membros da sua equipe acessem o PrintCraft.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                const hasAllPerms = isAdmin || (u.permissions && u.permissions.includes('all'));

                return (
                  <div
                    key={u.id}
                    className="p-4 bg-slate-800/50 border border-slate-700/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition-all"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-sm text-slate-100">{u.name}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isAdmin
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isAdmin ? 'Admin da Empresa' : u.role.toUpperCase()}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          u.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {u.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.email}</span>
                        </span>
                        {u.phone && (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{u.phone}</span>
                          </span>
                        )}
                        {u.last_login_at && (
                          <span className="text-slate-500 text-[11px]">
                            Último acesso: {new Date(u.last_login_at).toLocaleDateString('pt-BR')} {new Date(u.last_login_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Permissions Pills */}
                      <div className="pt-2 flex items-center flex-wrap gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Permissões:</span>
                        {hasAllPerms ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                            Acesso Total a Todos os Módulos
                          </span>
                        ) : u.permissions && u.permissions.length > 0 ? (
                          u.permissions.map((pk) => {
                            const mod = AVAILABLE_MODULES.find(m => m.key === pk);
                            return (
                              <span
                                key={pk}
                                className="text-[10px] font-medium px-2 py-0.5 bg-slate-700/80 text-slate-300 rounded-md"
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

                    {/* Actions */}
                    <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center space-x-1 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      {!isAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-lg border border-rose-800/50 flex items-center space-x-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sub-modal: Add / Edit User */}
        {isUserFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-slate-100 text-base">
                    {editingUserId ? 'Editar Membro da Equipe' : 'Cadastrar Novo Membro da Equipe'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsUserFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
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
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                      placeholder="lucas@minhaempresa.com"
                      disabled={Boolean(editingUserId)}
                      required
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
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
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                      placeholder={editingUserId ? 'Manter senha atual' : 'Mínimo 4 caracteres'}
                      required={!editingUserId}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo / Função</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as AppUserRole)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="operator">Operador PCP (Chão de Fábrica)</option>
                      <option value="sales">Comercial & Vendas</option>
                      <option value="manager">Gerente de Produção</option>
                      <option value="viewer">Visualizador (Somente Leitura)</option>
                      <option value="admin">Administrador da Empresa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Status da Conta</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as AppUserStatus)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="active">Ativo (Acesso Permitido)</option>
                      <option value="inactive">Inativo (Acesso Suspenso)</option>
                    </select>
                  </div>
                </div>

                {/* Module Permissions Checkboxes */}
                {formRole !== 'admin' ? (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        Módulos Liberados para este Usuário
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        {formPermissions.length === AVAILABLE_MODULES.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_MODULES.map((mod) => {
                        const checked = formPermissions.includes(mod.key) || formPermissions.includes('all');
                        return (
                          <div
                            key={mod.key}
                            onClick={() => handleTogglePermission(mod.key)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-2.5 ${
                              checked
                                ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {}} // handled by parent div click
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-700 border-slate-600"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-200">{mod.label}</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">{mod.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-xs text-purple-300">
                    <strong className="block font-bold mb-0.5">Acesso de Administrador da Empresa</strong>
                    Usuários com o cargo de Administrador possuem acesso total automático a todos os módulos e à gestão da equipe.
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsUserFormOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {isSaving ? 'Salvando...' : editingUserId ? 'Salvar Alterações' : 'Cadastrar Membro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
