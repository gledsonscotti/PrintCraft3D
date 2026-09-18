import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Clock,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Wrench,
  Archive,
  ArrowRight,
  Info,
  Sliders,
  Check,
  Building,
  FileSpreadsheet,
  Zap,
  Tag,
  Scale,
  Sparkles,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  MachineAsset,
  AssetCategory,
  AssetStatus,
  DepreciationMethod,
  DepreciationSummary,
  DepreciationLog,
  Printer
} from '../types';

interface DepreciationControlViewProps {
  printers?: Printer[];
  onRefreshData?: () => void;
  theme?: string;
  onNavigateToPrinters?: () => void;
}

export function DepreciationControlView({
  printers = [],
  onRefreshData,
  theme = 'sage-bento',
  onNavigateToPrinters
}: DepreciationControlViewProps) {
  // State
  const [assets, setAssets] = useState<MachineAsset[]>([]);
  const [summary, setSummary] = useState<DepreciationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingPrinters, setSyncingPrinters] = useState<boolean>(false);
  const [importingPrinters, setImportingPrinters] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<MachineAsset | null>(null);

  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState<boolean>(false);
  const [selectedAssetForDisposal, setSelectedAssetForDisposal] = useState<MachineAsset | null>(null);

  const [isLogDepreciationModalOpen, setIsLogDepreciationModalOpen] = useState<boolean>(false);
  const [selectedAssetForLog, setSelectedAssetForLog] = useState<MachineAsset | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<MachineAsset | null>(null);
  const [assetHistoryLogs, setAssetHistoryLogs] = useState<DepreciationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  const [isHoursModalOpen, setIsHoursModalOpen] = useState<boolean>(false);
  const [selectedAssetForHours, setSelectedAssetForHours] = useState<MachineAsset | null>(null);
  const [newHoursValue, setNewHoursValue] = useState<number>(0);

  // Asset Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '3d_printer' as AssetCategory,
    printer_id: '',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier: '',
    invoice_number: '',
    acquisition_cost: 0,
    freight_and_installation: 0,
    residual_value: 0,
    depreciation_method: 'linear_time' as DepreciationMethod,
    useful_life_months: 36,
    useful_life_hours: 6000,
    accumulated_hours: 0,
    current_status: 'active' as AssetStatus,
    location: 'Oficina Principal',
    notes: '',
  });

  // Disposal Form State
  const [disposalForm, setDisposalForm] = useState({
    disposal_date: new Date().toISOString().split('T')[0],
    disposal_value: 0,
    disposal_reason: 'Venda de equipamento usado para renovação de frota',
    create_receivable: true
  });

  // Log Depreciation Form State
  const [logForm, setLogForm] = useState({
    period_month: new Date().toISOString().slice(0, 7),
    amount: 0,
    hours_in_period: 0,
    notes: 'Apropriação mensal de depreciação contábil',
    create_financial_provision: true
  });

  // Fetch all assets & summary
  const fetchAssetsAndSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assetsRes, sumRes] = await Promise.all([
        fetch('/api/machine-assets'),
        fetch('/api/machine-assets/summary')
      ]);

      if (!assetsRes.ok) throw new Error('Falha ao carregar ativos imobilizados');
      const assetsData = await assetsRes.json();
      setAssets(assetsData);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsAndSummary();
  }, []);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || asset.current_status === selectedStatus;
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        asset.name.toLowerCase().includes(term) ||
        asset.code.toLowerCase().includes(term) ||
        (asset.brand && asset.brand.toLowerCase().includes(term)) ||
        (asset.model && asset.model.toLowerCase().includes(term)) ||
        (asset.serial_number && asset.serial_number.toLowerCase().includes(term));
      return matchCategory && matchStatus && matchSearch;
    });
  }, [assets, selectedCategory, selectedStatus, search]);

  // Open Create Asset Modal
  const handleOpenCreateModal = () => {
    setEditingAsset(null);
    const count = assets.length + 1;
    setFormData({
      code: `PAT-${String(count).padStart(3, '0')}`,
      name: '',
      category: '3d_printer',
      printer_id: '',
      brand: '',
      model: '',
      serial_number: '',
      purchase_date: new Date().toISOString().split('T')[0],
      supplier: '',
      invoice_number: '',
      acquisition_cost: 3000,
      freight_and_installation: 150,
      residual_value: 600,
      depreciation_method: 'linear_time',
      useful_life_months: 36,
      useful_life_hours: 6000,
      accumulated_hours: 0,
      current_status: 'active',
      location: 'Oficina Principal',
      notes: '',
    });
    setIsAssetModalOpen(true);
  };

  // Open Edit Asset Modal
  const handleOpenEditModal = (asset: MachineAsset) => {
    setEditingAsset(asset);
    setFormData({
      code: asset.code,
      name: asset.name,
      category: asset.category,
      printer_id: asset.printer_id || '',
      brand: asset.brand || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date,
      supplier: asset.supplier || '',
      invoice_number: asset.invoice_number || '',
      acquisition_cost: asset.acquisition_cost,
      freight_and_installation: asset.freight_and_installation,
      residual_value: asset.residual_value,
      depreciation_method: asset.depreciation_method,
      useful_life_months: asset.useful_life_months,
      useful_life_hours: asset.useful_life_hours,
      accumulated_hours: asset.accumulated_hours,
      current_status: asset.current_status,
      location: asset.location || 'Oficina Principal',
      notes: asset.notes || '',
    });
    setIsAssetModalOpen(true);
  };

  // Save Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nome do equipamento é obrigatório.');
      return;
    }

    try {
      const url = editingAsset ? `/api/machine-assets/${editingAsset.id}` : '/api/machine-assets';
      const method = editingAsset ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao salvar ativo');
      }

      setIsAssetModalOpen(false);
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar ativo');
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (asset: MachineAsset) => {
    if (!confirm(`Deseja realmente excluir permanentemente o ativo "${asset.code} - ${asset.name}"? Esta ação removerá o histórico contábil do ativo.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/machine-assets/${asset.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir equipamento');
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir');
    }
  };

  // Bulk Sync Printers
  const handleSyncPrinters = async () => {
    try {
      setSyncingPrinters(true);
      const res = await fetch('/api/machine-assets/sync-printers', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao sincronizar');
      alert(data.message || 'Impressoras sincronizadas com sucesso!');
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Erro na sincronização');
    } finally {
      setSyncingPrinters(false);
    }
  };

  // Auto-Import Unregistered Printers
  const handleImportPrinters = async () => {
    try {
      setImportingPrinters(true);
      const res = await fetch('/api/machine-assets/import-printers', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar');
      alert(data.message || 'Importação finalizada!');
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Erro na importação');
    } finally {
      setImportingPrinters(false);
    }
  };

  // Open Disposal Modal
  const handleOpenDisposal = (asset: MachineAsset) => {
    setSelectedAssetForDisposal(asset);
    setDisposalForm({
      disposal_date: new Date().toISOString().split('T')[0],
      disposal_value: asset.residual_value || 0,
      disposal_reason: 'Alienação de ativo por substituição tecnológica',
      create_receivable: true
    });
    setIsDisposalModalOpen(true);
  };

  // Submit Disposal
  const handleConfirmDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForDisposal) return;

    try {
      const res = await fetch(`/api/machine-assets/${selectedAssetForDisposal.id}/disposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disposalForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na baixa do ativo');

      const gainLossMsg = data.capital_gain_or_loss >= 0
        ? `Ganho de capital apurado: R$ ${data.capital_gain_or_loss.toFixed(2)}.`
        : `Perda patrimonial contábil: R$ ${Math.abs(data.capital_gain_or_loss).toFixed(2)}.`;

      alert(`Baixa patrimonial do ativo realizada com sucesso!\n${gainLossMsg}${data.receivable_account_id ? '\nTítulo a receber registrado no Contas a Receber.' : ''}`);
      setIsDisposalModalOpen(false);
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar baixa');
    }
  };

  // Open Log Depreciation Modal
  const handleOpenLogModal = (asset: MachineAsset) => {
    setSelectedAssetForLog(asset);
    setLogForm({
      period_month: new Date().toISOString().slice(0, 7),
      amount: asset.monthly_rate || 0,
      hours_in_period: asset.depreciation_method === 'operating_hours' ? 120 : 0,
      notes: `Apropriação contábil mensal de quota de depreciação (${asset.code})`,
      create_financial_provision: true
    });
    setIsLogDepreciationModalOpen(true);
  };

  // Submit Depreciation Log
  const handleConfirmLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForLog) return;

    try {
      const res = await fetch(`/api/machine-assets/${selectedAssetForLog.id}/log-depreciation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao registrar quota contábil');

      alert(`Quota de depreciação registrada com sucesso para o período ${logForm.period_month}!\nValor: R$ ${data.depreciation_amount.toFixed(2)}${data.financial_provision_account_id ? '\nProvisão criada no Contas a Pagar (Fundo de Reposição).' : ''}`);
      setIsLogDepreciationModalOpen(false);
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar quota');
    }
  };

  // Open Hours Modal
  const handleOpenHoursModal = (asset: MachineAsset) => {
    setSelectedAssetForHours(asset);
    setNewHoursValue(asset.accumulated_hours);
    setIsHoursModalOpen(true);
  };

  // Submit Hours Update
  const handleConfirmHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForHours) return;

    try {
      const res = await fetch(`/api/machine-assets/${selectedAssetForHours.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accumulated_hours: Number(newHoursValue) || 0
        })
      });
      if (!res.ok) throw new Error('Falha ao atualizar horímetro');

      setIsHoursModalOpen(false);
      await fetchAssetsAndSummary();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar');
    }
  };

  // View Logs History
  const handleViewHistory = async (asset: MachineAsset) => {
    setSelectedAssetForHistory(asset);
    setIsHistoryModalOpen(true);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/machine-assets/${asset.id}`);
      if (res.ok) {
        const data = await res.json();
        setAssetHistoryLogs(data.logs || []);
      }
    } catch {
      setAssetHistoryLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Helper Labels & Colors
  const getCategoryBadge = (cat: AssetCategory) => {
    switch (cat) {
      case '3d_printer':
        return { label: 'Impressora 3D', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'post_processing':
        return { label: 'Pós-Processamento / Cura UV', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'drying_storage':
        return { label: 'Secador / Desidratador', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'power_protection':
        return { label: 'Nobreak / Proteção Elétrica', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'tooling_cad':
        return { label: 'Estação CAD / Scanner / Ferramentas', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      default:
        return { label: 'Equipamento Geral', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
    }
  };

  const getStatusBadge = (st: AssetStatus) => {
    switch (st) {
      case 'active':
        return { label: 'Em Operação', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'maintenance':
        return { label: 'Em Manutenção', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'fully_depreciated':
        return { label: '100% Amortizada (Lucro Máximo)', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'disposed':
        return { label: 'Baixada / Alienada', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      default:
        return { label: st, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  const getMethodLabel = (m: DepreciationMethod) => {
    switch (m) {
      case 'operating_hours':
        return 'Horímetro / Horas de Produção';
      case 'sum_of_years':
        return 'Soma dos Anos (Acelerada)';
      default:
        return 'Linear Contábil por Tempo';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="depreciation-header-card bg-[#121215] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="depreciation-title text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Controle de Depreciação de Máquinas & Equipamentos</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                    Ativo Imobilizado
                  </span>
                </h2>
                <p className="depreciation-subtitle text-xs text-slate-400">
                  Gestão patrimonial, amortização contábil mensal, cálculo de taxa horária (R$/h) para fatiadores e provisão de fundo de reposição.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 self-start xl:self-center">
            <button
              type="button"
              id="btn-import-printers"
              onClick={handleImportPrinters}
              disabled={importingPrinters}
              className="depreciation-btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1a1f] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Importa impressoras cadastradas que ainda não possuem ficha patrimonial"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importingPrinters ? 'animate-spin' : ''}`} />
              <span>Importar do Parque</span>
            </button>

            <button
              type="button"
              id="btn-sync-printers-depreciation"
              onClick={handleSyncPrinters}
              disabled={syncingPrinters}
              className="depreciation-btn-sync px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Atualiza automaticamente o campo hourly_depreciation de cada impressora vinculada"
            >
              <Zap className={`w-3.5 h-3.5 text-emerald-400 ${syncingPrinters ? 'animate-bounce' : ''}`} />
              <span>Sincronizar c/ Impressoras 3D</span>
            </button>

            <button
              type="button"
              id="btn-new-machine-asset"
              onClick={handleOpenCreateModal}
              className="printer-new-btn depreciation-btn-primary px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Equipamento</span>
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-white/[0.06]">
            {/* Total Imobilizado */}
            <div className="depreciation-stat-card bg-[#18181c] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                Custo Ativado
                <Building className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-white mt-1">
                R$ {summary.total_acquisition_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {summary.total_assets} itens no inventário
              </span>
            </div>

            {/* Depreciação Acumulada */}
            <div className="depreciation-stat-card bg-[#18181c] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                Deprec. Acumulada
                <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-amber-300 mt-1">
                R$ {summary.total_accumulated_depreciation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {summary.total_acquisition_cost > 0
                  ? `${((summary.total_accumulated_depreciation / summary.total_acquisition_cost) * 100).toFixed(1)}% amortizado`
                  : '0% amortizado'}
              </span>
            </div>

            {/* Valor Contábil Líquido Atual */}
            <div className="depreciation-stat-card bg-[#18181c] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                Valor Contábil (VCL)
                <Scale className="w-3.5 h-3.5 text-sky-400" />
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-sky-300 mt-1">
                R$ {summary.total_current_book_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Patrimônio líquido real
              </span>
            </div>

            {/* Provisão Mensal */}
            <div className="depreciation-stat-card bg-[#18181c] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                Provisão Mensal
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-emerald-300 mt-1">
                R$ {summary.total_monthly_depreciation_provision.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Custo de amortização/mês
              </span>
            </div>

            {/* Média Horária (R$/h) */}
            <div className="depreciation-stat-card bg-[#18181c] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                Depreciação Média
                <Clock className="w-3.5 h-3.5 text-purple-400" />
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-purple-300 mt-1">
                R$ {summary.average_hourly_depreciation.toFixed(2)}/h
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Para cálculo de orçamentos
              </span>
            </div>

            {/* 100% Amortizadas (Lucro Máximo) */}
            <div className="depreciation-stat-card bg-[#18181c] border border-white/[0.06] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                100% Amortizadas
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-blue-300 mt-1">
                {summary.fully_depreciated_count} <span className="text-xs font-normal text-slate-400">máquinas</span>
              </div>
              <span className="text-[10px] text-blue-400/80 mt-0.5 block">
                Operando com lucro líquido pleno
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar & View Switcher */}
      <div className="depreciation-filter-bar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121215] border border-white/[0.08] p-3 rounded-xl">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              id="search-machine-assets"
              placeholder="Buscar por código, nome, modelo ou série..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#18181c] border border-white/[0.08] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>

          {/* Category Filter */}
          <select
            id="select-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-[#18181c] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden focus:border-emerald-500/50"
          >
            <option value="all">Todas as Categorias</option>
            <option value="3d_printer">Impressoras 3D</option>
            <option value="post_processing">Pós-Processamento / Cura UV</option>
            <option value="drying_storage">Secagem & Estufas</option>
            <option value="power_protection">Proteção Elétrica & Nobreak</option>
            <option value="tooling_cad">Estação CAD & Scanner</option>
            <option value="other">Outros Equipamentos</option>
          </select>

          {/* Status Filter */}
          <select
            id="select-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-[#18181c] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden focus:border-emerald-500/50"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Em Operação</option>
            <option value="maintenance">Em Manutenção</option>
            <option value="fully_depreciated">100% Amortizada</option>
            <option value="disposed">Baixada / Alienada</option>
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[#18181c] p-1 rounded-lg border border-white/[0.08] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cards Bento
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tabela Contábil
          </button>
        </div>
      </div>

      {/* Main Asset Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs text-slate-400">Calculando depreciações e valor contábil...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">Nenhum equipamento patrimonial encontrado</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhum ativo corresponde aos filtros selecionados. Você pode cadastrar um novo equipamento ou importar automaticamente as impressoras 3D cadastradas na oficina.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleImportPrinters}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a1a1f] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition cursor-pointer"
            >
              Importar Impressoras do Parque
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
            >
              Cadastrar Primeiro Ativo
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Bento Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const catBadge = getCategoryBadge(asset.category);
            const stBadge = getStatusBadge(asset.current_status);
            const percent = Math.min(100, asset.percent_depreciated || 0);

            return (
              <div
                key={asset.id}
                className={`bg-[#121215] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-emerald-500/30 ${
                  asset.current_status === 'disposed'
                    ? 'border-white/[0.04] opacity-75'
                    : asset.current_status === 'fully_depreciated'
                    ? 'border-blue-500/20'
                    : 'border-white/[0.08]'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header: Code & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-white/[0.06] text-white border border-white/[0.1]">
                          {asset.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stBadge.color}`}>
                          {stBadge.label}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-1 pt-1">
                        {asset.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{asset.brand || 'Fabricante não informado'}</span>
                        {asset.model && <span>• {asset.model}</span>}
                        {asset.location && <span className="text-slate-500">• {asset.location}</span>}
                      </div>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${catBadge.color}`}>
                      {catBadge.label}
                    </span>
                  </div>

                  {/* Depreciation Progress Bar */}
                  <div className="space-y-1 bg-[#18181c] p-3 rounded-xl border border-white/[0.04]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Progresso da Amortização</span>
                      <span className={`font-mono font-bold ${percent >= 100 ? 'text-blue-400' : percent >= 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {percent.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 100
                            ? 'bg-blue-500'
                            : percent >= 75
                            ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>{asset.months_elapsed || 0} meses decorridos</span>
                      <span>Vida útil: {asset.useful_life_months} meses</span>
                    </div>
                  </div>

                  {/* Financial & Valuation Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#18181c] p-2.5 rounded-lg border border-white/[0.04]">
                      <span className="text-[10px] text-slate-500 block">Custo Total Ativado</span>
                      <span className="font-mono font-bold text-slate-200">
                        R$ {asset.initial_total_cost.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Residual: R$ {asset.residual_value.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-[#18181c] p-2.5 rounded-lg border border-white/[0.04]">
                      <span className="text-[10px] text-slate-500 block">Valor Contábil Líquido</span>
                      <span className="font-mono font-bold text-sky-300">
                        R$ {asset.current_book_value.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-amber-400/80 block">
                        -R$ {asset.accumulated_depreciation.toFixed(2)} amortizado
                      </span>
                    </div>
                  </div>

                  {/* Operational Rates & Operating Hours */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#18181c] p-2.5 rounded-lg border border-white/[0.04]">
                      <span className="text-[10px] text-slate-500 block">Taxa Horária (R$/h)</span>
                      <span className="font-mono font-black text-purple-300">
                        R$ {asset.hourly_rate.toFixed(2)} / hora
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Provisão: R$ {asset.monthly_rate.toFixed(2)}/mês
                      </span>
                    </div>

                    <div className="bg-[#18181c] p-2.5 rounded-lg border border-white/[0.04]">
                      <span className="text-[10px] text-slate-500 flex items-center justify-between">
                        Horímetro
                        <button
                          type="button"
                          onClick={() => handleOpenHoursModal(asset)}
                          className="text-[9px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          Ajustar
                        </button>
                      </span>
                      <span className="font-mono font-bold text-slate-200">
                        {asset.accumulated_hours.toFixed(0)} h
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Meta: {asset.useful_life_hours.toFixed(0)} h
                      </span>
                    </div>
                  </div>

                  {/* Linked Printer Badge */}
                  {asset.printer_id && (
                    <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/20 rounded-lg px-2.5 py-1.5 text-[11px] text-sky-300">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Impressora vinculada: <strong>{asset.printer_name || 'Impressora 3D'}</strong></span>
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-sky-500/20 px-1.5 py-0.5 rounded">
                        R$ {asset.hourly_rate.toFixed(2)}/h
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenLogModal(asset)}
                      disabled={asset.current_status === 'disposed'}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-30"
                      title="Lançar cota contábil mensal e provisionar em contas a pagar"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Lançar Mês</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewHistory(asset)}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition cursor-pointer"
                      title="Ver histórico de lançamentos e amortizações"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </button>

                    {asset.current_status !== 'disposed' && (
                      <button
                        type="button"
                        onClick={() => handleOpenDisposal(asset)}
                        className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Alienação / Baixa do ativo por venda ou sucata"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(asset)}
                      className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                      title="Editar ficha do ativo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(asset)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                      title="Excluir ativo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Comprehensive Accounting Table View */
        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181c] text-slate-400 font-semibold border-b border-white/[0.08]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Equipamento</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Data Compra</th>
                  <th className="py-3 px-4 text-right">Custo Ativado</th>
                  <th className="py-3 px-4 text-right">Deprec. Acumulada</th>
                  <th className="py-3 px-4 text-right">Valor Contábil (VCL)</th>
                  <th className="py-3 px-4 text-right">Taxa (R$/h)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filteredAssets.map((asset) => {
                  const catBadge = getCategoryBadge(asset.category);
                  const stBadge = getStatusBadge(asset.current_status);
                  return (
                    <tr key={asset.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {asset.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{asset.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {asset.brand} {asset.model} {asset.serial_number ? `(S/N: ${asset.serial_number})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadge.color}`}>
                          {catBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {asset.purchase_date}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-200">
                        R$ {asset.initial_total_cost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-300">
                        R$ {asset.accumulated_depreciation.toFixed(2)}
                        <span className="text-[10px] text-slate-500 block">
                          ({(asset.percent_depreciated || 0).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sky-300">
                        R$ {asset.current_book_value.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-300">
                        R$ {asset.hourly_rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stBadge.color}`}>
                          {stBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenLogModal(asset)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition cursor-pointer"
                            title="Lançar quota mensal"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(asset)}
                            className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded transition cursor-pointer"
                            title="Editar ativo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Excluir ativo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Methodological Guidance & Accounting Insights Bento Card */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-5 text-xs text-slate-400 space-y-3">
        <h4 className="font-bold text-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400" />
          Como o Controle de Depreciação Protege o Fluxo de Caixa da Oficina 3D
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] leading-relaxed">
          <div className="space-y-1 bg-[#18181c] p-3 rounded-xl border border-white/[0.04]">
            <strong className="text-slate-200 block">1. Custo Real por Peça Fatiada</strong>
            <p className="text-slate-400">
              A impressora 3D perde valor a cada hora trabalhada. Ao incorporar a taxa horária de depreciação (R$/h) no cálculo dos produtos, o desgaste do equipamento é cobrado diretamente do cliente.
            </p>
          </div>
          <div className="space-y-1 bg-[#18181c] p-3 rounded-xl border border-white/[0.04]">
            <strong className="text-slate-200 block">2. Fundo de Reequipamento e Reserva</strong>
            <p className="text-slate-400">
              O recurso provisionado mensalmente não é um desembolso imediato a terceiros, mas um caixa reservado para que, quando a máquina atingir o fim de sua vida útil, você tenha 100% do valor para adquirir um modelo novo à vista.
            </p>
          </div>
          <div className="space-y-1 bg-[#18181c] p-3 rounded-xl border border-white/[0.04]">
            <strong className="text-slate-200 block">3. Máquinas 100% Amortizadas</strong>
            <p className="text-slate-400">
              Equipamentos com 100% de depreciação contábil acumulada continuam imprimindo perfeitamente, porém agora geram <strong>lucro líquido expandido</strong>, pois o investimento de compra já foi integralmente recuperado.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Cadastrar / Editar Ativo Imobilizado                             */}
      {/* ========================================================================= */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#141417] border border-white/[0.1] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#18181c]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {editingAsset ? 'Editar Ficha do Ativo Patrimonial' : 'Cadastrar Novo Equipamento Patrimonial'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina valores de aquisição, vida útil e método contábil de amortização
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Code, Category, Linked Printer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Código do Patrimônio *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PAT-001"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Categoria do Ativo
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  >
                    <option value="3d_printer">Impressora 3D</option>
                    <option value="post_processing">Pós-Processamento / Cura UV</option>
                    <option value="drying_storage">Secagem & Estufa de Filamentos</option>
                    <option value="power_protection">Proteção Elétrica & Nobreak</option>
                    <option value="tooling_cad">Estação CAD / Scanner / Ferramentas</option>
                    <option value="other">Outros Periféricos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Vínculo c/ Impressora 3D
                  </label>
                  <select
                    value={formData.printer_id}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const p = printers.find(pr => pr.id === selId);
                      setFormData({
                        ...formData,
                        printer_id: selId,
                        name: !formData.name && p ? p.name : formData.name,
                        brand: !formData.brand && p ? p.brand || '' : formData.brand,
                        model: !formData.model && p ? p.model || '' : formData.model
                      });
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  >
                    <option value="">Nenhum (Ativo Avulso)</option>
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.brand || '3D'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Name, Brand, Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome / Descrição do Equipamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Bambu Lab P1S Combo c/ AMS"
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Fabricante / Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Bambu Lab, Creality, Elegoo"
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Modelo / Versão
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: P1S Combo, Ender 3 S1 Pro"
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Row 3: Purchase Date, Supplier, Invoice, Serial */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Data de Aquisição *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Fornecedor / Loja
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Ex: 3D Prime, Importação"
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    NF-e / Documento
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="NF-e 048.192"
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nº de Série (S/N)
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="01P1S-2024-88192"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Financial Box: Cost, Freight, Residual Value */}
              <div className="bg-[#18181c] p-4 rounded-xl border border-white/[0.06] space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Valores Contábeis de Ativação & Amortização
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Valor da Máquina na Compra (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.acquisition_cost}
                      onChange={(e) => setFormData({ ...formData, acquisition_cost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Frete, Impostos & Acessórios Iniciais (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.freight_and_installation}
                      onChange={(e) => setFormData({ ...formData, freight_and_installation: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Valor Residual Final Estimado (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.residual_value}
                      onChange={(e) => setFormData({ ...formData, residual_value: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Valor estimado de revenda ou sucata ao término da vida útil
                    </span>
                  </div>
                </div>

                {/* Real-time calculated preview */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] text-[11px] border border-white/[0.04]">
                  <span className="text-slate-400">
                    Custo Total Ativado: <strong className="text-white font-mono">R$ {(Number(formData.acquisition_cost || 0) + Number(formData.freight_and_installation || 0)).toFixed(2)}</strong>
                  </span>
                  <span className="text-slate-400">
                    Base Depreciável: <strong className="text-emerald-400 font-mono">R$ {Math.max(0, (Number(formData.acquisition_cost || 0) + Number(formData.freight_and_installation || 0)) - Number(formData.residual_value || 0)).toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {/* Depreciation Method & Useful Life */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Método de Cálculo
                  </label>
                  <select
                    value={formData.depreciation_method}
                    onChange={(e) => setFormData({ ...formData, depreciation_method: e.target.value as DepreciationMethod })}
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  >
                    <option value="linear_time">Linear Contábil por Tempo</option>
                    <option value="operating_hours">Horímetro / Horas de Produção</option>
                    <option value="sum_of_years">Soma dos Dígitos dos Anos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Vida Útil (Meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.useful_life_months}
                    onChange={(e) => setFormData({ ...formData, useful_life_months: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Padrão: 36 meses (3 anos) ou 60 meses (5 anos)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Vida Útil em Horas de Impressão
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={formData.useful_life_hours}
                    onChange={(e) => setFormData({ ...formData, useful_life_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Padrão: 5.000h a 8.000h para impressoras 3D
                  </span>
                </div>
              </div>

              {/* Status, Location & Horímetro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Horímetro Acumulado Atual (Horas)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.accumulated_hours}
                    onChange={(e) => setFormData({ ...formData, accumulated_hours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={formData.current_status}
                    onChange={(e) => setFormData({ ...formData, current_status: e.target.value as AssetStatus })}
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  >
                    <option value="active">Em Operação</option>
                    <option value="maintenance">Em Manutenção</option>
                    <option value="fully_depreciated">100% Amortizada</option>
                    <option value="disposed">Baixada / Alienada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Localização na Oficina
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Bancada 1, Sala Principal"
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Observações Técnicas e Contábeis
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre garantia, upgrades instalados, fonte de alimentação, etc."
                  className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.04] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition"
                >
                  {editingAsset ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Alienação / Baixa Patrimonial de Ativo (Venda/Descarte)           */}
      {/* ========================================================================= */}
      {isDisposalModalOpen && selectedAssetForDisposal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#18181c]">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Alienação & Baixa de Ativo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDisposalModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDisposal} className="p-5 space-y-4">
              <div className="p-3 bg-[#18181c] rounded-xl border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-slate-500 block">Equipamento a ser baixado:</span>
                <span className="font-bold text-white text-xs">{selectedAssetForDisposal.code} - {selectedAssetForDisposal.name}</span>
                <div className="text-[11px] text-sky-400 pt-1">
                  Valor Contábil Líquido atual: <strong>R$ {selectedAssetForDisposal.current_book_value.toFixed(2)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Data da Baixa / Venda *
                </label>
                <input
                  type="date"
                  required
                  value={disposalForm.disposal_date}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposal_date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Valor da Venda / Alienação (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={disposalForm.disposal_value}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposal_value: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Informe 0 se foi descarte ou sucateamento sem recebimento
                </span>
              </div>

              {/* Apuração de Ganho ou Perda */}
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] flex items-center justify-between">
                <span className="text-slate-400">Resultado Contábil:</span>
                {Number(disposalForm.disposal_value || 0) >= selectedAssetForDisposal.current_book_value ? (
                  <span className="font-mono font-bold text-emerald-400">
                    + R$ {(Number(disposalForm.disposal_value || 0) - selectedAssetForDisposal.current_book_value).toFixed(2)} (Ganho)
                  </span>
                ) : (
                  <span className="font-mono font-bold text-rose-400">
                    - R$ {(selectedAssetForDisposal.current_book_value - Number(disposalForm.disposal_value || 0)).toFixed(2)} (Perda)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Motivo da Baixa / Destino
                </label>
                <input
                  type="text"
                  value={disposalForm.disposal_reason}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposal_reason: e.target.value })}
                  placeholder="Venda de usado, sucateamento, doação..."
                  className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={disposalForm.create_receivable}
                  onChange={(e) => setDisposalForm({ ...disposalForm, create_receivable: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 bg-[#1c1c20] border-white/10"
                />
                <span className="text-[11px] text-slate-300">
                  Gerar título a receber no <strong>Contas a Receber</strong> com o valor da venda
                </span>
              </label>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDisposalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20"
                >
                  Confirmar Baixa do Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Lançamento Mensal de Quota Contábil & Provisão Financeira          */}
      {/* ========================================================================= */}
      {isLogDepreciationModalOpen && selectedAssetForLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#18181c]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Lançar Quota Mensal de Depreciação
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogDepreciationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmLog} className="p-5 space-y-4">
              <div className="p-3 bg-[#18181c] rounded-xl border border-white/[0.06] space-y-1">
                <span className="text-[10px] text-slate-500 block">Equipamento:</span>
                <span className="font-bold text-white text-xs">{selectedAssetForLog.code} - {selectedAssetForLog.name}</span>
                <div className="text-[11px] text-emerald-300 pt-0.5">
                  Quota calculada pelo sistema: <strong>R$ {selectedAssetForLog.monthly_rate.toFixed(2)}/mês</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mês de Referência (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    required
                    value={logForm.period_month}
                    onChange={(e) => setLogForm({ ...logForm, period_month: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Valor da Quota (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={logForm.amount}
                    onChange={(e) => setLogForm({ ...logForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
              </div>

              {selectedAssetForLog.depreciation_method === 'operating_hours' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Horas de Impressão no Mês
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={logForm.hours_in_period}
                    onChange={(e) => setLogForm({ ...logForm, hours_in_period: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Histórico Contábil
                </label>
                <input
                  type="text"
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={logForm.create_financial_provision}
                  onChange={(e) => setLogForm({ ...logForm, create_financial_provision: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 bg-[#1c1c20] border-white/10"
                />
                <span className="text-[11px] text-slate-300">
                  Gerar lançamento de <strong>Provisão / Fundo de Reposição</strong> no Contas a Pagar
                </span>
              </label>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogDepreciationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
                >
                  Registrar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Ajustar Horímetro                                               */}
      {/* ========================================================================= */}
      {isHoursModalOpen && selectedAssetForHours && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-white/[0.1] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#18181c]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  Ajustar Horímetro Acumulado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHoursModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmHours} className="p-5 space-y-4">
              <div className="p-3 bg-[#18181c] rounded-xl border border-white/[0.06] text-xs space-y-1">
                <span className="text-slate-400 block">{selectedAssetForHours.code} - {selectedAssetForHours.name}</span>
                <span className="text-slate-500 text-[10px] block">Horímetro atual: {selectedAssetForHours.accumulated_hours} horas</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Novo Total de Horas Acumuladas
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={newHoursValue}
                  onChange={(e) => setNewHoursValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono bg-[#1c1c20] border border-white/[0.08] rounded-lg text-white"
                />
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHoursModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white shadow-md shadow-purple-500/20"
                >
                  Salvar Horímetro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Histórico de Quotas e Amortizações                                */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && selectedAssetForHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-white/[0.1] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#18181c]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Histórico Contábil de Amortizações
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedAssetForHistory.code} - {selectedAssetForHistory.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {loadingLogs ? (
                <div className="py-8 text-center text-xs text-slate-400">Carregando histórico...</div>
              ) : assetHistoryLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>Nenhum lançamento contábil mensal avulso registrado ainda para este ativo.</p>
                  <p className="text-[11px] text-slate-500">
                    Use o botão "Lançar Mês" no card para formalizar o fechamento mensal da quota.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assetHistoryLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-[#18181c] border border-white/[0.04] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-white">{log.period_month}</span>
                        <span className="text-[11px] text-slate-400 block">{log.notes || 'Amortização de quota'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-300 block">
                          - R$ {log.depreciation_amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          VCL após: R$ {log.book_value_after.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-[#18181c] flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
