import React, { useState } from 'react';
import {
  Database,
  Download,
  RefreshCw,
  Building2,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { TenantSqliteInfo } from './types';

interface TenantSqliteDatabasesProps {
  tenants: TenantSqliteInfo[];
  totalBytesFormatted: string;
  onSyncTenants: () => Promise<void>;
  isSyncing: boolean;
}

export const TenantSqliteDatabases: React.FC<TenantSqliteDatabasesProps> = ({
  tenants,
  totalBytesFormatted,
  onSyncTenants,
  isSyncing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTenants = tenants.filter(t => {
    const term = searchTerm.toLowerCase();
    return (
      t.company_name.toLowerCase().includes(term) ||
      t.document_number.toLowerCase().includes(term) ||
      t.db_file_name.toLowerCase().includes(term)
    );
  });

  const handleDownloadTenantDb = (companyId: string, fileName: string) => {
    const downloadUrl = `/api/admin/database/tenants/${companyId}/download`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Architecture Explanation */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Bancos SQLite Dedicados por CNPJ / CPF
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Isolamento físico rigoroso: cada empresa cadastrada opera em seu próprio arquivo binário independente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSyncTenants}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Todos os Bancos'}
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] admin-inner-box">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Total de Bancos SQLite Isolados
            </span>
            <span className="text-xl font-bold text-white mt-1 block">
              {tenants.length} empresas / cadastros
            </span>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              100% isolados fisicamente no disco
            </span>
          </div>

          <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] admin-inner-box">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Espaço em Disco em data/tenants/
            </span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">
              {totalBytesFormatted || '0 KB'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Armazenamento relacional de alto rendimento
            </span>
          </div>

          <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-white/[0.06] admin-inner-box">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Padrão Default do Ambiente
            </span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">
              SQLite (Zero Latency)
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Autossuficiente sem dependência de portas
            </span>
          </div>
        </div>

        {/* Architectural Explainer */}
        <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] text-xs text-slate-300 space-y-2 admin-inner-box">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Como funciona o Multi-Tenant SQLite por CNPJ/CPF:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sempre que uma nova empresa se cadastra (seja por auto-registro ou criação pelo Superadmin), o sistema gera automaticamente um arquivo <code className="text-emerald-400 font-mono">cnpj_&#123;numeros&#125;.sqlite</code> ou <code className="text-sky-400 font-mono">cpf_&#123;numeros&#125;.sqlite</code> no diretório <code className="text-slate-300 font-mono">data/tenants/</code>. Esse arquivo recebe seu próprio catálogo relacional com 18 tabelas, permitindo que os dados de faturamento, filamentos, ordens e impressoras de cada CNPJ fiquem totalmente segregados e possam ser baixados isoladamente a qualquer momento para auditoria ou backup individual.
          </p>
        </div>
      </div>

      {/* Tenants List with Search & Actions */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 shadow-sm space-y-4 admin-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Lista de Bancos por Empresa Cadastrada ({filteredTenants.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por empresa, CNPJ/CPF..."
              className="w-full bg-[#0A0A0B] border border-white/[0.08] focus:border-emerald-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition admin-input"
            />
          </div>
        </div>

        {filteredTenants.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma empresa ou banco SQLite encontrado para o termo pesquisado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTenants.map((t) => (
              <div
                key={t.company_id}
                className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/[0.06] hover:border-white/[0.12] transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 admin-inner-box"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{t.company_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                        {t.document_type}: {t.document_number}
                      </span>
                      {t.exists_on_disk && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> No disco
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>Arquivo: <code className="text-slate-200 font-mono">{t.db_file_name}</code></span>
                      <span>•</span>
                      <span>Tamanho: <strong className="text-emerald-400 font-mono">{t.file_size_formatted}</strong></span>
                      <span>•</span>
                      <span>Tabelas: <strong className="text-slate-300">{t.tables_count} estruturadas</strong></span>
                      <span>•</span>
                      <span>Registros: <strong className="text-slate-300">{t.records_count}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadTenantDb(t.company_id, t.db_file_name)}
                    className="admin-btn-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Baixar arquivo .sqlite exclusivo desta empresa"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Banco (.sqlite)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
