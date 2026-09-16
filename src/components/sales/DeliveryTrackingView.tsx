import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  MapPin,
  Search,
  Filter,
  Calendar,
  Edit3,
  Building2,
  ShoppingBag,
  Store,
  RotateCcw,
  Check,
  Send,
  Sparkles,
  Layers,
  ListFilter
} from 'lucide-react';
import { ProductSale, DeliveryStatus, SaleChannelType } from '../../types';

interface DeliveryTrackingViewProps {
  sales: ProductSale[];
  onRefreshData: () => void;
  onOpenNewSaleModal?: (defaultMode?: 'direct' | 'indirect' | 'consignment' | 'presale') => void;
}

export const DELIVERY_STAGES: {
  key: DeliveryStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: any;
  nextStep?: DeliveryStatus;
  nextStepLabel?: string;
}[] = [
  {
    key: 'pending',
    label: 'Aguardando Separação',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/30',
    icon: Clock,
    nextStep: 'separated',
    nextStepLabel: 'Marcar como Separado',
  },
  {
    key: 'separated',
    label: 'Separado no Estoque',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    badgeBorder: 'border-blue-500/30',
    icon: Layers,
    nextStep: 'packaged',
    nextStepLabel: 'Marcar como Embalado',
  },
  {
    key: 'packaged',
    label: 'Embalado / Pronto p/ Coleta',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/30',
    icon: Package,
    nextStep: 'shipped',
    nextStepLabel: 'Despachar / Enviar aos Correios',
  },
  {
    key: 'shipped',
    label: 'Despachado / Correios',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/30',
    icon: Truck,
    nextStep: 'delivered',
    nextStepLabel: 'Confirmar Entrega ao Cliente',
  },
  {
    key: 'in_transit',
    label: 'Em Trânsito',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-300',
    badgeBorder: 'border-cyan-500/30',
    icon: Truck,
    nextStep: 'delivered',
    nextStepLabel: 'Confirmar Entrega ao Cliente',
  },
  {
    key: 'delivered',
    label: 'Entregue ao Cliente',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  {
    key: 'picked_up',
    label: 'Retirado no Local',
    badgeBg: 'bg-teal-500/15',
    badgeText: 'text-teal-300',
    badgeBorder: 'border-teal-500/30',
    icon: Store,
  },
  {
    key: 'returned',
    label: 'Devolvido / Problema',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/30',
    icon: RotateCcw,
  },
];

export function DeliveryTrackingView({ sales, onRefreshData }: DeliveryTrackingViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState<'all' | SaleChannelType>('all');
  const [filterStage, setFilterStage] = useState<'all' | DeliveryStatus | 'active_deliveries'>('active_deliveries');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Modal de edição/detalhes de entrega
  const [editingSale, setEditingSale] = useState<ProductSale | null>(null);
  const [editStatus, setEditStatus] = useState<DeliveryStatus>('pending');
  const [editCarrier, setEditCarrier] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editCost, setEditCost] = useState<number>(0);
  const [editAddress, setEditAddress] = useState('');
  const [editEstDate, setEditEstDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Exclude consignments that are still in active consignment batch if needed,
  // but sales created via consignment acerto or direct/indirect sales are valid.
  const allSalesWithDelivery = useMemo(() => {
    return sales.map((sale) => {
      // Default to pending if not specified
      const status: DeliveryStatus = sale.delivery_status || 'pending';
      return {
        ...sale,
        delivery_status: status,
      };
    });
  }, [sales]);

  // Counts by stage
  const counts = useMemo(() => {
    const res = {
      pending: 0,
      separated: 0,
      packaged: 0,
      shipped: 0,
      delivered: 0,
      totalActive: 0,
    };
    allSalesWithDelivery.forEach((s) => {
      const st = s.delivery_status;
      if (st === 'pending') res.pending++;
      else if (st === 'separated') res.separated++;
      else if (st === 'packaged') res.packaged++;
      else if (st === 'shipped' || st === 'in_transit') res.shipped++;
      else if (st === 'delivered' || st === 'picked_up') res.delivered++;

      if (st !== 'delivered' && st !== 'picked_up' && st !== 'returned') {
        res.totalActive++;
      }
    });
    return res;
  }, [allSalesWithDelivery]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return allSalesWithDelivery.filter((sale) => {
      // Filter by stage
      if (filterStage === 'active_deliveries') {
        if (sale.delivery_status === 'delivered' || sale.delivery_status === 'picked_up' || sale.delivery_status === 'returned') {
          return false;
        }
      } else if (filterStage !== 'all') {
        if (sale.delivery_status !== filterStage) return false;
      }

      // Filter by channel
      if (filterChannel !== 'all') {
        if (sale.channel_type !== filterChannel) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchProd = sale.product_name.toLowerCase().includes(query);
        const matchClient = (sale.customer_name || '').toLowerCase().includes(query);
        const matchDoc = (sale.customer_document || '').toLowerCase().includes(query);
        const matchTracking = (sale.tracking_code || '').toLowerCase().includes(query);
        const matchCarrier = (sale.shipping_carrier || '').toLowerCase().includes(query);
        const matchChannel = (sale.channel_name || '').toLowerCase().includes(query);
        if (!matchProd && !matchClient && !matchDoc && !matchTracking && !matchCarrier && !matchChannel) {
          return false;
        }
      }

      return true;
    });
  }, [allSalesWithDelivery, filterStage, filterChannel, searchTerm]);

  const handleOpenEdit = (sale: ProductSale) => {
    setEditingSale(sale);
    setEditStatus(sale.delivery_status || 'pending');
    setEditCarrier(sale.shipping_carrier || '');
    setEditTracking(sale.tracking_code || '');
    setEditCost(sale.shipping_cost || 0);
    setEditAddress(sale.delivery_address || '');
    setEditEstDate(sale.estimated_delivery_date || '');
    setEditNotes(sale.delivery_notes || '');
    setFeedbackMsg(null);
  };

  const handleQuickAdvance = async (sale: ProductSale, nextStatus: DeliveryStatus) => {
    try {
      const payload: any = { delivery_status: nextStatus };
      if (nextStatus === 'delivered') {
        payload.delivered_at = new Date().toISOString();
      }
      const res = await fetch(`/api/sales/${encodeURIComponent(sale.id)}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        delivery_status: editStatus,
        shipping_carrier: editCarrier.trim(),
        tracking_code: editTracking.trim().toUpperCase(),
        shipping_cost: Number(editCost) || 0,
        delivery_address: editAddress.trim(),
        estimated_delivery_date: editEstDate.trim(),
        delivery_notes: editNotes.trim(),
        delivered_at: editStatus === 'delivered' ? (editingSale.delivered_at || new Date().toISOString()) : undefined,
      };

      const res = await fetch(`/api/sales/${encodeURIComponent(editingSale.id)}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar alterações da entrega');
      }

      setFeedbackMsg('Informações de entrega atualizadas com sucesso!');
      onRefreshData();
      setTimeout(() => {
        setEditingSale(null);
      }, 700);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Falha ao atualizar dados');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const getTrackingUrl = (carrier: string, code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const lowerCarrier = (carrier || '').toLowerCase();
    if (lowerCarrier.includes('correios') || trimmed.length === 13) {
      return `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(trimmed)}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent('rastreamento ' + carrier + ' ' + trimmed)}`;
  };

  const getStageInfo = (status: DeliveryStatus) => {
    return (
      DELIVERY_STAGES.find((s) => s.key === status) || {
        key: status,
        label: status,
        badgeBg: 'bg-slate-500/15',
        badgeText: 'text-slate-300',
        badgeBorder: 'border-slate-500/30',
        icon: Package,
      }
    );
  };

  const getChannelBadge = (sale: ProductSale) => {
    switch (sale.channel_type) {
      case 'indirect':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Venda Indireta
          </span>
        );
      case 'platform':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {sale.channel_name || 'Marketplace'}
          </span>
        );
      case 'cnpj':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            B2B / CNPJ
          </span>
        );
      case 'presale':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Pré-venda
          </span>
        );
      case 'consignment':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            Consignação
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Venda Direta
          </span>
        );
    }
  };

  // Kanban groups
  const kanbanColumns: {
    id: string;
    title: string;
    stageKeys: DeliveryStatus[];
    colorBorder: string;
    colorTitle: string;
    icon: any;
  }[] = [
    {
      id: 'pending',
      title: '1. A Separar',
      stageKeys: ['pending'],
      colorBorder: 'border-amber-500/30',
      colorTitle: 'text-amber-400',
      icon: Clock,
    },
    {
      id: 'separated',
      title: '2. Separado no Estoque',
      stageKeys: ['separated'],
      colorBorder: 'border-blue-500/30',
      colorTitle: 'text-blue-400',
      icon: Layers,
    },
    {
      id: 'packaged',
      title: '3. Embalado / Pronto p/ Coleta',
      stageKeys: ['packaged'],
      colorBorder: 'border-purple-500/30',
      colorTitle: 'text-purple-400',
      icon: Package,
    },
    {
      id: 'shipped',
      title: '4. Despachado / Correios',
      stageKeys: ['shipped', 'in_transit'],
      colorBorder: 'border-sky-500/30',
      colorTitle: 'text-sky-400',
      icon: Truck,
    },
    {
      id: 'delivered',
      title: '5. Entregue / Concluído',
      stageKeys: ['delivered', 'picked_up'],
      colorBorder: 'border-emerald-500/30',
      colorTitle: 'text-emerald-400',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Informativo & Resumo */}
      <div className="bg-[#141417] p-5 rounded-3xl border border-white/[0.08] flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Acompanhamento de Entrega & Expedição
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {counts.totalActive} envios ativos
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Rastreie e despache pedidos de vendas diretas, indiretas e marketplaces: desde a separação no estoque e conferência até a entrega final ao cliente.
            </p>
          </div>
        </div>

        {/* Alternador de Visão (Kanban / Tabela) na linha de baixo */}
        <div className="flex items-center gap-1.5 self-start bg-[#1c1c20] p-1.5 rounded-2xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'kanban'
                ? 'bg-emerald-600 text-white shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Etapas (Kanban)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-emerald-600 text-white shadow-lg font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Tabela / Lista</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas de Entrega */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setFilterStage(filterStage === 'pending' ? 'all' : 'pending')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStage === 'pending'
              ? 'bg-amber-500/20 border-amber-400'
              : 'bg-[#141417] border-white/[0.06] hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">1. A Separar</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-extrabold text-amber-400 mt-1 block">
            {counts.pending}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Aguardando estoque</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStage(filterStage === 'packaged' ? 'all' : 'packaged')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStage === 'packaged'
              ? 'bg-purple-500/20 border-purple-400'
              : 'bg-[#141417] border-white/[0.06] hover:border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">2. Embalados</span>
            <Package className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xl font-extrabold text-purple-400 mt-1 block">
            {counts.packaged}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Prontos para envio</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStage(filterStage === 'shipped' ? 'all' : 'shipped')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStage === 'shipped'
              ? 'bg-sky-500/20 border-sky-400'
              : 'bg-[#141417] border-white/[0.06] hover:border-sky-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">3. Em Trânsito</span>
            <Truck className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-xl font-extrabold text-sky-400 mt-1 block">
            {counts.shipped}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Correios / Transportadora</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterStage(filterStage === 'delivered' ? 'all' : 'delivered')}
          className={`p-4 rounded-2xl border text-left transition ${
            filterStage === 'delivered'
              ? 'bg-emerald-500/20 border-emerald-400'
              : 'bg-[#141417] border-white/[0.06] hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">4. Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
            {counts.delivered}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Entregues com sucesso</span>
        </button>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#141417] p-4 rounded-2xl border border-white/[0.06]">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, produto ou rastreio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-[11px] text-slate-500 whitespace-nowrap hidden sm:inline">Canal:</span>
          {[
            { label: 'Todos', value: 'all' },
            { label: 'Venda Indireta', value: 'indirect' },
            { label: 'Venda Direta', value: 'direct' },
            { label: 'Marketplaces', value: 'platform' },
            { label: 'CNPJ / B2B', value: 'cnpj' },
            { label: 'Pré-venda', value: 'presale' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterChannel(f.value as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                filterChannel === f.value
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-[#1c1c20] text-slate-400 border-white/[0.08] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setFilterStage(filterStage === 'active_deliveries' ? 'all' : 'active_deliveries')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              filterStage === 'active_deliveries'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-[#1c1c20] text-slate-400 border-white/[0.08] hover:text-white'
            }`}
            title="Ocultar itens já finalizados e exibir apenas pendências de envio"
          >
            Apenas Pendências
          </button>
        </div>
      </div>

      {/* VISÃO KANBAN DAS ETAPAS */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colSales = filteredSales.filter((s) => col.stageKeys.includes(s.delivery_status as any));
            const ColIcon = col.icon;

            return (
              <div
                key={col.id}
                className="bg-[#121215] border border-white/[0.08] rounded-3xl p-4 flex flex-col space-y-3.5 min-h-[420px]"
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <ColIcon className={`w-4 h-4 ${col.colorTitle}`} />
                    <h4 className="text-xs font-bold text-white">{col.title}</h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                    {colSales.length}
                  </span>
                </div>

                {/* Lista de Cards da Coluna */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                  {colSales.length === 0 ? (
                    <div className="py-12 text-center text-slate-600 space-y-2">
                      <ColIcon className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-[11px]">Nenhum pedido nesta etapa</p>
                    </div>
                  ) : (
                    colSales.map((sale) => {
                      const stage = getStageInfo(sale.delivery_status as any);
                      const StageIcon = stage.icon;
                      const hasTracking = Boolean(sale.tracking_code && sale.tracking_code.trim());
                      const trackingUrl = hasTracking
                        ? getTrackingUrl(sale.shipping_carrier || 'Correios', sale.tracking_code!)
                        : null;

                      return (
                        <div
                          key={sale.id}
                          className="bg-[#18181c] hover:bg-[#1e1e23] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-3.5 space-y-3 transition shadow-md"
                        >
                          {/* Cabeçalho do Card */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {new Date(sale.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <h5 className="text-xs font-bold text-white line-clamp-1 mt-0.5">
                                {sale.customer_name || 'Cliente sem nome'}
                              </h5>
                            </div>
                            <div className="shrink-0">{getChannelBadge(sale)}</div>
                          </div>

                          {/* Produto e Quantidade */}
                          <div className="bg-[#121215] p-2 rounded-xl border border-white/[0.04]">
                            <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                              {sale.quantity}x {sale.product_name}
                            </p>
                            <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                              Total: R$ {Number(sale.total_revenue || 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Transportadora e Rastreio */}
                          <div className="space-y-1 text-[10px]">
                            {sale.shipping_carrier && (
                              <div className="flex items-center gap-1 text-slate-300">
                                <Truck className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="truncate">{sale.shipping_carrier}</span>
                              </div>
                            )}

                            {hasTracking ? (
                              <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/25 rounded-lg px-2 py-1 text-sky-300 font-mono font-bold">
                                <span className="truncate">{sale.tracking_code}</span>
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(sale.tracking_code!)}
                                    className="hover:text-white p-0.5"
                                    title="Copiar código de rastreio"
                                  >
                                    {copiedTracking === sale.tracking_code ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {trackingUrl && (
                                    <a
                                      href={trackingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-white p-0.5"
                                      title="Rastrear nos Correios / Transportadora"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic block">Sem código de rastreio</span>
                            )}

                            {sale.delivery_address && (
                              <div className="flex items-start gap-1 text-slate-400 pt-0.5">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{sale.delivery_address}</span>
                              </div>
                            )}
                          </div>

                          {/* Ações do Card */}
                          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sale)}
                              className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition"
                              title="Editar transportadora, endereço e rastreio"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Detalhes</span>
                            </button>

                            {stage.nextStep && (
                              <button
                                type="button"
                                onClick={() => handleQuickAdvance(sale, stage.nextStep!)}
                                className="px-2.5 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition shadow-sm ml-auto"
                                title={stage.nextStepLabel}
                              >
                                <span>Avançar</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISÃO TABELA / LISTA DETALHADA */}
      {viewMode === 'list' && (
        <div className="bg-[#141417] border border-white/[0.08] rounded-3xl overflow-hidden">
          {filteredSales.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Truck className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">Nenhum pedido de entrega com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1c20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3.5">Data</th>
                    <th className="px-4 py-3.5">Cliente / Canal</th>
                    <th className="px-4 py-3.5">Produto</th>
                    <th className="px-4 py-3.5 text-center">Etapa Atual</th>
                    <th className="px-4 py-3.5">Transportadora / Rastreio</th>
                    <th className="px-4 py-3.5">Endereço de Entrega</th>
                    <th className="px-4 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSales.map((sale) => {
                    const stage = getStageInfo(sale.delivery_status as any);
                    const StageIcon = stage.icon;
                    const hasTracking = Boolean(sale.tracking_code && sale.tracking_code.trim());
                    const trackingUrl = hasTracking
                      ? getTrackingUrl(sale.shipping_carrier || 'Correios', sale.tracking_code!)
                      : null;

                    return (
                      <tr key={sale.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-white block">{sale.customer_name || 'Sem nome'}</span>
                          <div className="mt-1">{getChannelBadge(sale)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-200">
                            {sale.quantity}x {sale.product_name}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                            R$ {Number(sale.total_revenue || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${stage.badgeBg} ${stage.badgeText} ${stage.badgeBorder}`}
                          >
                            <StageIcon className="w-3 h-3" />
                            {stage.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1 text-xs">
                            <span className="font-medium text-white block">
                              {sale.shipping_carrier || 'Não informada'}
                            </span>
                            {hasTracking ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-mono text-[11px]">
                                <span>{sale.tracking_code}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(sale.tracking_code!)}
                                  className="hover:text-white"
                                  title="Copiar código"
                                >
                                  {copiedTracking === sale.tracking_code ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                {trackingUrl && (
                                  <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white"
                                    title="Rastrear"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Sem rastreio</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 max-w-[200px] truncate text-[11px]">
                          {sale.delivery_address || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sale)}
                              className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition"
                              title="Gerenciar Entrega"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {stage.nextStep && (
                              <button
                                type="button"
                                onClick={() => handleQuickAdvance(sale, stage.nextStep!)}
                                className="px-2.5 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition shadow-sm"
                                title={stage.nextStepLabel}
                              >
                                <span>Avançar</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EDIÇÃO E GERENCIAMENTO DA ENTREGA */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#141417] border border-sky-500/30 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gerenciar Envio & Entrega do Pedido</h3>
                  <p className="text-[11px] text-slate-400">
                    Cliente: <strong className="text-white">{editingSale.customer_name || 'Não informado'}</strong> | {editingSale.quantity}x {editingSale.product_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-4 text-xs">
              {/* Status da Entrega */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Etapa / Status Atual do Pedido <span className="text-rose-400">*</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 font-bold"
                >
                  {DELIVERY_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transportadora e Frete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Transportadora / Método de Envio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Correios (SEDEX), PAC, Mercado Envios, Jadlog..."
                    value={editCarrier}
                    onChange={(e) => setEditCarrier(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Custo do Frete (R$)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="0.00"
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              {/* Código de Rastreio */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Código de Rastreamento (Correios / Transportadora)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: QB123456789BR, LOG1234567, etc."
                    value={editTracking}
                    onChange={(e) => setEditTracking(e.target.value.toUpperCase())}
                    className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl pl-3 pr-24 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-sky-400"
                  />
                  {editTracking && (
                    <a
                      href={getTrackingUrl(editCarrier, editTracking) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1.5 px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center gap-1 hover:bg-sky-500/30"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Testar Link
                    </a>
                  )}
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Endereço Completo de Entrega
                </label>
                <textarea
                  rows={2}
                  placeholder="Rua, Número, Complemento, Bairro, Cidade - UF, CEP..."
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              {/* Previsão de Entrega & Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Previsão de Entrega (Estimativa)
                  </label>
                  <input
                    type="date"
                    value={editEstDate}
                    onChange={(e) => setEditEstDate(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Observações do Envio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Declaração de conteúdo anexada..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {feedbackMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feedbackMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
