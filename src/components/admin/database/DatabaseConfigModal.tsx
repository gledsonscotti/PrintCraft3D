import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Lock,
  Eye,
  EyeOff,
  Save,
  Shield,
  Layers,
  Info
} from 'lucide-react';
import { DatabaseProfile, EngineMetadata, SupportedEngine } from './types';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profileData: Partial<DatabaseProfile>) => Promise<void>;
  engines: EngineMetadata[];
  profileToEdit?: DatabaseProfile | null;
  initialEngine?: string;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  engines,
  profileToEdit,
  initialEngine
}) => {
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<SupportedEngine>('postgres');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(5432);
  const [databaseName, setDatabaseName] = useState('printcraft_prod');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sslMode, setSslMode] = useState('prefer');
  const [tenantStrategy, setTenantStrategy] = useState<any>('schema_per_tenant');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize form when opening or changing profile
  useEffect(() => {
    if (profileToEdit) {
      setName(profileToEdit.name);
      setEngine(profileToEdit.engine);
      setHost(profileToEdit.host || '');
      setPort(profileToEdit.port || 5432);
      setDatabaseName(profileToEdit.database_name || 'printcraft_prod');
      setUsername(profileToEdit.username || '');
      setPassword('');
      setSslMode(profileToEdit.ssl_mode || 'prefer');
      setTenantStrategy(profileToEdit.multi_tenant_strategy || 'schema_per_tenant');
      setNotes(profileToEdit.notes || '');
    } else {
      const chosenEngine = (initialEngine as SupportedEngine) || 'postgres';
      const meta = engines.find(e => e.id === chosenEngine);
      setEngine(chosenEngine);
      setName(meta ? `${meta.name} (Novo Perfil)` : 'Nova Conexão');
      setPort(meta?.defaultPort || 5432);
      setHost(chosenEngine === 'sqlite' ? 'local' : 'localhost');
      setDatabaseName('printcraft_db');
      setUsername(chosenEngine === 'sqlite' ? '' : 'postgres');
      setPassword('');
      setSslMode('prefer');
      setTenantStrategy(chosenEngine === 'sqlite' ? 'sqlite_per_tenant' : 'schema_per_tenant');
      setNotes('');
    }
    setTestResult(null);
    setFormError(null);
  }, [profileToEdit, initialEngine, engines, isOpen]);

  // When engine dropdown changes, update default port and defaults
  const handleEngineChange = (newEngine: SupportedEngine) => {
    setEngine(newEngine);
    const meta = engines.find(e => e.id === newEngine);
    if (meta) {
      setPort(meta.defaultPort);
      if (newEngine === 'sqlite') {
        setHost('local');
        setUsername('');
        setTenantStrategy('sqlite_per_tenant');
      } else if (newEngine.includes('postgres') || newEngine === 'supabase') {
        setUsername('postgres');
      } else if (newEngine.includes('mysql') || newEngine === 'mariadb') {
        setUsername('root');
      } else if (newEngine === 'sqlserver' || newEngine === 'azure_sql') {
        setUsername('sa');
      } else if (newEngine === 'oracle') {
        setUsername('SYSTEM');
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine,
          host,
          port,
          database_name: databaseName,
          username,
          password_secret: password,
          ssl_mode: sslMode,
          profile_id: profileToEdit?.id,
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Erro ao executar teste de rede: ' + err.message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor, informe um nome descritivo para esta conexão.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await onSaveProfile({
        id: profileToEdit?.id,
        name: name.trim(),
        engine,
        host: host.trim(),
        port: Number(port),
        database_name: databaseName.trim(),
        username: username.trim(),
        password_secret: password,
        ssl_mode: sslMode,
        multi_tenant_strategy: tenantStrategy,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar perfil de conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121215] border border-white/[0.1] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden admin-modal admin-card">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-[#15151A] admin-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {profileToEdit ? 'Editar Configuração de Conexão' : 'Configurar Novo Banco de Dados Relacional'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure os parâmetros de conectividade do player de mercado selecionado
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

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* General info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-300 font-semibold block">
                Nome de Identificação do Perfil <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: PostgreSQL Produção AWS, MySQL On-Premise Matriz..."
                required
                className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white outline-none transition admin-input"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-300 font-semibold block">
                Motor / Player Relacional do Mercado <span className="text-emerald-400">*</span>
              </label>
              <select
                value={engine}
                onChange={(e) => handleEngineChange(e.target.value as SupportedEngine)}
                className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white outline-none transition cursor-pointer admin-input"
              >
                <optgroup label="1. On-Premise Open-Source">
                  <option value="sqlite">SQLite (Padrão Ativo - Isolamento por CNPJ/CPF)</option>
                  <option value="postgres">PostgreSQL (Recomendado para Produção)</option>
                  <option value="mysql">MySQL Community / Enterprise</option>
                  <option value="mariadb">MariaDB Server</option>
                </optgroup>
                <optgroup label="2. On-Premise Comercial / Pago">
                  <option value="sqlserver">Microsoft SQL Server (Enterprise/Standard)</option>
                  <option value="oracle">Oracle Database (Enterprise / SE2)</option>
                </optgroup>
                <optgroup label="3. Bancos em Nuvem Gerenciados (Cloud)">
                  <option value="cloudsql_postgres">Google Cloud SQL (PostgreSQL)</option>
                  <option value="cloudsql_mysql">Google Cloud SQL (MySQL)</option>
                  <option value="aws_rds_postgres">AWS RDS / Aurora (PostgreSQL)</option>
                  <option value="aws_rds_mysql">AWS RDS / Aurora (MySQL)</option>
                  <option value="azure_sql">Microsoft Azure SQL Database</option>
                  <option value="supabase">Supabase Managed PostgreSQL</option>
                </optgroup>
              </select>
            </div>

            {engine !== 'sqlite' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Host / Endpoint de Rede
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="Ex: localhost, db.empresa.local, rds.amazonaws.com"
                    className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition font-mono admin-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Porta TCP
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition font-mono admin-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Nome do Banco (Database / Catalog)
                  </label>
                  <input
                    type="text"
                    value={databaseName}
                    onChange={(e) => setDatabaseName(e.target.value)}
                    placeholder="printcraft_prod"
                    className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition font-mono admin-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Usuário do Banco
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="postgres, sa, root..."
                    className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition font-mono admin-input"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-300 font-semibold block">
                    Senha de Acesso (Criptografada)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={profileToEdit ? '(Preencha apenas para alterar a senha atual)' : 'Digite a senha do banco'}
                      className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl pl-3.5 pr-10 py-2 text-white outline-none transition font-mono admin-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Modo SSL / TLS
                  </label>
                  <select
                    value={sslMode}
                    onChange={(e) => setSslMode(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition cursor-pointer admin-input"
                  >
                    <option value="prefer">Prefer (Negociar se disponível)</option>
                    <option value="require">Require (Exigir criptografia SSL)</option>
                    <option value="disable">Disable (Sem criptografia / rede interna)</option>
                    <option value="verify-full">Verify Full (Validar autoridade CA)</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-300 font-semibold block">
                Estratégia de Multi-Tenancy (Isolamento por Empresa / CNPJ / CPF)
              </label>
              <select
                value={tenantStrategy}
                onChange={(e) => setTenantStrategy(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition cursor-pointer admin-input"
              >
                <option value="sqlite_per_tenant">
                  1 Banco SQLite Isolado por CNPJ/CPF (Padrão Default do Ambiente)
                </option>
                <option value="schema_per_tenant">
                  1 Schema separado por CNPJ/CPF no mesmo banco (Recomendado para Postgres/Oracle)
                </option>
                <option value="tenant_column_rls">
                  Tabelas compartilhadas com Coluna Discriminadora e Row-Level Security (RLS)
                </option>
                <option value="database_per_tenant">
                  1 Banco de dados exclusivo por CNPJ/CPF (Alta segregação corporativa)
                </option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-slate-300 font-semibold block">
                Observações Técnicas / Documentação Interna
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cluster secundário na Zona SP-East, replicado em standby..."
                className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white outline-none transition resize-none admin-input"
              />
            </div>
          </div>

          {/* Test Connectivity Result Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold block">
                  {testResult.success ? 'Conexão Bem-Sucedida!' : 'Falha na Conexão'}
                </span>
                <span className="text-[11px] leading-relaxed block">
                  {testResult.message}
                </span>
                {testResult.latency_ms !== undefined && (
                  <span className="text-[10px] font-mono text-emerald-400 block pt-1">
                    Latência aferida: {testResult.latency_ms} ms
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="admin-btn-secondary w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Aferindo Conectividade...' : 'Testar Conexão Agora'}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="admin-btn-secondary w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm admin-btn-primary"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
