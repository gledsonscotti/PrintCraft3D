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
  ready_stock_qty?: number;
  min_stock_alert?: number;
  created_at: string;
}

export type SaleChannelType = 'platform' | 'cnpj' | 'pf';

export interface ProductSale {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_revenue: number;
  unit_cost: number;
  total_cost: number;
  profit: number;
  channel_type: SaleChannelType;
  channel_name: string;
  customer_document?: string;
  customer_name?: string;
  platform_fee_percent?: number;
  platform_fee_amount?: number;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export type ProductionPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ProductionStatus = 'pending' | 'in_progress' | 'post_processing' | 'completed' | 'failed';
export type ProductionDestination = 'stock' | 'sale';

export interface ProductionOrder {
  id: string;
  op_number: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  printer_id?: string;
  printer_name?: string;
  filament_id?: string;
  filament_name?: string;
  filament_weight_g: number;
  print_time_minutes: number;
  priority: ProductionPriority;
  status: ProductionStatus;
  progress_percent: number;
  started_at?: string;
  completed_at?: string;
  sale_id?: string;
  customer_name?: string;
  destination: ProductionDestination;
  notes?: string;
  supplies_json?: string;
  fail_reason?: string;
  wasted_filament_g?: number;
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

export type AppTheme = 'standard' | 'high-contrast-light' | 'high-contrast-dark' | 'sage-bento';

export interface SlicingProfileSpec {
  layerHeight: string;
  wallLoops: number;
  infillPercent: number;
  infillPattern: string;
  topLayers: number;
  bottomLayers: number;
  printSpeed: string;
  nozzleTemp: string;
  bedTemp: string;
  fanSpeed: string;
}

export interface SlicingProfile {
  id: 'eco' | 'balanced' | 'strength';
  name: string;
  tier: number;
  badge: string;
  badgeColor: 'emerald' | 'sky' | 'amber' | 'purple';
  description: string;
  summary: string;
  specs: SlicingProfileSpec;
  estimatedWeightGrams: number;
  estimatedTimeMinutes: number;
  actionableTips: string[];
  metrics: {
    strengthScore: number;
    speedScore: number;
    economyScore: number;
    finishScore: number;
  };
}

export interface AiOptimizationResult {
  diagnostic: {
    pieceType: string;
    structuralAnalysis: string;
    idealBedOrientation: string;
    supportNeeded: string;
    layerAdhesionTips: string;
  };
  profiles: SlicingProfile[];
  slicerSnippets?: {
    recommendedSlicer: string;
    quickCopyNotes: string;
  };
  tips?: string[];
}

export type MarketplacePlatformId = 'mercadolivre' | 'shopee' | 'amazon' | 'shein' | 'elo7' | 'bling';

export interface SkuMapping {
  internal_product_id: string;
  internal_product_name: string;
  marketplace_sku: string;
  marketplace_listing_id?: string;
  marketplace_price?: number;
  sync_active: boolean;
  last_synced_stock?: number;
}

export interface MarketplaceIntegration {
  id: string;
  platform_id: MarketplacePlatformId;
  name: string;
  enabled: boolean;
  environment: 'production' | 'sandbox';
  app_id?: string;
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  seller_id?: string;
  partner_id?: string;
  partner_key?: string;
  shop_id?: string;
  aws_region?: string;
  default_commission_percent: number;
  fixed_fee_per_sale: number;
  auto_stock_sync: boolean;
  auto_order_import: boolean;
  webhook_url?: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  last_sync_at?: string;
  last_error?: string;
  sku_mappings: SkuMapping[];
}

export interface IntegrationLog {
  id: string;
  platform_id: string;
  platform_name: string;
  event_type: 'order.created' | 'stock.updated' | 'ping' | 'webhook.received' | 'auth.refreshed' | 'price.updated';
  status: 'success' | 'warning' | 'error';
  message: string;
  payload_summary?: string;
  created_at: string;
}

