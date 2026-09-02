import { AppSettings, CostCalculationResult, ExtraSupplyItem, Filament, Printer } from '../types';

export interface CostCalculatorParams {
  filamentWeightGrams: number;
  printTimeMinutes: number;
  filament?: Filament | null;
  printer?: Printer | null;
  supplies: ExtraSupplyItem[];
  settings: AppSettings;
  customLossMargin?: number;
  prepTimeMinutes?: number;
  markupPercent?: number;
}

export function calculatePieceCost(params: CostCalculatorParams): CostCalculationResult {
  const {
    filamentWeightGrams,
    printTimeMinutes,
    filament,
    printer,
    supplies,
    settings,
    customLossMargin,
    prepTimeMinutes = 5,
    markupPercent = 120,
  } = params;

  const lossMargin = customLossMargin !== undefined 
    ? customLossMargin 
    : (printer?.failure_rate_default ?? settings.default_loss_margin ?? 10);

  // 1. Filament Cost
  let costPerGram = 0.09; // fallback R$ 90/kg
  if (filament && filament.total_weight_g > 0) {
    costPerGram = filament.cost_per_spool / filament.total_weight_g;
  }
  const baseFilamentCost = filamentWeightGrams * costPerGram;
  const lossMarginCost = baseFilamentCost * (lossMargin / 100);
  const filamentCost = baseFilamentCost + lossMarginCost;

  // 2. Machine Energy Cost
  const printerWatts = printer ? (printer.printer_power_watts + printer.bed_heater_watts) : 280;
  const printTimeHours = printTimeMinutes / 60;
  const energyKwh = (printerWatts * printTimeHours) / 1000;
  const energyCost = energyKwh * (settings.energy_kwh_rate || 0.85);

  // 3. Machine Depreciation & Wear
  const depreciationPerHour = printer?.hourly_depreciation ?? 0.60;
  const depreciationCost = printTimeHours * depreciationPerHour;

  // 4. Extra Supplies Cost (BOM: argola, mosquetão, parafusos, embalagem, etc.)
  const suppliesCost = supplies.reduce((acc, item) => acc + (item.qty * item.unit_cost), 0);

  // 5. Labor / Setup Time
  const prepTimeHours = (prepTimeMinutes || 0) / 60;
  const laborCost = prepTimeHours * (settings.hourly_labor_rate || 20.00);

  // 6. Total Production Cost
  const totalProductionCost = filamentCost + energyCost + depreciationCost + suppliesCost + laborCost;

  // 7. Markup & Selling Price
  const targetMarkup = Math.max(0, markupPercent);
  const suggestedSalePrice = totalProductionCost * (1 + targetMarkup / 100);
  const profitAmount = suggestedSalePrice - totalProductionCost;
  const profitMarginPercent = suggestedSalePrice > 0 ? (profitAmount / suggestedSalePrice) * 100 : 0;

  return {
    filamentWeightGrams: Number(filamentWeightGrams.toFixed(2)),
    filamentCost: Number(filamentCost.toFixed(2)),
    printTimeMinutes: Math.round(printTimeMinutes),
    energyKwh: Number(energyKwh.toFixed(3)),
    energyCost: Number(energyCost.toFixed(2)),
    depreciationCost: Number(depreciationCost.toFixed(2)),
    lossMarginCost: Number(lossMarginCost.toFixed(2)),
    suppliesCost: Number(suppliesCost.toFixed(2)),
    laborCost: Number(laborCost.toFixed(2)),
    totalProductionCost: Number(totalProductionCost.toFixed(2)),
    markupPercent: Math.round(targetMarkup),
    suggestedSalePrice: Number(suggestedSalePrice.toFixed(2)),
    profitAmount: Number(profitAmount.toFixed(2)),
    profitMarginPercent: Number(profitMarginPercent.toFixed(1)),
  };
}
