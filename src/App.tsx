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
  AlertTriangle
} from 'lucide-react';
import { AppSettings, Filament, Printer, PrintJob, Product, Supply } from './types';
import { CostCalculatorView } from './components/CostCalculatorView';
import { StockManagementView } from './components/StockManagementView';
import { PrintersView } from './components/PrintersView';
import { ProductsView } from './components/ProductsView';
import { PrintHistoryView } from './components/PrintHistoryView';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'stock' | 'printers' | 'products' | 'history'>('calculator');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // App Data States
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    energy_kwh_rate: 0.85,
    currency: 'R$',
    default_loss_margin: 10,
    hourly_labor_rate: 20.00,
    default_infill: 20,
    default_layer_height: 0.2,
  });

  // Low stock counter for badge alert
  const lowStockCount =
    filaments.filter((f) => f.remaining_weight_g < 200).length +
    supplies.filter((s) => s.in_stock_qty <= s.min_stock_alert).length;

  // Load all initial data from SQLite
  const fetchData = async () => {
    try {
      const [printersRes, filamentsRes, suppliesRes, productsRes, jobsRes, settingsRes] = await Promise.all([
        fetch('/api/printers').then((r) => r.json()),
        fetch('/api/filaments').then((r) => r.json()),
        fetch('/api/supplies').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/print-jobs').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);

      if (Array.isArray(printersRes)) setPrinters(printersRes);
      if (Array.isArray(filamentsRes)) setFilaments(filamentsRes);
      if (Array.isArray(suppliesRes)) setSupplies(suppliesRes);
      if (Array.isArray(productsRes)) setProducts(productsRes);
      if (Array.isArray(jobsRes)) setPrintJobs(jobsRes);
      if (settingsRes && !settingsRes.error) setSettings(settingsRes);
    } catch (err) {
      console.error('Error fetching data from SQLite API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Header - Bento Grid Style */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">
            {/* Brand / Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 border border-white/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight leading-none">
                    PrintCraft <span className="text-sky-400 font-extrabold">3D</span>
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <Database className="w-2.5 h-2.5 text-emerald-400" />
                    SQLite Ativo
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                  Controle de Impressão 3D, Insumos & Formação de Custos
                </p>
              </div>
            </div>

            {/* Main Navigation Tabs - Bento Segmented Control */}
            <nav className="hidden md:flex items-center gap-1.5 bg-[#131316] p-1.5 rounded-2xl border border-white/[0.08] shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('calculator')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'calculator'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Calculadora & STL/G-Code
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'stock'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Estoque em Tempo Real
                {lowStockCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold shadow-sm">
                    {lowStockCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('printers')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'printers'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                Impressoras & Watts
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'products'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Catálogo ({products.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Histórico
              </button>
            </nav>

            {/* Quick Actions (Refresh & Settings) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchData}
                className="p-2.5 rounded-2xl bg-[#131316] text-slate-400 hover:text-slate-200 hover:bg-[#1C1C22] transition border border-white/[0.08] hover:border-white/[0.15]"
                title="Recarregar dados do SQLite"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 bg-[#131316] hover:bg-[#1C1C22] text-slate-200 border border-white/[0.08] hover:border-white/[0.15] px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition shadow-sm"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Configurações</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Row */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto py-2.5 border-t border-white/[0.08] no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'calculator' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Calculadora
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'stock' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Estoque
              {lowStockCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {lowStockCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('printers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'printers' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              Impressoras
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'products' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-[#131316]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico
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
            {activeTab === 'calculator' && (
              <CostCalculatorView
                printers={printers}
                filaments={filaments}
                supplies={supplies}
                settings={settings}
                onRefreshData={fetchData}
                onNavigateToStock={() => setActiveTab('stock')}
              />
            )}

            {activeTab === 'stock' && (
              <StockManagementView
                filaments={filaments}
                supplies={supplies}
                onRefreshData={fetchData}
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
              />
            )}

            {activeTab === 'history' && (
              <PrintHistoryView jobs={printJobs} />
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSaveSettings={(newSet) => setSettings(newSet)}
      />
    </div>
  );
}
