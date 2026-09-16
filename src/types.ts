export type PrinterBrand =
  | 'Bambu Lab'
  | 'Creality'
  | 'Prusa Research'
  | 'Anycubic'
  | 'Elegoo'
  | 'Flashforge'
  | 'Stratasys'
  | '3D Systems'
  | 'EOS'
  | 'HP'
  | 'Outra';

export type PrinterConnectionType = 'lan' | 'cloud' | 'offline';

export type PrinterProtocol =
  | 'bambu_mqtt'
  | 'moonraker_klipper'
  | 'prusalink'
  | 'prusa_connect'
  | 'creality_cloud'
  | 'anycubic_cloud'
  | 'anycubic_lan'
  | 'octoprint'
  | 'flashforge_lan'
  | 'stratasys_grabcad'
  | 'threed_systems_api'
  | 'eosconnect'
  | 'hp_jetfusion'
  | 'custom_http';

export interface DiscoveredNetworkPrinter {
  id: string;
  brand: PrinterBrand;
  model: string;
  ip_address: string;
  port: number;
  protocol: PrinterProtocol;
  mac_address?: string;
  hostname?: string;
  ping_ms: number;
  firmware_version?: string;
  connection_type: 'lan' | 'cloud';
  serial_number?: string;
  bed_size: { x: number; y: number; z: number };
  detected_ams?: boolean;
  status: 'available' | 'printing' | 'idle';
  already_registered?: boolean;
}

export interface DirectPrintJobRequest {
  printer_id: string;
  filament_id?: string;
  job_name: string;
  product_name?: string;
  connection_mode: 'lan' | 'cloud';
  file_name: string;
  file_type?: string;
  estimated_time_minutes: number;
  filament_used_g: number;
  layer_height_mm?: number;
  infill_percent?: number;
  nozzle_temp?: number;
  bed_temp?: number;
  auto_start?: boolean;
  auto_bed_level?: boolean;
  flow_calibration?: boolean;
  timelapse?: boolean;
  ams_slot?: number;
  total_cost?: number;
  copies?: number;
  notes?: string;
}

export interface Printer {
  id: string;
  name: string;
  printer_power_watts: number;
  bed_heater_watts: number;
  filament_heater_watts: number;
  total_power_watts: number;
  hourly_depreciation: number;
  failure_rate_default: number;
  status: 'available' | 'printing' | 'maintenance';
  // Network & Cloud attributes
  brand?: PrinterBrand;
  model?: string;
  connection_type?: PrinterConnectionType;
  protocol?: PrinterProtocol;
  ip_address?: string;
  port?: number;
  api_key?: string; // LAN password / Access Code / API Key
  device_id?: string; // Serial / Cloud ID
  cloud_endpoint?: string;
  camera_stream_url?: string;
  bed_size_x?: number;
  bed_size_y?: number;
  bed_size_z?: number;
  nozzle_diameter?: number;
  online_status?: 'online' | 'offline' | 'busy' | 'unreachable';
  current_temp_nozzle?: number;
  target_temp_nozzle?: number;
  current_temp_bed?: number;
  target_temp_bed?: number;
  current_job_name?: string;
  current_progress_percent?: number;
  last_seen_at?: string;
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
  subcategory?: string;
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
  image_url?: string;
  plates_json?: string; // JSON of BuildPlate[] or PlatesProjectData
  created_at: string;
}

export interface BuildPlatePart {
  id: string;
  name: string;
  originalMeshIndex: number;
  color_hex?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  dimensions: { x: number; y: number; z: number };
  volumeCm3: number;
  weightGrams: number;
  trianglesCount: number;
}

export interface BuildPlate {
  id: string;
  name: string;
  plateNumber: number;
  printer_id?: string;
  filament_id?: string;
  filament_name?: string;
  filament_color?: string;
  filament_color_hex?: string;
  filament_material?: string;
  bed_dimensions: { x: number; y: number; z: number };
  parts: BuildPlatePart[];
  estimated_time_minutes: number;
  estimated_weight_g: number;
  estimated_cost: number;
  notes?: string;
}

export interface PlatesProjectData {
  id?: string;
  projectName: string;
  sourceFileName?: string;
  productId?: string;
  productName?: string;
  plates: BuildPlate[];
  totalPlates: number;
  totalParts: number;
  totalWeightG: number;
  totalTimeMinutes: number;
  totalCost: number;
  updatedAt: string;
}

export interface ProductSubcategory {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  subcategories?: ProductSubcategory[];
}

export interface Client {
  id: string;
  name: string;
  type: 'pf' | 'cnpj' | 'store';
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  cnpj_cpf?: string;
  phone?: string;
  email?: string;
  website?: string;
  category: string;
  address?: string;
  lead_time_days?: number;
  payment_terms?: string;
  notes?: string;
  rating?: number;
  created_at: string;
}

export interface SupplierQuote {
  id: string;
  supplier_id: string;
  supplier_name: string;
  item_type: 'filament' | 'supply' | 'other';
  item_id?: string;
  item_name: string;
  unit_price: number;
  unit: string;
  moq?: number;
  shipping_cost?: number;
  lead_time_days?: number;
  valid_until?: string;
  status: 'active' | 'approved' | 'rejected' | 'expired';
  notes?: string;
  created_at: string;
}

export interface QuoteRoundItem {
  id: string;
  name: string;
  item_type: 'filament' | 'supply' | 'part' | 'other';
  quantity: number;
  unit: string;
  target_price?: number;
  notes?: string;
}

export interface QuoteRoundSupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  access_token: string;
  invited_at: string;
  responded_at?: string;
  status: 'invited' | 'opened' | 'submitted' | 'declined';
}

export interface ProposalItemResponse {
  item_id: string;
  item_name: string;
  available: boolean;
  brand_model?: string;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface QuoteProposal {
  id: string;
  round_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  access_token: string;
  items: ProposalItemResponse[];
  subtotal_items: number;
  shipping_type: 'free' | 'carrier' | 'pickup';
  shipping_cost: number;
  carrier_name?: string;
  delivery_lead_days: number;
  payment_terms?: string;
  installments_count: number;
  installments_details?: string;
  total_quote: number;
  supplier_notes?: string;
  submitted_at: string;
  is_winner?: boolean;
}

export interface QuoteRound {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  status: 'open' | 'closed' | 'awarded';
  items: QuoteRoundItem[];
  invited_suppliers: QuoteRoundSupplier[];
  awarded_supplier_id?: string | null;
  proposals?: QuoteProposal[];
  proposals_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialPurchase {
  id: string;
  item_type: 'filament' | 'supply' | 'other';
  item_id?: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  purchase_date: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export interface ConsignmentItem {
  id: string;
  consignment_id: string;
  product_id?: string;
  product_name: string;
  quantity_consigned: number;
  quantity_sold: number;
  unit_price: number;
  unit_cost: number;
  created_at: string;
}

export interface Consignment {
  id: string;
  client_id?: string;
  client_name: string;
  status: 'active' | 'settled';
  notes?: string;
  created_at: string;
  items: ConsignmentItem[];
}

export type SaleChannelType = 'platform' | 'cnpj' | 'pf' | 'direct' | 'indirect' | 'consignment' | 'presale';

export type DeliveryStatus =
  | 'pending'      // Aguardando Separação
  | 'separated'    // Separado
  | 'packaged'     // Embalado / Pronto para envio
  | 'shipped'      // Entregue aos Correios / Despachado
  | 'in_transit'   // Em Trânsito
  | 'delivered'    // Entregue ao Cliente
  | 'picked_up'    // Retirado no Local
  | 'returned';    // Devolvido / Problema

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
  delivery_status?: DeliveryStatus;
  tracking_code?: string;
  shipping_carrier?: string;
  shipping_cost?: number;
  delivery_address?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  delivery_notes?: string;
}

export interface MaterialPurchase {
  id: string;
  item_type: 'filament' | 'supply' | 'other';
  item_id?: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  purchase_date: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export type FinancialAccountType = 'payable' | 'receivable'; // Contas a Pagar / Contas a Receber
export type FinancialAccountStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type FinancialAccountCategory = 
  | 'filament'
  | 'supply'
  | 'maintenance'
  | 'energy'
  | 'equipment'
  | 'rent_fixed'
  | 'sale_client'
  | 'sale_marketplace'
  | 'consignment_settlement'
  | 'services'
  | 'taxes'
  | 'other';

export interface FinancialAccount {
  id: string;
  type: FinancialAccountType;
  description: string;
  category: FinancialAccountCategory;
  entity_name: string; // Fornecedor / Cliente / Plataforma
  document_ref?: string; // Número da NF / Pedido / Título
  amount: number;
  due_date: string; // YYYY-MM-DD
  payment_date?: string | null; // YYYY-MM-DD quando baixado
  payment_method?: string; // PIX, Boleto, Cartão, Transferência
  status: FinancialAccountStatus;
  notes?: string;
  related_sale_id?: string;
  related_purchase_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface AgingBucket {
  key: string;
  label: string;
  daysRange: string;
  count: number;
  totalPayable: number;
  totalReceivable: number;
  color: string;
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
  cost_center_id?: string;
  cost_center_name?: string;
  project_id?: string;
  project_code?: string;
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
  transportCost: number;
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

export interface SetupTemplate {
  id: string;
  name: string;
  setup_time_minutes: number;
  category: 'clean' | 'calibration' | 'preheat' | 'other';
  description?: string;
  created_at: string;
}

export interface ShippingCarrier {
  id: string;
  name: string;
  service_type: string;
  default_cost: number;
  delivery_days?: string;
  notes?: string;
  created_at: string;
}

export interface AmsHeater {
  id: string;
  printer_id?: string;
  printer_name?: string;
  name: string;
  type: 'ams' | 'heater' | 'drybox' | 'multi_feeder';
  slots_count: number;
  power_watts: number;
  status: 'active' | 'maintenance' | 'inactive';
  notes?: string;
}

export type MaintenanceType = 'preventiva' | 'corretiva' | 'limpeza_bico' | 'calibracao' | 'troca_ptfe' | 'outros';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'resolved';
export type MaintenanceSeverity = 'low' | 'normal' | 'high' | 'urgent';

export interface PrinterMaintenance {
  id: string;
  printer_id: string;
  printer_name: string;
  maintenance_type: MaintenanceType;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  status: MaintenanceStatus;
  severity: MaintenanceSeverity;
  technician?: string;
}

export type BillingCycle = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'vitalicio';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: BillingCycle;
  description: string;
  max_users: number; // -1 for unlimited
  max_printers: number; // -1 for unlimited
  max_products: number; // -1 for unlimited
  features: string[]; // List of enabled feature keys
  is_popular: boolean;
  is_active: boolean;
  badge?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'manager';
  created_at: string;
  last_login_at?: string;
}

export interface PlanFeatureDefinition {
  key: string;
  category: 'core' | 'production' | 'stock' | 'sales' | 'integrations';
  title: string;
  description: string;
  badge?: string;
}

export type CompanyDocumentType = 'CNPJ' | 'CPF';
export type CompanyStatus = 'active' | 'trial' | 'suspended' | 'blocked';

export interface Company {
  id: string;
  name: string; // Razão Social ou Nome Completo
  trade_name?: string; // Nome Fantasia
  document_type: CompanyDocumentType;
  document_number: string; // CNPJ (xx.xxx.xxx/xxxx-xx) ou CPF (xxx.xxx.xxx-xx)
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  plan_id?: string;
  plan_name?: string;
  plan_price?: number;
  plan_cycle?: BillingCycle;
  status: CompanyStatus;
  notes?: string;
  billing_cycle: BillingCycle;
  expires_at?: string;
  max_users_override?: number | null;
  max_printers_override?: number | null;
  max_products_override?: number | null;
  users_count?: number;
  printers_count?: number;
  products_count?: number;
  created_at: string;
  updated_at?: string;
}

export type AppUserRole = 'admin' | 'manager' | 'operator' | 'sales' | 'financial' | 'viewer';
export type AppUserStatus = 'active' | 'inactive' | 'blocked';

export interface AppUser {
  id: string;
  company_id: string;
  company_name?: string;
  company_document?: string;
  name: string;
  email: string;
  phone?: string;
  role: AppUserRole;
  status: AppUserStatus;
  permissions: string[];
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AppAccessLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  company_id?: string;
  company_name?: string;
  action: string;
  ip_address?: string;
  status: 'success' | 'warning' | 'danger';
  details?: string;
  created_at: string;
}

// ================= CENTRO DE CUSTOS & ALOCAÇÃO POR PROJETO / ENCOMENDA =================
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string; // emerald, sky, amber, purple, rose, indigo
  budget_monthly?: number;
  is_active?: boolean | number;
  created_at: string;
  total_projects?: number;
  total_allocated_cost?: number;
  total_agreed_revenue?: number;
  budget_utilization_percent?: number;
}

export type CustomProjectStatus =
  | 'draft'        // Rascunho / Orçamento preliminar
  | 'quote'        // Orçamento enviado ao cliente
  | 'approved'     // Aprovado / Aguardando fila
  | 'in_progress'  // Em Produção
  | 'completed'    // Produção Concluída
  | 'delivered'    // Entregue / Faturado
  | 'cancelled';   // Cancelado

export type CustomProjectPriority = 'low' | 'normal' | 'high' | 'urgent';

export type AllocationResourceType = 'filament' | 'supply' | 'machine_time' | 'labor' | 'outsourced';

export interface ProjectAllocation {
  id: string;
  project_id: string;
  resource_type: AllocationResourceType;
  resource_id?: string;
  resource_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  stock_deducted: boolean | number;
  notes?: string;
  allocated_at: string;
}

export interface CustomProject {
  id: string;
  code: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  cost_center_id: string;
  cost_center_name?: string;
  status: CustomProjectStatus;
  priority: CustomProjectPriority;
  target_delivery_date?: string;
  agreed_price: number;
  amount_paid: number;
  production_order_id?: string;
  op_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  allocations?: ProjectAllocation[];
  total_allocated_cost?: number;
  profit?: number;
  profit_margin_percent?: number;
}

// ==========================================
// CONTROLE DE DEPRECIAÇÃO DE MÁQUINAS E EQUIPAMENTOS
// ==========================================

export type AssetCategory =
  | '3d_printer'         // Impressoras 3D (FDM, Resina SLA/DLP, SLS)
  | 'post_processing'    // Estações de Lavagem, Cura UV, Cabine de Pintura, Jateamento
  | 'drying_storage'     // Secadores de Filamento, Dry Box, Desumidificador, Estufas
  | 'power_protection'   // Nobreak Online / UPS, Transformadores, Ar-condicionado
  | 'tooling_cad'        // Estações CAD / Computador de Fatiamento, Dremel, Scanner 3D
  | 'other';             // Outros equipamentos e periféricos

export type DepreciationMethod =
  | 'linear_time'        // Linear Contábil por Tempo (Vida útil em meses/anos)
  | 'operating_hours'    // Unidades de Produção / Horas de Operação (Horímetro)
  | 'sum_of_years';      // Soma dos Dígitos dos Anos (Depreciação Acelerada)

export type AssetStatus =
  | 'active'             // Em Operação
  | 'maintenance'        // Em Manutenção
  | 'fully_depreciated'  // 100% Depreciado / Amortizado (Continua em uso)
  | 'disposed';          // Baixado / Vendido / Sucateado

export interface MachineAsset {
  id: string;
  code: string;                          // PAT-001, EQP-002
  name: string;                          // Ex: Bambu Lab P1S Combo c/ AMS
  category: AssetCategory;
  printer_id?: string;                   // Vínculo opcional com a tabela printers
  printer_name?: string;
  brand?: string;                        // Bambu Lab, Creality, Elegoo, etc.
  model?: string;                        // P1S, K1 Max, Neptune 4
  serial_number?: string;
  purchase_date: string;                 // YYYY-MM-DD
  supplier?: string;
  invoice_number?: string;
  acquisition_cost: number;              // Valor da máquina na compra (R$)
  freight_and_installation: number;      // Frete, impostos, acessórios iniciais
  initial_total_cost: number;            // Custo Total Ativado = Aquisição + Frete
  residual_value: number;                // Valor de revenda/sucata estimado ao final
  depreciable_base: number;              // Base depreciável = Total - Residual
  depreciation_method: DepreciationMethod;
  useful_life_months: number;            // Ex: 36 meses (3 anos)
  useful_life_hours: number;             // Ex: 6.000 horas
  accumulated_hours: number;             // Horímetro real acumulado
  current_status: AssetStatus;
  hourly_rate: number;                   // R$/hora calculado de depreciação
  monthly_rate: number;                  // R$/mês calculado de depreciação
  accumulated_depreciation: number;      // Depreciação acumulada até hoje (R$)
  current_book_value: number;            // Valor Contábil Líquido atual (R$)
  percent_depreciated?: number;          // % da vida útil/depreciação já consumida
  months_elapsed?: number;               // Meses decorridos desde a compra
  location?: string;                     // Sala 1, Bancada Principal, etc.
  disposal_date?: string;
  disposal_value?: number;
  disposal_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DepreciationLog {
  id: string;
  asset_id: string;
  asset_name?: string;
  period_month: string;                  // YYYY-MM
  depreciation_amount: number;
  accumulated_to_date: number;
  book_value_after: number;
  method_used: DepreciationMethod;
  hours_in_period?: number;
  notes?: string;
  created_at: string;
}

export interface DepreciationSummary {
  total_assets: number;
  active_assets: number;
  total_acquisition_cost: number;
  total_accumulated_depreciation: number;
  total_current_book_value: number;
  total_monthly_depreciation_provision: number;
  average_hourly_depreciation: number;
  fully_depreciated_count: number;
  maintenance_count: number;
}



