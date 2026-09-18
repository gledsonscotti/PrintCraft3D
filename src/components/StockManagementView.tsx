import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Package,
  Plus,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  Info,
  Scale,
  Tag,
  ShoppingBag,
  Play,
  Minus,
  Sparkles,
  ShoppingCart
} from 'lucide-react';
import { Filament, Supply, Product, ProductSale, ProductionOrder, MaterialPurchase } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { SmartShoppingAlert, calculateSmartShoppingSuggestions } from './SmartShoppingAlert';
import { StockPurchaseModal } from './StockPurchaseModal';

interface StockManagementViewProps {
  filaments: Filament[];
  supplies: Supply[];
  products: Product[];
  sales?: ProductSale[];
  productionOrders?: ProductionOrder[];
  onRefreshData: () => void | Promise<void>;
  onOpenSaleModal?: (product: Product) => void;
  onNavigateToQuotes?: () => void;
  initialTab?: 'filaments' | 'supplies' | 'smart_alerts' | 'products' | 'entries';
}

export const StockManagementView: React.FC<StockManagementViewProps> = ({
  filaments,
  supplies,
  products,
  sales = [],
  productionOrders = [],
  onRefreshData,
  onOpenSaleModal,
  onNavigateToQuotes,
  initialTab = 'filaments',
}) => {
  const [activeTab, setActiveTab] = useState<'filaments' | 'supplies' | 'smart_alerts' | 'products' | 'entries'>(initialTab);
  const [stockAdjustingId, setStockAdjustingId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Stock Entries / Material Purchases State
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [purchaseFilter, setPurchaseFilter] = useState<'all' | 'filament' | 'supply' | 'other'>('all');
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

  const fetchPurchases = async () => {
    try {
      setIsLoadingPurchases(true);
      const res = await fetch('/api/material-purchases');
      if (res.ok) {
        const data = await res.json();
        setPurchases(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de entradas de estoque:', err);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (purchaseFilter !== 'all' && p.item_type !== purchaseFilter) return false;
      if (purchaseSearch.trim()) {
        const q = purchaseSearch.toLowerCase();
        const matchName = (p.item_name || '').toLowerCase().includes(q);
        const matchSupplier = (p.supplier || '').toLowerCase().includes(q);
        const matchNotes = (p.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchSupplier && !matchNotes) return false;
      }
      return true;
    });
  }, [purchases, purchaseFilter, purchaseSearch]);

  // Pre-calculate smart shopping alerts count for the tab badge
  const { suggestions: smartSuggestions, criticalCount: smartCriticalCount } = useMemo(() => {
    return calculateSmartShoppingSuggestions(filaments, supplies, products, sales, productionOrders, 30);
  }, [filaments, supplies, products, sales, productionOrders]);

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'supply' | 'filament' | 'purchase';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-app Notification Feedback Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Filament Modal State
  const [showFilamentModal, setShowFilamentModal] = useState(false);
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [filName, setFilName] = useState('');
  const [filBrand, setFilBrand] = useState('Voolt3D');
  const [filMaterial, setFilMaterial] = useState('PLA');
  const [filColor, setFilColor] = useState('Preto');
  const [filColorHex, setFilColorHex] = useState('#1e293b');
  const [filTotalWeight, setFilTotalWeight] = useState(1000);
  const [filRemainingWeight, setFilRemainingWeight] = useState(1000);
  const [filCost, setFilCost] = useState(89.90);
  const [filDiameter, setFilDiameter] = useState(1.75);

  // Supply Modal State
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [supName, setSupName] = useState('');
  const [supUnit, setSupUnit] = useState('un');
  const [supCost, setSupCost] = useState(0.50);
  const [supStockQty, setSupStockQty] = useState(100);
  const [supMinAlert, setSupMinAlert] = useState(20);

  // Total Stock Metrics
  const totalFilamentsStockG = filaments.reduce((acc, f) => acc + f.remaining_weight_g, 0);
  const totalFilamentValue = filaments.reduce(
    (acc, f) => acc + (f.remaining_weight_g * (f.cost_per_spool / f.total_weight_g)),
    0
  );
  const totalSuppliesUnits = supplies.reduce((acc, s) => acc + s.in_stock_qty, 0);
  const totalSuppliesValue = supplies.reduce((acc, s) => acc + (s.in_stock_qty * s.unit_cost), 0);
  const totalFinishedUnits = products.reduce((acc, p) => acc + (p.ready_stock_qty || 0), 0);
  const totalFinishedValue = products.reduce((acc, p) => acc + ((p.ready_stock_qty || 0) * p.total_cost), 0);
  const totalFinishedPotentialRevenue = products.reduce((acc, p) => acc + ((p.ready_stock_qty || 0) * p.sale_price), 0);

  const handleQuickStockAdjustProduct = async (product: Product, delta: number) => {
    const current = product.ready_stock_qty || 0;
    const nextStock = Math.max(0, current + delta);
    setStockAdjustingId(product.id);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_stock_qty: nextStock }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar estoque');
      await onRefreshData();
      setNotification({
        type: 'success',
        message: `Estoque de "${product.name}" atualizado para ${nextStock} un.`,
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: e.message || 'Erro ao ajustar estoque',
      });
    } finally {
      setStockAdjustingId(null);
    }
  };

  // Open Filament Modal
  const handleOpenFilamentModal = (filament?: Filament) => {
    if (filament) {
      setEditingFilament(filament);
      setFilName(filament.name);
      setFilBrand(filament.brand);
      setFilMaterial(filament.material);
      setFilColor(filament.color);
      setFilColorHex(filament.color_hex);
      setFilTotalWeight(filament.total_weight_g);
      setFilRemainingWeight(filament.remaining_weight_g);
      setFilCost(filament.cost_per_spool);
      setFilDiameter(filament.diameter);
    } else {
      setEditingFilament(null);
      setFilName('');
      setFilBrand('Voolt3D');
      setFilMaterial('PLA');
      setFilColor('Preto');
      setFilColorHex('#1e293b');
      setFilTotalWeight(1000);
      setFilRemainingWeight(1000);
      setFilCost(89.90);
      setFilDiameter(1.75);
    }
    setShowFilamentModal(true);
  };

  // Submit Filament
  const handleSaveFilament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const density = filMaterial === 'PETG' ? 1.27 : (filMaterial === 'ABS' ? 1.04 : (filMaterial === 'TPU' ? 1.21 : 1.24));
      const payload = {
        name: filName,
        brand: filBrand,
        material: filMaterial,
        color: filColor,
        color_hex: filColorHex,
        total_weight_g: filTotalWeight,
        remaining_weight_g: filRemainingWeight,
        cost_per_spool: filCost,
        diameter: filDiameter,
        density,
      };

      let res: globalThis.Response;
      if (editingFilament) {
        res = await fetch(`/api/filaments/${encodeURIComponent(editingFilament.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/filaments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao salvar filamento no servidor');
      }

      setShowFilamentModal(false);
      setNotification({
        type: 'success',
        message: editingFilament ? 'Filamento atualizado com sucesso!' : 'Novo filamento cadastrado com sucesso!'
      });
      onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao salvar filamento: ' + (err.message || 'Falha na requisição')
      });
    }
  };

  // Quick adjust filament stock
  const handleAdjustFilamentStock = async (id: string, deltaG: number) => {
    try {
      const res = await fetch(`/api/filaments/${encodeURIComponent(id)}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment_g: deltaG }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar estoque');
      onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao ajustar estoque: ' + (err.message || 'Erro de conexão')
      });
    }
  };

  // Open Supply Modal
  const handleOpenSupplyModal = (supply?: Supply) => {
    if (supply) {
      setEditingSupply(supply);
      setSupName(supply.name);
      setSupUnit(supply.unit);
      setSupCost(supply.unit_cost);
      setSupStockQty(supply.in_stock_qty);
      setSupMinAlert(supply.min_stock_alert);
    } else {
      setEditingSupply(null);
      setSupName('');
      setSupUnit('un');
      setSupCost(0.40);
      setSupStockQty(100);
      setSupMinAlert(20);
    }
    setShowSupplyModal(true);
  };

  // Submit Supply
  const handleSaveSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: supName,
        unit: supUnit,
        unit_cost: supCost,
        in_stock_qty: supStockQty,
        min_stock_alert: supMinAlert,
      };

      let res: globalThis.Response;
      if (editingSupply) {
        res = await fetch(`/api/supplies/${encodeURIComponent(editingSupply.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/supplies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao processar dados no servidor');
      }

      setShowSupplyModal(false);
      setNotification({
        type: 'success',
        message: editingSupply ? 'Insumo atualizado com sucesso!' : 'Novo insumo cadastrado com sucesso!'
      });
      onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao salvar insumo: ' + (err.message || 'Falha na requisição')
      });
    }
  };

  // Quick adjust supply stock
  const handleAdjustSupplyStock = async (id: string, deltaQty: number) => {
    try {
      const res = await fetch(`/api/supplies/${encodeURIComponent(id)}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment_qty: deltaQty }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar estoque');
      onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao ajustar estoque: ' + (err.message || 'Erro de conexão')
      });
    }
  };

  // Perform Delete when confirmed in in-app modal
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const endpoint =
        deleteTarget.type === 'supply'
          ? `/api/supplies/${encodeURIComponent(deleteTarget.id)}`
          : deleteTarget.type === 'filament'
          ? `/api/filaments/${encodeURIComponent(deleteTarget.id)}`
          : `/api/material-purchases/${encodeURIComponent(deleteTarget.id)}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error ||
            `Falha ao remover ${
              deleteTarget.type === 'supply'
                ? 'o insumo'
                : deleteTarget.type === 'filament'
                ? 'o filamento'
                : 'o registro de entrada'
            }`
        );
      }

      setNotification({
        type: 'success',
        message:
          deleteTarget.type === 'supply'
            ? `Insumo "${deleteTarget.name}" excluído com sucesso!`
            : deleteTarget.type === 'filament'
            ? `Filamento "${deleteTarget.name}" excluído com sucesso!`
            : `Registro de entrada "${deleteTarget.name}" removido com sucesso!`
      });
      setDeleteTarget(null);
      if (deleteTarget.type === 'purchase') {
        fetchPurchases();
      }
      await onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erro ao excluir: ${err.message || 'Falha na requisição'}`
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* In-app Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-fadeIn shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
            aria-label="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Top Inventory Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-white/[0.06] shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium block truncate">Total Filamento em Estoque</span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-white mt-1 block tracking-tight">
            {Number((totalFilamentsStockG || 0) / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400">kg</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-mono truncate">{filaments.length} carretéis cadastrados</span>
        </div>

        <div className="bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-white/[0.06] shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium block truncate">Valor em Filamentos</span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-emerald-400 mt-1 block tracking-tight">
            R$ {Number(totalFilamentValue || 0).toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-mono truncate">Avaliado por grama</span>
        </div>

        <div className="bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-white/[0.06] shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium block truncate">Insumos & Acessórios</span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-white mt-1 block tracking-tight">
            {totalSuppliesUnits} <span className="text-xs font-normal text-slate-400">un</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-mono truncate">{supplies.length} tipos cadastrados</span>
        </div>

        <div className="bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-white/[0.06] shadow-sm">
          <span className="text-[11px] text-slate-400 font-medium block truncate">Valor em Insumos</span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-teal-400 mt-1 block tracking-tight">
            R$ {Number(totalSuppliesValue || 0).toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-mono truncate">Argolas, embalagens</span>
        </div>

        <div className="bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-white/[0.06] shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-400 font-medium block truncate">Produtos Acabados</span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-emerald-300 mt-1 block tracking-tight">
            {totalFinishedUnits} <span className="text-xs font-normal text-slate-400">un</span>
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block font-mono truncate">R$ {Number(totalFinishedValue || 0).toFixed(2)} em custo</span>
        </div>
      </div>

      {/* Tabs Switcher and Add Button */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="w-full xl:w-auto max-w-full overflow-hidden">
          <div className="stock-subtabs-container flex flex-nowrap items-center gap-1 sm:gap-1.5 bg-[#121215] p-1.5 rounded-2xl border border-white/[0.08] shadow-sm overflow-x-auto max-w-full no-scrollbar shrink-0">
            {/* Aba 1: Filamentos 3D */}
            <button
              type="button"
              id="tab-stock-filaments"
              onClick={() => setActiveTab('filaments')}
              className={`stock-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'filaments'
                  ? 'stock-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Filamentos 3D ({filaments.length})</span>
            </button>

            {/* Aba 2: Insumos & Acessórios */}
            <button
              type="button"
              id="tab-stock-supplies"
              onClick={() => setActiveTab('supplies')}
              className={`stock-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'supplies'
                  ? 'stock-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Insumos & Acessórios ({supplies.length})</span>
            </button>

            {/* Aba 3: Alerta Inteligente */}
            <button
              type="button"
              id="tab-smart-shopping-alert"
              onClick={() => setActiveTab('smart_alerts')}
              className={`stock-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'smart_alerts'
                  ? 'stock-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Alerta Inteligente</span>
              {smartSuggestions.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    smartCriticalCount > 0
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-white/10 text-white/90 border-white/20'
                  }`}
                >
                  {smartSuggestions.length}
                </span>
              )}
            </button>

            {/* Aba 4: Produtos Acabados */}
            <button
              type="button"
              id="tab-stock-products"
              onClick={() => setActiveTab('products')}
              className={`stock-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'products'
                  ? 'stock-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Produtos Acabados ({totalFinishedUnits} un.)</span>
            </button>

            {/* Aba 5: Entrada no Estoque (ao lado de Produtos Acabados) */}
            <button
              type="button"
              id="tab-stock-entries"
              onClick={() => setActiveTab('entries')}
              className={`stock-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'entries'
                  ? 'stock-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Entrada no Estoque</span>
              {purchases.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold bg-white/15 text-white">
                  {purchases.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeTab === 'filaments' ? (
            <button
              type="button"
              onClick={() => handleOpenFilamentModal()}
              className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Adicionar Carretel de Filamento
            </button>
          ) : activeTab === 'supplies' ? (
            <button
              type="button"
              onClick={() => handleOpenSupplyModal()}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Novo Insumo
            </button>
          ) : activeTab === 'entries' ? (
            <button
              type="button"
              id="btn-stock-entry-action"
              onClick={() => setIsPurchaseModalOpen(true)}
              className="integration-btn-primary bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer whitespace-nowrap"
              title="Registrar nova entrada de insumo ou filamento no estoque"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Entrada no Estoque</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Tab 1: Filaments Grid */}
      {activeTab === 'filaments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filaments.map((f) => {
            const percent = Math.min(100, Math.round((f.remaining_weight_g / f.total_weight_g) * 100));
            const isLow = f.remaining_weight_g < 200;
            const costPerG = f.cost_per_spool / f.total_weight_g;

            return (
              <div
                key={f.id}
                className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 shadow-sm shadow-black/40 transition"
              >
                {/* Header with color swatch */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-2xl border-2 border-white/20 shadow-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: f.color_hex }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white">{f.name}</h4>
                      <p className="text-xs text-slate-400">
                        {f.brand} • <span className="font-semibold text-sky-400">{f.material}</span> ({f.diameter}mm)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenFilamentModal(f)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'filament', id: f.id, name: `${f.name} (${f.brand})` })}
                      className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                      title="Excluir filamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stock Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      Estoque em Tempo Real:
                      {isLow && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-400 flex items-center gap-0.5 text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Baixo!
                          </span>
                          {onNavigateToQuotes && (
                            <button
                              type="button"
                              onClick={onNavigateToQuotes}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                              title="Cotar reposição na Central de Cotações"
                            >
                              Cotar
                            </button>
                          )}
                        </div>
                      )}
                    </span>
                    <span className="font-bold text-white">
                      {f.remaining_weight_g}g / {f.total_weight_g}g ({percent}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-[#0A0A0B] rounded-full overflow-hidden border border-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent < 20
                          ? 'bg-rose-500'
                          : percent < 50
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Cost and Spool Details */}
                <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Preço do Carretel</span>
                    <span className="font-bold text-white font-mono">R$ {Number(f.cost_per_spool || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Custo por Grama</span>
                    <span className="font-bold text-emerald-400 font-mono">R$ {Number(costPerG || 0).toFixed(4)}/g</span>
                  </div>
                </div>

                {/* Quick Stock Adjust Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs text-slate-400 border-t border-white/[0.06]">
                  <span className="text-[11px]">Ajuste Rápido:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => handleAdjustFilamentStock(f.id, -50)}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded-xl text-[11px] font-medium transition"
                      title="Descontar 50g"
                    >
                      -50g
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustFilamentStock(f.id, 500)}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded-xl text-[11px] font-medium transition"
                      title="Adicionar meio carretel (+500g)"
                    >
                      +500g
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustFilamentStock(f.id, 1000)}
                      className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition"
                      title="Novo carretel completo (+1000g)"
                    >
                      +1kg
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Supplies Grid */}
      {activeTab === 'supplies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supplies.map((s) => {
            const isLow = s.in_stock_qty <= s.min_stock_alert;

            return (
              <div
                key={s.id}
                className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 shadow-sm shadow-black/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">Unidade: {s.unit}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenSupplyModal(s)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'supply', id: s.id, name: s.name })}
                      className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                      title="Excluir insumo do estoque"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stock Level Info */}
                <div className="bg-[#0A0A0B]/80 p-3.5 rounded-2xl border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Custo Unitário</span>
                    <span className="font-bold text-emerald-400 text-sm font-mono">R$ {Number(s.unit_cost || 0).toFixed(2)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Estoque Atual</span>
                    <div className="flex items-center gap-1.5 justify-end font-mono">
                      <span className={`text-base font-bold ${isLow ? 'text-rose-400' : 'text-white'}`}>
                        {s.in_stock_qty}
                      </span>
                      <span className="text-slate-400 text-xs">{s.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Minimum Stock Alert indicator */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Mínimo: {s.min_stock_alert} {s.unit}</span>
                  {isLow && (
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Reposição Necessária!
                      </span>
                      {onNavigateToQuotes && (
                        <button
                          type="button"
                          onClick={onNavigateToQuotes}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                          title="Cotar reposição na Central de Cotações"
                        >
                          Cotar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Stock Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-[11px] text-slate-400">Entrada / Saída:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      type="button"
                      onClick={() => handleAdjustSupplyStock(s.id, -1)}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-2.5 py-1 rounded-xl text-xs font-medium transition"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustSupplyStock(s.id, 10)}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 px-3 py-1 rounded-xl text-xs font-medium transition"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustSupplyStock(s.id, 50)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-xl text-xs font-semibold transition"
                    >
                      +50
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Alerta Inteligente de Reposição & Compras */}
      {activeTab === 'smart_alerts' && (
        <div className="animate-fadeIn">
          <SmartShoppingAlert
            filaments={filaments}
            supplies={supplies}
            products={products}
            sales={sales}
            productionOrders={productionOrders}
            onQuickAddFilamentStock={handleAdjustFilamentStock}
            onQuickAddSupplyStock={handleAdjustSupplyStock}
            onQuickAddProductStock={handleQuickStockAdjustProduct}
            onRefreshData={onRefreshData}
            onNavigateToQuotes={onNavigateToQuotes}
          />
        </div>
      )}

      {/* Tab 3: Finished Products Stock Grid */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((prod) => {
            const stockQty = prod.ready_stock_qty || 0;
            const hasStock = stockQty > 0;
            const totalValue = stockQty * prod.total_cost;
            const potentialRevenue = stockQty * prod.sale_price;

            return (
              <div
                key={prod.id}
                className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 shadow-sm shadow-black/40 flex flex-col justify-between transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-xl uppercase tracking-wider">
                        {prod.category}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{prod.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Quick stock adjustment */}
                      <div className="flex items-center bg-[#0A0A0B] border border-white/[0.08] rounded-xl p-0.5 text-xs text-slate-400 font-mono">
                        <button
                          type="button"
                          onClick={() => handleQuickStockAdjustProduct(prod, -1)}
                          disabled={stockAdjustingId === prod.id || stockQty <= 0}
                          className="p-1 hover:text-white rounded-lg hover:bg-white/[0.08] disabled:opacity-30 transition"
                          title="Diminuir 1 un."
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-bold text-white text-xs">
                          {stockQty} un.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickStockAdjustProduct(prod, 1)}
                          disabled={stockAdjustingId === prod.id}
                          className="p-1 hover:text-white rounded-lg hover:bg-white/[0.08] disabled:opacity-30 transition"
                          title="Adicionar 1 un."
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {prod.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
                  )}

                  {/* Stock Valuation Details */}
                  <div className="bg-[#0A0A0B]/80 p-3.5 rounded-2xl border border-white/[0.06] space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Custo de Produção:</span>
                      <span className="text-white">R$ {Number(prod.total_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Preço de Venda:</span>
                      <span className="text-emerald-400 font-bold">R$ {Number(prod.sale_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.06] flex justify-between">
                      <span className="text-slate-400 font-sans">Valor em Estoque (Custo):</span>
                      <span className="text-sky-300 font-bold">R$ {Number(totalValue || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Receita Potencial:</span>
                      <span className="text-emerald-300 font-bold">R$ {Number(potentialRevenue || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className={`text-[11px] font-medium ${hasStock ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {hasStock ? `${stockQty} unidades prontas` : 'Sem estoque'}
                  </span>
                  {onOpenSaleModal && hasStock && (
                    <button
                      type="button"
                      onClick={() => onOpenSaleModal(prod)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer text-xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Vender
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 5: Entradas no Estoque (Histórico e Gestão de Aquisições) */}
      {activeTab === 'entries' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
                Total de Entradas
              </span>
              <span className="text-xl font-bold text-white mt-1 block font-mono">
                {purchases.length} {purchases.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                Total Investido em Entradas
              </span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">
                R$ {purchases.reduce((acc, p) => acc + Number(p.total_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-[#121215] border border-white/[0.08] p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                Itens Movimentados
              </span>
              <span className="text-xl font-bold text-white mt-1 block font-mono">
                {purchases.reduce((acc, p) => acc + Number(p.quantity || 0), 0)} un./itens
              </span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] p-3.5 rounded-2xl border border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filtrar:</span>
              {(['all', 'filament', 'supply', 'other'] as const).map((filterType) => (
                <button
                  key={filterType}
                  type="button"
                  onClick={() => setPurchaseFilter(filterType)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    purchaseFilter === filterType
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                      : 'bg-[#1c1c20] text-slate-400 hover:text-white border border-white/[0.04]'
                  }`}
                >
                  {filterType === 'all'
                    ? 'Todos'
                    : filterType === 'filament'
                    ? 'Filamentos'
                    : filterType === 'supply'
                    ? 'Insumos'
                    : 'Outros'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  placeholder="Buscar por item, fornecedor..."
                  className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(true)}
                className="integration-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Entrada</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#121215] rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1c1c20] text-slate-400 font-bold border-b border-white/[0.06]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Item / Material</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4 text-center">Qtd.</th>
                    <th className="py-3 px-4 text-right">Custo Unit.</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPurchases.map((purchase) => {
                    const isFilament = purchase.item_type === 'filament';
                    const isSupply = purchase.item_type === 'supply';

                    return (
                      <tr key={purchase.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap font-mono">
                          {purchase.purchase_date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{purchase.item_name}</span>
                          </div>
                          {purchase.notes && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {purchase.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFilament
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                : isSupply
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
                            }`}
                          >
                            {isFilament ? 'Filamento' : isSupply ? 'Insumo' : 'Geral'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {purchase.supplier || 'Não informado'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white font-mono">
                          {purchase.quantity} {purchase.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-mono">
                          R$ {Number(purchase.unit_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400 font-mono">
                          R$ {Number(purchase.total_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-slate-300">
                            {purchase.payment_method || 'PIX'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'purchase',
                                id: purchase.id,
                                name: `${purchase.item_name} (${purchase.quantity} ${purchase.unit})`,
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Remover Registro de Entrada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShoppingCart className="w-8 h-8 text-slate-600" />
                          <p className="text-sm font-medium text-slate-400">
                            {purchases.length === 0
                              ? 'Nenhuma entrada no estoque registrada até o momento.'
                              : 'Nenhum registro encontrado com os filtros selecionados.'}
                          </p>
                          {purchases.length === 0 && (
                            <button
                              type="button"
                              onClick={() => setIsPurchaseModalOpen(true)}
                              className="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Registrar Primeira Entrada</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Filament */}
      {showFilamentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              {editingFilament ? 'Editar Carretel de Filamento' : 'Cadastrar Novo Carretel de Filamento'}
            </h3>

            <form onSubmit={handleSaveFilament} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do Filamento</label>
                  <input
                    type="text"
                    required
                    value={filName}
                    onChange={(e) => setFilName(e.target.value)}
                    placeholder="Ex: PLA Silk Prata Brilhante"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Marca / Fabricante</label>
                  <input
                    type="text"
                    required
                    value={filBrand}
                    onChange={(e) => setFilBrand(e.target.value)}
                    placeholder="Ex: 3D Fila, Voolt3D, eSun"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de Material</label>
                  <select
                    value={filMaterial}
                    onChange={(e) => setFilMaterial(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/60"
                  >
                    <option value="PLA">PLA (1.24 g/cm³)</option>
                    <option value="PETG">PETG (1.27 g/cm³)</option>
                    <option value="ABS">ABS (1.04 g/cm³)</option>
                    <option value="TPU">TPU Flexível (1.21 g/cm³)</option>
                    <option value="ASA">ASA (1.07 g/cm³)</option>
                    <option value="Resina">Resina UV (1.15 g/cm³)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome da Cor</label>
                  <input
                    type="text"
                    required
                    value={filColor}
                    onChange={(e) => setFilColor(e.target.value)}
                    placeholder="Ex: Preto Fosco"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Cor Visual (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={filColorHex}
                      onChange={(e) => setFilColorHex(e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border border-white/[0.1] cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={filColorHex}
                      onChange={(e) => setFilColorHex(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Peso Total Inicial (g)</label>
                  <input
                    type="number"
                    required
                    value={filTotalWeight}
                    onChange={(e) => setFilTotalWeight(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Peso Restante Atual (g)</label>
                  <input
                    type="number"
                    required
                    value={filRemainingWeight}
                    onChange={(e) => setFilRemainingWeight(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Preço do Carretel (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={filCost}
                    onChange={(e) => setFilCost(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Diâmetro (mm)</label>
                  <select
                    value={filDiameter}
                    onChange={(e) => setFilDiameter(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  >
                    <option value={1.75}>1.75 mm</option>
                    <option value={2.85}>2.85 mm</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowFilamentModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow transition"
                >
                  Salvar Carretel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Supply */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              {editingSupply ? 'Editar Insumo' : 'Cadastrar Novo Insumo'}
            </h3>

            <form onSubmit={handleSaveSupply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do Insumo</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Ex: Argola para Chaveiro 25mm com Corrente"
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unidade</label>
                  <select
                    value={supUnit}
                    onChange={(e) => setSupUnit(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="un">un (unidade)</option>
                    <option value="kit">kit</option>
                    <option value="par">par</option>
                    <option value="m">metro (m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Custo Unitário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={supCost}
                    onChange={(e) => setSupCost(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Qtd em Estoque</label>
                  <input
                    type="number"
                    required
                    value={supStockQty}
                    onChange={(e) => setSupStockQty(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Alerta de Mínimo</label>
                  <input
                    type="number"
                    required
                    value={supMinAlert}
                    onChange={(e) => setSupMinAlert(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowSupplyModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow transition"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Registrar Aquisição / Entrada no Estoque */}
      <StockPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        filaments={filaments}
        supplies={supplies}
        onSuccess={(msg) => {
          setNotification({ type: 'success', message: msg });
          fetchPurchases();
          onRefreshData();
        }}
      />

      {/* Confirmation Modal for deletion (replaces window.confirm) */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={
          deleteTarget?.type === 'supply'
            ? 'Excluir Insumo do Estoque'
            : deleteTarget?.type === 'filament'
            ? 'Excluir Carretel de Filamento'
            : 'Excluir Registro de Entrada'
        }
        itemName={deleteTarget?.name}
        message={
          deleteTarget?.type === 'supply'
            ? 'Tem certeza que deseja excluir este insumo? Ele deixará de constar nas opções de montagem e BOM de produtos.'
            : deleteTarget?.type === 'filament'
            ? 'Tem certeza que deseja excluir este carretel? Os dados de pesagem e saldo em estoque serão apagados permanentemente.'
            : 'Tem certeza que deseja excluir este registro de entrada no estoque? O histórico desta aquisição será removido.'
        }
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
};
