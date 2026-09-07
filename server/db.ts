import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;
const dbPath = path.join(process.cwd(), 'database.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing database.sqlite, creating fresh database:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  initTables(db);
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initTables(database: Database) {
  // 1. Printers table
  database.run(`
    CREATE TABLE IF NOT EXISTS printers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      printer_power_watts REAL NOT NULL DEFAULT 80,
      bed_heater_watts REAL NOT NULL DEFAULT 200,
      filament_heater_watts REAL NOT NULL DEFAULT 0,
      total_power_watts REAL NOT NULL DEFAULT 280,
      hourly_depreciation REAL NOT NULL DEFAULT 0.50,
      failure_rate_default REAL NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'available'
    );
  `);
  try {
    database.run("ALTER TABLE printers ADD COLUMN filament_heater_watts REAL NOT NULL DEFAULT 0;");
  } catch (e) {
    // Column already exists
  }

  // AMS & Heaters table
  database.run(`
    CREATE TABLE IF NOT EXISTS ams_heaters (
      id TEXT PRIMARY KEY,
      printer_id TEXT,
      printer_name TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'ams',
      slots_count INTEGER DEFAULT 4,
      power_watts REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT
    );
  `);

  // Printer Maintenance table
  database.run(`
    CREATE TABLE IF NOT EXISTS printer_maintenance (
      id TEXT PRIMARY KEY,
      printer_id TEXT NOT NULL,
      printer_name TEXT NOT NULL,
      maintenance_type TEXT NOT NULL DEFAULT 'preventiva',
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      severity TEXT NOT NULL DEFAULT 'normal',
      technician TEXT
    );
  `);

  // 2. Filaments table (real-time stock management)
  database.run(`
    CREATE TABLE IF NOT EXISTS filaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      material TEXT NOT NULL,
      color TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      total_weight_g REAL NOT NULL,
      remaining_weight_g REAL NOT NULL,
      cost_per_spool REAL NOT NULL,
      diameter REAL NOT NULL DEFAULT 1.75,
      density REAL NOT NULL DEFAULT 1.24
    );
  `);

  // 3. Supplies table (insumos: argolas, parafusos, imãs, embalagens)
  database.run(`
    CREATE TABLE IF NOT EXISTS supplies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'un',
      unit_cost REAL NOT NULL DEFAULT 0.0,
      in_stock_qty INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 10
    );
  `);

  // 4. Products table
  database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      stl_filename TEXT,
      gcode_filename TEXT,
      printer_id TEXT NOT NULL,
      filament_id TEXT NOT NULL,
      filament_weight_g REAL NOT NULL,
      print_time_minutes REAL NOT NULL,
      energy_cost REAL NOT NULL,
      filament_cost REAL NOT NULL,
      loss_margin_percent REAL NOT NULL DEFAULT 10,
      depreciation_cost REAL NOT NULL DEFAULT 0,
      labor_cost REAL NOT NULL DEFAULT 0,
      extra_supplies_json TEXT NOT NULL DEFAULT '[]',
      extra_supplies_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL,
      markup_percent REAL NOT NULL DEFAULT 100,
      suggested_price REAL NOT NULL,
      sale_price REAL NOT NULL,
      ready_stock_qty INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 5,
      image_url TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Run migration safely for existing databases
  try {
    database.run('ALTER TABLE products ADD COLUMN ready_stock_qty INTEGER NOT NULL DEFAULT 0;');
  } catch {}
  try {
    database.run('ALTER TABLE products ADD COLUMN min_stock_alert INTEGER NOT NULL DEFAULT 5;');
  } catch {}
  try {
    database.run('ALTER TABLE products ADD COLUMN image_url TEXT;');
  } catch {}

  // 5. Product Sales table (vendas por plataforma, CNPJ ou Pessoa Física)
  database.run(`
    CREATE TABLE IF NOT EXISTS product_sales (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_revenue REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL DEFAULT 0,
      channel_type TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      customer_document TEXT,
      customer_name TEXT,
      platform_fee_percent REAL NOT NULL DEFAULT 0,
      platform_fee_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'pf',
      document TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS consignments (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      client_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS consignment_items (
      id TEXT PRIMARY KEY,
      consignment_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity_consigned INTEGER NOT NULL,
      quantity_sold INTEGER NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 5. Print jobs history table
  database.run(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT NOT NULL,
      printer_id TEXT NOT NULL,
      printer_name TEXT NOT NULL,
      filament_id TEXT NOT NULL,
      filament_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      filament_used_g REAL NOT NULL,
      total_time_minutes REAL NOT NULL,
      total_cost REAL NOT NULL,
      supplies_used_json TEXT NOT NULL DEFAULT '[]',
      deducted_from_stock INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL
    );
  `);

  // 6. Settings table
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 7. System metadata table to prevent re-seeding if user deletes records
  database.run(`
    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 8. Integrations table (Mercado Livre, Shopee, Amazon, Shein, Elo7, Bling)
  database.run(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      environment TEXT NOT NULL DEFAULT 'production',
      app_id TEXT NOT NULL DEFAULT '',
      client_id TEXT NOT NULL DEFAULT '',
      client_secret TEXT NOT NULL DEFAULT '',
      access_token TEXT NOT NULL DEFAULT '',
      refresh_token TEXT NOT NULL DEFAULT '',
      seller_id TEXT NOT NULL DEFAULT '',
      partner_id TEXT NOT NULL DEFAULT '',
      partner_key TEXT NOT NULL DEFAULT '',
      shop_id TEXT NOT NULL DEFAULT '',
      aws_region TEXT NOT NULL DEFAULT 'us-east-1',
      default_commission_percent REAL NOT NULL DEFAULT 16.0,
      fixed_fee_per_sale REAL NOT NULL DEFAULT 6.0,
      auto_stock_sync INTEGER NOT NULL DEFAULT 1,
      auto_order_import INTEGER NOT NULL DEFAULT 1,
      webhook_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'disconnected',
      last_sync_at TEXT,
      last_error TEXT,
      sku_mappings_json TEXT NOT NULL DEFAULT '[]'
    );
  `);

  // 9. Integration logs table
  database.run(`
    CREATE TABLE IF NOT EXISTS integration_logs (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      platform_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      payload_summary TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 10. Production Orders table (PCP - Controle e Fila de Produção da Oficina 3D)
  database.run(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id TEXT PRIMARY KEY,
      op_number TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      printer_id TEXT,
      printer_name TEXT,
      filament_id TEXT,
      filament_name TEXT,
      filament_weight_g REAL NOT NULL DEFAULT 0,
      print_time_minutes REAL NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      progress_percent INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      sale_id TEXT,
      customer_name TEXT,
      destination TEXT NOT NULL DEFAULT 'stock',
      notes TEXT,
      supplies_json TEXT NOT NULL DEFAULT '[]',
      fail_reason TEXT,
      wasted_filament_g REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 11. Setup Templates table (Tempo de Setup: limpeza de mesa, calibração, preheating)
  database.run(`
    CREATE TABLE IF NOT EXISTS setup_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      setup_time_minutes REAL NOT NULL DEFAULT 10,
      category TEXT NOT NULL DEFAULT 'clean',
      description TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 12. Carriers table (Transportadoras e opções de envio)
  database.run(`
    CREATE TABLE IF NOT EXISTS carriers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL DEFAULT 'PAC / SEDEX',
      default_cost REAL NOT NULL DEFAULT 15.00,
      delivery_days TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  try {
    const cCountRes = database.exec("SELECT COUNT(*) FROM carriers");
    const cCount = cCountRes.length > 0 && cCountRes[0].values.length > 0 ? Number(cCountRes[0].values[0][0]) : 0;
    if (cCount === 0) {
      database.run(`
        INSERT INTO carriers (id, name, service_type, default_cost, delivery_days, notes, created_at)
        VALUES
          ('car-1', 'Correios SEDEX', 'Expresso Nacional', 25.00, '1 a 3 dias úteis', 'Entrega domiciliar prioritária em todo o Brasil.', '${new Date().toISOString()}'),
          ('car-2', 'Correios PAC', 'Econômico', 16.50, '5 a 10 dias úteis', 'Opção econômica para pacotes de pequeno e médio porte.', '${new Date().toISOString()}'),
          ('car-3', 'Jadlog / Package', 'Rodoviário', 22.00, '3 a 6 dias úteis', 'Transportadora com ampla cobertura nacional.', '${new Date().toISOString()}'),
          ('car-4', 'Motoboy / Entrega Local', 'Entrega Rápida', 12.00, 'Mesmo dia', 'Para entregas locais na região metropolitana.', '${new Date().toISOString()}')
      `);
    }
  } catch (e) {
    console.error('Error seeding carriers:', e);
  }

  // Seed default setup templates if empty
  try {
    const setupCountRes = database.exec("SELECT COUNT(*) FROM setup_templates");
    const setupCount = setupCountRes.length > 0 && setupCountRes[0].values.length > 0 ? Number(setupCountRes[0].values[0][0]) : 0;
    if (setupCount === 0) {
      database.run(`
        INSERT INTO setup_templates (id, name, setup_time_minutes, category, description, created_at)
        VALUES
          ('setup-1', 'Limpeza de Mesa & Aplicação de Cola/Spray', 5, 'clean', 'Remoção de resíduos anteriores, limpeza com álcool isopropílico 99% e reaplicação de adesivo.', '${new Date().toISOString()}'),
          ('setup-2', 'Calibração de Nível (Auto Bed Leveling)', 8, 'calibration', 'Execução de malha de nivelamento automático e ajuste de Z-Offset.', '${new Date().toISOString()}'),
          ('setup-3', 'Preheating & Purga de Filamento', 7, 'preheat', 'Aquecimento de bico e mesa (PLA/PETG) e extrusão para limpeza de bico.', '${new Date().toISOString()}'),
          ('setup-4', 'Setup Completo Troca de Material Multicolor', 15, 'other', 'Troca de carretéis no AMS, purga completa de cores anteriores e teste de fluxo.', '${new Date().toISOString()}')
      `);
    }
  } catch (e) {
    console.error('Error seeding setup templates:', e);
  }

  // Seed default production orders if table is empty
  try {
    const opCountRes = database.exec("SELECT COUNT(*) FROM production_orders");
    const opCount = opCountRes.length > 0 && opCountRes[0].values.length > 0 ? Number(opCountRes[0].values[0][0]) : 0;
    if (opCount === 0) {
      database.run(`
        INSERT INTO production_orders (
          id, op_number, product_id, product_name, quantity, printer_id, printer_name,
          filament_id, filament_name, filament_weight_g, print_time_minutes, priority,
          status, progress_percent, started_at, completed_at, sale_id, customer_name,
          destination, notes, supplies_json, created_at
        )
        VALUES
          (
            'op-101', 'OP #101', 'prod-2', 'Suporte Universal Articulado de Celular', 2,
            'p-2', 'Bambu Lab P1S Combo', 'fil-3', 'PETG Azul Royal', 84.0, 190,
            'high', 'in_progress', 65, '${new Date(Date.now() - 7200000).toISOString()}', NULL,
            'sale-2', 'Studio Wave (Brindes)', 'sale',
            'Preenchimento Gyroid 25% para alta resistência mecânica.', '[]',
            '${new Date(Date.now() - 14400000).toISOString()}'
          ),
          (
            'op-102', 'OP #102', 'prod-1', 'Chaveiro Spotify com Código Interativo', 15,
            'p-1', 'Creality Ender 3 S1 Pro', 'fil-1', 'PLA Preto Fosco', 217.5, 570,
            'normal', 'pending', 0, NULL, NULL,
            NULL, 'Estoque da Oficina', 'stock',
            'Lote de reposição para pronta-entrega nos marketplaces.', '[{"supply_id":"sup-1","name":"Argola de Chaveiro com Corrente Italiana 25mm","qty":15,"unit_cost":0.35}]',
            '${new Date(Date.now() - 3600000).toISOString()}'
          ),
          (
            'op-103', 'OP #103', 'prod-1', 'Chaveiro Spotify com Código Interativo', 5,
            'p-3', 'Artillery Genius Pro', 'fil-1', 'PLA Preto Fosco', 72.5, 190,
            'urgent', 'post_processing', 90, '${new Date(Date.now() - 10800000).toISOString()}', NULL,
            'sale-1', 'Lucas Silva (#SHP-9812)', 'sale',
            'Remover brim e montar as argolas com fecho zip e tag kraft.', '[{"supply_id":"sup-1","name":"Argola de Chaveiro com Corrente Italiana 25mm","qty":5,"unit_cost":0.35},{"supply_id":"sup-5","name":"Saco Kraft c/ Visor e Fecho Zip 10x15cm","qty":5,"unit_cost":0.45}]',
            '${new Date(Date.now() - 18000000).toISOString()}'
          )
      `);

      // Set Bambu printer status to printing
      database.run("UPDATE printers SET status = 'printing' WHERE id = 'p-2'");
    }
  } catch (err) {
    console.warn('Could not seed production orders:', err);
  }

  // Seed default integrations if empty
  try {
    const intCountRes = database.exec("SELECT COUNT(*) FROM integrations");
    const intCount = intCountRes.length > 0 && intCountRes[0].values.length > 0 ? Number(intCountRes[0].values[0][0]) : 0;
    if (intCount === 0) {
      database.run(`
        INSERT OR IGNORE INTO integrations (
          id, platform_id, name, enabled, environment, app_id, client_id, client_secret,
          access_token, refresh_token, seller_id, partner_id, partner_key, shop_id,
          aws_region, default_commission_percent, fixed_fee_per_sale, auto_stock_sync,
          auto_order_import, webhook_url, status, last_sync_at, last_error, sku_mappings_json
        )
        VALUES
          (
            'int-meli', 'mercadolivre', 'Mercado Livre', 1, 'production',
            '8294719201948', 'APP_USR-8294719201948', '••••••••••••••••••••••••••••••••',
            'APP_USR-7281928-0904-a9e4-live-token-meli', '', 'MLB_SELLER_482910', '', '', '',
            '', 16.5, 6.50, 1, 1,
            'https://api.printcraft3d.local/webhooks/mercadolivre', 'connected', '${new Date().toISOString()}', '',
            '[{"internal_product_id":"prod-1","internal_product_name":"Chaveiro Spotify com Código Interativo","marketplace_sku":"MLB-CHV-SPOT-01","marketplace_listing_id":"MLB391820491","marketplace_price":14.90,"sync_active":true,"last_synced_stock":15}]'
          ),
          (
            'int-shopee', 'shopee', 'Shopee Brasil', 1, 'production',
            '', '', '',
            'shopee_live_auth_token_99182', '', '', '2004819', '••••••••••••••••••••••••••••••••', '49182048',
            '', 14.0, 4.00, 1, 1,
            'https://api.printcraft3d.local/webhooks/shopee', 'connected', '${new Date(Date.now() - 3600000).toISOString()}', '',
            '[{"internal_product_id":"prod-1","internal_product_name":"Chaveiro Spotify com Código Interativo","marketplace_sku":"SHP-CHV-001","marketplace_listing_id":"9182048102","marketplace_price":12.90,"sync_active":true,"last_synced_stock":15}]'
          ),
          (
            'int-amazon', 'amazon', 'Amazon Brasil (SP-API)', 0, 'production',
            '', 'amzn1.application-oa2-client.8291048', '••••••••••••••••••••••••••••••••',
            '', 'Atzr|IwEBIE79124810...', 'A2Q3Y263D00KWC', '', '', '',
            'A2Q3Y263D00KWC', 15.0, 0.00, 1, 1,
            'https://api.printcraft3d.local/webhooks/amazon', 'disconnected', NULL, '',
            '[]'
          ),
          (
            'int-shein', 'shein', 'Shein Marketplace', 0, 'production',
            '', '', '',
            '', '', '', '', '', '',
            '', 16.0, 0.00, 1, 0,
            'https://api.printcraft3d.local/webhooks/shein', 'disconnected', NULL, '',
            '[]'
          ),
          (
            'int-elo7', 'elo7', 'Elo7 (Artesanato & Peças 3D)', 0, 'production',
            '', '', '',
            '', '', '', '', '', '',
            '', 18.0, 0.00, 1, 1,
            'https://api.printcraft3d.local/webhooks/elo7', 'disconnected', NULL, '',
            '[]'
          ),
          (
            'int-bling', 'bling', 'Bling ERP / Tiny ERP', 0, 'production',
            '', '', '',
            '', '', '', '', '', '',
            '', 0.0, 0.00, 1, 1,
            'https://api.printcraft3d.local/webhooks/bling', 'disconnected', NULL, '',
            '[]'
          )
      `);

      // Seed sample logs
      database.run(`
        INSERT OR IGNORE INTO integration_logs (id, platform_id, platform_name, event_type, status, message, payload_summary, created_at)
        VALUES
          ('log-1', 'mercadolivre', 'Mercado Livre', 'stock.updated', 'success', 'Estoque sincronizado para 1 anúncio ativo (MLB-CHV-SPOT-01 -> Qtd 15)', '{"sku":"MLB-CHV-SPOT-01","stock":15,"status":"active"}', '${new Date(Date.now() - 1800000).toISOString()}'),
          ('log-2', 'shopee', 'Shopee Brasil', 'order.created', 'success', 'Pedido importado automaticamente #SHP-9812 (5x Chaveiro Spotify)', '{"order_sn":"240904SHP9812","total":60.00,"items":5}', '${new Date(Date.now() - 43200000).toISOString()}'),
          ('log-3', 'mercadolivre', 'Mercado Livre', 'ping', 'success', 'Conexão validada via OAuth 2.0 API Meli (Latência 68ms)', '{"http_code":200,"user_id":482910,"nickname":"PRINTCRAFT_3D"}', '${new Date(Date.now() - 7200000).toISOString()}')
      `);
    }
  } catch (err) {
    console.warn('Could not seed integrations:', err);
  }

  // Check if seeded previously
  const metaRes = database.exec("SELECT value FROM system_meta WHERE key = 'initialized'");
  const isInitialized = metaRes.length > 0 && metaRes[0].values.length > 0;

  if (!isInitialized) {
    const existingPrinters = database.exec("SELECT COUNT(*) as c FROM printers");
    const count = existingPrinters.length > 0 && existingPrinters[0].values.length > 0 ? Number(existingPrinters[0].values[0][0]) : 0;
    if (count === 0) {
      seedInitialData(database);
    }
    database.run("INSERT OR REPLACE INTO system_meta (key, value) VALUES ('initialized', '1')");
  }
}

function seedInitialData(database: Database) {
  // Default printers
  database.run(`
    INSERT OR IGNORE INTO printers (id, name, printer_power_watts, bed_heater_watts, total_power_watts, hourly_depreciation, failure_rate_default, status)
    VALUES
      ('p-1', 'Creality Ender 3 S1 Pro', 70, 220, 290, 0.60, 10, 'available'),
      ('p-2', 'Bambu Lab P1S Combo', 90, 260, 350, 1.20, 5, 'available'),
      ('p-3', 'Artillery Genius Pro', 65, 185, 250, 0.50, 8, 'available')
  `);

  // Default filaments
  database.run(`
    INSERT OR IGNORE INTO filaments (id, name, brand, material, color, color_hex, total_weight_g, remaining_weight_g, cost_per_spool, diameter, density)
    VALUES
      ('fil-1', 'PLA Preto Fosco', 'Voolt3D', 'PLA', 'Preto', '#1e293b', 1000, 850, 89.90, 1.75, 1.24),
      ('fil-2', 'PLA Silk Prata', '3D Fila', 'PLA', 'Prata Silk', '#94a3b8', 1000, 620, 119.00, 1.75, 1.24),
      ('fil-3', 'PETG Azul Royal', 'Printalot', 'PETG', 'Azul', '#2563eb', 1000, 480, 99.00, 1.75, 1.27),
      ('fil-4', 'PLA Vermelho Ferrari', 'eSun', 'PLA', 'Vermelho', '#dc2626', 1000, 940, 105.00, 1.75, 1.24),
      ('fil-5', 'TPU Flexível Amarelo', '3D Prime', 'TPU', 'Amarelo', '#eab308', 500, 380, 85.00, 1.75, 1.21)
  `);

  // Default supplies (insumos para chaveiros, embalagens, montagens)
  database.run(`
    INSERT OR IGNORE INTO supplies (id, name, unit, unit_cost, in_stock_qty, min_stock_alert)
    VALUES
      ('sup-1', 'Argola de Chaveiro com Corrente Italiana 25mm', 'un', 0.35, 180, 30),
      ('sup-2', 'Mosquetão Pequeno Articulado Níquel', 'un', 0.85, 95, 20),
      ('sup-3', 'Ímã de Neodímio 10x2mm N52', 'un', 0.70, 120, 25),
      ('sup-4', 'Parafuso Allen M3 x 12mm c/ Porca', 'kit', 0.25, 250, 50),
      ('sup-5', 'Saco Kraft c/ Visor e Fecho Zip 10x15cm', 'un', 0.45, 150, 40),
      ('sup-6', 'Tag Cartão Kraft Personalizado + Fio Sisal', 'un', 0.30, 200, 50)
  `);

  // Default settings
  database.run(`
    INSERT OR IGNORE INTO settings (key, value)
    VALUES
      ('energy_kwh_rate', '0.85'),
      ('currency', 'R$'),
      ('default_loss_margin', '10'),
      ('hourly_labor_rate', '20.00'),
      ('default_infill', '20'),
      ('default_layer_height', '0.2')
  `);

  // Sample Product: "Chaveiro Personalizado Spotify / Tag"
  const sampleSupplies = JSON.stringify([
    { supply_id: 'sup-1', name: 'Argola de Chaveiro com Corrente Italiana 25mm', qty: 1, unit_cost: 0.35 },
    { supply_id: 'sup-5', name: 'Saco Kraft c/ Visor e Fecho Zip 10x15cm', qty: 1, unit_cost: 0.45 }
  ]);

  database.run(`
    INSERT OR IGNORE INTO products (
      id, name, category, description, stl_filename, gcode_filename,
      printer_id, filament_id, filament_weight_g, print_time_minutes,
      energy_cost, filament_cost, loss_margin_percent, depreciation_cost,
      labor_cost, extra_supplies_json, extra_supplies_cost, total_cost,
      markup_percent, suggested_price, sale_price, ready_stock_qty, min_stock_alert, created_at
    )
    VALUES (
      'prod-1',
      'Chaveiro Spotify com Código Interativo',
      'Chaveiros & Brindes',
      'Chaveiro com código escaneável do Spotify, argola de alta qualidade e embalagem kraft presenteável.',
      'chaveiro_spotify_tag.stl',
      'chaveiro_02_pla.gcode',
      'p-1',
      'fil-1',
      14.5,
      38,
      0.16,
      1.30,
      10,
      0.38,
      1.50,
      '${sampleSupplies.replace(/'/g, "''")}',
      0.80,
      4.14,
      150,
      10.35,
      12.00,
      20,
      5,
      '${new Date().toISOString()}'
    ),
    (
      'prod-2',
      'Suporte Universal Articulado de Celular',
      'Acessórios',
      'Suporte para mesa com encaixe reforçado e canaleta para cabo de carregamento.',
      'suporte_celular_v2.stl',
      'suporte_028_petg.gcode',
      'p-2',
      'fil-3',
      42.0,
      95,
      0.47,
      4.16,
      5,
      1.90,
      3.00,
      '[]',
      0.00,
      9.53,
      120,
      20.97,
      25.00,
      8,
      3,
      '${new Date().toISOString()}'
    )
  `);

  // Sample Product Sales (Plataforma Shopee e Venda B2B CNPJ)
  database.run(`
    INSERT OR IGNORE INTO product_sales (
      id, product_id, product_name, quantity, unit_price, total_revenue,
      unit_cost, total_cost, profit, channel_type, channel_name, customer_document,
      customer_name, platform_fee_percent, platform_fee_amount, payment_method, notes, created_at
    )
    VALUES
      (
        'sale-1',
        'prod-1',
        'Chaveiro Spotify com Código Interativo',
        5,
        12.00,
        60.00,
        4.14,
        20.70,
        30.90,
        'platform',
        'Shopee',
        NULL,
        'Lucas Silva (Pedido #SHP-9812)',
        14.0,
        8.40,
        'Shopee Pay / Boleto',
        'Envio via Correios com código de rastreio',
        '${new Date(Date.now() - 43200000).toISOString()}'
      ),
      (
        'sale-2',
        'prod-1',
        'Chaveiro Spotify com Código Interativo',
        10,
        11.50,
        115.00,
        4.14,
        41.40,
        73.60,
        'cnpj',
        'Studio Wave Música LTDA',
        '45.123.890/0001-32',
        'Studio Wave (Brindes de Fim de Ano)',
        0,
        0,
        'PIX CNPJ',
        'NF 0012 emitida para o cliente corporativo',
        '${new Date(Date.now() - 172800000).toISOString()}'
      )
  `);

  // Sample Print Job History
  database.run(`
    INSERT INTO print_jobs (
      id, product_id, product_name, printer_id, printer_name, filament_id, filament_name,
      quantity, filament_used_g, total_time_minutes, total_cost, supplies_used_json,
      deducted_from_stock, status, created_at
    )
    VALUES (
      'job-1',
      'prod-1',
      'Chaveiro Spotify com Código Interativo',
      'p-1',
      'Creality Ender 3 S1 Pro',
      'fil-1',
      'PLA Preto Fosco',
      10,
      145.0,
      380,
      41.40,
      '${sampleSupplies.replace(/'/g, "''")}',
      1,
      'completed',
      '${new Date(Date.now() - 86400000).toISOString()}'
    )
  `);
}

// Query helper
export function queryAll<T>(database: Database, sql: string, params: any[] = []): T[] {
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T>(database: Database, sql: string, params: any[] = []): T | null {
  const all = queryAll<T>(database, sql, params);
  return all.length > 0 ? all[0] : null;
}
