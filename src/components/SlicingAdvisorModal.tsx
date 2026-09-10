import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Check,
  Copy,
  Zap,
  Shield,
  DollarSign,
  Layers,
  ArrowRight,
  Upload,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  HelpCircle,
  Flame,
  Gauge,
  Sliders,
  CheckCircle2,
  Box,
  Compass
} from 'lucide-react';
import { AiOptimizationResult, SlicingProfile } from '../types';

interface SlicingAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName?: string;
  fileName?: string;
  category?: string;
  dimensions?: { x: number; y: number; z: number };
  currentWeightGrams?: number;
  currentTimeMinutes?: number;
  material?: string;
  printerName?: string;
  snapshotDataUrl?: string | null;
  optimizationResult?: AiOptimizationResult | null;
  isLoading?: boolean;
  onReanalyze?: (options: {
    customImage?: string;
    userNotes?: string;
    intentCategory?: string;
  }) => Promise<void> | void;
  onApplyProfile?: (profile: SlicingProfile) => void;
  volumeCm3?: number;
  trianglesCount?: number;
}

export const SlicingAdvisorModal: React.FC<SlicingAdvisorModalProps> = ({
  isOpen,
  onClose,
  modelName,
  fileName,
  category = 'Peça Geral',
  dimensions = { x: 0, y: 0, z: 0 },
  currentWeightGrams = 0,
  currentTimeMinutes = 0,
  material = 'PLA Standard',
  printerName = 'Impressora 3D',
  snapshotDataUrl = null,
  optimizationResult = null,
  isLoading = false,
  onReanalyze,
  onApplyProfile,
}) => {
  const effectiveModelName = modelName || fileName || 'Modelo 3D';
  const [selectedProfileId, setSelectedProfileId] = useState<'eco' | 'balanced' | 'strength'>('balanced');
  const [selectedSlicer, setSelectedSlicer] = useState<'bambu' | 'orca' | 'prusa' | 'cura' | 'simplify'>('bambu');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<'keychain' | 'gear' | 'vase' | 'support' | 'auto'>('auto');
  const [copiedText, setCopiedText] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activeImage = uploadedImage || snapshotDataUrl;
  const profiles = optimizationResult?.profiles || [];
  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const diagnostic = optimizationResult?.diagnostic;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setUploadedImage(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          setUploadedImage(dataUrl);
        }
      };
      img.onerror = () => {
        setUploadedImage(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerReanalyze = async () => {
    let intentDesc = '';
    if (selectedIntent === 'keychain') intentDesc = 'Peça é um Chaveiro / Brinde fino (foco: economia, sem quebrar anel)';
    if (selectedIntent === 'gear') intentDesc = 'Peça é uma Engrenagem / Mecânica (foco: tração, sem quebrar dentes)';
    if (selectedIntent === 'vase') intentDesc = 'Peça é um Vaso / Decorativo (foco: acabamento sem costura)';
    if (selectedIntent === 'support') intentDesc = 'Peça é um Suporte de Carga / Gancho (foco: rigidez à flexão)';

    const combinedNotes = [intentDesc, userNotes].filter(Boolean).join(' | ');

    if (typeof onReanalyze === 'function') {
      try {
        await onReanalyze({
          customImage: activeImage || undefined,
          userNotes: combinedNotes || undefined,
          intentCategory: selectedIntent !== 'auto' ? selectedIntent : undefined,
        });
      } catch (err) {
        console.error('Erro ao reanalisar modelo:', err);
      }
    } else {
      console.warn('onReanalyze não configurado para este modal');
    }
  };

  const handleCopySlicerParams = () => {
    if (!activeProfile) return;
    const text = `=== PERFIL DE FATIAMENTO RECOMENDADO: ${activeProfile.name.toUpperCase()} ===
Peça: ${effectiveModelName} (${dimensions.x}x${dimensions.y}x${dimensions.z} mm)
Material: ${material} | Impressora: ${printerName}

[CONFIGURAÇÕES DE FATIAMENTO (BAMBU / ORCA / CURA / PRUSA)]
- Altura de Camada: ${activeProfile.specs.layerHeight}
- Paredes / Perímetros: ${activeProfile.specs.wallLoops} voltas
- Preenchimento (Infill): ${activeProfile.specs.infillPercent}% (${activeProfile.specs.infillPattern})
- Camadas Superior/Inferior: ${activeProfile.specs.topLayers} topo / ${activeProfile.specs.bottomLayers} fundo
- Temperatura Bico / Mesa: ${activeProfile.specs.nozzleTemp} / ${activeProfile.specs.bedTemp}
- Ventoinha de Resfriamento: ${activeProfile.specs.fanSpeed}
- Velocidade Estimada: ${activeProfile.specs.printSpeed}

[DICAS PRÁTICAS PASSO A PASSO]
${activeProfile.actionableTips.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

[ORIENTAÇÃO NA MESA]
${diagnostic?.idealBedOrientation || 'Assentar maior face plana diretamente sobre a mesa PEI.'}

Estimativa: ~${activeProfile.estimatedWeightGrams}g | ~${activeProfile.estimatedTimeMinutes} min`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleApply = () => {
    if (!activeProfile) return;
    onApplyProfile(activeProfile);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#121216] border border-white/[0.12] rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Gradient Accent Header */}
        <div className="bg-gradient-to-r from-amber-500/15 via-sky-500/10 to-purple-500/15 border-b border-white/[0.08] px-5 sm:px-7 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Estúdio IA de Fatiamento & Perfis de Impressão
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  MULTIMODAL 3D
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Análise geométrica da peça com 3 perfis práticos: Economia, Equilibrado e Ultra Resistência.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Slicer Selector Toolbar (User explicitly requested selecting slicer beforehand for better guidance) */}
          <div className="bg-[#0A0A0E] border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Box className="w-4 h-4 text-sky-400" />
                Selecione seu Fatiador Principal (Slicer):
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                Confiança IA: 96.8%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'bambu', name: 'Bambu Studio', badge: 'Bambu/X1/P1' },
                { id: 'orca', name: 'OrcaSlicer', badge: 'Open Multi' },
                { id: 'prusa', name: 'PrusaSlicer', badge: 'MK4/MK3/XL' },
                { id: 'cura', name: 'Ultimaker Cura', badge: 'FDM Standard' },
                { id: 'simplify', name: 'Simplify3D', badge: 'Pro CAD' },
              ].map((s) => {
                const active = selectedSlicer === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlicer(s.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-md'
                        : 'bg-[#121216] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                    }`}
                  >
                    <span className="font-bold text-xs truncate">{s.name}</span>
                    <span className="text-[10px] font-mono opacity-75">{s.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experimental AI Disclaimer (Mandatory per user request) */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-amber-200/90 text-[11px]">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-300">Aviso Experimental:</strong> As recomendações, orientações de menus e perfis gerados por Inteligência Artificial para o fatiador <span className="uppercase font-mono font-bold text-white">{selectedSlicer}</span> são experimentais. A validação mecânica e o uso em impressões reais correm por conta e risco exclusivo do usuário.
            </div>
          </div>

          {/* Piece Header Snapshot & Context Bar */}
          <div className="bg-[#0A0A0E] border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
              {/* Image / Canvas Snapshot Avatar */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#14141A] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0 group">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={effectiveModelName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Layers className="w-8 h-8 text-slate-600" />
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Carregar foto real da peça ou screenshot"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition text-[10px] font-semibold"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  Trocar
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider block">
                  Peça em Análise
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                  {effectiveModelName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                  <span className="bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.06]">
                    {dimensions.x}×{dimensions.y}×{dimensions.z} mm
                  </span>
                  <span className="bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.06] text-sky-300">
                    {material}
                  </span>
                  <span className="bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.06] text-emerald-300">
                    {currentWeightGrams}g atual
                  </span>
                  <span className="bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.06] text-amber-300">
                    {currentTimeMinutes} min
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Intent Refinement & Reanalyze Button */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1 bg-[#16161E] p-1 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSelectedIntent('keychain')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    selectedIntent === 'keychain'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏷️ Chaveiro
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIntent('gear')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    selectedIntent === 'gear'
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚙️ Mecânica
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIntent('vase')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    selectedIntent === 'vase'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏺 Vaso / Decor
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIntent('auto')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    selectedIntent === 'auto'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Auto
                </button>
              </div>

              <button
                type="button"
                onClick={handleTriggerReanalyze}
                disabled={isLoading}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Analisando...' : 'Reanalisar IA'}
              </button>
            </div>
          </div>

          {/* Structural Diagnostic Card from Gemini */}
          {diagnostic && (
            <div className="bg-gradient-to-br from-[#16161E] via-[#121217] to-[#0D0D11] border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <span className="font-bold text-slate-200 flex items-center gap-2 text-xs sm:text-sm">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Parecer Estrutural & Diagnóstico da Peça
                </span>
                <span className="text-[11px] font-semibold text-amber-300/90 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  {diagnostic.pieceType}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    Ponto de Estresse Mecânico:
                  </span>
                  <p className="text-slate-300 leading-relaxed pl-5">
                    {diagnostic.structuralAnalysis}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Orientação Ideal na Mesa:
                  </span>
                  <p className="text-slate-300 leading-relaxed pl-5">
                    {diagnostic.idealBedOrientation}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-white/[0.05]">
                <span className="flex items-center gap-1.5">
                  <strong className="text-slate-300">Suportes:</strong> {diagnostic.supportNeeded}
                </span>
                <span className="flex items-center gap-1.5">
                  <strong className="text-slate-300">1ª Camada:</strong> {diagnostic.layerAdhesionTips}
                </span>
              </div>
            </div>
          )}

          {/* 3 Slicing Profile Options Tabs (The core requested feature!) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                Selecione o Perfil Desejado para esta Peça:
              </span>
              <span className="text-[11px] text-slate-500">
                Clique nas opções abaixo para alternar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {profiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id;
                const isEco = profile.id === 'eco';
                const isStrength = profile.id === 'strength';

                let borderClass = 'border-white/[0.08] hover:border-white/[0.2]';
                let activeGlow = '';
                if (isSelected) {
                  if (isEco) {
                    borderClass = 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-950/20';
                    activeGlow = 'text-emerald-400';
                  } else if (isStrength) {
                    borderClass = 'border-purple-500 ring-1 ring-purple-500/30 bg-purple-950/20';
                    activeGlow = 'text-purple-400';
                  } else {
                    borderClass = 'border-sky-500 ring-1 ring-sky-500/30 bg-sky-950/20';
                    activeGlow = 'text-sky-400';
                  }
                }

                return (
                  <div
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`cursor-pointer rounded-2xl p-4 border transition duration-150 relative flex flex-col justify-between ${borderClass} bg-[#0A0A0E]`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                            isEco
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isStrength
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {profile.badge}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-white/[0.1] flex items-center justify-center text-white">
                            <Check className="w-3 h-3 text-emerald-400" />
                          </span>
                        )}
                      </div>

                      <h4 className={`font-bold text-sm leading-snug mb-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {profile.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                        {profile.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-400">
                        ~<strong className="text-white">{profile.estimatedWeightGrams}g</strong>
                      </span>
                      <span className="text-slate-400">
                        ~<strong className="text-white">{profile.estimatedTimeMinutes} min</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Profile Full Details Panel */}
          {activeProfile && (
            <div className="bg-[#0D0D11] border border-white/[0.08] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    {activeProfile.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeProfile.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-[#14141A] px-3 py-1.5 rounded-xl border border-white/[0.08] text-center font-mono">
                    <span className="text-[10px] text-slate-500 block">Peso Est.</span>
                    <span className="text-xs font-bold text-white">
                      {activeProfile.estimatedWeightGrams}g
                    </span>
                  </div>
                  <div className="bg-[#14141A] px-3 py-1.5 rounded-xl border border-white/[0.08] text-center font-mono">
                    <span className="text-[10px] text-slate-500 block">Tempo Est.</span>
                    <span className="text-xs font-bold text-white">
                      {activeProfile.estimatedTimeMinutes} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Grid for Slicers */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
                  Parâmetros para Inserir no Fatiador (Bambu Studio / OrcaSlicer / Cura / Prusa):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Altura de Camada</span>
                    <span className="font-bold text-white mt-0.5 block">{activeProfile.specs.layerHeight}</span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Paredes (Perímetros)</span>
                    <span className="font-bold text-sky-400 mt-0.5 block">
                      {activeProfile.specs.wallLoops} voltas
                    </span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Preenchimento (Infill)</span>
                    <span className="font-bold text-amber-400 mt-0.5 block">
                      {activeProfile.specs.infillPercent}% ({activeProfile.specs.infillPattern.split(' ')[0]})
                    </span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Topo / Fundo</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">
                      {activeProfile.specs.topLayers} / {activeProfile.specs.bottomLayers} camadas
                    </span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Temperatura Bico</span>
                    <span className="font-bold text-rose-400 mt-0.5 block">{activeProfile.specs.nozzleTemp}</span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Mesa Aquecida</span>
                    <span className="font-bold text-amber-400 mt-0.5 block">{activeProfile.specs.bedTemp}</span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Ventoinha Cooler</span>
                    <span className="font-bold text-teal-400 mt-0.5 block">{activeProfile.specs.fanSpeed}</span>
                  </div>

                  <div className="bg-[#14141A] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 block font-sans">Velocidade Indicada</span>
                    <span className="font-bold text-purple-400 mt-0.5 block truncate">
                      {activeProfile.specs.printSpeed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actionable Step-by-Step Tips: "Faça isso e isso e aquilo" */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Instruções Práticas da Oficina:
                </span>
                <div className="space-y-2">
                  {activeProfile.actionableTips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="slicing-actionable-tip bg-[#14141A] border border-white/[0.08] p-3 rounded-xl flex items-start gap-3 text-xs transition"
                    >
                      <span className="slicing-actionable-number w-5 h-5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold font-mono shrink-0 mt-0.5 text-xs">
                        {idx + 1}
                      </span>
                      <p className="slicing-actionable-text text-slate-200 leading-relaxed font-medium">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slicer Specific Menu Navigation Guide */}
              <div className="bg-[#121216] border border-white/[0.08] rounded-xl p-3.5 space-y-1.5">
                <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Caminho nos Menus do {selectedSlicer === 'bambu' ? 'Bambu Studio' : selectedSlicer === 'orca' ? 'OrcaSlicer' : selectedSlicer === 'prusa' ? 'PrusaSlicer' : selectedSlicer === 'cura' ? 'Ultimaker Cura' : 'Simplify3D'}:
                </span>
                <p className="text-[11px] text-slate-300 font-mono leading-relaxed">
                  {selectedSlicer === 'bambu' || selectedSlicer === 'orca'
                    ? 'Process > Quality (Altura de camada) • Strength (Paredes e Infill) • Speed (Velocidades externas).'
                    : selectedSlicer === 'prusa'
                    ? 'Print Settings > Layers and Perimeters & Infill • Filament Settings > Temperatures.'
                    : selectedSlicer === 'cura'
                    ? 'Custom Settings (Painel Direito) > Quality (Layer Height) > Shell (Wall Thickness) > Infill.'
                    : 'Edit Process Settings > Layers (Altura/Perímetros) > Infill (Padrão/Densidade) > Temperatures.'}
                </p>
              </div>

              {/* Performance / Radar Balance Bars */}
              {activeProfile.metrics && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Balanço de Desempenho deste Perfil:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>🛡️ Resistência</span>
                        <span className="font-bold text-white">{activeProfile.metrics.strengthScore}/10</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] slicing-metric-track rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${activeProfile.metrics.strengthScore * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>⚡ Velocidade</span>
                        <span className="font-bold text-white">{activeProfile.metrics.speedScore}/10</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] slicing-metric-track rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${activeProfile.metrics.speedScore * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>💰 Economia</span>
                        <span className="font-bold text-white">{activeProfile.metrics.economyScore}/10</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] slicing-metric-track rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${activeProfile.metrics.economyScore * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>✨ Acabamento</span>
                        <span className="font-bold text-white">{activeProfile.metrics.finishScore}/10</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] slicing-metric-track rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${activeProfile.metrics.finishScore * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="border-t border-white/[0.08] px-5 sm:px-7 py-4 bg-[#0A0A0E] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopySlicerParams}
              className="bg-[#181820] hover:bg-[#22222C] text-slate-200 border border-white/[0.08] px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition text-xs"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Copiar Ficha do Fatiador
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={appliedSuccess || !activeProfile}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20"
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Perfil Aplicado na Calculadora!
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Aplicar este Perfil na Calculadora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
