import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Building2,
  Globe,
  Lock,
  Unlock,
  Key
} from 'lucide-react';
import { AppAccessLog } from '../../types';

export const AdminAccessLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AppAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/access-logs?limit=100');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao carregar logs de acesso:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.company_name && log.company_name.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.ip_address && log.ip_address.includes(q));

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Auditoria & Logs de Acesso do App
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[11px] font-bold">
              {logs.length} registros
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Histórico em tempo real de autenticações, bloqueios de segurança, redefinições de senha e alterações cadastrais
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Atualizar Auditoria</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#121215] border border-white/[0.08] p-3.5 rounded-2xl admin-card flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por ação, usuário, empresa, IP ou detalhes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-400 focus:outline-none focus:border-purple-500 transition admin-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#18181D] border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-purple-500 admin-input"
        >
          <option value="all">Status: Todos</option>
          <option value="success">Sucesso</option>
          <option value="warning">Avisos</option>
          <option value="failure">Falhas / Erros</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl overflow-hidden admin-card shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Carregando logs de auditoria...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-white mb-1">Nenhum evento registrado</p>
            <p className="text-xs text-slate-400">
              Nenhum log de acesso corresponde aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs admin-table">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Data / Hora</th>
                  <th className="py-3.5 px-4">Evento / Ação</th>
                  <th className="py-3.5 px-4">Usuário / E-mail</th>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4">Resultado</th>
                  <th className="py-3.5 px-4 sm:px-6">Detalhes Adicionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isWarning = log.status === 'warning';
                  const isFailure = log.status === 'failure';

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(log.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block text-xs">
                          {log.action}
                        </span>
                        {log.ip_address && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Globe className="w-2.5 h-2.5 text-slate-400" />
                            {log.ip_address}
                          </span>
                        )}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        {log.user_name || log.user_email ? (
                          <div>
                            <span className="font-semibold text-slate-200 block">
                              {log.user_name || 'Usuário'}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {log.user_email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sistema / Anônimo</span>
                        )}
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        {log.company_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-slate-300 font-medium truncate max-w-[150px]">
                              {log.company_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Sucesso
                          </span>
                        )}
                        {isWarning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Aviso
                          </span>
                        )}
                        {isFailure && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[10px] border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Falha
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className="text-[11px] text-slate-300 block max-w-xs truncate" title={log.details || ''}>
                          {log.details || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
