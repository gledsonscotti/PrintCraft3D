import React, { useState } from 'react';
import {
  Wifi,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus,
  X,
  Server,
  Activity,
  Layers,
  ShieldCheck,
  Check,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import { DiscoveredNetworkPrinter, PrinterBrand } from '../types';
import { PRINTER_BRANDS } from '../data/printerBrands';

interface NetworkDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrinterRegistered: () => void;
  onSelectForManualConfig?: (discovered: DiscoveredNetworkPrinter) => void;
}

export const NetworkDiscoveryModal: React.FC<NetworkDiscoveryModalProps> = ({
  isOpen,
  onClose,
  onPrinterRegistered,
  onSelectForManualConfig,
}) => {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [customIp, setCustomIp] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [devices, setDevices] = useState<DiscoveredNetworkPrinter[]>([]);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartScan = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/printers/scan-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet, scan_depth: 'standard', custom_ip: customIp }),
      });

      if (!res.ok) throw new Error('Falha ao comunicar com o scanner de rede');
      const data = await res.json();

      // Artificial scan delay for realistic radar animation feel
      setTimeout(() => {
        setDevices(data.devices || []);
        setIsScanning(false);
        setHasScanned(true);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar varredura de rede');
      setIsScanning(false);
    }
  };

  const handleRegisterDevice = async (device: DiscoveredNetworkPrinter) => {
    setRegisteringId(device.id);
    setErrorMsg(null);

    const brandPreset = PRINTER_BRANDS[device.brand];
    const modelPreset = brandPreset?.models.find(m => m.model === device.model) || brandPreset?.models[0];

    const payload = {
      name: `${device.brand} ${device.model}`,
      brand: device.brand,
      model: device.model,
      connection_type: device.connection_type || 'lan',
      protocol: device.protocol,
      ip_address: device.ip_address,
      port: device.port,
      api_key: '',
      device_id: device.serial_number || '',
      cloud_endpoint: brandPreset?.cloudDefaultEndpoint || '',
      printer_power_watts: modelPreset?.powerWatts || 100,
      bed_heater_watts: modelPreset?.bedWatts || 250,
      filament_heater_watts: 0,
      hourly_depreciation: modelPreset?.hourlyDepreciation || 0.80,
      failure_rate_default: 8,
      status: 'available',
      online_status: 'online',
      bed_size_x: device.bed_size?.x || 250,
      bed_size_y: device.bed_size?.y || 250,
      bed_size_z: device.bed_size?.z || 250,
      nozzle_diameter: modelPreset?.nozzleDiameter || 0.4,
    };

    try {
      const res = await fetch('/api/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Não foi possível cadastrar a impressora.');

      setRegisteredIds(prev => new Set(prev).add(device.id));
      onPrinterRegistered();
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao salvar impressora');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleTestPing = async (device: DiscoveredNetworkPrinter) => {
    setTestingId(device.id);
    setTestResult(null);

    try {
      const res = await fetch('/api/printers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: device.brand,
          connection_type: 'lan',
          ip_address: device.ip_address,
          port: device.port,
          protocol: device.protocol,
          device_id: device.serial_number,
        }),
      });

      const data = await res.json();
      setTestResult({
        id: device.id,
        success: data.success,
        message: data.status_message || 'Ping bem-sucedido!',
        latency: data.latency_ms,
      });
    } catch (e: any) {
      setTestResult({
        id: device.id,
        success: false,
        message: e.message || 'Sem resposta do host local.',
      });
    } finally {
      setTestingId(null);
    }
  };

  const filteredDevices = devices.filter(d => {
    if (selectedBrandFilter === 'all') return true;
    return d.brand === selectedBrandFilter;
  });

  const availableBrands: PrinterBrand[] = [
    'Bambu Lab',
    'Creality',
    'Prusa Research',
    'Anycubic',
    'Elegoo',
    'Flashforge',
    'Stratasys',
    '3D Systems',
    'EOS',
    'HP'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="discovery-modal-box relative w-full max-w-4xl bg-[#0F0F12] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="discovery-modal-header flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.08] bg-gradient-to-r from-sky-950/40 via-[#121216] to-[#16161D]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="discovery-modal-title text-base font-bold text-white tracking-tight">
                  Varredura de Rede Local (LAN Auto-Discovery)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  mDNS / SSDP / Moonraker / MQTT
                </span>
              </div>
              <p className="discovery-modal-subtitle text-xs text-slate-400 mt-0.5">
                Localização automática de impressoras 3D na sua rede para cadastro imediato.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="discovery-modal-close w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Controls Bar */}
          <div className="discovery-controls-bar bg-[#15151B] border border-white/[0.07] p-4 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">
                  Faixa de IP da Rede (Subnet)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder="192.168.1.0/24"
                    className="discovery-input w-full bg-[#0E0E12] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-1 block flex items-center justify-between">
                  <span>IP Específico / Fixo (Opcional)</span>
                  <span className="text-[9px] text-slate-400 font-normal">Ex: Anycubic Kobra X</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="Deixe em branco para escanear toda a rede ou digite o IP fixo"
                    className="discovery-input w-full bg-[#0E0E12] border border-sky-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 sm:pt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartScan}
                disabled={isScanning}
                className="discovery-btn-scan w-full sm:w-auto bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Buscando Kobra & Rede...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-white" />
                    <span>{hasScanned ? 'Escanear Novamente' : 'Iniciar Varredura'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Supported Brands Preview Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0 mr-1">Marcas:</span>
            <button
              type="button"
              onClick={() => setSelectedBrandFilter('all')}
              className={`discovery-brand-pill px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${
                selectedBrandFilter === 'all'
                  ? 'discovery-brand-pill-active bg-sky-500 text-white font-bold'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
              }`}
            >
              Todas ({devices.length})
            </button>
            {availableBrands.map(brand => {
              const count = devices.filter(d => d.brand === brand).length;
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrandFilter(brand)}
                  className={`discovery-brand-pill px-2.5 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1 cursor-pointer ${
                    selectedBrandFilter === brand
                      ? 'discovery-brand-pill-active bg-sky-500 text-white font-bold'
                      : 'bg-white/[0.05] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{brand}</span>
                  {count > 0 && (
                    <span className="px-1 py-0.2 rounded-full text-[9px] bg-black/40 font-mono font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Radar Scanning Visual State */}
          {isScanning && (
            <div className="discovery-radar-box p-10 border border-sky-500/20 rounded-2xl bg-sky-950/10 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-sky-500/30 animate-ping absolute" />
                <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/50 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/20">
                  <Wifi className="w-8 h-8 animate-bounce" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white tracking-wide">
                Varrendo Faixa {subnet} nas portas 8883, 7125, 80, 8888, 8899, 12345, 8000, 8088, 8443...
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                Identificando protocolos Bambu MQTT, Creality OS, PrusaLink, Moonraker Klipper, FlashPrint, GrabCAD e controladores industriais.
              </p>
            </div>
          )}

          {/* Results List */}
          {!isScanning && hasScanned && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Dispositivos Encontrados ({filteredDevices.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Clique em "Cadastrar" para adicionar ao seu Parque de Impressoras com calibração automática.
                </span>
              </div>

              {filteredDevices.length === 0 ? (
                <div className="p-8 text-center bg-[#15151B] border border-white/[0.06] rounded-2xl text-slate-400 text-xs">
                  Nenhuma impressora encontrada nesta faixa com o filtro selecionado. Tente alterar a faixa de IP.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDevices.map(device => {
                    const brandInfo = PRINTER_BRANDS[device.brand];
                    const isRegistered = device.already_registered || registeredIds.has(device.id);
                    const isCurrentlyRegistering = registeringId === device.id;
                    const isTesting = testingId === device.id;
                    const testInfo = testResult?.id === device.id ? testResult : null;

                    return (
                      <div
                        key={device.id}
                        className="discovery-device-card p-4 rounded-2xl bg-[#14141A] border border-white/[0.08] hover:border-white/[0.15] transition space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          {/* Top row: Brand Badge & Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${brandInfo?.badgeClass || 'bg-slate-800 text-slate-200'}`}>
                              {device.brand}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {device.ping_ms} ms
                              </span>
                              {device.detected_ams && (
                                <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded">
                                  AMS / Multi-Cor
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Model name & Host */}
                          <h4 className="discovery-device-title text-sm font-bold text-white mt-2">
                            {device.model}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{device.ip_address}:{device.port}</span>
                            <span>•</span>
                            <span className="text-slate-400 truncate max-w-[140px]">{device.hostname}</span>
                          </div>

                          {/* Firmware / Protocol */}
                          <div className="discovery-spec-box mt-2.5 p-2 rounded-xl bg-black/40 border border-white/[0.04] text-[10px] space-y-1">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400">Firmware:</span>
                              <span className="font-mono">{device.firmware_version}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400">Volume:</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {device.bed_size.x} x {device.bed_size.y} x {device.bed_size.z} mm
                              </span>
                            </div>
                          </div>

                          {testInfo && (
                            <div className={`mt-2 p-2 rounded-xl text-[10px] flex items-center gap-1.5 ${
                              testInfo.success
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-red-500/10 border border-red-500/30 text-red-300'
                            }`}>
                              {testInfo.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              ) : (
                                <X className="w-3.5 h-3.5 shrink-0 text-red-400" />
                              )}
                              <span className="truncate">{testInfo.message}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => handleTestPing(device)}
                            disabled={isTesting}
                            className="discovery-ping-btn px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-semibold text-slate-300 transition flex items-center gap-1 cursor-pointer"
                            title="Testar resposta de ping e porta"
                          >
                            <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
                            <span>{isTesting ? 'Pingando...' : 'Testar'}</span>
                          </button>

                          {isRegistered ? (
                            <div className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />
                              <span>Cadastrada no Parque</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRegisterDevice(device)}
                              disabled={isCurrentlyRegistering}
                              className="discovery-register-btn flex-1 py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                            >
                              {isCurrentlyRegistering ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Cadastrando...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Cadastrar com 1 Clique</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!hasScanned && !isScanning && (
            <div className="discovery-idle-box p-8 border border-dashed border-white/[0.1] rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.04] flex items-center justify-center text-slate-400">
                <Wifi className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Pronto para escanear a rede local
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clique no botão <strong>"Iniciar Varredura na Rede"</strong> acima. O sistema enviará broadcasts e consultas mDNS/HTTP nas portas de controle dos principais fabricantes (Bambu Lab, Creality, Prusa, Anycubic, Elegoo, Flashforge, Stratasys, 3D Systems, EOS, HP).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="discovery-modal-footer p-4 sm:p-5 border-t border-white/[0.08] bg-[#0A0A0D] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Você também pode cadastrar manualmente com IP estático ou Nuvem a qualquer momento.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="discovery-btn-close px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
