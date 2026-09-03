import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { ProductSale, Product, SaleChannelType } from '../types';

interface SalesManagementViewProps {
  sales: ProductSale[];
  products: Product[];
  onOpenNewSaleModal: () => void;
  onDeleteSale: (saleId: string) => void;
  onRefreshData: () => void;
}

export function SalesManagementView({
  sales,
  products,
  onOpenNewSaleModal,
  onDeleteSale,
  onRefreshData,
}: SalesManagementViewProps) {
  const [filterChannel, setFilterChannel] = useState<'all' | SaleChannelType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Agregações financeiras
  const totalRevenue = sales.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + (s.profit || 0), 0);
  const totalQuantitySold = sales.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  // Subtotais por canal
  const platformSales = sales.filter((s) => s.channel_type === 'platform');
  const cnpjSales = sales.filter((s) => s.channel_type === 'cnpj');
  const pfSales = sales.filter((s) => s.channel_type === 'pf');

  const platformRevenue = platformSales.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  const cnpjRevenue = cnpjSales.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
  const pfRevenue = pfSales.reduce((acc, s) => acc + (s.total_revenue || 0), 0);

  // Total de produtos prontos em estoque atualmente
  const totalReadyStock = products.reduce((acc, p) => acc + (p.ready_stock_qty || 0), 0);

  // Filtragem
  const filteredSales = sales.filter((sale) => {
    const matchesChannel = filterChannel === 'all' || sale.channel_type === filterChannel;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      sale.product_name.toLowerCase().includes(term) ||
      sale.channel_name.toLowerCase().includes(term) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(term)) ||
      (sale.customer_document && sale.customer_document.toLowerCase().includes(term));
    return matchesChannel && matchesSearch;
  });

  const getChannelBadge = (sale: ProductSale) => {
    switch (sale.channel_type) {
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
            Controle de Vendas & Estoque de Peças Prontas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe o faturamento, lucro real e saídas por canal: Marketplaces (Mercado Livre/Shopee), CNPJ e Pessoa Física.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNewSaleModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Nova Venda
          </button>
        </div>
      </div>

      {/* 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Total */}
        <div className="bg-[#141417] p-4 rounded-3xl border border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Faturamento Total</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            R$ {totalRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{sales.length} vendas</span> registradas
          </p>
        </div>

        {/* Lucro Líquido Real */}
        <div className="bg-[#141417] p-4 rounded-3xl border border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Lucro Líquido Real</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            R$ {totalProfit.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% de margem líquida média
          </p>
        </div>

        {/* Peças Vendidas */}
        <div className="bg-[#141417] p-4 rounded-3xl border border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Peças Prontas Vendidas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {totalQuantitySold} un.
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Ticket Médio: R$ {averageTicket.toFixed(2)} / pedido
          </p>
        </div>

        {/* Saldo de Peças em Estoque */}
        <div className="bg-[#141417] p-4 rounded-3xl border border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Estoque Pronto Disponível</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {totalReadyStock} un.
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Distribuídas em {products.length} produtos cadastrados
          </p>
        </div>
      </div>

      {/* Cards de Comparação por Canal de Venda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canal 1: Plataformas / Marketplaces */}
        <div
          onClick={() => setFilterChannel(filterChannel === 'platform' ? 'all' : 'platform')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterChannel === 'platform'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
              : 'bg-[#141417] border-white/[0.08] hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Plataformas / Marketplaces</span>
                <span className="text-[10px] text-slate-400">Mercado Livre, Shopee, Amazon...</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
              {platformSales.length} vendas
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
            <div>
              <span className="text-[10px] text-slate-400 block">Faturamento</span>
              <span className="text-base font-extrabold text-white">R$ {platformRevenue.toFixed(2)}</span>
            </div>
            <span className="text-[11px] text-amber-400 font-semibold flex items-center">
              {totalRevenue > 0 ? ((platformRevenue / totalRevenue) * 100).toFixed(0) : 0}% do total
            </span>
          </div>
        </div>

        {/* Canal 2: CNPJ / B2B */}
        <div
          onClick={() => setFilterChannel(filterChannel === 'cnpj' ? 'all' : 'cnpj')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterChannel === 'cnpj'
              ? 'bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/10'
              : 'bg-[#141417] border-white/[0.08] hover:border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Empresas (CNPJ)</span>
                <span className="text-[10px] text-slate-400">Brindes corporativos, B2B, NF</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
              {cnpjSales.length} vendas
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
            <div>
              <span className="text-[10px] text-slate-400 block">Faturamento</span>
              <span className="text-base font-extrabold text-white">R$ {cnpjRevenue.toFixed(2)}</span>
            </div>
            <span className="text-[11px] text-purple-400 font-semibold flex items-center">
              {totalRevenue > 0 ? ((cnpjRevenue / totalRevenue) * 100).toFixed(0) : 0}% do total
            </span>
          </div>
        </div>

        {/* Canal 3: Pessoa Física / Balcão */}
        <div
          onClick={() => setFilterChannel(filterChannel === 'pf' ? 'all' : 'pf')}
          className={`p-4 rounded-3xl border transition-all cursor-pointer ${
            filterChannel === 'pf'
              ? 'bg-sky-500/10 border-sky-500/50 shadow-md shadow-sky-500/10'
              : 'bg-[#141417] border-white/[0.08] hover:border-sky-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Pessoa Física</span>
                <span className="text-[10px] text-slate-400">Venda direta, Balcão, PIX</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
              {pfSales.length} vendas
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
            <div>
              <span className="text-[10px] text-slate-400 block">Faturamento</span>
              <span className="text-base font-extrabold text-white">R$ {pfRevenue.toFixed(2)}</span>
            </div>
            <span className="text-[11px] text-sky-400 font-semibold flex items-center">
              {totalRevenue > 0 ? ((pfRevenue / totalRevenue) * 100).toFixed(0) : 0}% do total
            </span>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141417] p-3 rounded-2xl border border-white/[0.08]">
        {/* Segmented filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterChannel('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterChannel === 'all'
                ? 'bg-white text-black'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            Todos ({sales.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterChannel('platform')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              filterChannel === 'platform'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-amber-300 hover:bg-white/[0.06]'
            }`}
          >
            <Store className="w-3 h-3" />
            Plataformas ({platformSales.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterChannel('cnpj')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              filterChannel === 'cnpj'
                ? 'bg-purple-500 text-white font-bold'
                : 'text-slate-400 hover:text-purple-300 hover:bg-white/[0.06]'
            }`}
          >
            <Building2 className="w-3 h-3" />
            CNPJ ({cnpjSales.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterChannel('pf')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              filterChannel === 'pf'
                ? 'bg-sky-500 text-white font-bold'
                : 'text-slate-400 hover:text-sky-300 hover:bg-white/[0.06]'
            }`}
          >
            <User className="w-3 h-3" />
            Pessoa Física ({pfSales.length})
          </button>
        </div>

        {/* Input de busca */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto, cliente ou canal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-[#141417] rounded-3xl border border-white/[0.08] overflow-hidden shadow-sm">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma venda encontrada</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Quando você registrar uma saída no balcão, Mercado Livre, Shopee ou venda corporativa (CNPJ), ela aparecerá aqui com baixa automática de estoque.
            </p>
            <button
              type="button"
              onClick={onOpenNewSaleModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Primeira Venda
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#101012] text-slate-400">
                  <th className="py-3 px-4 font-semibold">Data</th>
                  <th className="py-3 px-4 font-semibold">Produto & Quantidade</th>
                  <th className="py-3 px-4 font-semibold">Canal de Venda</th>
                  <th className="py-3 px-4 font-semibold">Cliente / Detalhes</th>
                  <th className="py-3 px-4 font-semibold">Preço Unit.</th>
                  <th className="py-3 px-4 font-semibold">Faturamento</th>
                  <th className="py-3 px-4 font-semibold">Custo Total</th>
                  <th className="py-3 px-4 font-semibold">Lucro Real</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredSales.map((sale) => {
                  const saleDate = new Date(sale.created_at);
                  const formattedDate = saleDate.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{sale.product_name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-slate-300 text-[11px] font-semibold">
                            {sale.quantity}x
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getChannelBadge(sale)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {sale.customer_name ? (
                          <div className="font-medium text-slate-200">
                            {sale.customer_name}
                            {sale.customer_document && (
                              <span className="text-[10px] text-slate-400 block">
                                Doc: {sale.customer_document}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                        {sale.notes && (
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {sale.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        R$ {sale.unit_price.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        R$ {sale.total_revenue.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        R$ {sale.total_cost.toFixed(2)}
                        {sale.platform_fee_amount && sale.platform_fee_amount > 0 ? (
                          <span className="text-[10px] text-amber-400 block">
                            + R$ {sale.platform_fee_amount.toFixed(2)} taxa
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-extrabold ${sale.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          R$ {sale.profit.toFixed(2)}
                        </span>
                        {sale.total_revenue > 0 && (
                          <span className="text-[10px] text-slate-400 block">
                            {((sale.profit / sale.total_revenue) * 100).toFixed(0)}% margem
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onDeleteSale(sale.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/[0.06] transition"
                          title="Cancelar/Estornar venda e devolver ao estoque"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
