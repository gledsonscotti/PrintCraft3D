import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let db: Database | null = null;
let SQL: SqlJsStatic | null = null;

export const getDbPath = (): string => {
  return process.env.DATABASE_PATH || path.join(process.cwd(), 'database.sqlite');
};

export function createSafetyBackup(targetPath: string) {
  try {
    if (!fs.existsSync(targetPath)) return;
    const stats = fs.statSync(targetPath);
    if (stats.size === 0) return;

    const dir = path.dirname(targetPath);
    const backupDir = path.join(dir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const autoBackup = path.join(backupDir, `database_auto_${timestamp}.sqlite`);
    fs.copyFileSync(targetPath, autoBackup);

    // Keep persistent .bak copy as fallback
    const persistentBak = path.join(dir, 'database.sqlite.bak');
    fs.copyFileSync(targetPath, persistentBak);

    // Keep only last 10 auto backups to preserve disk space
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('database_auto_') && f.endsWith('.sqlite'));
    if (files.length > 10) {
      files.sort().slice(0, files.length - 10).forEach(f => {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch {}
      });
    }
  } catch (err) {
    console.warn('Safety backup creation notice:', err);
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs();
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    try {
      const stats = fs.statSync(dbPath);
      if (stats.size > 0) {
        createSafetyBackup(dbPath);
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
      } else {
        throw new Error('Database file is empty (0 bytes)');
      }
    } catch (e) {
      console.warn('Could not read existing database.sqlite, checking backup:', e);
      const bakPath = path.join(dir, 'database.sqlite.bak');
      if (fs.existsSync(bakPath)) {
        try {
          const bakBuffer = fs.readFileSync(bakPath);
          db = new SQL.Database(bakBuffer);
          console.log('Restored database from database.sqlite.bak successfully!');
        } catch {
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
      }
    }
  } else {
    // Check if backup exists
    const bakPath = path.join(dir, 'database.sqlite.bak');
    if (fs.existsSync(bakPath)) {
      try {
        const bakBuffer = fs.readFileSync(bakPath);
        db = new SQL.Database(bakBuffer);
        console.log('Restored database from database.sqlite.bak on fresh start');
      } catch {
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }
  }

  initTables(db);
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const dbPath = getDbPath();
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export function getDbStats(database: Database) {
  const dbPath = getDbPath();
  let fileSize = 0;
  let lastModified: string | null = null;
  if (fs.existsSync(dbPath)) {
    const stat = fs.statSync(dbPath);
    fileSize = stat.size;
    lastModified = stat.mtime.toISOString();
  }

  const counts: Record<string, number> = {};
  const tables = [
    'printers', 'filaments', 'supplies', 'products', 'product_sales',
    'production_orders', 'carriers', 'categories', 'subcategories',
    'clients', 'consignments', 'print_jobs', 'integrations', 'setup_templates',
    'subscription_plans', 'admin_users', 'companies', 'app_users', 'app_access_logs'
  ];

  for (const t of tables) {
    try {
      const res = database.exec(`SELECT COUNT(*) FROM ${t}`);
      counts[t] = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;
    } catch {
      counts[t] = 0;
    }
  }

  // Scan available backups/snapshots
  const backupDir = path.join(process.cwd(), 'backups');
  const available_snapshots: Array<{ filename: string; size_formatted: string; created_at: string }> = [];
  if (fs.existsSync(backupDir)) {
    try {
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite'));
      files.sort().reverse();
      for (const f of files.slice(0, 5)) {
        const fStat = fs.statSync(path.join(backupDir, f));
        available_snapshots.push({
          filename: f,
          size_formatted: (fStat.size / 1024).toFixed(1) + ' KB',
          created_at: fStat.mtime.toISOString()
        });
      }
    } catch {
      // ignore
    }
  }

  return {
    dbPath,
    fileSizeBytes: fileSize,
    fileSizeFormatted: (fileSize / 1024).toFixed(1) + ' KB',
    file_size_formatted: (fileSize / 1024).toFixed(1) + ' KB',
    lastModified,
    counts,
    table_counts: counts,
    available_snapshots,
    isCustomPath: Boolean(process.env.DATABASE_PATH),
  };
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
  const printerCols = [
    "ALTER TABLE printers ADD COLUMN brand TEXT DEFAULT 'Outra';",
    "ALTER TABLE printers ADD COLUMN model TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN connection_type TEXT DEFAULT 'lan';",
    "ALTER TABLE printers ADD COLUMN protocol TEXT DEFAULT 'moonraker_klipper';",
    "ALTER TABLE printers ADD COLUMN ip_address TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN port INTEGER DEFAULT 80;",
    "ALTER TABLE printers ADD COLUMN api_key TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN device_id TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN cloud_endpoint TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN camera_stream_url TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN bed_size_x REAL DEFAULT 220;",
    "ALTER TABLE printers ADD COLUMN bed_size_y REAL DEFAULT 220;",
    "ALTER TABLE printers ADD COLUMN bed_size_z REAL DEFAULT 250;",
    "ALTER TABLE printers ADD COLUMN nozzle_diameter REAL DEFAULT 0.4;",
    "ALTER TABLE printers ADD COLUMN online_status TEXT DEFAULT 'online';",
    "ALTER TABLE printers ADD COLUMN current_temp_nozzle REAL DEFAULT 0;",
    "ALTER TABLE printers ADD COLUMN target_temp_nozzle REAL DEFAULT 0;",
    "ALTER TABLE printers ADD COLUMN current_temp_bed REAL DEFAULT 0;",
    "ALTER TABLE printers ADD COLUMN target_temp_bed REAL DEFAULT 0;",
    "ALTER TABLE printers ADD COLUMN current_job_name TEXT DEFAULT '';",
    "ALTER TABLE printers ADD COLUMN current_progress_percent REAL DEFAULT 0;",
    "ALTER TABLE printers ADD COLUMN last_seen_at TEXT DEFAULT '';"
  ];
  for (const alterSql of printerCols) {
    try {
      database.run(alterSql);
    } catch {}
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
  try {
    database.run("ALTER TABLE products ADD COLUMN subcategory TEXT DEFAULT '';");
  } catch {}

  // Product Categories & Subcategories tables
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT 'emerald',
      created_at TEXT NOT NULL
    );
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

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

  // 13. Subscription Plans table (Gestão de Planos de Assinatura do PrintCraft)
  database.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      billing_cycle TEXT NOT NULL DEFAULT 'mensal',
      description TEXT NOT NULL,
      max_users INTEGER NOT NULL DEFAULT 1,
      max_printers INTEGER NOT NULL DEFAULT 2,
      max_products INTEGER NOT NULL DEFAULT 20,
      features_json TEXT NOT NULL DEFAULT '[]',
      is_popular INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      badge TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 14. Admin Users table (Login e Administração do Produto)
  database.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Administrador Geral',
      role TEXT NOT NULL DEFAULT 'superadmin',
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
  `);

  // Seed default admin user if empty
  try {
    const adminCountRes = database.exec("SELECT COUNT(*) FROM admin_users");
    const adminCount = adminCountRes.length > 0 && adminCountRes[0].values.length > 0 ? Number(adminCountRes[0].values[0][0]) : 0;
    if (adminCount === 0) {
      database.run(`
        INSERT INTO admin_users (id, username, email, password_hash, name, role, created_at)
        VALUES
          ('admin-1', 'admin', 'admin@printcraft3d.com', 'admin123', 'Super Administrador PrintCraft', 'superadmin', '${new Date().toISOString()}')
      `);
    }
  } catch (e) {
    console.error('Error seeding admin_users:', e);
  }

  // Seed default subscription plans if empty
  try {
    const plansCountRes = database.exec("SELECT COUNT(*) FROM subscription_plans");
    const plansCount = plansCountRes.length > 0 && plansCountRes[0].values.length > 0 ? Number(plansCountRes[0].values[0][0]) : 0;
    if (plansCount === 0) {
      const now = new Date().toISOString();
      const starterFeatures = JSON.stringify([
        'cost_calculator',
        'model_analyzer',
        'stock_filaments',
        'workshop_themes'
      ]);
      const proFeatures = JSON.stringify([
        'cost_calculator',
        'model_analyzer',
        'ai_optimizer',
        'stock_filaments',
        'stock_supplies',
        'ready_stock',
        'printers_fleet',
        'ams_heaters',
        'production_orders',
        'setup_templates',
        'sales_crm',
        'clients_database',
        'pdf_whatsapp_quotations',
        'backup_sqlite',
        'workshop_themes'
      ]);
      const enterpriseFeatures = JSON.stringify([
        'cost_calculator',
        'model_analyzer',
        'ai_optimizer',
        'stock_filaments',
        'stock_supplies',
        'ready_stock',
        'printers_fleet',
        'ams_heaters',
        'production_orders',
        'setup_templates',
        'sales_crm',
        'consignments',
        'clients_database',
        'pdf_whatsapp_quotations',
        'integrations_marketplaces',
        'backup_sqlite',
        'workshop_themes',
        'priority_support'
      ]);

      database.run(`
        INSERT INTO subscription_plans (
          id, name, price, billing_cycle, description, max_users, max_printers, max_products,
          features_json, is_popular, is_active, badge, created_at, updated_at
        )
        VALUES
          (
            'plan-starter', 'Iniciante / Hobby', 0.00, 'mensal',
            'Perfeito para makers iniciantes, hobbistas e estudantes com 1 impressora 3D testando seus primeiros projetos.',
            1, 1, 15,
            '${starterFeatures}', 0, 1, 'Gratuito', '${now}', '${now}'
          ),
          (
            'plan-pro', 'Oficina Pro', 49.90, 'mensal',
            'Ideal para oficinas de impressão 3D e prestadores autônomos que buscam profissionalizar orçamentos, estoque e fila de produção.',
            3, 5, 150,
            '${proFeatures}', 1, 1, 'Mais Popular', '${now}', '${now}'
          ),
          (
            'plan-enterprise', 'Print Farm & Indústria', 149.90, 'mensal',
            'Voltado para fazendas de impressão em escala (Print Farms), equipes multiusuários e manufatura aditiva com integrações completas.',
            -1, -1, -1,
            '${enterpriseFeatures}', 0, 1, 'Ilimitado', '${now}', '${now}'
          )
      `);
    }
  } catch (e) {
    console.error('Error seeding subscription_plans:', e);
  }

  // 15. Companies table (Empresas Cadastradas com CNPJ ou CPF)
  database.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade_name TEXT,
      document_type TEXT NOT NULL DEFAULT 'CNPJ',
      document_number TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      state TEXT,
      plan_id TEXT,
      theme TEXT NOT NULL DEFAULT 'sage-bento',
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      billing_cycle TEXT NOT NULL DEFAULT 'mensal',
      expires_at TEXT,
      max_users_override INTEGER,
      max_printers_override INTEGER,
      max_products_override INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    database.run("ALTER TABLE companies ADD COLUMN theme TEXT NOT NULL DEFAULT 'sage-bento';");
  } catch {}

  try {
    database.run("UPDATE companies SET theme = 'sage-bento' WHERE theme = 'standard' OR theme IS NULL OR theme = '';");
  } catch {}

  // 16. App Users table (Usuários e Operadores das Empresas no App)
  database.run(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'operator',
      status TEXT NOT NULL DEFAULT 'active',
      permissions_json TEXT NOT NULL DEFAULT '[]',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 17. App Access Logs table (Auditoria de Acesso e Segurança)
  database.run(`
    CREATE TABLE IF NOT EXISTS app_access_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_email TEXT,
      company_id TEXT,
      company_name TEXT,
      action TEXT NOT NULL,
      ip_address TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default companies if empty
  try {
    const compCountRes = database.exec("SELECT COUNT(*) FROM companies");
    const compCount = compCountRes.length > 0 && compCountRes[0].values.length > 0 ? Number(compCountRes[0].values[0][0]) : 0;
    if (compCount === 0) {
      const now = new Date().toISOString();
      database.run(`
        INSERT INTO companies (
          id, name, trade_name, document_type, document_number, email, phone,
          city, state, plan_id, status, notes, billing_cycle, expires_at, created_at, updated_at
        )
        VALUES
          (
            'comp-1',
            'PrintCraft Prototipagem & Design 3D LTDA',
            'PrintCraft 3D Studio',
            'CNPJ',
            '34.567.890/0001-12',
            'contato@printcraft3d.com',
            '(11) 98765-4321',
            'São Paulo',
            'SP',
            'plan-pro',
            'active',
            'Oficina de manufatura aditiva com parque de impressoras FDM e Resina.',
            'mensal',
            '${new Date(Date.now() + 180 * 86400000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'comp-2',
            'Maker Farm Indústria e Modelagem EIRELI',
            'MakerFarm 3D Tech',
            'CNPJ',
            '18.234.567/0001-89',
            'contato@makerfarm3d.ind.br',
            '(41) 99123-8877',
            'Curitiba',
            'PR',
            'plan-enterprise',
            'active',
            'Fazenda industrial de manufatura aditiva com 12 impressoras CoreXY.',
            'anual',
            '${new Date(Date.now() + 300 * 86400000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'comp-3',
            'Lucas Gabriel Silveira',
            'Lucas Miniaturas & Cosplay 3D',
            'CPF',
            '382.491.508-40',
            'lucas.miniaturas3d@gmail.com',
            '(31) 99844-2211',
            'Belo Horizonte',
            'MG',
            'plan-starter',
            'active',
            'Maker autônomo focado em miniaturas de RPG colecionáveis e pintura.',
            'mensal',
            '${new Date(Date.now() + 60 * 86400000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'comp-4',
            'Inovação Maker Lab & Criações Digitais LTDA',
            'InovMaker Lab',
            'CNPJ',
            '52.987.654/0001-30',
            'financeiro@inovmakerlab.com.br',
            '(19) 97123-4567',
            'Campinas',
            'SP',
            'plan-pro',
            'trial',
            'Em período de avaliação de 14 dias para integração de pedidos e PCP.',
            'mensal',
            '${new Date(Date.now() + 14 * 86400000).toISOString()}',
            '${now}',
            '${now}'
          )
      `);
    }
  } catch (e) {
    console.error('Error seeding companies:', e);
  }

  // Seed default app users if empty
  try {
    const userCountRes = database.exec("SELECT COUNT(*) FROM app_users");
    const userCount = userCountRes.length > 0 && userCountRes[0].values.length > 0 ? Number(userCountRes[0].values[0][0]) : 0;
    if (userCount === 0) {
      const now = new Date().toISOString();
      database.run(`
        INSERT INTO app_users (
          id, company_id, name, email, password_hash, phone, role, status, permissions_json, last_login_at, created_at, updated_at
        )
        VALUES
          (
            'usr-1',
            'comp-1',
            'Carlos Eduardo Rocha',
            'carlos.rocha@printcraft3d.com',
            'senha123',
            '(11) 98765-4321',
            'admin',
            'active',
            '["all"]',
            '${new Date(Date.now() - 3600000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'usr-2',
            'comp-1',
            'Beatriz Lima (Operadora 3D)',
            'beatriz.maker@printcraft3d.com',
            'senha123',
            '(11) 98765-4322',
            'operator',
            'active',
            '["pcp", "printers", "stock"]',
            '${new Date(Date.now() - 7200000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'usr-3',
            'comp-2',
            'Roberto Mendes',
            'roberto@makerfarm3d.ind.br',
            'senha123',
            '(41) 99123-8877',
            'admin',
            'active',
            '["all"]',
            '${new Date(Date.now() - 14400000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'usr-4',
            'comp-2',
            'Juliana Fagundes (Comercial)',
            'juliana.vendas@makerfarm3d.ind.br',
            'senha123',
            '(41) 99123-8878',
            'sales',
            'active',
            '["sales", "clients", "calculator"]',
            '${new Date(Date.now() - 86400000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'usr-5',
            'comp-3',
            'Lucas Gabriel Silveira',
            'lucas.miniaturas3d@gmail.com',
            'senha123',
            '(31) 99844-2211',
            'admin',
            'active',
            '["all"]',
            '${new Date(Date.now() - 43200000).toISOString()}',
            '${now}',
            '${now}'
          ),
          (
            'usr-6',
            'comp-4',
            'Tiago Ribeiro',
            'tiago@inovmakerlab.com.br',
            'senha123',
            '(19) 97123-4567',
            'manager',
            'active',
            '["calculator", "pcp", "stock", "printers"]',
            '${new Date(Date.now() - 172800000).toISOString()}',
            '${now}',
            '${now}'
          )
      `);
    }
  } catch (e) {
    console.error('Error seeding app_users:', e);
  }

  // Seed default app access logs if empty
  try {
    const logCountRes = database.exec("SELECT COUNT(*) FROM app_access_logs");
    const logCount = logCountRes.length > 0 && logCountRes[0].values.length > 0 ? Number(logCountRes[0].values[0][0]) : 0;
    if (logCount === 0) {
      database.run(`
        INSERT INTO app_access_logs (
          id, user_id, user_name, user_email, company_id, company_name, action, ip_address, status, details, created_at
        )
        VALUES
          (
            'log-acc-1',
            'usr-1',
            'Carlos Eduardo Rocha',
            'carlos.rocha@printcraft3d.com',
            'comp-1',
            'PrintCraft Prototipagem & Design 3D LTDA',
            'login_success',
            '177.135.24.12',
            'success',
            'Login realizado com sucesso via Desktop Chrome / Windows.',
            '${new Date(Date.now() - 3600000).toISOString()}'
          ),
          (
            'log-acc-2',
            'usr-2',
            'Beatriz Lima (Operadora 3D)',
            'beatriz.maker@printcraft3d.com',
            'comp-1',
            'PrintCraft Prototipagem & Design 3D LTDA',
            'login_success',
            '177.135.24.12',
            'success',
            'Acesso ao painel de Operação 3D / Apontamento de Fila.',
            '${new Date(Date.now() - 7200000).toISOString()}'
          ),
          (
            'log-acc-3',
            'usr-3',
            'Roberto Mendes',
            'roberto@makerfarm3d.ind.br',
            'comp-2',
            'Maker Farm Indústria e Modelagem EIRELI',
            'login_success',
            '189.34.82.90',
            'success',
            'Autenticação de administrador da Print Farm via Mac OS.',
            '${new Date(Date.now() - 14400000).toISOString()}'
          ),
          (
            'log-acc-4',
            'usr-4',
            'Juliana Fagundes (Comercial)',
            'juliana.vendas@makerfarm3d.ind.br',
            'comp-2',
            'Maker Farm Indústria e Modelagem EIRELI',
            'login_success',
            '189.34.82.90',
            'success',
            'Acesso ao módulo de Orçamentos e CRM de Clientes.',
            '${new Date(Date.now() - 86400000).toISOString()}'
          ),
          (
            'log-acc-5',
            NULL,
            'Desconhecido',
            'teste.tentativa@invasao.com',
            NULL,
            NULL,
            'login_failed',
            '201.88.19.4',
            'danger',
            'Tentativa de login com senha incorreta bloqueada pelo firewall.',
            '${new Date(Date.now() - 120000000).toISOString()}'
          )
      `);
    }
  } catch (e) {
    console.error('Error seeding app_access_logs:', e);
  }

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

  // Seed default categories & subcategories if empty
  try {
    const catCountRes = database.exec("SELECT COUNT(*) FROM categories");
    const catCount = catCountRes.length > 0 && catCountRes[0].values.length > 0 ? Number(catCountRes[0].values[0][0]) : 0;
    if (catCount === 0) {
      const now = new Date().toISOString();
      database.run(`
        INSERT INTO categories (id, name, color, created_at)
        VALUES
          ('cat-1', 'Chaveiros & Brindes', 'emerald', '${now}'),
          ('cat-2', 'Acessórios', 'sky', '${now}'),
          ('cat-3', 'Decoração', 'amber', '${now}'),
          ('cat-4', 'Peças Técnicas & Ferramentas', 'purple', '${now}'),
          ('cat-5', 'Utilidades Domésticas', 'rose', '${now}')
      `);

      database.run(`
        INSERT INTO subcategories (id, category_id, name, created_at)
        VALUES
          ('sub-1', 'cat-1', 'Natal', '${now}'),
          ('sub-2', 'cat-1', 'Corporativo / Empresas', '${now}'),
          ('sub-3', 'cat-1', 'Geek & Games', '${now}'),
          ('sub-4', 'cat-1', 'Casamentos & Eventos', '${now}'),
          ('sub-5', 'cat-2', 'Suportes Celular & Tablet', '${now}'),
          ('sub-6', 'cat-2', 'Organizadores de Cabos', '${now}'),
          ('sub-7', 'cat-2', 'Headphone & Desk', '${now}'),
          ('sub-8', 'cat-3', 'Vasos & Cachepots', '${now}'),
          ('sub-9', 'cat-3', 'Luminárias & Litofanias', '${now}'),
          ('sub-10', 'cat-3', 'Esculturas & Estátuas', '${now}'),
          ('sub-11', 'cat-4', 'Gabaritos & Guias', '${now}'),
          ('sub-12', 'cat-4', 'Engrenagens & Mecânica', '${now}'),
          ('sub-13', 'cat-4', 'Cases & Invólucros', '${now}'),
          ('sub-14', 'cat-5', 'Cozinha & Dispensa', '${now}'),
          ('sub-15', 'cat-5', 'Banheiro & Lavanderia', '${now}')
      `);
    }
  } catch (e) {
    console.error('Error seeding categories and subcategories:', e);
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
      ('default_layer_height', '0.2'),
      ('admin_theme', 'sage-bento')
  `);

  // Sample Product: "Chaveiro Personalizado Spotify / Tag"
  const sampleSupplies = JSON.stringify([
    { supply_id: 'sup-1', name: 'Argola de Chaveiro com Corrente Italiana 25mm', qty: 1, unit_cost: 0.35 },
    { supply_id: 'sup-5', name: 'Saco Kraft c/ Visor e Fecho Zip 10x15cm', qty: 1, unit_cost: 0.45 }
  ]);

  database.run(`
    INSERT OR IGNORE INTO products (
      id, name, category, subcategory, description, stl_filename, gcode_filename,
      printer_id, filament_id, filament_weight_g, print_time_minutes,
      energy_cost, filament_cost, loss_margin_percent, depreciation_cost,
      labor_cost, extra_supplies_json, extra_supplies_cost, total_cost,
      markup_percent, suggested_price, sale_price, ready_stock_qty, min_stock_alert, created_at
    )
    VALUES (
      'prod-1',
      'Chaveiro Spotify com Código Interativo',
      'Chaveiros & Brindes',
      'Geek & Games',
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
      'Suportes Celular & Tablet',
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
    ),
    (
      'prod-3',
      'Chaveiro Árvore de Natal Festivo',
      'Chaveiros & Brindes',
      'Natal',
      'Chaveiro temático com detalhes natalinos em alto relevo e ilhós reforçado.',
      'chaveiro_arvore_natal.stl',
      'chaveiro_natal_pla.gcode',
      'p-1',
      'fil-2',
      12.0,
      28,
      0.12,
      1.08,
      10,
      0.28,
      1.20,
      '${sampleSupplies.replace(/'/g, "''")}',
      0.80,
      3.48,
      150,
      8.70,
      10.00,
      15,
      5,
      '${new Date().toISOString()}'
    )
  `);

  try {
    database.run("UPDATE products SET subcategory = 'Geek & Games' WHERE id = 'prod-1' AND (subcategory IS NULL OR subcategory = '');");
    database.run("UPDATE products SET subcategory = 'Suportes Celular & Tablet' WHERE id = 'prod-2' AND (subcategory IS NULL OR subcategory = '');");
  } catch {}

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
