import React, { useState } from 'react';
import { History, CheckCircle2, Clock, Scale, DollarSign, Package, Calendar, Printer as PrinterIcon, Filter } from 'lucide-react';
import { PrintJob } from '../types';

interface PrintHistoryViewProps {
  jobs: PrintJob[];
}

type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({ jobs }) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('all');

  // Extract unique printers from jobs
  const printersList = Array.from(new Set(jobs.map(j => j.printer_name))).filter(Boolean);

  // Filter jobs
  const now = new Date();
  const filteredJobs = jobs.filter((job) => {
    const jobDate = new Date(job.created_at);

    // Printer filter
    if (selectedPrinterId !== 'all' && job.printer_name !== selectedPrinterId) {
      return false;
    }

    if (periodFilter === 'daily') {
      return jobDate.toDateString() === now.toDateString();
    } else if (periodFilter === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return jobDate >= oneWeekAgo;
    } else if (periodFilter === 'monthly') {
      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
    } else if (periodFilter === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return jobDate >= start && jobDate <= end;
    }
    return true;
  });

  // Sort newest first
  const sortedJobs = [...filteredJobs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            Histórico de Impressões & Baixas de Estoque
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro das impressões finalizadas com rastreabilidade de filamento consumido por impressora e insumos debitados.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-mono font-semibold bg-[#121215] border border-white/[0.08] text-slate-300 px-3.5 py-2 rounded-2xl shadow-sm">
            {sortedJobs.length} {sortedJobs.length === 1 ? 'registro' : 'registros'} filtrados (Total: {jobs.length})
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-sky-400" /> Período:
          </span>
          <button
            type="button"
            onClick={() => setPeriodFilter('daily')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              periodFilter === 'daily' ? 'bg-sky-500 text-white shadow-sm' : 'bg-[#0A0A0B] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            Diário (Hoje)
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('weekly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              periodFilter === 'weekly' ? 'bg-sky-500 text-white shadow-sm' : 'bg-[#0A0A0B] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            Semanal (7 dias)
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('monthly')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              periodFilter === 'monthly' ? 'bg-sky-500 text-white shadow-sm' : 'bg-[#0A0A0B] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            Mensal (Este Mês)
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              periodFilter === 'custom' ? 'bg-sky-500 text-white shadow-sm' : 'bg-[#0A0A0B] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            Intervalo Personalizado
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              periodFilter === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'bg-[#0A0A0B] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            Todos
          </button>
        </div>

        {/* Printer Filter */}
        <div className="flex items-center gap-2">
          <PrinterIcon className="w-4 h-4 text-slate-400" />
          <select
            value={selectedPrinterId}
            onChange={(e) => setSelectedPrinterId(e.target.value)}
            className="bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">Todas as Impressoras</option>
            {printersList.map((pName) => (
              <option key={pName} value={pName}>{pName}</option>
            ))}
          </select>
        </div>
      </div>

      {periodFilter === 'custom' && (
        <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>
      )}

      {sortedJobs.length === 0 ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-12 text-center text-slate-400 text-xs">
          Nenhuma impressão registrada no período selecionado.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedJobs.map((job) => {
            const dateStr = new Date(job.created_at).toLocaleString('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            });

            let suppliesList: { name: string; qty: number }[] = [];
            try {
              suppliesList = JSON.parse(job.supplies_used_json || '[]');
            } catch (e) {}

            return (
              <div
                key={job.id}
                className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm shadow-black/40 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-xl">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Baixa em Estoque OK
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-xl">
                      <PrinterIcon className="w-3 h-3 text-amber-400" /> {job.printer_name}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                  </div>

                  <h4 className="text-base font-bold text-white flex items-center gap-2.5 flex-wrap">
                    {job.product_name}
                    <span className="text-xs font-mono font-medium text-slate-300 bg-[#0A0A0B] px-2.5 py-0.5 rounded-xl border border-white/[0.08]">
                      Lote de {job.quantity} {job.quantity === 1 ? 'unidade' : 'unidades'}
                    </span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>
                      Filamento: <strong className="text-white">{job.filament_name}</strong>
                    </span>
                  </div>

                  {suppliesList.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <Package className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Insumos utilizados:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {suppliesList.map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-[#0A0A0B] text-slate-300 px-2 py-0.5 rounded-xl border border-white/[0.08] font-mono"
                          >
                            {s.qty * job.quantity}x {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/[0.08] pt-3 md:pt-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Filamento Gasto</span>
                    <span className="text-sm font-bold text-sky-400 font-mono">{Number(job.filament_used_g || 0).toFixed(1)} g</span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Tempo Total</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {Math.floor((job.total_time_minutes || 0) / 60)}h {(job.total_time_minutes || 0) % 60}m
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Custo Total</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      R$ {Number(job.total_cost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
