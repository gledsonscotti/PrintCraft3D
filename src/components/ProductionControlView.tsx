import React, { useState } from 'react';
import {
  Factory,
  Layers,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer as PrinterIcon,
  Package,
  ArrowRight,
  Filter,
  Search,
  Flame,
  User,
  Store,
  Tag,
  Wrench,
  X,
  Trash2,
  RefreshCw,
  Sliders,
  ChevronRight,
  BarChart3,
  Calendar,
  AlertCircle,
  History
} from 'lucide-react';
import {
  ProductionOrder,
  ProductionPriority,
  ProductionStatus,
  ProductionDestination,
  Product,
  Printer,
  Filament,
  Supply,
  ProductSale,
  PrintJob
} from '../types';
import { PrintHistoryView } from './PrintHistoryView';
import { DirectPrintModal } from './DirectPrintModal';

interface ProductionControlViewProps {
  orders: ProductionOrder[];
  products: Product[];
  printers: Printer[];
  filaments: Filament[];
  supplies: Supply[];
  sales: ProductSale[];
  printJobs?: PrintJob[];
  onRefreshData: () => void;
  onOpenCreateOrderModal?: () => void;
  preselectedSaleForOP?: ProductSale | null;
  onClearPreselectedSale?: () => void;
  theme?: string;
}

export function ProductionControlView({
  orders,
  products,
  printers,
  filaments,
  supplies,
  sales,
  printJobs = [],
  onRefreshData,
  preselectedSaleForOP,
  onClearPreselectedSale,
  theme
}: ProductionControlViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'farm' | 'history'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterPrinter, setFilterPrinter] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(Boolean(preselectedSaleForOP));
  const [showFailModal, setShowFailModal] = useState<boolean>(false);
  const [selectedOpForDirectPrint, setSelectedOpForDirectPrint] = useState<ProductionOrder | null>(null);
  const [orderToFail, setOrderToFail] = useState<ProductionOrder | null>(null);
  const [failReason, setFailReason] = useState('Descolamento da mesa de impressão (warping)');
  const [wastedGrams, setWastedGrams] = useState<number>(0);

  // Form states for New OP
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedSaleForOP?.product_id || '');
  const [customProductName, setCustomProductName] = useState<string>(preselectedSaleForOP?.product_name || '');
  const [orderQty, setOrderQty] = useState<number>(preselectedSaleForOP?.quantity || 1);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>('');
  const [filamentWeightPerUnit, setFilamentWeightPerUnit] = useState<number>(0);
  const [printTimePerUnit, setPrintTimePerUnit] = useState<number>(0);
  const [priority, setPriority] = useState<ProductionPriority>('normal');
  const [destination, setDestination] = useState<ProductionDestination>(preselectedSaleForOP ? 'sale' : 'stock');
  const [selectedSaleId, setSelectedSaleId] = useState<string>(preselectedSaleForOP?.id || '');
  const [customerName, setCustomerName] = useState<string>(preselectedSaleForOP?.customer_name || '');
  const [notes, setNotes] = useState<string>('');
  const [startImmediately, setStartImmediately] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-fill from Product selection
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setCustomProductName(prod.name);
      setFilamentWeightPerUnit(prod.filament_weight_g || 0);
      setPrintTimePerUnit(prod.print_time_minutes || 0);
      if (prod.printer_id) setSelectedPrinterId(prod.printer_id);
      if (prod.filament_id) setSelectedFilamentId(prod.filament_id);
    }
  };

  // Reset & prepare OP modal
  const openNewOrderModal = (initialSale?: ProductSale, initialProduct?: Product) => {
    if (initialSale) {
      setSelectedProductId(initialSale.product_id || '');
      setCustomProductName(initialSale.product_name);
      setOrderQty(initialSale.quantity || 1);
      setDestination('sale');
      setSelectedSaleId(initialSale.id);
      setCustomerName(initialSale.customer_name || initialSale.channel_name);
      setPriority('high');
      if (initialSale.product_id) {
        handleProductSelect(initialSale.product_id);
      }
    } else if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      setCustomProductName(initialProduct.name);
      setOrderQty(5);
      setDestination('stock');
      setSelectedSaleId('');
      setCustomerName('Estoque Pronta-Entrega');
      setPriority('normal');
      handleProductSelect(initialProduct.id);
    } else {
      setSelectedProductId('');
      setCustomProductName('');
      setOrderQty(1);
      setSelectedPrinterId(printers.find((p) => p.status === 'available')?.id || printers[0]?.id || '');
      setSelectedFilamentId(filaments[0]?.id || '');
      setFilamentWeightPerUnit(0);
      setPrintTimePerUnit(0);
      setPriority('normal');
      setDestination('stock');
      setSelectedSaleId('');
      setCustomerName('');
      setNotes('');
      setStartImmediately(false);
    }
    setShowCreateModal(true);
  };

  // Calculations for total material & time
  const totalFilamentGrams = Number((filamentWeightPerUnit * orderQty).toFixed(1));
  const totalPrintMinutes = Math.round(printTimePerUnit * orderQty);

  // Filtered orders
  const filteredOrders = orders.filter((op) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      op.op_number.toLowerCase().includes(term) ||
      op.product_name.toLowerCase().includes(term) ||
      (op.customer_name && op.customer_name.toLowerCase().includes(term)) ||
      (op.printer_name && op.printer_name.toLowerCase().includes(term));

    const matchesPriority = filterPriority === 'all' || op.priority === filterPriority;
    const matchesPrinter = filterPrinter === 'all' || op.printer_id === filterPrinter;
    const matchesStatus = filterStatus === 'all' || op.status === filterStatus;

    return matchesSearch && matchesPriority && matchesPrinter && matchesStatus;
  });

  // Aggregated KPIs
  const activeOrders = orders.filter((o) => o.status === 'in_progress');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const postProcessingOrders = orders.filter((o) => o.status === 'post_processing');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const failedOrders = orders.filter((o) => o.status === 'failed');

  const activePrintersCount = printers.filter((p) => p.status === 'printing').length;
  const totalPrintersCount = printers.length;
  const printerUtilizationPercent = totalPrintersCount > 0 ? Math.round((activePrintersCount / totalPrintersCount) * 100) : 0;

  const totalPiecesInQueue = pendingOrders.reduce((acc, o) => acc + o.quantity, 0) + activeOrders.reduce((acc, o) => acc + o.quantity, 0);
  const totalMinutesInQueue = [...pendingOrders, ...activeOrders].reduce((acc, o) => acc + o.print_time_minutes, 0);
  const hoursInQueue = Math.floor(totalMinutesInQueue / 60);
  const remainingMinsInQueue = totalMinutesInQueue % 60;

  // Actions
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProductName.trim()) {
      alert('Por favor, informe o nome do produto ou peça.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        product_id: selectedProductId || null,
        product_name: customProductName.trim(),
        quantity: Math.max(1, Number(orderQty) || 1),
        printer_id: selectedPrinterId || null,
        filament_id: selectedFilamentId || null,
        filament_weight_g: totalFilamentGrams,
        print_time_minutes: totalPrintMinutes,
        priority,
        status: startImmediately ? 'in_progress' : 'pending',
        destination,
        sale_id: selectedSaleId || null,
        customer_name: customerName.trim() || (destination === 'stock' ? 'Estoque da Oficina' : 'Cliente'),
        notes: notes.trim(),
        supplies_json: '[]'
      };

      // If product selected, get extra supplies json
      if (selectedProductId) {
        const prod = products.find((p) => p.id === selectedProductId);
        if (prod && prod.extra_supplies_json) {
          payload.supplies_json = prod.extra_supplies_json;
        }
      }

      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao criar ordem de produção');
      }

      setShowCreateModal(false);
      if (onClearPreselectedSale) onClearPreselectedSale();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar OP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: ProductionStatus, printerId?: string, progress?: number) => {
    try {
      const res = await fetch(`/api/production-orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          printer_id: printerId,
          progress_percent: progress
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao atualizar status da OP');
      }

      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status');
    }
  };

  const handleUpdateProgress = async (orderId: string, progress: number) => {
    try {
      await fetch(`/api/production-orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          progress_percent: progress
        })
      });
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmFail = async () => {
    if (!orderToFail) return;
    try {
      const res = await fetch(`/api/production-orders/${encodeURIComponent(orderToFail.id)}/fail`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fail_reason: failReason,
          wasted_filament_g: wastedGrams
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao registrar falha');
      }

      setShowFailModal(false);
      setOrderToFail(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar falha');
    }
  };

  const handleDeleteOrder = async (orderId: string, opNumber: string) => {
    if (!confirm(`Deseja realmente excluir a ${opNumber}? Se a impressora estiver em uso por ela, será liberada.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/production-orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Falha ao excluir OP');
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir OP');
    }
  };

  const getPriorityBadge = (p: ProductionPriority) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="badge-priority badge-priority-urgent inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            Urgente
          </span>
        );
      case 'high':
        return (
          <span className="badge-priority badge-priority-high inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Alta
          </span>
        );
      case 'normal':
        return (
          <span className="badge-priority badge-priority-normal inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Normal
          </span>
        );
      case 'low':
        return (
          <span className="badge-priority badge-priority-low inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            Baixa
          </span>
        );
    }
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                Controle de Produção & PCP
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#18181b] border border-white/[0.1] text-emerald-400">
                  {orders.length} OPs
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie ordens de serviço, fila de impressão, ocupação do parque fabril e pós-processamento com baixa automática de insumos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto pb-1 md:pb-0">
          {/* View switcher */}
          <div className="production-view-mode-container flex items-center bg-[#131316] p-1 rounded-2xl border border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`production-view-mode-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'production-view-mode-btn-active bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`production-view-mode-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'production-view-mode-btn-active bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Detalhe</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('farm')}
              className={`production-view-mode-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'farm'
                  ? 'production-view-mode-btn-active bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Farm</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`production-view-mode-btn px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'history'
                  ? 'production-view-mode-btn-active bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNewOrderModal()}
            className="production-btn-new-op flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm shadow-emerald-500/20 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ordem de Produção (OP)</span>
          </button>
        </div>
      </div>

      {/* Bento KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="production-kpi-card p-3.5 sm:p-4 rounded-2xl bg-[#141417] border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Em Impressão</span>
            <span className="text-[10px] text-sky-400 font-mono font-medium">{printerUtilizationPercent}% ({activePrintersCount}/{totalPrintersCount})</span>
          </div>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-white mt-1 block tracking-tight">
            {activeOrders.length} <span className="text-xs font-normal text-slate-400">OPs ativas</span>
          </span>
        </div>

        <div className="production-kpi-card p-3.5 sm:p-4 rounded-2xl bg-[#141417] border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Na Fila de Espera</span>
            <span className="text-[10px] text-amber-300 font-mono font-medium">{hoursInQueue}h {remainingMinsInQueue}m</span>
          </div>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-amber-300 mt-1 block tracking-tight">
            {pendingOrders.length} <span className="text-xs font-normal text-slate-400">OPs aguardando</span>
          </span>
        </div>

        <div className="production-kpi-card p-3.5 sm:p-4 rounded-2xl bg-[#141417] border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Pós-Processamento</span>
            <span className="text-[10px] text-purple-300 font-mono font-medium">{postProcessingOrders.reduce((acc, o) => acc + o.quantity, 0)} peças</span>
          </div>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-purple-300 mt-1 block tracking-tight">
            {postProcessingOrders.length} <span className="text-xs font-normal text-slate-400">em acabamento</span>
          </span>
        </div>

        <div className="production-kpi-card p-3.5 sm:p-4 rounded-2xl bg-[#141417] border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium block truncate">Concluídas & Lotes</span>
            <span className="text-[10px] text-rose-400 font-mono font-medium">{failedOrders.length} perdas</span>
          </div>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-emerald-400 mt-1 block tracking-tight">
            {completedOrders.length} <span className="text-xs font-normal text-slate-400">finalizadas</span>
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="production-search-filter-bar p-4 rounded-3xl bg-[#121215] border border-white/[0.08] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por OP #, produto, cliente, máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="production-search-input w-full pl-10 pr-4 py-2 rounded-2xl bg-[#18181b] border border-white/[0.1] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtros:</span>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="production-filter-select px-3 py-2 rounded-xl bg-[#18181b] border border-white/[0.1] text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="urgent">Apenas Urgente</option>
            <option value="high">Alta Prioridade</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </select>

          <select
            value={filterPrinter}
            onChange={(e) => setFilterPrinter(e.target.value)}
            className="production-filter-select px-3 py-2 rounded-xl bg-[#18181b] border border-white/[0.1] text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todas as Impressoras</option>
            {printers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="production-filter-select px-3 py-2 rounded-xl bg-[#18181b] border border-white/[0.1] text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Na Fila (Pendente)</option>
            <option value="in_progress">Em Impressão</option>
            <option value="post_processing">Pós-Processamento</option>
            <option value="completed">Concluídos</option>
            <option value="failed">Falhas / Cancelados</option>
          </select>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="kanban-board-grid grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {/* Col 1: Na Fila (Pendente) */}
          <div className="kanban-column kanban-column-pending rounded-3xl bg-[#131316] border border-white/[0.08] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Na Fila (Pendente)</h3>
              </div>
              <span className="kanban-column-counter text-xs font-mono font-semibold text-slate-400 bg-[#1a1a1f] px-2 py-0.5 rounded-full border border-white/[0.08]">
                {pendingOrders.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {pendingOrders.length === 0 ? (
                <div className="kanban-empty-placeholder p-6 text-center text-slate-500 text-xs rounded-2xl border border-dashed border-white/[0.08]">
                  Nenhuma ordem aguardando início.
                </div>
              ) : (
                pendingOrders.map((op) => (
                  <div
                    key={op.id}
                    className="kanban-card kanban-card-pending p-4 rounded-2xl bg-[#18181c] border border-white/[0.08] hover:border-amber-400/40 transition space-y-3 shadow-md group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="kanban-op-number text-xs font-bold font-mono text-amber-300">{op.op_number}</span>
                      {getPriorityBadge(op.priority)}
                    </div>

                    <div>
                      <h4 className="kanban-product-title text-sm font-bold text-white line-clamp-2">{op.product_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="kanban-qty-badge text-[11px] font-mono font-semibold text-slate-300 bg-[#222228] px-2 py-0.5 rounded-lg border border-white/[0.08]">
                          {op.quantity} {op.quantity === 1 ? 'unidade' : 'unidades'}
                        </span>
                        <span className={`kanban-dest-badge text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                          op.destination === 'stock'
                            ? 'kanban-dest-stock bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'kanban-dest-sale bg-purple-500/10 text-purple-300 border-purple-500/20'
                        }`}>
                          {op.destination === 'stock' ? 'P/ Estoque' : `Venda: ${op.customer_name || 'Cliente'}`}
                        </span>
                      </div>
                    </div>

                    <div className="kanban-specs-box space-y-1 text-xs text-slate-400 border-t border-white/[0.06] pt-2.5 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <PrinterIcon className="w-3.5 h-3.5 text-slate-400" /> Máquina:
                        </span>
                        <strong className="text-slate-200 truncate max-w-[130px]">{op.printer_name || 'A definir'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Duração:
                        </span>
                        <strong className="text-slate-200">{formatMinutes(op.print_time_minutes)}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Flame className="w-3.5 h-3.5 text-slate-400" /> Filamento:
                        </span>
                        <strong className="text-slate-200">{op.filament_weight_g}g</strong>
                      </div>
                    </div>

                    {op.notes && (
                      <p className="kanban-notes-box text-[11px] text-slate-400 bg-[#121215] p-2 rounded-xl border border-white/[0.06] italic">
                        {op.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(op.id, op.op_number)}
                        className="kanban-btn-trash p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Excluir OP"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(op.id, 'in_progress', op.printer_id, 10)}
                        className="kanban-btn-start flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Iniciar Impressão</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Col 2: Em Impressão */}
          <div className="kanban-column kanban-column-progress rounded-3xl bg-[#131316] border border-white/[0.08] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse inline-block" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Em Impressão</h3>
              </div>
              <span className="kanban-column-counter text-xs font-mono font-semibold text-slate-400 bg-[#1a1a1f] px-2 py-0.5 rounded-full border border-white/[0.08]">
                {activeOrders.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {activeOrders.length === 0 ? (
                <div className="kanban-empty-placeholder p-6 text-center text-slate-500 text-xs rounded-2xl border border-dashed border-white/[0.08]">
                  Nenhuma impressora operando no momento.
                </div>
              ) : (
                activeOrders.map((op) => (
                  <div
                    key={op.id}
                    className="kanban-card kanban-card-progress p-4 rounded-2xl bg-[#18181c] border border-sky-500/30 hover:border-sky-400/60 transition space-y-3 shadow-lg group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500/20">
                      <div
                        className="h-full bg-sky-400 transition-all duration-300"
                        style={{ width: `${Math.max(5, op.progress_percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="kanban-op-number text-xs font-bold font-mono text-sky-400">{op.op_number}</span>
                      {getPriorityBadge(op.priority)}
                    </div>

                    <div>
                      <h4 className="kanban-product-title text-sm font-bold text-white line-clamp-2">{op.product_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="kanban-qty-badge text-[11px] font-mono font-semibold text-slate-300 bg-[#222228] px-2 py-0.5 rounded-lg border border-white/[0.08]">
                          {op.quantity} un
                        </span>
                        <span className="text-[11px] text-sky-300 font-mono font-medium flex items-center gap-1">
                          <PrinterIcon className="w-3 h-3 text-sky-400" />
                          {op.printer_name}
                        </span>
                      </div>
                    </div>

                    {/* Progress Slider / Quick Select */}
                    <div className="kanban-progress-box space-y-1.5 bg-[#121215] p-2.5 rounded-xl border border-white/[0.06]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Progresso da Mesa</span>
                        <strong className="text-sky-300 font-mono">{op.progress_percent}%</strong>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 95].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleUpdateProgress(op.id, pct)}
                            className={`py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                              op.progress_percent >= pct
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-[#18181c] text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="kanban-specs-box space-y-1 text-xs text-slate-400 border-t border-white/[0.06] pt-2 font-mono">
                      <div className="flex items-center justify-between">
                        <span>Filamento:</span>
                        <strong className="text-slate-200 truncate max-w-[140px]">{op.filament_name}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tempo Total:</span>
                        <strong className="text-slate-200">{formatMinutes(op.print_time_minutes)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(op.id, 'pending', undefined, 0)}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition cursor-pointer"
                        title="Voltar um passo atrás (Para Pendente)"
                      >
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOrderToFail(op);
                          setWastedGrams(Math.round((op.filament_weight_g * (op.progress_percent || 50)) / 100));
                          setShowFailModal(true);
                        }}
                        className="kanban-btn-fail p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Registrar Falha / Desperdício"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(op.id, 'post_processing', undefined, 90)}
                        className="kanban-btn-postprocess flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-[11px] font-bold transition shadow-sm cursor-pointer"
                        title="Pós-Processar"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Pós-Proc.</span>
                      </button>

                      {/* Botão de Impressão Direta no Kanban */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOpForDirectPrint(op);
                        }}
                        className="p-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 transition cursor-pointer"
                        title="Impressão Direta na Máquina (LAN / Nuvem)"
                      >
                        <PrinterIcon className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Col 3: Pós-Processamento (Bancada de Acabamento) */}
          <div className="kanban-column kanban-column-postprocess rounded-3xl bg-[#131316] border border-white/[0.08] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pós-Processamento</h3>
              </div>
              <span className="kanban-column-counter text-xs font-mono font-semibold text-slate-400 bg-[#1a1a1f] px-2 py-0.5 rounded-full border border-white/[0.08]">
                {postProcessingOrders.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {postProcessingOrders.length === 0 ? (
                <div className="kanban-empty-placeholder p-6 text-center text-slate-500 text-xs rounded-2xl border border-dashed border-white/[0.08]">
                  Nenhuma peça em bancada de acabamento.
                </div>
              ) : (
                postProcessingOrders.map((op) => (
                  <div
                    key={op.id}
                    className="kanban-card kanban-card-postprocess p-4 rounded-2xl bg-[#18181c] border border-purple-500/30 hover:border-purple-400/60 transition space-y-3 shadow-md group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="kanban-op-number text-xs font-bold font-mono text-purple-300">{op.op_number}</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Máquina Liberada ✓
                      </span>
                    </div>

                    <div>
                      <h4 className="kanban-product-title text-sm font-bold text-white line-clamp-2">{op.product_name}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Lote de <strong className="text-white font-mono">{op.quantity} un</strong> • Destino:{' '}
                        <strong className="text-purple-300">{op.destination === 'stock' ? 'Estoque' : op.customer_name}</strong>
                      </p>
                    </div>

                    <div className="kanban-tasks-box p-2.5 rounded-xl bg-[#121215] border border-white/[0.06] text-[11px] text-slate-300 space-y-1">
                      <span className="font-semibold text-purple-300 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Tarefas de Bancada:
                      </span>
                      <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-1">
                        <li>Remover suportes e lixar pontos de contato</li>
                        <li>Montar insumos / parafusos / argolas</li>
                        <li>Inspeção de qualidade e embalagem</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(op.id, 'in_progress', op.printer_id, 50)}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition cursor-pointer"
                        title="Voltar um passo atrás (Para Em Impressão)"
                      >
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOrderToFail(op);
                          setWastedGrams(op.filament_weight_g);
                          setShowFailModal(true);
                        }}
                        className="kanban-btn-fail p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Registrar Falha / Peça danificada no acabamento"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(op.id, 'completed', undefined, 100)}
                        className="kanban-btn-finish flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Col 4: Concluídos & Falhas */}
          <div className="kanban-column kanban-column-completed rounded-3xl bg-[#131316] border border-white/[0.08] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Concluídas & Lotes</h3>
              </div>
              <span className="kanban-column-counter text-xs font-mono font-semibold text-slate-400 bg-[#1a1a1f] px-2 py-0.5 rounded-full border border-white/[0.08]">
                {completedOrders.length + failedOrders.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {[...completedOrders, ...failedOrders].length === 0 ? (
                <div className="kanban-empty-placeholder p-6 text-center text-slate-500 text-xs rounded-2xl border border-dashed border-white/[0.08]">
                  Nenhum lote finalizado recentemente.
                </div>
              ) : (
                [...completedOrders, ...failedOrders].slice(0, 10).map((op) => (
                  <div
                    key={op.id}
                    className={`kanban-card p-3.5 rounded-2xl border transition space-y-2 shadow-sm ${
                      op.status === 'completed'
                        ? 'kanban-card-completed bg-[#18181c] border-emerald-500/20'
                        : 'kanban-card-failed bg-rose-950/20 border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="kanban-op-number text-xs font-bold font-mono text-white">{op.op_number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          op.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        }`}
                      >
                        {op.status === 'completed' ? 'Finalizada ✓' : 'Falha ✕'}
                      </span>
                    </div>

                    <h4 className="kanban-product-title text-xs font-bold text-white truncate">{op.product_name}</h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Lote: {op.quantity} un</span>
                      <span>Filamento: {op.filament_weight_g}g</span>
                    </div>

                    {op.fail_reason && (
                      <p className="text-[10px] text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-500/20 font-mono">
                        Motivo: {op.fail_reason} ({op.wasted_filament_g || 0}g perdidos)
                      </p>
                    )}

                    {op.completed_at && (
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Concluído em {new Date(op.completed_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED TABLE */}
      {viewMode === 'list' && (
        <div className="production-table-wrapper bg-[#131316] border border-white/[0.08] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="production-table-header border-b border-white/[0.08] bg-[#18181c] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">OP #</th>
                  <th className="py-3 px-4">Produto / Peça</th>
                  <th className="py-3 px-4">Qtd</th>
                  <th className="py-3 px-4">Destino</th>
                  <th className="py-3 px-4">Impressora</th>
                  <th className="py-3 px-4">Filamento</th>
                  <th className="py-3 px-4">Tempo Est.</th>
                  <th className="py-3 px-4">Prioridade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-500">
                      Nenhuma ordem de produção encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((op) => (
                    <tr key={op.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">{op.op_number}</td>
                      <td className="py-3 px-4">
                        <strong className="text-white block">{op.product_name}</strong>
                        {op.notes && <span className="text-[10px] text-slate-400 line-clamp-1">{op.notes}</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">{op.quantity} un</td>
                      <td className="py-3 px-4">
                        <span className={`production-dest-badge px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          op.destination === 'stock'
                            ? 'kanban-dest-stock bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'kanban-dest-sale bg-purple-500/10 text-purple-300 border-purple-500/20'
                        }`}>
                          {op.destination === 'stock' ? 'Estoque' : op.customer_name || 'Venda'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{op.printer_name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{op.filament_weight_g}g ({op.filament_name})</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{formatMinutes(op.print_time_minutes)}</td>
                      <td className="py-3 px-4">{getPriorityBadge(op.priority)}</td>
                      <td className="py-3 px-4">
                        {op.status === 'pending' && (
                          <span className="text-amber-400 font-semibold">Na Fila</span>
                        )}
                        {op.status === 'in_progress' && (
                          <span className="text-sky-400 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                            {op.progress_percent}%
                          </span>
                        )}
                        {op.status === 'post_processing' && (
                          <span className="text-purple-300 font-semibold">Pós-Processo</span>
                        )}
                        {op.status === 'completed' && (
                          <span className="text-emerald-400 font-semibold">Concluída</span>
                        )}
                        {op.status === 'failed' && (
                          <span className="text-rose-400 font-semibold">Falha</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {op.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(op.id, 'in_progress', op.printer_id, 10)}
                              className="production-table-btn-start px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                            >
                              Iniciar
                            </button>
                          )}
                          {op.status === 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(op.id, 'post_processing', undefined, 90)}
                              className="production-table-btn-postprocess px-2.5 py-1 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Acabamento
                            </button>
                          )}
                          {op.status === 'post_processing' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(op.id, 'completed', undefined, 100)}
                              className="production-table-btn-finish px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                            >
                              Concluir
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(op.id, op.op_number)}
                            className="kanban-btn-trash p-1 rounded-lg text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: 3D PRINTER FARM MONITOR */}
      {viewMode === 'farm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {printers.map((printer) => {
              const currentJob = activeOrders.find((o) => o.printer_id === printer.id);
              const isPrinting = printer.status === 'printing' || Boolean(currentJob);

              return (
                <div
                  key={printer.id}
                  className={`farm-printer-card p-5 rounded-3xl border transition shadow-sm space-y-4 ${
                    isPrinting
                      ? 'farm-printer-printing bg-[#151a22] border-sky-500/40 shadow-sky-500/10'
                      : printer.status === 'maintenance'
                      ? 'farm-printer-maintenance bg-[#1f1515] border-rose-500/30'
                      : 'farm-printer-available bg-[#131316] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                        isPrinting
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-white/[0.05] text-slate-400'
                      }`}>
                        <PrinterIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{printer.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {printer.total_power_watts}W • Deprec. R${printer.hourly_depreciation}/h
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isPrinting
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : printer.status === 'maintenance'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {isPrinting ? 'Imprimindo' : printer.status === 'maintenance' ? 'Manutenção' : 'Disponível'}
                    </span>
                  </div>

                  {/* Active Job Details */}
                  {currentJob ? (
                    <div className="farm-job-box p-3.5 rounded-2xl bg-[#0f141a] border border-sky-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-sky-400">{currentJob.op_number}</span>
                        <span className="text-[11px] font-mono font-bold text-white">{currentJob.progress_percent}%</span>
                      </div>
                      <h5 className="text-xs font-bold text-white truncate">{currentJob.product_name}</h5>
                      <div className="w-full bg-[#1c222c] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-400 h-full transition-all duration-300"
                          style={{ width: `${currentJob.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Lote: {currentJob.quantity} un</span>
                        <span>Duração: {formatMinutes(currentJob.print_time_minutes)}</span>
                      </div>
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-sky-500/10">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(currentJob.id, 'post_processing', undefined, 90)}
                          className="farm-btn-postprocess px-3 py-1 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Concluir na Mesa & Pós-Processar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="farm-free-box p-4 rounded-2xl bg-[#17171b] border border-dashed border-white/[0.08] text-center space-y-2">
                      <p className="text-xs text-slate-400">Mesa livre e pronta para imprimir.</p>
                      {pendingOrders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(pendingOrders[0].id, 'in_progress', printer.id, 10)}
                          className="farm-btn-allocate px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                        >
                          Alocar {pendingOrders[0].op_number} nesta máquina
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: HISTORY */}
      {viewMode === 'history' && (
        <PrintHistoryView jobs={printJobs || []} />
      )}

      {/* MODAL: NOVA ORDEM DE PRODUÇÃO (OP) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="production-modal-box bg-[#18181b] border border-white/[0.12] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95">
            <div className="production-modal-header flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141416]">
              <div className="flex items-center gap-2.5">
                <Factory className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Criar Nova Ordem de Produção (OP)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  if (onClearPreselectedSale) onClearPreselectedSale();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              {/* Product selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Selecione um Produto do Catálogo (Opcional - preenche ficha técnica)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Digitar peça avulsa / personalizada...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Catálogo • {p.filament_weight_g}g • {p.print_time_minutes}min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome da Peça / Projeto *
                </label>
                <input
                  type="text"
                  required
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  placeholder="Ex: Suporte de Headset RGB ou Vaso Espiral 18cm"
                  className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Qtd de Peças
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value) || 1))}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Peso Unitário (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={filamentWeightPerUnit}
                    onChange={(e) => setFilamentWeightPerUnit(Number(e.target.value) || 0)}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tempo Unit. (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={printTimePerUnit}
                    onChange={(e) => setPrintTimePerUnit(Number(e.target.value) || 0)}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div className="production-modal-calc-banner p-3 rounded-2xl bg-[#141418] border border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total Lote ({orderQty} un):</span>
                <div className="flex items-center gap-3">
                  <strong className="text-amber-300">{totalFilamentGrams}g filamento</strong>
                  <span className="text-white/20">•</span>
                  <strong className="text-sky-300">{formatMinutes(totalPrintMinutes)} de impressão</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Impressora Alocada
                  </label>
                  <select
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">A definir na oficina...</option>
                    {printers.map((p) => {
                      const inMnt = p.status === 'maintenance';
                      return (
                        <option key={p.id} value={p.id} disabled={inMnt}>
                          {p.name} {inMnt ? '⚠️ (EM MANUTENÇÃO - BLOQUEADA)' : `(${p.status === 'available' ? 'Livre' : 'Ocupada'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Carretel de Filamento
                  </label>
                  <select
                    value={selectedFilamentId}
                    onChange={(e) => setSelectedFilamentId(e.target.value)}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o carretel...</option>
                    {filaments.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.material} • Saldo: {f.remaining_weight_g}g)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Prioridade da Fila
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ProductionPriority)}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="normal">Normal (Fluxo padrão)</option>
                    <option value="high">Alta Prioridade</option>
                    <option value="urgent">Urgente (Furador de fila)</option>
                    <option value="low">Baixa (Aguardar ociosidade)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Destino da Produção
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value as ProductionDestination)}
                    className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="stock">Estoque Pronta-Entrega (Soma no Saldo)</option>
                    <option value="sale">Atendimento a Pedido de Venda / Encomenda</option>
                  </select>
                </div>
              </div>

              {destination === 'sale' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20">
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                      Vincular a Pedido Registrado (Opcional)
                    </label>
                    <select
                      value={selectedSaleId}
                      onChange={(e) => {
                        setSelectedSaleId(e.target.value);
                        const s = sales.find((x) => x.id === e.target.value);
                        if (s && s.customer_name) setCustomerName(s.customer_name);
                      }}
                      className="production-modal-input w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white"
                    >
                      <option value="">Venda não listada / Manual...</option>
                      {sales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.product_name} ({s.quantity}x) • {s.channel_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                      Nome do Cliente / Pedido
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Lucas Silva (#SHP-9812)"
                      className="production-modal-input w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Instruções para o Operador da Oficina (Brim, suportes, acabamento)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Altura de camada 0.16mm, suporte em árvore no balanço, colocar 4 argolas na montagem..."
                  className="production-modal-input w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-start-immediately"
                  checked={startImmediately}
                  onChange={(e) => setStartImmediately(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-[#1c1c20] border-white/20"
                />
                <label htmlFor="chk-start-immediately" className="text-xs text-slate-300 cursor-pointer font-medium">
                  Iniciar impressão nesta impressora agora (muda status para <strong>Em Impressão</strong> imediatamente)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="production-modal-btn-cancel px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="production-modal-btn-submit px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Emitir Ordem de Produção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR FALHA DE IMPRESSÃO */}
      {showFailModal && orderToFail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="production-modal-box bg-[#18181b] border border-rose-500/30 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Registrar Falha / Perda na {orderToFail.op_number}</h3>
            </div>

            <p className="text-xs text-slate-400">
              A impressora será liberada para novas ordens. O filamento perdido será debitado do carretel sem adicionar peças ao estoque.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Motivo da Falha
                </label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="production-modal-input w-full px-3.5 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white"
                >
                  <option value="Descolamento da mesa de impressão (warping)">Descolamento da mesa (Warping)</option>
                  <option value="Bico extrusor entupido / subextrusão">Bico entupido / Falha de extrusão</option>
                  <option value="Queda de energia ou erro de firmware">Queda de energia / Erro do sistema</option>
                  <option value="Filamento quebrado ou carretel travado">Filamento quebrou / Carretel travado</option>
                  <option value="Peça danificada durante remoção de suportes">Peça danificada no pós-processamento</option>
                  <option value="Outro motivo operacional">Outro motivo operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Filamento Desperdiçado Estimado (g)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={wastedGrams}
                  onChange={(e) => setWastedGrams(Number(e.target.value) || 0)}
                  className="production-modal-input w-full px-3.5 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowFailModal(false)}
                className="production-modal-btn-cancel px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmFail}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Confirmar Falha
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOpForDirectPrint && (
        <DirectPrintModal
          isOpen={Boolean(selectedOpForDirectPrint)}
          onClose={() => setSelectedOpForDirectPrint(null)}
          printers={printers}
          filaments={filaments}
          selectedPrinterId={selectedOpForDirectPrint.printer_id}
          selectedFilamentId={selectedOpForDirectPrint.filament_id}
          theme={theme}
          jobData={{
            job_name: selectedOpForDirectPrint.product_name,
            modelName: selectedOpForDirectPrint.product_name,
            product_name: selectedOpForDirectPrint.product_name,
            file_name: `${selectedOpForDirectPrint.op_number}.gcode`,
            estimated_time_minutes: selectedOpForDirectPrint.print_time_minutes,
            printTimeMinutes: selectedOpForDirectPrint.print_time_minutes,
            filament_used_g: selectedOpForDirectPrint.filament_weight_g,
            weightGrams: selectedOpForDirectPrint.filament_weight_g,
            filament_id: selectedOpForDirectPrint.filament_id,
            filament_name: selectedOpForDirectPrint.filament_name,
            totalCost: 0,
            copies: selectedOpForDirectPrint.quantity,
          }}
          onPrintDispatched={() => {
            onRefreshData();
          }}
        />
      )}
    </div>
  );
}
