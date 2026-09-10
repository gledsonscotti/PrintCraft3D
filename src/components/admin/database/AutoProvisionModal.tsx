import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Play,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Server
} from 'lucide-react';
import { DatabaseProfile, SupportedEngine } from './types';

interface AutoProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProfile?: DatabaseProfile | null;
  profiles: DatabaseProfile[];
}

export const AutoProvisionModal: React.FC<AutoProvisionModalProps> = ({
  isOpen,
  onClose,
  selectedProfile,
  profiles
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'provision' | 'export_sql'>('provision');
  const [targetEngine, setTargetEngine] = useState<SupportedEngine>('postgres');
  const [databaseName, setDatabaseName] = useState('printcraft_prod');
  const [schemaName, setSchemaName] = useState('public');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Provisioning state
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{
    success: boolean;
    message: string;
    tablesCount: number;
    provisionedTables: string[];
    auditLogs: string[];
  } | null>(null);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
    rowsMigratedCount: number;
  } | null>(null);

  // SQL Export state
  const [includeDdl, setIncludeDdl] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string>('');
  const [sqlFilename, setSqlFilename] = useState<string>('');
  const [sqlSizeBytes, setSqlSizeBytes] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (selectedProfile) {
      setSelectedProfileId(selectedProfile.id);
      setTargetEngine(selectedProfile.engine);
      setDatabaseName(selectedProfile.database_name || 'printcraft_prod');
      if (selectedProfile.engine.includes('sqlserver')) {
        setSchemaName('dbo');
      } else {
        setSchemaName('public');
      }
    } else if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
      setTargetEngine(profiles[0].engine);
    }
  }, [selectedProfile, profiles, isOpen]);

  // Handle engine change
  const handleEngineSelect = (eng: SupportedEngine) => {
    setTargetEngine(eng);
    if (eng === 'sqlserver' || eng === 'azure_sql') {
      setSchemaName('dbo');
    } else {
      setSchemaName('public');
    }
  };

  // Run automatic provisioning
  const handleRunProvisioning = async () => {
    setIsProvisioning(true);
    setProvisionResult(null);
    try {
      const res = await fetch('/api/admin/database/auto-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: targetEngine,
          databaseName,
          schemaName,
          profileId: selectedProfileId,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao executar provisionamento');
      setProvisionResult(data);
    } catch (err: any) {
      setProvisionResult({
        success: false,
        message: 'Erro no provisionamento: ' + err.message,
        tablesCount: 0,
        provisionedTables: [],
        auditLogs: [`[ERRO FATAL] ${err.message}`]
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  // Run data migration
  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/admin/database/migrate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEngine,
          profileId: selectedProfileId,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao migrar dados');
      setMigrationResult(data);
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: 'Erro ao migrar dados: ' + err.message,
        rowsMigratedCount: 0
      });
    } finally {
      setIsMigrating(false);
    }
  };

  // Generate SQL script for export
  const handleGenerateExportSql = async () => {
    setIsGeneratingSql(true);
    setHasCopied(false);
    try {
      const res = await fetch('/api/admin/database/export-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: targetEngine,
          includeDdl,
          includeData,
          databaseName,
          schemaName,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar SQL');
      setGeneratedSql(data.sql);
      setSqlFilename(data.filename);
      setSqlSizeBytes(data.size_formatted);
    } catch (err: any) {
      alert('Erro ao gerar script SQL: ' + err.message);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  // Download SQL file
  const handleDownloadSql = () => {
    if (!generatedSql) return;
    const blob = new Blob([generatedSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sqlFilename || `printcraft_${targetEngine}_script.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121215] border border-white/[0.1] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden admin-modal admin-card">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-[#15151A] admin-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Criação & Exportação Automática de Bancos e Tabelas
              </h3>
              <p className="text-xs text-slate-400">
                Provisione a arquitetura relacional de 18 tabelas ou exporte scripts SQL formatados para o banco alvo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer admin-btn-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="flex border-b border-white/[0.08] px-6 bg-[#0E0E11] text-xs font-semibold admin-subnav-bar">
          <button
            type="button"
            onClick={() => setActiveSubTab('provision')}
            className={`py-3 px-4 border-b-2 transition cursor-pointer flex items-center gap-2 admin-tab-btn ${
              activeSubTab === 'provision'
                ? 'border-emerald-400 text-emerald-400 font-bold admin-tab-active'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Criação & Provisionamento Automático
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('export_sql');
              if (!generatedSql) handleGenerateExportSql();
            }}
            className={`py-3 px-4 border-b-2 transition cursor-pointer flex items-center gap-2 admin-tab-btn ${
              activeSubTab === 'export_sql'
                ? 'border-emerald-400 text-emerald-400 font-bold admin-tab-active'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Exportar Script SQL (.sql)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
          {/* Target Engine & Database Selection Banner */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 admin-inner-box">
            <div className="space-y-1">
              <label className="text-slate-400 block font-semibold text-[11px]">
                Motor / Dialeto Alvo
              </label>
              <select
                value={targetEngine}
                onChange={(e) => handleEngineSelect(e.target.value as SupportedEngine)}
                className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none cursor-pointer admin-input"
              >
                <option value="postgres">PostgreSQL (Recomendado)</option>
                <option value="mysql">MySQL Server</option>
                <option value="mariadb">MariaDB Server</option>
                <option value="sqlserver">Microsoft SQL Server</option>
                <option value="oracle">Oracle Database</option>
                <option value="sqlite">SQLite (Arquivo Local)</option>
                <option value="cloudsql_postgres">Google Cloud SQL (PostgreSQL)</option>
                <option value="aws_rds_postgres">AWS RDS Aurora (PostgreSQL)</option>
                <option value="azure_sql">Microsoft Azure SQL</option>
                <option value="supabase">Supabase PostgreSQL</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-semibold text-[11px]">
                Nome do Banco Alvo
              </label>
              <input
                type="text"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none font-mono admin-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block font-semibold text-[11px]">
                Schema
              </label>
              <input
                type="text"
                value={schemaName}
                onChange={(e) => setSchemaName(e.target.value)}
                className="w-full bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-1.5 text-white outline-none font-mono admin-input"
              />
            </div>
          </div>

          {/* Sub-Tab 1: Provisioning Wizard */}
          {activeSubTab === 'provision' && (
            <div className="space-y-4">
              {/* Tables Catalog Badge */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">18 Tabelas Relacionais Compiladas</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Ao clicar no botão abaixo, o motor compilará o DDL com os tipos nativos do dialeto <strong className="text-white uppercase font-mono">{targetEngine}</strong>, configurando chaves primárias UUID/TEXT, chaves estrangeiras, constraints e índices de busca otimizados.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRunProvisioning}
                  disabled={isProvisioning}
                  className="admin-btn-primary px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <Play className={`w-4 h-4 ${isProvisioning ? 'animate-spin' : ''}`} />
                  {isProvisioning ? 'Provisionando Estruturas...' : 'Criar Tabelas Automaticamente no Banco Alvo'}
                </button>

                {provisionResult?.success && (
                  <button
                    type="button"
                    onClick={handleRunMigration}
                    disabled={isMigrating}
                    className="admin-btn-secondary px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                    {isMigrating ? 'Migrando Dados...' : 'Migrar Dados Atuais para Novo Banco'}
                  </button>
                )}
              </div>

              {/* Migration Success Message */}
              {migrationResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    migrationResult.success
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {migrationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{migrationResult.message}</span>
                </div>
              )}

              {/* Live Terminal / Audit Logs */}
              {provisionResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Terminal de Execução DDL & Auditoria
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {provisionResult.tablesCount} tabelas verificadas
                    </span>
                  </div>

                  <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar admin-code-block">
                    {provisionResult.auditLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 ${
                          log.includes('[ERRO') ? 'text-rose-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        <span className="text-emerald-500 shrink-0">❯</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 2: SQL Script Export */}
          {activeSubTab === 'export_sql' && (
            <div className="space-y-4">
              {/* Options */}
              <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] admin-inner-box">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeDdl}
                    onChange={(e) => setIncludeDdl(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded"
                  />
                  <span>Incluir DDL (CREATE TABLE & INDEXES)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeData}
                    onChange={(e) => setIncludeData(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded"
                  />
                  <span>Incluir DML (INSERT INTO com dados atuais)</span>
                </label>

                <button
                  type="button"
                  onClick={handleGenerateExportSql}
                  disabled={isGeneratingSql}
                  className="admin-btn-secondary ml-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSql ? 'animate-spin' : ''}`} />
                  {isGeneratingSql ? 'Gerando...' : 'Recompilar SQL'}
                </button>
              </div>

              {/* Code Preview Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  Script SQL Gerado ({sqlFilename || `${targetEngine}.sql`})
                  {sqlSizeBytes && <span className="text-slate-500 font-normal">({sqlSizeBytes})</span>}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {hasCopied ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSql}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm admin-btn-primary"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Arquivo .sql
                  </button>
                </div>
              </div>

              {/* SQL Code Preview Container */}
              <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-4 font-mono text-[11px] text-emerald-300 max-h-72 overflow-y-auto custom-scrollbar whitespace-pre admin-code-block">
                {isGeneratingSql ? (
                  <div className="text-slate-400 py-6 text-center animate-pulse">
                    Compilando script SQL com sintaxe específica para {targetEngine.toUpperCase()}...
                  </div>
                ) : generatedSql ? (
                  generatedSql
                ) : (
                  <div className="text-slate-500 py-6 text-center">
                    Clique em "Recompilar SQL" para gerar o script com as opções selecionadas.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
