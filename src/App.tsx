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
  Box,
  Users,
  Building2,
  LogOut,
  UserPlus,
  Lock,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { AppSettings, AppTheme, Filament, Printer, PrintJob, Product, ProductSale, Supply, ProductionOrder, Client } from './types';
import { ModelAnalyzerView } from './components/ModelAnalyzerView';
import { PlateEditorView } from './components/PlateEditorView';
import { CostCalculatorView } from './components/CostCalculatorView';
import { StockManagementView } from './components/StockManagementView';
import { PrintersView } from './components/PrintersView';
import { ProductsView } from './components/ProductsView';
import { PrintHistoryView } from './components/PrintHistoryView';
import { SalesManagementView } from './components/SalesManagementView';
import { ProductionControlView } from './components/ProductionControlView';
import { ClientsView } from './components/ClientsView';
import { SettingsView } from './components/SettingsView';
import { RegisterSaleModal } from './components/RegisterSaleModal';
import { AdminView } from './components/admin/AdminView';
import { ProductAuthModal } from './components/auth/ProductAuthModal';
import { CompanyTeamModal } from './components/auth/CompanyTeamModal';
import { safeFetchJson } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'plates' | 'calculator' | 'stock' | 'products' | 'production' | 'sales' | 'clients' | 'history' | 'settings'>('analyzer');
  const [calculatorInitialParams, setCalculatorInitialParams] = useState<any>(null);
  const [platesInitialObject, setPlatesInitialObject] = useState<any>(null);
  const [platesInitialResult, setPlatesInitialResult] = useState<any>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'costs' | 'printers' | 'integrations'>('costs');
  const [loading, setLoading] = useState(true);

  // Authentication & Multi-Tenant Company Session State
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('printcraft_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentCompany, setCurrentCompany] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('printcraft_auth_company');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(() => {
    return localStorage.getItem('printcraft_is_superadmin') === 'true';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('printcraft_auth_token');
  });

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Module Permission Checker
  const canAccess = (moduleKey: string): boolean => {
    if (!currentUser) return false;
    if (isSuperadmin || currentUser.role === 'superadmin' || currentUser.role === 'admin') return true;
    const permissions: string[] = currentUser.permissions || [];
    if (permissions.includes('all')) return true;
    if (moduleKey === 'plates') return permissions.includes('plates') || permissions.includes('analyzer') || permissions.includes('products');
    return permissions.includes(moduleKey);
  };

  // Auto-switch to first authorized tab if user doesn't have access to active tab
  useEffect(() => {
    if (currentUser && !canAccess(activeTab)) {
      const validTabs: Array<'analyzer' | 'plates' | 'calculator' | 'stock' | 'products' | 'production' | 'sales' | 'clients' | 'settings'> = [
        'analyzer', 'plates', 'calculator', 'stock', 'products', 'production', 'sales', 'clients', 'settings'
      ];
      const firstAllowed = validTabs.find((t) => canAccess(t));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
  }, [currentUser]);

  // Ready Product Sales Modal State
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleModalDefaultMode, setSaleModalDefaultMode] = useState<'direct' | 'indirect' | 'consignment' | 'presale'>('direct');
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | undefined>(undefined);

  // Decoupled Theme State Architecture:
  // 1. Superadmin Theme: follows the superadmin's choice across administrative screens (/admin)
  const [adminTheme, setAdminTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('printcraft_admin_theme') as AppTheme;
      if (saved === 'high-contrast-light' || saved === 'high-contrast-dark' || saved === 'standard' || saved === 'sage-bento') {
        return saved;
      }
    } catch {}
    return 'sage-bento';
  });

  // 2. Company Theme: follows the Company Admin's choice for the registered company workspace
  const [companyTheme, setCompanyTheme] = useState<AppTheme>(() => {
    try {
      const savedCompany = localStorage.getItem('printcraft_auth_company');
      const parsedCompany = savedCompany ? JSON.parse(savedCompany) : null;
      if (parsedCompany?.id) {
        const companySpecificTheme = localStorage.getItem(`printcraft_company_theme_${parsedCompany.id}`) as AppTheme;
        if (companySpecificTheme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(companySpecificTheme)) {
          return companySpecificTheme;
        }
        if (parsedCompany.theme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(parsedCompany.theme)) {
          return parsedCompany.theme;
        }
      }
      const genericCompanyTheme = localStorage.getItem('printcraft_company_theme') as AppTheme;
      if (genericCompanyTheme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(genericCompanyTheme)) {
        return genericCompanyTheme;
      }
    } catch {}
    return 'sage-bento';
  });

  // Handle /admin route navigation
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedIsSuper = localStorage.getItem('printcraft_is_superadmin') === 'true';
      if (savedIsSuper && window.location.pathname === '/') {
        try {
          window.history.replaceState({}, '', '/admin');
        } catch {}
        return '/admin';
      }
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Ao logar como superadmin ou carregar como superadmin, direciona imediatamente para o Admin Console (/admin)
  useEffect(() => {
    if ((isSuperadmin || currentUser?.role === 'superadmin') && currentPath === '/') {
      navigateToAdmin();
    }
  }, [isSuperadmin, currentUser, currentPath]);

  // Synchronize active HTML theme according to route:
  // - /admin -> adminTheme (Superadmin preference)
  // - / (and workshop) -> companyTheme (Company Admin preference)
  useEffect(() => {
    const isAdminArea = currentPath === '/admin' || currentPath.startsWith('/admin');
    const effectiveTheme = isAdminArea ? adminTheme : companyTheme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [currentPath, adminTheme, companyTheme]);

  // Synchronize company theme if company changes
  useEffect(() => {
    if (currentCompany?.id) {
      try {
        const cached = localStorage.getItem(`printcraft_company_theme_${currentCompany.id}`) as AppTheme;
        if (cached && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(cached)) {
          setCompanyTheme(cached);
        } else if (currentCompany.theme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(currentCompany.theme)) {
          setCompanyTheme(currentCompany.theme);
        }
      } catch {}
    }
  }, [currentCompany?.id, currentCompany?.theme]);

  const handleAdminThemeChange = (newTheme: AppTheme) => {
    setAdminTheme(newTheme);
    try {
      localStorage.setItem('printcraft_admin_theme', newTheme);
    } catch {}
    if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    fetch('/api/admin/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme }),
    }).catch((e) => console.warn('Erro ao salvar tema do admin no servidor:', e));
  };

  const handleCompanyThemeChange = (newTheme: AppTheme) => {
    const isCompAdmin = currentUser?.role === 'admin' || isSuperadmin || currentUser?.role === 'superadmin';
    if (!isCompAdmin) {
      alert(`O tema da oficina foi configurado pelo Administrador da Empresa (${currentCompany?.trade_name || currentCompany?.name || 'sua empresa'}). Apenas administradores podem alterá-lo.`);
      return;
    }

    setCompanyTheme(newTheme);
    try {
      localStorage.setItem('printcraft_company_theme', newTheme);
      if (currentCompany?.id) {
        localStorage.setItem(`printcraft_company_theme_${currentCompany.id}`, newTheme);
      }
    } catch {}

    if (currentCompany?.id) {
      const updated = { ...currentCompany, theme: newTheme };
      setCurrentCompany(updated);
      try {
        localStorage.setItem('printcraft_auth_company', JSON.stringify(updated));
      } catch {}

      fetch(`/api/company/${currentCompany.id}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      }).catch((e) => console.warn('Erro ao salvar tema da empresa no servidor:', e));
    }

    if (currentPath !== '/admin' && !currentPath.startsWith('/admin')) {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setCurrentPath('/admin');
  };

  const navigateToApp = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleLoginSuccess = (user: any, company: any, token: string, isSuper: boolean) => {
    setCurrentUser(user);
    setCurrentCompany(company);
    setIsSuperadmin(isSuper);
    setIsAuthModalOpen(false);

    // Ao logar como superadmin, direciona imediatamente para o Admin console (/admin) e não para a tela de APP
    if (isSuper || user?.role === 'superadmin') {
      try {
        localStorage.setItem('printcraft_admin_token', token);
        localStorage.setItem('printcraft_admin_user', JSON.stringify(user));
        localStorage.setItem('printcraft_is_superadmin', 'true');
      } catch {}
      navigateToAdmin();
      return;
    }

    const themeToUse = (company?.theme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(company.theme))
      ? company.theme
      : 'sage-bento';
    setCompanyTheme(themeToUse);
    try {
      if (company?.id) {
        localStorage.setItem(`printcraft_company_theme_${company.id}`, themeToUse);
      }
      localStorage.setItem('printcraft_company_theme', themeToUse);
    } catch {}
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('printcraft_auth_token');
      localStorage.removeItem('printcraft_auth_user');
      localStorage.removeItem('printcraft_auth_company');
      localStorage.removeItem('printcraft_is_superadmin');
      localStorage.removeItem('printcraft_admin_token');
      localStorage.removeItem('printcraft_admin_user');
    } catch (e) {
      console.error('Logout cleanup error:', e);
    }
    setCurrentUser(null);
    setCurrentCompany(null);
    setIsSuperadmin(false);
    setIsTeamModalOpen(false);
    setCompanyTheme('sage-bento');
    setIsAuthModalOpen(true);
    navigateToApp();
  };

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

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const cached = localStorage.getItem('printcraft_clients');
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
      const [printersRes, filamentsRes, suppliesRes, productsRes, jobsRes, salesRes, ordersRes, clientsRes, settingsRes] = await Promise.all([
        safeFetchJson<Printer[]>('/api/printers', undefined, []),
        safeFetchJson<Filament[]>('/api/filaments', undefined, []),
        safeFetchJson<Supply[]>('/api/supplies', undefined, []),
        safeFetchJson<Product[]>('/api/products', undefined, []),
        safeFetchJson<PrintJob[]>('/api/print-jobs', undefined, []),
        safeFetchJson<ProductSale[]>('/api/sales', undefined, []),
        safeFetchJson<ProductionOrder[]>('/api/production-orders', undefined, []),
        safeFetchJson<Client[]>('/api/clients', undefined, []),
        safeFetchJson<any>('/api/settings', undefined, {}),
      ]);

      const serverPrinters: Printer[] = Array.isArray(printersRes) ? printersRes : [];
      const serverFilaments: Filament[] = Array.isArray(filamentsRes) ? filamentsRes : [];
      const serverSupplies: Supply[] = Array.isArray(suppliesRes) ? suppliesRes : [];
      const serverProducts: Product[] = Array.isArray(productsRes) ? productsRes : [];
      const serverJobs: PrintJob[] = Array.isArray(jobsRes) ? jobsRes : [];
      const serverSales: ProductSale[] = Array.isArray(salesRes) ? salesRes : [];
      const serverOrders: ProductionOrder[] = Array.isArray(ordersRes) ? ordersRes : [];
      const serverClients: Client[] = Array.isArray(clientsRes) ? clientsRes : [];

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
      if (Array.isArray(serverClients)) {
        setClients(serverClients);
        try { localStorage.setItem('printcraft_clients', JSON.stringify(serverClients)); } catch {}
      }
      if (settingsRes && !settingsRes.error) {
        setSettings(settingsRes);
        try { localStorage.setItem('printcraft_settings', JSON.stringify(settingsRes)); } catch {}
      }

      // Sync Admin Theme from server
      try {
        const adminThemeRes = await fetch('/api/admin/theme').then(r => r.json());
        if (adminThemeRes?.theme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(adminThemeRes.theme)) {
          setAdminTheme(adminThemeRes.theme);
          try { localStorage.setItem('printcraft_admin_theme', adminThemeRes.theme); } catch {}
        }
      } catch {}

      // Sync Company Theme from server
      if (currentCompany?.id) {
        try {
          const compThemeRes = await fetch(`/api/company/${currentCompany.id}/theme`).then(r => r.json());
          if (compThemeRes?.theme && ['standard', 'sage-bento', 'high-contrast-light', 'high-contrast-dark'].includes(compThemeRes.theme)) {
            setCompanyTheme(compThemeRes.theme);
            try {
              localStorage.setItem(`printcraft_company_theme_${currentCompany.id}`, compThemeRes.theme);
              localStorage.setItem('printcraft_company_theme', compThemeRes.theme);
            } catch {}
          }
        } catch {}
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

  // Dedicated Route: /admin -> Product Administration Panel (Acesso restrito ao Superadmin)
  const isSuperUser = isSuperadmin || currentUser?.role === 'superadmin' || (typeof window !== 'undefined' && localStorage.getItem('printcraft_is_superadmin') === 'true');

  if (currentPath === '/admin' || currentPath.startsWith('/admin') || (isSuperUser && currentUser)) {
    if (!isSuperUser) {
      navigateToApp();
      setIsAuthModalOpen(true);
      return null;
    }

    return (
      <AdminView
        onLogout={handleLogout}
        currentTheme={adminTheme}
        onChangeTheme={handleAdminThemeChange}
        onRefreshData={fetchData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Header - Sleek, Balanced & Intuitive */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Brand Logo - Clean & Uncluttered */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm border border-white/20 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none whitespace-nowrap">
                PrintCraft <span className="text-sky-400 font-extrabold">3D</span>
              </span>
            </div>

            {/* Main Navigation Tabs - Desktop (Fixed structure with all modules, restricted ones disabled) */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#131316] p-1.5 rounded-xl border border-white/[0.08] shadow-inner shrink-0">
              {/* Analisador */}
              <button
                type="button"
                disabled={!canAccess('analyzer')}
                onClick={() => canAccess('analyzer') && setActiveTab('analyzer')}
                title={canAccess('analyzer') ? 'Analisador 3D de Arquivos' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('analyzer')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'analyzer'
                    ? 'bg-sky-500 text-white shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>Analisador</span>
                {!canAccess('analyzer') && <Lock className="w-3 h-3 text-slate-500/80" />}
              </button>

              {/* Editor de Mesas (Divisor de Arquivos por Cor Única) */}
              <button
                type="button"
                disabled={!canAccess('plates')}
                onClick={() => canAccess('plates') && setActiveTab('plates')}
                title={canAccess('plates') ? 'Editor 3D de Mesas (Organizar partes por cor única para envio)' : 'Módulo restrito'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('plates')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'plates'
                    ? 'bg-sky-500 text-white shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Editor de Mesas</span>
                {!canAccess('plates') && <Lock className="w-3 h-3 text-slate-500/80" />}
              </button>

              {/* Calculadora */}
              <button
                type="button"
                disabled={!canAccess('calculator')}
                onClick={() => canAccess('calculator') && setActiveTab('calculator')}
                title={canAccess('calculator') ? 'Calculadora de Custos & Orçamentos' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('calculator')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'calculator'
                    ? 'bg-sky-500 text-white shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Calculadora</span>
                {!canAccess('calculator') && <Lock className="w-3 h-3 text-slate-500/80" />}
              </button>

              {/* Catálogo */}
              <button
                type="button"
                disabled={!canAccess('products')}
                onClick={() => canAccess('products') && setActiveTab('products')}
                title={canAccess('products') ? 'Catálogo de Modelos & Peças Prontas' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('products')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'products'
                    ? 'bg-sky-500 text-white shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>Catálogo</span>
                {!canAccess('products') && <Lock className="w-3 h-3 text-slate-500/80" />}
              </button>

              {/* Pessoas */}
              <button
                type="button"
                disabled={!canAccess('clients')}
                onClick={() => canAccess('clients') && setActiveTab('clients')}
                title={canAccess('clients') ? 'Gestão de Pessoas (Clientes e Equipe)' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('clients')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'clients'
                    ? 'bg-sky-500 text-white shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Pessoas</span>
                {!canAccess('clients') && <Lock className="w-3 h-3 text-slate-500/80" />}
              </button>

              {/* Estoque */}
              <button
                type="button"
                disabled={!canAccess('stock')}
                onClick={() => canAccess('stock') && setActiveTab('stock')}
                title={canAccess('stock') ? 'Estoque de Insumos & Matéria-prima' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`relative px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('stock')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'stock'
                    ? 'bg-sky-500 text-white shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Estoque</span>
                {!canAccess('stock') ? (
                  <Lock className="w-3 h-3 text-slate-500/80" />
                ) : (
                  lowStockCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-xs">
                      {lowStockCount}
                    </span>
                  )
                )}
              </button>

              {/* Produção */}
              <button
                type="button"
                disabled={!canAccess('production')}
                onClick={() => canAccess('production') && setActiveTab('production')}
                title={canAccess('production') ? 'PCP & Linha de Impressão 3D' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('production')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'production'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <Factory className="w-4 h-4" />
                <span>Produção</span>
                {!canAccess('production') ? (
                  <Lock className="w-3 h-3 text-slate-500/80" />
                ) : (
                  <>
                    {productionOrders.filter((o) => o.status === 'in_progress').length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    {productionOrders.filter((o) => o.status === 'pending').length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold">
                        {productionOrders.filter((o) => o.status === 'pending').length}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Vendas */}
              <button
                type="button"
                disabled={!canAccess('sales')}
                onClick={() => canAccess('sales') && setActiveTab('sales')}
                title={canAccess('sales') ? 'Vendas & Faturamento' : 'Módulo restrito: sem permissão de acesso para seu usuário'}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-150 whitespace-nowrap ${
                  !canAccess('sales')
                    ? 'opacity-35 cursor-not-allowed text-slate-500 hover:text-slate-500 hover:bg-transparent select-none'
                    : activeTab === 'sales'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold cursor-pointer'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Vendas</span>
                {!canAccess('sales') && <Lock className="w-3 h-3 text-slate-500/80" />}
              </button>
            </nav>

            {/* Right Actions: Tools, User Profile & Logoff */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Theme Toggle - Icon Only */}
              <button
                type="button"
                id="btn-workshop-contrast"
                onClick={() => {
                  const isCompAdmin = currentUser?.role === 'admin' || isSuperadmin || currentUser?.role === 'superadmin';
                  if (!isCompAdmin) {
                    alert(`O tema da oficina foi configurado pelo Administrador da Empresa (${currentCompany?.trade_name || currentCompany?.name || 'sua empresa'}). Apenas administradores da empresa podem alterá-lo.`);
                    return;
                  }
                  const nextTheme: AppTheme =
                    companyTheme === 'standard'
                      ? 'sage-bento'
                      : companyTheme === 'sage-bento'
                      ? 'high-contrast-light'
                      : companyTheme === 'high-contrast-light'
                      ? 'high-contrast-dark'
                      : 'standard';
                  handleCompanyThemeChange(nextTheme);
                }}
                className={`p-2 rounded-lg text-xs transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer ${
                  companyTheme === 'sage-bento'
                    ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-400/50 font-bold'
                    : companyTheme === 'high-contrast-light'
                    ? 'bg-amber-400 text-slate-950 border border-amber-500 font-bold'
                    : companyTheme === 'high-contrast-dark'
                    ? 'bg-white text-black border border-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
                title={`Tema da Oficina: ${
                  companyTheme === 'sage-bento'
                    ? 'Sage Bento'
                    : companyTheme === 'high-contrast-light'
                    ? 'Oficina Clara'
                    : companyTheme === 'high-contrast-dark'
                    ? 'Preto Puro'
                    : 'Dark Studio'
                }`}
              >
                {companyTheme === 'sage-bento' ? (
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                ) : companyTheme === 'high-contrast-light' ? (
                  <Sun className="w-3.5 h-3.5 text-slate-950" />
                ) : companyTheme === 'high-contrast-dark' ? (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Ajustes do Sistema (Configurações) */}
              {canAccess('settings') && (
                <button
                  type="button"
                  id="btn-open-settings"
                  onClick={() => {
                    setSettingsSubTab('costs');
                    setActiveTab('settings');
                  }}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-sky-500 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-sky-300 hover:bg-white/[0.05]'
                  }`}
                  title="Configurações do Sistema"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Acesso Admin Console (visível SOMENTE para Superadmin) */}
              {isSuperadmin && (
                <button
                  type="button"
                  id="btn-open-admin"
                  onClick={navigateToAdmin}
                  className="p-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                  title="Painel Super Admin (/admin)"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Subtle vertical divider */}
              <div className="w-px h-5 bg-white/10 mx-0.5 shrink-0" />

              {/* User Profile & Logoff */}
              {currentUser ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* User / Superadmin Profile Badge */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs shrink-0 cursor-default"
                    title={`Usuário: ${currentUser.name} • Perfil: ${isSuperadmin || currentUser.role === 'superadmin' ? 'Superadmin' : currentUser.role === 'admin' ? 'Administrador' : 'Usuário / Operador'}`}
                  >
                    <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                      {isSuperadmin || currentUser.role === 'superadmin' ? (
                        'S'
                      ) : (
                        currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'
                      )}
                    </div>
                    <span className="font-semibold text-slate-200 text-xs whitespace-nowrap">
                      {isSuperadmin || currentUser.role === 'superadmin'
                        ? 'Superadmin'
                        : currentUser.name.trim().split(/\s+/)[0]}
                    </span>
                  </div>

                  {/* Functional Logout Button - Icon Only */}
                  <button
                    type="button"
                    id="btn-logout"
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-xs font-semibold flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                    title="Sair da conta (Logoff)"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-open-login"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Acessar</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile / Tablet Navigation Row - Fixed full item row with restricted items disabled */}
          <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-1.5 border-t border-white/[0.08] no-scrollbar">
            {/* Analisador */}
            <button
              type="button"
              disabled={!canAccess('analyzer')}
              onClick={() => canAccess('analyzer') && setActiveTab('analyzer')}
              title={canAccess('analyzer') ? 'Analisador' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('analyzer')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'analyzer'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Box className="w-3 h-3 shrink-0" />
              <span>Analisador</span>
              {!canAccess('analyzer') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </button>

            {/* Editor de Mesas */}
            <button
              type="button"
              disabled={!canAccess('plates')}
              onClick={() => canAccess('plates') && setActiveTab('plates')}
              title={canAccess('plates') ? 'Editor de Mesas' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('plates')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'plates'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span>Editor Mesas</span>
              {!canAccess('plates') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </button>

            {/* Calculadora */}
            <button
              type="button"
              disabled={!canAccess('calculator')}
              onClick={() => canAccess('calculator') && setActiveTab('calculator')}
              title={canAccess('calculator') ? 'Calculadora' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('calculator')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'calculator'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Calculator className="w-3 h-3 shrink-0" />
              <span>Calculadora</span>
              {!canAccess('calculator') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </button>

            {/* Catálogo */}
            <button
              type="button"
              disabled={!canAccess('products')}
              onClick={() => canAccess('products') && setActiveTab('products')}
              title={canAccess('products') ? 'Catálogo' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('products')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'products'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Tag className="w-3 h-3 shrink-0" />
              <span>Catálogo</span>
              {!canAccess('products') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </button>

            {/* Pessoas */}
            <button
              type="button"
              disabled={!canAccess('clients')}
              onClick={() => canAccess('clients') && setActiveTab('clients')}
              title={canAccess('clients') ? 'Pessoas (Clientes e Equipe)' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('clients')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'clients'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>Pessoas</span>
              {!canAccess('clients') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </button>

            {/* Estoque */}
            <button
              type="button"
              disabled={!canAccess('stock')}
              onClick={() => canAccess('stock') && setActiveTab('stock')}
              title={canAccess('stock') ? 'Estoque' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('stock')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'stock'
                  ? 'bg-sky-500 text-white font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Flame className="w-3 h-3 shrink-0" />
              <span>Estoque</span>
              {!canAccess('stock') ? (
                <Lock className="w-2.5 h-2.5 text-slate-500" />
              ) : (
                lowStockCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                    {lowStockCount}
                  </span>
                )
              )}
            </button>

            {/* Produção */}
            <button
              type="button"
              disabled={!canAccess('production')}
              onClick={() => canAccess('production') && setActiveTab('production')}
              title={canAccess('production') ? 'Produção' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('production')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'production'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <Factory className="w-3 h-3 shrink-0" />
              <span>Produção</span>
              {!canAccess('production') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
            </button>

            {/* Vendas */}
            <button
              type="button"
              disabled={!canAccess('sales')}
              onClick={() => canAccess('sales') && setActiveTab('sales')}
              title={canAccess('sales') ? 'Vendas' : 'Módulo restrito'}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                !canAccess('sales')
                  ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
                  : activeTab === 'sales'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 bg-white/[0.03]'
              }`}
            >
              <ShoppingBag className="w-3 h-3 shrink-0" />
              <span>Vendas</span>
              {!canAccess('sales') && <Lock className="w-2.5 h-2.5 text-slate-500" />}
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
        ) : !canAccess(activeTab) ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100">Módulo Restrito</h2>
              <p className="text-xs text-slate-400">
                O administrador da sua empresa não habilitou permissão para seu usuário acessar esta funcionalidade.
              </p>
            </div>
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 text-left space-y-1">
              <p><strong className="text-slate-400">Usuário:</strong> {currentUser?.name || 'Operador'} ({currentUser?.email})</p>
              <p><strong className="text-slate-400">Empresa:</strong> {currentCompany?.name || 'Oficina'}</p>
              <p><strong className="text-slate-400">Cargo:</strong> {currentUser?.role}</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'analyzer' && (
              <ModelAnalyzerView
                printers={printers}
                filaments={filaments}
                settings={settings}
                theme={companyTheme}
                onNavigateToCalculator={(params) => {
                  setCalculatorInitialParams(params);
                  setActiveTab('calculator');
                }}
                onNavigateToPlateEditor={(params) => {
                  setPlatesInitialObject(params.modelObject);
                  setPlatesInitialResult(params.parsedModel);
                  setActiveTab('plates');
                }}
              />
            )}

            {activeTab === 'plates' && (
              <PlateEditorView
                printers={printers}
                filaments={filaments}
                products={products}
                settings={settings}
                theme={companyTheme}
                initialObject3D={platesInitialObject}
                initialModelResult={platesInitialResult}
                onRefreshProducts={fetchData}
                onNavigateToCalculator={(params) => {
                  setCalculatorInitialParams(params);
                  setActiveTab('calculator');
                }}
                onNavigateToProducts={() => setActiveTab('products')}
              />
            )}

            <div className={activeTab === 'calculator' ? 'block' : 'hidden'}>
              <CostCalculatorView
                printers={printers}
                filaments={filaments}
                supplies={supplies}
                settings={settings}
                onRefreshData={fetchData}
                onNavigateToStock={() => setActiveTab('stock')}
                theme={companyTheme}
                initialParams={calculatorInitialParams}
              />
            </div>

            {activeTab === 'stock' && (
              <StockManagementView
                filaments={filaments}
                supplies={supplies}
                products={products}
                sales={sales}
                productionOrders={productionOrders}
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
                onOpenInPlateEditor={() => setActiveTab('plates')}
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
                printJobs={printJobs}
                onRefreshData={fetchData}
                preselectedSaleForOP={preselectedSaleForOP}
                onClearPreselectedSale={() => setPreselectedSaleForOP(null)}
                theme={companyTheme}
              />
            )}

            {activeTab === 'sales' && (
              <SalesManagementView
                sales={sales}
                products={products}
                onOpenNewSaleModal={(defaultMode = 'direct') => {
                  setSelectedProductForSale(undefined);
                  setSaleModalDefaultMode(defaultMode);
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

            {activeTab === 'clients' && (
              <ClientsView
                clients={clients}
                onRefreshData={fetchData}
                theme={companyTheme}
                currentUser={currentUser}
                currentCompany={currentCompany}
                isSuperadmin={isSuperadmin}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSaveSettings={(newSet) => setSettings(newSet)}
                currentTheme={companyTheme}
                onChangeTheme={handleCompanyThemeChange}
                onRefreshData={fetchData}
                products={products}
                sales={sales}
                onNavigateToSales={() => setActiveTab('sales')}
                initialSubTab={settingsSubTab}
                printers={printers}
                isCompanyAdmin={currentUser?.role === 'admin' || isSuperadmin || currentUser?.role === 'superadmin'}
                companyName={currentCompany?.trade_name || currentCompany?.name}
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
        defaultSaleMode={saleModalDefaultMode}
        onClose={() => {
          setIsSaleModalOpen(false);
          setSelectedProductForSale(undefined);
        }}
        onSaleSuccess={() => {
          fetchData();
        }}
        onRefreshData={fetchData}
      />

      {/* PrintCraft Authentication & Registration Modal */}
      <ProductAuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onClose={() => {
          if (currentUser) setIsAuthModalOpen(false);
        }}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSuperadminConsole={navigateToAdmin}
      />

      {/* Company Team Management Modal */}
      {currentCompany && (
        <CompanyTeamModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          companyId={currentCompany.id}
          companyName={currentCompany.name}
          isSuperadmin={isSuperadmin}
        />
      )}
    </div>
  );
}
