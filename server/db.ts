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
      total_power_watts REAL NOT NULL DEFAULT 280,
      hourly_depreciation REAL NOT NULL DEFAULT 0.50,
      failure_rate_default REAL NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'available'
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
      channel_type TEXT NOT NULL, -- 'platform' | 'cnpj' | 'pf'
      channel_name TEXT NOT NULL, -- 'Mercado Livre', 'Shopee', 'Amazon', 'Elo7', 'CNPJ: ...', 'PF: ...'
      customer_document TEXT, -- CPF / CNPJ
      customer_name TEXT,
      platform_fee_percent REAL NOT NULL DEFAULT 0,
      platform_fee_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      notes TEXT,
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
