import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calculator,
  Flame,
  Printer as PrinterIcon,
  Package,
  History,
  Settings as SettingsIcon,
  Database,
  RefreshCw,
  Sparkles,
  Tag,
  AlertTriangle,
  Sun,
  Moon,
  Eye,
  ShoppingBag,
  Leaf,
  Globe,
  Factory,
  Box
} from 'lucide-react';
import { AppSettings, AppTheme, Filament, Printer, PrintJob, Product, ProductSale, Supply, ProductionOrder } from './types';
import { ModelAnalyzerView } from './components/ModelAnalyzerView';
import { CostCalculatorView } from './components/CostCalculatorView';
import { StockManagementView } from './components/StockManagementView';
import { PrintersView } from './components/PrintersView';
import { ProductsView } from './components/ProductsView';
import { PrintHistoryView } from './components/PrintHistoryView';
import { SalesManagementView } from './components/SalesManagementView';
import { ProductionControlView } from './components/ProductionControlView';
import { SettingsView } from './components/SettingsView';
import { RegisterSaleModal } from './components/RegisterSaleModal';
import { safeFetchJson } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'calculator' | 'stock' | 'products' | 'production' | 'sales' | 'history' | 'settings'>('analyzer');
  const [calculatorInitialParams, setCalculatorInitialParams] = useState<any>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'costs' | 'printers' | 'integrations'>('costs');
  const [loading, setLoading] = useState(true);

  // Ready Product Sales Modal State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | undefined>(undefined);

  // Workshop Contrast Theme State (persisted in localStorage)
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('printcraft_theme') as AppTheme;
    if (saved === 'high-contrast-light' || saved === 'high-contrast-dark' || saved === 'standard' || saved === 'sage-bento') {
      return saved;
    }
    return 'standard';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('printcraft_theme', theme);
  }, [theme]);

  // App Data States with localStorage initial hydration for instant load and resilience
  const [printers, setPrinters] = useState<Printer[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_printers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [filaments, setFilaments] = useState<Filament[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_filaments');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [supplies, setSupplies] = useState<Supply[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_supplies');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_products');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [printJobs, setPrintJobs] = useState<PrintJob[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_jobs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [sales, setSales] = useState<ProductSale[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_sales');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_production_orders');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [preselectedSaleForOP, setPreselectedSaleForOP] = useState<ProductSale | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem('printcraft_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      energy_kwh_rate: 0.85,
      currency: 'R$',
      default_loss_margin: 10,
      hourly_labor_rate: 20.00,
      default_infill: 20,
      default_layer_height: 0.2,
    };
  });

  // Low stock counter for badge alert
  const lowStockCount =
    filaments.filter((f) => f.remaining_weight_g < 200).length +
    supplies.filter((s) => s.in_stock_qty <= s.min_stock_alert).length;

  // Load all data from SQLite and synchronize with localStorage
  const fetchData = async () => {
    try {
      const [printersRes, filamentsRes, suppliesRes, productsRes, jobsRes, salesRes, ordersRes, settingsRes] = await Promise.all([
        safeFetchJson<Printer[]>('/api/printers', undefined, []),
        safeFetchJson<Filament[]>('/api/filaments', undefined, []),
        safeFetchJson<Supply[]>('/api/supplies', undefined, []),
        safeFetchJson<Product[]>('/api/products', undefined, []),
        safeFetchJson<PrintJob[]>('/api/print-jobs', undefined, []),
        safeFetchJson<ProductSale[]>('/api/sales', undefined, []),
        safeFetchJson<ProductionOrder[]>('/api/production-orders', undefined, []),
        safeFetchJson<any>('/api/settings', undefined, {}),
      ]);

      const serverPrinters: Printer[] = Array.isArray(printersRes) ? printersRes : [];
      const serverFilaments: Filament[] = Array.isArray(filamentsRes) ? filamentsRes : [];
      const serverSupplies: Supply[] = Array.isArray(suppliesRes) ? suppliesRes : [];
      const serverProducts: Product[] = Array.isArray(productsRes) ? productsRes : [];
      const serverJobs: PrintJob[] = Array.isArray(jobsRes) ? jobsRes : [];
      const serverSales: ProductSale[] = Array.isArray(salesRes) ? salesRes : [];
      const serverOrders: ProductionOrder[] = Array.isArray(ordersRes) ? ordersRes : [];

      // Always trust the SQLite server as the single source of truth
      if (Array.isArray(serverPrinters)) {
        setPrinters(serverPrinters);
        try { localStorage.setItem('printcraft_printers', JSON.stringify(serverPrinters)); } catch {}
      }
      if (Array.isArray(serverFilaments)) {
        setFilaments(serverFilaments);
        try { localStorage.setItem('printcraft_filaments', JSON.stringify(serverFilaments)); } catch {}
      }
      if (Array.isArray(serverSupplies)) {
        setSupplies(serverSupplies);
        try { localStorage.setItem('printcraft_supplies', JSON.stringify(serverSupplies)); } catch {}
      }
      if (Array.isArray(serverProducts)) {
        setProducts(serverProducts);
        try { localStorage.setItem('printcraft_products', JSON.stringify(serverProducts)); } catch {}
      }
      if (Array.isArray(serverJobs)) {
        setPrintJobs(serverJobs);
        try { localStorage.setItem('printcraft_jobs', JSON.stringify(serverJobs)); } catch {}
      }
      if (Array.isArray(serverSales)) {
        setSales(serverSales);
        try { localStorage.setItem('printcraft_sales', JSON.stringify(serverSales)); } catch {}
      }
      if (Array.isArray(serverOrders)) {
        setProductionOrders(serverOrders);
        try { localStorage.setItem('printcraft_production_orders', JSON.stringify(serverOrders)); } catch {}
      }
      if (settingsRes && !settingsRes.error) {
        setSettings(settingsRes);
        try { localStorage.setItem('printcraft_settings', JSON.stringify(settingsRes)); } catch {}
      }
    } catch (err) {
      console.error('Error fetching data from SQLite API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Deseja estornar esta venda? A quantidade vendida retornará ao estoque de peças prontas.')) {
      return;
    }
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(saleId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao excluir venda');
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Erro ao estornar venda');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Header - Clean, Single-Line & Uncluttered */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Brand / Logo - Sleek & Compact */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 border border-white/20 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight leading-none whitespace-nowrap">
                  PrintCraft <span className="text-sky-400 font-extrabold">3D</span>
                </h1>
                <span
                  className="hidden 2xl:inline-flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap"
                  title="SQLite Local Conectado"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SQLite
                </span>
              </div>
            </div>

            {/* Main Navigation Tabs - Guaranteed Single-Line Segmented Control */}
            <nav className="hidden md:flex items-center gap-1 bg-[#131316] p-1 rounded-2xl border border-white/[0.08] shadow-inner overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('analyzer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'analyzer'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25 border border-sky-400/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Analisador 3D</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'calculator'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25 border border-sky-400/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculadora</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'stock'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25 border border-sky-400/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Estoque</span>
                {lowStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm">
                    {lowStockCount}
                  </span>
                )}
              </button>



              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25 border border-sky-400/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Catálogo</span>
                {products.length > 0 && (
                  <span className="text-[10px] opacity-70 font-mono">({products.length})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('production')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'production'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25 border border-emerald-400/40 font-bold'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04]'
                }`}
              >
                <Factory className="w-3.5 h-3.5" />
                <span>Produção</span>
                {productionOrders.filter((o) => o.status === 'in_progress').length > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'production' ? 'bg-white' : 'bg-sky-400'} animate-pulse`} />
                )}
                {productionOrders.filter((o) => o.status === 'pending').length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none border transition-colors ${
                    activeTab === 'production'
                      ? 'bg-black/20 text-white border-white/20 font-bold'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {productionOrders.filter((o) => o.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'sales'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25 border border-emerald-400/40 font-bold'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04]'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Vendas</span>
                {sales.length > 0 && (
                  <span className="text-[10px] opacity-70 font-mono">({sales.length})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25 border border-sky-400/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Histórico</span>
              </button>

              <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />

              {/* Workshop Theme Toggle - Icon Only */}
              <button
                type="button"
                id="btn-workshop-contrast"
                onClick={() => {
                  setTheme((prev) => {
                    if (prev === 'standard') return 'sage-bento';
                    if (prev === 'sage-bento') return 'high-contrast-light';
                    if (prev === 'high-contrast-light') return 'high-contrast-dark';
                    return 'standard';
                  });
                }}
                className={`p-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer ${
                  theme === 'sage-bento'
                    ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-400/60 ring-1 ring-emerald-400/30 font-bold'
                    : theme === 'high-contrast-light'
                    ? 'bg-amber-400 text-slate-950 border border-amber-500 font-bold'
                    : theme === 'high-contrast-dark'
                    ? 'bg-white text-black border border-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
                title={`Tema atual: ${
                  theme === 'sage-bento'
                    ? 'Sage Bento'
                    : theme === 'high-contrast-light'
                    ? 'Oficina Clara'
                    : theme === 'high-contrast-dark'
                    ? 'Preto Puro'
                    : 'Dark Studio'
                } (Clique para alternar)`}
              >
                {theme === 'sage-bento' ? (
                  <Leaf className="w-4 h-4 text-emerald-400" />
                ) : theme === 'high-contrast-light' ? (
                  <Sun className="w-4 h-4 text-slate-950" />
                ) : theme === 'high-contrast-dark' ? (
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Sync SQLite Button - Icon Only */}
              <button
                type="button"
                id="btn-refresh-sqlite"
                onClick={fetchData}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all duration-150 shrink-0 cursor-pointer"
                title="Sincronizar dados do SQLite"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Ajustes do Sistema - Somente Ícone de Catraca (Engrenagem) */}
              <button
                type="button"
                id="btn-open-settings"
                onClick={() => {
                  setSettingsSubTab('costs');
                  setActiveTab('settings');
                }}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25 border border-sky-400/40 font-bold'
                    : 'text-slate-400 hover:text-sky-300 hover:bg-white/[0.04]'
                }`}
                title="Ajustes do Sistema (Configurações e Integrações)"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </nav>
          </div>

          {/* Mobile Navigation Row - Clean Single Space with Icon-Only Controls */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-white/[0.08] no-scrollbar">
            {/* Quick Toggle Theme - Icon Only */}
            <button
              type="button"
              onClick={() => {
                setTheme((prev) => {
                  if (prev === 'standard') return 'sage-bento';
                  if (prev === 'sage-bento') return 'high-contrast-light';
                  if (prev === 'high-contrast-light') return 'high-contrast-dark';
                  return 'standard';
                });
              }}
              className={`p-2 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center ${
                theme === 'sage-bento'
                  ? 'bg-emerald-800/40 text-emerald-200 border border-emerald-400'
                  : theme === 'high-contrast-light'
                  ? 'bg-amber-400 text-black border border-amber-500'
                  : theme === 'high-contrast-dark'
                  ? 'bg-white text-black border border-white'
                  : 'text-slate-300 bg-[#131316] border border-white/[0.1]'
              }`}
              title="Alternar tema"
            >
              {theme === 'sage-bento' ? (
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              ) : theme === 'high-contrast-light' ? (
                <Sun className="w-3.5 h-3.5 text-slate-950" />
              ) : theme === 'high-contrast-dark' ? (
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Refresh SQLite Mobile - Icon Only */}
            <button
              type="button"
              onClick={fetchData}
              className="p-2 rounded-xl text-slate-300 bg-[#131316] border border-white/[0.1] shrink-0"
              title="Sincronizar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analyzer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'analyzer' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Box className="w-3.5 h-3.5 shrink-0" />
              Analisador 3D
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'calculator' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              Calculadora
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'stock' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              Estoque
              {lowStockCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'products' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('production')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'production' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Factory className="w-3.5 h-3.5 shrink-0" />
              Produção
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'sales' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              Vendas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              Histórico
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsSubTab('costs');
                setActiveTab('settings');
              }}
              className={`p-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center justify-center ${
                activeTab === 'settings' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 bg-[#131316]'
              }`}
              title="Ajustes"
            >
              <SettingsIcon className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Carregando dados do banco SQLite...</p>
          </div>
        ) : (
          <>
            {activeTab === 'analyzer' && (
              <ModelAnalyzerView
                printers={printers}
                filaments={filaments}
                settings={settings}
                theme={theme}
                onNavigateToCalculator={(params) => {
                  setCalculatorInitialParams(params);
                  setActiveTab('calculator');
                }}
              />
            )}

            {activeTab === 'calculator' && (
              <CostCalculatorView
                printers={printers}
                filaments={filaments}
                supplies={supplies}
                settings={settings}
                onRefreshData={fetchData}
                onNavigateToStock={() => setActiveTab('stock')}
                theme={theme}
                initialParams={calculatorInitialParams}
              />
            )}

            {activeTab === 'stock' && (
              <StockManagementView
                filaments={filaments}
                supplies={supplies}
                products={products}
                onRefreshData={fetchData}
                onOpenSaleModal={(product) => {
                  setSelectedProductForSale(product);
                  setIsSaleModalOpen(true);
                }}
              />
            )}

            {activeTab === 'printers' && (
              <PrintersView
                printers={printers}
                onRefreshData={fetchData}
              />
            )}

            {activeTab === 'products' && (
              <ProductsView
                products={products}
                printers={printers}
                filaments={filaments}
                onRefreshData={fetchData}
                onSelectProductForCalculator={() => setActiveTab('calculator')}
                onOpenSaleModal={(product) => {
                  setSelectedProductForSale(product);
                  setIsSaleModalOpen(true);
                }}
              />
            )}

            {activeTab === 'production' && (
              <ProductionControlView
                orders={productionOrders}
                products={products}
                printers={printers}
                filaments={filaments}
                supplies={supplies}
                sales={sales}
                onRefreshData={fetchData}
                preselectedSaleForOP={preselectedSaleForOP}
                onClearPreselectedSale={() => setPreselectedSaleForOP(null)}
                theme={theme}
              />
            )}

            {activeTab === 'sales' && (
              <SalesManagementView
                sales={sales}
                products={products}
                onOpenNewSaleModal={() => {
                  setSelectedProductForSale(undefined);
                  setIsSaleModalOpen(true);
                }}
                onDeleteSale={handleDeleteSale}
                onRefreshData={fetchData}
                onGenerateOP={(sale) => {
                  setPreselectedSaleForOP(sale);
                  setActiveTab('production');
                }}
              />
            )}

            {activeTab === 'history' && (
              <PrintHistoryView jobs={printJobs} />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSaveSettings={(newSet) => setSettings(newSet)}
                currentTheme={theme}
                onChangeTheme={(newTheme) => setTheme(newTheme)}
                onRefreshData={fetchData}
                products={products}
                sales={sales}
                onNavigateToSales={() => setActiveTab('sales')}
                initialSubTab={settingsSubTab}
                printers={printers}
              />
            )}
          </>
        )}
      </main>

      {/* Footer - Bento Style */}
      <footer className="border-t border-white/[0.08] bg-[#0A0A0B] py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Controle de Impressão 3D & Custos • React + Vite + Node + SQLite
          </span>
          <span className="text-slate-400">
            Cálculo automático de energia (Watts), filamento, insumos BOM e margem de perda
          </span>
        </div>
      </footer>

      {/* Register Sale Modal */}
      <RegisterSaleModal
        isOpen={isSaleModalOpen}
        products={products}
        preselectedProduct={selectedProductForSale}
        onClose={() => {
          setIsSaleModalOpen(false);
          setSelectedProductForSale(undefined);
        }}
        onSaleSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
