import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Upload,
  Sliders,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  ParsedModelResult,
  parseUniversal3DFile,
  getFileExtension
} from '../utils/fileParsers';
import { Filament, AiOptimizationResult, SlicingProfile } from '../types';

interface FileUploadZoneProps {
  onModelLoaded: (
    result: ParsedModelResult,
    buffer?: ArrayBuffer,
    object3D?: THREE.Object3D
  ) => void;
  selectedFilament?: Filament | null;
  activeModelName?: string;
  onRequestAiOptimization?: () => void;
  loadingAi?: boolean;
  aiOptimizationResult?: AiOptimizationResult | null;
  onOpenAdvisorModal?: () => void;
  activeProfileAppliedId?: string | null;
  onApplyProfile?: (profile: SlicingProfile) => void;
  aiTips?: string[];
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onModelLoaded,
  selectedFilament,
  activeModelName,
  onRequestAiOptimization,
  loadingAi,
  aiOptimizationResult,
  onOpenAdvisorModal,
  activeProfileAppliedId,
  onApplyProfile,
  aiTips,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState(0.20);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    setStatusMessage(`Interpretando geometria 3D & métricas de ${file.name}...`);
    const fileName = file.name;
    const ext = getFileExtension(fileName);

    const validExtensions = [
      'stl', 'gcode', 'gco', 'g', 'nc', '3mf', 'step', 'stp', 'iges', 'igs', 'obj', 'ply', 'amf', 'gltf', 'glb'
    ];

    if (!validExtensions.includes(ext)) {
      alert(
        `Formato não suportado (.${ext}). Por favor, envie arquivos de impressora 3D ou CAD: STL, G-Code, 3MF, STEP, STP, IGES, OBJ, PLY, AMF ou GLTF.`
      );
      setLoading(false);
      setStatusMessage(null);
      return;
    }

    try {
      const density = selectedFilament?.density || 1.24;
      const filamentDiameter = selectedFilament?.diameter || 1.75;

      const { result, object3D } = await parseUniversal3DFile(file, {
        density,
        infillPercent: infill,
        layerHeightMm: layerHeight,
        filamentDiameter,
        wallThicknessMm: 1.2,
      });

      let buffer: ArrayBuffer | undefined;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        // ignore
      }

      onModelLoaded(result, buffer, object3D);
      setStatusMessage(`Arquivo ${fileName} carregado com sucesso (${result.formatLabel})`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      console.error('Erro ao processar arquivo 3D:', e);
      alert('Falha ao processar arquivo 3D: ' + (e.message || 'Formato ou malha corrompida'));
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone Area with Multi-Format Support */}
      <div
        id="file-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
            : 'border-white/[0.1] hover:border-white/[0.2] bg-[#0A0A0B]/80 hover:bg-[#0A0A0B]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.gcode,.gco,.g,.nc,.3mf,.step,.stp,.iges,.igs,.obj,.ply,.amf,.gltf,.glb"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-white/[0.1] flex items-center justify-center text-sky-400 shadow-sm transition">
            {loading ? (
              <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Arraste seu arquivo <span className="text-sky-400">3D</span> ou <span className="text-emerald-400">CAD</span> aqui
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ou clique para carregar do computador (interpretação instantânea de volume e custo)
            </p>
          </div>

          {/* Formats Badges Grid */}
          <div className="flex flex-wrap justify-center items-center gap-1.5 max-w-lg mt-1">
            <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .STL
            </span>
            <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .GCODE
            </span>
            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .3MF (Bambu/Prusa)
            </span>
            <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .STEP / .STP (CAD)
            </span>
            <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .IGES
            </span>
            <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .OBJ / .PLY
            </span>
            <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold">
              .AMF / .GLTF
            </span>
          </div>

          {statusMessage && (
            <p className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      {/* Model Slicing Adjusters for Mesh & CAD */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 space-y-3.5 shadow-sm shadow-black/40">
        {/* Title and Filament Badge on one clean row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight whitespace-nowrap">
              Parâmetros de Fatiamento (STL, 3MF & CAD)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/[0.06] shrink-0 whitespace-nowrap">
            {selectedFilament?.material || 'PLA'} ({selectedFilament?.density || 1.24} g/cm³)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Preenchimento (Infill) */}
          <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-300 font-medium">Preenchimento (Infill):</span>
              <span className="font-bold text-sky-400 font-mono text-xs">{infill}%</span>
            </div>
            <div className="space-y-1.5 pt-0.5">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={infill}
                onChange={(e) => setInfill(Number(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
                <span>10% (leve)</span>
                <span>20% (padrão)</span>
                <span>100% (maciço)</span>
              </div>
            </div>
          </div>

          {/* Altura de Camada */}
          <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-300 font-medium">Altura de Camada:</span>
              <span className="font-bold text-sky-400 font-mono text-xs">
                {layerHeight.toFixed(2)} mm
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {[
                { value: 0.12, label: '0.12mm' },
                { value: 0.16, label: '0.16mm' },
                { value: 0.20, label: '0.20mm' },
                { value: 0.28, label: '0.28mm' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayerHeight(opt.value)}
                  className={`layer-preset-btn text-xs py-1.5 px-1 rounded-xl border text-center font-mono transition cursor-pointer select-none ${
                    Math.abs(layerHeight - opt.value) < 0.001
                      ? 'layer-preset-active bg-sky-500/20 border-sky-400/60 text-sky-300 font-bold shadow-sm'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] hover:border-white/[0.15]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Otimizador Inteligente de Fatiamento (Posicionado Diretamente Abaixo dos Parâmetros) */}
      {onRequestAiOptimization && (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 space-y-3.5 shadow-sm shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              Otimizador Inteligente de Fatiamento
            </span>
            <button
              type="button"
              onClick={() => {
                if (aiOptimizationResult && onOpenAdvisorModal) {
                  onOpenAdvisorModal();
                } else {
                  onRequestAiOptimization();
                }
              }}
              disabled={loadingAi}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
            >
              {loadingAi
                ? 'Analisando modelo com IA...'
                : aiOptimizationResult
                ? 'Abrir Estúdio Completo →'
                : 'Obter Recomendações →'}
            </button>
          </div>

          {/* Quick Profile Cards if AI result available */}
          {aiOptimizationResult && (
            <div className="space-y-2.5 animate-fadeIn">
              <div className="grid grid-cols-3 gap-2">
                {aiOptimizationResult.profiles.map((p) => {
                  const isApplied = activeProfileAppliedId === p.id;
                  const isEco = p.id === 'eco';
                  const isStrength = p.id === 'strength';
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border transition flex flex-col justify-between ${
                        isApplied
                          ? 'border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40'
                          : 'border-white/[0.08] bg-[#0A0A0E] hover:border-white/[0.18]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              isEco
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isStrength
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-sky-500/20 text-sky-300'
                            }`}
                          >
                            {p.badge}
                          </span>
                          {isApplied && (
                            <span className="text-[10px] text-emerald-400 font-bold">✓ Ativo</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-200 block leading-tight line-clamp-1">
                          {p.name.split('(')[0]}
                        </span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-mono">
                          {p.estimatedWeightGrams}g / {p.estimatedTimeMinutes}m
                        </span>
                        {onApplyProfile && (
                          <button
                            type="button"
                            onClick={() => onApplyProfile(p)}
                            className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer"
                          >
                            Aplicar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {onOpenAdvisorModal && (
                <button
                  type="button"
                  onClick={onOpenAdvisorModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-sky-500/10 hover:from-amber-500/20 hover:to-sky-500/20 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2 transition font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Ver Parecer com Imagem & Dicas Detalhadas do Fatiador →
                </button>
              )}
            </div>
          )}

          {aiTips && aiTips.length > 0 && !aiOptimizationResult && (
            <div className="bg-[#0A0A0B]/80 border border-amber-500/30 rounded-2xl p-3.5 space-y-2 animate-fadeIn">
              {aiTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
