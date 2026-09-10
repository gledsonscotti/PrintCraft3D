import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Clock,
  Unlock,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Users,
  Shield,
  Layers,
  Calendar,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Company, SubscriptionPlan, CompanyStatus, CompanyDocumentType } from '../../types';
import { CompanyModal } from './CompanyModal';

interface AdminCompaniesTabProps {
  onSelectCompanyForUsers?: (companyId: string) => void;
}

export const AdminCompaniesTab: React.FC<AdminCompaniesTabProps> = ({ onSelectCompanyForUsers }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [docFilter, setDocFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCompaniesAndPlans = async () => {
    setIsLoading(true);
    try {
      const [compRes, plansRes] = await Promise.all([
        fetch('/api/admin/companies'),
        fetch('/api/admin/plans'),
      ]);

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(Array.isArray(compData) ? compData : []);
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(Array.isArray(plansData) ? plansData : []);
      }
    } catch (e) {
      console.error('Erro ao carregar empresas e planos:', e);
      setActionFeedback({ type: 'error', message: 'Erro ao carregar dados do servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompaniesAndPlans();
  }, []);

  // Quick Status Toggle
  const handleToggleStatus = async (company: Company) => {
    const newStatus: CompanyStatus = company.status === 'blocked' ? 'active' : 'blocked';
    const confirmMsg = newStatus === 'blocked'
      ? `Deseja realmente BLOQUEAR a empresa "${company.name}"? Todos os usuários vinculados perderão o acesso ao sistema imediatamente.`
      : `Deseja REATIVAR o acesso da empresa "${company.name}" no sistema?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/companies/${company.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao alterar status da empresa.');
      }

      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c))
      );

      setActionFeedback({
        type: 'success',
        message: newStatus === 'blocked'
          ? `Empresa "${company.name}" foi bloqueada com sucesso.`
          : `Acesso da empresa "${company.name}" foi reativado.`,
      });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Delete Company
  const handleDeleteCompany = async (company: Company) => {
    if (
      !window.confirm(
        `ATENÇÃO: Deseja realmente EXCLUIR permanentemente a empresa "${company.name}" (${company.document_number}) e todos os seus usuários associados? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao remover empresa.');
      }

      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      setActionFeedback({
        type: 'success',
        message: `Empresa "${company.name}" foi removida do sistema com sucesso.`,
      });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Filtered List
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(q)) ||
        c.document_number.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q));

      // Status
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      // Doc Type
      const matchesDoc = docFilter === 'all' || c.document_type === docFilter;

      // Plan
      const matchesPlan = planFilter === 'all' || c.plan_id === planFilter;

      return matchesSearch && matchesStatus && matchesDoc && matchesPlan;
    });
  }, [companies, searchQuery, statusFilter, docFilter, planFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = companies.length;
    const cnpjCount = companies.filter((c) => c.document_type === 'CNPJ').length;
    const cpfCount = companies.filter((c) => c.document_type === 'CPF').length;
    const activeCount = companies.filter((c) => c.status === 'active').length;
    const trialCount = companies.filter((c) => c.status === 'trial').length;
    const blockedCount = companies.filter((c) => c.status === 'blocked' || c.status === 'suspended').length;
    const totalUsers = companies.reduce((acc, c) => acc + (c.users_count || 0), 0);

    return { total, cnpjCount, cpfCount, activeCount, trialCount, blockedCount, totalUsers };
  }, [companies]);

  return (
    <div className="space-y-6">
      {/* Action feedback message */}
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

      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Controle de Empresas Cadastradas
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              {companies.length} cadastradas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão completa de oficinas 3D, estúdios e clientes individuais por CNPJ ou CPF com controle de licenciamento do App
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCompaniesAndPlans}
            disabled={isLoading}
            title="Atualizar lista de empresas"
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCompanyToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Empresa</span>
          </button>
        </div>
      </div>

      {/* Summary Metric Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Total de Empresas
          </span>
          <div className="text-2xl font-black text-white">{metrics.total}</div>
          <span className="text-[10px] text-slate-400 block">{metrics.totalUsers} usuários ativos</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            Pessoas Jurídicas (CNPJ)
          </span>
          <div className="text-2xl font-black text-white">{metrics.cnpjCount}</div>
          <span className="text-[10px] text-slate-400 block">Oficinas e Print Farms</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            Pessoas Físicas (CPF)
          </span>
          <div className="text-2xl font-black text-white">{metrics.cpfCount}</div>
          <span className="text-[10px] text-slate-400 block">Makers & Autônomos</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Em Período de Testes
          </span>
          <div className="text-2xl font-black text-white">{metrics.trialCount}</div>
          <span className="text-[10px] text-slate-400 block">Trial gratuito ativo</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Bloqueadas / Inativas
          </span>
          <div className="text-2xl font-black text-white">{metrics.blockedCount}</div>
          <span className="text-[10px] text-slate-400 block">Acesso restrito</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121215] border border-white/[0.08] p-3.5 rounded-2xl admin-card flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ, CPF, E-mail ou Cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition admin-input"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Document Type Filter */}
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-emerald-500 admin-input"
          >
            <option value="all">Documento: Todos</option>
            <option value="CNPJ">Apenas CNPJ (PJ)</option>
            <option value="CPF">Apenas CPF (PF)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-emerald-500 admin-input"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Ativas</option>
            <option value="trial">Em Testes (Trial)</option>
            <option value="suspended">Suspensas</option>
            <option value="blocked">Bloqueadas</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-emerald-500 admin-input"
          >
            <option value="all">Planos: Todos</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Companies List Table */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl overflow-hidden admin-card shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Carregando lista de empresas cadastradas...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-white mb-1">Nenhuma empresa encontrada</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'all' || docFilter !== 'all' || planFilter !== 'all'
                ? 'Nenhum cadastro corresponde aos filtros aplicados. Tente limpar os termos de busca.'
                : 'Nenhuma empresa cadastrada no sistema ainda. Clique no botão abaixo para adicionar a primeira.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setCompanyToEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              + Cadastrar Empresa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs admin-table">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Empresa & Documento</th>
                  <th className="py-3.5 px-4">Contato & Localização</th>
                  <th className="py-3.5 px-4">Plano Contratado</th>
                  <th className="py-3.5 px-4 text-center">Usuários no App</th>
                  <th className="py-3.5 px-4">Status de Acesso</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredCompanies.map((company) => {
                  const isBlocked = company.status === 'blocked';
                  const isSuspended = company.status === 'suspended';
                  const isTrial = company.status === 'trial';
                  const isActive = company.status === 'active';

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-white/[0.02] transition group"
                    >
                      {/* Name & Doc */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              company.document_type === 'CNPJ'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {company.document_type === 'CNPJ' ? <Building2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs group-hover:text-emerald-400 transition flex items-center gap-2">
                              <span>{company.name}</span>
                              {company.trade_name && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({company.trade_name})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                  company.document_type === 'CNPJ'
                                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                }`}
                              >
                                {company.document_type}: {company.document_number}
                              </span>
                              {company.notes && (
                                <span
                                  className="text-[10px] text-slate-400 truncate max-w-[200px]"
                                  title={company.notes}
                                >
                                  • {company.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{company.email}</span>
                          </div>
                          {company.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                          {(company.city || company.state) && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                {company.city ? `${company.city} - ` : ''}
                                {company.state}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-4">
                        <div>
                          <span className="font-bold text-white block">
                            {company.plan_name || 'Sem plano'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {company.plan_price !== undefined
                              ? `R$ ${Number(company.plan_price).toFixed(2)} (${company.billing_cycle})`
                              : company.billing_cycle}
                          </span>
                          {company.expires_at && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5 text-slate-400" />
                              Vence: {new Date(company.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Users Count */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectCompanyForUsers && onSelectCompanyForUsers(company.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs font-semibold transition cursor-pointer"
                          title="Clique para filtrar os usuários desta empresa"
                        >
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>{company.users_count || 0}</span>
                          {company.max_users_override ? (
                            <span className="text-[10px] text-slate-400">/{company.max_users_override}</span>
                          ) : null}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Ativa
                          </span>
                        )}
                        {isTrial && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 font-bold text-[11px]">
                            <Clock className="w-3 h-3" />
                            Trial
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                            <AlertCircle className="w-3 h-3" />
                            Suspensa
                          </span>
                        )}
                        {isBlocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            <Lock className="w-3 h-3" />
                            Bloqueada
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Status Block / Unblock Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(company)}
                            title={
                              isBlocked
                                ? 'Desbloquear acesso da empresa'
                                : 'Bloquear acesso da empresa (suspende todos os usuários)'
                            }
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
                              setCompanyToEdit(company);
                              setIsModalOpen(true);
                            }}
                            title="Editar cadastro da empresa e limites"
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCompany(company)}
                            title="Excluir empresa permanentemente"
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

      {/* Company Modal */}
      {isModalOpen && (
        <CompanyModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCompanyToEdit(null);
          }}
          onSaved={(savedComp) => {
            setCompanies((prev) => {
              const idx = prev.findIndex((c) => c.id === savedComp.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = savedComp;
                return updated;
              }
              return [savedComp, ...prev];
            });
            setActionFeedback({
              type: 'success',
              message: `Empresa "${savedComp.name}" salva com sucesso.`,
            });
          }}
          companyToEdit={companyToEdit}
          availablePlans={plans}
        />
      )}
    </div>
  );
};
