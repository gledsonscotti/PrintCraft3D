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
  CreditCard
} from 'lucide-react';
import { Product, ProductSale, SaleChannelType } from '../types';

interface RegisterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  preselectedProduct?: Product | null;
  onSaleSuccess: (sale: ProductSale, updatedProduct?: Product) => void;
}

export function RegisterSaleModal({
  isOpen,
  onClose,
  products,
  preselectedProduct,
  onSaleSuccess,
}: RegisterSaleModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Canal de venda: 'platform' | 'cnpj' | 'pf'
  const [channelType, setChannelType] = useState<SaleChannelType>('platform');
  const [platformName, setPlatformName] = useState<string>('Mercado Livre');
  const [customPlatform, setCustomPlatform] = useState<string>('');
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(14);

  // Dados CNPJ
  const [companyName, setCompanyName] = useState<string>('');
  const [companyCnpj, setCompanyCnpj] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // Dados PF
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCpf, setCustomerCpf] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');

  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quando abre ou muda o preselectedProduct
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (preselectedProduct) {
        setSelectedProductId(preselectedProduct.id);
        setUnitPrice(preselectedProduct.sale_price || preselectedProduct.suggested_price || 0);
        setQuantity(1);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
        setUnitPrice(products[0].sale_price || products[0].suggested_price || 0);
        setQuantity(1);
      }
    }
  }, [isOpen, preselectedProduct, products]);

  // Atualiza preço unitário se usuário trocar de produto
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const found = products.find((p) => p.id === prodId);
    if (found) {
      setUnitPrice(found.sale_price || found.suggested_price || 0);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = selectedProduct?.ready_stock_qty ?? 0;
  const isOutOfStock = currentStock <= 0;
  const isStockInsufficient = quantity > currentStock;

  // Cálculos financeiros
  const totalRevenue = quantity * unitPrice;
  const unitCost = selectedProduct?.total_cost || 0;
  const totalCost = unitCost * quantity;
  const feeAmount = channelType === 'platform' ? totalRevenue * (platformFeePercent / 100) : 0;
  const netProfit = totalRevenue - totalCost - feeAmount;
  const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setErrorMsg('Selecione um produto para realizar a venda.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('A quantidade vendida deve ser de pelo menos 1 unidade.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let finalChannelName = '';
    let doc = '';
    let clientName = '';

    if (channelType === 'platform') {
      finalChannelName = platformName === 'Outro' ? (customPlatform || 'Outra Plataforma') : platformName;
      clientName = customerName ? `${customerName} (${finalChannelName})` : finalChannelName;
    } else if (channelType === 'cnpj') {
      finalChannelName = `CNPJ: ${companyName || 'Cliente Corporativo'}`;
      doc = companyCnpj;
      clientName = companyName;
    } else {
      finalChannelName = `Pessoa Física: ${customerName || 'Balcão / Direto'}`;
      doc = customerCpf;
      clientName = customerName;
    }

    const payload = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      unit_price: unitPrice,
      channel_type: channelType,
      channel_name: finalChannelName,
      customer_document: doc || null,
      customer_name: clientName || null,
      platform_fee_percent: channelType === 'platform' ? platformFeePercent : 0,
      payment_method: channelType === 'platform' ? `Marketplace (${finalChannelName})` : paymentMethod,
      notes: [
        invoiceNumber ? `NF: ${invoiceNumber}` : '',
        notes ? notes : ''
      ].filter(Boolean).join(' | ') || null,
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar venda');
      }

      onSaleSuccess(data.sale, data.updatedProduct);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao comunicar com o servidor');
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
                Registrar Venda & Baixa de Estoque
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pronto para Entrega
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Especifique o canal de venda (Plataforma, CNPJ ou PF) e debite o estoque automaticamente.
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Seleção do Produto & Estoque */}
          <div className="space-y-3 bg-[#121214] p-4 rounded-2xl border border-white/[0.06]">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-400" />
                Produto para Venda
              </span>
              {selectedProduct && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    currentStock > 0
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {currentStock > 0 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {currentStock} un. prontas em estoque
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Estoque Zerado
                    </>
                  )}
                </span>
              )}
            </label>

            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
            >
              {products.length === 0 && <option value="">Nenhum produto cadastrado</option>}
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Estoque: {p.ready_stock_qty || 0} un. (Preço: R$ {(p.sale_price || p.suggested_price || 0).toFixed(2)})
                </option>
              ))}
            </select>

            {/* Aviso se estoque for zero ou insuficiente */}
            {isOutOfStock && (
              <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Atenção: Este item está zerado no estoque pronto. A venda será registrada e o saldo ficará em alerta até nova impressão.
                </span>
              </div>
            )}
          </div>

          {/* 2. Quantidade e Preço Unitário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Quantidade Vendida
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-sm text-white font-bold focus:border-sky-500 focus:outline-none"
                />
                {currentStock > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(currentStock)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 whitespace-nowrap border border-white/[0.08]"
                    title="Preencher com todo o estoque disponível"
                  >
                    Tudo ({currentStock})
                  </button>
                )}
              </div>
              {isStockInsufficient && currentStock > 0 && (
                <p className="text-[11px] text-amber-400 mt-1">
                  Quantidade maior do que o estoque pronto atual ({currentStock} un).
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Preço Unitário de Venda (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl pl-9 pr-3 py-2 text-sm text-white font-bold focus:border-sky-500 focus:outline-none"
                />
              </div>
              {selectedProduct && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Custo base de fabricação: R$ {(selectedProduct.total_cost || 0).toFixed(2)} / un.
                </p>
              )}
            </div>
          </div>

          {/* 3. Especificação do Canal de Venda (Requisito Central) */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Canal de Venda / Tipo de Cliente <span className="text-rose-400">*</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannelType('platform')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  channelType === 'platform'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Store className="w-5 h-5 mb-1 text-amber-400" />
                <span className="text-xs font-bold">Plataforma</span>
                <span className="text-[10px] text-slate-400">Mercado Livre, Shopee...</span>
              </button>

              <button
                type="button"
                onClick={() => setChannelType('cnpj')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  channelType === 'cnpj'
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-md shadow-purple-500/10'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Building2 className="w-5 h-5 mb-1 text-purple-400" />
                <span className="text-xs font-bold">Empresa (CNPJ)</span>
                <span className="text-[10px] text-slate-400">Brindes B2B, Nota Fiscal</span>
              </button>

              <button
                type="button"
                onClick={() => setChannelType('pf')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  channelType === 'pf'
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-md shadow-sky-500/10'
                    : 'bg-[#1c1c20] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <User className="w-5 h-5 mb-1 text-sky-400" />
                <span className="text-xs font-bold">Pessoa Física</span>
                <span className="text-[10px] text-slate-400">Balcão, WhatsApp, PIX</span>
              </button>
            </div>

            {/* Campos Específicos: Plataforma */}
            {channelType === 'platform' && (
              <div className="p-4 rounded-2xl bg-[#141417] border border-amber-500/20 space-y-3 animate-fadeIn">
                <div className="text-xs font-semibold text-amber-300 flex items-center justify-between">
                  <span>Selecione a Plataforma de Venda</span>
                  <span className="text-[11px] text-slate-400">Deduz comissão do lucro líquido</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Mercado Livre', fee: 14 },
                    { name: 'Shopee', fee: 14 },
                    { name: 'Amazon', fee: 15 },
                    { name: 'Elo7', fee: 12 },
                    { name: 'Site Próprio', fee: 4 },
                    { name: 'Outro', fee: 0 }
                  ].map((plat) => (
                    <button
                      key={plat.name}
                      type="button"
                      onClick={() => {
                        setPlatformName(plat.name);
                        setPlatformFeePercent(plat.fee);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        platformName === plat.name
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-[#1c1c20] text-slate-300 border-white/[0.08] hover:bg-white/[0.06]'
                      }`}
                    >
                      {plat.name} ({plat.fee}%)
                    </button>
                  ))}
                </div>

                {platformName === 'Outro' && (
                  <input
                    type="text"
                    placeholder="Nome da plataforma ou marketplace..."
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Taxa / Comissão da Plataforma (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={100}
                        value={platformFeePercent}
                        onChange={(e) => setPlatformFeePercent(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      ID do Pedido / Comprador (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: #MLB-3918239 ou Nome"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campos Específicos: CNPJ */}
            {channelType === 'cnpj' && (
              <div className="p-4 rounded-2xl bg-[#141417] border border-purple-500/20 space-y-3 animate-fadeIn">
                <div className="text-xs font-semibold text-purple-300">
                  Dados da Empresa Compradora (Venda Corporativa / B2B)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Razão Social / Nome Fantasia <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Studio Wave Música LTDA"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={companyCnpj}
                      onChange={(e) => setCompanyCnpj(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Número da Nota Fiscal (NF-e)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF 00124"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Condição de Pagamento
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="PIX CNPJ">PIX CNPJ (À Vista)</option>
                      <option value="Boleto Bancário Faturado">Boleto Faturado 15/30 Dias</option>
                      <option value="Transferência / TED">Transferência / TED</option>
                      <option value="Cartão Corporativo">Cartão de Crédito</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Campos Específicos: Pessoa Física */}
            {channelType === 'pf' && (
              <div className="p-4 rounded-2xl bg-[#141417] border border-sky-500/20 space-y-3 animate-fadeIn">
                <div className="text-xs font-semibold text-sky-300">
                  Dados do Cliente Pessoa Física (Venda Direta / Balcão)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Eduardo (WhatsApp)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(e.target.value)}
                      className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                            paymentMethod === method
                              ? 'bg-sky-500 text-white border-sky-400'
                              : 'bg-[#1c1c20] text-slate-300 border-white/[0.08] hover:bg-white/[0.06]'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Resumo Financeiro & Impacto no Estoque */}
          <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-white/[0.06] pb-2">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Resumo da Venda & Lucratividade
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Baixa de {quantity} un. no estoque
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-[#18181b] border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Faturamento Bruto</span>
                <span className="text-sm font-bold text-white">
                  R$ {totalRevenue.toFixed(2)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#18181b] border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Custo de Produção</span>
                <span className="text-sm font-bold text-slate-300">
                  - R$ {totalCost.toFixed(2)}
                </span>
              </div>

              {channelType === 'platform' && (
                <div className="p-2.5 rounded-xl bg-[#18181b] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Taxa Plataforma ({platformFeePercent}%)</span>
                  <span className="text-sm font-bold text-amber-400">
                    - R$ {feeAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className={`p-2.5 rounded-xl border ${channelType !== 'platform' ? 'col-span-2' : ''} ${
                netProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
              }`}>
                <span className="text-[10px] text-slate-400 block">Lucro Líquido Real</span>
                <span className={`text-sm font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {netProfit.toFixed(2)} ({profitMarginPercent.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Saldo de estoque restante */}
            <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-400">
              <span>Saldo em estoque após esta venda:</span>
              <span className={`font-bold ${currentStock - quantity >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {Math.max(0, currentStock - quantity)} unidades
              </span>
            </div>
          </div>

          {/* Footer Ações */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Gravando venda...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Venda & Baixar do Estoque
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
