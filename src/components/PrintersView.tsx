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
  AlertTriangle,
  HelpCircle,
  Cpu,
  Thermometer,
  Calendar,
  ShieldAlert,
  Clock,
  Wifi,
  Cloud,
  Layers,
  Search,
  Check,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Printer, AmsHeater, PrinterMaintenance, MaintenanceType, MaintenanceStatus, MaintenanceSeverity, PrinterBrand, PrinterProtocol } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { NetworkDiscoveryModal } from './NetworkDiscoveryModal';
import { PRINTER_BRANDS } from '../data/printerBrands';

interface PrintersViewProps {
  printers: Printer[];
  onRefreshData: () => void | Promise<void>;
}

export const PrintersView: React.FC<PrintersViewProps> = ({ printers, onRefreshData }) => {
  const [subTab, setSubTab] = useState<'printers' | 'ams_heaters' | 'maintenance'>('printers');

  // AMS & Heaters State
  const [amsHeaters, setAmsHeaters] = useState<AmsHeater[]>([]);
  const [loadingAms, setLoadingAms] = useState(false);
  const [showAmsModal, setShowAmsModal] = useState(false);
  const [editingAms, setEditingAms] = useState<AmsHeater | null>(null);
  const [deleteTargetAms, setDeleteTargetAms] = useState<AmsHeater | null>(null);

  // AMS Form State
  const [amsName, setAmsName] = useState('');
  const [amsPrinterId, setAmsPrinterId] = useState<string>('');
  const [amsType, setAmsType] = useState<'ams' | 'heater' | 'drybox' | 'multi_feeder'>('ams');
  const [amsSlots, setAmsSlots] = useState(4);
  const [amsPower, setAmsPower] = useState(25);
  const [amsStatus, setAmsStatus] = useState<'active' | 'maintenance' | 'inactive'>('active');
  const [amsNotes, setAmsNotes] = useState('');

  // Maintenance Records State
  const [maintenanceRecords, setMaintenanceRecords] = useState<PrinterMaintenance[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [showMntModal, setShowMntModal] = useState(false);
  const [editingMnt, setEditingMnt] = useState<PrinterMaintenance | null>(null);
  const [deleteTargetMnt, setDeleteTargetMnt] = useState<PrinterMaintenance | null>(null);

  // Maintenance Form State
  const [mntPrinterId, setMntPrinterId] = useState<string>('');
  const [mntType, setMntType] = useState<MaintenanceType>('preventiva');
  const [mntTitle, setMntTitle] = useState('');
  const [mntDescription, setMntDescription] = useState('');
  const [mntStartDate, setMntStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [mntEndDate, setMntEndDate] = useState('');
  const [mntStatus, setMntStatus] = useState<MaintenanceStatus>('scheduled');
  const [mntSeverity, setMntSeverity] = useState<MaintenanceSeverity>('normal');
  const [mntTechnician, setMntTechnician] = useState('');

  // Printer Modal State
  const [showModal, setShowModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Printer | null>(null);

  // Printer Form State (Technical, Brand, and Connectivity)
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<PrinterBrand>('Outra');
  const [model, setModel] = useState('');
  const [connectionType, setConnectionType] = useState<'lan' | 'cloud'>('lan');
  const [protocol, setProtocol] = useState<PrinterProtocol>('moonraker_klipper');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState(80);
  const [apiKey, setApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [cloudEndpoint, setCloudEndpoint] = useState('');
  const [cameraStreamUrl, setCameraStreamUrl] = useState('');
  const [bedSizeX, setBedSizeX] = useState(220);
  const [bedSizeY, setBedSizeY] = useState(220);
  const [bedSizeZ, setBedSizeZ] = useState(250);
  const [nozzleDiameter, setNozzleDiameter] = useState(0.4);

  const [printerPowerWatts, setPrinterPowerWatts] = useState(80);
  const [bedHeaterWatts, setBedHeaterWatts] = useState(200);
  const [hourlyDepreciation, setHourlyDepreciation] = useState(0.60);
  const [failureRateDefault, setFailureRateDefault] = useState(10);
  const [status, setStatus] = useState<'available' | 'printing' | 'maintenance'>('available');

  // Modal Connection Test state
  const [isTestingModalConn, setIsTestingModalConn] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Card Live Connection Ping states
  const [testingCardId, setTestingCardId] = useState<string | null>(null);
  const [cardTestResults, setCardTestResults] = useState<Record<string, { success: boolean; latency?: number; message: string }>>({});

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const fetchAmsHeaters = async () => {
    try {
      setLoadingAms(true);
      const res = await fetch('/api/ams-heaters');
      if (res.ok) {
        const data = await res.json();
        setAmsHeaters(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar AMS/Aquecedores:', e);
    } finally {
      setLoadingAms(false);
    }
  };

  const fetchMaintenance = async () => {
    try {
      setLoadingMaintenance(true);
      const res = await fetch('/api/printer-maintenance');
      if (res.ok) {
        const data = await res.json();
        setMaintenanceRecords(data);
      }
    } catch (e) {
      console.warn('Erro ao buscar manutenções:', e);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  useEffect(() => {
    fetchAmsHeaters();
    fetchMaintenance();
  }, []);

  // When changing brand, auto-suggest defaults
  const handleSelectBrand = (newBrand: PrinterBrand) => {
    setBrand(newBrand);
    const preset = PRINTER_BRANDS[newBrand];
    if (preset) {
      const defaultModel = preset.models[0];
      if (defaultModel) {
        if (!editingPrinter || !model) {
          setModel(defaultModel.model);
          setName(`${newBrand} ${defaultModel.model}`);
        }
        setBedSizeX(defaultModel.bedSize.x);
        setBedSizeY(defaultModel.bedSize.y);
        setBedSizeZ(defaultModel.bedSize.z);
        setNozzleDiameter(defaultModel.nozzleDiameter);
        setPrinterPowerWatts(defaultModel.powerWatts);
        setBedHeaterWatts(defaultModel.bedWatts);
        setHourlyDepreciation(defaultModel.hourlyDepreciation);
        setProtocol(defaultModel.defaultProtocol);
        setPort(defaultModel.defaultLanPort);
      }
      if (preset.cloudDefaultEndpoint && !cloudEndpoint) {
        setCloudEndpoint(preset.cloudDefaultEndpoint);
      }
    }
    setModalTestResult(null);
  };

  const handleSelectModel = (modelName: string) => {
    setModel(modelName);
    const preset = PRINTER_BRANDS[brand];
    if (preset) {
      const found = preset.models.find(m => m.model === modelName);
      if (found) {
        setName(`${brand} ${found.model}`);
        setBedSizeX(found.bedSize.x);
        setBedSizeY(found.bedSize.y);
        setBedSizeZ(found.bedSize.z);
        setNozzleDiameter(found.nozzleDiameter);
        setPrinterPowerWatts(found.powerWatts);
        setBedHeaterWatts(found.bedWatts);
        setHourlyDepreciation(found.hourlyDepreciation);
      }
    }
  };

  // Test connection within modal
  const handleTestModalConnection = async () => {
    setIsTestingModalConn(true);
    setModalTestResult(null);
    try {
      const res = await fetch('/api/printers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          connection_type: connectionType,
          ip_address: ipAddress,
          port: Number(port),
          protocol,
          api_key: apiKey,
          device_id: deviceId,
          cloud_endpoint: cloudEndpoint
        }),
      });
      const data = await res.json();
      setModalTestResult({
        success: data.success,
        message: data.status_message || 'Conexão confirmada com sucesso!',
        latency: data.latency_ms
      });
    } catch (e: any) {
      setModalTestResult({
        success: false,
        message: e.message || 'Falha ao conectar com o endpoint especificado.'
      });
    } finally {
      setIsTestingModalConn(false);
    }
  };

  // Live test connection from card
  const handleTestCardConnection = async (printer: Printer) => {
    setTestingCardId(printer.id);
    try {
      const res = await fetch('/api/printers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: printer.brand || 'Outra',
          connection_type: printer.connection_type || 'lan',
          ip_address: printer.ip_address || '192.168.1.100',
          port: printer.port || 80,
          protocol: printer.protocol,
          api_key: printer.api_key,
          device_id: printer.device_id,
          cloud_endpoint: printer.cloud_endpoint
        }),
      });
      const data = await res.json();
      setCardTestResults(prev => ({
        ...prev,
        [printer.id]: {
          success: data.success,
          latency: data.latency_ms,
          message: data.status_message || 'Online'
        }
      }));
    } catch (e: any) {
      setCardTestResults(prev => ({
        ...prev,
        [printer.id]: {
          success: false,
          message: 'Sem resposta'
        }
      }));
    } finally {
      setTestingCardId(null);
    }
  };

  // Printer Handlers
  const handleOpenModal = (printer?: Printer) => {
    setModalTestResult(null);
    if (printer) {
      setEditingPrinter(printer);
      setName(printer.name);
      setBrand((printer.brand as PrinterBrand) || 'Outra');
      setModel(printer.model || '');
      setConnectionType(printer.connection_type || 'lan');
      setProtocol(printer.protocol || 'moonraker_klipper');
      setIpAddress(printer.ip_address || '');
      setPort(printer.port || 80);
      setApiKey(printer.api_key || '');
      setDeviceId(printer.device_id || '');
      setCloudEndpoint(printer.cloud_endpoint || '');
      setCameraStreamUrl(printer.camera_stream_url || '');
      setBedSizeX(printer.bed_size_x || 220);
      setBedSizeY(printer.bed_size_y || 220);
      setBedSizeZ(printer.bed_size_z || 250);
      setNozzleDiameter(printer.nozzle_diameter || 0.4);
      setPrinterPowerWatts(printer.printer_power_watts);
      setBedHeaterWatts(printer.bed_heater_watts);
      setHourlyDepreciation(printer.hourly_depreciation);
      setFailureRateDefault(printer.failure_rate_default);
      setStatus(printer.status);
    } else {
      setEditingPrinter(null);
      setName('Bambu Lab X1-Carbon');
      setBrand('Bambu Lab');
      setModel('X1-Carbon');
      setConnectionType('lan');
      setProtocol('bambu_mqtt');
      setIpAddress('192.168.1.108');
      setPort(8883);
      setApiKey('');
      setDeviceId('');
      setCloudEndpoint('https://api.bambulab.com');
      setCameraStreamUrl('');
      setBedSizeX(256);
      setBedSizeY(256);
      setBedSizeZ(256);
      setNozzleDiameter(0.4);
      setPrinterPowerWatts(100);
      setBedHeaterWatts(250);
      setHourlyDepreciation(0.80);
      setFailureRateDefault(8);
      setStatus('available');
    }
    setShowModal(true);
  };

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        brand,
        model,
        connection_type: connectionType,
        protocol,
        ip_address: ipAddress,
        port: Number(port) || 80,
        api_key: apiKey,
        device_id: deviceId,
        cloud_endpoint: cloudEndpoint,
        camera_stream_url: cameraStreamUrl,
        bed_size_x: Number(bedSizeX) || 220,
        bed_size_y: Number(bedSizeY) || 220,
        bed_size_z: Number(bedSizeZ) || 250,
        nozzle_diameter: Number(nozzleDiameter) || 0.4,
        printer_power_watts: Number(printerPowerWatts),
        bed_heater_watts: Number(bedHeaterWatts),
        filament_heater_watts: 0,
        hourly_depreciation: Number(hourlyDepreciation),
        failure_rate_default: Number(failureRateDefault),
        status,
        online_status: 'online'
      };

      let res;
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

      if (!res.ok) throw new Error('Falha ao salvar impressora');

      setShowModal(false);
      setNotification({
        type: 'success',
        message: editingPrinter ? 'Impressora atualizada com sucesso!' : 'Nova impressora cadastrada!'
      });
      onRefreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao salvar' });
    }
  };

  const handleDeletePrinter = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/printers/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir impressora');
      setNotification({ type: 'success', message: 'Impressora excluída com sucesso!' });
      setDeleteTarget(null);
      onRefreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // AMS / Heaters Handlers
  const handleOpenAmsModal = (item?: AmsHeater) => {
    if (item) {
      setEditingAms(item);
      setAmsName(item.name);
      setAmsPrinterId(item.printer_id || '');
      setAmsType(item.type);
      setAmsSlots(item.slots_count);
      setAmsPower(item.power_watts);
      setAmsStatus(item.status);
      setAmsNotes(item.notes || '');
    } else {
      setEditingAms(null);
      setAmsName('');
      setAmsPrinterId(printers[0]?.id || '');
      setAmsType('ams');
      setAmsSlots(4);
      setAmsPower(25);
      setAmsStatus('active');
      setAmsNotes('');
    }
    setShowAmsModal(true);
  };

  const handleSaveAms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        printer_id: amsPrinterId || null,
        name: amsName,
        type: amsType,
        slots_count: Number(amsSlots),
        power_watts: Number(amsPower),
        status: amsStatus,
        notes: amsNotes
      };

      let res;
      if (editingAms) {
        res = await fetch(`/api/ams-heaters/${encodeURIComponent(editingAms.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/ams-heaters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Falha ao salvar AMS / Aquecedor');

      setShowAmsModal(false);
      setNotification({
        type: 'success',
        message: editingAms ? 'Equipamento atualizado com sucesso!' : 'Novo AMS / Aquecedor cadastrado!'
      });
      fetchAmsHeaters();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao salvar' });
    }
  };

  const handleDeleteAms = async () => {
    if (!deleteTargetAms) return;
    try {
      const res = await fetch(`/api/ams-heaters/${encodeURIComponent(deleteTargetAms.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      setNotification({ type: 'success', message: 'Item excluído com sucesso!' });
      setDeleteTargetAms(null);
      fetchAmsHeaters();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  // Maintenance Handlers
  const handleOpenMntModal = (record?: PrinterMaintenance) => {
    if (record) {
      setEditingMnt(record);
      setMntPrinterId(record.printer_id);
      setMntType(record.maintenance_type);
      setMntTitle(record.title);
      setMntDescription(record.description || '');
      setMntStartDate(record.start_date);
      setMntEndDate(record.end_date || '');
      setMntStatus(record.status);
      setMntSeverity(record.severity);
      setMntTechnician(record.technician || '');
    } else {
      setEditingMnt(null);
      setMntPrinterId(printers[0]?.id || '');
      setMntType('preventiva');
      setMntTitle('');
      setMntDescription('');
      setMntStartDate(new Date().toISOString().slice(0, 16));
      setMntEndDate('');
      setMntStatus('scheduled');
      setMntSeverity('normal');
      setMntTechnician('');
    }
    setShowMntModal(true);
  };

  const handleSaveMnt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        printer_id: mntPrinterId,
        maintenance_type: mntType,
        title: mntTitle,
        description: mntDescription,
        start_date: mntStartDate,
        end_date: mntEndDate || null,
        status: mntStatus,
        severity: mntSeverity,
        technician: mntTechnician
      };

      let res;
      if (editingMnt) {
        res = await fetch(`/api/printer-maintenance/${encodeURIComponent(editingMnt.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/printer-maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Falha ao salvar manutenção');
      }

      setShowMntModal(false);
      setNotification({
        type: 'success',
        message: editingMnt ? 'Manutenção atualizada com sucesso!' : 'Manutenção cadastrada! Impressora bloqueada para novos cadastros de produção.'
      });
      fetchMaintenance();
      onRefreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao salvar manutenção' });
    }
  };

  const handleDeleteMnt = async () => {
    if (!deleteTargetMnt) return;
    try {
      const res = await fetch(`/api/printer-maintenance/${encodeURIComponent(deleteTargetMnt.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir manutenção');
      setNotification({ type: 'success', message: 'Registro de manutenção removido.' });
      setDeleteTargetMnt(null);
      fetchMaintenance();
      onRefreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const activeMaintenanceCount = maintenanceRecords.filter(m => m.status === 'scheduled' || m.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg backdrop-blur-md ${
          notification.type === 'success'
            ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/70 border border-rose-500/50 text-rose-200'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Sub-Tabs Header */}
      <div className="printers-subtabs-bar flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121215] border border-white/[0.08] p-4 sm:p-5 rounded-3xl">
        <div className="printers-subtabs-inner flex items-center gap-2 bg-[#1a1a20] p-1.5 rounded-2xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setSubTab('printers')}
            className={`printers-subtab-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'printers'
                ? 'printers-subtab-active bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <PrinterIcon className="w-4 h-4" />
            Impressoras 3D
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">{printers.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('ams_heaters')}
            className={`printers-subtab-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'ams_heaters'
                ? 'printers-subtab-active bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            AMS & Aquecedores
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">{amsHeaters.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('maintenance')}
            className={`printers-subtab-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer relative ${
              subTab === 'maintenance'
                ? 'printers-subtab-active bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Alertas e Manutenção
            {activeMaintenanceCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold flex items-center justify-center shadow">
                {activeMaintenanceCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'printers' && (
            <>
              <button
                type="button"
                onClick={() => setShowDiscoveryModal(true)}
                className="printer-scan-btn bg-[#1e1e24] hover:bg-[#282830] text-sky-400 border border-sky-500/30 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
                title="Escanear a rede local em busca de impressoras 3D automáticas"
              >
                <Wifi className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>Varredura de Rede (LAN)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="printer-new-btn bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-sky-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Impressora
              </button>
            </>
          )}
          {subTab === 'ams_heaters' && (
            <button
              type="button"
              onClick={() => handleOpenAmsModal()}
              className="printer-new-btn bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar AMS / Aquecedor
            </button>
          )}
          {subTab === 'maintenance' && (
            <button
              type="button"
              onClick={() => handleOpenMntModal()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Wrench className="w-4 h-4" /> Registrar Manutenção
            </button>
          )}
        </div>
      </div>

      {/* GUIA 1: IMPRESSORAS 3D */}
      {subTab === 'printers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {printers.length === 0 ? (
            <div className="printer-empty-box col-span-full py-16 text-center border border-dashed border-white/[0.1] rounded-3xl bg-[#121215]/50 space-y-4">
              <PrinterIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="printer-empty-title text-sm font-semibold text-slate-300">Nenhuma impressora 3D cadastrada.</p>
                <p className="printer-empty-desc text-xs text-slate-500 max-w-md mx-auto">
                  Você pode escanear automaticamente sua rede Wi-Fi/Ethernet ou adicionar manualmente seu equipamento Bambu Lab, Creality, Prusa, etc.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(true)}
                  className="printer-scan-btn px-4 py-2 rounded-2xl text-xs font-bold bg-[#1e1e24] text-sky-400 border border-sky-500/30 hover:bg-sky-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Wifi className="w-3.5 h-3.5" /> Escanear na Rede Local
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="printer-new-btn px-4 py-2 rounded-2xl text-xs font-bold bg-sky-500 text-white hover:bg-sky-400 flex items-center gap-2 shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastro Manual
                </button>
              </div>
            </div>
          ) : (
            printers.map((p) => {
              const inMaintenance = p.status === 'maintenance';
              const cardTest = cardTestResults[p.id];
              const isPinging = testingCardId === p.id;
              const brandInfo = p.brand && PRINTER_BRANDS[p.brand as PrinterBrand] ? PRINTER_BRANDS[p.brand as PrinterBrand] : null;

              return (
                <div
                  key={p.id}
                  className={`printer-card bg-[#121215] border rounded-3xl p-5 space-y-4 transition flex flex-col justify-between ${
                    inMaintenance ? 'printer-card-maintenance border-rose-500/50 bg-rose-950/10' : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.brand && (
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: brandInfo ? `${brandInfo.color}18` : '#38bdf818',
                                color: brandInfo ? brandInfo.color : '#38bdf8',
                                border: `1px solid ${brandInfo ? `${brandInfo.color}35` : '#38bdf835'}`
                              }}
                            >
                              {p.brand}
                            </span>
                          )}
                          {p.connection_type === 'cloud' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <Cloud className="w-2.5 h-2.5" /> Cloud
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Wifi className="w-2.5 h-2.5" /> LAN
                            </span>
                          )}
                        </div>

                        <h3 className="printer-card-title text-sm font-bold text-white flex items-center gap-2">
                          <PrinterIcon className={`w-4 h-4 ${inMaintenance ? 'text-rose-400' : 'text-sky-400'}`} />
                          {p.name}
                        </h3>

                        <div className="flex items-center gap-2 pt-0.5">
                          {p.status === 'available' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Disponível
                            </span>
                          )}
                          {p.status === 'printing' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <Activity className="w-2.5 h-2.5 animate-pulse" /> Imprimindo
                            </span>
                          )}
                          {inMaintenance && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <ShieldAlert className="w-2.5 h-2.5" /> Manutenção
                            </span>
                          )}

                          {/* Network connection indicator */}
                          {p.ip_address && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              • {p.ip_address}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(p)}
                          className="printer-card-action-btn p-1.5 text-slate-400 hover:text-white transition rounded-xl hover:bg-white/[0.05]"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="printer-card-action-btn p-1.5 text-slate-400 hover:text-rose-400 transition rounded-xl hover:bg-rose-500/10 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {inMaintenance && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-[11px] text-rose-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>Regra de Produção: Esta máquina está em manutenção. Novas OPs estão bloqueadas para este equipamento.</span>
                      </div>
                    )}

                    {/* Dimensions and Specs badge */}
                    {(p.bed_size_x || p.nozzle_diameter) && (
                      <div className="printer-card-spec flex items-center justify-between text-[11px] text-slate-400 bg-[#16161a] px-3 py-1.5 rounded-xl border border-white/[0.04]">
                        <span>Volume Útil:</span>
                        <span className="printer-card-spec-val font-mono text-white font-medium">
                          {p.bed_size_x || 220} × {p.bed_size_y || 220} × {p.bed_size_z || 250} mm
                          {p.nozzle_diameter && ` • Bico ${p.nozzle_diameter}mm`}
                        </span>
                      </div>
                    )}

                    {/* Test connection result bar */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleTestCardConnection(p)}
                        disabled={isPinging}
                        className="printer-card-ping-btn text-[11px] font-semibold text-slate-300 hover:text-sky-400 flex items-center gap-1.5 bg-[#18181c] px-2.5 py-1 rounded-xl border border-white/[0.06] hover:border-sky-500/30 transition disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 text-sky-400 ${isPinging ? 'animate-spin' : ''}`} />
                        <span>{isPinging ? 'Testando...' : 'Testar Conexão'}</span>
                      </button>

                      {cardTest && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          cardTest.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cardTest.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {cardTest.latency ? `${cardTest.latency}ms` : cardTest.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="printer-card-stats grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-300">
                    <div className="printer-card-stat-box bg-[#18181c] p-2.5 rounded-2xl border border-white/[0.04]">
                      <span className="printer-card-stat-label text-[10px] text-slate-500 block">Potência Total</span>
                      <strong className="text-white flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-amber-400" /> {p.total_power_watts}W
                      </strong>
                    </div>
                    <div className="printer-card-stat-box bg-[#18181c] p-2.5 rounded-2xl border border-white/[0.04]">
                      <span className="printer-card-stat-label text-[10px] text-slate-500 block">Depreciação</span>
                      <strong className="printer-card-deprec text-emerald-400 mt-0.5 block">
                        R$ {Number(p.hourly_depreciation || 0).toFixed(2)}/h
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* GUIA 2: AMS & AQUECEDORES */}
      {subTab === 'ams_heaters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {amsHeaters.length === 0 ? (
            <div className="printer-empty-box col-span-full py-16 text-center border border-dashed border-white/[0.1] rounded-3xl bg-[#121215]/50 space-y-3">
              <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="printer-empty-desc text-xs text-slate-400">Nenhum AMS ou aquecedor de filamento cadastrado.</p>
              <button
                type="button"
                onClick={() => handleOpenAmsModal()}
                className="text-sky-400 text-xs font-semibold hover:underline cursor-pointer"
              >
                + Cadastrar AMS / Aquecedor
              </button>
            </div>
          ) : (
            amsHeaters.map((item) => (
              <div
                key={item.id}
                className="printer-card bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-5 space-y-4 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {item.type === 'ams' ? <Cpu className="w-4 h-4" /> : <Thermometer className="w-4 h-4 text-amber-400" />}
                        </span>
                        <div>
                          <h3 className="printer-card-title text-sm font-bold text-white">{item.name}</h3>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">
                            {item.type === 'ams' ? 'Sistema AMS (Multi-cor)' : item.type === 'drybox' ? 'Dry Box / Estufa' : 'Aquecedor de Filamento'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAmsModal(item)}
                        className="printer-card-action-btn p-1.5 text-slate-400 hover:text-white transition rounded-xl hover:bg-white/[0.05]"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetAms(item)}
                        className="printer-card-action-btn p-1.5 text-slate-400 hover:text-rose-400 transition rounded-xl hover:bg-rose-500/10 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.printer_name && (
                    <div className="printer-card-spec text-xs text-slate-300 bg-[#18181c] px-3 py-2 rounded-2xl border border-white/[0.04] flex items-center gap-2">
                      <PrinterIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Vinculado a: <strong className="printer-card-spec-val text-white">{item.printer_name}</strong></span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-xs text-slate-400 line-clamp-2">{item.notes}</p>
                  )}
                </div>

                <div className="printer-card-stats grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-300">
                  <div className="printer-card-stat-box bg-[#18181c] p-2 rounded-xl border border-white/[0.04]">
                    <span className="printer-card-stat-label text-[9px] text-slate-500 block">Capacidade</span>
                    <strong className="text-white">{item.slots_count} rolos/slots</strong>
                  </div>
                  <div className="printer-card-stat-box bg-[#18181c] p-2 rounded-xl border border-white/[0.04]">
                    <span className="printer-card-stat-label text-[9px] text-slate-500 block">Potência</span>
                    <strong className="text-amber-400">{item.power_watts}W</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* GUIA 3: ALERTAS E MANUTENÇÃO */}
      {subTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-3xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-200">Regra de Bloqueio de Produção por Manutenção</h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Durante o período de manutenção agendada ou em andamento, a impressora correspondente é automaticamente bloqueada pelo sistema e <strong>não pode ser selecionada para novos cadastros de produção (OPs)</strong> até que a manutenção seja concluída e resolvida.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {maintenanceRecords.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/[0.1] rounded-3xl bg-[#121215]/50 space-y-3">
                <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Nenhum registro de manutenção ou alerta cadastrado.</p>
                <button
                  type="button"
                  onClick={() => handleOpenMntModal()}
                  className="text-amber-400 text-xs font-semibold hover:underline"
                >
                  + Agendar primeira manutenção
                </button>
              </div>
            ) : (
              maintenanceRecords.map((m) => {
                const isActive = m.status === 'scheduled' || m.status === 'in_progress';
                return (
                  <div
                    key={m.id}
                    className={`bg-[#121215] border rounded-3xl p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isActive ? 'border-amber-500/40 bg-amber-950/10' : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          m.severity === 'urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          m.severity === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                        }`}>
                          {m.severity === 'urgent' ? 'Urgente' : m.severity === 'high' ? 'Alta' : 'Normal'}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          m.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {m.status === 'resolved' ? '✓ Resolvida' : m.status === 'in_progress' ? '⚡ Em Andamento' : '📅 Agendada'}
                        </span>

                        <span className="text-xs font-mono text-slate-400 bg-black/30 px-2.5 py-0.5 rounded-lg">
                          Tipo: {m.maintenance_type.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <PrinterIcon className="w-4 h-4 text-sky-400" />
                          {m.printer_name} — {m.title}
                        </h3>
                        {m.description && (
                          <p className="text-xs text-slate-400 mt-1">{m.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" /> Início: {m.start_date}
                        </span>
                        {m.technician && (
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-sky-400" /> Resp.: {m.technician}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenMntModal(m)}
                        className="px-3.5 py-2 rounded-xl bg-[#222228] hover:bg-[#2b2b33] text-white text-xs font-semibold border border-white/[0.08] transition"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetMnt(m)}
                        className="p-2 text-slate-400 hover:text-rose-400 bg-[#222228] hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Impressora */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="printer-modal-box bg-[#16161a] border border-white/[0.12] rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="printer-modal-header flex items-center justify-between border-b border-white/[0.08] pb-4 px-1 -mx-6 -mt-6 p-6 rounded-t-3xl bg-[#121215]">
              <div>
                <h3 className="printer-modal-title text-base font-bold text-white flex items-center gap-2">
                  <PrinterIcon className="w-5 h-5 text-sky-400" />
                  {editingPrinter ? 'Editar Impressora 3D' : 'Cadastrar Impressora 3D (Manual ou Rede)'}
                </h3>
                <p className="printer-modal-subtitle text-xs text-slate-400 mt-0.5">
                  Configure os parâmetros técnicos, marca e conexão LAN/Cloud para envio direto de impressões.
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="printer-modal-close text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrinter} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Seleção de Marca com Predefinições */}
              <div className="space-y-2">
                <label className="printer-modal-label text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Marca do Equipamento</span>
                  <span className="printer-modal-label-sub text-[11px] text-sky-400 font-normal">Preenche protocolos e tamanhos automaticamente</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {(Object.keys(PRINTER_BRANDS) as PrinterBrand[]).map((b) => {
                    const info = PRINTER_BRANDS[b];
                    const isSelected = brand === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleSelectBrand(b)}
                        className={`printer-brand-btn p-2 rounded-xl text-xs font-semibold border transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'printer-brand-btn-active bg-sky-500/20 border-sky-400 text-white shadow-sm shadow-sky-500/20'
                            : 'bg-[#18181c] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <span className="truncate w-full text-[11px]">{info.displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modelo Predefinido ou Livre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="printer-modal-label text-xs font-semibold text-slate-300">Modelos Sugeridos ({brand})</label>
                  <select
                    value={model}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    className="printer-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
                  >
                    <option value="">-- Selecionar modelo predefinido --</option>
                    {PRINTER_BRANDS[brand]?.models.map((m) => (
                      <option key={m.model} value={m.model}>
                        {m.model} ({m.bedSize.x}x{m.bedSize.y}x{m.bedSize.z}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="printer-modal-label text-xs font-semibold text-slate-300">Nome de Identificação da Máquina *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bambu Lab X1C - Setor 01"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Conexão e Protocolo */}
              <div className="printer-modal-section p-3.5 bg-[#121216] border border-white/[0.06] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="printer-modal-section-title text-xs font-bold text-white flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-sky-400" />
                    Parâmetros de Conexão e Protocolo
                  </span>
                  <div className="printer-conn-toggle-bar flex items-center gap-1 bg-[#1a1a20] p-1 rounded-xl border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setConnectionType('lan')}
                      className={`printer-conn-btn px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        connectionType === 'lan'
                          ? 'printer-conn-btn-active bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Wifi className="w-3 h-3" /> LAN (Rede Local)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionType('cloud')}
                      className={`printer-conn-btn px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        connectionType === 'cloud'
                          ? 'printer-conn-btn-active bg-indigo-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Cloud className="w-3 h-3" /> Nuvem (Cloud)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="printer-modal-label text-xs font-semibold text-slate-300">Protocolo de Comunicação</label>
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value as any)}
                      className="printer-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
                    >
                      <option value="bambu_mqtt">Bambu Lab MQTT / LAN Access Code</option>
                      <option value="moonraker_klipper">Moonraker / Klipper API (Creality, Voron, etc.)</option>
                      <option value="prusalink">PrusaLink REST API (Prusa MK4, XL, Mini)</option>
                      <option value="prusa_connect">Prusa Connect Cloud API</option>
                      <option value="octoprint">OctoPrint REST API</option>
                      <option value="anycubic_cloud">Anycubic Cloud API</option>
                      <option value="flashforge_flashprint">Flashforge FlashPrint Control</option>
                      <option value="stratasys_control">Stratasys Control API / GrabCAD</option>
                      <option value="industrial_rest">Industrial REST / OPC-UA (3D Systems, EOS, HP)</option>
                    </select>
                  </div>

                  {connectionType === 'lan' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1.5">
                        <label className="printer-modal-label text-xs font-semibold text-slate-300">Endereço IP Local</label>
                        <input
                          type="text"
                          placeholder="192.168.1.108"
                          value={ipAddress}
                          onChange={(e) => setIpAddress(e.target.value)}
                          className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="printer-modal-label text-xs font-semibold text-slate-300">Porta</label>
                        <input
                          type="number"
                          placeholder="80"
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="printer-modal-label text-xs font-semibold text-slate-300">Servidor Cloud (Endpoint)</label>
                      <input
                        type="text"
                        placeholder="https://api.bambulab.com"
                        value={cloudEndpoint}
                        onChange={(e) => setCloudEndpoint(e.target.value)}
                        className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono text-[11px]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="printer-modal-label text-xs font-semibold text-slate-300">
                      {brand === 'Bambu Lab' ? 'Código de Acesso LAN (Access Code) / Senha' : 'Chave de API / Token'}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="printer-modal-label text-xs font-semibold text-slate-300">Número de Série (SN) / Device ID</label>
                    <input
                      type="text"
                      placeholder="Ex: 01P00A382800142"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Botão Testar Conexão em tempo real */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestModalConnection}
                    disabled={isTestingModalConn}
                    className="printer-modal-btn-test px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1e1e24] hover:bg-[#25252e] text-sky-400 border border-sky-500/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingModalConn ? 'animate-spin' : ''}`} />
                    <span>{isTestingModalConn ? 'Testando Conexão...' : 'Testar Conexão Agora'}</span>
                  </button>

                  {modalTestResult && (
                    <div className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                      modalTestResult.success
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {modalTestResult.success ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                      <span>{modalTestResult.message}</span>
                      {modalTestResult.latency && <span className="font-mono text-[10px]">({modalTestResult.latency}ms)</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Dimensões da Mesa & Bico */}
              <div className="printer-modal-section p-3.5 bg-[#121216] border border-white/[0.06] rounded-2xl space-y-3">
                <span className="printer-modal-section-title text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  Volume de Construção & Extrusão
                </span>
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="printer-modal-label-sub text-[11px] text-slate-400 font-semibold">Largura X (mm)</label>
                    <input
                      type="number"
                      min="50"
                      value={bedSizeX}
                      onChange={(e) => setBedSizeX(Number(e.target.value))}
                      className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="printer-modal-label-sub text-[11px] text-slate-400 font-semibold">Compr. Y (mm)</label>
                    <input
                      type="number"
                      min="50"
                      value={bedSizeY}
                      onChange={(e) => setBedSizeY(Number(e.target.value))}
                      className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="printer-modal-label-sub text-[11px] text-slate-400 font-semibold">Altura Z (mm)</label>
                    <input
                      type="number"
                      min="50"
                      value={bedSizeZ}
                      onChange={(e) => setBedSizeZ(Number(e.target.value))}
                      className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="printer-modal-label-sub text-[11px] text-slate-400 font-semibold">Bico (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={nozzleDiameter}
                      onChange={(e) => setNozzleDiameter(Number(e.target.value))}
                      className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Potência e Custos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="printer-modal-label text-xs font-semibold text-slate-300">Potência Eixos/Eletrônica (W)</label>
                  <input
                    type="number"
                    min="0"
                    value={printerPowerWatts}
                    onChange={(e) => setPrinterPowerWatts(Number(e.target.value))}
                    className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="printer-modal-label text-xs font-semibold text-slate-300">Mesa Aquecida Média (W)</label>
                  <input
                    type="number"
                    min="0"
                    value={bedHeaterWatts}
                    onChange={(e) => setBedHeaterWatts(Number(e.target.value))}
                    className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="printer-modal-label text-xs font-semibold text-slate-300">Depreciação por Hora (R$/h)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={hourlyDepreciation}
                    onChange={(e) => setHourlyDepreciation(Number(e.target.value))}
                    className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="printer-modal-label text-xs font-semibold text-slate-300">Taxa Falha Padrão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={failureRateDefault}
                    onChange={(e) => setFailureRateDefault(Number(e.target.value))}
                    className="printer-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="printer-modal-label text-xs font-semibold text-slate-300">Status Operacional da Máquina</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="printer-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
                >
                  <option value="available">Disponível para Produção</option>
                  <option value="printing">Em Impressão Ativa</option>
                  <option value="maintenance">Em Manutenção (Bloqueia OPs)</option>
                </select>
              </div>

              <div className="printer-modal-footer flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="printer-modal-btn-cancel px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#222228] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="printer-modal-btn-submit px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition cursor-pointer"
                >
                  {editingPrinter ? 'Salvar Alterações' : 'Cadastrar Impressora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar AMS & Aquecedores */}
      {showAmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="production-modal-box bg-[#16161a] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="production-modal-header flex items-center justify-between border-b border-white/[0.08] pb-4 px-1 -mx-6 -mt-6 p-6 rounded-t-3xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-400" />
                {editingAms ? 'Editar AMS / Aquecedor' : 'Cadastrar AMS ou Aquecedor'}
              </h3>
              <button type="button" onClick={() => setShowAmsModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAms} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nome do Dispositivo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bambu AMS Pro (Unidade 1), Sunlu S2 Dry Box"
                  value={amsName}
                  onChange={(e) => setAmsName(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tipo de Equipamento</label>
                  <select
                    value={amsType}
                    onChange={(e) => setAmsType(e.target.value as any)}
                    className="production-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="ams">AMS (Multi-cor)</option>
                    <option value="drybox">Dry Box / Estufa</option>
                    <option value="heater">Aquecedor de Filamento</option>
                    <option value="multi_feeder">Multi-Alimentador</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Impressora Vinculada</label>
                  <select
                    value={amsPrinterId}
                    onChange={(e) => setAmsPrinterId(e.target.value)}
                    className="production-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="">Nenhuma / Independente</option>
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Qtd. Rolos / Slots</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={amsSlots}
                    onChange={(e) => setAmsSlots(Number(e.target.value))}
                    className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Potência Média (W)</label>
                  <input
                    type="number"
                    min="0"
                    value={amsPower}
                    onChange={(e) => setAmsPower(Number(e.target.value))}
                    className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Com sílica trocada recentemente, conectado na porta CAN..."
                  value={amsNotes}
                  onChange={(e) => setAmsNotes(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAmsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#222228]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20"
                >
                  {editingAms ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Manutenção */}
      {showMntModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="production-modal-box bg-[#16161a] border border-white/[0.12] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="production-modal-header flex items-center justify-between border-b border-white/[0.08] pb-4 px-1 -mx-6 -mt-6 p-6 rounded-t-3xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                {editingMnt ? 'Editar Manutenção' : 'Agendar / Registrar Manutenção'}
              </h3>
              <button type="button" onClick={() => setShowMntModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMnt} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Selecionar Impressora 3D</label>
                <select
                  required
                  value={mntPrinterId}
                  onChange={(e) => setMntPrinterId(e.target.value)}
                  className="production-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Selecione a máquina...</option>
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.status === 'maintenance' ? 'Em Manutenção' : 'Disponível'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tipo de Manutenção</label>
                  <select
                    value={mntType}
                    onChange={(e) => setMntType(e.target.value as any)}
                    className="production-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="preventiva">Preventiva</option>
                    <option value="corretiva">Corretiva (Reparo)</option>
                    <option value="limpeza_bico">Limpeza / Desentupimento de Bico</option>
                    <option value="calibracao">Calibração de Mesa / Bed Level</option>
                    <option value="troca_ptfe">Troca de Tubo PTFE / Hotend</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Urgência / Severidade</label>
                  <select
                    value={mntSeverity}
                    onChange={(e) => setMntSeverity(e.target.value as any)}
                    className="production-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente (Parada Total)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Título / Assunto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troca de bico 0.4mm e lubrificação dos eixos Z"
                  value={mntTitle}
                  onChange={(e) => setMntTitle(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Início (Data e Hora)</label>
                  <input
                    type="datetime-local"
                    required
                    value={mntStartDate}
                    onChange={(e) => setMntStartDate(e.target.value)}
                    className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Fim (Data e Hora)</label>
                  <input
                    type="datetime-local"
                    value={mntEndDate}
                    onChange={(e) => setMntEndDate(e.target.value)}
                    className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Status</label>
                  <select
                    value={mntStatus}
                    onChange={(e) => setMntStatus(e.target.value as any)}
                    className="production-modal-select w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono"
                  >
                    <option value="scheduled">Agendada (Bloqueia)</option>
                    <option value="in_progress">Em Andamento (Bloqueia)</option>
                    <option value="resolved">Resolvida (Libera)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Técnico Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Gledson Scotti / Oficina 3D"
                  value={mntTechnician}
                  onChange={(e) => setMntTechnician(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Descrição Detalhada</label>
                <textarea
                  rows={2}
                  placeholder="Descreva o problema encontrado ou o procedimento realizado..."
                  value={mntDescription}
                  onChange={(e) => setMntDescription(e.target.value)}
                  className="production-modal-input w-full bg-[#0a0a0b] border border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-xs text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowMntModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#222228]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                >
                  {editingMnt ? 'Salvar Alterações' : 'Salvar e Bloquear Impressora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Printer Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePrinter}
        title="Excluir Impressora 3D"
        message="Tem certeza que deseja excluir esta impressora? Os registros associados serão afetados."
        itemName={deleteTarget?.name}
        confirmLabel="Sim, Excluir"
      />

      {/* Confirm Delete AMS Modal */}
      <ConfirmModal
        isOpen={deleteTargetAms !== null}
        onClose={() => setDeleteTargetAms(null)}
        onConfirm={handleDeleteAms}
        title="Excluir Equipamento AMS"
        message="Tem certeza que deseja remover este equipamento?"
        itemName={deleteTargetAms?.name}
        confirmLabel="Sim, Excluir"
      />

      {/* Confirm Delete Maintenance Modal */}
      <ConfirmModal
        isOpen={deleteTargetMnt !== null}
        onClose={() => setDeleteTargetMnt(null)}
        onConfirm={handleDeleteMnt}
        title="Remover Registro de Manutenção"
        message="Deseja remover este registro de manutenção? Se a impressora não tiver outras manutenções ativas, seu status voltará a ser liberado."
        itemName={deleteTargetMnt?.title}
        confirmLabel="Sim, Remover"
      />

      {/* Modal de Varredura e Descoberta Automática de Rede */}
      <NetworkDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        onPrinterAdded={() => {
          onRefreshData();
          setNotification({
            type: 'success',
            message: 'Impressoras descobertas e cadastradas com sucesso!'
          });
        }}
      />
    </div>
  );
};
