import React, { useState } from 'react';
import {
  X,
  Check,
  Sparkles,
  Users,
  Printer as PrinterIcon,
  Package,
  Layers,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Tag,
  CheckSquare,
  Square
} from 'lucide-react';
import { SubscriptionPlan, BillingCycle } from '../../types';
import { AVAILABLE_PLAN_FEATURES, CATEGORY_LABELS } from '../../data/planFeatures';

interface PlanFormModalProps {
  plan?: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: Partial<SubscriptionPlan>) => Promise<void>;
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(plan);

  const [name, setName] = useState(plan?.name || '');
  const [price, setPrice] = useState(plan?.price !== undefined ? plan.price.toString() : '49.90');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(plan?.billing_cycle || 'mensal');
  const [description, setDescription] = useState(plan?.description || '');
  const [badge, setBadge] = useState(plan?.badge || '');
  const [isPopular, setIsPopular] = useState(plan?.is_popular ?? false);
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);

  // Quotas / Limits (-1 means unlimited)
  const [unlimitedUsers, setUnlimitedUsers] = useState(plan?.max_users === -1);
  const [maxUsers, setMaxUsers] = useState(plan?.max_users && plan.max_users > 0 ? plan.max_users.toString() : '3');

  const [unlimitedPrinters, setUnlimitedPrinters] = useState(plan?.max_printers === -1);
  const [maxPrinters, setMaxPrinters] = useState(plan?.max_printers && plan.max_printers > 0 ? plan.max_printers.toString() : '5');

  const [unlimitedProducts, setUnlimitedProducts] = useState(plan?.max_products === -1);
  const [maxProducts, setMaxProducts] = useState(plan?.max_products && plan.max_products > 0 ? plan.max_products.toString() : '150');

  // Selected features
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => {
    if (plan?.features && Array.isArray(plan.features)) {
      return [...plan.features];
    }
    // Default features for new plan
    return ['cost_calculator', 'model_analyzer', 'stock_filaments', 'workshop_themes'];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleFeature = (featureKey: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureKey) ? prev.filter((k) => k !== featureKey) : [...prev, featureKey]
    );
  };

  const selectAllFeatures = () => {
    setSelectedFeatures(AVAILABLE_PLAN_FEATURES.map((f) => f.key));
  };

  const clearAllFeatures = () => {
    setSelectedFeatures([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do plano é obrigatório.');
      return;
    }

    const numericPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg('Informe um preço válido (use 0 para plano gratuito).');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await onSave({
        name: name.trim(),
        price: numericPrice,
        billing_cycle: billingCycle,
        description: description.trim(),
        badge: badge.trim(),
        is_popular: isPopular,
        is_active: isActive,
        max_users: unlimitedUsers ? -1 : Math.max(1, parseInt(maxUsers, 10) || 1),
        max_printers: unlimitedPrinters ? -1 : Math.max(1, parseInt(maxPrinters, 10) || 1),
        max_products: unlimitedProducts ? -1 : Math.max(1, parseInt(maxProducts, 10) || 1),
        features: selectedFeatures,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar plano de assinatura.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group features by category
  const categories = ['core', 'production', 'stock', 'sales', 'integrations'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121215] border border-white/[0.1] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] admin-modal admin-card">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] bg-[#16161A] admin-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? `Editar Plano: ${plan?.name}` : 'Criar Novo Plano de Assinatura'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defina preço, cotas de recursos e funcionalidades disponíveis para os clientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition cursor-pointer admin-btn-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Identificação Básica */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              1. Identificação & Preço do Plano
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Nome */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nome do Plano <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Oficina Pro, Maker Solo, Print Farm"
                  required
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-sm text-white placeholder:text-slate-600 outline-none transition admin-input"
                />
              </div>

              {/* Badge */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Badge de Destaque (opcional)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="ex: Mais Escolhido, Grátis"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-sm text-white placeholder:text-slate-600 outline-none transition admin-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Preço */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Preço do Plano (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-sm text-white placeholder:text-slate-600 outline-none transition admin-input"
                  />
                </div>
                <span className="text-[10px] text-slate-500">Defina 0 para planos gratuitos</span>
              </div>

              {/* Ciclo de Cobrança */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Ciclo de Cobrança
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-sm text-white outline-none transition cursor-pointer admin-input"
                >
                  <option value="mensal">Mensal (/mês)</option>
                  <option value="trimestral">Trimestral (/trimestre)</option>
                  <option value="semestral">Semestral (/semestre)</option>
                  <option value="anual">Anual (/ano)</option>
                  <option value="vitalicio">Vitalício (pagamento único)</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Descrição & Proposta de Valor
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva para quem este plano foi projetado e os principais benefícios..."
                className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 text-xs text-white placeholder:text-slate-600 outline-none transition resize-none admin-input"
              />
            </div>

            {/* Flags: Popular & Ativo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] cursor-pointer hover:border-emerald-500/30 transition admin-inner-box">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Marcar como Plano Popular</span>
                  <span className="text-[10px] text-slate-400 block">Recebe destaque visual com borda e badge iluminado</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] cursor-pointer hover:border-emerald-500/30 transition admin-inner-box">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Plano Ativo no Sistema</span>
                  <span className="text-[10px] text-slate-400 block">Visível para seleção e assinatura no aplicativo</span>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-5 space-y-4">
            {/* Section 2: Quotas e Limites Numéricos */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              2. Limites de Recursos do Plano
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Usuários */}
              <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Usuários
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedUsers}
                      onChange={(e) => setUnlimitedUsers(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    Ilimitado
                  </label>
                </div>
                {!unlimitedUsers ? (
                  <input
                    type="number"
                    min="1"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141418] border border-white/[0.08] focus:border-emerald-500 text-xs text-white outline-none"
                    placeholder="ex: 3"
                  />
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold text-center">
                    ∞ Usuários Ilimitados
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block">Contas simultâneas de operadores</span>
              </div>

              {/* Impressoras */}
              <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <PrinterIcon className="w-3.5 h-3.5 text-sky-400" /> Impressoras
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedPrinters}
                      onChange={(e) => setUnlimitedPrinters(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    Ilimitado
                  </label>
                </div>
                {!unlimitedPrinters ? (
                  <input
                    type="number"
                    min="1"
                    value={maxPrinters}
                    onChange={(e) => setMaxPrinters(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141418] border border-white/[0.08] focus:border-sky-500 text-xs text-white outline-none"
                    placeholder="ex: 5"
                  />
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold text-center">
                    ∞ Máquinas Ilimitadas
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block">Impressoras ativas no parque fabril</span>
              </div>

              {/* Produtos */}
              <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" /> Produtos
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedProducts}
                      onChange={(e) => setUnlimitedProducts(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    Ilimitado
                  </label>
                </div>
                {!unlimitedProducts ? (
                  <input
                    type="number"
                    min="1"
                    value={maxProducts}
                    onChange={(e) => setMaxProducts(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141418] border border-white/[0.08] focus:border-amber-500 text-xs text-white outline-none"
                    placeholder="ex: 100"
                  />
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold text-center">
                    ∞ Produtos Ilimitados
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block">Modelos cadastrados no catálogo</span>
              </div>
            </div>
          </div>

          {/* Section 3: Funcionalidades Disponíveis */}
          <div className="border-t border-white/[0.06] pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  3. Funcionalidades do PrintCraft Liberadas
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Selecione quais recursos da plataforma estarão disponíveis para os clientes deste plano
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-white/[0.05] text-emerald-400 border border-white/[0.08]">
                  {selectedFeatures.length} / {AVAILABLE_PLAN_FEATURES.length} ativas
                </span>
                <button
                  type="button"
                  onClick={selectAllFeatures}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Marcar Todas
                </button>
                <button
                  type="button"
                  onClick={clearAllFeatures}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-slate-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Categorized Feature Groups */}
            <div className="space-y-4">
              {categories.map((catKey) => {
                const catDef = CATEGORY_LABELS[catKey];
                const catFeatures = AVAILABLE_PLAN_FEATURES.filter((f) => f.category === catKey);

                return (
                  <div key={catKey} className="bg-[#0A0A0B] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {catDef.label}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {catFeatures.filter((f) => selectedFeatures.includes(f.key)).length} de {catFeatures.length} selecionadas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {catFeatures.map((feat) => {
                        const isChecked = selectedFeatures.includes(feat.key);
                        return (
                          <div
                            key={feat.key}
                            onClick={() => toggleFeature(feat.key)}
                            className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                              isChecked
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                                : 'bg-[#121215] border-white/[0.04] text-slate-400 hover:border-white/[0.1]'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isChecked ? (
                                <div className="w-4 h-4 rounded bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                                  <Check className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded border border-slate-600 bg-transparent" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-semibold block ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                                  {feat.title}
                                </span>
                                {feat.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.1] text-emerald-300 font-mono">
                                    {feat.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {feat.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary px-5 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Salvar Alterações do Plano' : 'Criar Plano de Assinatura'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
