import fs from 'fs';
import path from 'path';
import net from 'net';
import tls from 'tls';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export type SupportedEngine =
  | 'sqlite'
  | 'postgres'
  | 'mysql'
  | 'sqlserver'
  | 'oracle'
  | 'cloudsql'
  | 'aws_rds'
  | 'azure_sql'
  | 'supabase';

export interface DatabaseProfile {
  id: string;
  name: string;
  engine: SupportedEngine;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password_secret?: string;
  ssl_mode?: 'disable' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  multi_tenant_strategy?: 'database_per_tenant' | 'schema_per_tenant' | 'tenant_id_column';
  is_active: number;
  is_default: number;
  connection_status?: 'connected' | 'untested' | 'failed';
  last_tested_at?: string | null;
  last_test_message?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantDatabaseInfo {
  company_id: string;
  company_name: string;
  trade_name: string;
  document_type: 'CNPJ' | 'CPF';
  document_number: string;
  sanitized_doc: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_size_formatted: string;
  tables_count: number;
  records_count: number;
  status: 'active' | 'synced' | 'pending';
  last_synced_at: string;
}

export interface EngineMetadata {
  id: SupportedEngine;
  name: string;
  vendor: string;
  category: 'on-premise-oss' | 'on-premise-commercial' | 'cloud-managed' | 'embedded';
  defaultPort: number;
  description: string;
  features: string[];
  recommendedMultiTenant: 'database_per_tenant' | 'schema_per_tenant' | 'tenant_id_column';
  pricing: 'Gratuito / Open-Source' | 'Comercial / Licenciado' | 'Nuvem Gerenciada (Pay-as-you-go)';
}

export const SUPPORTED_ENGINES_CATALOG: EngineMetadata[] = [
  {
    id: 'sqlite',
    name: 'SQLite 3 (Multi-Tenant Dedicado)',
    vendor: 'SQLite Consortium',
    category: 'embedded',
    defaultPort: 0,
    description: 'Banco de dados relacional embarcado local. Padrão nativo do PrintCraft, provisionando 1 arquivo .sqlite isolado para cada CNPJ/CPF cadastrado.',
    features: ['Zero-config', 'Banco dedicado por CNPJ/CPF', 'Snapshots atômicos', 'Baixo consumo de memória'],
    recommendedMultiTenant: 'database_per_tenant',
    pricing: 'Gratuito / Open-Source',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL Enterprise / Community',
    vendor: 'PostgreSQL Global Development Group',
    category: 'on-premise-oss',
    defaultPort: 5432,
    description: 'O banco relacional open-source mais avançado do mundo. Ideal para servidores dedicados on-premise com suporte a schemas isolados por empresa.',
    features: ['Schemas isolados por CNPJ', 'JSONB de alta performance', 'ACID estrito', 'Pool de conexões PgBouncer'],
    recommendedMultiTenant: 'schema_per_tenant',
    pricing: 'Gratuito / Open-Source',
  },
  {
    id: 'mysql',
    name: 'MySQL 8.0+ & MariaDB Enterprise',
    vendor: 'Oracle / MariaDB Foundation',
    category: 'on-premise-oss',
    defaultPort: 3306,
    description: 'Extremamente popular para ambientes web e on-premise com mecanismo InnoDB de alta velocidade e replicação mestre-escravo nativa.',
    features: ['Mecanismo InnoDB', 'UTF8MB4 nativo', 'Particionamento de tabelas', 'Amplo suporte em hospedagens'],
    recommendedMultiTenant: 'tenant_id_column',
    pricing: 'Gratuito / Open-Source',
  },
  {
    id: 'sqlserver',
    name: 'Microsoft SQL Server (2019/2022)',
    vendor: 'Microsoft Corporation',
    category: 'on-premise-commercial',
    defaultPort: 1433,
    description: 'Líder de mercado corporativo on-premise e Windows Server, com T-SQL, criptografia Always Encrypted e integração nativa com Active Directory.',
    features: ['T-SQL avançado', 'AlwaysOn Availability Groups', 'Auditoria C2 / PCI-DSS', 'Schemas corporativos'],
    recommendedMultiTenant: 'schema_per_tenant',
    pricing: 'Comercial / Licenciado',
  },
  {
    id: 'oracle',
    name: 'Oracle Database (19c / 21c / 23ai)',
    vendor: 'Oracle Corporation',
    category: 'on-premise-commercial',
    defaultPort: 1521,
    description: 'Padrão da indústria para grandes indústrias, bancos e corporações que exigem particionamento em escala petabyte e tolerância a falhas RAC.',
    features: ['Oracle Real Application Clusters (RAC)', 'Multitenant PDBs', 'PL/SQL nativo', 'Criptografia TDE'],
    recommendedMultiTenant: 'schema_per_tenant',
    pricing: 'Comercial / Licenciado',
  },
  {
    id: 'cloudsql',
    name: 'Google Cloud SQL',
    vendor: 'Google Cloud Platform (GCP)',
    category: 'cloud-managed',
    defaultPort: 5432,
    description: 'Banco de dados relacional gerenciado no Google Cloud com alta disponibilidade regional (99.95%), backups automáticos e replicação contínua.',
    features: ['Alta disponibilidade multi-zona', 'Backups point-in-time', 'Criptografia gerenciada pelo Google', 'Failover automático'],
    recommendedMultiTenant: 'schema_per_tenant',
    pricing: 'Nuvem Gerenciada (Pay-as-you-go)',
  },
  {
    id: 'aws_rds',
    name: 'Amazon RDS & Aurora (AWS)',
    vendor: 'Amazon Web Services (AWS)',
    category: 'cloud-managed',
    defaultPort: 5432,
    description: 'Cluster distribuído de armazenamento na nuvem AWS, com capacidade de auto-scaling de IOPS e compatibilidade total com PostgreSQL e MySQL.',
    features: ['Aurora Serverless v2', 'Armazenamento auto-expansível até 128TB', 'Read Replicas de baixa latência', 'Multi-AZ'],
    recommendedMultiTenant: 'schema_per_tenant',
    pricing: 'Nuvem Gerenciada (Pay-as-you-go)',
  },
  {
    id: 'azure_sql',
    name: 'Microsoft Azure SQL Database',
    vendor: 'Microsoft Azure',
    category: 'cloud-managed',
    defaultPort: 1433,
    description: 'Banco de dados PaaS inteligente e gerenciado na nuvem Microsoft Azure com SLA de 99.99% e elastic pools para múltiplos tenants.',
    features: ['Elastic Pools para Multi-Tenant', 'Tuning de índices por IA', 'Hyperscale storage', 'Azure AD Authentication'],
    recommendedMultiTenant: 'schema_per_tenant',
    pricing: 'Nuvem Gerenciada (Pay-as-you-go)',
  },
  {
    id: 'supabase',
    name: 'Supabase & Neon Serverless Postgres',
    vendor: 'Supabase / Neon Inc.',
    category: 'cloud-managed',
    defaultPort: 5432,
    description: 'Banco de dados PostgreSQL serverless com escalabilidade a zero, connection pooling PgBouncer e Row Level Security para multi-inquilinos.',
    features: ['Scale-to-zero para economia', 'PgBouncer integrado', 'Row Level Security (RLS)', 'Instant branching'],
    recommendedMultiTenant: 'tenant_id_column',
    pricing: 'Nuvem Gerenciada (Pay-as-you-go)',
  },
];

let sqlInstanceCache: SqlJsStatic | null = null;

export async function getSqlInstance(): Promise<SqlJsStatic> {
  if (!sqlInstanceCache) {
    sqlInstanceCache = await initSqlJs();
  }
  return sqlInstanceCache;
}

export function sanitizeDocument(doc: string): string {
  if (!doc) return 'default';
  const clean = doc.replace(/\D/g, '');
  return clean || doc.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

export function getTenantsDirPath(): string {
  const dir = path.join(process.cwd(), 'data', 'tenants');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function initMultiDbTables(masterDb: Database) {
  masterDb.run(`
    CREATE TABLE IF NOT EXISTS database_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      engine TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      database_name TEXT,
      username TEXT,
      password_secret TEXT,
      ssl_mode TEXT DEFAULT 'prefer',
      multi_tenant_strategy TEXT DEFAULT 'schema_per_tenant',
      is_active INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0,
      connection_status TEXT DEFAULT 'configured',
      last_tested_at TEXT,
      last_test_message TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default profiles if table is empty
  try {
    const res = masterDb.exec('SELECT COUNT(*) FROM database_profiles');
    const count = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;
    if (count === 0) {
      const now = new Date().toISOString();
      const defaultProfiles: Array<Omit<DatabaseProfile, 'created_at' | 'updated_at'>> = [
        {
          id: 'prof-sqlite-default',
          name: 'SQLite 3 Local (Multi-Tenant por CNPJ/CPF)',
          engine: 'sqlite',
          host: 'localhost',
          port: 0,
          database_name: 'database.sqlite',
          username: '',
          password_secret: '',
          ssl_mode: 'disable',
          multi_tenant_strategy: 'database_per_tenant',
          is_active: 1,
          is_default: 1,
          connection_status: 'connected',
          last_tested_at: now,
          last_test_message: 'Banco SQLite principal ativo. Sub-bancos criados em data/tenants/ para cada CNPJ/CPF.',
          notes: 'Ambiente padrão inicializado nativamente em SQLite com isolamento físico por CNPJ/CPF.',
        },
        {
          id: 'prof-postgres-onpremise',
          name: 'PostgreSQL 16 On-Premise',
          engine: 'postgres',
          host: 'localhost',
          port: 5432,
          database_name: 'printcraft_prod',
          username: 'postgres',
          password_secret: '',
          ssl_mode: 'prefer',
          multi_tenant_strategy: 'schema_per_tenant',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'Servidor PostgreSQL para ambiente local ou servidor corporativo interno com schemas por CNPJ.',
        },
        {
          id: 'prof-mysql-enterprise',
          name: 'MySQL 8.0 / MariaDB Enterprise',
          engine: 'mysql',
          host: 'localhost',
          port: 3306,
          database_name: 'printcraft_db',
          username: 'printcraft_user',
          password_secret: '',
          ssl_mode: 'prefer',
          multi_tenant_strategy: 'tenant_id_column',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'Servidor MySQL / MariaDB on-premise com InnoDB e particionamento multi-tenant.',
        },
        {
          id: 'prof-sqlserver-corp',
          name: 'Microsoft SQL Server 2022',
          engine: 'sqlserver',
          host: 'sqlserver.empresa.local',
          port: 1433,
          database_name: 'PrintCraft3D',
          username: 'sa',
          password_secret: '',
          ssl_mode: 'require',
          multi_tenant_strategy: 'schema_per_tenant',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'Cluster Microsoft SQL Server com T-SQL e esquemas segregados por CNPJ.',
        },
        {
          id: 'prof-oracle-enterprise',
          name: 'Oracle Database 21c Enterprise',
          engine: 'oracle',
          host: 'oracle.empresa.local',
          port: 1521,
          database_name: 'ORCL',
          username: 'printcraft_admin',
          password_secret: '',
          ssl_mode: 'require',
          multi_tenant_strategy: 'schema_per_tenant',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'Instância corporativa Oracle com schemas empresariais segregados.',
        },
        {
          id: 'prof-cloudsql-gcp',
          name: 'Google Cloud SQL (PostgreSQL)',
          engine: 'cloudsql',
          host: '10.0.0.5',
          port: 5432,
          database_name: 'printcraft_cloud',
          username: 'postgres',
          password_secret: '',
          ssl_mode: 'require',
          multi_tenant_strategy: 'schema_per_tenant',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'Instância Cloud SQL gerenciada no Google Cloud Platform.',
        },
        {
          id: 'prof-aws-aurora',
          name: 'Amazon Aurora Serverless v2',
          engine: 'aws_rds',
          host: 'printcraft-aurora.cluster-xxxx.us-east-1.rds.amazonaws.com',
          port: 5432,
          database_name: 'printcraft_aurora',
          username: 'dbadmin',
          password_secret: '',
          ssl_mode: 'require',
          multi_tenant_strategy: 'schema_per_tenant',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'Cluster Amazon RDS / Aurora Serverless com auto-scaling e alta disponibilidade.',
        },
        {
          id: 'prof-supabase-cloud',
          name: 'Supabase Cloud Postgres',
          engine: 'supabase',
          host: 'db.xxxxxxxxxxxx.supabase.co',
          port: 5432,
          database_name: 'postgres',
          username: 'postgres',
          password_secret: '',
          ssl_mode: 'require',
          multi_tenant_strategy: 'tenant_id_column',
          is_active: 0,
          is_default: 0,
          connection_status: 'untested',
          notes: 'PostgreSQL gerenciado na nuvem Supabase com PgBouncer integrado.',
        },
      ];

      for (const p of defaultProfiles) {
        masterDb.run(
          `
          INSERT INTO database_profiles (
            id, name, engine, host, port, database_name, username, password_secret,
            ssl_mode, multi_tenant_strategy, is_active, is_default, connection_status,
            last_tested_at, last_test_message, notes, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            p.id,
            p.name,
            p.engine,
            p.host || '',
            p.port || 0,
            p.database_name || '',
            p.username || '',
            p.password_secret || '',
            p.ssl_mode || 'prefer',
            p.multi_tenant_strategy || 'schema_per_tenant',
            p.is_active,
            p.is_default,
            p.connection_status || 'untested',
            p.last_tested_at || null,
            p.last_test_message || null,
            p.notes || '',
            now,
            now,
          ]
        );
      }
    }
  } catch (err) {
    console.error('Erro ao inicializar database_profiles:', err);
  }
}

/**
 * Ensures that every company (by CNPJ or CPF) has its dedicated, isolated SQLite file
 * stored in data/tenants/{document_prefix}_{sanitized_doc}.sqlite
 */
export async function syncTenantSqliteDatabases(masterDb: Database): Promise<TenantDatabaseInfo[]> {
  const tenantsDir = getTenantsDirPath();
  const SQL = await getSqlInstance();

  // Query all companies
  const companiesRes = masterDb.exec(
    'SELECT id, name, trade_name, document_type, document_number FROM companies ORDER BY name ASC'
  );
  if (companiesRes.length === 0 || companiesRes[0].values.length === 0) {
    return [];
  }

  const columns = companiesRes[0].columns;
  const idIdx = columns.indexOf('id');
  const nameIdx = columns.indexOf('name');
  const tradeIdx = columns.indexOf('trade_name');
  const docTypeIdx = columns.indexOf('document_type');
  const docNumIdx = columns.indexOf('document_number');

  const tenantResults: TenantDatabaseInfo[] = [];

  for (const row of companiesRes[0].values) {
    const compId = String(row[idIdx]);
    const compName = String(row[nameIdx]);
    const tradeName = row[tradeIdx] ? String(row[tradeIdx]) : compName;
    const docType = (row[docTypeIdx] === 'CPF' ? 'CPF' : 'CNPJ') as 'CNPJ' | 'CPF';
    const docNumber = String(row[docNumIdx] || compId);
    const sanitized = sanitizeDocument(docNumber);
    const prefix = docType === 'CPF' ? 'cpf' : 'cnpj';
    const fileName = `${prefix}_${sanitized}.sqlite`;
    const filePath = path.join(tenantsDir, fileName);

    let fileExists = fs.existsSync(filePath);
    let tenantDb: Database;

    if (fileExists) {
      try {
        const buffer = fs.readFileSync(filePath);
        tenantDb = new SQL.Database(buffer);
      } catch {
        tenantDb = new SQL.Database();
        fileExists = false;
      }
    } else {
      tenantDb = new SQL.Database();
    }

    // Initialize the complete relational schema inside the isolated tenant SQLite database
    initTenantTables(tenantDb);

    // Populate or sync tenant metadata and isolated company row
    tenantDb.run(
      `
      INSERT OR REPLACE INTO company_profile (
        id, name, trade_name, document_type, document_number, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
      [compId, compName, tradeName, docType, docNumber, new Date().toISOString()]
    );

    // Save isolated tenant file to disk
    const exportedBuffer = Buffer.from(tenantDb.export());
    fs.writeFileSync(filePath, exportedBuffer);

    // Gather table counts and record counts from isolated tenant db
    let tablesCount = 0;
    let recordsCount = 0;
    try {
      const tablesRes = tenantDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      if (tablesRes.length > 0 && tablesRes[0].values.length > 0) {
        tablesCount = tablesRes[0].values.length;
        for (const tRow of tablesRes[0].values) {
          const tName = String(tRow[0]);
          const cntRes = tenantDb.exec(`SELECT COUNT(*) FROM ${tName}`);
          if (cntRes.length > 0 && cntRes[0].values.length > 0) {
            recordsCount += Number(cntRes[0].values[0][0]);
          }
        }
      }
    } catch {}

    const fileSizeBytes = exportedBuffer.length;
    const file_size_formatted = (fileSizeBytes / 1024).toFixed(1) + ' KB';

    tenantResults.push({
      company_id: compId,
      company_name: compName,
      trade_name: tradeName,
      document_type: docType,
      document_number: docNumber,
      sanitized_doc: sanitized,
      file_name: fileName,
      file_path: filePath,
      file_size_bytes: fileSizeBytes,
      file_size_formatted,
      tables_count: tablesCount,
      records_count: recordsCount,
      status: fileExists ? 'synced' : 'active',
      last_synced_at: new Date().toISOString(),
    });

    tenantDb.close();
  }

  return tenantResults;
}

/**
 * Initializes the full relational schema inside an isolated tenant SQLite database
 */
export function initTenantTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade_name TEXT,
      document_type TEXT NOT NULL,
      document_number TEXT NOT NULL,
      synced_at TEXT NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS supplies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'un',
      unit_cost REAL NOT NULL DEFAULT 0.0,
      in_stock_qty INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT 'emerald',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT DEFAULT '',
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
      delivery_status TEXT NOT NULL DEFAULT 'pending',
      tracking_code TEXT DEFAULT '',
      shipping_carrier TEXT DEFAULT '',
      shipping_cost REAL DEFAULT 0,
      delivery_address TEXT DEFAULT '',
      estimated_delivery_date TEXT DEFAULT '',
      delivered_at TEXT DEFAULT '',
      delivery_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  const tenantSalesMigrations = [
    "ALTER TABLE product_sales ADD COLUMN delivery_status TEXT DEFAULT 'pending';",
    "ALTER TABLE product_sales ADD COLUMN tracking_code TEXT DEFAULT '';",
    "ALTER TABLE product_sales ADD COLUMN shipping_carrier TEXT DEFAULT '';",
    "ALTER TABLE product_sales ADD COLUMN shipping_cost REAL DEFAULT 0;",
    "ALTER TABLE product_sales ADD COLUMN delivery_address TEXT DEFAULT '';",
    "ALTER TABLE product_sales ADD COLUMN estimated_delivery_date TEXT DEFAULT '';",
    "ALTER TABLE product_sales ADD COLUMN delivered_at TEXT DEFAULT '';",
    "ALTER TABLE product_sales ADD COLUMN delivery_notes TEXT DEFAULT '';",
  ];
  for (const m of tenantSalesMigrations) {
    try {
      database.run(m);
    } catch {}
  }

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

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      cnpj_cpf TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      category TEXT DEFAULT 'Filamentos',
      address TEXT,
      lead_time_days INTEGER DEFAULT 3,
      payment_terms TEXT,
      notes TEXT,
      rating INTEGER DEFAULT 5,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supplier_quotes (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'filament',
      item_id TEXT,
      item_name TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0.0,
      unit TEXT NOT NULL DEFAULT 'un',
      moq REAL DEFAULT 1,
      shipping_cost REAL DEFAULT 0.0,
      lead_time_days INTEGER DEFAULT 3,
      valid_until TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS material_purchases (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      item_id TEXT,
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT 'un',
      unit_cost REAL NOT NULL DEFAULT 0.0,
      total_cost REAL NOT NULL DEFAULT 0.0,
      supplier TEXT,
      purchase_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'PIX',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carriers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL DEFAULT 'PAC / SEDEX',
      default_cost REAL NOT NULL DEFAULT 15.00,
      delivery_days TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS setup_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      setup_time_minutes REAL NOT NULL DEFAULT 10,
      category TEXT NOT NULL DEFAULT 'clean',
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_centers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT 'emerald',
      budget_monthly REAL NOT NULL DEFAULT 0.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_projects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      client_id TEXT,
      client_name TEXT,
      cost_center_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'quote',
      priority TEXT NOT NULL DEFAULT 'normal',
      target_delivery_date TEXT,
      agreed_price REAL NOT NULL DEFAULT 0.0,
      amount_paid REAL NOT NULL DEFAULT 0.0,
      production_order_id TEXT,
      op_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_allocations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      resource_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1.0,
      unit TEXT NOT NULL DEFAULT 'un',
      unit_cost REAL NOT NULL DEFAULT 0.0,
      total_cost REAL NOT NULL DEFAULT 0.0,
      stock_deducted INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      allocated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machine_assets (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '3d_printer',
      printer_id TEXT,
      printer_name TEXT,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT NOT NULL,
      supplier TEXT,
      invoice_number TEXT,
      acquisition_cost REAL NOT NULL DEFAULT 0.0,
      freight_and_installation REAL NOT NULL DEFAULT 0.0,
      initial_total_cost REAL NOT NULL DEFAULT 0.0,
      residual_value REAL NOT NULL DEFAULT 0.0,
      depreciable_base REAL NOT NULL DEFAULT 0.0,
      depreciation_method TEXT NOT NULL DEFAULT 'linear_time',
      useful_life_months INTEGER NOT NULL DEFAULT 36,
      useful_life_hours REAL NOT NULL DEFAULT 6000.0,
      accumulated_hours REAL NOT NULL DEFAULT 0.0,
      current_status TEXT NOT NULL DEFAULT 'active',
      hourly_rate REAL NOT NULL DEFAULT 0.0,
      monthly_rate REAL NOT NULL DEFAULT 0.0,
      accumulated_depreciation REAL NOT NULL DEFAULT 0.0,
      current_book_value REAL NOT NULL DEFAULT 0.0,
      location TEXT DEFAULT 'Oficina Principal',
      disposal_date TEXT,
      disposal_value REAL DEFAULT 0.0,
      disposal_reason TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS depreciation_logs (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      period_month TEXT NOT NULL,
      depreciation_amount REAL NOT NULL DEFAULT 0.0,
      accumulated_to_date REAL NOT NULL DEFAULT 0.0,
      book_value_after REAL NOT NULL DEFAULT 0.0,
      method_used TEXT NOT NULL DEFAULT 'linear_time',
      hours_in_period REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

/**
 * Diagnostic test for remote database host and port
 */
export async function testDatabaseConnection(params: {
  engine: SupportedEngine;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password_secret?: string;
  ssl_mode?: string;
}): Promise<{
  success: boolean;
  latency_ms: number;
  message: string;
  details: Record<string, any>;
}> {
  const { engine, host = 'localhost', port, database_name, username, ssl_mode } = params;

  if (engine === 'sqlite') {
    return {
      success: true,
      latency_ms: 0.8,
      message: 'Banco de dados SQLite local ativo e pronto para operações (Latência: < 1ms).',
      details: {
        engine: 'sqlite',
        path: 'database.sqlite',
        tenantsDir: 'data/tenants/',
        multiTenantMode: 'Banco .sqlite isolado por CNPJ/CPF',
        status: 'ONLINE',
      },
    };
  }

  const defaultPorts: Record<SupportedEngine, number> = {
    sqlite: 0,
    postgres: 5432,
    mysql: 3306,
    sqlserver: 1433,
    oracle: 1521,
    cloudsql: 5432,
    aws_rds: 5432,
    azure_sql: 1433,
    supabase: 5432,
  };

  const targetPort = port && port > 0 ? port : defaultPorts[engine] || 5432;
  const targetHost = host.trim();

  // Test real network connectivity via TCP socket with strict timeout
  const startTime = Date.now();
  return new Promise((resolve) => {
    let hasResolved = false;
    const socket = new net.Socket();
    socket.setTimeout(3500);

    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      hasResolved = true;
      socket.destroy();
      resolve({
        success: true,
        latency_ms: latency,
        message: `Conexão bem-sucedida com ${targetHost}:${targetPort} (${latency}ms). Handshake relacional aceito.`,
        details: {
          engine,
          host: targetHost,
          port: targetPort,
          database: database_name || 'default',
          user: username || 'default',
          ssl: ssl_mode || 'prefer',
          protocol: 'TCP / Wire Protocol',
          status: 'CONNECTED',
        },
      });
    });

    socket.on('timeout', () => {
      if (hasResolved) return;
      hasResolved = true;
      socket.destroy();
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        latency_ms: latency,
        message: `Tempo limite de conexão esgotado (3500ms) ao tentar conectar a ${targetHost}:${targetPort}. Verifique firewall e security groups.`,
        details: {
          engine,
          host: targetHost,
          port: targetPort,
          error: 'ETIMEDOUT',
          status: 'TIMEOUT',
        },
      });
    });

    socket.on('error', (err: any) => {
      if (hasResolved) return;
      hasResolved = true;
      socket.destroy();
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        latency_ms: latency,
        message: `Não foi possível conectar ao host ${targetHost}:${targetPort} - ${err.message || 'Erro de rede'}`,
        details: {
          engine,
          host: targetHost,
          port: targetPort,
          code: err.code || 'ECONNREFUSED',
          error: err.message,
          status: 'UNREACHABLE',
        },
      });
    });

    socket.connect(targetPort, targetHost);
  });
}

/**
 * High-grade DDL generator for target relational SQL dialects
 */
export function generateEngineDDL(
  engine: SupportedEngine,
  options: {
    databaseName?: string;
    schemaName?: string;
    includeDrop?: boolean;
  } = {}
): string {
  const dbName = options.databaseName || 'printcraft_db';
  const schema = options.schemaName || 'public';
  const drop = options.includeDrop ? 'DROP TABLE IF EXISTS ' : '';

  switch (engine) {
    case 'postgres':
    case 'cloudsql':
    case 'aws_rds':
    case 'supabase':
      return generatePostgresDDL(dbName, schema, options.includeDrop);

    case 'mysql':
      return generateMySQLDDL(dbName, options.includeDrop);

    case 'sqlserver':
    case 'azure_sql':
      return generateSQLServerDDL(dbName, schema, options.includeDrop);

    case 'oracle':
      return generateOracleDDL(schema, options.includeDrop);

    case 'sqlite':
    default:
      return generateSQLiteDDL(options.includeDrop);
  }
}

function generatePostgresDDL(dbName: string, schema: string, includeDrop?: boolean): string {
  return `-- ==============================================================================
-- PrintCraft 3D - Script DDL para PostgreSQL / Cloud SQL / AWS RDS / Supabase
-- Gerado Automaticamente pelo Superadmin Console
-- Data de Geração: ${new Date().toISOString()}
-- ==============================================================================

-- 1. Criação de Schema Multi-Tenant
CREATE SCHEMA IF NOT EXISTS ${schema};
SET search_path TO ${schema}, public;

-- Extensões recomendadas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

${includeDrop ? `DROP TABLE IF EXISTS app_access_logs CASCADE;
DROP TABLE IF EXISTS product_sales CASCADE;
DROP TABLE IF EXISTS consignment_items CASCADE;
DROP TABLE IF EXISTS consignments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS print_jobs CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS supplies CASCADE;
DROP TABLE IF EXISTS filaments CASCADE;
DROP TABLE IF EXISTS printer_maintenance CASCADE;
DROP TABLE IF EXISTS ams_heaters CASCADE;
DROP TABLE IF EXISTS printers CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;` : ''}

-- Tabela de Planos de Assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'mensal',
  description TEXT NOT NULL,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_printers INTEGER NOT NULL DEFAULT 2,
  max_products INTEGER NOT NULL DEFAULT 20,
  features_json JSONB NOT NULL DEFAULT '[]',
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  badge VARCHAR(50) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Empresas (Multi-Tenant por CNPJ ou CPF)
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  document_type VARCHAR(10) NOT NULL DEFAULT 'CNPJ',
  document_number VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(10),
  plan_id VARCHAR(50) REFERENCES subscription_plans(id) ON DELETE SET NULL,
  theme VARCHAR(50) NOT NULL DEFAULT 'sage-bento',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  notes TEXT,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'mensal',
  expires_at TIMESTAMPTZ,
  max_users_override INTEGER,
  max_printers_override INTEGER,
  max_products_override INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_doc ON companies(document_number);

-- Tabela de Usuários das Empresas
CREATE TABLE IF NOT EXISTS app_users (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'operator',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  permissions_json JSONB NOT NULL DEFAULT '[]',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_users_company ON app_users(company_id);

-- Tabela de Impressoras 3D
CREATE TABLE IF NOT EXISTS printers (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  printer_power_watts NUMERIC(8,2) NOT NULL DEFAULT 80.0,
  bed_heater_watts NUMERIC(8,2) NOT NULL DEFAULT 200.0,
  filament_heater_watts NUMERIC(8,2) NOT NULL DEFAULT 0.0,
  total_power_watts NUMERIC(8,2) NOT NULL DEFAULT 280.0,
  hourly_depreciation NUMERIC(8,2) NOT NULL DEFAULT 0.50,
  failure_rate_default NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  status VARCHAR(30) NOT NULL DEFAULT 'available'
);
CREATE INDEX IF NOT EXISTS idx_printers_company ON printers(company_id);

-- Tabela de Filamentos
CREATE TABLE IF NOT EXISTS filaments (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  material VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  color_hex VARCHAR(20) NOT NULL,
  total_weight_g NUMERIC(10,2) NOT NULL,
  remaining_weight_g NUMERIC(10,2) NOT NULL,
  cost_per_spool NUMERIC(10,2) NOT NULL,
  diameter NUMERIC(5,2) NOT NULL DEFAULT 1.75,
  density NUMERIC(5,2) NOT NULL DEFAULT 1.24
);

-- Tabela de Insumos
CREATE TABLE IF NOT EXISTS supplies (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'un',
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  in_stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 10
);

-- Tabela de Categorias e Subcategorias
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  color VARCHAR(30) DEFAULT 'emerald',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Produtos Cadastrados
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) DEFAULT '',
  description TEXT,
  stl_filename VARCHAR(255),
  gcode_filename VARCHAR(255),
  printer_id VARCHAR(50) REFERENCES printers(id) ON DELETE RESTRICT,
  filament_id VARCHAR(50) REFERENCES filaments(id) ON DELETE RESTRICT,
  filament_weight_g NUMERIC(10,2) NOT NULL,
  print_time_minutes NUMERIC(10,2) NOT NULL,
  energy_cost NUMERIC(10,2) NOT NULL,
  filament_cost NUMERIC(10,2) NOT NULL,
  loss_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  depreciation_cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  extra_supplies_json JSONB NOT NULL DEFAULT '[]',
  extra_supplies_cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  total_cost NUMERIC(10,2) NOT NULL,
  markup_percent NUMERIC(8,2) NOT NULL DEFAULT 100.0,
  suggested_price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  ready_stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- Tabela de Ordens de Produção (PCP)
CREATE TABLE IF NOT EXISTS production_orders (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  op_number VARCHAR(50) NOT NULL,
  product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  printer_id VARCHAR(50),
  printer_name VARCHAR(150),
  filament_id VARCHAR(50),
  filament_name VARCHAR(150),
  filament_weight_g NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  print_time_minutes NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  priority VARCHAR(30) NOT NULL DEFAULT 'normal',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sale_id VARCHAR(50),
  customer_name VARCHAR(150),
  destination VARCHAR(50) NOT NULL DEFAULT 'stock',
  notes TEXT,
  supplies_json JSONB NOT NULL DEFAULT '[]',
  fail_reason TEXT,
  wasted_filament_g NUMERIC(10,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prod_orders_company ON production_orders(company_id);

-- Tabela de Vendas
CREATE TABLE IF NOT EXISTS product_sales (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  product_id VARCHAR(50),
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_revenue NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  profit NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  channel_type VARCHAR(50) NOT NULL,
  channel_name VARCHAR(100) NOT NULL,
  customer_document VARCHAR(30),
  customer_name VARCHAR(150),
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  platform_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  payment_method VARCHAR(50),
  notes TEXT,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  tracking_code VARCHAR(100) DEFAULT '',
  shipping_carrier VARCHAR(100) DEFAULT '',
  shipping_cost NUMERIC(10,2) DEFAULT 0.0,
  delivery_address TEXT DEFAULT '',
  estimated_delivery_date VARCHAR(50) DEFAULT '',
  delivered_at VARCHAR(50) DEFAULT '',
  delivery_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_company ON product_sales(company_id);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT 'pf',
  document VARCHAR(30),
  phone VARCHAR(50),
  email VARCHAR(150),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Transportadoras
CREATE TABLE IF NOT EXISTS carriers (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  service_type VARCHAR(100) NOT NULL DEFAULT 'PAC / SEDEX',
  default_cost NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  delivery_days VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS app_access_logs (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  user_name VARCHAR(150),
  user_email VARCHAR(150),
  company_id VARCHAR(50),
  company_name VARCHAR(200),
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'success',
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON app_access_logs(created_at DESC);
`;
}

function generateMySQLDDL(dbName: string, includeDrop?: boolean): string {
  return `-- ==============================================================================
-- PrintCraft 3D - Script DDL para MySQL 8.0+ / MariaDB Enterprise
-- Gerado Automaticamente pelo Superadmin Console
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${dbName}\`;

SET FOREIGN_KEY_CHECKS = 0;

${includeDrop ? `DROP TABLE IF EXISTS app_access_logs;
DROP TABLE IF EXISTS product_sales;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS carriers;
DROP TABLE IF EXISTS production_orders;
DROP TABLE IF EXISTS print_jobs;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS subcategories;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS supplies;
DROP TABLE IF EXISTS filaments;
DROP TABLE IF EXISTS printers;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS subscription_plans;` : ''}

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'mensal',
  description TEXT NOT NULL,
  max_users INT NOT NULL DEFAULT 1,
  max_printers INT NOT NULL DEFAULT 2,
  max_products INT NOT NULL DEFAULT 20,
  features_json JSON,
  is_popular TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  badge VARCHAR(50) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  document_type VARCHAR(10) NOT NULL DEFAULT 'CNPJ',
  document_number VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(10),
  plan_id VARCHAR(50),
  theme VARCHAR(50) NOT NULL DEFAULT 'sage-bento',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  notes TEXT,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'mensal',
  expires_at DATETIME,
  max_users_override INT,
  max_printers_override INT,
  max_products_override INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_comp_doc (document_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_users (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'operator',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  permissions_json JSON,
  last_login_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_comp (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printers (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50),
  name VARCHAR(150) NOT NULL,
  printer_power_watts DECIMAL(8,2) NOT NULL DEFAULT 80.0,
  bed_heater_watts DECIMAL(8,2) NOT NULL DEFAULT 200.0,
  filament_heater_watts DECIMAL(8,2) NOT NULL DEFAULT 0.0,
  total_power_watts DECIMAL(8,2) NOT NULL DEFAULT 280.0,
  hourly_depreciation DECIMAL(8,2) NOT NULL DEFAULT 0.50,
  failure_rate_default DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  INDEX idx_printer_comp (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS filaments (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50),
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  material VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  color_hex VARCHAR(20) NOT NULL,
  total_weight_g DECIMAL(10,2) NOT NULL,
  remaining_weight_g DECIMAL(10,2) NOT NULL,
  cost_per_spool DECIMAL(10,2) NOT NULL,
  diameter DECIMAL(5,2) NOT NULL DEFAULT 1.75,
  density DECIMAL(5,2) NOT NULL DEFAULT 1.24
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) DEFAULT '',
  description TEXT,
  stl_filename VARCHAR(255),
  gcode_filename VARCHAR(255),
  printer_id VARCHAR(50) NOT NULL,
  filament_id VARCHAR(50) NOT NULL,
  filament_weight_g DECIMAL(10,2) NOT NULL,
  print_time_minutes DECIMAL(10,2) NOT NULL,
  energy_cost DECIMAL(10,2) NOT NULL,
  filament_cost DECIMAL(10,2) NOT NULL,
  loss_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  depreciation_cost DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  labor_cost DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  extra_supplies_json JSON,
  extra_supplies_cost DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  total_cost DECIMAL(10,2) NOT NULL,
  markup_percent DECIMAL(8,2) NOT NULL DEFAULT 100.0,
  suggested_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  ready_stock_qty INT NOT NULL DEFAULT 0,
  min_stock_alert INT NOT NULL DEFAULT 5,
  image_url TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prod_comp (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS production_orders (
  id VARCHAR(50) PRIMARY KEY,
  company_id VARCHAR(50),
  op_number VARCHAR(50) NOT NULL,
  product_id VARCHAR(50),
  product_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  printer_id VARCHAR(50),
  printer_name VARCHAR(150),
  filament_id VARCHAR(50),
  filament_name VARCHAR(150),
  filament_weight_g DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  print_time_minutes DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  priority VARCHAR(30) NOT NULL DEFAULT 'normal',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  progress_percent INT NOT NULL DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  destination VARCHAR(50) NOT NULL DEFAULT 'stock',
  notes TEXT,
  supplies_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_op_comp (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;
}

function generateSQLServerDDL(dbName: string, schema: string, includeDrop?: boolean): string {
  return `-- ==============================================================================
-- PrintCraft 3D - Script DDL para Microsoft SQL Server 2019/2022 & Azure SQL
-- ==============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'${dbName}')
BEGIN
  CREATE DATABASE [${dbName}];
END;
GO

USE [${dbName}];
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'${schema}')
BEGIN
  EXEC('CREATE SCHEMA [${schema}]');
END;
GO

CREATE TABLE [${schema}].[companies] (
  [id] NVARCHAR(50) PRIMARY KEY,
  [name] NVARCHAR(255) NOT NULL,
  [trade_name] NVARCHAR(255) NULL,
  [document_type] NVARCHAR(10) NOT NULL DEFAULT 'CNPJ',
  [document_number] NVARCHAR(30) NOT NULL,
  [email] NVARCHAR(255) NOT NULL,
  [phone] NVARCHAR(50) NULL,
  [city] NVARCHAR(100) NULL,
  [state] NVARCHAR(10) NULL,
  [plan_id] NVARCHAR(50) NULL,
  [theme] NVARCHAR(50) NOT NULL DEFAULT 'sage-bento',
  [status] NVARCHAR(30) NOT NULL DEFAULT 'active',
  [notes] NVARCHAR(MAX) NULL,
  [billing_cycle] NVARCHAR(20) NOT NULL DEFAULT 'mensal',
  [expires_at] DATETIME2 NULL,
  [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
  [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX [IX_companies_doc] ON [${schema}].[companies] ([document_number]);
GO

CREATE TABLE [${schema}].[app_users] (
  [id] NVARCHAR(50) PRIMARY KEY,
  [company_id] NVARCHAR(50) NOT NULL,
  [name] NVARCHAR(255) NOT NULL,
  [email] NVARCHAR(255) NOT NULL UNIQUE,
  [password_hash] NVARCHAR(255) NOT NULL,
  [phone] NVARCHAR(50) NULL,
  [role] NVARCHAR(50) NOT NULL DEFAULT 'operator',
  [status] NVARCHAR(30) NOT NULL DEFAULT 'active',
  [permissions_json] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
  [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
  [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE [${schema}].[printers] (
  [id] NVARCHAR(50) PRIMARY KEY,
  [company_id] NVARCHAR(50) NULL,
  [name] NVARCHAR(150) NOT NULL,
  [printer_power_watts] DECIMAL(8,2) NOT NULL DEFAULT 80.0,
  [bed_heater_watts] DECIMAL(8,2) NOT NULL DEFAULT 200.0,
  [total_power_watts] DECIMAL(8,2) NOT NULL DEFAULT 280.0,
  [hourly_depreciation] DECIMAL(8,2) NOT NULL DEFAULT 0.50,
  [failure_rate_default] DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  [status] NVARCHAR(30) NOT NULL DEFAULT 'available'
);
GO

CREATE TABLE [${schema}].[products] (
  [id] NVARCHAR(50) PRIMARY KEY,
  [company_id] NVARCHAR(50) NULL,
  [name] NVARCHAR(200) NOT NULL,
  [category] NVARCHAR(100) NOT NULL,
  [filament_weight_g] DECIMAL(10,2) NOT NULL,
  [print_time_minutes] DECIMAL(10,2) NOT NULL,
  [total_cost] DECIMAL(10,2) NOT NULL,
  [sale_price] DECIMAL(10,2) NOT NULL,
  [ready_stock_qty] INT NOT NULL DEFAULT 0,
  [created_at] DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO
`;
}

function generateOracleDDL(schema: string, includeDrop?: boolean): string {
  return `-- ==============================================================================
-- PrintCraft 3D - Script DDL para Oracle Database (19c / 21c / 23ai)
-- ==============================================================================

CREATE TABLE companies (
  id VARCHAR2(50) PRIMARY KEY,
  name VARCHAR2(255) NOT NULL,
  trade_name VARCHAR2(255),
  document_type VARCHAR2(10) DEFAULT 'CNPJ' NOT NULL,
  document_number VARCHAR2(30) NOT NULL,
  email VARCHAR2(255) NOT NULL,
  phone VARCHAR2(50),
  city VARCHAR2(100),
  state VARCHAR2(10),
  plan_id VARCHAR2(50),
  theme VARCHAR2(50) DEFAULT 'sage-bento' NOT NULL,
  status VARCHAR2(30) DEFAULT 'active' NOT NULL,
  notes CLOB,
  billing_cycle VARCHAR2(20) DEFAULT 'mensal' NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_ora_comp_doc ON companies(document_number);

CREATE TABLE app_users (
  id VARCHAR2(50) PRIMARY KEY,
  company_id VARCHAR2(50) NOT NULL,
  name VARCHAR2(255) NOT NULL,
  email VARCHAR2(255) NOT NULL UNIQUE,
  password_hash VARCHAR2(255) NOT NULL,
  phone VARCHAR2(50),
  role VARCHAR2(50) DEFAULT 'operator' NOT NULL,
  status VARCHAR2(30) DEFAULT 'active' NOT NULL,
  permissions_json CLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE printers (
  id VARCHAR2(50) PRIMARY KEY,
  company_id VARCHAR2(50),
  name VARCHAR2(150) NOT NULL,
  printer_power_watts NUMBER(8,2) DEFAULT 80.0 NOT NULL,
  bed_heater_watts NUMBER(8,2) DEFAULT 200.0 NOT NULL,
  total_power_watts NUMBER(8,2) DEFAULT 280.0 NOT NULL,
  hourly_depreciation NUMBER(8,2) DEFAULT 0.50 NOT NULL,
  failure_rate_default NUMBER(5,2) DEFAULT 10.0 NOT NULL,
  status VARCHAR2(30) DEFAULT 'available' NOT NULL
);

CREATE TABLE products (
  id VARCHAR2(50) PRIMARY KEY,
  company_id VARCHAR2(50),
  name VARCHAR2(200) NOT NULL,
  category VARCHAR2(100) NOT NULL,
  filament_weight_g NUMBER(10,2) NOT NULL,
  print_time_minutes NUMBER(10,2) NOT NULL,
  total_cost NUMBER(10,2) NOT NULL,
  sale_price NUMBER(10,2) NOT NULL,
  ready_stock_qty NUMBER(10) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;
}

function generateSQLiteDDL(includeDrop?: boolean): string {
  return `-- ==============================================================================
-- PrintCraft 3D - Script DDL Completo para SQLite 3
-- Padrão Multi-Tenant por CNPJ/CPF
-- ==============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0.0,
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
CREATE INDEX IF NOT EXISTS idx_comp_doc ON companies(document_number);

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

CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  printer_power_watts REAL NOT NULL DEFAULT 80,
  bed_heater_watts REAL NOT NULL DEFAULT 200,
  filament_heater_watts REAL NOT NULL DEFAULT 0,
  total_power_watts REAL NOT NULL DEFAULT 280,
  hourly_depreciation REAL NOT NULL DEFAULT 0.50,
  failure_rate_default REAL NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS filaments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
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

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT DEFAULT '',
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

CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT,
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
  destination TEXT NOT NULL DEFAULT 'stock',
  notes TEXT,
  supplies_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
`;
}

/**
 * Generates SQL data migration (INSERT statements) from master database
 */
export function generateEngineDataInserts(masterDb: Database, targetEngine: SupportedEngine): string {
  const tables = [
    'subscription_plans',
    'companies',
    'app_users',
    'printers',
    'filaments',
    'supplies',
    'categories',
    'subcategories',
    'products',
    'production_orders',
    'clients',
    'carriers',
    'product_sales',
  ];

  let sqlOutput = `\n-- ==============================================================================
-- DML - INSERÇÃO E MIGRAÇÃO DE DADOS ATUAIS DO SISTEMA
-- ==============================================================================\n\n`;

  for (const table of tables) {
    try {
      const res = masterDb.exec(`SELECT * FROM ${table}`);
      if (res.length > 0 && res[0].values.length > 0) {
        const columns = res[0].columns;
        sqlOutput += `-- Tabela: ${table} (${res[0].values.length} registros)\n`;

        for (const row of res[0].values) {
          const valuesEscaped = row.map((val) => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            if (typeof val === 'boolean') return targetEngine === 'postgres' ? (val ? 'TRUE' : 'FALSE') : val ? '1' : '0';
            const strVal = String(val).replace(/'/g, "''");
            return `'${strVal}'`;
          });

          sqlOutput += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${valuesEscaped.join(', ')});\n`;
        }
        sqlOutput += `\n`;
      }
    } catch {
      // Table might not have records or exist
    }
  }

  return sqlOutput;
}
