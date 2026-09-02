import React, { useRef, useState } from 'react';
import { Upload, FileCode, Layers, Sliders, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { ParsedModelResult, parseGCodeText, parseSTLBuffer } from '../utils/fileParsers';
import { Filament } from '../types';

interface FileUploadZoneProps {
  onModelLoaded: (result: ParsedModelResult, buffer?: ArrayBuffer) => void;
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
  const [lastUploadedType, setLastUploadedType] = useState<string>('sample');

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    const fileName = file.name;
    const lower = fileName.toLowerCase();

    try {
      if (lower.endsWith('.stl')) {
        const buffer = await file.arrayBuffer();
        const density = selectedFilament?.density || 1.24;
        const parsed = parseSTLBuffer(buffer, fileName, density, infill, 1.2, layerHeight);
        setLastUploadedType('stl');
        onModelLoaded(parsed, buffer);
      } else if (lower.endsWith('.gcode')) {
        const text = await file.text();
        const density = selectedFilament?.density || 1.24;
        const parsed = parseGCodeText(text, fileName, density, selectedFilament?.diameter || 1.75);
        setLastUploadedType('gcode');
        onModelLoaded(parsed);
      } else {
        alert('Por favor, selecione um arquivo .STL ou .GCODE');
      }
    } catch (e: any) {
      console.error('Erro ao processar arquivo 3D:', e);
      alert('Falha ao processar arquivo 3D: ' + (e.message || 'Formato inválido'));
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
  const loadPreset = (type: 'keychain' | 'phone_stand' | 'gear' | 'vase') => {
    if (type === 'keychain') {
      onModelLoaded({
        fileName: 'chaveiro_tag_personalizado.stl',
        fileType: 'stl',
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
      setLastUploadedType('keychain');
    } else if (type === 'phone_stand') {
      onModelLoaded({
        fileName: 'suporte_smartphone_mesa.stl',
        fileType: 'stl',
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
      setLastUploadedType('phone_stand');
    } else if (type === 'gear') {
      onModelLoaded({
        fileName: 'engrenagem_mecanica.gcode',
        fileType: 'gcode',
        dimensions: { x: 48, y: 48, z: 10 },
        volumeCm3: 16.2,
        estimatedWeightGrams: 28.0,
        estimatedTimeMinutes: 62,
        layerCount: 50,
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
      setLastUploadedType('gear');
    } else if (type === 'vase') {
      onModelLoaded({
        fileName: 'mini_vaso_geometrico.stl',
        fileType: 'stl',
        dimensions: { x: 36, y: 36, z: 45 },
        volumeCm3: 14.0,
        estimatedWeightGrams: 32.0,
        estimatedTimeMinutes: 75,
        layerCount: 225,
        layerHeightMm: 0.2,
        filamentLengthMeters: 10.7,
        infillPercent: 15,
      });
      setLastUploadedType('vase');
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone Area */}
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
          accept=".stl,.gcode"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
        />

        <div className="flex flex-col items-center justify-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-white/[0.1] flex items-center justify-center text-sky-400 shadow-sm transition">
            {loading ? (
              <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Arraste seu arquivo <span className="text-sky-400">.STL</span> ou{' '}
              <span className="text-indigo-400">.GCODE</span> aqui
            </p>
            <p className="text-xs text-slate-400 mt-1">ou clique para selecionar do seu computador</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2 text-[11px] text-slate-400 mt-1">
            <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/[0.08] font-mono">
              <Layers className="w-3 h-3 text-sky-400" />
              Volume & peso automáticos
            </span>
            <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/[0.08] font-mono">
              <FileCode className="w-3 h-3 text-indigo-400" />
              Tempo & temperaturas G-Code
            </span>
          </div>
        </div>
      </div>

      {/* Model Slicing Adjusters for STL */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 space-y-3.5 shadow-sm shadow-black/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Parâmetros de Fatiamento (Para arquivos STL)
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
              min="10"
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

      {/* Quick Test Presets */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Peças de Exemplo para Testar Imediatamente:
          </span>
          {activeModelName && (
            <span className="text-xs text-emerald-400 font-medium font-mono truncate max-w-[200px]">
              {activeModelName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => loadPreset('keychain')}
            className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
              lastUploadedType === 'keychain'
                ? 'bg-sky-500/10 border-sky-400/60 text-sky-200 shadow-sm'
                : 'bg-[#121215] border-white/[0.08] hover:border-white/[0.16] text-slate-300'
            }`}
          >
            <span className="text-xs font-bold text-white">Chaveiro 3D Tag</span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">14.5g • 38 min</span>
            <span className="text-[10px] text-sky-400 font-medium mt-1">STL com furo</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('phone_stand')}
            className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
              lastUploadedType === 'phone_stand'
                ? 'bg-sky-500/10 border-sky-400/60 text-sky-200 shadow-sm'
                : 'bg-[#121215] border-white/[0.08] hover:border-white/[0.16] text-slate-300'
            }`}
          >
            <span className="text-xs font-bold text-white">Suporte Celular</span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">42g • 95 min</span>
            <span className="text-[10px] text-sky-400 font-medium mt-1">STL Articulado</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('gear')}
            className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
              lastUploadedType === 'gear'
                ? 'bg-indigo-500/10 border-indigo-400/60 text-indigo-200 shadow-sm'
                : 'bg-[#121215] border-white/[0.08] hover:border-white/[0.16] text-slate-300'
            }`}
          >
            <span className="text-xs font-bold text-white">Engrenagem</span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">28g • 62 min</span>
            <span className="text-[10px] text-indigo-400 font-medium mt-1">G-Code Slicado</span>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('vase')}
            className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
              lastUploadedType === 'vase'
                ? 'bg-sky-500/10 border-sky-400/60 text-sky-200 shadow-sm'
                : 'bg-[#121215] border-white/[0.08] hover:border-white/[0.16] text-slate-300'
            }`}
          >
            <span className="text-xs font-bold text-white">Mini Vaso Decor</span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">32g • 75 min</span>
            <span className="text-[10px] text-sky-400 font-medium mt-1">STL Facetado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
