import React from 'react';
import {
  Database,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Play,
  Settings,
  Trash2,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { DatabaseProfile, EngineMetadata } from './types';
import { AppTheme } from '../../../types';

interface MultiDbProfilesCatalogProps {
  profiles: DatabaseProfile[];
  engines: EngineMetadata[];
  activeProfile: DatabaseProfile | null;
  onSelectConfigure: (profile?: DatabaseProfile, initialEngine?: string) => void;
  onActivateProfile: (profile: DatabaseProfile) => void;
  onDeleteProfile: (profile: DatabaseProfile) => void;
  onTestConnection: (profile: DatabaseProfile) => void;
  onOpenProvisionWizard: (profile: DatabaseProfile) => void;
  isTestingId: string | null;
  isActivatingId: string | null;
  onRefresh: () => void;
  currentTheme?: AppTheme;
}

export const MultiDbProfilesCatalog: React.FC<MultiDbProfilesCatalogProps> = ({
  profiles,
  engines,
  activeProfile,
  onSelectConfigure,
  onActivateProfile,
  onDeleteProfile,
  onTestConnection,
  onOpenProvisionWizard,
  isTestingId,
  isActivatingId,
  onRefresh,
  currentTheme
}) => {
  const getEngineMeta = (engineId: string) => {
    return engines.find(e => e.id === engineId);
  };

  const getEngineBadge = (category: string) => {
    switch (category) {
      case 'on_premise_opensource':
        return { label: 'On-Premise Open-Source', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'on_premise_commercial':
        return { label: 'On-Premise Pago / Enterprise', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'cloud_managed':
        return { label: 'Nuvem Gerenciada (Cloud DB)', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
      default:
        return { label: 'Relacional', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Database Engine Hero */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm relative overflow-hidden admin-card">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {activeProfile?.name || 'SQLite Master Engine'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Motor Ativo Atual
                </span>
                {activeProfile?.is_default === 1 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-300 bg-white/[0.06] border border-white/[0.1]">
                    Padrão do Sistema
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Motor: <strong className="text-slate-200 uppercase font-mono">{activeProfile?.engine || 'sqlite'}</strong></span>
                <span>•</span>
                <span>Isolamento: <strong className="text-slate-200">1 Banco SQLite por CNPJ/CPF</strong></span>
                <span>•</span>
                <span>Status: <strong className="text-emerald-400">Operacional (Zero Latência)</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              className="admin-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => onSelectConfigure()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm admin-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Nova Conexão
            </button>
          </div>
        </div>

        {/* Key Features Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] space-y-1 admin-inner-box">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <HardDrive className="w-4 h-4" />
              <span>Multi-Tenancy SQLite Ativo</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cada empresa (CNPJ ou CPF) possui um arquivo binário <code className="text-emerald-300 font-mono">.sqlite</code> isolado em <code className="text-slate-300 font-mono">data/tenants/</code>.
            </p>
          </div>
          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] space-y-1 admin-inner-box">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <Server className="w-4 h-4" />
              <span>Conexões On-Premise & Cloud</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Suporte nativo a PostgreSQL, MySQL, SQL Server, Oracle, Cloud SQL, AWS RDS e Supabase com migração em 1 clique.
            </p>
          </div>
          <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] space-y-1 admin-inner-box">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Provisionamento Automático</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gera DDL completo, cria 18 tabelas relacionais com chaves estrangeiras e índices automaticamente no banco destino.
            </p>
          </div>
        </div>
      </div>

      {/* Configured Database Connections Table */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              Conexões e Perfis de Banco de Dados Cadastrados ({profiles.length})
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerencie instâncias locais, on-premise empresariais e bancos gerenciados em nuvem
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {profiles.filter(p => p.is_active === 1).length} ativo / {profiles.length} configurados
          </span>
        </div>

        <div className="space-y-3">
          {profiles.map((prof) => {
            const meta = getEngineMeta(prof.engine);
            const badge = getEngineBadge(meta?.category || 'on_premise_opensource');
            const isActive = prof.is_active === 1;
            const isTesting = isTestingId === prof.id;
            const isActivating = isActivatingId === prof.id;

            return (
              <div
                key={prof.id}
                className={`p-4 rounded-2xl border transition admin-inner-box ${
                  isActive
                    ? 'admin-profile-active bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#1A1A20] text-slate-400 border border-white/[0.08] admin-btn-secondary'
                      }`}
                    >
                      <Database className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{prof.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            EM USO
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${badge.color}`}>
                          {meta?.name || prof.engine}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {prof.engine === 'sqlite' ? 'Arquivo Local' : `${prof.host || 'localhost'}:${prof.port || meta?.defaultPort}`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span>Database: <strong className="text-slate-300 font-mono">{prof.database_name || 'printcraft'}</strong></span>
                        {prof.username && (
                          <>
                            <span>•</span>
                            <span>Usuário: <strong className="text-slate-300 font-mono">{prof.username}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Estratégia: <strong className="text-slate-300">{prof.multi_tenant_strategy}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          Conectividade:
                          {prof.connection_status === 'connected' ? (
                            <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Conectado / Aprovado
                            </span>
                          ) : prof.connection_status === 'failed' ? (
                            <span className="text-rose-400 inline-flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3 h-3" /> Falha no Teste
                            </span>
                          ) : (
                            <span className="text-slate-400 inline-flex items-center gap-1">
                              <Activity className="w-3 h-3" /> Não testado
                            </span>
                          )}
                        </span>
                      </div>

                      {prof.last_test_message && (
                        <p className="text-[11px] text-slate-500 font-mono pt-0.5">
                          Log: {prof.last_test_message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onTestConnection(prof)}
                      disabled={isTesting}
                      className="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Testar Conectividade em Tempo Real"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-sky-400' : ''}`} />
                      {isTesting ? 'Testando...' : 'Testar Conexão'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenProvisionWizard(prof)}
                      className="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Criar e provisionar tabelas neste banco"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Provisionar Tabelas
                    </button>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onActivateProfile(prof)}
                        disabled={isActivating}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Ativar como banco de dados principal"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isActivating ? 'Ativando...' : 'Ativar como Principal'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectConfigure(prof)}
                      className="admin-btn-secondary p-1.5 rounded-xl transition cursor-pointer"
                      title="Editar Configurações"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    {prof.is_default !== 1 && !isActive && (
                      <button
                        type="button"
                        onClick={() => onDeleteProfile(prof)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                        title="Excluir Perfil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Market Players Catalog Grid */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
        <div className="border-b border-white/[0.06] pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-400" />
            Catálogo de Bancos Relacionais & Principais Players do Mercado
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Clique em qualquer player para iniciar a configuração com parâmetros recomendados e portas oficiais
          </p>
        </div>

        {/* Group by category */}
        <div className="space-y-6">
          {/* 1. On-Premise Open Source */}
          <div>
            <span className="text-xs font-bold text-emerald-400 block mb-3 uppercase tracking-wider">
              1. On-Premise & Servidores Locais (Open-Source)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {engines
                .filter(e => e.category === 'on_premise_opensource')
                .map(eng => (
                  <div
                    key={eng.id}
                    onClick={() => onSelectConfigure(undefined, eng.id)}
                    className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] hover:border-emerald-500/40 transition cursor-pointer group flex flex-col justify-between space-y-3 admin-inner-box"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                          {eng.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                          Porta {eng.defaultPort || 'N/A'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {eng.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px]">
                      <span className="text-slate-500 font-mono">{eng.vendor}</span>
                      <span className="text-emerald-400 font-bold group-hover:underline">
                        Configurar +
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 2. On-Premise Comercial / Pago */}
          <div>
            <span className="text-xs font-bold text-amber-400 block mb-3 uppercase tracking-wider">
              2. On-Premise Comercial / Pago (Enterprise)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {engines
                .filter(e => e.category === 'on_premise_commercial')
                .map(eng => (
                  <div
                    key={eng.id}
                    onClick={() => onSelectConfigure(undefined, eng.id)}
                    className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] hover:border-amber-500/40 transition cursor-pointer group flex flex-col justify-between space-y-3 admin-inner-box"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                          {eng.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                          Porta {eng.defaultPort}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {eng.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px]">
                      <span className="text-slate-500 font-mono">{eng.vendor}</span>
                      <span className="text-amber-400 font-bold group-hover:underline">
                        Configurar +
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* 3. Cloud Gerenciado */}
          <div>
            <span className="text-xs font-bold text-sky-400 block mb-3 uppercase tracking-wider">
              3. Bancos de Dados em Nuvem Gerenciados (Cloud SQL, AWS, Azure, Supabase)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {engines
                .filter(e => e.category === 'cloud_managed')
                .map(eng => (
                  <div
                    key={eng.id}
                    onClick={() => onSelectConfigure(undefined, eng.id)}
                    className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] hover:border-sky-500/40 transition cursor-pointer group flex flex-col justify-between space-y-3 admin-inner-box"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                          {eng.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                          Porta {eng.defaultPort}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {eng.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px]">
                      <span className="text-slate-500 font-mono">{eng.vendor}</span>
                      <span className="text-sky-400 font-bold group-hover:underline">
                        Configurar Nuvem +
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
