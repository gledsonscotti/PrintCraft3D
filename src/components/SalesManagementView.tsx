import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Package,
  Building2,
  User,
  Store,
  Calendar,
  Filter,
  Trash2,
  Plus,
  ArrowUpRight,
  Receipt,
  Search,
  CheckCircle2,
  Factory,
  Check
} from 'lucide-react';
import { ProductSale, Product, SaleChannelType, Consignment } from '../types';
import { safeFetchJson } from '../utils/api';

interface SalesManagementViewProps {
  sales: ProductSale[];
  products: Product[];
  onOpenNewSaleModal: (defaultMode?: 'direct' | 'indirect' | 'consignment' | 'presale') => void;
  onDeleteSale: (saleId: string) => void;
  onRefreshData: () => void;
  onGenerateOP?: (sale: ProductSale) => void;
}

export function SalesManagementView({
  sales,
  products,
  onOpenNewSaleModal,
  onDeleteSale,
  onRefreshData,
  onGenerateOP,
}: SalesManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'consignments'>('sales');
  const [filterChannel, setFilterChannel] = useState<'all' | SaleChannelType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Consignments state
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [soldInputs, setSoldInputs] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('Acerto PIX');
  const [settleMsg, setSettleMsg] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [consignmentToDelete, setConsignmentToDelete] = useState<Consignment | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<ProductSale | null>(null);

  useEffect(() => {
    fetchConsignments();
  }, [sales]);

  const fetchConsignments = async () => {
    try {
      const data = await safeFetchJson<Consignment[]>('/api/consignments', undefined, []);
      if (Array.isArray(data)) {
        setConsignments(data);
      }
    } catch {}
  };

  const handleOpenConsignment = (cons: Consignment) => {
    setSelectedConsignment(cons);
    const initial: Record<string, number> = {};
    cons.items.forEach((item) => {
      initial[item.id] = 0;
    });
    setSoldInputs(initial);
    setSettleMsg(null);
  };

  const handleSettleConsignmentItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsignment) return;

    const soldItems = Object.entries(soldInputs)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([item_id, quantity_sold_now]) => ({ item_id, quantity_sold_now: Number(quantity_sold_now) }));

    if (soldItems.length === 0) {
      setSettleMsg('Informe pelo menos 1 item vendido para registrar o acerto.');
      return;
    }

    setIsSettling(true);
    setSettleMsg(null);

    try {
      const res = await fetch(`/api/consignments/${selectedConsignment.id}/sell-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldItems, payment_method: paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar acerto');

      fetchConsignments();
      onRefreshData();
      setSelectedConsignment(null);
    } catch (err: any) {
      setSettleMsg(err.message);
    } finally {
      setIsSettling(false);
    }
  };

  const handleDeleteConsignment = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta consignação? Os itens não vendidos voltarão para o estoque pronto.')) return;
    try {
      const res = await fetch(`/api/consignments/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir consignação');
      }
      await fetchConsignments();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e.message || 'Erro desconhecido'));
    }
  };

  // Financial aggregates
  const totalRevenue = sales.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
  const totalQuantitySold = sales.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  const filteredSales = sales.filter((sale) => {
    const matchesChannel = filterChannel === 'all' || sale.channel_type === filterChannel;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      sale.product_name.toLowerCase().includes(term) ||
      sale.channel_name.toLowerCase().includes(term) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(term));
    return matchesChannel && matchesSearch;
  });

  const getChannelBadge = (sale: ProductSale) => {
    switch (sale.channel_type) {
      case 'consignment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            {sale.channel_name}
          </span>
        );
      case 'presale':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
            {sale.channel_name}
          </span>
        );
      case 'direct':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            {sale.channel_name}
          </span>
        );
      case 'indirect':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            {sale.channel_name}
          </span>
        );
      case 'platform':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            {sale.channel_name}
          </span>
        );
      case 'cnpj':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            {sale.channel_name}
          </span>
        );
      case 'pf':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <User className="w-3.5 h-3.5 text-sky-400" />
            {sale.channel_name}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
            {sale.channel_name}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Botão de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141417] p-5 rounded-3xl border border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
            Controle de Vendas, Consignados & Estoque
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie vendas diretas, marketplaces, pré-vendas e consignações em lojas parceiras.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenNewSaleModal('direct')}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Venda / Consignação
          </button>
        </div>
      </div>

      {/* Sub-abas de Navegação */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'sales'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Vendas Realizadas ({sales.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('consignments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'consignments'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white bg-[#1c1c20] border border-white/[0.06]'
          }`}
        >
          <Store className="w-4 h-4" />
          Consignados & Expositores ({consignments.filter((c) => c.status === 'active').length} ativos)
        </button>
      </div>

      {/* CONTEÚDO DA SUB-ABA: VENDAS REALIZADAS */}
      {activeSubTab === 'sales' && (
        <div className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141417] p-4 rounded-2xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 font-medium block">Faturamento Total</span>
              <span className="text-lg font-extrabold text-emerald-400 mt-1 block">
                R$ {totalRevenue.toFixed(2)}
              </span>
            </div>
            <div className="bg-[#141417] p-4 rounded-2xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 font-medium block">Lucro Líquido Real</span>
              <span className="text-lg font-extrabold text-sky-400 mt-1 block">
                R$ {totalProfit.toFixed(2)}
              </span>
            </div>
            <div className="bg-[#141417] p-4 rounded-2xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 font-medium block">Qtd. Peças Vendidas</span>
              <span className="text-lg font-extrabold text-white mt-1 block">
                {totalQuantitySold} un.
              </span>
            </div>
            <div className="bg-[#141417] p-4 rounded-2xl border border-white/[0.06]">
              <span className="text-[11px] text-slate-400 font-medium block">Ticket Médio</span>
              <span className="text-lg font-extrabold text-purple-400 mt-1 block">
                R$ {averageTicket.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141417] p-4 rounded-2xl border border-white/[0.06]">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por produto ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1c1c20] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { label: 'Todos', value: 'all' },
                { label: 'Venda Direta', value: 'direct' },
                { label: 'Marketplaces', value: 'platform' },
                { label: 'CNPJ / B2B', value: 'cnpj' },
                { label: 'Consignação', value: 'consignment' },
                { label: 'Pré-venda', value: 'presale' },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilterChannel(f.value as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                    filterChannel === f.value
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-[#1c1c20] text-slate-400 border-white/[0.08] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Vendas */}
          <div className="bg-[#141417] border border-white/[0.08] rounded-3xl overflow-hidden">
            {filteredSales.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Nenhuma venda registrada com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1c1c20] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                    <tr>
                      <th className="px-5 py-3.5">Data / Hora</th>
                      <th className="px-5 py-3.5">Produto</th>
                      <th className="px-5 py-3.5">Canal / Cliente</th>
                      <th className="px-5 py-3.5 text-center">Qtd</th>
                      <th className="px-5 py-3.5 text-right">Valor Total</th>
                      <th className="px-5 py-3.5 text-right">Lucro Líquido</th>
                      <th className="px-5 py-3.5 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-4 font-bold text-white">
                          {sale.product_name}
                          {sale.payment_method && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              Pagto: {sale.payment_method}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">{getChannelBadge(sale)}</td>
                        <td className="px-5 py-4 text-center font-bold text-sky-400">{sale.quantity} un.</td>
                        <td className="px-5 py-4 text-right font-extrabold text-emerald-400">
                          R$ {sale.total_revenue.toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-sky-300">
                          R$ {(sale.profit || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-center flex items-center justify-center gap-2">
                          {onGenerateOP && (
                            <button
                              type="button"
                              onClick={() => onGenerateOP(sale)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition text-[11px] font-semibold flex items-center gap-1"
                              title="Gerar Ordem de Produção para repor estoque"
                            >
                              <Factory className="w-3.5 h-3.5" />
                              Repor
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSaleToDelete(sale);
                            }}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-xl transition cursor-pointer"
                            title="Excluir venda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA SUB-ABA: CONSIGNADOS & EXPOSITORES */}
      {activeSubTab === 'consignments' && (
        <div className="space-y-6">
          <div className="bg-[#141417] p-5 rounded-3xl border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">Gestão de Consignações em Lojas Parceiras</h3>
                <p className="text-xs text-slate-400">
                  Clique em um lote consignado para ver os itens expostos e registrar a venda (acerto) dos produtos vendidos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenNewSaleModal('consignment')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              + Nova Consignação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consignments.length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-[#141417] rounded-3xl border border-white/[0.08] space-y-3">
                <Store className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Nenhuma consignação registrada até o momento.</p>
              </div>
            ) : (
              consignments.map((cons) => {
                const totalConsigned = cons.items.reduce((acc, i) => acc + i.quantity_consigned, 0);
                const totalSold = cons.items.reduce((acc, i) => acc + i.quantity_sold, 0);
                const isSettled = cons.status === 'settled';

                return (
                  <div
                    key={cons.id}
                    className={`bg-[#141417] border rounded-3xl p-5 space-y-4 transition ${
                      isSettled ? 'border-white/[0.06] opacity-75' : 'border-amber-500/30 shadow-lg shadow-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 className="text-sm font-bold text-white">{cons.client_name}</h4>
                          <span className="text-[10px] text-slate-400">
                            Registrado em {new Date(cons.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isSettled
                              ? 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isSettled ? 'Acertado / Baixado' : 'Exposição Ativa'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConsignmentToDelete(cons);
                          }}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-xl cursor-pointer"
                          title="Excluir consignação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Resumo de itens */}
                    <div className="space-y-2 bg-[#1c1c20] p-3.5 rounded-2xl border border-white/[0.04]">
                      <div className="text-xs font-semibold text-slate-300 mb-1">Itens no Expositor:</div>
                      {cons.items.map((item) => {
                        const unsold = item.quantity_consigned - item.quantity_sold;
                        return (
                          <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04] last:border-0">
                            <span className="font-medium text-white">{item.product_name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">Consignados: <strong className="text-white">{item.quantity_consigned}</strong></span>
                              <span className="text-emerald-400">Vendidos: <strong>{item.quantity_sold}</strong></span>
                              <span className="text-amber-400">Em Loja: <strong>{unsold}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!isSettled && (
                      <button
                        type="button"
                        onClick={() => handleOpenConsignment(cons)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Realizar Acerto / Registrar Vendas deste Expositor
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL DE ACERTO DE CONSIGNADOS */}
      {selectedConsignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-[#18181b] border border-white/[0.12] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141416]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-400" />
                Acerto de Consignação — {selectedConsignment.client_name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedConsignment(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleConsignmentItems} className="p-6 space-y-4">
              {settleMsg && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  {settleMsg}
                </div>
              )}

              <p className="text-xs text-slate-400">
                Informe quantos itens foram vendidos nesta acerto/prestação de contas da loja parceira. O sistema gerará a receita e o lucro correspondentes.
              </p>

              <div className="space-y-3">
                {selectedConsignment.items.map((item) => {
                  const unsold = item.quantity_consigned - item.quantity_sold;
                  if (unsold <= 0) return null;

                  return (
                    <div key={item.id} className="p-3 bg-[#1c1c20] rounded-2xl border border-white/[0.08] flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-white">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400">
                          Disponível em loja: {unsold} un. | Preço Un: R$ {item.unit_price.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Vendidos agora:</span>
                        <input
                          type="number"
                          min={0}
                          max={unsold}
                          value={soldInputs[item.id] || 0}
                          onChange={(e) =>
                            setSoldInputs({
                              ...soldInputs,
                              [item.id]: Math.min(unsold, Math.max(0, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                          className="w-16 bg-[#141417] border border-white/[0.12] rounded-xl px-2.5 py-1 text-xs text-white font-bold text-center"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Forma de Recebimento do Acerto</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#1c1c20] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Acerto PIX">PIX Recebido da Loja</option>
                  <option value="Acerto Dinheiro">Dinheiro em Espécie</option>
                  <option value="Acerto Transferência">Transferência Bancária</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedConsignment(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  {isSettling ? 'Salvando...' : 'Confirmar Acerto & Gerar Vendas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CONSIGNADO */}
      {consignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#18181b] border border-rose-500/30 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Consignação</h3>
                <p className="text-xs text-slate-400">{consignmentToDelete.client_name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir esta consignação? Os itens não vendidos retornarão automaticamente para o estoque pronto.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConsignmentToDelete(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = consignmentToDelete.id;
                  setConsignmentToDelete(null);
                  try {
                    const res = await fetch(`/api/consignments/${id}`, { method: 'DELETE' });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Erro ao excluir consignação');
                    await fetchConsignments();
                    if (onRefreshData) onRefreshData();
                  } catch (e: any) {
                    alert('Erro ao excluir: ' + (e.message || 'Erro desconhecido'));
                  }
                }}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Sim, Excluir Consignação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE VENDA */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#18181b] border border-rose-500/30 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Venda & Estornar Estoque</h3>
                <p className="text-xs text-slate-400">{saleToDelete.product_name} ({saleToDelete.quantity} un.)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir esta venda? A quantidade vendida retornará automaticamente para o estoque pronto.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = saleToDelete.id;
                  setSaleToDelete(null);
                  await onDeleteSale(id);
                }}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Sim, Excluir Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
