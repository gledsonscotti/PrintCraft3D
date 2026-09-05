import React, { useState, useRef, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  DollarSign,
  Zap,
  Clock,
  Percent,
  CheckCircle2,
  Globe,
  Database,
  Download,
  Upload,
  Sun,
  Moon,
  Sparkles,
  Leaf,
  Layers,
  Save,
  Store,
  ShieldCheck,
  RotateCcw,
  Printer as PrinterIcon
} from 'lucide-react';
import { AppSettings, AppTheme, Product, ProductSale, Printer } from '../types';
import { IntegrationsView } from './IntegrationsView';
import { PrintersView } from './PrintersView';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  currentTheme: AppTheme;
  onChangeTheme: (theme: AppTheme) => void;
  onRefreshData: () => void;
  products: Product[];
  sales: ProductSale[];
  onNavigateToSales: () => void;
  initialSubTab?: 'costs' | 'printers' | 'integrations';
  printers?: Printer[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  currentTheme,
  onChangeTheme,
  onRefreshData,
  products,
  sales,
  onNavigateToSales,
  initialSubTab = 'costs',
  printers = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'printers' | 'integrations'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Form states for Cost Settings
  const [energyKwhRate, setEnergyKwhRate] = useState<number>(settings.energy_kwh_rate || 0.85);
  const [hourlyLaborRate, setHourlyLaborRate] = useState<number>(settings.hourly_labor_rate || 35);
  const [defaultLossMargin, setDefaultLossMargin] = useState<number>(settings.default_loss_margin || 10);
  const [defaultInfill, setDefaultInfill] = useState<number>(settings.default_infill || 20);
  const [defaultLayerHeight, setDefaultLayerHeight] = useState<number>(settings.default_layer_height || 0.2);
  const [currency, setCurrency] = useState<string>(settings.currency || 'BRL');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Backup & Restore states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if settings prop changes
  useEffect(() => {
    setEnergyKwhRate(settings.energy_kwh_rate);
    setHourlyLaborRate(settings.hourly_labor_rate);
    setDefaultLossMargin(settings.default_loss_margin);
    setDefaultInfill(settings.default_infill || 20);
    setDefaultLayerHeight(settings.default_layer_height || 0.2);
    setCurrency(settings.currency || 'BRL');
  }, [settings]);

  const handleSaveCosts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const updated: AppSettings = {
        energy_kwh_rate: Number(energyKwhRate),
        currency,
        default_loss_margin: Number(defaultLossMargin),
        hourly_labor_rate: Number(hourlyLaborRate),
        default_infill: Number(defaultInfill),
        default_layer_height: Number(defaultLayerHeight),
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        throw new Error('Falha ao gravar configurações no banco SQLite');
      }

      onSaveSettings(updated);
      setSaveSuccessMsg('Configurações globais salvas no banco de dados SQLite com sucesso!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupMsg(null);
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Falha ao gerar arquivo de exportação');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `printcraft3d_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupMsg({ type: 'success', text: 'Backup exportado com sucesso!' });
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (err: any) {
      setBackupMsg({ type: 'error', text: 'Erro ao exportar backup: ' + err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBackupMsg(null);
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

      setBackupMsg({ type: 'success', text: 'Dados restaurados com sucesso!' });
      onRefreshData();
      setTimeout(() => setBackupMsg(null), 4000);
    } catch (err: any) {
      setBackupMsg({ type: 'error', text: 'Erro ao importar arquivo: ' + err.message });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja redefinir os parâmetros de custos para os valores padrão de mercado?')) {
      setEnergyKwhRate(0.85);
      setHourlyLaborRate(35);
      setDefaultLossMargin(10);
      setDefaultInfill(20);
      setDefaultLayerHeight(0.2);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Sub-tabs Navigation */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <SettingsIcon className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Ajustes do Sistema
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Parâmetros operacionais de cálculo, temas de alto contraste e integrações de marketplaces
              </p>
            </div>
          </div>

          {/* Clean Segmented Control Tabs */}
          <div className="flex items-center p-1 bg-[#0A0A0B] rounded-2xl border border-white/[0.08] shrink-0">
            <button
              type="button"
              id="tab-btn-global-costs"
              onClick={() => setActiveSubTab('costs')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'costs'
                  ? 'bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurações Globais de Custos</span>
            </button>

            <button
              type="button"
              id="tab-btn-printers"
              onClick={() => setActiveSubTab('printers')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'printers'
                  ? 'bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Impressoras</span>
              {printers.length > 0 && (
                <span className="text-[10px] opacity-75 font-mono">({printers.length})</span>
              )}
            </button>

            <button
              type="button"
              id="tab-btn-integrations"
              onClick={() => setActiveSubTab('integrations')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'integrations'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Integrações</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: Configurações Globais de Custos */}
      {activeSubTab === 'costs' && (
        <div className="space-y-6">
          {saveSuccessMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Parâmetros Operacionais de Custos (8 cols) */}
            <div className="lg:col-span-8 bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Parâmetros Operacionais de Custos
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Esses valores alimentam automaticamente o motor de cálculo de G-code e STL
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-1.5 rounded-xl bg-[#1A1A20] hover:bg-[#22222A] text-slate-400 hover:text-white text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition cursor-pointer"
                  title="Restaurar valores de mercado recomendados"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Padrões</span>
                </button>
              </div>

              <form onSubmit={handleSaveCosts} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarifa de Energia */}
                  <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Tarifa de Energia (R$ / kWh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      required
                      value={energyKwhRate}
                      onChange={(e) => setEnergyKwhRate(Number(e.target.value))}
                      className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                    />
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Média no Brasil entre R$ 0,75 e R$ 1,15 / kWh. Multiplica o consumo em Watts da impressora.
                    </p>
                  </div>

                  {/* Valor da Hora de Trabalho */}
                  <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      Mão de Obra / Hora (R$ / h)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={hourlyLaborRate}
                      onChange={(e) => setHourlyLaborRate(Number(e.target.value))}
                      className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                    />
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Custo do tempo do operador para fatiamento, nivelamento, troca de carretel e pós-processamento.
                    </p>
                  </div>

                  {/* Margem de Perda / Falhas */}
                  <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-rose-400" />
                      Margem Padrão de Falha / Perda (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={defaultLossMargin}
                      onChange={(e) => setDefaultLossMargin(Number(e.target.value))}
                      className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                    />
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Fator de segurança aplicado ao filamento para compensar purgas, brim, suportes e impressões perdidas.
                    </p>
                  </div>

                  {/* Moeda e Parâmetros de Fatiamento */}
                  <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Infill Padrão (%) & Camada (mm)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Preenchimento</span>
                        <input
                          type="number"
                          step="5"
                          min="5"
                          max="100"
                          value={defaultInfill}
                          onChange={(e) => setDefaultInfill(Number(e.target.value))}
                          className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Altura Camada</span>
                        <input
                          type="number"
                          step="0.04"
                          min="0.08"
                          max="0.4"
                          value={defaultLayerHeight}
                          onChange={(e) => setDefaultLayerHeight(Number(e.target.value))}
                          className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Sugestão padrão ao orçar novos modelos na calculadora sem G-code importado.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Persistido com sincronização no SQLite
                  </span>
                  <button
                    type="submit"
                    id="btn-save-cost-settings"
                    disabled={isSaving}
                    className="bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-6 py-2.5 rounded-2xl shadow-sm shadow-sky-500/25 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações Globais'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Tema da Oficina & Backup (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Tema de Alto Contraste para Chão de Oficina */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 shadow-sm space-y-4">
                <div className="border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Modo de Contraste da Oficina
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ajuste o visual para iluminação forte, poeira ou ambientes escuros
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeTheme('standard')}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      currentTheme === 'standard'
                        ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-1 ring-sky-400'
                        : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Moon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Dark Studio</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 leading-tight">Padrão Escuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTheme('sage-bento')}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer relative ${
                      currentTheme === 'sage-bento'
                        ? 'bg-emerald-900/30 border-emerald-400 text-emerald-300 font-bold ring-2 ring-emerald-400/80'
                        : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">Sage Bento</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 block mt-1 leading-tight">Verde Sálvia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTheme('high-contrast-light')}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      currentTheme === 'high-contrast-light'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-2 ring-amber-400'
                        : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Oficina Clara</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 leading-tight">Anti-reflexo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTheme('high-contrast-dark')}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      currentTheme === 'high-contrast-dark'
                        ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-1 ring-sky-400'
                        : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Preto Puro</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 leading-tight">Linhas OLED</span>
                  </button>
                </div>
              </div>

              {/* Persistência & Backup do SQLite */}
              <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      Backup & Dados
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Segurança e portabilidade da oficina
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    SQLite Ativo
                  </span>
                </div>

                {backupMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      backupMsg.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{backupMsg.text}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Gere um arquivo JSON com todos os dados: impressoras, filamentos, estoque, catálogo, ordens de produção e vendas registradas.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={isExporting}
                    className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/40 text-slate-200 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    {isExporting ? 'Exportando...' : 'Exportar JSON'}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/[0.08] hover:border-emerald-500/40 text-slate-200 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    {isImporting ? 'Restaurando...' : 'Importar JSON'}
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
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Impressoras */}
      {activeSubTab === 'printers' && (
        <div className="space-y-4">
          <PrintersView
            printers={printers}
            onRefreshData={onRefreshData}
          />
        </div>
      )}

      {/* SUB-TAB 3: Integrações */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-4">
          <IntegrationsView
            products={products}
            sales={sales}
            onRefreshAllData={onRefreshData}
            onNavigateToSales={onNavigateToSales}
          />
        </div>
      )}
    </div>
  );
};
