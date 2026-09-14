import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Users,
  Printer as PrinterIcon,
  Package,
  Layers,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Zap,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import { AVAILABLE_PLAN_FEATURES } from '../../data/planFeatures';
import { PlanFormModal } from './PlanFormModal';

export const AdminPlansTab: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDuplicatePlan = async (plan: SubscriptionPlan) => {
    try {
      const duplicateData: Partial<SubscriptionPlan> = {
        name: `${plan.name} (Cópia)`,
        price: plan.price,
        billing_cycle: plan.billing_cycle,
        description: plan.description,
        badge: plan.badge,
        is_popular: false,
        is_active: plan.is_active,
        max_users: plan.max_users,
        max_printers: plan.max_printers,
        max_products: plan.max_products,
        features: [...plan.features],
      };

      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });

      if (!res.ok) {
        throw new Error('Falha ao duplicar plano.');
      }

      await fetchPlans();
      showNotification('success', `Plano "${plan.name}" duplicado com sucesso!`);
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao duplicar plano.');
    }
  };

  const handleSavePlan = async (planData: Partial<SubscriptionPlan>) => {
    if (editingPlan) {
      // Update
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao atualizar plano.');
      }
      showNotification('success', `Plano "${planData.name}" atualizado com sucesso!`);
    } else {
      // Create
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao criar plano.');
      }
      showNotification('success', `Plano "${planData.name}" criado com sucesso!`);
    }
    await fetchPlans();
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlan) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/plans/${deletingPlan.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Erro ao excluir plano.');
      }
      showNotification('success', `Plano "${deletingPlan.name}" excluído.`);
      setDeletingPlan(null);
      await fetchPlans();
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao excluir plano.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const updatedStatus = !plan.is_active;
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus }),
      });
      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, is_active: updatedStatus } : p))
        );
        showNotification(
          'success',
          `Plano "${plan.name}" agora está ${updatedStatus ? 'Ativo' : 'Inativo'}.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.badge && plan.badge.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? plan.is_active
        : !plan.is_active;

    return matchesSearch && matchesStatus;
  });

  // Derived metrics
  const totalPlans = plans.length;
  const activePlansCount = plans.filter((p) => p.is_active).length;
  const popularPlan = plans.find((p) => p.is_popular);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-white/[0.08] p-6 rounded-3xl admin-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              SaaS Monetization
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Gestão PrintCraft</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Configuração de Planos de Assinatura
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Crie, edite e configure planos de assinatura comercial. Defina preços, limites quantitativos (usuários, impressoras, produtos no catálogo) e as permissões de funcionalidades disponíveis no aplicativo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchPlans}
            title="Atualizar lista"
            className="p-3 rounded-2xl bg-[#18181E] hover:bg-[#202028] text-slate-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleCreatePlan}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Plano</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card">
          <span className="text-[11px] font-semibold text-slate-400 block">Total de Planos</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalPlans}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Configurados no banco</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card">
          <span className="text-[11px] font-semibold text-slate-400 block">Planos Ativos</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{activePlansCount}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Disponíveis para contratação</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card">
          <span className="text-[11px] font-semibold text-slate-400 block">Plano Destaque</span>
          <span className="text-base font-bold text-sky-400 mt-1 block truncate">
            {popularPlan ? popularPlan.name : 'Nenhum'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Selo de mais escolhido</span>
        </div>

        <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl admin-card">
          <span className="text-[11px] font-semibold text-slate-400 block">Módulos Gating</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {AVAILABLE_PLAN_FEATURES.length}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Funcionalidades controláveis</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#121215] border border-white/[0.08] p-3 rounded-2xl admin-card">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, descrição ou badge..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-xs text-white placeholder:text-slate-600 outline-none admin-input"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] text-slate-500 hidden sm:inline">Status:</span>
          <div className="inline-flex p-1 rounded-xl bg-[#0A0A0B] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#1C1C22] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({plans.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativos ({activePlansCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-rose-500/20 text-rose-300 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inativos ({plans.length - activePlansCount})
            </button>
          </div>
        </div>
      </div>

      {/* Plans List Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Carregando planos de assinatura do banco...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-12 text-center space-y-4 admin-card">
          <div className="w-14 h-14 rounded-3xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Nenhum plano encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Nenhum plano corresponde aos filtros aplicados. Tente outro termo de busca.'
              : 'Não há planos de assinatura configurados ainda. Crie o primeiro plano para começar a monetização.'}
          </p>
          <button
            type="button"
            onClick={handleCreatePlan}
            className="admin-btn-primary px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeiro Plano</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const isUnlimitedUsers = plan.max_users === -1;
            const isUnlimitedPrinters = plan.max_printers === -1;
            const isUnlimitedProducts = plan.max_products === -1;
            const activeFeaturesCount = plan.features?.length || 0;

            return (
              <div
                key={plan.id}
                className={`bg-[#121215] rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden group admin-card ${
                  plan.is_popular
                    ? 'border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                    : 'border-white/[0.08] hover:border-white/[0.15]'
                } ${!plan.is_active ? 'opacity-65' : ''}`}
              >
                {/* Popular indicator bar */}
                {plan.is_popular && (
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider py-1 text-center font-mono">
                    ★ Plano Mais Popular / Destaque ★
                  </div>
                )}

                <div className="p-6 space-y-5">
                  {/* Top line: Badges & status toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {plan.badge && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                          {plan.badge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(plan)}
                        title={plan.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          plan.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/20 hover:text-rose-300'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/20 hover:text-emerald-300'
                        }`}
                      >
                        {plan.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inativo
                          </>
                        )}
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      ID: {plan.id}
                    </span>
                  </div>

                  {/* Plan Name & Price */}
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition">
                      {plan.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      {plan.price === 0 ? (
                        <span className="text-2xl font-black text-emerald-400">Gratuito</span>
                      ) : (
                        <>
                          <span className="text-xs text-slate-400 font-bold">R$</span>
                          <span className="text-3xl font-black text-white tracking-tight">
                            {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            /{plan.billing_cycle || 'mês'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {plan.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Limits Block */}
                  <div className="p-3.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Limites do Plano:
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#141418] p-2 rounded-xl border border-white/[0.04]">
                        <Users className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-white block">
                          {isUnlimitedUsers ? '∞ Ilimitado' : `${plan.max_users}`}
                        </span>
                        <span className="text-[9px] text-slate-500 block">Usuários</span>
                      </div>

                      <div className="bg-[#141418] p-2 rounded-xl border border-white/[0.04]">
                        <PrinterIcon className="w-3.5 h-3.5 text-sky-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-white block">
                          {isUnlimitedPrinters ? '∞ Ilimitado' : `${plan.max_printers}`}
                        </span>
                        <span className="text-[9px] text-slate-500 block">Impressoras</span>
                      </div>

                      <div className="bg-[#141418] p-2 rounded-xl border border-white/[0.04]">
                        <Package className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-white block">
                          {isUnlimitedProducts ? '∞ Ilimitado' : `${plan.max_products}`}
                        </span>
                        <span className="text-[9px] text-slate-500 block">Produtos</span>
                      </div>
                    </div>
                  </div>

                  {/* Features Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Funcionalidades Disponíveis
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {activeFeaturesCount} / {AVAILABLE_PLAN_FEATURES.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {AVAILABLE_PLAN_FEATURES.map((feat) => {
                        const isIncluded = plan.features?.includes(feat.key);
                        if (!isIncluded) return null;
                        return (
                          <span
                            key={feat.key}
                            title={feat.description}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-300"
                          >
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="truncate max-w-[130px]">{feat.title}</span>
                          </span>
                        );
                      })}
                      {activeFeaturesCount === 0 && (
                        <span className="text-[10px] text-slate-600 italic">
                          Nenhuma funcionalidade vinculada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 border-t border-white/[0.06] bg-[#16161C] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicatePlan(plan)}
                      title="Duplicar este plano"
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPlan(plan)}
                      title="Excluir este plano"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditPlan(plan)}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Editar Plano</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        key={editingPlan?.id || 'new'}
        isOpen={isModalOpen}
        plan={editingPlan}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
      />

      {/* Delete Confirmation Dialog */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141418] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Plano de Assinatura</h3>
                <p className="text-xs text-slate-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza de que deseja remover o plano{' '}
              <strong className="text-white font-bold">{deletingPlan.name}</strong>? Usuários cadastrados neste plano precisarão ser migrados.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPlan(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
