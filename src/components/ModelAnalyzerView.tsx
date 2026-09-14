import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import {
  Box,
  Sparkles,
  Upload,
  Sliders,
  Scale,
  Clock,
  Layers,
  Cpu,
  CheckCircle2,
  ArrowRight,
  FileText,
  Shield,
  Zap,
  Info,
  Printer as PrinterIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertTriangle,
  Grid,
  Check,
  ChevronDown,
  Terminal,
  Bug,
  X
} from 'lucide-react';
import { AppSettings, AppTheme, Filament, Printer, AiOptimizationResult } from '../types';
import { ParsedModelResult } from '../utils/fileParsers';
import { ModelViewer3D } from './ModelViewer3D';
import { FileUploadZone } from './FileUploadZone';
import { SlicingAdvisorModal } from './SlicingAdvisorModal';
import { DirectPrintModal } from './DirectPrintModal';

interface ModelAnalyzerViewProps {
  printers: Printer[];
  filaments: Filament[];
  settings: AppSettings;
  theme?: AppTheme;
  onNavigateToCalculator: (params: {
    weightG: number;
    printTimeMinutes: number;
    infill: number;
    layerHeight: number;
    modelName: string;
    volumeCm3: number;
    dimensions: { x: number; y: number; z: number };
  }) => void;
  onNavigateToPlateEditor?: (params: {
    modelObject: THREE.Object3D | null;
    parsedModel: ParsedModelResult;
  }) => void;
}

export const ModelAnalyzerView: React.FC<ModelAnalyzerViewProps> = ({
  printers,
  filaments,
  settings,
  theme = 'standard',
  onNavigateToCalculator,
  onNavigateToPlateEditor,
}) => {
  const [modelBuffer, setModelBuffer] = useState<ArrayBuffer | null>(null);
  const [modelObject, setModelObject] = useState<THREE.Object3D | null>(null);
  const [sampleType, setSampleType] = useState<'keychain' | 'phone_stand' | 'gear' | 'vase' | 'bambu_3mf' | 'cad_bracket' | 'multi_box' | 'multi_batch'>('keychain');
  const [parsedModel, setParsedModel] = useState<ParsedModelResult>({
    fileName: 'chaveiro_tag_personalizado.stl',
    fileType: 'stl',
    formatLabel: 'STL (Standard Triangle)',
    category: 'mesh',
    dimensions: { x: 55, y: 22, z: 4.5 },
    volumeCm3: 5.4,
    estimatedWeightGrams: 14.5,
    estimatedTimeMinutes: 38,
    layerCount: 23,
    layerHeightMm: 0.2,
    filamentLengthMeters: 4.8,
    infillPercent: 20,
    trianglesCount: 4200,
  });

  const [selectedFilamentId, setSelectedFilamentId] = useState<string>(filaments[0]?.id || '');
  const activeFilament = filaments.find((f) => f.id === selectedFilamentId) || filaments[0];

  // Printer & Bed Size State (defaults to selected printer or 250x250x260 Anycubic/Bambu standard)
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(printers[0]?.id || '');
  const activePrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];

  const [bedSize, setBedSize] = useState<{ x: number; y: number; z: number }>({
    x: activePrinter?.bed_size_x || 250,
    y: activePrinter?.bed_size_y || 250,
    z: activePrinter?.bed_size_z || 260,
  });

  // Sync bed dimensions when activePrinter changes
  useEffect(() => {
    if (activePrinter) {
      const bx = activePrinter.bed_size_x || 250;
      const by = activePrinter.bed_size_y || 250;
      const bz = activePrinter.bed_size_z || 260;
      setBedSize((prev) => {
        if (prev.x === bx && prev.y === by && prev.z === bz) return prev;
        return { x: bx, y: by, z: bz };
      });
    }
  }, [activePrinter?.id, activePrinter?.bed_size_x, activePrinter?.bed_size_y, activePrinter?.bed_size_z]);

  // Detected Multi-Part Count
  const [partsCount, setPartsCount] = useState<number>(1);
  const [isDirectPrintOpen, setIsDirectPrintOpen] = useState<boolean>(false);

  // AI Advisor & Optimizer states
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState<boolean>(false);
  const [aiOptimizationResult, setAiOptimizationResult] = useState<AiOptimizationResult | null>(null);
  const [aiTips, setAiTips] = useState<string[]>([
    'Geometria otimizada para impressão com base plana nivelada na mesa.',
    'Disposição multi-peças ajustada automaticamente para evitar colisões no leito.',
    'Infill giroide de 20% proporciona excelente relação peso/resistência mecânica.',
  ]);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const canvasSnapshotGetterRef = useRef<(() => string | null) | null>(null);

  interface DiagnosticLogEntry {
    timestamp: string;
    stage: 'LOADING' | 'PARSING' | 'SCENE_INIT' | 'RENDER' | 'ERROR';
    message: string;
    details: any;
  }

  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLogEntry[]>([]);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState<boolean>(false);

  // Diagnostic logging function to trace loading status, file parsing, and Three.js scene initialization steps
  const traceModelDiagnostics = useCallback((
    action: string,
    stage: 'LOADING' | 'PARSING' | 'SCENE_INIT' | 'RENDER' | 'ERROR',
    details: Record<string, any>
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry: DiagnosticLogEntry = {
      timestamp,
      stage,
      message: action,
      details,
    };

    setDiagnosticLogs((prev) => [logEntry, ...prev.slice(0, 49)]);

    console.group(`%c[3D-DIAGNOSTIC] [${stage}] ${action} (${timestamp})`, 'background: #0ea5e9; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-weight: bold;');
    console.log('• Stage:', stage);
    console.log('• Action / Message:', action);
    console.log('• File Name:', details.fileName || parsedModel.fileName);
    console.log('• File Type:', details.fileType || parsedModel.fileType);
    if (details.bufferSize !== undefined) {
      console.log('• Buffer Size (bytes):', details.bufferSize);
    }
    if (details.trianglesCount !== undefined) {
      console.log('• Triangles / Faces Count:', details.trianglesCount);
    }
    if (details.dimensions) {
      console.log('• Geometry Dimensions (mm):', details.dimensions);
    }
    console.log('• Has THREE.Object3D:', details.hasObject3D ?? !!modelObject);
    console.log('• Has ArrayBuffer:', details.hasBuffer ?? !!modelBuffer);
    if (details.meshCount !== undefined) {
      console.log('• Mesh Count in Scene:', details.meshCount);
    }
    if (details.materialStatus) {
      console.log('• Material & Shading Status:', details.materialStatus);
    }
    if (details.bedFitStatus) {
      console.log('• Bed Fit & Positioning Status:', details.bedFitStatus);
    }
    if (details.error) {
      console.error('❌ Rendering / Parsing Error Identified:', details.error);
    } else {
      console.log('✅ Status: Ready & Rendering Validated');
    }
    console.groupEnd();
  }, [parsedModel.fileName, parsedModel.fileType, modelObject, modelBuffer]);

  useEffect(() => {
    traceModelDiagnostics('ModelAnalyzerView Initialized', 'SCENE_INIT', {
      fileName: parsedModel.fileName,
      fileType: parsedModel.fileType,
      dimensions: parsedModel.dimensions,
      trianglesCount: parsedModel.trianglesCount,
      hasObject3D: !!modelObject,
      hasBuffer: !!modelBuffer,
      materialStatus: 'Default sample preset loaded (' + sampleType + ')',
      bedFitStatus: `Bed: ${bedSize.x}x${bedSize.y}mm`
    });
  }, []);

  const handleSnapshotReady = useCallback((getter: () => string | null) => {
    canvasSnapshotGetterRef.current = getter;
  }, []);

  const handleModelLoaded = (
    result: ParsedModelResult,
    buffer?: ArrayBuffer,
    object3D?: THREE.Object3D
  ) => {
    traceModelDiagnostics(`File Upload Parsed: ${result.fileName}`, 'PARSING', {
      fileName: result.fileName,
      fileType: result.fileType,
      bufferSize: buffer?.byteLength,
      trianglesCount: result.trianglesCount,
      dimensions: result.dimensions,
      hasObject3D: !!object3D || !!result.threeObject,
      hasBuffer: !!buffer,
      materialStatus: 'Universal 3D parser successful',
      bedFitStatus: (result.dimensions?.x ?? 0) <= bedSize.x && (result.dimensions?.y ?? 0) <= bedSize.y ? 'Fits bed' : 'Exceeds bed'
    });

    setParsedModel(result);
    if (object3D) {
      setModelObject(object3D);
      setModelBuffer(buffer || null);
      traceModelDiagnostics('Three.js Scene Initialization (Object3D)', 'SCENE_INIT', {
        fileName: result.fileName,
        hasObject3D: true,
        materialStatus: 'MeshStandardMaterial assigned with filament color',
      });
    } else if (result.threeObject) {
      setModelObject(result.threeObject);
      setModelBuffer(buffer || null);
      traceModelDiagnostics('Three.js Scene Initialization (Result.threeObject)', 'SCENE_INIT', {
        fileName: result.fileName,
        hasObject3D: true,
        materialStatus: 'MeshStandardMaterial assigned',
      });
    } else if (buffer) {
      setModelBuffer(buffer);
      setModelObject(null);
      traceModelDiagnostics('Three.js Scene Initialization (Buffer STL)', 'SCENE_INIT', {
        fileName: result.fileName,
        bufferSize: buffer.byteLength,
        materialStatus: 'Buffer geometry parsed to mesh',
      });
    } else {
      setModelBuffer(null);
      setModelObject(null);
    }
  };

  const handleDimensionsChangedFromViewer = useCallback(
    (
      newDims: { x: number; y: number; z: number },
      scaleApplied: number,
      detectedCount: number
    ) => {
      setPartsCount((prev) => (prev !== detectedCount ? detectedCount : prev));
      setParsedModel((prev) => {
        const prevDims = prev?.dimensions || { x: 0, y: 0, z: 0 };
        const dimsUnchanged =
          Math.abs(prevDims.x - newDims.x) < 0.1 &&
          Math.abs(prevDims.y - newDims.y) < 0.1 &&
          Math.abs(prevDims.z - newDims.z) < 0.1;
        const scaleUnchanged = Math.abs(scaleApplied - 1) <= 0.01;

        if (dimsUnchanged && scaleUnchanged) {
          return prev;
        }

        if (!scaleUnchanged) {
          const volumeFactor = Math.pow(scaleApplied, 3);
          return {
            ...prev,
            dimensions: newDims,
            volumeCm3: Number((prev.volumeCm3 * volumeFactor).toFixed(2)),
            estimatedWeightGrams: Number((prev.estimatedWeightGrams * volumeFactor).toFixed(1)),
            estimatedTimeMinutes: Math.max(12, Math.round(prev.estimatedTimeMinutes * Math.pow(scaleApplied, 2.2))),
            filamentLengthMeters: Number((prev.filamentLengthMeters * volumeFactor).toFixed(1)),
          };
        }

        return {
          ...prev,
          dimensions: newDims,
        };
      });
    },
    []
  );

  const samplePresets = [
    {
      id: 'keychain' as const,
      name: 'Chaveiro Tag',
      badge: 'STL',
      parts: 1,
      dims: { x: 55, y: 22, z: 4.5 },
      vol: 5.4,
      weight: 14.5,
      time: 38,
      fileName: 'chaveiro_tag_personalizado.stl',
    },
    {
      id: 'phone_stand' as const,
      name: 'Suporte Celular',
      badge: 'STL',
      parts: 1,
      dims: { x: 50, y: 30, z: 37 },
      vol: 18.2,
      weight: 22.5,
      time: 65,
      fileName: 'suporte_celular_ergonomico.stl',
    },
    {
      id: 'bambu_3mf' as const,
      name: 'Recipiente + Tampa',
      badge: '3MF Multi-Peça',
      parts: 2,
      dims: { x: 92, y: 48, z: 36 },
      vol: 28.5,
      weight: 35.0,
      time: 92,
      fileName: 'recipiente_rosca_com_tampa.3mf',
    },
    {
      id: 'multi_box' as const,
      name: 'Caixa + Tampa Desmontadas',
      badge: 'Multi-Part (2x)',
      parts: 2,
      dims: { x: 145, y: 64, z: 26 },
      vol: 38.0,
      weight: 47.0,
      time: 110,
      fileName: 'organizador_caixa_e_tampa.stl',
    },
    {
      id: 'multi_batch' as const,
      name: 'Lote 4 Peças Distribuídas',
      badge: 'Multi-Part (4x)',
      parts: 4,
      dims: { x: 115, y: 115, z: 24 },
      vol: 52.0,
      weight: 64.0,
      time: 145,
      fileName: 'lote_manipulos_4x.stl',
    },
    {
      id: 'gear' as const,
      name: 'Engrenagem G-code',
      badge: 'G-CODE',
      parts: 1,
      dims: { x: 48, y: 48, z: 15 },
      vol: 12.0,
      weight: 15.0,
      time: 42,
      fileName: 'engrenagem_helicoide.gcode',
    },
    {
      id: 'cad_bracket' as const,
      name: 'Flange Mecânica',
      badge: 'STEP CAD',
      parts: 1,
      dims: { x: 60, y: 35, z: 45 },
      vol: 24.0,
      weight: 30.0,
      time: 75,
      fileName: 'flange_acoplamento_din.step',
    },
  ];

  const handleSelectSamplePreset = (preset: typeof samplePresets[0]) => {
    traceModelDiagnostics(`Preset Selected: ${preset.name}`, 'LOADING', {
      fileName: preset.fileName,
      fileType: preset.fileName.split('.').pop()?.toLowerCase() || 'stl',
      trianglesCount: preset.parts * 4200,
      dimensions: preset.dims,
      hasObject3D: false,
      hasBuffer: false,
      bedFitStatus: preset.dims.x <= bedSize.x && preset.dims.y <= bedSize.y ? 'Fits bed' : 'Exceeds bed'
    });
    setSampleType(preset.id);
    setModelObject(null);
    setModelBuffer(null);
    setPartsCount(preset.parts);
    setParsedModel({
      fileName: preset.fileName,
      fileType: preset.fileName.split('.').pop()?.toLowerCase() || 'stl',
      formatLabel: preset.badge,
      category: 'mesh',
      dimensions: preset.dims,
      volumeCm3: preset.vol,
      estimatedWeightGrams: preset.weight,
      estimatedTimeMinutes: preset.time,
      layerCount: Math.round((preset.dims.z / 0.2)),
      layerHeightMm: 0.2,
      filamentLengthMeters: Number((preset.weight / 3.0).toFixed(1)),
      infillPercent: 20,
      trianglesCount: preset.parts * 4200,
    });
  };

  // Bed fit verification
  const isExceedingBed =
    (parsedModel?.dimensions?.x ?? 0) > bedSize.x || (parsedModel?.dimensions?.y ?? 0) > bedSize.y;

  const handleRequestAiOptimization = async (options?: {
    customImage?: string;
    userNotes?: string;
    intentCategory?: string;
  }) => {
    setLoadingAi(true);
    try {
      let snapshotDataUrl: string | null = options?.customImage || null;
      if (!snapshotDataUrl && canvasSnapshotGetterRef.current) {
        snapshotDataUrl = canvasSnapshotGetterRef.current();
      }

      const res = await fetch('/api/gemini/optimize-slicing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: parsedModel.fileName,
          file_type: parsedModel.fileType,
          dimensions: parsedModel.dimensions,
          volume_cm3: parsedModel.volumeCm3,
          triangles_count: parsedModel.trianglesCount,
          snapshot_data_url: snapshotDataUrl,
          user_notes: options?.userNotes,
          intent_category: options?.intentCategory,
          material: activeFilament?.type || 'PLA',
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao comunicar com IA Gemini');
      }

      const data: AiOptimizationResult = await res.json();
      setAiOptimizationResult(data);
      if (data.tips && data.tips.length > 0) {
        setAiTips(data.tips);
      }
      setIsAdvisorModalOpen(true);
    } catch (err: any) {
      console.warn('Fallback para assistente de fatiamento:', err);
      // Fallback local smart advisor with rich profiles
      setAiOptimizationResult({
        diagnostic: {
          pieceType: 'Peça Mecânica / Sólido 3D',
          structuralAnalysis: 'Geometria balanceada com boa distribuição de massa na mesa de impressão.',
          idealBedOrientation: 'Base plana para máxima aderência e estabilidade térmica.',
          supportNeeded: 'Suportes mínimos necessários.',
          layerAdhesionTips: 'Manter temperatura da mesa entre 55°C e 60°C.',
        },
        profiles: [
          {
            id: 'eco',
            name: 'Eco Rápido',
            tier: 1,
            badge: 'Mais Econômico',
            badgeColor: 'emerald',
            description: 'Foco em velocidade de prototipagem e economia máxima de filamento.',
            summary: 'Ideal para rascunhos rápidos ou peças que não sofrem estresse mecânico.',
            specs: {
              layerHeight: '0.28 mm',
              wallLoops: 2,
              infillPercent: 12,
              infillPattern: 'grid',
              topLayers: 3,
              bottomLayers: 3,
              printSpeed: '120 mm/s',
              nozzleTemp: '210 °C',
              bedTemp: '60 °C',
              fanSpeed: '100%',
            },
            estimatedWeightGrams: Math.round(parsedModel.estimatedWeightGrams * 0.75),
            estimatedTimeMinutes: Math.round(parsedModel.estimatedTimeMinutes * 0.7),
            actionableTips: ['Usar draft/adaptive layers para acelerar ainda mais.'],
            metrics: { strengthScore: 60, speedScore: 95, economyScore: 90, finishScore: 65 },
          },
          {
            id: 'balanced',
            name: 'Padrão Balanceado',
            tier: 2,
            badge: 'Recomendado',
            badgeColor: 'sky',
            description: 'Equilíbrio ideal entre resistência mecânica, acabamento superficial e tempo.',
            summary: 'Melhor opção para produção padrão de catálogo.',
            specs: {
              layerHeight: '0.20 mm',
              wallLoops: 3,
              infillPercent: 20,
              infillPattern: 'gyroid',
              topLayers: 4,
              bottomLayers: 4,
              printSpeed: '80 mm/s',
              nozzleTemp: '215 °C',
              bedTemp: '60 °C',
              fanSpeed: '100%',
            },
            estimatedWeightGrams: Math.round(parsedModel.estimatedWeightGrams),
            estimatedTimeMinutes: Math.round(parsedModel.estimatedTimeMinutes),
            actionableTips: ['Giroide reduz vibrações nos eixos X e Y.'],
            metrics: { strengthScore: 82, speedScore: 80, economyScore: 80, finishScore: 85 },
          },
          {
            id: 'strength',
            name: 'Carga Máxima',
            tier: 3,
            badge: 'Alta Resistência',
            badgeColor: 'purple',
            description: 'Projetado para resistir a esforços mecânicos, impactos e flexão contínua.',
            summary: 'Recomendado para suportes funcionais, engrenagens e peças de esforço.',
            specs: {
              layerHeight: '0.16 mm',
              wallLoops: 5,
              infillPercent: 45,
              infillPattern: 'honeycomb',
              topLayers: 5,
              bottomLayers: 5,
              printSpeed: '50 mm/s',
              nozzleTemp: '220 °C',
              bedTemp: '65 °C',
              fanSpeed: '80%',
            },
            estimatedWeightGrams: Math.round(parsedModel.estimatedWeightGrams * 1.4),
            estimatedTimeMinutes: Math.round(parsedModel.estimatedTimeMinutes * 1.5),
            actionableTips: ['Aumentar temperatura em +5°C melhora fusão intercamadas.'],
            metrics: { strengthScore: 98, speedScore: 50, economyScore: 55, finishScore: 92 },
          },
        ],
        tips: [
          'Utilizar 3 perímetros para maior durabilidade.',
          'Ativar resfriamento gradual após a 2ª camada.',
          'Velocidade de 60mm/s em perímetros externos para acabamento perfeito.',
        ],
      });
      setIsAdvisorModalOpen(true);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSendToCalculator = () => {
    onNavigateToCalculator({
      weightG: parsedModel.estimatedWeightGrams,
      printTimeMinutes: parsedModel.estimatedTimeMinutes,
      infill: parsedModel.infillPercent || 20,
      layerHeight: parsedModel.layerHeightMm || 0.2,
      modelName: parsedModel.fileName.replace(/\.(stl|gcode|3mf|step|stp|obj)$/i, ''),
      volumeCm3: parsedModel.volumeCm3,
      dimensions: parsedModel.dimensions,
    });
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shrink-0">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              Analisador & Otimizador 3D
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#18181b] border border-white/[0.1] text-sky-400">
                {parsedModel.formatLabel || parsedModel.fileType.toUpperCase()}
              </span>
              {partsCount > 1 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {partsCount} Peças no Arquivo
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizador universal de malhas (STL, 3MF, STEP, G-code), encaixe automático na mesa de impressão e cálculo preciso.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowDiagnosticsPanel(!showDiagnosticsPanel)}
            className="px-3.5 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
            title="Abrir console de diagnóstico 3D (Tracing de carregamento e parsing)"
          >
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>Diagnóstico 3D</span>
          </button>

          <button
            type="button"
            onClick={handleRequestAiOptimization}
            disabled={loadingAi}
            className="px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-4 h-4 text-amber-400 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>{loadingAi ? 'Analisando Malha...' : 'Otimizador IA'}</span>
          </button>

          {/* Botão Organizar / Editar em Mesas 3D */}
          {onNavigateToPlateEditor && (
            <button
              type="button"
              id="btn-analyzer-open-plates"
              onClick={() => {
                onNavigateToPlateEditor({ modelObject, parsedModel });
              }}
              className="px-4 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              title="Abrir no Editor de Mesas para organizar peças por cor única"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Editar em Mesas</span>
            </button>
          )}

          {/* Botão Disparar Impressão Direta (com classe e ID padronizados ao tema) */}
          <button
            type="button"
            id="btn-analyzer-direct-print"
            onClick={() => setIsDirectPrintOpen(true)}
            className="direct-print-trigger-btn px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-sky-400/30 text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:via-indigo-500 hover:to-blue-500 shadow-md"
          >
            <PrinterIcon className="w-4 h-4 shrink-0" />
            <span>Disparar Impressão Direta</span>
          </button>

          <button
            type="button"
            onClick={handleSendToCalculator}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm shadow-emerald-500/20"
          >
            <span>Enviar para Calculadora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sentSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Parâmetros enviados com sucesso para a Calculadora de Custos! Redirecionando...</span>
        </div>
      )}

      {/* 3D Diagnostic Console Drawer / Panel */}
      {showDiagnosticsPanel && (
        <div className="bg-[#121215] border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fade-in relative">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Bug className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Console Diagnóstico 3D (Tracing de Renderização & Parsing)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Rastreia status de carregamento, parsing de arquivos (STL/3MF/CAD) e inicialização da cena Three.js.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  traceModelDiagnostics('Manual Diagnostic Trigger', 'RENDER', {
                    fileName: parsedModel.fileName,
                    fileType: parsedModel.fileType,
                    dimensions: parsedModel.dimensions,
                    trianglesCount: parsedModel.trianglesCount,
                    hasObject3D: !!modelObject,
                    hasBuffer: !!modelBuffer,
                    materialStatus: 'Active filament: ' + activeFilament?.name,
                    bedFitStatus: `Bed: ${bedSize.x}x${bedSize.y}mm`
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs transition cursor-pointer"
              >
                Rodar Teste Trace
              </button>
              <button
                type="button"
                onClick={() => setDiagnosticLogs([])}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] font-medium text-xs transition cursor-pointer"
              >
                Limpar Logs
              </button>
              <button
                type="button"
                onClick={() => setShowDiagnosticsPanel(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-[#0A0A0B] rounded-2xl p-4 border border-white/[0.06] font-mono text-xs max-h-80 overflow-y-auto space-y-2.5">
            {diagnosticLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Nenhum evento de diagnóstico registrado ainda. Selecione um arquivo ou preset.</p>
            ) : (
              diagnosticLogs.map((log, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#121216] border border-white/[0.06] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.stage === 'LOADING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        log.stage === 'PARSING' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        log.stage === 'SCENE_INIT' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        log.stage === 'RENDER' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        [{log.stage}]
                      </span>
                      <span className="text-white font-bold">{log.message}</span>
                    </span>
                    <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-300 text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1 border-t border-white/[0.04]">
                    <div><span className="text-slate-500">Arquivo:</span> {log.details.fileName || 'N/A'}</div>
                    <div><span className="text-slate-500">Tipo:</span> {log.details.fileType || 'N/A'}</div>
                    <div><span className="text-slate-500">Triângulos:</span> {log.details.trianglesCount?.toLocaleString() || 'N/A'}</div>
                    {log.details?.dimensions && (
                      <div><span className="text-slate-500">Dimensões:</span> {log.details.dimensions.x ?? 0}×{log.details.dimensions.y ?? 0}×{log.details.dimensions.z ?? 0}mm</div>
                    )}
                    <div><span className="text-slate-500">Object3D:</span> {log.details.hasObject3D ? 'Sim' : 'Não'}</div>
                    <div><span className="text-slate-500">Buffer:</span> {log.details.hasBuffer ? 'Sim' : 'Não'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Printer & Bed Size Selection Bar */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <PrinterIcon className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-300">Mesa de Impressão:</span>
          </div>

          <select
            value={selectedPrinterId}
            onChange={(e) => {
              const pid = e.target.value;
              setSelectedPrinterId(pid);
              const found = printers.find((p) => p.id === pid);
              if (found) {
                setBedSize({
                  x: found.bed_size_x || 250,
                  y: found.bed_size_y || 250,
                  z: found.bed_size_z || 260,
                });
              }
            }}
            className="bg-[#0A0A0E] border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-sky-400"
          >
            {printers.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.name} ({pr.bed_size_x || 250} × {pr.bed_size_y || 250} × {pr.bed_size_z || 260} mm)
              </option>
            ))}
          </select>

          {/* Quick Bed Dimensions Presets */}
          <div className="flex items-center gap-1.5">
            {[
              { label: '250×250 (Anycubic/Padrão)', x: 250, y: 250, z: 260 },
              { label: '256×256 (Bambu)', x: 256, y: 256, z: 256 },
              { label: '220×220 (Ender-3)', x: 220, y: 220, z: 250 },
              { label: '300×300 (Grande)', x: 300, y: 300, z: 300 },
            ].map((preset) => {
              const isSelected = bedSize.x === preset.x && bedSize.y === preset.y;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setBedSize({ x: preset.x, y: preset.y, z: preset.z })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 font-bold'
                      : 'bg-[#0A0A0E] text-slate-400 border-white/[0.06] hover:text-white'
                  }`}
                >
                  {preset.x}×{preset.y}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bed Fit Badge */}
        <div>
          {isExceedingBed ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Excede a mesa ({parsedModel?.dimensions?.x ?? 0} × {parsedModel?.dimensions?.y ?? 0} mm vs {bedSize.x} × {bedSize.y} mm)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Encaixa perfeitamente na mesa ({parsedModel?.dimensions?.x ?? 0} × {parsedModel?.dimensions?.y ?? 0} mm)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Stack: Interactive 3D Viewer at Top, File Upload & Parameters Directly Below */}
      <div className="space-y-6">
        {/* 1. Visualizador 3D Interativo */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-sky-400" />
                Visualizador 3D & Mesa de Impressão
              </h2>
              {partsCount > 1 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {partsCount} Peças Separadas
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#0A0A0B] px-3 py-1.5 rounded-2xl border border-white/[0.06]">
              <span className="text-xs text-slate-400">Filamento:</span>
              <span
                className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: activeFilament?.color_hex || '#2563eb' }}
              />
              <span className="text-xs font-mono font-bold text-white">{activeFilament?.name || 'Padrão'}</span>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0A0A0B]">
            <ModelViewer3D
              modelObject={modelObject}
              modelBuffer={modelBuffer}
              sampleType={sampleType}
              filamentColor={activeFilament?.color_hex || '#2563eb'}
              dimensions={parsedModel.dimensions}
              fileType={parsedModel.fileType}
              formatLabel={parsedModel.formatLabel}
              trianglesCount={parsedModel.trianglesCount}
              layerCount={parsedModel.layerCount}
              theme={theme}
              bedSize={bedSize}
              onModelDimensionsChanged={handleDimensionsChangedFromViewer}
              onSnapshotReady={handleSnapshotReady}
            />
          </div>

          {/* Exemplos do Analisador (Sample Presets Bar) */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-sky-400" />
                Exemplos do Analisador (Geometrias de Teste e Multi-Peças):
              </span>
              <span className="text-[11px] text-slate-500">
                Selecione para simular peças e testar o arranjo automático no leito
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {samplePresets.map((preset) => {
                const isSelected = sampleType === preset.id && !modelBuffer && !modelObject;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectSamplePreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border-sky-400/60 shadow-sm'
                        : 'bg-[#0A0A0E] text-slate-300 border-white/[0.08] hover:border-white/[0.2] hover:text-white'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400 border border-white/[0.06]">
                      {preset.badge}
                    </span>
                    {preset.parts > 1 && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1 rounded">
                        {preset.parts}x
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Carregar Arquivo 3D / G-code & Parâmetros de Fatiamento (Logo abaixo do Visualizador 3D) */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" />
            Carregar Arquivo 3D / G-code & Parâmetros de Fatiamento
          </h2>
          <FileUploadZone
            onModelLoaded={handleModelLoaded}
            selectedFilament={activeFilament}
            onRequestAiOptimization={handleRequestAiOptimization}
            loadingAi={loadingAi}
            aiOptimizationResult={aiOptimizationResult}
            onOpenAdvisorModal={() => setIsAdvisorModalOpen(true)}
            aiTips={aiTips}
          />
        </div>

        {/* 3. Relatório de Geometria & Dicas de Slicing (Grid inferior) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Geometry Statistics Summary (6 cols) */}
          <div className="lg:col-span-6 bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              Relatório de Geometria Detalhado
            </h2>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Arquivo:</span>
                <span className="text-white font-bold truncate max-w-[220px]" title={parsedModel.fileName}>
                  {parsedModel.fileName}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Dimensões na Mesa (X × Y × Z):</span>
                <span className="text-white font-bold">
                  {parsedModel?.dimensions?.x ?? 0} × {parsedModel?.dimensions?.y ?? 0} × {parsedModel?.dimensions?.z ?? 0} mm
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Encaixe na Mesa ({bedSize.x} × {bedSize.y} mm):</span>
                <span className={isExceedingBed ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isExceedingBed ? '⚠️ Excede Margens' : '✓ Encaixa Perfeitamente'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Volume Sólido:</span>
                <span className="text-white font-bold">{parsedModel.volumeCm3} cm³</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Peso Estimado:</span>
                <span className="text-emerald-400 font-bold">{parsedModel.estimatedWeightGrams} g</span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Tempo Estimado:</span>
                <span className="text-amber-300 font-bold">
                  {Math.floor(parsedModel.estimatedTimeMinutes / 60)}h {parsedModel.estimatedTimeMinutes % 60}m
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                <span className="text-slate-400 font-sans">Triângulos / Malha:</span>
                <span className="text-sky-300 font-bold">{parsedModel.trianglesCount.toLocaleString()} faces</span>
              </div>
            </div>
          </div>

          {/* AI Recommendations & Slicing Parameters Card (6 cols) */}
          <div className="lg:col-span-6 bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Dicas de Slicing & Otimização Geométrica
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Altura de Camada</span>
                <span className="text-sm font-bold text-white font-mono">{parsedModel.layerHeightMm || 0.2} mm</span>
                <span className="text-[10px] text-slate-500 block">Equilíbrio detalhe/velocidade</span>
              </div>

              <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Preenchimento</span>
                <span className="text-sm font-bold text-amber-300 font-mono">{parsedModel.infillPercent || 20}% Gyroid</span>
                <span className="text-[10px] text-slate-500 block">Rigidez estrutural</span>
              </div>

              <div className="bg-[#0A0A0B] p-3.5 rounded-2xl border border-white/[0.06] space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Paredes</span>
                <span className="text-sm font-bold text-sky-300 font-mono">3 Paredes (1.2mm)</span>
                <span className="text-[10px] text-slate-500 block">Resistência a impacto</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                Orientações do Especialista IA:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {aiTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Slicing Advisor Modal */}
      {isAdvisorModalOpen && (
        <SlicingAdvisorModal
          isOpen={isAdvisorModalOpen}
          onClose={() => setIsAdvisorModalOpen(false)}
          modelName={parsedModel.fileName}
          fileName={parsedModel.fileName}
          dimensions={parsedModel.dimensions}
          volumeCm3={parsedModel.volumeCm3}
          trianglesCount={parsedModel.trianglesCount}
          currentWeightGrams={parsedModel.estimatedWeightGrams}
          currentTimeMinutes={parsedModel.estimatedTimeMinutes}
          material={activeFilament?.name || activeFilament?.type || 'PLA'}
          printerName={activePrinter?.name || 'Impressora 3D'}
          optimizationResult={aiOptimizationResult}
          snapshotDataUrl={canvasSnapshotGetterRef.current ? canvasSnapshotGetterRef.current() : null}
          isLoading={loadingAi}
          onReanalyze={handleRequestAiOptimization}
          onApplyProfile={(profile) => {
            const layerHeightNum = parseFloat(profile.specs?.layerHeight || '0.2') || (profile as any).layer_height || 0.2;
            const infillNum = profile.specs?.infillPercent ?? (profile as any).infill_percent ?? parsedModel.infillPercent;
            const weightNum = profile.estimatedWeightGrams ?? (profile as any).estimated_filament_grams ?? parsedModel.estimatedWeightGrams;
            const timeNum = profile.estimatedTimeMinutes ?? (profile as any).estimated_time_minutes ?? parsedModel.estimatedTimeMinutes;

            setParsedModel((prev) => ({
              ...prev,
              layerHeightMm: layerHeightNum,
              infillPercent: infillNum,
              estimatedWeightGrams: weightNum,
              estimatedTimeMinutes: timeNum,
            }));
            setIsAdvisorModalOpen(false);
          }}
        />
      )}

      {/* Direct Print Dispatch Modal */}
      {isDirectPrintOpen && (
        <DirectPrintModal
          isOpen={isDirectPrintOpen}
          onClose={() => setIsDirectPrintOpen(false)}
          printers={printers}
          filaments={filaments}
          selectedPrinterId={selectedPrinterId}
          selectedFilamentId={selectedFilamentId}
          theme={theme}
          jobData={{
            job_name: parsedModel.fileName.replace(/\.(stl|gcode|3mf|step|stp|obj)$/i, ''),
            modelName: parsedModel.fileName,
            file_name: parsedModel.fileName,
            estimated_time_minutes: parsedModel.estimatedTimeMinutes,
            printTimeMinutes: parsedModel.estimatedTimeMinutes,
            filament_used_g: parsedModel.estimatedWeightGrams,
            weightGrams: parsedModel.estimatedWeightGrams,
            filament_id: selectedFilamentId,
            filament_name: activeFilament?.name,
            total_cost: Number(((parsedModel.estimatedWeightGrams / 1000) * (activeFilament?.price_per_kg || 120)).toFixed(2)),
            copies: 1,
            dimensions: parsedModel.dimensions,
          }}
          onPrintDispatched={() => {
            setSentSuccess(true);
            setTimeout(() => setSentSuccess(false), 3500);
          }}
        />
      )}
    </div>
  );
};
