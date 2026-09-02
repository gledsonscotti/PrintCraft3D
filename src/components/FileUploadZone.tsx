import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Upload,
  FileCode,
  Layers,
  Sliders,
  Sparkles,
  Cpu,
  Box,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ParsedModelResult,
  parseUniversal3DFile,
  getFileExtension
} from '../utils/fileParsers';
import { Filament } from '../types';

interface FileUploadZoneProps {
  onModelLoaded: (
    result: ParsedModelResult,
    buffer?: ArrayBuffer,
    object3D?: THREE.Object3D
  ) => void;
  selectedFilament?: Filament | null;
  activeModelName?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onModelLoaded,
  selectedFilament,
  activeModelName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState(0.2);
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

  // Quick Preset Samples for immediate 1-click testing
  const loadPreset = (type: 'keychain' | 'phone_stand' | 'gear' | 'vase' | 'bambu_3mf' | 'cad_bracket') => {
    if (type === 'keychain') {
      onModelLoaded({
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
    } else if (type === 'phone_stand') {
      onModelLoaded({
        fileName: 'suporte_smartphone_ergonomico.stl',
        fileType: 'stl',
        formatLabel: 'STL (Standard Triangle)',
        category: 'mesh',
        dimensions: { x: 80, y: 75, z: 60 },
        volumeCm3: 28.6,
        estimatedWeightGrams: 42.0,
        estimatedTimeMinutes: 95,
        layerCount: 300,
        layerHeightMm: 0.2,
        filamentLengthMeters: 14.1,
        infillPercent: 20,
        trianglesCount: 18400,
      });
    } else if (type === 'gear') {
      onModelLoaded({
        fileName: 'engrenagem_mecanica_toolpath.gcode',
        fileType: 'gcode',
        formatLabel: 'G-Code (Fatiado / Trajetória)',
        category: 'toolpath',
        dimensions: { x: 48, y: 48, z: 12 },
        volumeCm3: 16.2,
        estimatedWeightGrams: 28.0,
        estimatedTimeMinutes: 62,
        layerCount: 60,
        layerHeightMm: 0.2,
        filamentLengthMeters: 9.4,
        infillPercent: 30,
        rawGcodeDetails: {
          slicer: 'PrusaSlicer 2.7',
          nozzleTemp: 210,
          bedTemp: 60,
          timeRaw: '1h 2m',
        },
      });
    } else if (type === 'bambu_3mf') {
      onModelLoaded({
        fileName: 'container_modular_tampa_rosca.3mf',
        fileType: '3mf',
        formatLabel: '3MF (3D Manufacturing Format)',
        category: 'mesh',
        dimensions: { x: 52, y: 52, z: 42 },
        volumeCm3: 22.8,
        estimatedWeightGrams: 36.5,
        estimatedTimeMinutes: 84,
        layerCount: 210,
        layerHeightMm: 0.2,
        filamentLengthMeters: 12.3,
        infillPercent: 20,
        trianglesCount: 26800,
        partsCount: 2,
      });
    } else if (type === 'cad_bracket') {
      onModelLoaded({
        fileName: 'flange_fixacao_industrial.step',
        fileType: 'step',
        formatLabel: 'STEP / STP (CAD ISO 10303)',
        category: 'cad',
        dimensions: { x: 60, y: 45, z: 35 },
        volumeCm3: 31.2,
        estimatedWeightGrams: 48.0,
        estimatedTimeMinutes: 110,
        layerCount: 175,
        layerHeightMm: 0.2,
        filamentLengthMeters: 16.2,
        infillPercent: 25,
        trianglesCount: 14500,
        cadDetails: {
          cadSystem: 'Autodesk Fusion 360 / STEP AP214',
          isAssembly: false,
        },
      });
    } else if (type === 'vase') {
      onModelLoaded({
        fileName: 'mini_vaso_geometrico.stl',
        fileType: 'stl',
        formatLabel: 'STL (Standard Triangle)',
        category: 'mesh',
        dimensions: { x: 36, y: 36, z: 45 },
        volumeCm3: 14.0,
        estimatedWeightGrams: 32.0,
        estimatedTimeMinutes: 75,
        layerCount: 225,
        layerHeightMm: 0.2,
        filamentLengthMeters: 10.7,
        infillPercent: 15,
        trianglesCount: 8900,
      });
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
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Ajuste de Parâmetros de Fatiamento (STL, 3MF & CAD)
          </span>
          <span className="text-[11px] text-slate-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
            {selectedFilament?.material || 'PLA'} ({selectedFilament?.density || 1.24} g/cm³)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Preenchimento (Infill):</span>
              <span className="font-bold text-sky-400 font-mono">{infill}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={infill}
              onChange={(e) => setInfill(Number(e.target.value))}
              className="w-full accent-sky-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
            />
          </div>

          <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-3.5">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Altura de Camada:</span>
              <span className="font-bold text-sky-400 font-mono">{layerHeight} mm</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.12, 0.16, 0.20, 0.28].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setLayerHeight(h)}
                  className={`text-xs py-1 rounded-xl border text-center font-mono transition ${
                    layerHeight === h
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 font-bold'
                      : 'bg-[#16161A] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  {h}mm
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Presets Including 3MF and CAD STEP */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Peças de Exemplo para Testar Todos os Formatos:
          </span>
          {activeModelName && (
            <span className="text-xs text-emerald-400 font-medium font-mono truncate max-w-[200px]">
              {activeModelName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Preset 1: Chaveiro STL */}
          <button
            type="button"
            onClick={() => loadPreset('keychain')}
            className="text-left bg-[#121215] hover:bg-[#1A1A1E] border border-white/[0.08] hover:border-sky-400/40 p-3 rounded-2xl transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                Chaveiro Tag
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                STL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">14.5g • 38min • 4.5mm</p>
          </button>

          {/* Preset 2: Suporte Celular STL */}
          <button
            type="button"
            onClick={() => loadPreset('phone_stand')}
            className="text-left bg-[#121215] hover:bg-[#1A1A1E] border border-white/[0.08] hover:border-sky-400/40 p-3 rounded-2xl transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                Suporte Celular
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                STL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">42.0g • 1h35 • 60mm</p>
          </button>

          {/* Preset 3: 3MF Bambu / Prusa Multi-part */}
          <button
            type="button"
            onClick={() => loadPreset('bambu_3mf')}
            className="text-left bg-[#121215] hover:bg-[#1A1A1E] border border-amber-500/20 hover:border-amber-400/50 p-3 rounded-2xl transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100 transition">
                Pote C/ Tampa
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                3MF
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">36.5g • 1h24 • 2 Peças</p>
          </button>

          {/* Preset 4: CAD STEP / STP */}
          <button
            type="button"
            onClick={() => loadPreset('cad_bracket')}
            className="text-left bg-[#121215] hover:bg-[#1A1A1E] border border-emerald-500/20 hover:border-emerald-400/50 p-3 rounded-2xl transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-200 group-hover:text-emerald-100 transition">
                Flange Fixação
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CAD STEP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">48.0g • 1h50 • B-Rep</p>
          </button>

          {/* Preset 5: G-Code Toolpath */}
          <button
            type="button"
            onClick={() => loadPreset('gear')}
            className="text-left bg-[#121215] hover:bg-[#1A1A1E] border border-indigo-500/20 hover:border-indigo-400/50 p-3 rounded-2xl transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-200 group-hover:text-indigo-100 transition">
                Engrenagem
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                G-CODE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">28.0g • 1h02 • Trajetória</p>
          </button>

          {/* Preset 6: Mini Vaso Geometrico */}
          <button
            type="button"
            onClick={() => loadPreset('vase')}
            className="text-left bg-[#121215] hover:bg-[#1A1A1E] border border-white/[0.08] hover:border-sky-400/40 p-3 rounded-2xl transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                Vaso Decor
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                STL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">32.0g • 1h15 • 45mm</p>
          </button>
        </div>
      </div>
    </div>
  );
};
