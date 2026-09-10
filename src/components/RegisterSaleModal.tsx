import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Building2,
  User,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Store,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Users,
  Truck
} from 'lucide-react';
import { Product, ProductSale, SaleChannelType, Client, ShippingCarrier } from '../types';
import { safeFetchJson } from '../utils/api';

interface RegisterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  preselectedProduct?: Product | null;
  onSaleSuccess: (sale: ProductSale, updatedProduct?: Product) => void;
  onRefreshData?: () => void;
  defaultSaleMode?: 'direct' | 'indirect' | 'consignment' | 'presale';
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  ready_stock_qty: number;
}

export function RegisterSaleModal({
  isOpen,
  onClose,
  products,
  preselectedProduct,
  onSaleSuccess,
  onRefreshData,
  defaultSaleMode = 'direct',
}: RegisterSaleModalProps) {
  const [saleMode, setSaleMode] = useState<'direct' | 'indirect' | 'consignment' | 'presale'>(defaultSaleMode);
  const [channelType, setChannelType] = useState<SaleChannelType>(defaultSaleMode === 'consignment' ? 'consignment' : 'pf');

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientType, setNewClientType] = useState<'pf' | 'cnpj' | 'store'>(defaultSaleMode === 'consignment' ? 'store' : 'pf');
  const [newClientDoc, setNewClientDoc] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientAddress, setNewClientAddress] = useState<string>('');

  // Cart / Items (supports single or multiple products)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [currentQty, setCurrentQty] = useState<number>(1);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Platform & Payment
  const [platformName, setPlatformName] = useState<string>('Mercado Livre');
  const [customPlatform, setCustomPlatform] = useState<string>('');
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(14);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Carriers & Shipping cost
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('none');
  const [shippingCost, setShippingCost] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load clients and carriers
  useEffect(() => {
    if (isOpen) {
      setSaleMode(defaultSaleMode);
      setChannelType(defaultSaleMode === 'consignment' ? 'consignment' : 'pf');
      setNewClientType(defaultSaleMode === 'consignment' ? 'store' : 'pf');
      setSelectedCarrierId('none');
      setShippingCost(0);
      fetchClients();
      fetchCarriers();
    }
  }, [isOpen, defaultSaleMode]);

  const fetchClients = async () => {
    try {
      const data = await safeFetchJson<Client[]>('/api/clients', undefined, []);
      if (Array.isArray(data)) {
        setClients(data);
        if (data.length > 0 && !selectedClientId) {
          setSelectedClientId(data[0].id);
        }
      }
    } catch {}
  };

  const fetchCarriers = async () => {
    try {
      const data = await safeFetchJson<ShippingCarrier[]>('/api/carriers', undefined, []);
      if (Array.isArray(data)) {
        setCarriers(data);
      }
    } catch {}
  };

  // Initialize product selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsCreatingClient(false);
      if (products.length > 0) {
        const prod = preselectedProduct || products[0];
        setCurrentProductId(prod.id);
        setCurrentPrice(prod.sale_price || prod.suggested_price || 0);
        setCurrentQty(1);
        setCartItems([
          {
            product_id: prod.id,
            product_name: prod.name,
            quantity: 1,
            unit_price: prod.sale_price || prod.suggested_price || 0,
            unit_cost: prod.total_cost || 0,
            ready_stock_qty: prod.ready_stock_qty || 0,
          },
        ]);
      }
    }
  }, [isOpen, preselectedProduct, products]);

  // Handle product dropdown change
  const handleProductSelect = (prodId: string) => {
    setCurrentProductId(prodId);
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setCurrentPrice(found.sale_price || found.suggested_price || 0);
    }
  };

  const handleAddCartItem = () => {
    const prod = products.find((p) => p.id === currentProductId);
    if (!prod) return;

    const existingIndex = cartItems.findIndex((item) => item.product_id === prod.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += currentQty;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: currentQty,
          unit_price: currentPrice,
          unit_cost: prod.total_cost || 0,
          ready_stock_qty: prod.ready_stock_qty || 0,
        },
      ]);
    }
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setErrorMsg('Informe o nome do cliente.');
      return;
    }
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          type: newClientType,
          document: newClientDoc,
          phone: newClientPhone,
          address: newClientAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar cliente');
      
      setClients([...clients, data]);
      setSelectedClientId(data.id);
      setIsCreatingClient(false);
      setNewClientName('');
      setNewClientDoc('');
      setNewClientPhone('');
      setNewClientAddress('');
      setErrorMsg(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Financial totals
  const subtotalRevenue = cartItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const totalRevenue = subtotalRevenue + (Number(shippingCost) || 0);
  const totalCost = cartItems.reduce((acc, item) => acc + item.quantity * item.unit_cost, 0);
  const feeAmount = channelType === 'platform' ? subtotalRevenue * (platformFeePercent / 100) : 0;
  const netProfit = totalRevenue - totalCost - feeAmount - (Number(shippingCost) || 0);
  const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setErrorMsg('Adicione pelo menos 1 produto à lista.');
      return;
    }
    const clientName = selectedClient ? selectedClient.name : 'Cliente Balcão';

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (saleMode === 'consignment') {
        if (!selectedClientId) {
          setErrorMsg('Selecione ou cadastre a loja parceira (cliente) para registrar a consignação.');
          setIsSubmitting(false);
          return;
        }
        const payload = {
          client_id: selectedClientId || null,
          client_name: clientName,
          notes,
          items: cartItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity_consigned: item.quantity,
            unit_price: item.unit_price,
          })),
        };

        const res = await fetch('/api/consignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar consignação');

        if (onRefreshData) onRefreshData();
        onClose();
      } else {
        let lastCreatedSale: ProductSale | null = null;
        let lastUpdatedProd: Product | null = null;

        for (const item of cartItems) {
          let finalChannelName = '';
          if (channelType === 'platform') {
            finalChannelName = platformName === 'Outro' ? (customPlatform || 'Marketplace') : platformName;
          } else if (channelType === 'cnpj') {
            finalChannelName = `CNPJ: ${clientName}`;
          } else if (channelType === 'presale') {
            finalChannelName = `Pré-venda: ${clientName}`;
          } else if (channelType === 'indirect') {
            finalChannelName = `Venda Indireta: ${clientName}`;
          } else {
            finalChannelName = `Venda Direta: ${clientName}`;
          }

          const selectedCarrier = carriers.find(c => c.id === selectedCarrierId);
          const carrierLabel = selectedCarrier ? `${selectedCarrier.name} (R$ ${(Number(shippingCost) || 0).toFixed(2)})` : (shippingCost > 0 ? `Frete Personalizado (R$ ${(Number(shippingCost) || 0).toFixed(2)})` : 'Sem Frete');

          const payload = {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            channel_type: channelType,
            channel_name: finalChannelName,
            customer_document: selectedClient?.document || null,
            customer_name: clientName,
            platform_fee_percent: channelType === 'platform' ? platformFeePercent : 0,
            payment_method: channelType === 'platform' ? `Marketplace (${finalChannelName})` : paymentMethod,
            shipping_cost: Number(shippingCost) || 0,
            carrier_name: selectedCarrier?.name || (shippingCost > 0 ? 'Outro' : null),
            notes: [
              invoiceNumber ? `NF: ${invoiceNumber}` : '',
              carrierLabel ? `Envio: ${carrierLabel}` : '',
              saleMode === 'presale' ? '[Pré-venda Reservada]' : '',
              notes ? notes : ''
            ].filter(Boolean).join(' | ') || null,
          };

          const res = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao registrar venda');
          lastCreatedSale = data.sale;
          lastUpdatedProd = data.updatedProduct;
        }

        if (lastCreatedSale) {
          onSaleSuccess(lastCreatedSale, lastUpdatedProd);
        }
        if (onRefreshData) onRefreshData();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar operação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-[#18181b] border border-white/[0.12] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Registrar Venda, Pré-venda ou Consignação
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fluxo Guiado
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Siga a ordem: Tipo de Venda, Tipo de Cliente, Seleção do Cliente e Produtos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. TIPO DE VENDA */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              1. Tipo de Venda <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaleMode('direct');
                  setChannelType('pf');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  saleMode === 'direct'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-5 h-5 mb-1 text-emerald-400" />
                <span className="text-xs font-bold">Venda Direta</span>
                <span className="text-[10px] text-slate-400">Consumidor Final</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaleMode('indirect');
                  setChannelType('platform');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  saleMode === 'indirect'
                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 shadow-md'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-5 h-5 mb-1 text-teal-400" />
                <span className="text-xs font-bold">Venda Indireta</span>
                <span className="text-[10px] text-slate-400">Marketplace / Revenda</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaleMode('consignment');
                  setChannelType('consignment');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  saleMode === 'consignment'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-5 h-5 mb-1 text-amber-400" />
                <span className="text-xs font-bold">Consignada</span>
                <span className="text-[10px] text-slate-400">Expositor / Loja</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaleMode('presale');
                  setChannelType('presale');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  saleMode === 'presale'
                    ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 shadow-md'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mb-1 text-indigo-400" />
                <span className="text-xs font-bold">Pré-venda</span>
                <span className="text-[10px] text-slate-400">Reserva de Itens</span>
              </button>
            </div>
          </div>

          {/* 2. TIPO DO CLIENTE */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              2. Tipo do Cliente / Canal <span className="text-rose-400">*</span>
            </label>
            {saleMode === 'direct' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannelType('pf')}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${channelType === 'pf' ? 'bg-sky-500/20 text-sky-300 border-sky-500' : 'bg-[#1c1c20] text-slate-400 border-white/[0.08]'}`}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  onClick={() => setChannelType('cnpj')}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${channelType === 'cnpj' ? 'bg-purple-500/20 text-purple-300 border-purple-500' : 'bg-[#1c1c20] text-slate-400 border-white/[0.08]'}`}
                >
                  Empresa (CNPJ / B2B)
                </button>
              </div>
            )}
            {saleMode === 'indirect' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannelType('platform')}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${channelType === 'platform' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-[#1c1c20] text-slate-400 border-white/[0.08]'}`}
                >
                  Marketplace (Mercado Livre, Shopee...)
                </button>
                <button
                  type="button"
                  onClick={() => setChannelType('cnpj')}
                  className={`p-2.5 rounded-xl border text-xs font-bold ${channelType === 'cnpj' ? 'bg-purple-500/20 text-purple-300 border-purple-500' : 'bg-[#1c1c20] text-slate-400 border-white/[0.08]'}`}
                >
                  Loja Revendedora (CNPJ)
                </button>
              </div>
            )}
            {saleMode === 'consignment' && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <Store className="w-4 h-4" />
                <span>Consignação em Loja Parceira ou Expositor</span>
              </div>
            )}
            {saleMode === 'presale' && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Pré-venda / Encomenda com Reserva de Estoque</span>
              </div>
            )}
          </div>

          {/* 3. SELEÇÃO DO CLIENTE & OPÇÃO PARA ADICIONAR NOVO */}
          <div className="space-y-2 bg-[#121214] p-4 rounded-2xl border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                3. Seleção do Cliente
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingClient(!isCreatingClient)}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingClient ? 'Cancelar Novo Cliente' : 'Adicionar Novo Cliente'}
              </button>
            </div>

            {isCreatingClient ? (
              <div className="space-y-3 pt-2 animate-fadeIn bg-[#18181b] p-3.5 rounded-xl border border-sky-500/30">
                <div className="text-xs font-bold text-sky-300">Cadastrar Novo Cliente</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Cliente / Loja *"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newClientType}
                    onChange={(e: any) => setNewClientType(e.target.value)}
                    className="bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="pf">Pessoa Física</option>
                    <option value="cnpj">CNPJ / Empresa</option>
                    <option value="store">Loja Parceira (Consignação)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="CPF ou CNPJ"
                    value={newClientDoc}
                    onChange={(e) => setNewClientDoc(e.target.value)}
                    className="bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Telefone / WhatsApp"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewClient}
                  className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Salvar Cliente e Selecionar
                </button>
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
              >
                {clients.length === 0 && <option value="">Nenhum cliente cadastrado (Clique em Adicionar)</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type.toUpperCase()}) {c.document ? `- ${c.document}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Platform specific settings if marketplace */}
          {channelType === 'platform' && (
            <div className="p-4 rounded-2xl bg-[#141417] border border-amber-500/20 space-y-3 animate-fadeIn">
              <div className="text-xs font-semibold text-amber-300">Plataforma Marketplace</div>
              <div className="flex flex-wrap gap-1.5">
                {['Mercado Livre', 'Shopee', 'Amazon', 'Elo7', 'Outro'].map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      setPlatformName(plat);
                      setPlatformFeePercent(plat === 'Amazon' ? 15 : plat === 'Elo7' ? 12 : 14);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      platformName === plat ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#1c1c20] text-slate-300 border-white/[0.08]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ID do Pedido</label>
                  <input
                    type="text"
                    placeholder="Ex: #MLB-9382"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. PRODUTO OU OS PRODUTOS VENDIDOS OU CONSIGNADOS */}
          <div className="space-y-3 bg-[#121214] p-4 rounded-2xl border border-white/[0.06]">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-400" />
              4. Seleção de Produtos ({saleMode === 'consignment' ? 'Consignados' : 'Vendidos'})
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-6">
                <label className="text-[11px] text-slate-400 block mb-1">Produto Pronto</label>
                <select
                  value={currentProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Estoque: {p.ready_stock_qty || 0} un) - R$ {(p.sale_price || p.suggested_price || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 block mb-1">Qtd</label>
                <input
                  type="number"
                  min={1}
                  value={currentQty}
                  onChange={(e) => setCurrentQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] text-slate-400 block mb-1">Preço Un. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddCartItem}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold flex items-center justify-center transition"
                  title="Adicionar item"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cart Items Table */}
            {cartItems.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-[#1c1c20] text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2 text-center">Qtd</th>
                      <th className="px-3 py-2 text-right">Preço Un.</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-medium text-white">{item.product_name}</td>
                        <td className="px-3 py-2 text-center font-bold text-sky-400">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">R$ {Number(item.unit_price || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-400">R$ {Number((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(idx)}
                            className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. TRANSPORTADORA / GASTOS COM ENVIO */}
          {saleMode !== 'consignment' && (
            <div className="space-y-2 bg-[#121215] border border-white/[0.08] p-4 rounded-2xl">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-sky-400" />
                  5. Transportadora / Gastos com Envio
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional (ex: Venda Direta PF)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={selectedCarrierId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedCarrierId(cid);
                      if (cid === 'none' || cid === 'custom') {
                        if (cid === 'none') setShippingCost(0);
                      } else {
                        const found = carriers.find(c => c.id === cid);
                        if (found) setShippingCost(found.default_cost);
                      }
                    }}
                    className="w-full bg-[#0a0a0b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="none">Sem Custos com Envio (Retirada / PF Direta)</option>
                    {carriers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.service_type}) - R$ {Number(c.default_cost || 0).toFixed(2)}
                      </option>
                    ))}
                    <option value="custom">Outro / Valor Personalizado</option>
                  </select>
                </div>

                <div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value)))}
                      placeholder="0.00"
                      className="w-full bg-[#0a0a0b] border border-white/[0.1] rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. FORMA DE PAGAMENTO (SE VENDA) OU OBSERVAÇÕES */}
          {saleMode !== 'consignment' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                6. Forma de Pagamento <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === method ? 'bg-sky-500 text-white border-sky-400' : 'bg-[#1c1c20] text-slate-300 border-white/[0.08]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="p-3.5 rounded-2xl bg-[#111113] border border-white/[0.08] flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Total Geral da Operação</span>
              <span className="text-base font-extrabold text-emerald-400">R$ {Number(totalRevenue || 0).toFixed(2)}</span>
            </div>
            {saleMode !== 'consignment' && (
              <div className="text-right">
                <span className="text-slate-400 block">Lucro Líquido Estimado</span>
                <span className="text-sm font-bold text-sky-400">R$ {Number(netProfit || 0).toFixed(2)} ({Number(profitMarginPercent || 0).toFixed(0)}%)</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || cartItems.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Processando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {saleMode === 'consignment' ? 'Registrar Consignação em Expositor' : 'Confirmar Venda & Baixar Estoque'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
