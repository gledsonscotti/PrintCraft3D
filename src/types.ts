export interface Printer {
  id: string;
  name: string;
  printer_power_watts: number;
  bed_heater_watts: number;
  total_power_watts: number;
  hourly_depreciation: number;
  failure_rate_default: number;
  status: 'available' | 'printing' | 'maintenance';
}

export interface Filament {
  id: string;
  name: string;
  brand: string;
  material: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'ASA' | 'Resina' | string;
  color: string;
  color_hex: string;
  total_weight_g: number;
  remaining_weight_g: number;
  cost_per_spool: number;
  diameter: number; // 1.75 or 2.85 mm
  density: number; // g/cm³ (PLA: 1.24, PETG: 1.27, ABS: 1.04, TPU: 1.21)
}

export interface Supply {
  id: string;
  name: string;
  unit: string; // 'un', 'kit', 'par', 'm'
  unit_cost: number;
  in_stock_qty: number;
  min_stock_alert: number;
}

export interface ExtraSupplyItem {
  supply_id: string;
  name: string;
  qty: number;
  unit_cost: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  stl_filename?: string;
  gcode_filename?: string;
  printer_id: string;
  filament_id: string;
  filament_weight_g: number;
  print_time_minutes: number;
  energy_cost: number;
  filament_cost: number;
  loss_margin_percent: number;
  depreciation_cost: number;
  labor_cost: number;
  extra_supplies_json: string; // JSON array of ExtraSupplyItem
  extra_supplies_cost: number;
  total_cost: number;
  markup_percent: number;
  suggested_price: number;
  sale_price: number;
  created_at: string;
}

export interface PrintJob {
  id: string;
  product_id?: string;
  product_name: string;
  printer_id: string;
  printer_name: string;
  filament_id: string;
  filament_name: string;
  quantity: number;
  filament_used_g: number;
  total_time_minutes: number;
  total_cost: number;
  supplies_used_json: string;
  deducted_from_stock: number; // 1 or 0
  status: 'completed' | 'failed' | 'in_progress';
  created_at: string;
}

export interface AppSettings {
  energy_kwh_rate: number;
  currency: string;
  default_loss_margin: number;
  hourly_labor_rate: number;
  default_infill: number;
  default_layer_height: number;
}

export interface CostCalculationResult {
  filamentWeightGrams: number;
  filamentCost: number;
  printTimeMinutes: number;
  energyKwh: number;
  energyCost: number;
  depreciationCost: number;
  lossMarginCost: number;
  suppliesCost: number;
  laborCost: number;
  totalProductionCost: number;
  markupPercent: number;
  suggestedSalePrice: number;
  profitAmount: number;
  profitMarginPercent: number;
}

export type AppTheme = 'standard' | 'high-contrast-light' | 'high-contrast-dark';
