import React, { useState, useEffect } from 'react';
import {
  Printer as PrinterIcon,
  Zap,
  Flame,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Wrench,
  Activity,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Printer } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface PrintersViewProps {
  printers: Printer[];
  onRefreshData: () => void | Promise<void>;
}

export const PrintersView: React.FC<PrintersViewProps> = ({ printers, onRefreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<Printer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-app Notification Feedback Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const [name, setName] = useState('');
  const [printerPowerWatts, setPrinterPowerWatts] = useState(80);
  const [bedHeaterWatts, setBedHeaterWatts] = useState(200);
  const [hourlyDepreciation, setHourlyDepreciation] = useState(0.60);
  const [failureRateDefault, setFailureRateDefault] = useState(10);
  const [status, setStatus] = useState<'available' | 'printing' | 'maintenance'>('available');

  const handleOpenModal = (printer?: Printer) => {
    if (printer) {
      setEditingPrinter(printer);
      setName(printer.name);
      setPrinterPowerWatts(printer.printer_power_watts);
      setBedHeaterWatts(printer.bed_heater_watts);
      setHourlyDepreciation(printer.hourly_depreciation);
      setFailureRateDefault(printer.failure_rate_default);
      setStatus(printer.status);
    } else {
      setEditingPrinter(null);
      setName('');
      setPrinterPowerWatts(80);
      setBedHeaterWatts(200);
      setHourlyDepreciation(0.60);
      setFailureRateDefault(10);
      setStatus('available');
    }
    setShowModal(true);
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'ender3') {
      setName('Creality Ender 3 V3 KE');
      setPrinterPowerWatts(75);
      setBedHeaterWatts(220);
      setHourlyDepreciation(0.60);
      setFailureRateDefault(10);
    } else if (presetName === 'bambu') {
      setName('Bambu Lab P1S Combo');
      setPrinterPowerWatts(90);
      setBedHeaterWatts(260);
      setHourlyDepreciation(1.20);
      setFailureRateDefault(5);
    } else if (presetName === 'prusa') {
      setName('Original Prusa MK4');
      setPrinterPowerWatts(70);
      setBedHeaterWatts(210);
      setHourlyDepreciation(1.00);
      setFailureRateDefault(5);
    } else if (presetName === 'voron') {
      setName('Voron 2.4 (350mm)');
      setPrinterPowerWatts(120);
      setBedHeaterWatts(450);
      setHourlyDepreciation(1.50);
      setFailureRateDefault(8);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        printer_power_watts: Number(printerPowerWatts),
        bed_heater_watts: Number(bedHeaterWatts),
        hourly_depreciation: Number(hourlyDepreciation),
        failure_rate_default: Number(failureRateDefault),
        status,
      };

      let res: globalThis.Response;
      if (editingPrinter) {
        res = await fetch(`/api/printers/${encodeURIComponent(editingPrinter.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/printers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao processar impressora no servidor');
      }

      setShowModal(false);
      setNotification({
        type: 'success',
        message: editingPrinter ? 'Impressora atualizada com sucesso!' : 'Nova impressora adicionada!'
      });
      onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao salvar impressora: ' + (err.message || 'Falha na requisição')
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/printers/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao remover impressora');
      }
      setNotification({
        type: 'success',
        message: `Impressora "${deleteTarget.name}" excluída com sucesso!`
      });
      setDeleteTarget(null);
      await onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Erro ao excluir impressora: ' + (err.message || 'Falha na requisição')
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* In-app Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-fadeIn shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
            aria-label="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PrinterIcon className="w-5 h-5 text-sky-400" />
            Parque de Impressoras 3D & Equipamentos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre a potência da impressora, aquecedor de mesa em Watts e depreciação horária para cálculo exato de custos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Impressora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {printers.map((p) => {
          const totalW = p.printer_power_watts + p.bed_heater_watts;
          const statusColors = {
            available: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
            printing: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
            maintenance: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          };

          const statusLabels = {
            available: 'Disponível',
            printing: 'Em Operação',
            maintenance: 'Manutenção',
          };

          return (
            <div
              key={p.id}
              className="bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 shadow-sm shadow-black/40 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-sm">
                    <PrinterIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <span
                      className={`inline-block text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-xl border mt-1 ${
                        statusColors[p.status] || statusColors.available
                      }`}
                    >
                      {statusLabels[p.status] || p.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(p)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/[0.06] transition"
                    title="Excluir impressora"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Power in Watts Breakdown */}
              <div className="bg-[#0A0A0B]/80 p-3.5 rounded-2xl border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Potência Combinada Total:
                  </span>
                  <span className="font-extrabold text-amber-400 text-sm font-mono">{totalW} Watts</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Bico / Placa / Motores</span>
                    <span className="font-semibold text-white">{p.printer_power_watts} W</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] font-sans">Aquecedor de Mesa (Bed)</span>
                    <span className="font-semibold text-white">{p.bed_heater_watts} W</span>
                  </div>
                </div>
              </div>

              {/* Financial and Failure parameters */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px]">Depreciação Máq.</span>
                  <span className="font-bold text-purple-400 font-mono">R$ {p.hourly_depreciation.toFixed(2)}/h</span>
                </div>

                <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] text-right">
                  <span className="text-slate-400 block text-[10px]">Perda Padrão</span>
                  <span className="font-bold text-rose-400 font-mono">{p.failure_rate_default}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PrinterIcon className="w-5 h-5 text-sky-400" />
              {editingPrinter ? 'Editar Impressora 3D' : 'Cadastrar Impressora 3D'}
            </h3>

            {/* Quick Presets */}
            <div>
              <span className="block text-[11px] text-slate-400 mb-2 font-medium">
                Carregar Predefinição Rápida de Modelo:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('ender3')}
                  className="text-xs font-mono bg-[#0A0A0B] hover:bg-white/[0.06] text-slate-300 py-2 px-2.5 rounded-xl border border-white/[0.08] transition"
                >
                  Ender 3 (295W)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('bambu')}
                  className="text-xs font-mono bg-[#0A0A0B] hover:bg-white/[0.06] text-slate-300 py-2 px-2.5 rounded-xl border border-white/[0.08] transition"
                >
                  Bambu P1S (350W)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('prusa')}
                  className="text-xs font-mono bg-[#0A0A0B] hover:bg-white/[0.06] text-slate-300 py-2 px-2.5 rounded-xl border border-white/[0.08] transition"
                >
                  Prusa MK4 (280W)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('voron')}
                  className="text-xs font-mono bg-[#0A0A0B] hover:bg-white/[0.06] text-slate-300 py-2 px-2.5 rounded-xl border border-white/[0.08] transition"
                >
                  Voron (570W)
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome / Identificação da Máquina</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Bambu Lab P1S"
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Potência da Impressora (Watts)</label>
                  <input
                    type="number"
                    required
                    value={printerPowerWatts}
                    onChange={(e) => setPrinterPowerWatts(Number(e.target.value))}
                    placeholder="Ex: 80"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Bico, cooler e eletrônica</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Potência do Aquecedor de Mesa (Watts)</label>
                  <input
                    type="number"
                    required
                    value={bedHeaterWatts}
                    onChange={(e) => setBedHeaterWatts(Number(e.target.value))}
                    placeholder="Ex: 220"
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Resistência da mesa aquecida</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Depreciação por Hora (R$/h)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={hourlyDepreciation}
                    onChange={(e) => setHourlyDepreciation(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Desgaste de bicos e peças</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Margem de Falha Padrão (%)</label>
                  <input
                    type="number"
                    required
                    value={failureRateDefault}
                    onChange={(e) => setFailureRateDefault(Number(e.target.value))}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Média estimada de perdas</span>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Status Operacional</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="available">Disponível para Imprimir</option>
                    <option value="printing">Em Operação (Imprimindo)</option>
                    <option value="maintenance">Em Manutenção / Calibração</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow transition"
                >
                  Salvar Impressora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Excluir Impressora"
        itemName={deleteTarget?.name}
        message="Tem certeza que deseja remover esta impressora do parque? As especificações de potência e taxa de depreciação calculadas para esta máquina serão excluídas."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
};
