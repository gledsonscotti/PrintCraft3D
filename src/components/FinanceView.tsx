import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Wallet,
  Building2,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  ExternalLink,
  FileText,
  Layers,
  Store,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Calculator,
  Tag,
  PieChart,
  Plus,
  Search,
  Filter,
  Package,
  RefreshCw,
  Coins,
  Check,
  CalendarClock,
  Target,
  Scale,
  Cpu
} from 'lucide-react';
import { ProductSale, Consignment, Product, Filament, Supply, MaterialPurchase, FinancialAccount, Client, Printer } from '../types';
import { safeFetchJson } from '../utils/api';
import { AccountsAging } from './AccountsAging';
import { PriceBreakEvenSimulator } from './PriceBreakEvenSimulator';
import { CostCentersProjectsView } from './CostCentersProjectsView';
import { DepreciationControlView } from './DepreciationControlView';

interface FinanceViewProps {
  sales: ProductSale[];
  products: Product[];
  filaments?: Filament[];
  supplies?: Supply[];
  clients?: Client[];
  printers?: Printer[];
  settings: any;
  onSaveSettings: (settings: any) => void;
  onRefreshData: () => void;
  theme?: string;
}

export function FinanceView({
  sales,
  products,
  filaments = [],
  supplies = [],
  clients = [],
  printers = [],
  settings,
  onSaveSettings,
  onRefreshData,
  theme = 'standard',
}: FinanceViewProps) {
  const [activeFinanceTab, setActiveFinanceTab] = useState<'overview' | 'cashflow' | 'aging' | 'breakeven' | 'projects' | 'depreciation' | 'consignments' | 'marketplaces' | 'transactions' | 'settings'>('cashflow');
  const [cashflowSubTab, setCashflowSubTab] = useState<'flow' | 'aging'>('flow');
  
  // Financial Accounts / Aging List State
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);

  // Material Purchases / Cash Flow State
  const [materialPurchases, setMaterialPurchases] = useState<MaterialPurchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState<boolean>(false);
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  
  // Filter states for Cash Flow
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedFlowTypeFilter, setSelectedFlowTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [flowSearchTerm, setFlowSearchTerm] = useState<string>('');

  // Purchase Form State
  const [purchaseItemType, setPurchaseItemType] = useState<'filament' | 'supply' | 'other'>('filament');
  const [purchaseSelectedExistingId, setPurchaseSelectedExistingId] = useState('');
  const [purchaseItemName, setPurchaseItemName] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);
  const [purchaseUnit, setPurchaseUnit] = useState<string>('carretel');
  const [purchaseUnitCost, setPurchaseUnitCost] = useState<number>(89.90);
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>('Voolt3D');
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<string>('PIX');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');
  const [purchaseUpdateStock, setPurchaseUpdateStock] = useState<boolean>(true);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState<boolean>(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Consignments state
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [soldInputs, setSoldInputs] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('Acerto PIX');
  const [settleMsg, setSettleMsg] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState<boolean>(false);

  // Financial Settings local state
  const [markup, setMarkup] = useState<number>(settings?.markup_default || 100);
  const [targetMargin, setTargetMargin] = useState<number>(settings?.target_margin || 40);
  const [electricityKwh, setElectricityKwh] = useState<number>(settings?.electricity_cost_kwh || 0.95);
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState<number>(settings?.monthly_fixed_costs || 500);

  useEffect(() => {
    fetchConsignments();
    fetchPurchases();
    fetchAccounts();
  }, [sales]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await safeFetchJson<FinancialAccount[]>('/api/financial-accounts', undefined, []);
      if (Array.isArray(data)) {
        setFinancialAccounts(data);
      }
    } catch (err) {
      console.warn('Error loading financial accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddAccount = async (accountData: Partial<FinancialAccount>): Promise<boolean> => {
    try {
      const res = await fetch('/api/financial-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });
      if (res.ok) {
        await fetchAccounts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error creating financial account:', err);
      return false;
    }
  };

  const handleSettleAccount = async (id: string, payment_date?: string, payment_method?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/financial-accounts/${id}/settle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_date, payment_method }),
      });
      if (res.ok) {
        await fetchAccounts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error settling financial account:', err);
      return false;
    }
  };

  const handleReopenAccount = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/financial-accounts/${id}/reopen`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await fetchAccounts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error reopening financial account:', err);
      return false;
    }
  };

  const handleDeleteAccount = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/financial-accounts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAccounts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting financial account:', err);
      return false;
    }
  };

  const fetchPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const data = await safeFetchJson<MaterialPurchase[]>('/api/material-purchases', undefined, []);
      if (Array.isArray(data)) {
        setMaterialPurchases(data);
      }
    } catch (err) {
      console.warn('Error loading material purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchConsignments = async () => {
    try {
      const data = await safeFetchJson<Consignment[]>('/api/consignments', undefined, []);
      if (Array.isArray(data)) {
        setConsignments(data);
      }
    } catch {}
  };

  const handleOpenConsignment = (cons: Consignment) => {
    setSelectedConsignment(cons);
    const initial: Record<string, number> = {};
    cons.items.forEach((item) => {
      initial[item.id] = 0;
    });
    setSoldInputs(initial);
    setSettleMsg(null);
  };

  const handleSettleConsignmentItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsignment) return;

    const soldItems = Object.entries(soldInputs)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([item_id, quantity_sold_now]) => ({ item_id, quantity_sold_now: Number(quantity_sold_now) }));

    if (soldItems.length === 0) {
      setSettleMsg('Informe pelo menos 1 item vendido para registrar o acerto.');
      return;
    }

    setIsSettling(true);
    setSettleMsg(null);

    try {
      const res = await fetch(`/api/consignments/${selectedConsignment.id}/sell-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldItems, payment_method: paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar acerto');

      fetchConsignments();
      onRefreshData();
      setSelectedConsignment(null);
    } catch (err: any) {
      setSettleMsg(err.message);
    } finally {
      setIsSettling(false);
    }
  };

  const handleDeleteConsignment = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta consignação? Os itens não vendidos voltarão para o estoque.')) return;
    try {
      const res = await fetch(`/api/consignments/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir consignação');
      fetchConsignments();
      onRefreshData();
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e.message || 'Erro desconhecido'));
    }
  };

  const handleSaveFinancialSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settings,
      markup_default: Number(markup),
      target_margin: Number(targetMargin),
      electricity_cost_kwh: Number(electricityKwh),
      monthly_fixed_costs: Number(monthlyFixedCosts),
    };
    onSaveSettings(updated);
    alert('Configurações financeiras salvas com sucesso!');
  };

  // Select existing stock item in purchase modal
  const handleSelectExistingItem = (id: string) => {
    setPurchaseSelectedExistingId(id);
    if (!id) return;

    if (purchaseItemType === 'filament') {
      const fil = filaments.find((f) => f.id === id);
      if (fil) {
        setPurchaseItemName(`${fil.name} (${fil.material} - ${fil.color})`);
        setPurchaseUnit('carretel');
        setPurchaseUnitCost(Number(fil.cost_per_spool || 89.90));
        if (fil.brand) setPurchaseSupplier(fil.brand);
      }
    } else if (purchaseItemType === 'supply') {
      const sup = supplies.find((s) => s.id === id);
      if (sup) {
        setPurchaseItemName(sup.name);
        setPurchaseUnit(sup.unit || 'un');
        setPurchaseUnitCost(Number(sup.unit_cost || 0.50));
      }
    }
  };

  // Submit new material purchase
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseItemName.trim() || purchaseQuantity <= 0 || purchaseUnitCost < 0) {
      setPurchaseError('Preencha o nome do item, quantidade e custo unitário válidos.');
      return;
    }
    setIsSubmittingPurchase(true);
    setPurchaseError(null);

    const totalCost = Number(purchaseQuantity) * Number(purchaseUnitCost);

    try {
      const res = await fetch('/api/material-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: purchaseItemType,
          item_id: purchaseSelectedExistingId || null,
          item_name: purchaseItemName.trim(),
          quantity: Number(purchaseQuantity),
          unit: purchaseUnit,
          unit_cost: Number(purchaseUnitCost),
          total_cost: totalCost,
          supplier: purchaseSupplier.trim() || null,
          purchase_date: purchaseDate,
          payment_method: purchasePaymentMethod,
          notes: purchaseNotes.trim() || null,
          update_stock: purchaseUpdateStock,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar compra');

      await fetchPurchases();
      onRefreshData();
      setIsAddPurchaseModalOpen(false);

      // Reset form defaults
      setPurchaseItemName('');
      setPurchaseSelectedExistingId('');
      setPurchaseNotes('');
    } catch (err: any) {
      setPurchaseError(err.message || 'Erro ao salvar compra.');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // Delete purchase
  const handleDeletePurchase = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este lançamento de compra?')) return;
    try {
      const res = await fetch(`/api/material-purchases/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir lançamento');
      await fetchPurchases();
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  // Helpers for Monthly Cash Flow
  const getMonthKey = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().substring(0, 7);
    return dateStr.substring(0, 7);
  };

  const getMonthLabel = (monthKey: string) => {
    if (!monthKey || monthKey === 'all') return 'Todos os Meses';
    const parts = monthKey.split('-');
    if (parts.length < 2) return monthKey;
    const year = parts[0];
    const month = parts[1];
    const monthsPt = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mIndex = parseInt(month, 10) - 1;
    return `${monthsPt[mIndex] || month} / ${year}`;
  };

  // Group monthly flow (Sales = Cash In, Material Purchases = Cash Out)
  const monthlyFlows = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      monthLabel: string;
      salesCount: number;
      grossSalesRevenue: number;
      platformFees: number;
      netReceivedRevenue: number;
      filamentExpenses: number;
      filamentCount: number;
      supplyExpenses: number;
      supplyCount: number;
      otherExpenses: number;
      totalExpenses: number;
      netCashFlow: number;
      marginPercent: number;
    }> = {};

    // Process Sales (Receitas de Vendas)
    sales.forEach((s) => {
      const mKey = getMonthKey(s.created_at);
      if (!map[mKey]) {
        map[mKey] = {
          monthKey: mKey,
          monthLabel: getMonthLabel(mKey),
          salesCount: 0,
          grossSalesRevenue: 0,
          platformFees: 0,
          netReceivedRevenue: 0,
          filamentExpenses: 0,
          filamentCount: 0,
          supplyExpenses: 0,
          supplyCount: 0,
          otherExpenses: 0,
          totalExpenses: 0,
          netCashFlow: 0,
          marginPercent: 0,
        };
      }
      const rev = Number(s.total_revenue || 0);
      const fee = Number(s.platform_fee_amount || 0);
      map[mKey].salesCount += Number(s.quantity || 1);
      map[mKey].grossSalesRevenue += rev;
      map[mKey].platformFees += fee;
      map[mKey].netReceivedRevenue += (rev - fee);
    });

    // Process Purchases (Despesas c/ Filamentos e Suprimentos)
    materialPurchases.forEach((p) => {
      const mKey = getMonthKey(p.purchase_date || p.created_at);
      if (!map[mKey]) {
        map[mKey] = {
          monthKey: mKey,
          monthLabel: getMonthLabel(mKey),
          salesCount: 0,
          grossSalesRevenue: 0,
          platformFees: 0,
          netReceivedRevenue: 0,
          filamentExpenses: 0,
          filamentCount: 0,
          supplyExpenses: 0,
          supplyCount: 0,
          otherExpenses: 0,
          totalExpenses: 0,
          netCashFlow: 0,
          marginPercent: 0,
        };
      }
      const cost = Number(p.total_cost || 0);
      if (p.item_type === 'filament') {
        map[mKey].filamentExpenses += cost;
        map[mKey].filamentCount += Number(p.quantity || 1);
      } else if (p.item_type === 'supply') {
        map[mKey].supplyExpenses += cost;
        map[mKey].supplyCount += Number(p.quantity || 1);
      } else {
        map[mKey].otherExpenses += cost;
      }
      map[mKey].totalExpenses += cost;
    });

    return Object.values(map)
      .map((item) => {
        const netCashFlow = item.grossSalesRevenue - item.totalExpenses;
        const marginPercent = item.grossSalesRevenue > 0 ? (netCashFlow / item.grossSalesRevenue) * 100 : 0;
        return {
          ...item,
          netCashFlow,
          marginPercent,
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [sales, materialPurchases]);

  // Selected Month Metrics
  const activeMonthData = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      const grossSales = monthlyFlows.reduce((acc, m) => acc + m.grossSalesRevenue, 0);
      const totalExp = monthlyFlows.reduce((acc, m) => acc + m.totalExpenses, 0);
      const netCash = grossSales - totalExp;
      return {
        monthKey: 'all',
        monthLabel: 'Período Total Consolidado',
        salesCount: monthlyFlows.reduce((acc, m) => acc + m.salesCount, 0),
        grossSalesRevenue: grossSales,
        platformFees: monthlyFlows.reduce((acc, m) => acc + m.platformFees, 0),
        netReceivedRevenue: monthlyFlows.reduce((acc, m) => acc + m.netReceivedRevenue, 0),
        filamentExpenses: monthlyFlows.reduce((acc, m) => acc + m.filamentExpenses, 0),
        filamentCount: monthlyFlows.reduce((acc, m) => acc + m.filamentCount, 0),
        supplyExpenses: monthlyFlows.reduce((acc, m) => acc + m.supplyExpenses, 0),
        supplyCount: monthlyFlows.reduce((acc, m) => acc + m.supplyCount, 0),
        otherExpenses: monthlyFlows.reduce((acc, m) => acc + m.otherExpenses, 0),
        totalExpenses: totalExp,
        netCashFlow: netCash,
        marginPercent: grossSales > 0 ? (netCash / grossSales) * 100 : 0,
      };
    }

    return (
      monthlyFlows.find((m) => m.monthKey === selectedMonthFilter) || {
        monthKey: selectedMonthFilter,
        monthLabel: getMonthLabel(selectedMonthFilter),
        salesCount: 0,
        grossSalesRevenue: 0,
        platformFees: 0,
        netReceivedRevenue: 0,
        filamentExpenses: 0,
        filamentCount: 0,
        supplyExpenses: 0,
        supplyCount: 0,
        otherExpenses: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        marginPercent: 0,
      }
    );
  }, [monthlyFlows, selectedMonthFilter]);

  // Unified Cash Flow Entries (Livro Caixa / Extrato Detalhado)
  const unifiedEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      rawDate: string;
      type: 'in' | 'out';
      category: 'sale' | 'filament' | 'supply' | 'other';
      categoryLabel: string;
      description: string;
      quantity: number;
      unit: string;
      counterparty: string;
      paymentMethod: string;
      unitAmount: number;
      totalAmount: number;
      netAmount: number;
      notes?: string;
      isPurchase: boolean;
    }> = [
      ...sales.map((s) => ({
        id: s.id,
        date: s.created_at ? s.created_at.split('T')[0] : '',
        rawDate: s.created_at || '',
        type: 'in' as const,
        category: 'sale' as const,
        categoryLabel: 'Venda de Produto',
        description: s.product_name,
        quantity: Number(s.quantity || 1),
        unit: 'un',
        counterparty: s.customer_name || s.channel_name || s.channel_type || 'Cliente Final',
        paymentMethod: s.payment_method || 'PIX / Pagamento Digital',
        unitAmount: Number(s.unit_price || 0),
        totalAmount: Number(s.total_revenue || 0),
        netAmount: Number(s.total_revenue || 0),
        notes: s.notes,
        isPurchase: false,
      })),
      ...materialPurchases.map((p) => ({
        id: p.id,
        date: p.purchase_date || (p.created_at ? p.created_at.split('T')[0] : ''),
        rawDate: p.purchase_date || p.created_at || '',
        type: 'out' as const,
        category: p.item_type as 'filament' | 'supply' | 'other',
        categoryLabel:
          p.item_type === 'filament'
            ? 'Compra de Filamento'
            : p.item_type === 'supply'
            ? 'Compra de Suprimento'
            : 'Despesa c/ Insumos',
        description: p.item_name,
        quantity: Number(p.quantity || 1),
        unit: p.unit || 'un',
        counterparty: p.supplier || 'Fornecedor',
        paymentMethod: p.payment_method || 'PIX',
        unitAmount: Number(p.unit_cost || 0),
        totalAmount: Number(p.total_cost || 0),
        netAmount: -Number(p.total_cost || 0),
        notes: p.notes,
        isPurchase: true,
      })),
    ];

    return list
      .filter((item) => {
        if (selectedMonthFilter !== 'all' && getMonthKey(item.date) !== selectedMonthFilter) {
          return false;
        }
        if (selectedFlowTypeFilter === 'in' && item.type !== 'in') return false;
        if (selectedFlowTypeFilter === 'out' && item.type !== 'out') return false;
        if (flowSearchTerm.trim()) {
          const q = flowSearchTerm.toLowerCase();
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchParty = item.counterparty.toLowerCase().includes(q);
          const matchCat = item.categoryLabel.toLowerCase().includes(q);
          const matchPay = item.paymentMethod.toLowerCase().includes(q);
          if (!matchDesc && !matchParty && !matchCat && !matchPay) return false;
        }
        return true;
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [sales, materialPurchases, selectedMonthFilter, selectedFlowTypeFilter, flowSearchTerm]);

  // Financial Calculations for General Overview
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_revenue || 0), 0);
  const totalCost = sales.reduce((acc, s) => acc + Number(s.total_cost || 0), 0);
  const totalPlatformFees = sales.reduce((acc, s) => acc + Number(s.platform_fee_amount || 0), 0);
  const totalShippingCost = sales.reduce((acc, s) => acc + Number(s.shipping_cost || 0), 0);
  const netProfit = sales.reduce((acc, s) => acc + Number(s.profit || 0), 0) - totalShippingCost;
  const averageMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Channel breakdown
  const channelRevenues: Record<string, { revenue: number; profit: number; count: number }> = {};
  sales.forEach((s) => {
    const channel = s.channel_name || s.channel_type || 'Outros';
    if (!channelRevenues[channel]) {
      channelRevenues[channel] = { revenue: 0, profit: 0, count: 0 };
    }
    channelRevenues[channel].revenue += Number(s.total_revenue || 0);
    channelRevenues[channel].profit += Number(s.profit || 0);
    channelRevenues[channel].count += Number(s.quantity || 1);
  });

  // Contas atrasadas / Alerta de Inadimplência
  const overdueAccounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return financialAccounts.filter(
      (a) => a.status === 'overdue' || (a.status === 'pending' && a.due_date < today)
    );
  }, [financialAccounts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141417] p-5 sm:p-6 rounded-3xl border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">Finanças & Fluxo de Caixa</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Controle integrado de faturamento, fluxo de caixa mensal (vendas vs compras de insumos) e DRE.
            </p>
          </div>
        </div>

        {/* Financial Summary Badges - Rigorosamente lado a lado */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-nowrap shrink-0 overflow-x-auto no-scrollbar">
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Faturamento Vendas: R$ {totalRevenue.toFixed(2)}</span>
          </div>
          <div className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border whitespace-nowrap shrink-0 ${
            activeMonthData.netCashFlow >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Saldo Líquido Caixa: {activeMonthData.netCashFlow >= 0 ? '+' : ''}R$ {activeMonthData.netCashFlow.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Sub-abas de Finanças Otimizadas e 100% Visíveis */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-white/[0.08] pb-3 finance-subtabs-container">
        {/* FLUXO DE CAIXA (INTEGRADO COM CONTAS A PAGAR & RECEBER E ALERTA DE ATRASO) */}
        <button
          type="button"
          id="tab-btn-cashflow"
          onClick={() => setActiveFinanceTab('cashflow')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'cashflow' || activeFinanceTab === 'aging'
              ? 'finance-subtab-active bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Fluxo de Caixa</span>
          {overdueAccounts.length > 0 && (
            <span className="finance-alert-badge px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
              <span>{overdueAccounts.length}</span>
            </span>
          )}
        </button>

        {/* SIMULADOR & MARGEM */}
        <button
          type="button"
          id="tab-btn-breakeven"
          onClick={() => setActiveFinanceTab('breakeven')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'breakeven'
              ? 'finance-subtab-active bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Simulador & Margem</span>
        </button>

        {/* CENTROS DE CUSTO */}
        <button
          type="button"
          id="tab-btn-projects"
          onClick={() => setActiveFinanceTab('projects')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'projects'
              ? 'finance-subtab-active bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Centros de Custo</span>
        </button>

        {/* DEPRECIAÇÃO */}
        <button
          type="button"
          id="tab-btn-depreciation"
          onClick={() => setActiveFinanceTab('depreciation')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'depreciation'
              ? 'finance-subtab-active bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Depreciação</span>
        </button>

        {/* DRE & KPIS */}
        <button
          type="button"
          id="tab-btn-overview"
          onClick={() => setActiveFinanceTab('overview')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'overview'
              ? 'finance-subtab-active bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>DRE & KPIs</span>
        </button>

        {/* CONSIGNADOS */}
        <button
          type="button"
          id="tab-btn-consignments"
          onClick={() => setActiveFinanceTab('consignments')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'consignments'
              ? 'finance-subtab-active bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Consignados</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {consignments.filter((c) => c.status === 'active').length}
          </span>
        </button>

        {/* MARKETPLACES */}
        <button
          type="button"
          id="tab-btn-marketplaces"
          onClick={() => setActiveFinanceTab('marketplaces')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'marketplaces'
              ? 'finance-subtab-active bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Percent className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>Marketplaces</span>
        </button>

        {/* EXTRATO VENDAS */}
        <button
          type="button"
          id="tab-btn-transactions"
          onClick={() => setActiveFinanceTab('transactions')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'transactions'
              ? 'finance-subtab-active bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Extrato Vendas</span>
        </button>

        {/* PARÂMETROS */}
        <button
          type="button"
          id="tab-btn-settings"
          onClick={() => setActiveFinanceTab('settings')}
          className={`finance-subtab-btn px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeFinanceTab === 'settings'
              ? 'finance-subtab-active bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Parâmetros</span>
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL: FLUXO DE CAIXA (UNIFICADO COM CONTAS A PAGAR & RECEBER) */}
      {(activeFinanceTab === 'cashflow' || activeFinanceTab === 'aging') && (
        <div className="space-y-6">
          {/* Sub-navegação do Fluxo de Caixa: Livro Caixa Realizado vs Contas a Pagar & Receber */}
          <div className="flex items-center gap-1.5 p-1 bg-[#141417] rounded-xl border border-white/[0.08] w-fit finance-toggle-container">
            <button
              type="button"
              id="subtab-cashflow-flow"
              onClick={() => setCashflowSubTab('flow')}
              className={`finance-toggle-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                cashflowSubTab === 'flow'
                  ? 'finance-toggle-active bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Livro Caixa & Realizado</span>
            </button>

            <button
              type="button"
              id="subtab-cashflow-aging"
              onClick={() => setCashflowSubTab('aging')}
              className={`finance-toggle-btn px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                cashflowSubTab === 'aging'
                  ? 'finance-toggle-active bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Contas a Pagar & Receber</span>
              {overdueAccounts.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 ${
                  cashflowSubTab === 'aging'
                    ? 'bg-slate-950 text-rose-300'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                  <span>{overdueAccounts.length}</span>
                </span>
              )}
            </button>
          </div>

          {cashflowSubTab === 'flow' ? (
            <div className="space-y-6">
              {/* Barra de Filtros e Ações Rápidas */}
          <div className="bg-[#141417] p-4 sm:p-5 rounded-2xl border border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Seletor de Mês */}
              <div className="flex items-center gap-2 bg-[#1c1c20] px-3 py-2 rounded-xl border border-white/[0.08] text-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-400 font-medium">Mês:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="bg-[#1c1c20] text-white">Todos os Meses</option>
                  {monthlyFlows.map((m) => (
                    <option key={m.monthKey} value={m.monthKey} className="bg-[#1c1c20] text-white">
                      {m.monthLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Tipo (Entradas/Saídas) */}
              <div className="inline-flex items-center bg-[#1c1c20] p-1 rounded-xl border border-white/[0.08] text-xs finance-filter-container">
                <button
                  type="button"
                  onClick={() => setSelectedFlowTypeFilter('all')}
                  className={`finance-filter-btn px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    selectedFlowTypeFilter === 'all'
                      ? 'finance-filter-active bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFlowTypeFilter('in')}
                  className={`finance-filter-btn px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    selectedFlowTypeFilter === 'in'
                      ? 'finance-filter-active bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-950 shrink-0" />
                  <span>Receitas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFlowTypeFilter('out')}
                  className={`finance-filter-btn px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                    selectedFlowTypeFilter === 'out'
                      ? 'finance-filter-active bg-rose-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>Despesas</span>
                </button>
              </div>

              {/* Busca Textual */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={flowSearchTerm}
                  onChange={(e) => setFlowSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-40 sm:w-52"
                />
              </div>
            </div>

            {/* Ações Rápidas: Botão em UMA LINHA rigorosamente formatado */}
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={() => {
                  fetchPurchases();
                  onRefreshData();
                }}
                disabled={loadingPurchases}
                className="p-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                title="Atualizar Fluxo de Caixa"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPurchases ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setPurchaseItemType('filament');
                  setPurchaseItemName('');
                  setPurchaseSelectedExistingId('');
                  setPurchaseQuantity(1);
                  setPurchaseUnit('carretel');
                  setPurchaseUnitCost(89.90);
                  setPurchaseSupplier('Voolt3D');
                  setPurchaseDate(new Date().toISOString().split('T')[0]);
                  setIsAddPurchaseModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap font-bold">Registrar Compra / Despesa</span>
              </button>
            </div>
          </div>

          {/* Cards Indicadores de Fluxo de Caixa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Receitas de Vendas */}
            <div className="bg-[#141417] p-4 sm:p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Receita Vendas (Entradas)</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                R$ {activeMonthData.grossSalesRevenue.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                <span>{activeMonthData.salesCount} vendas</span>
                <span className="text-emerald-400 font-semibold">
                  Líq.: R$ {activeMonthData.netReceivedRevenue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Card 2: Compras de Filamentos */}
            <div className="bg-[#141417] p-4 sm:p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Compras de Filamentos</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400 shrink-0">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400">
                R$ {activeMonthData.filamentExpenses.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                <span>{activeMonthData.filamentCount} carretéis</span>
                <span className="text-rose-400 font-semibold">Matéria-Prima</span>
              </div>
            </div>

            {/* Card 3: Compras de Suprimentos */}
            <div className="bg-[#141417] p-4 sm:p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Compras de Suprimentos</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                R$ {activeMonthData.supplyExpenses.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                <span>{activeMonthData.supplyCount} itens / insumos</span>
                <span className="text-amber-400 font-semibold">Insumos & Embalagens</span>
              </div>
            </div>

            {/* Card 4: Saldo Líquido Mensal */}
            <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${
              activeMonthData.netCashFlow >= 0
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Saldo Líquido Mensal</span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  activeMonthData.netCashFlow >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-black ${
                activeMonthData.netCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {activeMonthData.netCashFlow >= 0 ? '+' : ''}R$ {activeMonthData.netCashFlow.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/[0.06]">
                <span className={`font-extrabold ${activeMonthData.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeMonthData.netCashFlow >= 0 ? 'Superávit Operacional' : 'Déficit no Período'}
                </span>
                <span className="text-slate-400 font-mono">
                  {activeMonthData.marginPercent.toFixed(1)}% margem
                </span>
              </div>
            </div>
          </div>

          {/* TABELA 1: RESUMO DO FLUXO DE CAIXA MENSAL (MÊS A MÊS) */}
          <div className="bg-[#141417] p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Demonstrativo do Fluxo de Caixa Mensal (Mês a Mês)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparativo consolidado entre faturamento de vendas e aquisições de filamentos/insumos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1c1c20] text-slate-400 uppercase font-bold tracking-wider border-b border-white/[0.08]">
                  <tr>
                    <th className="px-3.5 py-3">Mês / Período</th>
                    <th className="px-3.5 py-3 text-right text-emerald-400">Receita Vendas</th>
                    <th className="px-3.5 py-3 text-right text-purple-400">Taxas</th>
                    <th className="px-3.5 py-3 text-right text-sky-400">Receita Líquida</th>
                    <th className="px-3.5 py-3 text-right text-rose-400">Compras Filamento</th>
                    <th className="px-3.5 py-3 text-right text-amber-400">Compras Suprimento</th>
                    <th className="px-3.5 py-3 text-right text-rose-300">Total Despesas</th>
                    <th className="px-3.5 py-3 text-right font-black">Saldo Líquido</th>
                    <th className="px-3.5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {monthlyFlows.map((flow) => {
                    const isPositive = flow.netCashFlow >= 0;
                    return (
                      <tr
                        key={flow.monthKey}
                        onClick={() => setSelectedMonthFilter(flow.monthKey === selectedMonthFilter ? 'all' : flow.monthKey)}
                        className={`hover:bg-white/[0.03] transition cursor-pointer ${
                          selectedMonthFilter === flow.monthKey ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <td className="px-3.5 py-3 font-bold text-white flex items-center gap-2 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>{flow.monthLabel}</span>
                          {selectedMonthFilter === flow.monthKey && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/30 text-emerald-300">
                              Filtrado
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                          +R$ {flow.grossSalesRevenue.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-purple-400 whitespace-nowrap">
                          -R$ {flow.platformFees.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-sky-400 whitespace-nowrap">
                          R$ {flow.netReceivedRevenue.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-rose-400 whitespace-nowrap">
                          -R$ {flow.filamentExpenses.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-amber-400 whitespace-nowrap">
                          -R$ {flow.supplyExpenses.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-bold text-rose-400 whitespace-nowrap">
                          -R$ {flow.totalExpenses.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <span className={`text-xs font-black ${isPositive ? 'text-emerald-300' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}R$ {flow.netCashFlow.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isPositive ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            <span>{isPositive ? 'Superávit' : 'Déficit'}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {monthlyFlows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-500">
                        Nenhum fluxo de caixa registrado até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABELA 2: EXTRATO COMPLETO DE LANÇAMENTOS (LIVRO CAIXA) */}
          <div className="bg-[#141417] p-5 sm:p-6 rounded-2xl border border-white/[0.08] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Extrato Detalhado do Livro Caixa ({unifiedEntries.length} lançamentos)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualização detalhada de todas as entradas de vendas e saídas de compras de filamentos e insumos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1c1c20] text-slate-400 uppercase font-bold tracking-wider border-b border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Tipo / Natureza</th>
                    <th className="px-4 py-3">Descrição / Item</th>
                    <th className="px-4 py-3 text-center">Quantidade</th>
                    <th className="px-4 py-3">Origem / Destino</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3 text-right">Valor Unitário</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {unifiedEntries.map((item) => {
                    const isIn = item.type === 'in';
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono">
                          {item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isIn ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                              <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                              <span>Entrada (Venda)</span>
                            </span>
                          ) : item.category === 'filament' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-rose-400" />
                              <span>Saída (Filamento)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-amber-400" />
                              <span>Saída (Suprimento)</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          <div>{item.description}</div>
                          {item.notes && <div className="text-[10px] text-slate-500 font-normal italic">{item.notes}</div>}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-300">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          <span className="block font-semibold">{item.counterparty}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {item.paymentMethod}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-400">
                          R$ {item.unitAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black">
                          <span className={isIn ? 'text-emerald-400' : 'text-rose-400'}>
                            {isIn ? '+R$ ' : '-R$ '}{item.totalAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.isPurchase ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePurchase(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600">Automático</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {unifiedEntries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-500">
                        Nenhum lançamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <AccountsAging
          accounts={financialAccounts}
          loading={loadingAccounts}
          onRefresh={fetchAccounts}
          onAddAccount={handleAddAccount}
          onSettleAccount={handleSettleAccount}
          onReopenAccount={handleReopenAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </div>
  )}

      {/* CONTEÚDO 2: VISÃO GERAL & DRE */}
      {activeFinanceTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141417] p-5 rounded-3xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Faturamento Bruto</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">R$ {totalRevenue.toFixed(2)}</div>
              <p className="text-[11px] text-emerald-400 font-medium">Soma de todas as vendas e canais</p>
            </div>

            <div className="bg-[#141417] p-5 rounded-3xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Custos de Produção</span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">R$ {totalCost.toFixed(2)}</div>
              <p className="text-[11px] text-rose-400 font-medium">Insumos, energia e depreciação</p>
            </div>

            <div className="bg-[#141417] p-5 rounded-3xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Taxas & Comissões</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">R$ {totalPlatformFees.toFixed(2)}</div>
              <p className="text-[11px] text-purple-400 font-medium">Retido por Marketplaces e Gateways</p>
            </div>

            <div className="bg-[#141417] p-5 rounded-3xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Lucro Líquido Real</span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-sky-300">R$ {netProfit.toFixed(2)}</div>
              <p className="text-[11px] text-sky-400 font-medium">Margem Média: {averageMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Breakdown por Canal de Venda */}
          <div className="bg-[#141417] p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <span>Desempenho Financeiro por Canal de Venda</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(channelRevenues).map(([channel, data]) => (
                <div key={channel} className="bg-[#1c1c20] p-4 rounded-2xl border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{channel}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                      {data.count} un. vendidas
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Faturamento:</span>
                      <span className="font-bold text-emerald-400">R$ {data.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Lucro Estimado:</span>
                      <span className="font-bold text-sky-400">R$ {data.profit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(channelRevenues).length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                  Nenhuma venda registrada até o momento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO 3: CONSIGNADOS & ACERTOS */}
      {activeFinanceTab === 'consignments' && (
        <div className="space-y-6">
          <div className="bg-[#141417] p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-400" />
                  <span>Expositores Consignados & Prestação de Contas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Gerencie lojas parceiras, controle o estoque consignado e registre acertos financeiros periódicos.
                </p>
              </div>
            </div>

            {/* Consignments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {consignments.map((cons) => {
                const totalItems = cons.items.reduce((acc, i) => acc + i.quantity_sent, 0);
                const totalSold = cons.items.reduce((acc, i) => acc + (i.quantity_sold || 0), 0);
                const totalReturned = cons.items.reduce((acc, i) => acc + (i.quantity_returned || 0), 0);
                const totalRemaining = totalItems - totalSold - totalReturned;
                const totalValueSold = cons.items.reduce((acc, i) => acc + (i.quantity_sold || 0) * i.agreed_price, 0);

                return (
                  <div key={cons.id} className="bg-[#1c1c20] p-5 rounded-2xl border border-white/[0.06] space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-black text-white">{cons.store_name}</h3>
                          <p className="text-xs text-slate-400">{cons.store_location || 'Endereço não informado'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cons.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {cons.status === 'active' ? 'Ativo' : 'Encerrado'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.06] text-center">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-semibold">Enviados</span>
                          <span className="text-xs font-black text-white">{totalItems}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-emerald-400 font-semibold">Vendidos</span>
                          <span className="text-xs font-black text-emerald-400">{totalSold}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-sky-400 font-semibold">Em Estoque</span>
                          <span className="text-xs font-black text-sky-400">{totalRemaining}</span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Comissão Loja:</span>
                          <span className="font-bold text-amber-400">{cons.commission_percent}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Acertado:</span>
                          <span className="font-bold text-emerald-400">R$ {totalValueSold.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => handleOpenConsignment(cons)}
                        className="flex-1 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Registrar Acerto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConsignment(cons.id)}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer"
                        title="Excluir Consignação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {consignments.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                  Nenhuma consignação cadastrada. Crie consignações na aba de Vendas ou Estoque.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO 4: TAXAS DE MARKETPLACES */}
      {activeFinanceTab === 'marketplaces' && (
        <div className="space-y-6">
          <div className="bg-[#141417] p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-400" />
              <span>Simulador e Tabela de Taxas dos Marketplaces</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#1c1c20] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                <span className="text-xs font-bold text-purple-300">Mercado Livre (Clássico)</span>
                <div className="text-xl font-black text-white">11% a 14%</div>
                <p className="text-[11px] text-slate-400">Mais R$ 6,00 por item vendido abaixo de R$ 79,00.</p>
              </div>
              <div className="bg-[#1c1c20] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                <span className="text-xs font-bold text-orange-400">Shopee Brasil</span>
                <div className="text-xl font-black text-white">14% + R$ 3,00</div>
                <p className="text-[11px] text-slate-400">Comissão padrão de marketplace + taxa fixa por transação.</p>
              </div>
              <div className="bg-[#1c1c20] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                <span className="text-xs font-bold text-emerald-300">Venda Direta / PIX</span>
                <div className="text-xl font-black text-white">0% de Taxa</div>
                <p className="text-[11px] text-slate-400">Margem integral retida diretamente na empresa.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO 5: EXTRATO DE VENDAS */}
      {activeFinanceTab === 'transactions' && (
        <div className="space-y-6">
          <div className="bg-[#141417] p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-400" />
              <span>Extrato Completo de Vendas Realizadas</span>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1c1c20] text-slate-400 uppercase font-bold tracking-wider border-b border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Produto / Item</th>
                    <th className="px-4 py-3">Canal & Pagamento</th>
                    <th className="px-4 py-3 text-center">Qtd</th>
                    <th className="px-4 py-3 text-right">Faturamento</th>
                    <th className="px-4 py-3 text-right">Lucro Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(sale.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">{sale.product_name}</td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-sky-300">{sale.channel_name || sale.channel_type}</span>
                        <span className="block text-[10px] text-slate-400">{sale.payment_method || 'PIX / Dinheiro'}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-amber-400">{sale.quantity} un.</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">R$ {Number(sale.total_revenue || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-black text-sky-400">R$ {Number(sale.profit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Nenhuma transação encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO 6: PARÂMETROS */}
      {activeFinanceTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveFinancialSettings} className="bg-[#141417] p-6 rounded-3xl border border-white/[0.08] space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <span>Parâmetros Globais de Precificação & Custos</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Defina os índices padrão para cálculo automático de custos de impressão 3D e margens de lucro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Markup Padrão (%)</label>
                <input
                  type="number"
                  step="1"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500">Multiplicador base sobre o custo total de produção.</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Margem de Lucro Alvo (%)</label>
                <input
                  type="number"
                  step="1"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500">Margem líquida desejada por peça impressa.</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Custos Fixos Mensais (R$)</label>
                <input
                  type="number"
                  step="10"
                  value={monthlyFixedCosts}
                  onChange={(e) => setMonthlyFixedCosts(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500">Aluguel, internet, manutenções e taxas fixas.</span>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg cursor-pointer"
              >
                Salvar Configurações Financeiras
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA: SIMULADOR DE PREÇO & PONTO DE EQUILÍBRIO (BREAK-EVEN) */}
      {activeFinanceTab === 'breakeven' && (
        <PriceBreakEvenSimulator
          products={products}
          filaments={filaments}
          settings={settings}
          monthlyFixedCosts={monthlyFixedCosts}
          targetMarginDefault={targetMargin}
        />
      )}

      {/* ABA: CENTROS DE CUSTO & ALOCAÇÃO DE INSUMOS POR PROJETO */}
      {activeFinanceTab === 'projects' && (
        <CostCentersProjectsView
          filaments={filaments}
          supplies={supplies}
          clients={clients}
          printers={printers}
          settings={settings}
          onRefreshData={onRefreshData}
        />
      )}

      {/* ABA: CONTROLE DE DEPRECIAÇÃO DE MÁQUINAS E EQUIPAMENTOS */}
      {activeFinanceTab === 'depreciation' && (
        <DepreciationControlView
          printers={printers}
          onRefreshData={onRefreshData}
          theme={theme}
        />
      )}

      {/* MODAL: REGISTRAR COMPRA / DESPESA DE MATÉRIA-PRIMA */}
      {isAddPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-white/[0.1] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Registrar Compra / Despesa</h3>
                <p className="text-xs text-slate-400">Entrada de custos no Fluxo de Caixa (Filamentos e Suprimentos)</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPurchaseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPurchase} className="space-y-4">
              {purchaseError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {purchaseError}
                </div>
              )}

              {/* Seletor de Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tipo de Aquisição</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseItemType('filament');
                      setPurchaseUnit('carretel');
                      setPurchaseSelectedExistingId('');
                      setPurchaseItemName('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      purchaseItemType === 'filament'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border border-white/[0.06]'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Filamento 3D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseItemType('supply');
                      setPurchaseUnit('un');
                      setPurchaseSelectedExistingId('');
                      setPurchaseItemName('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      purchaseItemType === 'supply'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border border-white/[0.06]'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Suprimento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseItemType('other');
                      setPurchaseUnit('un');
                      setPurchaseSelectedExistingId('');
                      setPurchaseItemName('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      purchaseItemType === 'other'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-[#1c1c20] text-slate-400 border border-white/[0.06]'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Outro Insumo</span>
                  </button>
                </div>
              </div>

              {/* Vincular a Item Existente do Estoque */}
              {purchaseItemType === 'filament' && filaments.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Vincular a Filamento Cadastrado (Opcional)</label>
                  <select
                    value={purchaseSelectedExistingId}
                    onChange={(e) => handleSelectExistingItem(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="">-- Cadastrar novo / não vincular --</option>
                    {filaments.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.brand} - {f.material}) • Custo: R$ {f.cost_per_spool}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {purchaseItemType === 'supply' && supplies.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Vincular a Suprimento Cadastrado (Opcional)</label>
                  <select
                    value={purchaseSelectedExistingId}
                    onChange={(e) => handleSelectExistingItem(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Cadastrar novo / não vincular --</option>
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.unit}) • Custo unit: R$ {s.unit_cost}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descrição / Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Descrição do Item / Matéria-Prima *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PLA Preto Fosco 1kg ou Argola de Chaveiro 25mm"
                  value={purchaseItemName}
                  onChange={(e) => setPurchaseItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quantidade, Unidade e Custo Unitário */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Qtd *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs text-center font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Unidade</label>
                  <input
                    type="text"
                    value={purchaseUnit}
                    onChange={(e) => setPurchaseUnit(e.target.value)}
                    placeholder="un, carretel, kg"
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Custo Unit. (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={purchaseUnitCost}
                    onChange={(e) => setPurchaseUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs text-right font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Total Calculado */}
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">Saída Total do Caixa:</span>
                <span className="text-base font-black text-rose-400">
                  R$ {(purchaseQuantity * purchaseUnitCost).toFixed(2)}
                </span>
              </div>

              {/* Data, Fornecedor e Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Data da Compra</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Fornecedor</label>
                  <input
                    type="text"
                    placeholder="Voolt3D, 3D Fila..."
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Pagamento</label>
                  <select
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Checkbox atualizar estoque */}
              {purchaseSelectedExistingId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="updateStockCheck"
                    checked={purchaseUpdateStock}
                    onChange={(e) => setPurchaseUpdateStock(e.target.checked)}
                    className="rounded border-white/[0.2] text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="updateStockCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Atualizar saldo do estoque automaticamente com esta compra
                  </label>
                </div>
              )}

              {/* Observações */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Observações / NF</label>
                <input
                  type="text"
                  placeholder="Número de pedido, NF ou motivo da compra"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-300 hover:bg-white/[10] transition text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPurchase ? 'Registrando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ACERTO DE CONSIGNADO */}
      {selectedConsignment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-white/[0.1] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Acerto de Consignação</h3>
                <p className="text-xs text-slate-400">{selectedConsignment.store_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConsignment(null)}
                className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleConsignmentItems} className="space-y-4">
              {settleMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {settleMsg}
                </div>
              )}

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedConsignment.items.map((item) => {
                  const maxSellable = item.quantity_sent - (item.quantity_sold || 0) - (item.quantity_returned || 0);
                  return (
                    <div key={item.id} className="bg-[#1c1c20] p-3 rounded-xl border border-white/[0.06] flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs font-bold text-white">{item.product_name}</span>
                        <span className="block text-[10px] text-slate-400">
                          Disponível: {maxSellable} un. • Preço: R$ {item.agreed_price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Vendeu agora:</span>
                        <input
                          type="number"
                          min="0"
                          max={maxSellable}
                          value={soldInputs[item.id] || 0}
                          onChange={(e) =>
                            setSoldInputs({ ...soldInputs, [item.id]: Math.max(0, parseInt(e.target.value) || 0) })
                          }
                          className="w-16 px-2 py-1.5 rounded-lg bg-[#141417] border border-white/[0.1] text-white text-center text-xs font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Forma de Recebimento do Acerto</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Acerto PIX">Acerto PIX</option>
                  <option value="Dinheiro em Espécie">Dinheiro em Espécie</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Cartão de Crédito Loja Parceira">Cartão de Crédito Loja Parceira</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConsignment(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-slate-300 hover:bg-white/[10] transition text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSettling ? 'Registrando...' : 'Confirmar Acerto Financeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
