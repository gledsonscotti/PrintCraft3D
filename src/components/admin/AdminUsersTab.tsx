import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building2,
  Key,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';
import { AppUser, AppUserRole, AppUserStatus, Company } from '../../types';
import { UserModal } from './UserModal';

interface AdminUsersTabProps {
  filterCompanyId?: string | null;
  onClearCompanyFilter?: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  filterCompanyId,
  onClearCompanyFilter,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(filterCompanyId || 'all');

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AppUser | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordResetResult, setPasswordResetResult] = useState<{ userName: string; tempPass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    if (filterCompanyId) {
      setSelectedCompanyId(filterCompanyId);
    }
  }, [filterCompanyId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, compRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/companies'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(Array.isArray(compData) ? compData : []);
      }
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
      setActionFeedback({ type: 'error', message: 'Erro ao carregar lista de usuários.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Toggle Status
  const handleToggleStatus = async (user: AppUser) => {
    const newStatus: AppUserStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const confirmMsg = newStatus === 'blocked'
      ? `Deseja realmente BLOQUEAR o acesso do usuário "${user.name}" (${user.email})?`
      : `Deseja REATIVAR o acesso do usuário "${user.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao alterar status do usuário.');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );

      setActionFeedback({
        type: 'success',
        message: newStatus === 'blocked'
          ? `Acesso do usuário "${user.name}" bloqueado.`
          : `Acesso do usuário "${user.name}" reativado.`,
      });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Reset Password
  const handleResetPassword = async (user: AppUser) => {
    if (!window.confirm(`Deseja gerar uma nova senha temporária para "${user.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao redefinir senha.');
      }

      const data = await res.json();
      setPasswordResetResult({
        userName: user.name,
        tempPass: data.tempPassword,
      });
      setCopiedPass(false);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Delete User
  const handleDeleteUser = async (user: AppUser) => {
    if (!window.confirm(`Deseja realmente EXCLUIR permanentemente o usuário "${user.name}" (${user.email})?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir usuário.');
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setActionFeedback({
        type: 'success',
        message: `Usuário "${user.name}" foi removido do sistema.`,
      });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Copy password helper
  const handleCopyPassword = () => {
    if (!passwordResetResult) return;
    navigator.clipboard.writeText(passwordResetResult.tempPass);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2500);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.company_name && u.company_name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q));

      const matchesCompany = selectedCompanyId === 'all' || u.company_id === selectedCompanyId;
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesCompany && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedCompanyId, roleFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const operators = users.filter((u) => u.role === 'operator' || u.role === 'manager').length;
    const blocked = users.filter((u) => u.status === 'blocked').length;

    return { total, active, admins, operators, blocked };
  }, [users]);

  // Selected company name if filtered
  const activeFilteredCompany = useMemo(() => {
    if (selectedCompanyId === 'all') return null;
    return companies.find((c) => c.id === selectedCompanyId);
  }, [selectedCompanyId, companies]);

  return (
    <div className="space-y-6">
      {/* Action feedback */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border text-xs font-semibold animate-fadeIn ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Password Reset Result Modal Banner */}
      {passwordResetResult && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">
                Nova senha gerada para {passwordResetResult.userName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400">Senha temporária:</span>
                <code className="font-mono text-sm px-2 py-0.5 rounded bg-black/40 text-amber-300 font-bold border border-amber-500/20">
                  {passwordResetResult.tempPass}
                </code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPassword}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              {copiedPass ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPass ? 'Copiada!' : 'Copiar Senha'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPasswordResetResult(null)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Filter by Company Active Banner */}
      {activeFilteredCompany && (
        <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-sky-300">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>
              Filtrando usuários da empresa: <strong>{activeFilteredCompany.name}</strong> ({activeFilteredCompany.document_number})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCompanyId('all');
              if (onClearCompanyFilter) onClearCompanyFilter();
            }}
            className="text-xs font-bold text-sky-400 hover:text-white hover:underline cursor-pointer"
          >
            Ver todos os usuários
          </button>
        </div>
      )}

      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Controle de Usuários & Acessos do App
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[11px] font-bold">
              {users.length} usuários
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Administração de operadores, perfis de permissão modular, redefinição de senhas e bloqueio de login
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            title="Atualizar lista"
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setUserToEdit(null);
              setIsUserModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Total de Usuários
          </span>
          <div className="text-2xl font-black text-white">{metrics.total}</div>
          <span className="text-[10px] text-slate-400 block">{companies.length} empresas cadastradas</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Usuários Ativos
          </span>
          <div className="text-2xl font-black text-white">{metrics.active}</div>
          <span className="text-[10px] text-slate-400 block">Com acesso liberado</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            Administradores
          </span>
          <div className="text-2xl font-black text-white">{metrics.admins}</div>
          <span className="text-[10px] text-slate-400 block">Acesso total às oficinas</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Operadores & PCP
          </span>
          <div className="text-2xl font-black text-white">{metrics.operators}</div>
          <span className="text-[10px] text-slate-400 block">Fila e parque de máquinas</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Acesso Bloqueado
          </span>
          <div className="text-2xl font-black text-white">{metrics.blocked}</div>
          <span className="text-[10px] text-slate-400 block">Login impedido</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121215] border border-white/[0.08] p-3.5 rounded-2xl admin-card flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar usuário por nome, e-mail, telefone ou empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 transition admin-input"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Company filter */}
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-sky-500 admin-input max-w-[180px] truncate"
          >
            <option value="all">Todas as Empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-sky-500 admin-input"
          >
            <option value="all">Perfis: Todos</option>
            <option value="admin">Administrador</option>
            <option value="manager">Gerente PCP</option>
            <option value="operator">Operador 3D</option>
            <option value="sales">Vendas & Comercial</option>
            <option value="financial">Financeiro</option>
            <option value="viewer">Somente Leitura</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-sky-500 admin-input"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="blocked">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl overflow-hidden admin-card shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Carregando lista de operadores e usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-white mb-1">Nenhum usuário encontrado</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Nenhum usuário corresponde aos critérios selecionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setUserToEdit(null);
                setIsUserModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition"
            >
              + Criar Novo Usuário
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs admin-table">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                  <th className="py-3.5 px-4">Empresa Vinculada</th>
                  <th className="py-3.5 px-4">Perfil de Acesso</th>
                  <th className="py-3.5 px-4">Módulos Autorizados</th>
                  <th className="py-3.5 px-4">Último Acesso</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredUsers.map((user) => {
                  const isBlocked = user.status === 'blocked';
                  const isInactive = user.status === 'inactive';
                  const isActive = user.status === 'active';

                  const roleLabel =
                    user.role === 'admin'
                      ? 'Administrador'
                      : user.role === 'manager'
                      ? 'Gerente PCP'
                      : user.role === 'operator'
                      ? 'Operador 3D'
                      : user.role === 'sales'
                      ? 'Vendas & CRM'
                      : user.role === 'financial'
                      ? 'Financeiro'
                      : 'Somente Leitura';

                  const roleBadgeClass =
                    user.role === 'admin'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : user.role === 'manager'
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : user.role === 'operator'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : user.role === 'sales'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-500/15 text-slate-300 border-slate-500/30';

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition group">
                      {/* Name & Avatar */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center font-bold text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs group-hover:text-sky-400 transition">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-2.5 h-2.5 text-slate-400" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-200 block text-xs">
                              {user.company_name || 'Sem Empresa'}
                            </span>
                            {user.company_document && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                {user.company_document}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${roleBadgeClass}`}
                        >
                          {roleLabel}
                        </span>
                      </td>

                      {/* Permissions */}
                      <td className="py-4 px-4">
                        {user.permissions.includes('all') ? (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Acesso Pleno (Todos os módulos)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {user.permissions.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                              >
                                {p}
                              </span>
                            ))}
                            {user.permissions.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 font-bold">
                                +{user.permissions.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-4 px-4">
                        {user.last_login_at ? (
                          <span className="text-[11px] text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(user.last_login_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Nunca acessou</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Ativo
                          </span>
                        )}
                        {isInactive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                            <AlertCircle className="w-3 h-3" />
                            Inativo
                          </span>
                        )}
                        {isBlocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            <Lock className="w-3 h-3" />
                            Bloqueado
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            title="Gerar nova senha temporária para este usuário"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            title={isBlocked ? 'Desbloquear acesso do usuário' : 'Bloquear login deste usuário'}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              isBlocked
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserToEdit(user);
                              setIsUserModalOpen(true);
                            }}
                            title="Editar usuário"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            title="Excluir usuário"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/[0.08] transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setUserToEdit(null);
          }}
          onSaved={(savedUser) => {
            setUsers((prev) => {
              const idx = prev.findIndex((u) => u.id === savedUser.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = savedUser;
                return updated;
              }
              return [savedUser, ...prev];
            });
            setActionFeedback({
              type: 'success',
              message: `Usuário "${savedUser.name}" salvo com sucesso.`,
            });
          }}
          userToEdit={userToEdit}
          companies={companies}
          initialCompanyId={selectedCompanyId !== 'all' ? selectedCompanyId : undefined}
        />
      )}
    </div>
  );
};
