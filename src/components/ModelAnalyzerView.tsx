import React, { useState, useRef } from 'react';
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
  Info
} from 'lucide-react';
import { AppSettings, AppTheme, Filament, Printer, AiOptimizationResult } from '../types';
import { ParsedModelResult } from '../utils/fileParsers';
import { ModelViewer3D } from './ModelViewer3D';
import { FileUploadZone } from './FileUploadZone';
import { SlicingAdvisorModal } from './SlicingAdvisorModal';

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
}

export const ModelAnalyzerView: React.FC<ModelAnalyzerViewProps> = ({
  printers,
  filaments,
  settings,
  theme = 'standard',
  onNavigateToCalculator,
}) => {
  const [modelBuffer, setModelBuffer] = useState<ArrayBuffer | null>(null);
  const [modelObject, setModelObject] = useState<THREE.Object3D | null>(null);
  const [sampleType, setSampleType] = useState<'keychain' | 'phone_stand' | 'gear' | 'vase' | 'bambu_3mf' | 'cad_bracket'>('keychain');
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

  // AI Advisor & Optimizer states
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState<boolean>(false);
  const [aiOptimizationResult, setAiOptimizationResult] = useState<AiOptimizationResult | null>(null);
  const [aiTips, setAiTips] = useState<string[]>([
    'Geometria otimizada para impressão vertical com suporte orgânico leve.',
    'Recomendado 3 paredes perimetrais para garantir resistência mecânica na presilha.',
    'Infill giroide de 20% proporciona excelente relação peso/resistência sem vibrações.',
  ]);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const canvasSnapshotGetterRef = useRef<(() => string | null) | null>(null);

  const handleModelLoaded = (
    result: ParsedModelResult,
    buffer?: ArrayBuffer,
    object3D?: THREE.Object3D
  ) => {
    setParsedModel(result);
    if (object3D) {
      setModelObject(object3D);
      setModelBuffer(buffer || null);
    } else if (result.threeObject) {
      setModelObject(result.threeObject);
      setModelBuffer(buffer || null);
    } else if (buffer) {
      setModelBuffer(buffer);
      setModelObject(null);
    } else {
      setModelBuffer(null);
      setModelObject(null);
    }
  };

  const handleRequestAiOptimization = async () => {
    setLoadingAi(true);
    try {
      let snapshotDataUrl: string | null = null;
      if (canvasSnapshotGetterRef.current) {
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
      // Fallback local smart advisor
      setAiOptimizationResult({
        diagnostic: {
          pieceType: 'Peça Mecânica / Sólido 3D',
          structuralAnalysis: 'Geometria balanceada com boa distribuição de massa.',
          idealBedOrientation: 'Base plana para maior aderência.',
          supportNeeded: 'Suportes mínimos necessários.',
          layerAdhesionTips: 'Manter temperatura estável do bico.',
        },
        profiles: [],
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
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualizador universal de malhas (STL, 3MF, STEP, G-code), análise de geometria e otimizador inteligente por IA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestAiOptimization}
            disabled={loadingAi}
            className="px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <Sparkles className={`w-4 h-4 text-amber-400 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>{loadingAi ? 'Analisando Malha...' : 'Otimizador IA'}</span>
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

      {/* Main Stack: Interactive 3D Viewer at Top, File Upload & Parameters Directly Below */}
      <div className="space-y-6">
        {/* 1. Visualizador 3D Interativo (Prominent Top Section) */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-sky-400" />
              Visualizador 3D Interativo
            </h2>
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
              onSnapshotReady={(getter) => {
                canvasSnapshotGetterRef.current = getter;
              }}
            />
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
            sampleType={sampleType}
            setSampleType={setSampleType}
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
                <span className="text-slate-400 font-sans">Dimensões (X × Y × Z):</span>
                <span className="text-white font-bold">
                  {parsedModel.dimensions.x} × {parsedModel.dimensions.y} × {parsedModel.dimensions.z} mm
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
          fileName={parsedModel.fileName}
          dimensions={parsedModel.dimensions}
          volumeCm3={parsedModel.volumeCm3}
          trianglesCount={parsedModel.trianglesCount}
          optimizationResult={aiOptimizationResult}
          snapshotDataUrl={canvasSnapshotGetterRef.current ? canvasSnapshotGetterRef.current() : null}
          onApplyProfile={(profile) => {
            setParsedModel((prev) => ({
              ...prev,
              layerHeightMm: profile.layer_height,
              infillPercent: profile.infill_percent,
              estimatedWeightGrams: profile.estimated_filament_grams,
              estimatedTimeMinutes: profile.estimated_time_minutes,
            }));
            setIsAdvisorModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
