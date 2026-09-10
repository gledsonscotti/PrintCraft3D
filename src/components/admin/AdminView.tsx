import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Tag,
  BarChart3,
  Layers,
  Settings,
  LogOut,
  User,
  Sparkles,
  Sun,
  Moon,
  Leaf,
  Building2,
  Users,
  ShieldAlert,
  Database
} from 'lucide-react';
import { AdminUser, AppTheme } from '../../types';
import { AdminCompaniesTab } from './AdminCompaniesTab';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminPlansTab } from './AdminPlansTab';
import { AdminOverviewTab } from './AdminOverviewTab';
import { AdminFeaturesTab } from './AdminFeaturesTab';
import { AdminBackupTab } from './AdminBackupTab';
import { AdminAccessLogsTab } from './AdminAccessLogsTab';
import { AdminSettingsTab } from './AdminSettingsTab';

interface AdminViewProps {
  onLogout: () => void;
  currentTheme?: AppTheme;
  onChangeTheme?: (theme: AppTheme) => void;
  onRefreshData?: () => void;
}

type AdminTab = 'companies' | 'users' | 'plans' | 'overview' | 'features' | 'backup' | 'logs' | 'settings';

export const AdminView: React.FC<AdminViewProps> = ({
  onLogout,
  currentTheme = 'standard',
  onChangeTheme,
  onRefreshData
}) => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const savedAdminUser = localStorage.getItem('printcraft_admin_user');
      if (savedAdminUser) {
        return JSON.parse(savedAdminUser);
      }
      const savedAuthUser = localStorage.getItem('printcraft_auth_user');
      const isSuper = localStorage.getItem('printcraft_is_superadmin') === 'true';
      if (savedAuthUser && isSuper) {
        const parsed = JSON.parse(savedAuthUser);
        return {
          id: parsed.id,
          username: parsed.username || 'admin',
          name: parsed.name,
          email: parsed.email,
          role: 'superadmin',
        };
      }
    } catch {}
    return null;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('printcraft_admin_token') || localStorage.getItem('printcraft_auth_token') || null;
  });
  const [activeTab, setActiveTab] = useState<AdminTab>('companies');
  const [filterCompanyIdForUsers, setFilterCompanyIdForUsers] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Check saved session on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('printcraft_admin_token') || localStorage.getItem('printcraft_auth_token');
      const savedUser = localStorage.getItem('printcraft_admin_user') || localStorage.getItem('printcraft_auth_user');
      if (savedToken && savedUser) {
        setAuthToken(savedToken);
        const parsed = JSON.parse(savedUser);
        setCurrentUser({
          id: parsed.id,
          username: parsed.username || 'admin',
          name: parsed.name,
          email: parsed.email,
          role: 'superadmin',
        });
      }
    } catch (e) {
      console.error('Erro ao restaurar sessão admin:', e);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (user: AdminUser, token: string) => {
    setCurrentUser(user);
    setAuthToken(token);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('printcraft_admin_token');
      localStorage.removeItem('printcraft_admin_user');
      localStorage.removeItem('printcraft_auth_token');
      localStorage.removeItem('printcraft_auth_user');
      localStorage.removeItem('printcraft_auth_company');
      localStorage.removeItem('printcraft_is_superadmin');
    } catch {}
    setCurrentUser(null);
    setAuthToken(null);
    onLogout();
  };

  const handleSelectCompanyForUsers = (companyId: string) => {
    setFilterCompanyIdForUsers(companyId);
    setActiveTab('users');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not logged in as superadmin, redirect to default login / register screen
  if (!authToken || !currentUser) {
    onLogout();
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col font-sans select-none admin-view-container">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#101014]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between admin-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white tracking-tight">PrintCraft</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">
              Administração de Planos de Assinatura & Gating de Funcionalidades
            </p>
          </div>
        </div>

        {/* Right Header: Theme Switcher, Back to main app & Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Workshop Theme Switcher */}
          {onChangeTheme && (
            <button
              type="button"
              onClick={() => {
                const nextTheme: AppTheme =
                  currentTheme === 'standard'
                    ? 'sage-bento'
                    : currentTheme === 'sage-bento'
                    ? 'high-contrast-light'
                    : currentTheme === 'high-contrast-light'
                    ? 'high-contrast-dark'
                    : 'standard';
                onChangeTheme(nextTheme);
              }}
              title={`Tema Atual: ${
                currentTheme === 'sage-bento'
                  ? 'Sage Bento'
                  : currentTheme === 'high-contrast-light'
                  ? 'Oficina Clara (Alto Contraste)'
                  : currentTheme === 'high-contrast-dark'
                  ? 'Preto Puro (High Contrast Dark)'
                  : 'Dark Studio (Padrão)'
              }. Clique para alternar.`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
            >
              {currentTheme === 'sage-bento' && <Leaf className="w-3.5 h-3.5 text-emerald-600" />}
              {currentTheme === 'high-contrast-light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
              {currentTheme === 'high-contrast-dark' && <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
              {currentTheme === 'standard' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              <span className="hidden md:inline text-[11px]">
                {currentTheme === 'sage-bento'
                  ? 'Sage Bento'
                  : currentTheme === 'high-contrast-light'
                  ? 'Oficina Clara'
                  : currentTheme === 'high-contrast-dark'
                  ? 'Preto Puro'
                  : 'Dark Studio'}
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left text-[11px] leading-tight">
              <span className="font-bold text-white block">{currentUser.name}</span>
              <span className="text-slate-500 text-[10px] block">@{currentUser.username}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Encerrar sessão de administrador"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header with Admin Tabs - Optimized & Compact */}
      <div className="bg-[#0E0E12] border-b border-white/[0.06] px-3 sm:px-6 py-2 admin-subnav">
        <div className="flex items-center justify-between gap-2">
          {/* Primary Navigation Tabs (5 Compact Categories) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* 1. Empresas */}
            <button
              type="button"
              id="admin-tab-companies"
              onClick={() => setActiveTab('companies')}
              className={`admin-tab-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'companies'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 admin-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Empresas</span>
            </button>

            {/* 2. Usuários */}
            <button
              type="button"
              id="admin-tab-users"
              onClick={() => setActiveTab('users')}
              className={`admin-tab-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 admin-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Usuários</span>
            </button>

            {/* 3. Planos & Recursos (Consolidado) */}
            <button
              type="button"
              id="admin-tab-plans"
              onClick={() => setActiveTab(activeTab === 'features' ? 'features' : 'plans')}
              className={`admin-tab-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'plans' || activeTab === 'features'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 admin-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Planos & Recursos</span>
            </button>

            {/* 4. Métricas */}
            <button
              type="button"
              id="admin-tab-metrics"
              onClick={() => setActiveTab('overview')}
              className={`admin-tab-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 admin-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Métricas</span>
            </button>

            {/* 5. Sistema (Backup, Logs, Conta & Tema) */}
            <button
              type="button"
              id="admin-tab-system"
              onClick={() => {
                if (activeTab === 'backup' || activeTab === 'logs' || activeTab === 'settings') {
                  // Keep current sub-tab
                } else {
                  setActiveTab(currentUser.role === 'superadmin' ? 'backup' : 'logs');
                }
              }}
              className={`admin-tab-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'backup' || activeTab === 'logs' || activeTab === 'settings'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 admin-tab-active'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sistema</span>
              {currentUser.role === 'superadmin' && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900/30 text-slate-900 font-extrabold">
                  SUPER
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contextual Sub-Bar for "Planos & Recursos" */}
        {(activeTab === 'plans' || activeTab === 'features') && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">Submódulos:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className={`admin-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'plans'
                    ? 'bg-white/10 text-emerald-400 border border-emerald-500/30 font-bold admin-tab-active'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>Planos de Assinatura</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('features')}
                className={`admin-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'features'
                    ? 'bg-white/10 text-emerald-400 border border-emerald-500/30 font-bold admin-tab-active'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Gating de Recursos</span>
              </button>
            </div>
          </div>
        )}

        {/* Contextual Sub-Bar for "Sistema" */}
        {(activeTab === 'backup' || activeTab === 'logs' || activeTab === 'settings') && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04] overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">Ferramentas:</span>
            <div className="flex items-center gap-1">
              {currentUser.role === 'superadmin' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('backup')}
                  className={`admin-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'backup'
                      ? 'bg-white/10 text-emerald-400 border border-emerald-500/30 font-bold admin-tab-active'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>Backup & Dados SQLite</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    Super
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`admin-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'bg-white/10 text-emerald-400 border border-emerald-500/30 font-bold admin-tab-active'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Logs de Auditoria</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`admin-tab-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-white/10 text-emerald-400 border border-emerald-500/30 font-bold admin-tab-active'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="w-3 h-3" />
                <span>Conta & Tema do Admin</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'companies' && (
          <AdminCompaniesTab onSelectCompanyForUsers={handleSelectCompanyForUsers} />
        )}
        {activeTab === 'users' && (
          <AdminUsersTab
            filterCompanyId={filterCompanyIdForUsers}
            onClearCompanyFilter={() => setFilterCompanyIdForUsers(null)}
          />
        )}
        {activeTab === 'plans' && <AdminPlansTab />}
        {activeTab === 'overview' && <AdminOverviewTab />}
        {activeTab === 'features' && <AdminFeaturesTab />}
        {activeTab === 'backup' && currentUser.role === 'superadmin' && (
          <AdminBackupTab onRefreshAllData={onRefreshData} currentTheme={currentTheme} />
        )}
        {activeTab === 'logs' && <AdminAccessLogsTab />}
        {activeTab === 'settings' && (
          <AdminSettingsTab
            currentUser={currentUser}
            currentTheme={currentTheme}
            onChangeTheme={onChangeTheme}
          />
        )}
      </main>
    </div>
  );
};
