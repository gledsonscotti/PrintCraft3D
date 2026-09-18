import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  DollarSign,
  Zap,
  Clock,
  Percent,
  CheckCircle2,
  Globe,
  Sun,
  Moon,
  Sparkles,
  Leaf,
  Save,
  Store,
  RotateCcw,
  Printer as PrinterIcon,
  Truck,
  FolderTree,
  RefreshCw,
  Info,
  Package,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Mail,
  Calculator,
  TrendingUp,
  Coins,
  Building2
} from 'lucide-react';
import { AppSettings, AppTheme, Product, ProductSale, Printer } from '../types';
import { IntegrationsView } from './IntegrationsView';
import { PrintersView } from './PrintersView';
import { CarriersView } from './CarriersView';
import { CategoriesView } from './CategoriesView';
import { DispatchSettingsView } from './DispatchSettingsView';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  currentTheme: AppTheme;
  onChangeTheme: (theme: AppTheme) => void;
  onRefreshData: () => void;
  products: Product[];
  sales: ProductSale[];
  onNavigateToSales: () => void;
  initialSubTab?: 'costs' | 'printers' | 'carriers' | 'categories' | 'integrations' | 'smtp_whatsapp';
  printers?: Printer[];
  isCompanyAdmin?: boolean;
  companyName?: string;
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
  isCompanyAdmin = true,
  companyName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'printers' | 'carriers' | 'categories' | 'integrations' | 'smtp_whatsapp'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Form states for Cost Settings
  const [energyKwhRate, setEnergyKwhRate] = useState<number>(settings.energy_kwh_rate || 0.85);
  const [hourlyLaborRate, setHourlyLaborRate] = useState<number>(settings.hourly_labor_rate || 20);
  const [defaultLossMargin, setDefaultLossMargin] = useState<number>(settings.default_loss_margin || 10);
  const [defaultInfill, setDefaultInfill] = useState<number>(settings.default_infill || 20);
  const [defaultLayerHeight, setDefaultLayerHeight] = useState<number>(settings.default_layer_height || 0.2);
  const [currency, setCurrency] = useState<string>(settings.currency || 'BRL');

  // Form states for Financial Settings (Unificado de Finanças)
  const [markupDefault, setMarkupDefault] = useState<number>(settings.markup_default ?? 100);
  const [targetMargin, setTargetMargin] = useState<number>(settings.target_margin ?? 40);
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState<number>(settings.monthly_fixed_costs ?? 500);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync state if settings prop changes
  useEffect(() => {
    setEnergyKwhRate(settings.energy_kwh_rate);
    setHourlyLaborRate(settings.hourly_labor_rate || 20);
    setDefaultLossMargin(settings.default_loss_margin);
    setDefaultInfill(settings.default_infill || 20);
    setDefaultLayerHeight(settings.default_layer_height || 0.2);
    setCurrency(settings.currency || 'BRL');
    setMarkupDefault(settings.markup_default ?? 100);
    setTargetMargin(settings.target_margin ?? 40);
    setMonthlyFixedCosts(settings.monthly_fixed_costs ?? 500);
  }, [settings]);

  const handleSaveCosts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const updated: AppSettings = {
        ...settings,
        energy_kwh_rate: Number(energyKwhRate),
        currency,
        default_loss_margin: Number(defaultLossMargin),
        hourly_labor_rate: Number(hourlyLaborRate),
        default_infill: Number(defaultInfill),
        default_layer_height: Number(defaultLayerHeight),
        markup_default: Number(markupDefault),
        target_margin: Number(targetMargin),
        monthly_fixed_costs: Number(monthlyFixedCosts),
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
      setSaveSuccessMsg('Parâmetros operacionais e financeiros sincronizados no SQLite com sucesso!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja redefinir os parâmetros operacionais para os valores padrão de mercado?')) {
      setEnergyKwhRate(0.85);
      setHourlyLaborRate(20);
      setDefaultLossMargin(10);
      setDefaultInfill(20);
      setDefaultLayerHeight(0.2);
    }
  };

  const handleResetFinancialDefaults = () => {
    if (confirm('Deseja redefinir os parâmetros financeiros para os valores padrão de precificação?')) {
      setMarkupDefault(100);
      setTargetMargin(40);
      setMonthlyFixedCosts(500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Sub-tabs Navigation */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Linha 1: Ajustes do Sistema e Descrição em uma linha */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <SettingsIcon className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white tracking-tight whitespace-nowrap">
              Ajustes do Sistema
            </h1>
            <span className="hidden sm:inline text-slate-500 text-xs">•</span>
            <p className="text-xs text-slate-400">
              Parâmetros operacionais de cálculo, temas de alto contraste e integrações de marketplaces
            </p>
          </div>
        </div>

        {/* Linha 2: Menus de Ajustes do Sistema na próxima linha */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center w-full max-w-full overflow-hidden">
          <div className="settings-subtabs-container flex flex-nowrap items-center gap-1 sm:gap-1.5 p-1 bg-[#0A0A0B] rounded-2xl border border-white/[0.08] shadow-sm overflow-x-auto max-w-full no-scrollbar shrink-0">
            <button
              type="button"
              id="tab-btn-global-costs"
              onClick={() => setActiveSubTab('costs')}
              className={`settings-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'costs'
                  ? 'settings-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurações Globais</span>
            </button>

            <button
              type="button"
              id="tab-btn-printers"
              onClick={() => setActiveSubTab('printers')}
              className={`settings-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'printers'
                  ? 'settings-subtab-active bg-sky-500 text-white shadow-sm font-bold'
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
              id="tab-btn-carriers"
              onClick={() => setActiveSubTab('carriers')}
              className={`settings-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'carriers'
                  ? 'settings-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Transportadoras</span>
            </button>

            <button
              type="button"
              id="tab-btn-categories"
              onClick={() => setActiveSubTab('categories')}
              className={`settings-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'categories'
                  ? 'settings-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Categorias & Subcategorias</span>
            </button>

            <button
              type="button"
              id="tab-btn-integrations"
              onClick={() => setActiveSubTab('integrations')}
              className={`settings-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'integrations'
                  ? 'settings-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Integrações</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              type="button"
              id="tab-btn-smtp-whatsapp"
              onClick={() => setActiveSubTab('smtp_whatsapp')}
              className={`settings-subtab-btn px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === 'smtp_whatsapp'
                  ? 'settings-subtab-active bg-sky-500 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Configurar SMTP & WhatsApp</span>
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

          {/* Card 1: Parâmetros Operacionais de Custos */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-6">
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
                  className="integration-btn-secondary px-3 py-1.5 rounded-xl bg-[#1A1A20] hover:bg-[#22222A] text-slate-400 hover:text-white text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition cursor-pointer"
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
                    className="integration-btn-primary bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-6 py-2.5 rounded-2xl shadow-sm shadow-sky-500/25 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações Operacionais'}</span>
                  </button>
                </div>
              </form>
            </div>

          {/* Card 2: Parâmetros Financeiros (Unificado com Finanças) */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Parâmetros Financeiros
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Defina os índices padrão para cálculo automático de custos de impressão 3D, margens de lucro e despesas fixas
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFinancialDefaults}
                className="integration-btn-secondary px-3 py-1.5 rounded-xl bg-[#1A1A20] hover:bg-[#22222A] text-slate-400 hover:text-white text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition cursor-pointer"
                title="Restaurar parâmetros financeiros recomendados"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Padrões</span>
              </button>
            </div>

            <form onSubmit={handleSaveCosts} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Markup Padrão (%) */}
                <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-400" />
                    Markup Padrão (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={markupDefault}
                    onChange={(e) => setMarkupDefault(Number(e.target.value))}
                    className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Multiplicador base sobre o custo total de produção.
                  </p>
                </div>

                {/* Margem de Lucro Alvo (%) */}
                <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-sky-400" />
                    Margem de Lucro Alvo (%)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    required
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Margem líquida desejada por peça impressa.
                  </p>
                </div>

                {/* Custos Fixos Mensais (R$) */}
                <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    Custos Fixos Mensais (R$)
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    required
                    value={monthlyFixedCosts}
                    onChange={(e) => setMonthlyFixedCosts(Number(e.target.value))}
                    className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Aluguel, internet, manutenções e taxas fixas.
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
                  id="btn-save-financial-settings"
                  disabled={isSaving}
                  className="integration-btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 py-2.5 rounded-2xl shadow-sm shadow-emerald-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Parâmetros Financeiros'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Modo de Contraste da Oficina (Logo abaixo de Parâmetros Financeiros) */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Modo de Contraste da Oficina (Tema da Empresa)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isCompanyAdmin
                    ? `Gerenciado pelo Administrador da Empresa${companyName ? ` (${companyName})` : ''}. Aplicado a todos os operadores.`
                    : `Tema definido pelo Administrador da Empresa${companyName ? ` (${companyName})` : ''}. Somente admins podem alterar.`}
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06] w-fit">
                Tema Ativo: <strong className="text-white capitalize">{currentTheme === 'sage-bento' ? 'Sage Bento' : currentTheme === 'high-contrast-light' ? 'Oficina Clara' : currentTheme === 'high-contrast-dark' ? 'Preto Puro' : 'Dark Studio'}</strong>
              </span>
            </div>

            {!isCompanyAdmin && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-2xl text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  O tema visual da oficina é definido pelo Administrador da Empresa. Seu usuário está visualizando a oficina com o tema oficial cadastrado pelo administrador.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                disabled={!isCompanyAdmin}
                onClick={() => onChangeTheme('standard')}
                className={`p-3.5 rounded-2xl text-left border transition ${!isCompanyAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${
                  currentTheme === 'standard'
                    ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-2 ring-sky-400'
                    : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Moon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold">Dark Studio</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1.5 leading-tight">Padrão Escuro Suave</span>
              </button>

              <button
                type="button"
                disabled={!isCompanyAdmin}
                onClick={() => onChangeTheme('sage-bento')}
                className={`p-3.5 rounded-2xl text-left border transition ${!isCompanyAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${
                  currentTheme === 'sage-bento'
                    ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300 font-bold ring-2 ring-emerald-400/80 shadow-sm shadow-emerald-500/20'
                    : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sage Bento</span>
                </div>
                <span className="text-[11px] text-emerald-400/80 block mt-1.5 leading-tight">Verde Sálvia Bento</span>
              </button>

              <button
                type="button"
                disabled={!isCompanyAdmin}
                onClick={() => onChangeTheme('high-contrast-light')}
                className={`p-3.5 rounded-2xl text-left border transition ${!isCompanyAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${
                  currentTheme === 'high-contrast-light'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-2 ring-amber-400'
                    : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Oficina Clara</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1.5 leading-tight">Anti-reflexo Chão de Fábrica</span>
              </button>

              <button
                type="button"
                disabled={!isCompanyAdmin}
                onClick={() => onChangeTheme('high-contrast-dark')}
                className={`p-3.5 rounded-2xl text-left border transition ${!isCompanyAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${
                  currentTheme === 'high-contrast-dark'
                    ? 'bg-sky-500/20 border-sky-400 text-white font-bold ring-2 ring-sky-400'
                    : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Preto Puro</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1.5 leading-tight">Linhas Alto Contraste OLED</span>
              </button>
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

      {/* SUB-TAB 3: Transportadoras */}
      {activeSubTab === 'carriers' && (
        <div className="space-y-4">
          <CarriersView
            onRefreshData={onRefreshData}
          />
        </div>
      )}

      {/* SUB-TAB: Categorias & Subcategorias */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <CategoriesView
            products={products}
            onRefreshData={onRefreshData}
          />
        </div>
      )}

      {/* SUB-TAB 4: Integrações */}
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

      {/* SUB-TAB 5: Configurar SMTP & WhatsApp */}
      {activeSubTab === 'smtp_whatsapp' && (
        <div className="space-y-4">
          <DispatchSettingsView
            onSettingsSaved={onRefreshData}
            defaultCompany={companyName}
          />
        </div>
      )}

    </div>
  );
};
