export type SupportedEngine =
  | 'sqlite'
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'sqlserver'
  | 'oracle'
  | 'cloudsql_postgres'
  | 'cloudsql_mysql'
  | 'aws_rds_postgres'
  | 'aws_rds_mysql'
  | 'azure_sql'
  | 'supabase';

export type EngineCategory = 'on_premise_opensource' | 'on_premise_commercial' | 'cloud_managed';

export interface EngineMetadata {
  id: SupportedEngine;
  name: string;
  category: EngineCategory;
  categoryLabel: string;
  vendor: string;
  defaultPort: number;
  description: string;
  iconName: string;
  recommendedFor: string;
  dialectFamily: 'postgres' | 'mysql' | 'sqlserver' | 'oracle' | 'sqlite';
}

export interface DatabaseProfile {
  id: string;
  name: string;
  engine: SupportedEngine;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_secret?: string;
  ssl_mode: string;
  multi_tenant_strategy: 'sqlite_per_tenant' | 'schema_per_tenant' | 'tenant_column_rls' | 'database_per_tenant';
  is_active: number;
  is_default: number;
  connection_status: 'connected' | 'failed' | 'untested';
  last_tested_at?: string | null;
  last_test_message?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantSqliteInfo {
  company_id: string;
  company_name: string;
  document_type: 'CNPJ' | 'CPF';
  document_number: string;
  sanitized_doc: string;
  db_file_name: string;
  db_file_path: string;
  file_size_bytes: number;
  file_size_formatted: string;
  exists_on_disk: boolean;
  last_modified: string;
  tables_count: number;
  records_count: number;
}

export interface DbOverviewData {
  activeProfile: DatabaseProfile;
  defaultProfile: DatabaseProfile;
  profiles: DatabaseProfile[];
  supportedEngines: EngineMetadata[];
  tenants: TenantSqliteInfo[];
  tenantsCount: number;
  totalTenantsBytes: number;
  totalTenantsFormatted: string;
  masterStats: any;
}
