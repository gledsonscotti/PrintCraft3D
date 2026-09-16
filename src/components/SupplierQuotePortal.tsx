import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Send,
  Package,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  ShieldCheck,
  FileText,
  Printer
} from 'lucide-react';
import { ProposalItemResponse, QuoteRoundItem } from '../types';

interface SupplierQuotePortalProps {
  token?: string;
  onBack?: () => void;
  isSimulated?: boolean;
}

export const SupplierQuotePortal: React.FC<SupplierQuotePortalProps> = ({
  token: initialToken,
  onBack,
  isSimulated = false,
}) => {
  // Extract token from prop or URL query parameter
  const token = initialToken || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quote_token') || '' : '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Loaded data from public API
  const [round, setRound] = useState<any | null>(null);
  const [items, setItems] = useState<QuoteRoundItem[]>([]);
  const [supplier, setSupplier] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [existingProposal, setExistingProposal] = useState<any | null>(null);

  // Form states
  const [itemResponses, setItemResponses] = useState<Record<string, {
    available: boolean;
    brand_model: string;
    unit_price: number;
    notes: string;
  }>>({});

  const [shippingType, setShippingType] = useState<'free' | 'carrier' | 'pickup'>('free');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [carrierName, setCarrierName] = useState<string>('');
  const [deliveryLeadDays, setDeliveryLeadDays] = useState<number>(3);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [paymentTerms, setPaymentTerms] = useState<string>('PIX com desconto');
  const [installmentsDetails, setInstallmentsDetails] = useState<string>('');
  const [supplierNotes, setSupplierNotes] = useState<string>('');

  // Fetch RFP data using the token
  const loadPortalData = async () => {
    if (!token) {
      setError('Token de acesso à cotação não fornecido. Acesse o link exclusivo enviado no convite.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/quote-round/${token}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Não foi possível carregar a cotação solicitada');
      }

      const data = await res.json();
      setRound(data.round);
      setItems(data.items || []);
      setSupplier(data.supplier);
      setCompany(data.company);
      setExistingProposal(data.existing_proposal);

      // Initialize item responses
      const initialResponses: Record<string, any> = {};
      (data.items || []).forEach((it: QuoteRoundItem) => {
        // If already submitted in an existing proposal, pre-fill
        const existingItem = data.existing_proposal?.items?.find((pIt: ProposalItemResponse) => pIt.item_id === it.id);
        if (existingItem) {
          initialResponses[it.id] = {
            available: existingItem.available !== false,
            brand_model: existingItem.brand_model || '',
            unit_price: existingItem.unit_price || 0,
            notes: existingItem.notes || ''
          };
        } else {
          initialResponses[it.id] = {
            available: true,
            brand_model: '',
            unit_price: 0,
            notes: ''
          };
        }
      });
      setItemResponses(initialResponses);

      // Pre-fill commercial terms if existing
      if (data.existing_proposal) {
        setShippingType(data.existing_proposal.shipping_type || 'free');
        setShippingCost(data.existing_proposal.shipping_cost || 0);
        setCarrierName(data.existing_proposal.carrier_name || '');
        setDeliveryLeadDays(data.existing_proposal.delivery_lead_days || 3);
        setInstallmentsCount(data.existing_proposal.installments_count || 1);
        setPaymentTerms(data.existing_proposal.payment_terms || 'Boleto Faturado');
        setInstallmentsDetails(data.existing_proposal.installments_details || '');
        setSupplierNotes(data.existing_proposal.supplier_notes || '');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados da cotação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [token]);

  // Calculations
  const subtotalProducts = items.reduce((sum, item) => {
    const resp = itemResponses[item.id];
    if (resp && resp.available) {
      return sum + (Number(resp.unit_price) || 0) * (Number(item.quantity) || 1);
    }
    return sum;
  }, 0);

  const finalShipping = shippingType === 'free' ? 0 : (Number(shippingCost) || 0);
  const grandTotal = subtotalProducts + finalShipping;

  // Deadline calculation
  const isDeadlinePassed = round?.deadline ? new Date() > new Date(round.deadline) : false;
  const formattedDeadline = round?.deadline
    ? new Date(round.deadline).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Check if at least one item is marked available with price
    const hasAvailableItem = items.some((it) => {
      const resp = itemResponses[it.id];
      return resp && resp.available && resp.unit_price > 0;
    });

    if (!hasAvailableItem) {
      alert('Por favor, informe o preço de pelo menos um dos itens disponíveis para participar da cotação.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formattedItems = items.map((it) => {
        const resp = itemResponses[it.id] || { available: false, brand_model: '', unit_price: 0, notes: '' };
        const uPrice = Number(resp.unit_price) || 0;
        const qty = Number(it.quantity) || 1;
        return {
          item_id: it.id,
          item_name: it.name,
          available: Boolean(resp.available),
          brand_model: resp.brand_model,
          unit_price: uPrice,
          total_price: resp.available ? uPrice * qty : 0,
          notes: resp.notes
        };
      });

      const payload = {
        items: formattedItems,
        shipping_type: shippingType,
        shipping_cost: finalShipping,
        carrier_name: carrierName,
        delivery_lead_days: Number(deliveryLeadDays) || 3,
        payment_terms: paymentTerms,
        installments_count: Number(installmentsCount) || 1,
        installments_details: installmentsDetails,
        supplier_notes: supplierNotes
      };

      const res = await fetch(`/api/public/quote-round/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao enviar proposta comercial');
      }

      const resData = await res.json();
      setSuccessData({
        ...resData,
        roundTitle: round.title,
        supplierName: supplier.supplier_name,
        companyName: company?.name || company?.trade_name || 'Oficina 3D',
        subtotal: subtotalProducts,
        shipping: finalShipping,
        total: grandTotal,
        installments: `${installmentsCount}x (${paymentTerms})`
      });
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar proposta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-bold">Carregando Solicitação de Cotação...</h2>
          <p className="text-sm text-slate-400">Verificando token de acesso seguro do fornecedor.</p>
        </div>
      </div>
    );
  }

  if (error && !round) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
        <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 max-w-lg text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-red-400">Acesso Não Autorizado ou Expirado</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition"
            >
              Voltar ao Sistema
            </button>
          )}
        </div>
      </div>
    );
  }

  // Success view
  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider">
              Proposta Comercial Registrada
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Obrigado pela sua Cotação!</h1>
            <p className="text-sm text-slate-300">
              Sua proposta foi transmitida com sucesso para o setor de compras de <strong>{successData.companyName}</strong>.
            </p>
          </div>

          {/* Receipt summary box */}
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5 text-left space-y-3 text-sm">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-slate-400">Fornecedor Participante:</span>
              <span className="font-bold text-white">{successData.supplierName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-slate-400">Cotação / Solicitação:</span>
              <span className="font-medium text-amber-300 text-right">{successData.roundTitle}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-slate-400">Subtotal dos Produtos:</span>
              <span className="font-bold text-white">
                R$ {Number(successData.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-slate-400">Frete / Transportadora:</span>
              <span className="font-bold text-white">
                {successData.shipping > 0
                  ? `R$ ${Number(successData.shipping).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'Entrega Gratuita (CIF)'}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-slate-400">Condições de Pagamento:</span>
              <span className="font-bold text-emerald-400">{successData.installments}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-base">
              <span className="font-bold text-white">Valor Total da Proposta:</span>
              <span className="text-2xl font-black text-emerald-400">
                R$ {Number(successData.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-white/10 transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Comprovante
            </button>
            <button
              onClick={() => setSuccessData(null)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold transition"
            >
              Revisar / Atualizar Proposta
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar à Plataforma
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Simulation Banner */}
        {isSimulated && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-300 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span>
                <strong>Modo de Simulação / Portal do Fornecedor:</strong> Você está visualizando exatamente a tela que o fornecedor <strong>{supplier?.supplier_name}</strong> acessa pelo link exclusivo.
              </span>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition whitespace-nowrap"
              >
                Voltar ao Painel
              </button>
            )}
          </div>
        )}

        {/* Header card */}
        <header className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-amber-400 uppercase tracking-wider font-bold">
                <Building2 className="w-4 h-4" />
                Portal de Compras & Cotações
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {round?.title}
              </h1>
              <p className="text-sm text-slate-400">
                Solicitante: <strong className="text-slate-200">{company?.trade_name || company?.name || 'Oficina 3D'}</strong>
              </p>
            </div>

            {/* Supplier Tag */}
            <div className="bg-slate-800 border border-white/10 p-3.5 rounded-2xl flex flex-col text-right">
              <span className="text-[11px] text-slate-400">Fornecedor Convidado:</span>
              <span className="font-bold text-amber-300 text-sm">{supplier?.supplier_name}</span>
              {supplier?.supplier_email && (
                <span className="text-[11px] text-slate-400">{supplier.supplier_email}</span>
              )}
            </div>
          </div>

          {/* Description & Deadline banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2 space-y-1">
              <span className="text-slate-400 font-semibold">Observações / Especificações do Solicitante:</span>
              <p className="text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-white/5">
                {round?.description || 'Por favor, informe os melhores valores unitários, disponibilidade de estoque, opções de parcelamento e frete para nossa oficina.'}
              </p>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-center ${
              isDeadlinePassed
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <Clock className="w-4 h-4" />
                {isDeadlinePassed ? 'Prazo Encerrado' : 'Prazo Limite para Resposta'}
              </div>
              <span className="text-sm font-semibold text-white">
                {formattedDeadline || 'A definir'}
              </span>
              {isDeadlinePassed && (
                <span className="text-[11px] text-rose-400 mt-1">
                  O prazo oficial já expirou, mas você ainda pode registrar sua proposta se o comprador aceitar.
                </span>
              )}
            </div>
          </div>

          {existingProposal && (
            <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Você já enviou uma proposta em {new Date(existingProposal.submitted_at).toLocaleString('pt-BR')}. Os campos abaixo estão preenchidos com sua última resposta. Você pode atualizá-la a qualquer momento!
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Error notification if any */}
        {error && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: ITEMS TABLE */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 font-bold text-lg text-white">
                <Package className="w-5 h-5 text-amber-400" />
                1. Tabela de Itens Solicitados ({items.length})
              </div>
              <span className="text-xs text-slate-400">
                Informe o valor unitário e marca/modelo de cada item
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs font-semibold uppercase border-b border-white/10">
                    <th className="py-3 px-4 rounded-l-xl">Disponível?</th>
                    <th className="py-3 px-4">Item Solicitado</th>
                    <th className="py-3 px-3 text-center">Qtd Necessária</th>
                    <th className="py-3 px-4">Marca / Modelo Ofertado</th>
                    <th className="py-3 px-4">Preço Unit. (R$)</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => {
                    const resp = itemResponses[item.id] || { available: true, brand_model: '', unit_price: 0, notes: '' };
                    const itemTotal = resp.available ? (Number(resp.unit_price) || 0) * (Number(item.quantity) || 1) : 0;

                    return (
                      <tr key={item.id} className={`transition ${resp.available ? 'hover:bg-slate-800/40' : 'bg-slate-950/40 opacity-60'}`}>
                        {/* Checkbox Available */}
                        <td className="py-4 px-4 align-top">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={resp.available}
                              onChange={(e) => {
                                setItemResponses({
                                  ...itemResponses,
                                  [item.id]: { ...resp, available: e.target.checked }
                                });
                              }}
                              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                            />
                            <span className="text-xs font-semibold text-slate-300">
                              {resp.available ? 'Sim' : 'Sem Estoque'}
                            </span>
                          </label>
                        </td>

                        {/* Item Name & notes */}
                        <td className="py-4 px-4 align-top">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-xs text-slate-400 space-x-2 mt-0.5">
                            <span className="inline-block px-2 py-0.5 bg-slate-800 rounded text-[10px] uppercase font-bold text-amber-300">
                              {item.item_type === 'filament' ? 'Filamento' : item.item_type === 'supply' ? 'Insumo' : 'Peça'}
                            </span>
                            {item.notes && <span className="text-slate-400 italic">Obs: {item.notes}</span>}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-4 px-3 text-center align-top whitespace-nowrap">
                          <span className="font-bold text-white text-base">{item.quantity}</span>
                          <span className="text-xs text-slate-400 block">{item.unit || 'un'}</span>
                        </td>

                        {/* Brand / Model input */}
                        <td className="py-4 px-4 align-top">
                          <input
                            type="text"
                            placeholder="Ex: Voolt3D PLA Fosco..."
                            disabled={!resp.available}
                            value={resp.brand_model}
                            onChange={(e) => {
                              setItemResponses({
                                ...itemResponses,
                                [item.id]: { ...resp, brand_model: e.target.value }
                              });
                            }}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 disabled:bg-slate-900 disabled:opacity-50"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-4 px-4 align-top">
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              disabled={!resp.available}
                              value={resp.unit_price || ''}
                              onChange={(e) => {
                                setItemResponses({
                                  ...itemResponses,
                                  [item.id]: { ...resp, unit_price: parseFloat(e.target.value) || 0 }
                                });
                              }}
                              className="w-32 bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:bg-slate-900 disabled:opacity-50"
                            />
                          </div>
                        </td>

                        {/* Total Line */}
                        <td className="py-4 px-4 text-right align-top whitespace-nowrap">
                          <span className={`font-bold ${resp.available ? 'text-emerald-400 text-sm' : 'text-slate-500'}`}>
                            {resp.available
                              ? `R$ ${itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Subtotal bar */}
            <div className="flex justify-end items-center gap-4 pt-4 border-t border-white/10 text-sm">
              <span className="text-slate-400">Subtotal dos Produtos Ofertados:</span>
              <span className="text-xl font-bold text-white">
                R$ {subtotalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* SECTION 2: SHIPPING & LOGISTICS */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-lg text-white border-b border-white/10 pb-4">
              <Truck className="w-5 h-5 text-amber-400" />
              2. Frete, Transportadora & Prazo de Entrega
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shipping Type Radio */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Modalidade do Frete:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShippingType('free');
                      setShippingCost(0);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      shippingType === 'free'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm text-emerald-400">Frete Grátis (CIF)</span>
                    <span className="text-[11px] text-slate-400 mt-1">Entrega por conta do fornecedor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShippingType('carrier')}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      shippingType === 'carrier'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white'
                        : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm text-amber-400">Valor de Transportadora</span>
                    <span className="text-[11px] text-slate-400 mt-1">Frete cotado / adicionado à fatura</span>
                  </button>
                </div>
              </div>

              {/* Shipping Cost if applicable */}
              {shippingType === 'carrier' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Valor do Frete (R$):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required={shippingType === 'carrier'}
                      value={shippingCost || ''}
                      onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 35.00"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Condição de Frete Grátis:</label>
                  <p className="text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-white/5">
                    O frete será coberto sem custos adicionais para o comprador.
                  </p>
                </div>
              )}

              {/* Carrier Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Nome da Transportadora / Logística:</label>
                <input
                  type="text"
                  placeholder="Ex: Jadlog, Correios Sedex, Frota Própria..."
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Delivery Lead Days */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Prazo Estimado de Entrega:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={deliveryLeadDays}
                    onChange={(e) => setDeliveryLeadDays(parseInt(e.target.value) || 1)}
                    className="w-24 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-slate-400">dias úteis após confirmação do pedido</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMMERCIAL TERMS & INSTALLMENTS */}
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-lg text-white border-b border-white/10 pb-4">
              <CreditCard className="w-5 h-5 text-amber-400" />
              3. Condições Comerciais & Parcelamento ("Quantas Vezes")
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Installments count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Quantas vezes parcela?</label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value={1}>À vista (1x)</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={4}>4x</option>
                  <option value={5}>5x</option>
                  <option value={6}>6x</option>
                  <option value={10}>10x</option>
                  <option value={12}>12x</option>
                </select>
              </div>

              {/* Payment Method / Terms */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Forma de Pagamento Principal:</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="PIX à vista (-5%)">PIX à vista (com desconto)</option>
                  <option value="Boleto Faturado 28 dias">Boleto Faturado 28 dias</option>
                  <option value="Boleto 30/60 dias">Boleto Faturado 30/60 dias</option>
                  <option value="Cartão de Crédito sem juros">Cartão de Crédito sem juros</option>
                  <option value="Cartão de Crédito parcelado">Cartão de Crédito parcelado</option>
                  <option value="Transferência Bancária">Transferência / TED</option>
                  <option value="Outro">Outro acordo comercial</option>
                </select>
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Detalhes do Parcelamento:</label>
                <input
                  type="text"
                  placeholder="Ex: 3x s/ juros no cartão ou 28/56 no boleto..."
                  value={installmentsDetails}
                  onChange={(e) => setInstallmentsDetails(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* General supplier notes */}
              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Observações Adicionais do Fornecedor:</label>
                <textarea
                  rows={2}
                  placeholder="Informações sobre validade dos preços, garantias, especificações técnicas ou cortesias..."
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: SUMMARY & SUBMIT */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumo da sua Cotação</span>
              <div className="flex flex-wrap items-baseline gap-4">
                <div className="text-sm text-slate-300">
                  Produtos: <strong className="text-white">R$ {subtotalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="text-sm text-slate-300">
                  Frete: <strong className="text-white">{finalShipping > 0 ? `R$ ${finalShipping.toFixed(2)}` : 'Grátis'}</strong>
                </div>
                <div className="text-sm text-slate-300">
                  Condição: <strong className="text-emerald-400">{installmentsCount}x ({paymentTerms})</strong>
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-400 pt-1">
                Total: R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Enviando Proposta...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Proposta Comercial
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
