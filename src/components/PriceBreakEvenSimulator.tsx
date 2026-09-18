import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Target,
  TrendingUp,
  Percent,
  Layers,
  Zap,
  Clock,
  Package,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Store,
  HelpCircle
} from 'lucide-react';
import { Product, Filament, AppSettings } from '../types';

interface PriceBreakEvenSimulatorProps {
  products: Product[];
  filaments: Filament[];
  settings: AppSettings;
  monthlyFixedCosts?: number;
  targetMarginDefault?: number;
  initialPreset?: {
    filamentWeightG?: number;
    printTimeHours?: number;
    directSuppliesCost?: number;
    sellingPrice?: number;
    productName?: string;
  };
}

export function PriceBreakEvenSimulator({
  products,
  filaments,
  settings,
  monthlyFixedCosts = 800,
  targetMarginDefault = 50,
  initialPreset,
}: PriceBreakEvenSimulatorProps) {
  // Preset or selected product
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Cost Drivers
  const [filamentWeightG, setFilamentWeightG] = useState<number>(initialPreset?.filamentWeightG ?? 85);
  const [filamentKgPrice, setFilamentKgPrice] = useState<number>(() => {
    if (filaments && filaments.length > 0) {
      const fil = filaments[0];
      if (fil.cost_per_spool && fil.total_weight_g) {
        return Math.round((fil.cost_per_spool / fil.total_weight_g) * 1000 * 100) / 100;
      }
    }
    return 110;
  });
  const [printTimeHours, setPrintTimeHours] = useState<number>(initialPreset?.printTimeHours ?? 3.5);
  const [printerPowerWatts, setPrinterPowerWatts] = useState<number>(180);
  const [energyKwhRate, setEnergyKwhRate] = useState<number>(settings.energy_kwh_rate || 0.95);
  const [directSuppliesCost, setDirectSuppliesCost] = useState<number>(initialPreset?.directSuppliesCost ?? 2.50); // packaging, screws, keyrings, etc.
  const [lossRatePercent, setLossRatePercent] = useState<number>(settings.default_loss_margin || 5);
  const [laborHourlyRate, setLaborHourlyRate] = useState<number>(settings.hourly_labor_rate || 20);
  const [laborPrepMinutes, setLaborPrepMinutes] = useState<number>(10); // prep + post-processing

  // Target pricing mode: 'by_margin' | 'by_markup' | 'custom_price'
  const [pricingMode, setPricingMode] = useState<'by_margin' | 'by_markup' | 'custom_price'>('by_margin');
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(targetMarginDefault);
  const [targetMarkupPercent, setTargetMarkupPercent] = useState<number>(100);
  const [customSellingPrice, setCustomSellingPrice] = useState<number>(initialPreset?.sellingPrice ?? 45);

  // Commercial Channel & Taxes
  const [channelFeePercent, setChannelFeePercent] = useState<number>(0); // e.g. 14% for Meli/Shopee
  const [channelFixedFee, setChannelFixedFee] = useState<number>(0); // e.g. R$ 4 for low ticket
  const [taxPercent, setTaxPercent] = useState<number>(4); // MEI or Simples Nacional ~4%
  const [shippingCost, setShippingCost] = useState<number>(0);

  // Fixed Costs for Break-Even Analysis
  const [fixedCosts, setFixedCosts] = useState<number>(monthlyFixedCosts);
  const [targetMonthlyProfit, setTargetMonthlyProfit] = useState<number>(2000);

  // Sync with product selection if chosen
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      if (prod.filament_weight_g) setFilamentWeightG(prod.filament_weight_g);
      if (prod.print_time_minutes) setPrintTimeHours(Math.round((prod.print_time_minutes / 60) * 10) / 10);
      if (prod.extra_supplies_cost) setDirectSuppliesCost(prod.extra_supplies_cost);
      if (prod.suggested_price || prod.sale_price) {
        setCustomSellingPrice(prod.sale_price || prod.suggested_price);
      }
      if (prod.loss_margin_percent) {
        setLossRatePercent(prod.loss_margin_percent);
      }

      // Check linked filament price
      const fil = filaments.find((f) => f.id === prod.filament_id);
      if (fil && fil.cost_per_spool && fil.total_weight_g) {
        const kgPrice = (fil.cost_per_spool / fil.total_weight_g) * 1000;
        setFilamentKgPrice(Math.round(kgPrice * 100) / 100);
      }
    }
  };

  // 1. DIRECT PRODUCTION COST CALCULATIONS
  const directCostCalculations = useMemo(() => {
    // Filament raw cost
    const rawFilamentCost = (filamentWeightG / 1000) * filamentKgPrice;

    // Energy consumption: (Watts / 1000) * hours * R$/kWh
    const energyKwh = (printerPowerWatts / 1000) * printTimeHours;
    const energyCost = energyKwh * energyKwhRate;

    // Direct supplies (screws, packaging, magnets)
    const suppliesCost = Number(directSuppliesCost) || 0;

    // Labor cost (prep + post processing)
    const laborCost = (laborPrepMinutes / 60) * laborHourlyRate;

    // Subtotal before failure/loss margin
    const subtotalDirect = rawFilamentCost + energyCost + suppliesCost + laborCost;

    // Loss / failure allowance
    const lossCost = subtotalDirect * (lossRatePercent / 100);

    // Total Unitary Variable Production Cost (CPV)
    const totalUnitProductionCost = subtotalDirect + lossCost;

    return {
      rawFilamentCost,
      energyKwh,
      energyCost,
      suppliesCost,
      laborCost,
      lossCost,
      totalUnitProductionCost,
    };
  }, [
    filamentWeightG,
    filamentKgPrice,
    printerPowerWatts,
    printTimeHours,
    energyKwhRate,
    directSuppliesCost,
    laborPrepMinutes,
    laborHourlyRate,
    lossRatePercent,
  ]);

  // 2. PRICING AND CHANNEL FEES SIMULATION
  const pricingCalculations = useMemo(() => {
    const cpv = directCostCalculations.totalUnitProductionCost;
    let sellingPrice = 0;

    // Deductions proportional to selling price (Marketplace fee % + Tax %)
    const variableDeductionRate = (channelFeePercent + taxPercent) / 100;
    const fixedDeductions = channelFixedFee + shippingCost;

    if (pricingMode === 'by_margin') {
      // SellingPrice * (1 - Margin% - Deductions%) = CPV + FixedDeductions
      // SellingPrice = (CPV + FixedDeductions) / (1 - Margin% - Deductions%)
      const marginRate = targetMarginPercent / 100;
      const divisor = 1 - marginRate - variableDeductionRate;
      if (divisor > 0.05) {
        sellingPrice = (cpv + fixedDeductions) / divisor;
      } else {
        sellingPrice = (cpv + fixedDeductions) * 3; // Fallback to avoid division by near zero
      }
    } else if (pricingMode === 'by_markup') {
      // Price = CPV * (1 + markup%)
      const baseMarkupPrice = cpv * (1 + targetMarkupPercent / 100);
      // To cover deductions on top:
      sellingPrice = baseMarkupPrice + (baseMarkupPrice * variableDeductionRate) + fixedDeductions;
    } else {
      // Custom price defined by user
      sellingPrice = customSellingPrice;
    }

    sellingPrice = Math.max(0.01, sellingPrice);

    // Dynamic deductions on this price
    const channelFeeAmount = (sellingPrice * (channelFeePercent / 100)) + channelFixedFee;
    const taxAmount = sellingPrice * (taxPercent / 100);
    const totalCommercialDeductions = channelFeeAmount + taxAmount + shippingCost;

    // Net Revenue received by the business
    const netRevenue = sellingPrice - totalCommercialDeductions;

    // Unit Contribution Margin (Margem de Contribuição Unitária) = Net Revenue - CPV
    const unitContributionMargin = netRevenue - cpv;

    // Contribution Margin Ratio (%) = (Unit Contribution Margin / Selling Price) * 100
    const contributionMarginRatio = sellingPrice > 0 ? (unitContributionMargin / sellingPrice) * 100 : 0;

    // Markup over production cost
    const effectiveMarkupPercent = cpv > 0 ? ((sellingPrice - cpv) / cpv) * 100 : 0;

    return {
      sellingPrice,
      channelFeeAmount,
      taxAmount,
      totalCommercialDeductions,
      netRevenue,
      unitContributionMargin,
      contributionMarginRatio,
      effectiveMarkupPercent,
    };
  }, [
    directCostCalculations.totalUnitProductionCost,
    pricingMode,
    targetMarginPercent,
    targetMarkupPercent,
    customSellingPrice,
    channelFeePercent,
    channelFixedFee,
    taxPercent,
    shippingCost,
  ]);

  // 3. PONTO DE EQUILÍBRIO (BREAK-EVEN POINT)
  const breakEvenCalculations = useMemo(() => {
    const unitCM = pricingCalculations.unitContributionMargin;
    const cmRatio = pricingCalculations.contributionMarginRatio / 100;
    const fixed = Math.max(0, fixedCosts);
    const targetProfit = Math.max(0, targetMonthlyProfit);

    // Break-even in units = Fixed Costs / Unit Contribution Margin
    const breakEvenUnits = unitCM > 0 ? Math.ceil(fixed / unitCM) : Infinity;

    // Break-even in revenue (R$) = Fixed Costs / Contribution Margin Ratio
    const breakEvenRevenue = cmRatio > 0 ? fixed / cmRatio : Infinity;

    // Units needed to reach target monthly profit = (Fixed Costs + Target Profit) / Unit CM
    const targetUnits = unitCM > 0 ? Math.ceil((fixed + targetProfit) / unitCM) : Infinity;
    const targetRevenue = cmRatio > 0 ? (fixed + targetProfit) / cmRatio : Infinity;

    // Machine hours required for break-even
    const machineHoursBreakEven = isFinite(breakEvenUnits) ? breakEvenUnits * printTimeHours : 0;
    // Machine days (assuming 1 printer printing 12h/day or 24h/day)
    const machineDays12h = machineHoursBreakEven / 12;

    return {
      breakEvenUnits,
      breakEvenRevenue,
      targetUnits,
      targetRevenue,
      machineHoursBreakEven,
      machineDays12h,
    };
  }, [
    pricingCalculations.unitContributionMargin,
    pricingCalculations.contributionMarginRatio,
    fixedCosts,
    targetMonthlyProfit,
    printTimeHours,
  ]);

  // Preset channel helper
  const applyChannelPreset = (channel: 'direct' | 'shopee' | 'meli' | 'consignment') => {
    if (channel === 'direct') {
      setChannelFeePercent(0);
      setChannelFixedFee(0);
      setShippingCost(0);
    } else if (channel === 'shopee') {
      setChannelFeePercent(14); // Comissão padrão Shopee
      setChannelFixedFee(4.00); // Taxa fixa padrão Shopee
      setShippingCost(0);
    } else if (channel === 'meli') {
      setChannelFeePercent(16); // Mercado Livre Clássico/Premium
      setChannelFixedFee(6.00); // Taxa fixa produtos < R$ 79
      setShippingCost(0);
    } else if (channel === 'consignment') {
      setChannelFeePercent(25); // Comissão loja parceira (20 a 30%)
      setChannelFixedFee(0);
      setShippingCost(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DO SIMULADOR */}
      <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Simulador Dinâmico
            </span>
            <span className="text-xs text-slate-400">Calculadora & Precificação Estratégica</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Simulador de Preço & Ponto de Equilíbrio (Break-Even)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Descubra o preço de venda ideal considerando taxas de canal, impostos, custo de filamento, energia e saiba exatamente quantas peças você precisa vender para cobrir os custos fixos da sua oficina 3D.
          </p>
        </div>

        {/* Seleção Rápida de Produto Cadastrado */}
        {products.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1c1c20] p-2 rounded-xl border border-white/[0.08] shrink-0">
            <Package className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <label className="block text-[10px] text-slate-400 uppercase font-bold">Carregar Produto:</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
              >
                <option value="" className="bg-[#1c1c20] text-slate-400">
                  {initialPreset?.productName ? `-- Peça Atual: ${initialPreset.productName} --` : '-- Peça Personalizada / Avulsa --'}
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1c1c20] text-white">
                    {p.name} ({p.filament_weight_g}g • R$ {p.suggested_price || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* PAINEL PRINCIPAL: 2 COLUNAS (PARÂMETROS vs RESULTADOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: PARÂMETROS DE ENTRADA (7 colunas) */}
        <div className="lg:col-span-7 space-y-5">
          {/* BLOCO 1: CUSTOS DIRETOS DE PRODUÇÃO 3D */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                1. Custos Variáveis de Produção (CPV)
              </h3>
              <span className="text-xs font-black text-emerald-400">
                Custo Unitário: R$ {directCostCalculations.totalUnitProductionCost.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Peso do Filamento */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span>Peso da Peça (g)</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    R$ {directCostCalculations.rawFilamentCost.toFixed(2)}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={filamentWeightG}
                    onChange={(e) => setFilamentWeightG(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-semibold">g</span>
                </div>
              </div>

              {/* Preço do Filamento por Kg */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Preço do Filamento (R$/kg)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-semibold">R$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={filamentKgPrice}
                    onChange={(e) => setFilamentKgPrice(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-semibold">/kg</span>
                </div>
              </div>

              {/* Tempo de Impressão */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span>Tempo de Impressão</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {Math.floor(printTimeHours)}h {Math.round((printTimeHours % 1) * 60)}min
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={printTimeHours}
                    onChange={(e) => setPrintTimeHours(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-semibold">horas</span>
                </div>
              </div>

              {/* Consumo Elétrico & Tarifa */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span>Energia (Potência / Tarifa)</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    R$ {directCostCalculations.energyCost.toFixed(2)}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      min="50"
                      step="10"
                      title="Potência média em Watts"
                      value={printerPowerWatts}
                      onChange={(e) => setPrinterPowerWatts(Number(e.target.value) || 0)}
                      className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-2.5 py-2 text-white font-bold text-center outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-500 font-semibold">W</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="0.05"
                      title="Tarifa de Energia por kWh"
                      value={energyKwhRate}
                      onChange={(e) => setEnergyKwhRate(Number(e.target.value) || 0)}
                      className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-2.5 py-2 text-white font-bold text-center outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-500 font-semibold">/kWh</span>
                  </div>
                </div>
              </div>

              {/* Insumos Diretos (Embalagem, Parafusos, Argolas) */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Insumos Diretos / Embalagem</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-semibold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={directSuppliesCost}
                    onChange={(e) => setDirectSuppliesCost(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Margem de Perda / Falha (%) */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span>Margem de Falhas & Purga</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    + R$ {directCostCalculations.lossCost.toFixed(2)}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={lossRatePercent}
                    onChange={(e) => setLossRatePercent(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-semibold">%</span>
                </div>
              </div>

              {/* Mão de Obra e Acabamento (Minutos) */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between text-slate-400 font-medium">
                  <span>Mão de Obra Direta (Fatiamento + Retirada de Suportes + Acabamento)</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {laborPrepMinutes} min • R$ {directCostCalculations.laborCost.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      placeholder="Minutos"
                      value={laborPrepMinutes}
                      onChange={(e) => setLaborPrepMinutes(Number(e.target.value) || 0)}
                      className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2 text-slate-500 font-semibold">min</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-semibold">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      placeholder="Valor Hora"
                      value={laborHourlyRate}
                      onChange={(e) => setLaborHourlyRate(Number(e.target.value) || 0)}
                      className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2 text-slate-500 font-semibold">/hora</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO 2: CANAL COMERCIAL, TAXAS E IMPOSTOS */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-400" />
                2. Canal de Venda & Deduções Comerciais
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyChannelPreset('direct')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#1c1c20] hover:bg-white/[0.08] text-slate-300 transition border border-white/[0.06]"
                >
                  Venda Direta (0%)
                </button>
                <button
                  type="button"
                  onClick={() => applyChannelPreset('shopee')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition border border-amber-500/30"
                >
                  Shopee (14% + R$4)
                </button>
                <button
                  type="button"
                  onClick={() => applyChannelPreset('meli')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 transition border border-yellow-500/30"
                >
                  Mercado Livre (16% + R$6)
                </button>
                <button
                  type="button"
                  onClick={() => applyChannelPreset('consignment')}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition border border-purple-500/30"
                >
                  Consignado (25%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Comissão % */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Comissão do Canal (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={channelFeePercent}
                    onChange={(e) => setChannelFeePercent(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-purple-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-semibold">%</span>
                </div>
              </div>

              {/* Taxa Fixa R$ */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Taxa Fixa do Canal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-semibold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={channelFixedFee}
                    onChange={(e) => setChannelFixedFee(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Impostos (Simples/MEI) */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Impostos / DAS (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-purple-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-semibold">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO 3: ESTRATÉGIA DE FORMAÇÃO DE PREÇO */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                3. Estratégia de Precificação
              </h3>
            </div>

            {/* Modo de Precificação */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPricingMode('by_margin')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition ${
                  pricingMode === 'by_margin'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                }`}
              >
                <span>Margem de Lucro Alvo</span>
                <span className="text-[10px] font-normal text-slate-400">Fixar % líquida</span>
              </button>

              <button
                type="button"
                onClick={() => setPricingMode('by_markup')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition ${
                  pricingMode === 'by_markup'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                }`}
              >
                <span>Markup Multiplicador</span>
                <span className="text-[10px] font-normal text-slate-400">Sobre custo de prod.</span>
              </button>

              <button
                type="button"
                onClick={() => setPricingMode('custom_price')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition ${
                  pricingMode === 'custom_price'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-[#1c1c20] text-slate-400 border-white/[0.06]'
                }`}
              >
                <span>Preço Fixo / Concorrente</span>
                <span className="text-[10px] font-normal text-slate-400">Verificar margem</span>
              </button>
            </div>

            {/* Inputs Dinâmicos pelo Modo Selecionado */}
            <div className="bg-[#1c1c20] p-3.5 rounded-xl border border-white/[0.06] text-xs">
              {pricingMode === 'by_margin' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-300">Margem Líquida Alvo Desejada:</span>
                    <span className="text-sky-400 font-bold text-sm">{targetMarginPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={targetMarginPercent}
                    onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    O simulador calcula o preço bruto necessário para que, após deduzir os custos de produção, taxas do canal e impostos, sobre exatamente {targetMarginPercent}% do valor da venda.
                  </p>
                </div>
              )}

              {pricingMode === 'by_markup' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-300">Markup sobre Custo de Produção:</span>
                    <span className="text-sky-400 font-bold text-sm">+{targetMarkupPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="5"
                    value={targetMarkupPercent}
                    onChange={(e) => setTargetMarkupPercent(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">
                    Aplica um multiplicador direto de {((targetMarkupPercent / 100) + 1).toFixed(2)}x sobre o custo de produção de R$ {directCostCalculations.totalUnitProductionCost.toFixed(2)}.
                  </p>
                </div>
              )}

              {pricingMode === 'custom_price' && (
                <div className="space-y-2">
                  <label className="text-slate-300 font-medium block">Preço de Venda Praticado no Mercado (R$):</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={customSellingPrice}
                      onChange={(e) => setCustomSellingPrice(Number(e.target.value) || 0)}
                      className="w-full bg-[#141416] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-white font-bold text-base outline-none focus:border-sky-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Útil para verificar a viabilidade quando o preço é ditado pelo mercado ou concorrência.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BLOCO 4: CUSTOS FIXOS DA OFICINA (PARA PONTO DE EQUILÍBRIO) */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                4. Custos Fixos Mensais da Oficina & Meta
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Custos Fixos Mensais (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-semibold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={fixedCosts}
                    onChange={(e) => setFixedCosts(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500">Aluguel, internet, manutenção, MEI fixo, etc.</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Meta de Lucro Líquido Desejado (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-semibold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={targetMonthlyProfit}
                    onChange={(e) => setTargetMonthlyProfit(Number(e.target.value) || 0)}
                    className="w-full bg-[#1c1c20] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500">Pró-labore ou lucro livre da empresa.</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RESULTADOS EXECUTIVOS & BREAK-EVEN (5 colunas) */}
        <div className="lg:col-span-5 space-y-5">
          {/* CARD DESTAQUE: PREÇO SUGERIDO & MARGEM */}
          <div className="bg-gradient-to-br from-[#18181c] to-[#121214] p-6 rounded-3xl border border-emerald-500/30 shadow-xl relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Preço de Venda Simulado
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                pricingCalculations.unitContributionMargin > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {pricingCalculations.contributionMarginRatio.toFixed(1)}% margem
              </span>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                R$ {pricingCalculations.sellingPrice.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Lucro Líquido Unitário:{' '}
                <strong className={pricingCalculations.unitContributionMargin > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  R$ {pricingCalculations.unitContributionMargin.toFixed(2)}
                </strong>{' '}
                por peça vendida
              </p>
            </div>

            {/* DRE Unitária Sintética */}
            <div className="space-y-2 pt-3 border-t border-white/[0.08] text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>(+) Preço de Venda Bruto:</span>
                <span className="font-bold text-white">R$ {pricingCalculations.sellingPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-400">
                <span>(-) Taxas do Canal ({channelFeePercent}% + R${channelFixedFee}):</span>
                <span>- R$ {pricingCalculations.channelFeeAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-amber-400">
                <span>(-) Impostos Previstos ({taxPercent}%):</span>
                <span>- R$ {pricingCalculations.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>(=) Receita Líquida Recebida:</span>
                <span className="font-bold text-slate-200">R$ {pricingCalculations.netRevenue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-400">
                <span>(-) Custo Direto de Produção (CPV):</span>
                <span>- R$ {directCostCalculations.totalUnitProductionCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-sm font-black">
                <span className="text-white">(=) Margem de Contribuição Unitária:</span>
                <span className={pricingCalculations.unitContributionMargin > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  R$ {pricingCalculations.unitContributionMargin.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* CARD PONTO DE EQUILÍBRIO (BREAK-EVEN POINT) */}
          <div className="bg-[#141416] p-6 rounded-3xl border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Ponto de Equilíbrio (Break-Even)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Custos Fixos: R$ {fixedCosts.toFixed(2)}
              </span>
            </div>

            {pricingCalculations.unitContributionMargin <= 0 ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                <div>
                  <strong>Preço Inviável:</strong> A margem de contribuição unitária é negativa ou zero (R$ {pricingCalculations.unitContributionMargin.toFixed(2)}). Você terá prejuízo a cada peça impressa. Aumente o preço de venda ou reduza os custos.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 2 Métricas Principais: Peças e Faturamento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1c1c20] p-4 rounded-2xl border border-white/[0.06] text-center">
                    <span className="text-[11px] text-slate-400 font-semibold block">Peças para Empatar</span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                      {isFinite(breakEvenCalculations.breakEvenUnits) ? breakEvenCalculations.breakEvenUnits : '—'}
                    </div>
                    <span className="text-[10px] text-slate-500">peças / mês</span>
                  </div>

                  <div className="bg-[#1c1c20] p-4 rounded-2xl border border-white/[0.06] text-center">
                    <span className="text-[11px] text-slate-400 font-semibold block">Faturamento Mínimo</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                      R$ {isFinite(breakEvenCalculations.breakEvenRevenue) ? Math.round(breakEvenCalculations.breakEvenRevenue) : '—'}
                    </div>
                    <span className="text-[10px] text-slate-500">faturamento / mês</span>
                  </div>
                </div>

                {/* Horas de Máquina Necessárias */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      Capacidade de Impressora:
                    </span>
                    <span className="font-bold text-white">
                      {breakEvenCalculations.machineHoursBreakEven.toFixed(0)} horas de máquina
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Equivale a aproximadamente{' '}
                    <strong className="text-white">
                      {breakEvenCalculations.machineDays12h.toFixed(1)} dias
                    </strong>{' '}
                    de 1 impressora rodando 12h/dia para atingir o ponto de equilíbrio.
                  </p>
                </div>

                {/* Meta com Lucro Desejado */}
                {targetMonthlyProfit > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span>Meta para Lucro de R$ {targetMonthlyProfit.toFixed(0)}:</span>
                      <span className="text-sm text-emerald-400">
                        {breakEvenCalculations.targetUnits} peças
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 text-[11px]">
                      <span>Faturamento necessário:</span>
                      <span className="font-bold text-white">
                        R$ {Math.round(breakEvenCalculations.targetRevenue).toLocaleString('pt-BR')} / mês
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DICAS E INSIGHTS DE PRECIFICAÇÃO */}
          <div className="bg-[#141416] p-5 rounded-2xl border border-white/[0.08] space-y-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-white font-bold">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Dicas de Precificação 3D</span>
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-[11px]">
              <li>
                <strong className="text-slate-300">Evite precificar só pelo peso:</strong> O tempo de máquina e as perdas de purga/suporte geralmente representam o maior custo oculto.
              </li>
              <li>
                <strong className="text-slate-300">Taxas de Marketplaces:</strong> Em produtos de ticket baixo (&lt; R$ 79), taxas fixas de R$ 4 a R$ 6 impactam fortemente a margem. Considere criar kits com 2 ou 3 unidades.
              </li>
              <li>
                <strong className="text-slate-300">Margem de Contribuição:</strong> Cada peça vendida deve primeiro cobrir seus custos variáveis diretos para depois contribuir no pagamento do aluguel e energia fixa da oficina.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
