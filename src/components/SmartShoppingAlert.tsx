import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Package,
  Flame,
  Copy,
  Check,
  Printer,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldAlert,
  DollarSign,
  Layers,
  FileText,
  Info,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { Filament, Supply, Product, ProductSale, ProductionOrder } from '../types';

export interface ProductStatRecord {
  product: Product | undefined;
  productName: string;
  totalSold: number;
  totalRevenue: number;
}

export interface SmartShoppingAlertProps {
  filaments: Filament[];
  supplies: Supply[];
  products: Product[];
  sales?: ProductSale[];
  productionOrders?: ProductionOrder[];
  onQuickAddFilamentStock: (id: string, deltaG: number) => Promise<void> | void;
  onQuickAddSupplyStock: (id: string, deltaQty: number) => Promise<void> | void;
  onQuickAddProductStock?: (product: Product, delta: number) => Promise<void> | void;
  onRefreshData?: () => void | Promise<void>;
}

export interface ShoppingSuggestionItem {
  id: string;
  type: 'filament' | 'supply' | 'product';
  name: string;
  subtitle: string;
  categoryBadge: string;
  currentStock: number;
  stockUnit: string;
  minStock: number;
  monthlyConsumption: number;
  dailyConsumption: number;
  daysCoverage: number | null; // null if consumption is 0
  isBelowMinStock: boolean;
  urgency: 'critical' | 'warning' | 'preventive';
  suggestedBuyQty: number;
  buyUnitLabel: string;
  unitCost: number;
  totalEstimatedCost: number;
  topDrivers: {
    productName: string;
    monthlySold: number;
    usagePerUnit: number;
    usageUnit: string;
  }[];
  reasonExplanation: string;
  originalItem: Filament | Supply | Product;
}

// Pure calculation helper exported for reuse in tabs & alerts count
export function calculateSmartShoppingSuggestions(
  filaments: Filament[],
  supplies: Supply[],
  products: Product[],
  sales: ProductSale[] = [],
  productionOrders: ProductionOrder[] = [],
  coverageHorizon: 15 | 30 | 60 = 30
): {
  suggestions: ShoppingSuggestionItem[];
  productStatsList: ProductStatRecord[];
  topSellingProducts: ProductStatRecord[];
  criticalCount: number;
  warningCount: number;
  totalPurchaseCost: number;
} {
  // 1. Calculate Monthly Sales & Top Selling Products
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  // Check if we have recent sales
  const recentSales = sales.filter((s) => {
    const saleDate = new Date(s.created_at).getTime();
    return isNaN(saleDate) || saleDate >= thirtyDaysAgo;
  });

  const relevantSales = recentSales.length > 0 ? recentSales : sales;
  const statsMap: Record<string, ProductStatRecord> = {};

  // Group sales by product
  for (const sale of relevantSales) {
    const pId = sale.product_id || sale.product_name;
    if (!statsMap[pId]) {
      const foundProd = products.find((p) => p.id === sale.product_id || p.name.toLowerCase() === sale.product_name.toLowerCase());
      statsMap[pId] = {
        product: foundProd,
        productName: sale.product_name || foundProd?.name || 'Produto',
        totalSold: 0,
        totalRevenue: 0,
      };
    }
    statsMap[pId].totalSold += Number(sale.quantity) || 0;
    statsMap[pId].totalRevenue += Number(sale.total_revenue) || 0;
  }

  // Also consider completed production orders if sales are low, to ensure accurate consumption history
  if (sales.length === 0 && productionOrders.length > 0) {
    for (const order of productionOrders) {
      if (order.status === 'completed' || order.status === 'in_progress') {
        const pId = order.product_id || order.product_name;
        if (!statsMap[pId]) {
          const foundProd = products.find((p) => p.id === order.product_id || p.name.toLowerCase() === order.product_name.toLowerCase());
          statsMap[pId] = {
            product: foundProd,
            productName: order.product_name || foundProd?.name || 'Produto',
            totalSold: 0,
            totalRevenue: 0,
          };
        }
        statsMap[pId].totalSold += Number(order.quantity) || 0;
      }
    }
  }

  const productStatsList: ProductStatRecord[] = Object.values(statsMap);
  const topSellingProducts = [...productStatsList].sort((a, b) => b.totalSold - a.totalSold);

  const list: ShoppingSuggestionItem[] = [];

  // --- A. FILAMENTS ANALYSIS ---
  for (const fil of filaments) {
    const userProducts = products.filter((p) => p.filament_id === fil.id);

    let monthlyWeightConsumedG = 0;
    const drivers: {
      productName: string;
      monthlySold: number;
      usagePerUnit: number;
      usageUnit: string;
    }[] = [];

    for (const prod of userProducts) {
      const stat = productStatsList.find(
        (s) => s.product?.id === prod.id || s.productName.toLowerCase() === prod.name.toLowerCase()
      );
      const unitsSold = stat?.totalSold || 0;

      if (unitsSold > 0) {
        const consumptionG = unitsSold * (prod.filament_weight_g || 0);
        monthlyWeightConsumedG += consumptionG;
        drivers.push({
          productName: prod.name,
          monthlySold: unitsSold,
          usagePerUnit: prod.filament_weight_g || 0,
          usageUnit: 'g/un',
        });
      }
    }

    drivers.sort((a, b) => (b.monthlySold * b.usagePerUnit) - (a.monthlySold * a.usagePerUnit));

    const minStockG = 200;
    const dailyConsumptionG = monthlyWeightConsumedG / 30;
    const daysCoverage = dailyConsumptionG > 0 ? Math.round(fil.remaining_weight_g / dailyConsumptionG) : null;
    const isBelowMin = fil.remaining_weight_g <= minStockG;
    const isDeficit = daysCoverage !== null && daysCoverage < coverageHorizon;

    if (isBelowMin || isDeficit) {
      let urgency: 'critical' | 'warning' | 'preventive' = 'preventive';
      if (fil.remaining_weight_g <= 100 || (daysCoverage !== null && daysCoverage <= 7)) {
        urgency = 'critical';
      } else if (isBelowMin || (daysCoverage !== null && daysCoverage <= 15)) {
        urgency = 'warning';
      }

      const spoolWeight = fil.total_weight_g > 0 ? fil.total_weight_g : 1000;
      const requiredG = (dailyConsumptionG * coverageHorizon) + minStockG - fil.remaining_weight_g;
      const spoolsNeeded = Math.max(1, Math.ceil(Math.max(requiredG, spoolWeight * 0.5) / spoolWeight));
      const estimatedCost = spoolsNeeded * (fil.cost_per_spool || 90);

      let reason = '';
      if (drivers.length > 0) {
        const mainDriver = drivers[0];
        reason = `Consumo de ~${Math.round(monthlyWeightConsumedG)}g/mês puxado por "${mainDriver.productName}" (${mainDriver.monthlySold} vendas/mês).`;
      } else if (isBelowMin) {
        reason = `Carretel com apenas ${fil.remaining_weight_g}g restantes (abaixo da margem de segurança de ${minStockG}g).`;
      } else {
        reason = `Estoque baixo para a autonomia projetada de ${coverageHorizon} dias.`;
      }

      list.push({
        id: `fil-${fil.id}`,
        type: 'filament',
        name: fil.name,
        subtitle: `${fil.brand} • ${fil.material} (${fil.diameter}mm)`,
        categoryBadge: 'Filamento 3D',
        currentStock: fil.remaining_weight_g,
        stockUnit: 'g',
        minStock: minStockG,
        monthlyConsumption: Math.round(monthlyWeightConsumedG),
        dailyConsumption: Math.round(dailyConsumptionG * 10) / 10,
        daysCoverage,
        isBelowMinStock: isBelowMin,
        urgency,
        suggestedBuyQty: spoolsNeeded,
        buyUnitLabel: spoolsNeeded === 1 ? 'carretel (1kg)' : `carretéis (${spoolsNeeded}kg)`,
        unitCost: fil.cost_per_spool,
        totalEstimatedCost: estimatedCost,
        topDrivers: drivers.slice(0, 2),
        reasonExplanation: reason,
        originalItem: fil,
      });
    }
  }

  // --- B. SUPPLIES ANALYSIS ---
  for (const sup of supplies) {
    let monthlyQtyConsumed = 0;
    const drivers: {
      productName: string;
      monthlySold: number;
      usagePerUnit: number;
      usageUnit: string;
    }[] = [];

    for (const prod of products) {
      if (!prod.extra_supplies_json) continue;
      try {
        const extraItems = JSON.parse(prod.extra_supplies_json);
        if (Array.isArray(extraItems)) {
          const match = extraItems.find((item: any) => item.supply_id === sup.id || item.name?.toLowerCase() === sup.name.toLowerCase());
          if (match && Number(match.qty) > 0) {
            const qtyPerProduct = Number(match.qty);
            const stat = productStatsList.find(
              (s) => s.product?.id === prod.id || s.productName.toLowerCase() === prod.name.toLowerCase()
            );
            const unitsSold = stat?.totalSold || 0;

            if (unitsSold > 0) {
              const consumed = unitsSold * qtyPerProduct;
              monthlyQtyConsumed += consumed;
              drivers.push({
                productName: prod.name,
                monthlySold: unitsSold,
                usagePerUnit: qtyPerProduct,
                usageUnit: `${sup.unit}/un`,
              });
            }
          }
        }
      } catch {
        // Ignore JSON parse errors in malformed records
      }
    }

    drivers.sort((a, b) => (b.monthlySold * b.usagePerUnit) - (a.monthlySold * a.usagePerUnit));

    const minStockAlert = sup.min_stock_alert > 0 ? sup.min_stock_alert : 10;
    const dailyConsumption = monthlyQtyConsumed / 30;
    const daysCoverage = dailyConsumption > 0 ? Math.round(sup.in_stock_qty / dailyConsumption) : null;
    const isBelowMin = sup.in_stock_qty <= minStockAlert;
    const isDeficit = daysCoverage !== null && daysCoverage < coverageHorizon;

    if (isBelowMin || isDeficit) {
      let urgency: 'critical' | 'warning' | 'preventive' = 'preventive';
      if (sup.in_stock_qty <= Math.ceil(minStockAlert * 0.4) || (daysCoverage !== null && daysCoverage <= 7)) {
        urgency = 'critical';
      } else if (isBelowMin || (daysCoverage !== null && daysCoverage <= 15)) {
        urgency = 'warning';
      }

      const deficitQty = (dailyConsumption * coverageHorizon) + minStockAlert - sup.in_stock_qty;
      let suggestedUnits = Math.max(minStockAlert, Math.ceil(deficitQty));
      
      if (sup.unit === 'un' || sup.unit === 'kit') {
        if (suggestedUnits <= 15) suggestedUnits = Math.ceil(suggestedUnits / 5) * 5;
        else if (suggestedUnits <= 50) suggestedUnits = Math.ceil(suggestedUnits / 10) * 10;
        else suggestedUnits = Math.ceil(suggestedUnits / 25) * 25;
      }

      const estimatedCost = suggestedUnits * (sup.unit_cost || 0.5);

      let reason = '';
      if (drivers.length > 0) {
        const mainDriver = drivers[0];
        reason = `Consumo de ~${monthlyQtyConsumed} ${sup.unit}/mês puxado por "${mainDriver.productName}" (${mainDriver.monthlySold} vendas/mês).`;
      } else if (isBelowMin) {
        reason = `Saldo atual de ${sup.in_stock_qty} ${sup.unit} atingiu o limite mínimo cadastrado (${minStockAlert} ${sup.unit}).`;
      } else {
        reason = `Estoque insuficiente para suprir a demanda projetada de ${coverageHorizon} dias.`;
      }

      list.push({
        id: `sup-${sup.id}`,
        type: 'supply',
        name: sup.name,
        subtitle: `Unidade de compra: ${sup.unit}`,
        categoryBadge: 'Insumo / Acessório',
        currentStock: sup.in_stock_qty,
        stockUnit: sup.unit,
        minStock: minStockAlert,
        monthlyConsumption: monthlyQtyConsumed,
        dailyConsumption: Math.round(dailyConsumption * 10) / 10,
        daysCoverage,
        isBelowMinStock: isBelowMin,
        urgency,
        suggestedBuyQty: suggestedUnits,
        buyUnitLabel: `${suggestedUnits} ${sup.unit}`,
        unitCost: sup.unit_cost,
        totalEstimatedCost: estimatedCost,
        topDrivers: drivers.slice(0, 2),
        reasonExplanation: reason,
        originalItem: sup,
      });
    }
  }

  // --- C. TOP SELLING PRODUCTS STOCKOUT ALERT ---
  for (const stat of topSellingProducts) {
    if (!stat.product) continue;
    const prod = stat.product;
    const readyStock = prod.ready_stock_qty || 0;
    const minStock = prod.min_stock_alert || 3;
    const monthlySold = stat.totalSold;

    if (monthlySold > 0 && readyStock <= minStock) {
      const isOutOfStock = readyStock === 0;
      const dailyRate = monthlySold / 30;
      const daysCoverage = dailyRate > 0 ? Math.round(readyStock / dailyRate) : 0;
      const suggestedBatch = Math.max(5, Math.ceil(dailyRate * 15));

      list.push({
        id: `prod-${prod.id}`,
        type: 'product',
        name: prod.name,
        subtitle: `Mais Vendido: ${monthlySold} un. vendidas no mês • Categoria: ${prod.category || 'Geral'}`,
        categoryBadge: 'Produto Campeão de Venda',
        currentStock: readyStock,
        stockUnit: 'un',
        minStock,
        monthlyConsumption: monthlySold,
        dailyConsumption: Math.round(dailyRate * 10) / 10,
        daysCoverage,
        isBelowMinStock: readyStock <= minStock,
        urgency: isOutOfStock ? 'critical' : 'warning',
        suggestedBuyQty: suggestedBatch,
        buyUnitLabel: `${suggestedBatch} un. (Produzir lote)`,
        unitCost: prod.total_cost || 5,
        totalEstimatedCost: suggestedBatch * (prod.total_cost || 5),
        topDrivers: [{
          productName: prod.name,
          monthlySold,
          usagePerUnit: 1,
          usageUnit: 'un',
        }],
        reasonExplanation: isOutOfStock
          ? `ESTOQUE ZERADO! Produto campeão (${monthlySold} vendas/mês). Risco iminente de perda de vendas.`
          : `Estoque de apenas ${readyStock} un. cobre ~${daysCoverage} dias de venda (giro mensal de ${monthlySold} un).`,
        originalItem: prod,
      });
    }
  }

  // Sort: Critical first, then Warning, then Preventive
  const urgencyOrder = { critical: 0, warning: 1, preventive: 2 };
  list.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  const criticalCount = list.filter((s) => s.urgency === 'critical').length;
  const warningCount = list.filter((s) => s.urgency === 'warning').length;
  const totalPurchaseCost = list.reduce((sum, s) => sum + s.totalEstimatedCost, 0);

  return {
    suggestions: list,
    productStatsList,
    topSellingProducts,
    criticalCount,
    warningCount,
    totalPurchaseCost,
  };
}

export const SmartShoppingAlert: React.FC<SmartShoppingAlertProps> = ({
  filaments,
  supplies,
  products,
  sales = [],
  productionOrders = [],
  onQuickAddFilamentStock,
  onQuickAddSupplyStock,
  onQuickAddProductStock,
  onRefreshData,
}) => {
  const [coverageHorizon, setCoverageHorizon] = useState<15 | 30 | 60>(30); // Horizon in days
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'filaments' | 'supplies' | 'products'>('all');
  const [copied, setCopied] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);

  // Compute suggestions with pure function
  const {
    suggestions,
    criticalCount,
    warningCount,
    totalPurchaseCost,
  } = useMemo(() => {
    return calculateSmartShoppingSuggestions(
      filaments,
      supplies,
      products,
      sales,
      productionOrders,
      coverageHorizon
    );
  }, [filaments, supplies, products, sales, productionOrders, coverageHorizon]);

  // Filtered List
  const filteredSuggestions = useMemo(() => {
    if (selectedFilter === 'filaments') return suggestions.filter((s) => s.type === 'filament');
    if (selectedFilter === 'supplies') return suggestions.filter((s) => s.type === 'supply');
    if (selectedFilter === 'products') return suggestions.filter((s) => s.type === 'product');
    return suggestions;
  }, [suggestions, selectedFilter]);

  // Copy shopping list to clipboard
  const handleCopyShoppingList = () => {
    if (suggestions.length === 0) return;

    const dateStr = new Date().toLocaleDateString('pt-BR');
    let text = `🛒 *PRINTCRAFT 3D - LISTA INTELIGENTE DE REPOSIÇÃO & COMPRAS*\n`;
    text += `📅 Data: ${dateStr} | Horizonte de Cobertura: ${coverageHorizon} dias\n`;
    text += `💰 Investimento Total Estimado: R$ ${Number(totalPurchaseCost || 0).toFixed(2)}\n`;
    text += `--------------------------------------------------\n\n`;

    // Group by type
    const filItems = suggestions.filter((s) => s.type === 'filament');
    const supItems = suggestions.filter((s) => s.type === 'supply');
    const prodItems = suggestions.filter((s) => s.type === 'product');

    if (filItems.length > 0) {
      text += `🧵 *FILAMENTOS 3D A REPOR:*\n`;
      filItems.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name} (${item.subtitle})\n`;
        text += `   • Comprar: ${item.buyUnitLabel} (~R$ ${Number(item.totalEstimatedCost || 0).toFixed(2)})\n`;
        text += `   • Estoque Atual: ${item.currentStock}${item.stockUnit} (Consumo médio: ${item.monthlyConsumption}g/mês)\n`;
        text += `   • Motivo: ${item.reasonExplanation}\n\n`;
      });
    }

    if (supItems.length > 0) {
      text += `📦 *INSUMOS & ACESSÓRIOS A COMPRAR:*\n`;
      supItems.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name}\n`;
        text += `   • Comprar: ${item.buyUnitLabel} (~R$ ${Number(item.totalEstimatedCost || 0).toFixed(2)})\n`;
        text += `   • Estoque Atual: ${item.currentStock} ${item.stockUnit} (Limite Mínimo: ${item.minStock} ${item.stockUnit})\n`;
        text += `   • Motivo: ${item.reasonExplanation}\n\n`;
      });
    }

    if (prodItems.length > 0) {
      text += `⚠️ *PRODUTOS CAMPEÕES COM ESTOQUE BAIXO (PRODUÇÃO URGENTE):*\n`;
      prodItems.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name}\n`;
        text += `   • Sugestão: ${item.buyUnitLabel}\n`;
        text += `   • Status: Estoque Atual ${item.currentStock} un. | Giro mensal: ${item.monthlyConsumption} un.\n\n`;
      });
    }

    text += `--------------------------------------------------\n`;
    text += `Gerado automaticamente pelo Módulo Inteligente de Estoque PrintCraft 3D`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Quick Stock Add
  const handleQuickAdd = async (item: ShoppingSuggestionItem) => {
    setAdjustingItemId(item.id);
    try {
      if (item.type === 'filament') {
        const fil = item.originalItem as Filament;
        const addG = item.suggestedBuyQty * (fil.total_weight_g || 1000);
        await onQuickAddFilamentStock(fil.id, addG);
      } else if (item.type === 'supply') {
        const sup = item.originalItem as Supply;
        await onQuickAddSupplyStock(sup.id, item.suggestedBuyQty);
      } else if (item.type === 'product' && onQuickAddProductStock) {
        const prod = item.originalItem as Product;
        await onQuickAddProductStock(prod, item.suggestedBuyQty);
      }
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Error applying quick stock entry:', err);
    } finally {
      setAdjustingItemId(null);
    }
  };

  // If no items need replenishment
  if (suggestions.length === 0) {
    return (
      <div className="smart-alert-container bg-[#121215] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Estoque Inteligente: Operação 100% Abastecida</h3>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                Cobertura {coverageHorizon} dias OK
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Todos os filamentos, insumos e produtos mais vendidos estão acima do limite mínimo de estoque e possuem autonomia suficiente para o horizonte selecionado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <span className="text-xs text-slate-400">Simular horizonte:</span>
          <div className="smart-alert-filter-bar flex items-center bg-[#0A0A0B] p-1 rounded-2xl border border-white/[0.08] text-xs font-mono">
            {([15, 30, 60] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setCoverageHorizon(days)}
                className={`smart-alert-filter-btn px-3 py-1 rounded-xl transition cursor-pointer font-semibold ${
                  coverageHorizon === days
                    ? 'smart-alert-filter-active bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-alert-container bg-[#121215] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-lg shadow-black/40 space-y-5 relative overflow-hidden">
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-32 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Alerta Inteligente de Reposição & Compras
              </h3>
              <span className="stock-alert-pill inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {suggestions.length} {suggestions.length === 1 ? 'item sugerido' : 'itens sugeridos'}
              </span>
              {criticalCount > 0 && (
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                  {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Sugestões geradas pelo cruzamento do limite mínimo de estoque com o histórico de consumo médio mensal dos produtos campeões de vendas.
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Horizon Switcher */}
          <div className="smart-alert-filter-bar flex items-center bg-[#0A0A0B] p-1 rounded-2xl border border-white/[0.08] text-xs font-mono">
            <span className="text-[10px] text-slate-400 px-2 font-sans font-medium">Cobertura:</span>
            {([15, 30, 60] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setCoverageHorizon(days)}
                className={`smart-alert-filter-btn px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  coverageHorizon === days
                    ? 'smart-alert-filter-active bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Planejar compras para suprir ${days} dias de consumo`}
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyShoppingList}
            className="smart-alert-secondary-btn bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 hover:text-white px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Copiar lista para WhatsApp ou e-mail de fornecedores"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Lista</span>
              </>
            )}
          </button>

          {/* View Print Modal Button */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="smart-alert-primary-btn bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title="Abrir visualização completa para impressão/cotação"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Ver Cotação</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="smart-alert-kpi-card bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Itens Abaixo do Mínimo</span>
          <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">
            {suggestions.filter((s) => s.isBelowMinStock).length} <span className="text-xs font-normal text-slate-400">itens</span>
          </span>
        </div>

        <div className="smart-alert-kpi-card bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Risco Ruptura &lt; 15d</span>
          <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
            {suggestions.filter((s) => s.daysCoverage !== null && s.daysCoverage <= 15).length} <span className="text-xs font-normal text-slate-400">itens</span>
          </span>
        </div>

        <div className="smart-alert-kpi-card bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Investimento Sugerido</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
            R$ {Number(totalPurchaseCost || 0).toFixed(2)}
          </span>
        </div>

        <div className="smart-alert-kpi-card bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Giro Médio Projetado</span>
          <span className="text-xl font-bold font-mono text-sky-400 mt-0.5 block">
            {coverageHorizon} dias <span className="text-xs font-normal text-slate-400">de produção</span>
          </span>
        </div>
      </div>

      {/* Filter & Subtabs Bar */}
      <div className="space-y-4 pt-3 border-t border-white/[0.08]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="smart-alert-filter-bar flex flex-wrap items-center gap-1 bg-[#0A0A0B] p-1.5 rounded-2xl border border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`smart-alert-filter-btn px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                selectedFilter === 'all'
                  ? 'smart-alert-filter-active bg-white/[0.12] text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({suggestions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('filaments')}
              className={`smart-alert-filter-btn px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === 'filaments'
                  ? 'smart-alert-filter-active bg-white/[0.12] text-sky-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-sky-400" />
              Filamentos ({suggestions.filter((s) => s.type === 'filament').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('supplies')}
              className={`smart-alert-filter-btn px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === 'supplies'
                  ? 'smart-alert-filter-active bg-white/[0.12] text-teal-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-teal-400" />
              Insumos ({suggestions.filter((s) => s.type === 'supply').length})
            </button>
            {suggestions.some((s) => s.type === 'product') && (
              <button
                type="button"
                onClick={() => setSelectedFilter('products')}
                className={`smart-alert-filter-btn px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedFilter === 'products'
                    ? 'smart-alert-filter-active bg-white/[0.12] text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                Produtos Críticos ({suggestions.filter((s) => s.type === 'product').length})
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Valores calculados com base no histórico de consumo real
          </span>
        </div>

        {/* Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSuggestions.map((item) => {
            const isFilament = item.type === 'filament';
            const isSupply = item.type === 'supply';
            const isProduct = item.type === 'product';

            return (
              <div
                key={item.id}
                className={`smart-alert-card bg-[#121215] border rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all shadow-sm ${
                  item.urgency === 'critical'
                    ? 'border-rose-500/40 hover:border-rose-500/60'
                    : item.urgency === 'warning'
                    ? 'border-amber-500/35 hover:border-amber-500/55'
                    : 'border-white/[0.1] hover:border-white/[0.2]'
                }`}
              >
                {/* Top Item Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isFilament
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                            : isSupply
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {isFilament && <Flame className="w-4 h-4" />}
                        {isSupply && <Package className="w-4 h-4" />}
                        {isProduct && <Tag className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    {/* Urgency Badge */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg shrink-0 border ${
                        item.urgency === 'critical'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : item.urgency === 'warning'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      }`}
                    >
                      {item.urgency === 'critical' ? 'Crítico' : item.urgency === 'warning' ? 'Atenção' : 'Preventivo'}
                    </span>
                  </div>

                  {/* Stock Metrics Row */}
                  <div className="smart-alert-metric-box bg-[#0A0A0B]/80 p-2.5 rounded-xl border border-white/[0.04] grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Estoque Atual</span>
                      <span
                        className={`text-xs font-mono font-bold block mt-0.5 ${
                          item.isBelowMinStock ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {item.currentStock} {item.stockUnit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Limite Mínimo</span>
                      <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                        {item.minStock} {item.stockUnit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Autonomia</span>
                      <span
                        className={`text-xs font-mono font-bold block mt-0.5 ${
                          item.daysCoverage === null
                            ? 'text-slate-400'
                            : item.daysCoverage <= 7
                            ? 'text-rose-400'
                            : item.daysCoverage <= 15
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.daysCoverage !== null ? `~${item.daysCoverage} dias` : 'Sem giro'}
                      </span>
                    </div>
                  </div>

                  {/* Demand Driver & Reason Insight */}
                  <div className="smart-alert-reason-box text-[11px] text-slate-300 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.04] leading-snug space-y-1">
                    <p className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{item.reasonExplanation}</span>
                    </p>
                    {item.topDrivers.length > 0 && (
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-white/[0.04]">
                        <span className="font-medium text-slate-300">Produtos consumidores: </span>
                        {item.topDrivers.map((d, i) => (
                          <span key={i} className="text-sky-300 font-medium">
                            {d.productName} ({d.monthlySold} un/mês){i < item.topDrivers.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Recommendation & Quick Actions */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sugestão de Reposição:</span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-xs font-bold text-amber-300">{item.buyUnitLabel}</span>
                      <span className="text-[11px] text-emerald-400">
                        (R$ {Number(item.totalEstimatedCost || 0).toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Quick Entry Action */}
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item)}
                    disabled={adjustingItemId === item.id}
                    className="smart-alert-btn-entry bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    title={
                      isFilament
                        ? `Dar entrada de +${item.suggestedBuyQty * 1000}g diretamente no estoque`
                        : isSupply
                        ? `Dar entrada de +${item.suggestedBuyQty} ${item.stockUnit} no estoque`
                        : `Adicionar +${item.suggestedBuyQty} un. ao estoque pronto`
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{adjustingItemId === item.id ? 'Salvando...' : '+ Entrada'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable / Full Quotation Modal */}
      {showPrintModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lista de Compras & Reposição Sugerida</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    PrintCraft 3D • Planejamento para {coverageHorizon} dias de autonomia
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShoppingList}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-200 px-3 py-1.5 rounded-xl border border-white/[0.1] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Table */}
            <div className="space-y-4 text-xs">
              <div className="bg-[#0A0A0B] rounded-2xl border border-white/[0.08] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[11px] text-slate-400 font-semibold bg-white/[0.02]">
                      <th className="py-2.5 px-3">Item / Categoria</th>
                      <th className="py-2.5 px-3 text-center">Estoque Atual</th>
                      <th className="py-2.5 px-3 text-center">Limite Mínimo</th>
                      <th className="py-2.5 px-3 text-center">Consumo Mês</th>
                      <th className="py-2.5 px-3 text-right">Qtd Sugerida</th>
                      <th className="py-2.5 px-3 text-right">Custo Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {suggestions.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 block">{item.subtitle}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className={item.isBelowMinStock ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {item.currentStock} {item.stockUnit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {item.minStock} {item.stockUnit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          ~{item.monthlyConsumption} {item.stockUnit}/mês
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                          {item.buyUnitLabel}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          R$ {Number(item.totalEstimatedCost || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Card */}
              <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total de Itens Sugeridos:</span>
                  <span className="text-sm font-bold text-white block font-mono">
                    {suggestions.length} itens ({criticalCount} urgentes)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Investimento Total Estimado:</span>
                  <span className="text-xl font-extrabold text-emerald-400 block font-mono">
                    R$ {Number(totalPurchaseCost || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
