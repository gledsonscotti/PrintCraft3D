import React from 'react';
import { History, CheckCircle2, Clock, Scale, DollarSign, Package } from 'lucide-react';
import { PrintJob } from '../types';

interface PrintHistoryViewProps {
  jobs: PrintJob[];
}

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({ jobs }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            Histórico de Impressões & Baixas de Estoque
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro das impressões finalizadas com rastreabilidade de filamento consumido e insumos debitados do SQLite.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold bg-[#121215] border border-white/[0.08] text-slate-300 px-3.5 py-1.5 rounded-2xl w-fit shadow-sm">
          {jobs.length} impressões registradas
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-12 text-center text-slate-400 text-xs">
          Nenhuma impressão registrada no histórico ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
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
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-xl">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Baixa em Estoque OK
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{dateStr}</span>
                  </div>

                  <h4 className="text-base font-bold text-white flex items-center gap-2.5">
                    {job.product_name}
                    <span className="text-xs font-mono font-medium text-slate-300 bg-[#0A0A0B] px-2.5 py-0.5 rounded-xl border border-white/[0.08]">
                      Lote de {job.quantity} {job.quantity === 1 ? 'unidade' : 'unidades'}
                    </span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>
                      Impressora: <strong className="text-white">{job.printer_name}</strong>
                    </span>
                    <span className="text-white/20">•</span>
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
                    <span className="text-sm font-bold text-sky-400 font-mono">{job.filament_used_g.toFixed(1)} g</span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Tempo Total</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {Math.floor(job.total_time_minutes / 60)}h {job.total_time_minutes % 60}m
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Custo Total</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      R$ {job.total_cost.toFixed(2)}
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
