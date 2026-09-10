import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Save,
  ShieldCheck,
  RotateCcw,
  Server,
  FileJson,
  Shield,
  History,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  HardDrive,
  Cloud,
  Zap,
  Play,
  Plus
} from 'lucide-react';
import { MultiDbProfilesCatalog } from './database/MultiDbProfilesCatalog';
import { TenantSqliteDatabases } from './database/TenantSqliteDatabases';
import { DatabaseConfigModal } from './database/DatabaseConfigModal';
import { AutoProvisionModal } from './database/AutoProvisionModal';
import {
  DatabaseProfile,
  EngineMetadata,
  TenantSqliteInfo,
  DbOverviewData
} from './database/types';
import { AppTheme } from '../../types';

interface DbStats {
  dbPath?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  file_size_formatted?: string;
  lastModified?: string | null;
  counts?: Record<string, number>;
  table_counts?: Record<string, number>;
  isCustomPath?: boolean;
  available_snapshots?: Array<{
    filename: string;
    size_formatted: string;
    created_at: string;
  }>;
}

interface AdminBackupTabProps {
  onRefreshAllData?: () => void;
  currentTheme?: AppTheme;
}

type SubNavTab = 'players' | 'tenants' | 'snapshots';

export const AdminBackupTab: React.FC<AdminBackupTabProps> = ({ onRefreshAllData, currentTheme }) => {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<SubNavTab>('players');

  // Backup & Restore operations
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Database stats & overview state
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [overviewData, setOverviewData] = useState<DbOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<DatabaseProfile | null>(null);
  const [initialEngineToConfig, setInitialEngineToConfig] = useState<string | undefined>();
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [profileToProvision, setProfileToProvision] = useState<DatabaseProfile | null>(null);

  // Action loading states
  const [isTestingId, setIsTestingId] = useState<string | null>(null);
  const [isActivatingId, setIsActivatingId] = useState<string | null>(null);
  const [isSyncingTenants, setIsSyncingTenants] = useState(false);

  // Fetch both stats and multi-db overview
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, overviewRes] = await Promise.all([
        fetch('/api/backup/stats'),
        fetch('/api/admin/database/overview')
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setDbStats(stats);
      }
      if (overviewRes.ok) {
        const overview = await overviewRes.json();
        setOverviewData(overview);
      }
    } catch (err) {
      console.error('Falha ao obter dados de persistência e bancos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for Database Profiles
  const handleOpenConfig = (profile?: DatabaseProfile, initialEngine?: string) => {
    setProfileToEdit(profile || null);
    setInitialEngineToConfig(initialEngine);
    setIsConfigModalOpen(true);
  };

  const handleOpenProvision = (profile?: DatabaseProfile) => {
    setProfileToProvision(profile || overviewData?.activeProfile || null);
    setIsProvisionModalOpen(true);
  };

  const handleSaveProfile = async (profileData: Partial<DatabaseProfile>) => {
    const res = await fetch('/api/admin/database/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar perfil de conexão');

    setFeedbackMsg({
      type: 'success',
      text: `Perfil de conexão ${data.name} salvo com sucesso!`
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
    fetchData();
  };

  const handleDeleteProfile = async (profile: DatabaseProfile) => {
    if (!confirm(`Tem certeza que deseja remover o perfil "${profile.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/database/profiles/${profile.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir perfil');

      setFeedbackMsg({
        type: 'success',
        text: `Perfil ${profile.name} excluído com sucesso.`
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleActivateProfile = async (profile: DatabaseProfile) => {
    setIsActivatingId(profile.id);
    try {
      const res = await fetch(`/api/admin/database/profiles/${profile.id}/activate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao ativar perfil');

      setFeedbackMsg({
        type: 'success',
        text: data.message || `Motor ${profile.name} ativado como banco principal!`
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
      fetchData();
      if (onRefreshAllData) onRefreshAllData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsActivatingId(null);
    }
  };

  const handleTestConnection = async (profile: DatabaseProfile) => {
    setIsTestingId(profile.id);
    try {
      const res = await fetch('/api/admin/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: profile.engine,
          host: profile.host,
          port: profile.port,
          database_name: profile.database_name,
          username: profile.username,
          ssl_mode: profile.ssl_mode,
          profile_id: profile.id
        })
      });
      const data = await res.json();
      setFeedbackMsg({
        type: data.success ? 'success' : 'error',
        text: `Teste em ${profile.name}: ${data.message} ${data.latency_ms ? `(${data.latency_ms}ms)` : ''}`
      });
      setTimeout(() => setFeedbackMsg(null), 6000);
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro no teste: ' + err.message });
    } finally {
      setIsTestingId(null);
    }
  };

  const handleSyncTenants = async () => {
    setIsSyncingTenants(true);
    try {
      const res = await fetch('/api/admin/database/tenants/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao sincronizar');

      setFeedbackMsg({
        type: 'success',
        text: data.message || 'Bancos SQLite dedicados sincronizados com sucesso!'
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsSyncingTenants(false);
    }
  };

  // Traditional Snapshot & Export Handlers
  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/backup/create-snapshot', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({
          type: 'success',
          text: data.message || 'Snapshot de segurança salvo com sucesso na pasta backups/ do servidor!'
        });
        fetchData();
        setTimeout(() => setFeedbackMsg(null), 5000);
      } else {
        throw new Error(data.error || 'Falha ao criar snapshot');
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao gerar snapshot: ' + err.message });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDownloadSqlite = () => {
    window.location.href = '/api/backup/sqlite-file';
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Falha ao gerar arquivo de exportação JSON');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `printcraft3d_full_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedbackMsg({ type: 'success', text: 'Backup completo em JSON exportado com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao exportar backup: ' + err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: A restauração a partir do arquivo JSON atualizará os registros das empresas, usuários, catálogo e configurações. Deseja prosseguir com a restauração?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setFeedbackMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao restaurar dados no servidor');
      }

      setFeedbackMsg({
        type: 'success',
        text: 'Dados restaurados com sucesso no banco de dados SQLite!'
      });
      fetchData();
      if (onRefreshAllData) onRefreshAllData();
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao importar arquivo: ' + err.message });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const counts = dbStats?.table_counts || dbStats?.counts || {};

  return (
    <div className="space-y-6">
      {/* Super Admin Privileged Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-amber-300 block">Área Restrita ao Super Administrador</span>
            <span className="text-slate-400 block text-[11px] mt-0.5">
              Gestão de múltiplos motores relacionais (On-Premise, Nuvem e SQLite padrão por CNPJ/CPF), provisionamento e snapshots.
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase font-bold shrink-0 self-start sm:self-center">
          Superadmin Nível Root
        </span>
      </div>

      {/* Feedback Message Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121215] border border-white/[0.08] p-2 rounded-2xl admin-card admin-subnav-bar">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('players')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 admin-tab-btn ${
              activeSubTab === 'players'
                ? 'admin-tab-active bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Bancos & Players de Mercado
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tenants')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 admin-tab-btn ${
              activeSubTab === 'tenants'
                ? 'admin-tab-active bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Bancos SQLite por CNPJ/CPF ({overviewData?.tenantsCount || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('snapshots')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 admin-tab-btn ${
              activeSubTab === 'snapshots'
                ? 'admin-tab-active bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Snapshots & Inventário Local
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => handleOpenProvision()}
            className="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Provisionar Tabelas / Exportar SQL
          </button>

          <button
            type="button"
            onClick={() => handleOpenConfig()}
            className="admin-btn-primary px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Conexão
          </button>
        </div>
      </div>

      {/* Sub-Tab Views */}
      {activeSubTab === 'players' && (
        <MultiDbProfilesCatalog
          profiles={overviewData?.profiles || []}
          engines={overviewData?.supportedEngines || []}
          activeProfile={overviewData?.activeProfile || null}
          onSelectConfigure={handleOpenConfig}
          onActivateProfile={handleActivateProfile}
          onDeleteProfile={handleDeleteProfile}
          onTestConnection={handleTestConnection}
          onOpenProvisionWizard={handleOpenProvision}
          isTestingId={isTestingId}
          isActivatingId={isActivatingId}
          onRefresh={fetchData}
          currentTheme={currentTheme}
        />
      )}

      {activeSubTab === 'tenants' && (
        <TenantSqliteDatabases
          tenants={overviewData?.tenants || []}
          totalBytesFormatted={overviewData?.totalTenantsFormatted || '0 KB'}
          onSyncTenants={handleSyncTenants}
          isSyncing={isSyncingTenants}
          currentTheme={currentTheme}
        />
      )}

      {activeSubTab === 'snapshots' && (
        <div className="space-y-6">
          {/* Primary Actions: SQLite vs JSON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Snapshots & Arquivo Binário SQLite */}
            <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  Snapshots & Banco SQLite Mestre Binário
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Operações de baixo nível diretamente no arquivo mestre do banco relacional
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  disabled={isCreatingSnapshot}
                  className="w-full p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] hover:border-emerald-500/50 text-left transition cursor-pointer group admin-inner-box"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                        <Save className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {isCreatingSnapshot ? 'Gravando Snapshot...' : 'Criar Snapshot de Segurança Imediato'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Gera uma cópia pontual com data/hora dentro da pasta <code className="text-emerald-400">backups/</code>
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSqlite}
                  className="w-full p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-left transition cursor-pointer group admin-inner-box"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Baixar Arquivo SQLite Mestre (.sqlite)
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Download do arquivo binário real para abrir no DBeaver, SQLiteStudio ou backup frio
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>
              </div>
            </div>

            {/* Card: Exportação e Importação JSON */}
            <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-amber-400" />
                  Portabilidade & Restauração JSON
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Backup legível e universal para migração entre servidores e ambientes
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="w-full p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] hover:border-amber-500/50 text-left transition cursor-pointer group admin-inner-box"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {isExporting ? 'Exportando dados...' : 'Exportar Backup JSON Completo'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Inclui empresas, usuários, produtos, impressoras, ordens, clientes e planos
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] hover:border-emerald-500/50 text-left transition cursor-pointer group admin-inner-box"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {isImporting ? 'Restaurando banco...' : 'Restaurar a partir de Arquivo JSON'}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Importa e sincroniza registros a partir de um backup exportado
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </div>
          </div>

          {/* Database Metrics and Table Record Counts */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Inventário de Tabelas do Banco SQLite
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contagem atualizada de registros persistidos no disco local
                </p>
              </div>
              {dbStats && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                  Tamanho: {dbStats.file_size_formatted || dbStats.fileSizeFormatted || '0 KB'}
                </span>
              )}
            </div>

            {dbStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Empresas</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.companies ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Usuários</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.app_users ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Planos</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.subscription_plans ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Produtos</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.products ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Impressoras</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.printers ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Filamentos</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.filaments ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Ordens PCP</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.production_orders ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Vendas</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.product_sales ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Clientes</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.clients ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Categorias</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.categories ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Transportadoras</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.carriers ?? 0}</span>
                  </div>
                  <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] text-center admin-inner-box">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Logs Acesso</span>
                    <span className="text-lg font-bold text-white mt-1 block">{counts.app_access_logs ?? 0}</span>
                  </div>
                </div>

                {/* Snapshots Recentes em Disco */}
                {dbStats.available_snapshots && dbStats.available_snapshots.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-sky-400" />
                      Snapshots Recentes em Disco ({dbStats.available_snapshots.length}):
                    </h4>
                    <div className="divide-y divide-white/[0.06] rounded-2xl bg-[#0A0A0B] border border-white/[0.06] overflow-hidden admin-inner-box">
                      {dbStats.available_snapshots.map((snap) => (
                        <div key={snap.filename} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02] transition">
                          <div className="flex items-center gap-2.5">
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-mono text-slate-200">{snap.filename}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-[11px] font-mono">{snap.size_formatted}</span>
                            <span className="text-slate-500 text-[10px]">
                              {new Date(snap.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                {isLoading ? 'Carregando estatísticas do banco de dados SQLite...' : 'Nenhum dado disponível no momento.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      <DatabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaveProfile={handleSaveProfile}
        engines={overviewData?.supportedEngines || []}
        profileToEdit={profileToEdit}
        initialEngine={initialEngineToConfig}
        currentTheme={currentTheme}
      />

      {/* Auto-Provisioning & SQL Export Modal */}
      <AutoProvisionModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        selectedProfile={profileToProvision}
        profiles={overviewData?.profiles || []}
        currentTheme={currentTheme}
      />
    </div>
  );
};
