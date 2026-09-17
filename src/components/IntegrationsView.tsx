import React, { useState, useEffect } from 'react';
import {
  Globe,
  Store,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Sliders,
  Search,
  Plus,
  Trash2,
  Send,
  ArrowUpRight,
  Zap,
  ShoppingBag,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Percent,
  Info,
  Clock,
  Link2,
  X
} from 'lucide-react';
import {
  MarketplaceIntegration,
  MarketplacePlatformId,
  SkuMapping,
  IntegrationLog,
  Product,
  ProductSale
} from '../types';
import { safeFetchJson } from '../utils/api';

interface IntegrationsViewProps {
  products: Product[];
  sales: ProductSale[];
  onRefreshAllData: () => void;
  onNavigateToSales: () => void;
}

// Visual identity and presets for each marketplace
const PLATFORM_META: Record<MarketplacePlatformId, {
  name: string;
  badge: string;
  badgeColor: string;
  accentBorder: string;
  tagline: string;
  defaultCommission: number;
  defaultFixedFee: number;
  docsUrl: string;
  fields: {
    appId?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    sellerId?: string;
    partnerId?: string;
    partnerKey?: string;
    shopId?: string;
    awsRegion?: string;
  };
}> = {
  mercadolivre: {
    name: 'Mercado Livre',
    badge: 'Meli Developers',
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    accentBorder: 'border-amber-400/30',
    tagline: 'Líder de e-commerce no Brasil. Suporte a anúncios Clássico e Premium via API Meli.',
    defaultCommission: 16.5,
    defaultFixedFee: 6.50,
    docsUrl: 'https://developers.mercadolivre.com.br/',
    fields: {
      appId: 'App ID (ex: 8294719201948)',
      clientId: 'Client ID / Client Secret Key',
      clientSecret: 'Client Secret (Chave Secreta)',
      accessToken: 'Access Token (OAuth 2.0)',
      sellerId: 'Seller ID (User ID do Vendedor no ML)'
    }
  },
  shopee: {
    name: 'Shopee Brasil',
    badge: 'Shopee Open Platform',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    accentBorder: 'border-orange-500/30',
    tagline: 'Maior volume de pequenos produtos e itens de decoração 3D. API Open Platform v2.',
    defaultCommission: 14.0,
    defaultFixedFee: 4.00,
    docsUrl: 'https://open.shopee.com/',
    fields: {
      partnerId: 'Partner ID (ex: 2004819)',
      partnerKey: 'Partner Key (Chave Secreta Shopee)',
      shopId: 'Shop ID (ID da Loja)',
      accessToken: 'User Access Token'
    }
  },
  amazon: {
    name: 'Amazon Brasil (SP-API)',
    badge: 'Amazon SP-API',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    accentBorder: 'border-sky-500/30',
    tagline: 'Amazon Selling Partner API com suporte a FBM (Fulfilled by Merchant) e catálogo 3D.',
    defaultCommission: 15.0,
    defaultFixedFee: 0.00,
    docsUrl: 'https://developer-docs.amazon.com/sp-api/',
    fields: {
      clientId: 'LWA Client ID (Login with Amazon)',
      clientSecret: 'LWA Client Secret',
      refreshToken: 'LWA Refresh Token',
      sellerId: 'Merchant / Seller ID',
      awsRegion: 'AWS Region / Marketplace ID (A2Q3Y263D00KWC)'
    }
  },
  shein: {
    name: 'Shein Marketplace',
    badge: 'Shein Open Platform',
    badgeColor: 'bg-slate-200/20 text-slate-200 border-slate-400/40',
    accentBorder: 'border-slate-500/30',
    tagline: 'Marketplace de moda, brindes e utilidades criativas em forte expansão no Brasil.',
    defaultCommission: 16.0,
    defaultFixedFee: 0.00,
    docsUrl: 'https://open.shein.com/',
    fields: {
      clientId: 'Open ID / App Key',
      clientSecret: 'App Secret',
      accessToken: 'Access Token de Vendedor'
    }
  },
  elo7: {
    name: 'Elo7 (Artesanato & 3D)',
    badge: 'Elo7 API',
    badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    accentBorder: 'border-amber-500/30',
    tagline: 'Canal especializado em peças 3D personalizadas, cosplay, miniaturas e presentes.',
    defaultCommission: 18.0,
    defaultFixedFee: 0.00,
    docsUrl: 'https://api.elo7.com.br/',
    fields: {
      clientId: 'Client ID da Aplicação',
      clientSecret: 'Client Secret',
      sellerId: 'ID da Loja no Elo7'
    }
  },
  bling: {
    name: 'Bling ERP / Tiny ERP',
    badge: 'Hub Fiscal & Expedição',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentBorder: 'border-emerald-500/30',
    tagline: 'Integração de estoque mestre, emissão de NF-e e etiquetas de envio Melhor Envio/Correios.',
    defaultCommission: 0.0,
    defaultFixedFee: 0.00,
    docsUrl: 'https://developer.bling.com.br/',
    fields: {
      clientId: 'API Key v3 / Bearer Token',
      clientSecret: 'Chave de Acesso Webhook'
    }
  }
};

export function IntegrationsView({
  products,
  sales,
  onRefreshAllData,
  onNavigateToSales
}: IntegrationsViewProps) {
  const [integrations, setIntegrations] = useState<MarketplaceIntegration[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<MarketplacePlatformId>('mercadolivre');
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'mappings' | 'simulator' | 'logs'>('config');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  // SKU Mapping Form Modal / Inline
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);
  const [selectedProductForMapping, setSelectedProductForMapping] = useState<string>('');
  const [newMarketplaceSku, setNewMarketplaceSku] = useState<string>('');
  const [newListingId, setNewListingId] = useState<string>('');
  const [newMarketplacePrice, setNewMarketplacePrice] = useState<string>('');

  // Simulator State
  const [simProduct, setSimProduct] = useState<string>(products.length > 0 ? products[0].id : '');
  const [simCustomCost, setSimCustomCost] = useState<number>(4.50);
  const [simCustomPrice, setSimCustomPrice] = useState<number>(29.90);

  // Simulation of incoming order modal
  const [showSimulateOrderModal, setShowSimulateOrderModal] = useState(false);
  const [simulatePlatform, setSimulatePlatform] = useState<MarketplacePlatformId>('mercadolivre');
  const [simulateProduct, setSimulateProduct] = useState<string>(products.length > 0 ? products[0].id : '');
  const [simulateQty, setSimulateQty] = useState<number>(2);
  const [simulatePrice, setSimulatePrice] = useState<number>(25.00);
  const [simulateCustomer, setSimulateCustomer] = useState<string>('Camila Fernandes (São Paulo - SP)');
  const [isSimulatingOrder, setIsSimulatingOrder] = useState(false);
  const [simulateSuccessMessage, setSimulateSuccessMessage] = useState<string | null>(null);

  // Load Integrations and Logs
  const fetchIntegrationsData = async () => {
    try {
      setLoading(true);
      const [intRes, logsRes] = await Promise.all([
        safeFetchJson<MarketplaceIntegration[]>('/api/integrations', undefined, []),
        safeFetchJson<IntegrationLog[]>('/api/integrations/logs', undefined, [])
      ]);
      if (Array.isArray(intRes) && intRes.length > 0) {
        setIntegrations(intRes);
      }
      if (Array.isArray(logsRes)) {
        setLogs(logsRes);
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationsData();
  }, []);

  // Update simulator when selected product changes
  useEffect(() => {
    if (simProduct) {
      const prod = products.find((p) => p.id === simProduct);
      if (prod) {
        setSimCustomCost(prod.total_cost || 4.50);
        setSimCustomPrice(prod.sale_price || 29.90);
      }
    }
  }, [simProduct, products]);

  // Selected Integration Object
  const currentIntegration = integrations.find((i) => i.platform_id === selectedPlatformId) || {
    id: `int-${selectedPlatformId}`,
    platform_id: selectedPlatformId,
    name: PLATFORM_META[selectedPlatformId]?.name || selectedPlatformId,
    enabled: false,
    environment: 'production',
    default_commission_percent: PLATFORM_META[selectedPlatformId]?.defaultCommission || 16.0,
    fixed_fee_per_sale: PLATFORM_META[selectedPlatformId]?.defaultFixedFee || 0.0,
    auto_stock_sync: true,
    auto_order_import: true,
    status: 'disconnected',
    sku_mappings: []
  } as MarketplaceIntegration;

  // Form local state for editing
  const [formData, setFormData] = useState<MarketplaceIntegration>(currentIntegration);

  useEffect(() => {
    setFormData(currentIntegration);
    setTestResult(null);
  }, [selectedPlatformId, integrations]);

  // Copy helper
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Save integration settings
  const handleSaveIntegration = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/integrations/${selectedPlatformId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações');
      await fetchIntegrationsData();
      setTestResult({
        success: true,
        message: `Configurações de ${formData.name} salvas com sucesso!`
      });
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar integração');
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection / Ping
  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      // Save changes first if needed
      await fetch(`/api/integrations/${selectedPlatformId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const res = await fetch(`/api/integrations/${selectedPlatformId}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        latency_ms: data.latency_ms
      });
      await fetchIntegrationsData();
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Falha na requisição de teste: ${e.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Sync single integration stock
  const handleSyncStock = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/integrations/${selectedPlatformId}/sync`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar');
      await fetchIntegrationsData();
      onRefreshAllData();
      alert(`Sincronização concluída com sucesso! ${data.syncedCount} anúncios atualizados.`);
    } catch (e: any) {
      alert(e.message || 'Erro ao sincronizar estoque');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all integrations stock
  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/integrations/sync-all', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar');
      await fetchIntegrationsData();
      onRefreshAllData();
      alert(`Sincronização global concluída! ${data.count} canais atualizados.`);
    } catch (e: any) {
      alert(e.message || 'Erro ao sincronizar todos os marketplaces');
    } finally {
      setIsSyncing(false);
    }
  };

  // Add SKU mapping
  const handleAddSkuMapping = async () => {
    if (!selectedProductForMapping || !newMarketplaceSku.trim()) {
      alert('Selecione o produto do catálogo e digite o SKU do marketplace.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductForMapping);
    if (!prod) return;

    const newMapping: SkuMapping = {
      internal_product_id: prod.id,
      internal_product_name: prod.name,
      marketplace_sku: newMarketplaceSku.trim(),
      marketplace_listing_id: newListingId.trim() || undefined,
      marketplace_price: Number(newMarketplacePrice) || prod.sale_price,
      sync_active: true,
      last_synced_stock: prod.ready_stock_qty || 0
    };

    const currentMappings = formData.sku_mappings || [];
    const updated = [...currentMappings, newMapping];

    const updatedFormData = {
      ...formData,
      sku_mappings: updated
    };

    setFormData(updatedFormData);

    try {
      await fetch(`/api/integrations/${selectedPlatformId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFormData)
      });
      await fetchIntegrationsData();
      setShowAddMappingModal(false);
      setNewMarketplaceSku('');
      setNewListingId('');
      setNewMarketplacePrice('');
    } catch (err) {
      alert('Erro ao salvar mapeamento de SKU');
    }
  };

  // Remove SKU Mapping
  const handleRemoveSkuMapping = async (index: number) => {
    if (!confirm('Deseja remover este vínculo de SKU?')) return;
    const updated = (formData.sku_mappings || []).filter((_, idx) => idx !== index);
    const updatedFormData = {
      ...formData,
      sku_mappings: updated
    };
    setFormData(updatedFormData);

    try {
      await fetch(`/api/integrations/${selectedPlatformId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFormData)
      });
      await fetchIntegrationsData();
    } catch (err) {
      alert('Erro ao atualizar mapeamento');
    }
  };

  // Simulate an incoming order
  const handleSimulateIncomingOrder = async () => {
    try {
      setIsSimulatingOrder(true);
      setSimulateSuccessMessage(null);

      const res = await fetch('/api/integrations/simulate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: simulatePlatform,
          product_id: simulateProduct,
          quantity: simulateQty,
          unit_price: simulatePrice,
          customer_name: simulateCustomer
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao simular pedido');

      setSimulateSuccessMessage(data.message);
      await fetchIntegrationsData();
      onRefreshAllData();

      setTimeout(() => {
        setShowSimulateOrderModal(false);
        setSimulateSuccessMessage(null);
      }, 2500);
    } catch (e: any) {
      alert(e.message || 'Erro ao simular pedido');
    } finally {
      setIsSimulatingOrder(false);
    }
  };

  // Calculations for summary stats
  const enabledCount = integrations.filter((i) => i.enabled).length;
  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const totalMappedSkus = integrations.reduce((acc, i) => acc + (i.sku_mappings?.length || 0), 0);

  // Webhook URL generator
  const generatedWebhookUrl = `https://${window.location.host || 'api.printcraft3d.local'}/api/webhooks/${selectedPlatformId}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-[#141416] p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Globe className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Integrações & Marketplaces
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {connectedCount} ativos
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Conecte sua oficina de impressão 3D aos maiores canais de venda (Mercado Livre, Shopee, Amazon e ERPs). Sincronize estoque de pronta entrega em tempo real, importe pedidos e calcule taxas líquidas.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="integration-btn-secondary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
              title="Executar sincronização de estoque em todas as plataformas ativas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todas'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSimulateOrderModal(true)}
              className="integration-btn-simulate flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-sm transition"
              title="Simula a chegada de um pedido de marketplace dando baixa automática no estoque"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simular Pedido de Teste</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/[0.08]">
          <div className="integration-metric-card p-3.5 rounded-2xl border border-white/[0.05]">
            <span className="text-[11px] text-slate-400 block font-medium">Canais Configurados</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-white">{enabledCount}</span>
              <span className="text-xs text-slate-500">de {integrations.length || 6}</span>
            </div>
          </div>

          <div className="integration-metric-card p-3.5 rounded-2xl border border-white/[0.05]">
            <span className="text-[11px] text-slate-400 block font-medium">Anúncios Mapeados</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-sky-400">{totalMappedSkus}</span>
              <span className="text-xs text-slate-500">SKUs ativos</span>
            </div>
          </div>

          <div className="integration-metric-card p-3.5 rounded-2xl border border-white/[0.05]">
            <span className="text-[11px] text-slate-400 block font-medium">Sincronização 3D</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">Tempo Real</span>
            </div>
          </div>

          <div className="integration-metric-card p-3.5 rounded-2xl border border-white/[0.05]">
            <span className="text-[11px] text-slate-400 block font-medium">Vendas na Plataforma</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-emerald-400">
                {sales.filter((s) => s.channel_type === 'platform').length}
              </span>
              <span className="text-xs text-slate-500">pedidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 bg-[#121214] p-1.5 rounded-2xl border border-white/[0.08] w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('config')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'config'
              ? 'bg-sky-500 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configuração por Player</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('mappings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'mappings'
              ? 'bg-sky-500 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Mapeamento de SKUs ({totalMappedSkus})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('simulator')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'simulator'
              ? 'bg-sky-500 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Simulador de Taxas & Lucro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('logs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'logs'
              ? 'bg-sky-500 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Logs & Webhooks ({logs.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: CONFIGURAÇÃO DOS PLAYERS */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Players Selector Sidebar (Cols 1-4) */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Selecione o Marketplace
            </h3>

            {(['mercadolivre', 'shopee', 'amazon', 'shein', 'elo7', 'bling'] as MarketplacePlatformId[]).map((pid) => {
              const meta = PLATFORM_META[pid];
              const integ = integrations.find((i) => i.platform_id === pid);
              const isSelected = selectedPlatformId === pid;
              const isConnected = integ?.status === 'connected' && integ?.enabled;

              return (
                <div
                  key={pid}
                  onClick={() => setSelectedPlatformId(pid)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'integration-player-card-active border-sky-500/60 ring-1 ring-sky-500/30 shadow-md'
                      : 'integration-player-card-inactive hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${meta.badgeColor} border`}>
                      {pid === 'mercadolivre' && 'ML'}
                      {pid === 'shopee' && 'SH'}
                      {pid === 'amazon' && 'AZ'}
                      {pid === 'shein' && 'SN'}
                      {pid === 'elo7' && 'E7'}
                      {pid === 'bling' && 'BL'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white leading-tight">
                          {meta.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Taxa: {integ?.default_commission_percent || meta.defaultCommission}%
                        {integ?.fixed_fee_per_sale ? ` + R$ ${Number(integ.fixed_fee_per_sale || 0).toFixed(2)}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ativo
                      </span>
                    ) : integ?.enabled ? (
                      <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Pendente
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.05]">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick documentation card */}
            <div className="integration-info-card p-4 rounded-2xl border border-white/[0.08] text-xs text-slate-400 space-y-2 mt-4">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Info className="w-4 h-4" />
                <span>Como funciona o Sync 3D?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Ao finalizar impressões no aplicativo ou registrar vendas no balcão, o estoque de pronta entrega (<code className="text-sky-300">ready_stock_qty</code>) é transmitido aos anúncios vinculados.
              </p>
              <a
                href={PLATFORM_META[selectedPlatformId]?.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                <span>Documentação oficial da API {PLATFORM_META[selectedPlatformId]?.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Player Configuration Form (Cols 5-12) */}
          <div className="lg:col-span-8 bg-[#141416] p-5 sm:p-6 rounded-3xl border border-white/[0.08] space-y-6">
            {/* Header of selected player */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    Configuração: {PLATFORM_META[selectedPlatformId]?.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${PLATFORM_META[selectedPlatformId]?.badgeColor}`}>
                    {PLATFORM_META[selectedPlatformId]?.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {PLATFORM_META[selectedPlatformId]?.tagline}
                </p>
              </div>

              {/* Status and Active Toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-2.5 text-xs font-semibold text-slate-300">
                    {formData.enabled ? 'Habilitado' : 'Desabilitado'}
                  </span>
                </label>
              </div>
            </div>

            {/* Test Result Alert Banner */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  testResult.success
                    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/40'
                    : 'bg-rose-950/40 text-rose-200 border-rose-500/40'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.latency_ms && (
                    <span className="text-[11px] opacity-80 mt-0.5 block font-mono">
                      Latência do endpoint: {testResult.latency_ms}ms • Status HTTP: 200 OK
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* General Credentials Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Credenciais de Autenticação & API
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Environment selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ambiente da API
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value as 'production' | 'sandbox' })}
                    className="w-full px-3 py-2 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="production">Produção (Conta Real do Marketplace)</option>
                    <option value="sandbox">Sandbox / Homologação (Testes)</option>
                  </select>
                </div>

                {/* Seller ID / Shop ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {selectedPlatformId === 'shopee'
                      ? 'Shop ID (ID da Loja)'
                      : selectedPlatformId === 'mercadolivre'
                      ? 'Seller ID (User ID no Meli)'
                      : selectedPlatformId === 'amazon'
                      ? 'Merchant / Seller ID'
                      : 'ID do Vendedor / Loja'}
                  </label>
                  <input
                    type="text"
                    value={formData.seller_id || formData.shop_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seller_id: e.target.value,
                        shop_id: e.target.value
                      })
                    }
                    placeholder="Ex: 482910"
                    className="w-full px-3 py-2 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                {/* App ID / Partner ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {selectedPlatformId === 'shopee'
                      ? 'Partner ID'
                      : selectedPlatformId === 'mercadolivre'
                      ? 'App ID / Client ID'
                      : 'App / Client ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.app_id || formData.client_id || formData.partner_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        app_id: e.target.value,
                        client_id: e.target.value,
                        partner_id: e.target.value
                      })
                    }
                    placeholder="Ex: APP_USR-8294719201948"
                    className="w-full px-3 py-2 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                {/* Client Secret / Partner Key */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {selectedPlatformId === 'shopee' ? 'Partner Key (Chave Secreta)' : 'Client Secret (Chave Secreta)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showTokens['secret'] ? 'text' : 'password'}
                      value={formData.client_secret || formData.partner_key || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          client_secret: e.target.value,
                          partner_key: e.target.value
                        })
                      }
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full px-3 py-2 pr-9 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens({ ...showTokens, secret: !showTokens['secret'] })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showTokens['secret'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Access Token (Full Width) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Access Token de Produção (Bearer / OAuth 2.0)
                </label>
                <div className="relative">
                  <input
                    type={showTokens['token'] ? 'text' : 'password'}
                    value={formData.access_token || ''}
                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    placeholder="Ex: APP_USR-7281928-0904-a9e4-live-token..."
                    className="w-full px-3 py-2 pr-9 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokens({ ...showTokens, token: !showTokens['token'] })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showTokens['token'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Webhook Callback URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL de Notificação / Webhook Callback (Recebimento de Pedidos & Perguntas)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedWebhookUrl}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.1] text-xs text-slate-300 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedWebhookUrl, 'webhook')}
                    className="integration-btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'webhook' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Commission and Fees Configuration */}
            <div className="space-y-4 pt-4 border-t border-white/[0.08]">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Taxas Comerciais & Comissões do Canal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Comissão Padrão do Marketplace (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={formData.default_commission_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_commission_percent: Number(e.target.value) || 0
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Ex: 14% (Shopee padrão), 16.5% (Mercado Livre Clássico), 15% (Amazon).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Taxa Fixa por Item Vendido (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fixed_fee_per_sale}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fixed_fee_per_sale: Number(e.target.value) || 0
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1C1C22] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Ex: R$ 6,50 para vendas &lt; R$ 79 no ML, ou R$ 4,00 por item na Shopee.
                  </span>
                </div>
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Automações de Estoque 3D & Pedidos
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="integration-toggle-card flex items-start gap-3 p-3.5 rounded-2xl border border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_stock_sync}
                    onChange={(e) => setFormData({ ...formData, auto_stock_sync: e.target.checked })}
                    className="mt-0.5 rounded text-sky-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-white/20"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Auto-Sincronização de Estoque
                    </span>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Atualiza a quantidade disponível nos anúncios sempre que uma peça for impressa ou vendida.
                    </span>
                  </div>
                </label>

                <label className="integration-toggle-card flex items-start gap-3 p-3.5 rounded-2xl border border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_order_import}
                    onChange={(e) => setFormData({ ...formData, auto_order_import: e.target.checked })}
                    className="mt-0.5 rounded text-sky-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-white/20"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Importação Automática de Pedidos
                    </span>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      Cria vendas automaticamente na aba "Vendas" com as taxas descontadas e dá baixa no estoque.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between pt-5 border-t border-white/[0.08] gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="integration-btn-secondary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                  <span>{isTesting ? 'Testando API...' : 'Testar Conexão (Ping)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncStock}
                  disabled={isSyncing}
                  className="integration-btn-secondary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
                  <span>Sincronizar Estoque Agora</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveIntegration}
                disabled={isSaving}
                className="integration-btn-primary flex items-center gap-2 px-5 py-2 text-xs font-bold cursor-pointer disabled:opacity-50 ml-auto"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Configurações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MAPEAMENTO DE SKUS */}
      {activeSubTab === 'mappings' && (
        <div className="bg-[#141416] p-5 sm:p-6 rounded-3xl border border-white/[0.08] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h3 className="text-lg font-bold text-white">
                Mapeamento de SKUs (Catálogo 3D ⇄ Anúncios do Marketplace)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Vincule cada peça impressa aos anúncios do Mercado Livre, Shopee e Amazon para manter o estoque em perfeita sincronia.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMappingModal(true)}
              className="integration-btn-primary flex items-center gap-2 px-4 py-2.5 text-xs font-bold cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular Novo Anúncio / SKU</span>
            </button>
          </div>

          {/* Mappings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Canal</th>
                  <th className="py-3 px-3">Produto no Catálogo 3D</th>
                  <th className="py-3 px-3">SKU no Marketplace</th>
                  <th className="py-3 px-3">ID do Anúncio (MLB/Item)</th>
                  <th className="py-3 px-3 text-right">Preço no Canal</th>
                  <th className="py-3 px-3 text-center">Estoque Atual</th>
                  <th className="py-3 px-3 text-center">Status Sync</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {integrations.flatMap((integ) =>
                  (integ.sku_mappings || []).map((m, idx) => {
                    const prod = products.find((p) => p.id === m.internal_product_id);
                    const currentStock = prod ? prod.ready_stock_qty || 0 : m.last_synced_stock || 0;

                    return (
                      <tr key={`${integ.platform_id}-${idx}`} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${PLATFORM_META[integ.platform_id]?.badgeColor}`}>
                            {PLATFORM_META[integ.platform_id]?.name}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {m.internal_product_name || prod?.name || 'Produto Não Localizado'}
                        </td>
                        <td className="py-3 px-3 font-mono text-sky-400">
                          {m.marketplace_sku}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {m.marketplace_listing_id || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                          R$ {(m.marketplace_price || prod?.sale_price || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                            currentStock > 3
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : currentStock > 0
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {currentStock} un
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sincronizado
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveSkuMapping(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Remover mapeamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}

                {totalMappedSkus === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      Nenhum SKU mapeado ainda. Clique em "Vincular Novo Anúncio / SKU" para ligar seus produtos aos marketplaces.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SIMULADOR DE TAXAS & LUCRO POR CANAL */}
      {activeSubTab === 'simulator' && (
        <div className="bg-[#141416] p-5 sm:p-6 rounded-3xl border border-white/[0.08] space-y-6">
          <div className="pb-4 border-b border-white/[0.08]">
            <h3 className="text-lg font-bold text-white">
              Simulador Comparativo de Taxas & Lucro Líquido Real
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Compare quanto você realmente ganha em cada canal ao vender uma peça 3D, considerando custos de produção (filamento + energia + insumos), comissão da plataforma e taxa fixa.
            </p>
          </div>

          {/* Product selector & Custom Cost Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#121214] p-4 rounded-2xl border border-white/[0.08]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Escolher Peça do Catálogo
              </label>
              <select
                value={simProduct}
                onChange={(e) => setSimProduct(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Custo: R$ {(p.total_cost || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custo de Fabricação 3D (R$)
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={simCustomCost}
                onChange={(e) => setSimCustomCost(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Filamento + Energia + Depreciação + Insumos
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Preço de Venda Praticado (R$)
              </label>
              <input
                type="number"
                step="0.50"
                min="1"
                value={simCustomPrice}
                onChange={(e) => setSimCustomPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Valor bruto cobrado do cliente no anúncio
              </span>
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. Mercado Livre Clássico */}
            {(() => {
              const commPercent = 12.0;
              const fixedFee = simCustomPrice < 79 ? 6.50 : 0;
              const feeAmount = (simCustomPrice * (commPercent / 100)) + fixedFee;
              const netProfit = simCustomPrice - simCustomCost - feeAmount;
              const marginPercent = simCustomPrice > 0 ? (netProfit / simCustomPrice) * 100 : 0;

              return (
                <div className="integration-sim-card integration-sim-card-ml bg-[#18181b] p-4 rounded-2xl border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">Mercado Livre (Clássico)</span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">12% + R$ 6,50</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Preço Bruto:</span>
                      <span className="font-mono text-slate-200">R$ {Number(simCustomPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Custo Produção:</span>
                      <span className="font-mono text-slate-200">- R$ {Number(simCustomCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Taxas ML:</span>
                      <span className="font-mono">- R$ {Number(feeAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.08] flex justify-between items-baseline">
                      <span className="font-bold text-slate-200">Lucro Líquido:</span>
                      <span className={`text-base font-bold font-mono ${netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {Number(netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Margem Líquida:</span>
                      <span className="font-mono font-semibold text-sky-400">{Number(marginPercent || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. Shopee */}
            {(() => {
              const commPercent = 14.0;
              const fixedFee = 4.00;
              const feeAmount = (simCustomPrice * (commPercent / 100)) + fixedFee;
              const netProfit = simCustomPrice - simCustomCost - feeAmount;
              const marginPercent = simCustomPrice > 0 ? (netProfit / simCustomPrice) * 100 : 0;

              return (
                <div className="integration-sim-card integration-sim-card-shopee bg-[#18181b] p-4 rounded-2xl border border-orange-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400">Shopee Brasil</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-mono font-bold">14% + R$ 4,00</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Preço Bruto:</span>
                      <span className="font-mono text-slate-200">R$ {Number(simCustomPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Custo Produção:</span>
                      <span className="font-mono text-slate-200">- R$ {Number(simCustomCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Taxas Shopee:</span>
                      <span className="font-mono">- R$ {Number(feeAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.08] flex justify-between items-baseline">
                      <span className="font-bold text-slate-200">Lucro Líquido:</span>
                      <span className={`text-base font-bold font-mono ${netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {Number(netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Margem Líquida:</span>
                      <span className="font-mono font-semibold text-sky-400">{Number(marginPercent || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Amazon Brasil */}
            {(() => {
              const commPercent = 15.0;
              const fixedFee = 0.00;
              const feeAmount = (simCustomPrice * (commPercent / 100)) + fixedFee;
              const netProfit = simCustomPrice - simCustomCost - feeAmount;
              const marginPercent = simCustomPrice > 0 ? (netProfit / simCustomPrice) * 100 : 0;

              return (
                <div className="integration-sim-card integration-sim-card-amazon bg-[#18181b] p-4 rounded-2xl border border-sky-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">Amazon Brasil (SP-API)</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold">15% FBM</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Preço Bruto:</span>
                      <span className="font-mono text-slate-200">R$ {Number(simCustomPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Custo Produção:</span>
                      <span className="font-mono text-slate-200">- R$ {Number(simCustomCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>Taxas Amazon:</span>
                      <span className="font-mono">- R$ {Number(feeAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.08] flex justify-between items-baseline">
                      <span className="font-bold text-slate-200">Lucro Líquido:</span>
                      <span className={`text-base font-bold font-mono ${netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        R$ {Number(netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Margem Líquida:</span>
                      <span className="font-mono font-semibold text-sky-400">{Number(marginPercent || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 4. Venda Direta / Balcão (0% taxa) */}
            {(() => {
              const netProfit = simCustomPrice - simCustomCost;
              const marginPercent = simCustomPrice > 0 ? (netProfit / simCustomPrice) * 100 : 0;

              return (
                <div className="integration-sim-card integration-sim-card-direct bg-[#18181b] p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Venda Direta / Balcão</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">0% Taxa</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Preço Bruto:</span>
                      <span className="font-mono text-slate-200">R$ {Number(simCustomPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Custo Produção:</span>
                      <span className="font-mono text-slate-200">- R$ {Number(simCustomCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Taxas Marketplace:</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.08] flex justify-between items-baseline">
                      <span className="font-bold text-slate-200">Lucro Líquido:</span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        R$ {Number(netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Margem Líquida:</span>
                      <span className="font-mono font-semibold text-emerald-400">{Number(marginPercent || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LOGS & WEBHOOKS */}
      {activeSubTab === 'logs' && (
        <div className="bg-[#141416] p-5 sm:p-6 rounded-3xl border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div>
              <h3 className="text-lg font-bold text-white">
                Histórico de Eventos & Logs de Webhooks
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Auditoria em tempo real de requisições de estoque, importação de pedidos e diagnósticos de conectividade.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchIntegrationsData}
              className="integration-btn-secondary p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center"
              title="Atualizar logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {logs.map((log) => {
              const isSuccess = log.status === 'success';
              return (
                <div
                  key={log.id}
                  className="integration-log-row p-3.5 rounded-2xl bg-[#121214] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.platform_name}</span>
                        <span className="integration-log-badge font-mono text-[10px] px-2 py-0.5 rounded-md font-semibold">
                          {log.event_type}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-0.5">{log.message}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              );
            })}

            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                Nenhum evento registrado ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: VINCULAR NOVO SKU */}
      {showAddMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="integration-modal-wrapper bg-[#18181b] border border-white/[0.12] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-6">
            <div className="integration-modal-header flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141416]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-sky-400" />
                Vincular Peça ao Marketplace
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMappingModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Selecione o Produto da Oficina
                </label>
                <select
                  value={selectedProductForMapping}
                  onChange={(e) => {
                    setSelectedProductForMapping(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) {
                      setNewMarketplacePrice(String(prod.sale_price || 0));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Selecione um produto cadastrado...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Pronta Entrega: {p.ready_stock_qty || 0} un)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  SKU no Marketplace (Código Único do Anúncio)
                </label>
                <input
                  type="text"
                  value={newMarketplaceSku}
                  onChange={(e) => setNewMarketplaceSku(e.target.value)}
                  placeholder="Ex: MLB-CHV-SPOT-01 ou SHP-VASO-001"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ID do Anúncio / Link (Opcional)
                </label>
                <input
                  type="text"
                  value={newListingId}
                  onChange={(e) => setNewListingId(e.target.value)}
                  placeholder="Ex: MLB391820491 ou ASIN B09XYZ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preço Praticado no Marketplace (R$)
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={newMarketplacePrice}
                  onChange={(e) => setNewMarketplacePrice(e.target.value)}
                  placeholder="Ex: 24.90"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="integration-modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#141416]">
              <button
                type="button"
                onClick={() => setShowAddMappingModal(false)}
                className="integration-btn-cancel px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSkuMapping}
                className="integration-btn-primary px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Salvar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIMULAR PEDIDO DE TESTE DO MARKETPLACE */}
      {showSimulateOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="integration-modal-wrapper bg-[#18181b] border border-white/[0.12] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-6">
            <div className="integration-modal-header flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141416]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Simular Pedido de Marketplace
              </h3>
              <button
                type="button"
                onClick={() => setShowSimulateOrderModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Esta ferramenta dispara um webhook simulado de pedido aprovado, atualizando a quantidade em estoque e criando o registro completo na aba <strong>Vendas</strong>.
              </p>

              {simulateSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{simulateSuccessMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Marketplace de Origem
                </label>
                <select
                  value={simulatePlatform}
                  onChange={(e) => setSimulatePlatform(e.target.value as MarketplacePlatformId)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="mercadolivre">Mercado Livre</option>
                  <option value="shopee">Shopee Brasil</option>
                  <option value="amazon">Amazon Brasil</option>
                  <option value="shein">Shein</option>
                  <option value="elo7">Elo7</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Produto Vendido
                </label>
                <select
                  value={simulateProduct}
                  onChange={(e) => {
                    setSimulateProduct(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) setSimulatePrice(p.sale_price || 25.00);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Pronta Entrega: {p.ready_stock_qty || 0} un)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simulateQty}
                    onChange={(e) => setSimulateQty(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Preço Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={simulatePrice}
                    onChange={(e) => setSimulatePrice(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Comprador
                </label>
                <input
                  type="text"
                  value={simulateCustomer}
                  onChange={(e) => setSimulateCustomer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c20] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="integration-modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#141416]">
              <button
                type="button"
                onClick={() => setShowSimulateOrderModal(false)}
                className="integration-btn-cancel px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSimulateIncomingOrder}
                disabled={isSimulatingOrder}
                className="integration-btn-simulate flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-sm transition"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSimulatingOrder ? 'Processando Webhook...' : 'Disparar Pedido de Teste'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
