import React, { useState, useEffect } from 'react';
import {
  Printer as PrinterIcon,
  Wifi,
  Cloud,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Weight,
  Thermometer,
  Layers,
  Settings2,
  Terminal,
  X,
  RefreshCw,
  Camera,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { Printer, DirectPrintJobRequest, PrinterBrand } from '../types';
import { PRINTER_BRANDS } from '../data/printerBrands';

interface DirectPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: Printer[];
  filaments?: any[];
  selectedPrinterId?: string;
  selectedFilamentId?: string;
  jobData: {
    job_name?: string;
    modelName?: string;
    product_name?: string;
    file_name?: string;
    estimated_time_minutes?: number;
    printTimeMinutes?: number;
    filament_used_g?: number;
    weightGrams?: number;
    filament_id?: string;
    filament_name?: string;
    total_cost?: number;
    totalCost?: number;
    copies?: number;
    layer_height_mm?: number;
    infill_percent?: number;
    dimensions?: { x: number; y: number; z: number };
  };
  onOpenNetworkDiscovery?: () => void;
  onSuccess?: () => void;
  onPrintDispatched?: () => void;
}

export const DirectPrintModal: React.FC<DirectPrintModalProps> = ({
  isOpen,
  onClose,
  printers,
  filaments,
  selectedPrinterId: initialPrinterId,
  selectedFilamentId: initialFilamentId,
  jobData,
  onOpenNetworkDiscovery,
  onSuccess,
  onPrintDispatched,
}) => {
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(initialPrinterId || '');
  const [connectionMode, setConnectionMode] = useState<'lan' | 'cloud'>('lan');
  const [nozzleTemp, setNozzleTemp] = useState<number>(215);
  const [bedTemp, setBedTemp] = useState<number>(60);
  const [autoStart, setAutoStart] = useState<boolean>(true);
  const [autoBedLevel, setAutoBedLevel] = useState<boolean>(true);
  const [flowCalibration, setFlowCalibration] = useState<boolean>(true);
  const [timelapse, setTimelapse] = useState<boolean>(true);
  const [amsSlot, setAmsSlot] = useState<number>(1);

  // Transmission state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [protocolLogs, setProtocolLogs] = useState<string[]>([]);

  // Choose printer automatically or sync from prop
  useEffect(() => {
    if (initialPrinterId) {
      setSelectedPrinterId(initialPrinterId);
    } else if (isOpen && printers.length > 0 && !selectedPrinterId) {
      const readyPrinter = printers.find(p => p.status === 'available') || printers[0];
      setSelectedPrinterId(readyPrinter.id);
      if (readyPrinter.connection_type) {
        setConnectionMode(readyPrinter.connection_type);
      }
    }
  }, [isOpen, printers, selectedPrinterId, initialPrinterId]);

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId);
  const brandPreset = selectedPrinter?.brand ? PRINTER_BRANDS[selectedPrinter.brand as PrinterBrand] : null;

  useEffect(() => {
    if (selectedPrinter?.connection_type) {
      setConnectionMode(selectedPrinter.connection_type);
    }
  }, [selectedPrinter]);

  if (!isOpen) return null;

  const handleSendDirectPrint = async () => {
    if (!selectedPrinter) {
      setErrorMsg('Selecione uma impressora de destino.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setProtocolLogs([
      `[${new Date().toLocaleTimeString('pt-BR')}] Preparando pacote de impressão direta para ${selectedPrinter.name}...`,
      `[${new Date().toLocaleTimeString('pt-BR')}] Verificando rota via ${connectionMode.toUpperCase()}...`
    ]);

    const effectiveJobName = jobData.job_name || jobData.modelName || jobData.product_name || jobData.file_name || 'Impressão Direta PrintCraft';
    const effectiveTimeMin = Number(jobData.estimated_time_minutes ?? jobData.printTimeMinutes ?? 60);
    const effectiveFilamentG = Number(jobData.filament_used_g ?? jobData.weightGrams ?? 30);
    const effectiveTotalCost = Number(jobData.total_cost ?? jobData.totalCost ?? 0);
    const effectiveCopies = Number(jobData.copies || 1);

    const payload: DirectPrintJobRequest = {
      printer_id: selectedPrinter.id,
      job_name: effectiveJobName,
      product_name: jobData.product_name || jobData.modelName,
      connection_mode: connectionMode,
      file_name: jobData.file_name || `${effectiveJobName.replace(/\s+/g, '_')}.3mf`,
      file_type: '3mf',
      estimated_time_minutes: effectiveTimeMin,
      filament_used_g: effectiveFilamentG,
      filament_id: jobData.filament_id,
      layer_height_mm: jobData.layer_height_mm || 0.2,
      infill_percent: jobData.infill_percent || 20,
      nozzle_temp: nozzleTemp,
      bed_temp: bedTemp,
      auto_start: autoStart,
      auto_bed_level: autoBedLevel,
      flow_calibration: flowCalibration,
      timelapse: timelapse,
      ams_slot: amsSlot,
      total_cost: effectiveTotalCost,
      copies: effectiveCopies,
    };

    try {
      const res = await fetch(`/api/printers/${selectedPrinter.id}/send-direct-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar impressão direta.');

      setProtocolLogs(data.protocol_logs || [
        `[${new Date().toLocaleTimeString('pt-BR')}] Impressão transmitida com sucesso!`,
        `[${new Date().toLocaleTimeString('pt-BR')}] Status da impressora atualizado para "Em Impressão".`
      ]);
      setSendSuccess(true);
      if (onSuccess) onSuccess();
      if (onPrintDispatched) onPrintDispatched();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de comunicação com a impressora.');
    } finally {
      setIsSending(false);
    }
  };

  const effectiveTimeMin = Number(jobData.estimated_time_minutes ?? jobData.printTimeMinutes ?? 0);
  const effectiveFilamentG = Number(jobData.filament_used_g ?? jobData.weightGrams ?? 0);
  const effectiveTotalCost = jobData.total_cost ?? jobData.totalCost;
  const hours = Math.floor(effectiveTimeMin / 60);
  const minutes = Math.round(effectiveTimeMin % 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0F0F13] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.08] bg-gradient-to-r from-emerald-950/40 via-[#121217] to-[#171720]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Envio Direto para Impressora 3D
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LAN / Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispare o trabalho calculado diretamente para a máquina sem precisar de pendrive ou SD card.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Job Summary Banner */}
          <div className="p-4 rounded-2xl bg-[#15151B] border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Trabalho a Imprimir
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {jobData.job_name || jobData.modelName || jobData.product_name || jobData.file_name || 'Modelo Calculado'}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  {hours > 0 ? `${hours}h ` : ''}{minutes}min
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Weight className="w-3.5 h-3.5 text-emerald-400" />
                  {effectiveFilamentG.toFixed(1)}g
                </span>
                {jobData.filament_name && (
                  <>
                    <span>•</span>
                    <span className="text-purple-300 font-medium">
                      {jobData.filament_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {effectiveTotalCost !== undefined && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Custo Total</span>
                <span className="text-base font-extrabold text-emerald-400">
                  R$ {Number(effectiveTotalCost || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Success State */}
          {sendSuccess ? (
            <div className="space-y-4 py-3">
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">
                  Impressão Iniciada com Sucesso!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  O trabalho foi transmitido para <strong>{selectedPrinter?.name}</strong> via <strong>{connectionMode.toUpperCase()}</strong>.
                  Os aquecedores foram acionados para {nozzleTemp}°C no bico e {bedTemp}°C na mesa.
                </p>
              </div>

              {/* Protocol Logs */}
              <div className="rounded-2xl bg-[#09090C] border border-white/[0.08] p-4 font-mono text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[0.06] text-xs text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Log de Comunicação do Protocolo ({selectedPrinter?.brand})</span>
                </div>
                {protocolLogs.map((log, index) => (
                  <div key={index} className="text-emerald-400/90 leading-tight">
                    {log}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition cursor-pointer"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Printer Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <PrinterIcon className="w-3.5 h-3.5 text-sky-400" />
                    Selecione a Impressora de Destino
                  </label>
                  {onOpenNetworkDiscovery && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNetworkDiscovery();
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Wifi className="w-3 h-3" />
                      Buscar na Rede
                    </button>
                  )}
                </div>

                {printers.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#14141A] border border-dashed border-white/[0.1] text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300">
                      Nenhuma impressora cadastrada no sistema.
                    </p>
                    {onOpenNetworkDiscovery && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenNetworkDiscovery();
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition inline-flex items-center gap-2"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        Descobrir Impressoras na Rede Local
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {printers.map(p => {
                      const isSelected = p.id === selectedPrinterId;
                      const brandInfo = p.brand ? PRINTER_BRANDS[p.brand as PrinterBrand] : null;
                      const isBusy = p.status === 'printing';

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPrinterId(p.id)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-sky-500/10 border-sky-500/60 shadow-lg shadow-sky-500/10'
                              : 'bg-[#14141A] border-white/[0.08] hover:border-white/[0.16]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${brandInfo?.badgeClass || 'bg-slate-800 text-slate-300'}`}>
                                {p.brand || 'Outra'}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                isBusy
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {isBusy ? 'Ocupada' : 'Disponível'}
                              </span>
                            </div>

                            <h5 className="text-xs font-bold text-white truncate">
                              {p.name}
                            </h5>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                              {p.connection_type === 'cloud' ? (
                                <span className="flex items-center gap-1 text-purple-300">
                                  <Cloud className="w-3 h-3" /> Cloud {p.device_id ? `(${p.device_id})` : ''}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-sky-300">
                                  <Wifi className="w-3 h-3" /> {p.ip_address || '192.168.1.x'}:{p.port || 80}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.05] text-[10px] text-slate-400">
                            <span>Mesa: {p.bed_size_x || 220}x{p.bed_size_y || 220} mm</span>
                            {isSelected && (
                              <span className="text-sky-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Selecionada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Connection Mode & Route Selector */}
              {selectedPrinter && (
                <div className="p-4 rounded-2xl bg-[#14141A] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                      Canal de Transmissão para {selectedPrinter.brand || 'Impressora'}
                    </span>
                    <div className="flex items-center gap-1 bg-[#0A0A0E] p-0.5 rounded-xl border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setConnectionMode('lan')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                          connectionMode === 'lan'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Wifi className="w-3 h-3" />
                        Rede Local LAN
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectionMode('cloud')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                          connectionMode === 'cloud'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Cloud className="w-3 h-3" />
                        Nuvem Fabricante
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
                    {connectionMode === 'lan' ? (
                      <div className="flex items-center justify-between">
                        <span>Endereço LAN: <strong className="text-white font-mono">{selectedPrinter.ip_address || '192.168.1.108'}:{selectedPrinter.port || 80}</strong></span>
                        <span className="text-sky-400 font-mono">Protocolo: {selectedPrinter.protocol || 'bambu_mqtt'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span>Endpoint Cloud: <strong className="text-white">{selectedPrinter.cloud_endpoint || brandPreset?.cloudDefaultEndpoint || 'Cloud Oficial'}</strong></span>
                        <span className="text-purple-300 font-mono">Device SN: {selectedPrinter.device_id || 'Autenticado'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hardware Execution & Calibration Options */}
              <div className="p-4 rounded-2xl bg-[#14141A] border border-white/[0.08] space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Parâmetros de Disparo e Calibração
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Nozzle Temp */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                      Temp. Bico (°C)
                    </label>
                    <input
                      type="number"
                      value={nozzleTemp}
                      onChange={(e) => setNozzleTemp(Number(e.target.value))}
                      className="w-full bg-[#0A0A0E] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Bed Temp */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                      Temp. Mesa (°C)
                    </label>
                    <input
                      type="number"
                      value={bedTemp}
                      onChange={(e) => setBedTemp(Number(e.target.value))}
                      className="w-full bg-[#0A0A0E] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* AMS Slot */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                      Slot AMS / Material
                    </label>
                    <select
                      value={amsSlot}
                      onChange={(e) => setAmsSlot(Number(e.target.value))}
                      className="w-full bg-[#0A0A0E] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                    >
                      <option value={1}>Slot 1 (Principal)</option>
                      <option value={2}>Slot 2</option>
                      <option value={3}>Slot 3</option>
                      <option value={4}>Slot 4</option>
                    </select>
                  </div>

                  {/* Immediate Start */}
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                      <input
                        type="checkbox"
                        checked={autoStart}
                        onChange={(e) => setAutoStart(e.target.checked)}
                        className="rounded border-white/[0.2] text-sky-500 focus:ring-0 w-4 h-4 bg-[#0A0A0E]"
                      />
                      <span className="text-[11px] font-bold text-white">Auto-iniciar</span>
                    </label>
                  </div>
                </div>

                {/* Additional Toggles */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBedLevel}
                      onChange={(e) => setAutoBedLevel(e.target.checked)}
                      className="rounded border-white/[0.2] text-sky-500 w-3.5 h-3.5 bg-[#0A0A0E]"
                    />
                    <span className="text-[11px]">Nivelamento de Mesa (ABL)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flowCalibration}
                      onChange={(e) => setFlowCalibration(e.target.checked)}
                      className="rounded border-white/[0.2] text-sky-500 w-3.5 h-3.5 bg-[#0A0A0E]"
                    />
                    <span className="text-[11px]">Calibração Dinâmica / MicroLidar</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timelapse}
                      onChange={(e) => setTimelapse(e.target.checked)}
                      className="rounded border-white/[0.2] text-sky-500 w-3.5 h-3.5 bg-[#0A0A0E]"
                    />
                    <span className="text-[11px]">Gravar Timelapse</span>
                  </label>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!sendSuccess && (
          <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0A0A0D] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSendDirectPrint}
              disabled={isSending || !selectedPrinter}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transmitindo Pacote...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    Disparar Impressão Direta ({connectionMode.toUpperCase()})
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
