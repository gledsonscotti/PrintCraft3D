import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Printer as PrinterIcon,
  Flame,
  Zap,
  Clock,
  DollarSign,
  Package,
  CheckCircle2,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  BookmarkPlus,
  Play,
  Sparkles,
  Info,
  Scale,
  Layers,
  Wrench,
  Cpu,
  Boxes,
  Shield,
  Sliders
} from 'lucide-react';
import { AiOptimizationResult, AppSettings, AppTheme, ExtraSupplyItem, Filament, Printer, Product, SlicingProfile, Supply } from '../types';
import { ParsedModelResult } from '../utils/fileParsers';
import { calculatePieceCost } from '../utils/costCalculator';
import { ModelViewer3D } from './ModelViewer3D';
import { FileUploadZone } from './FileUploadZone';
import { SlicingAdvisorModal } from './SlicingAdvisorModal';
import { safeFetchJson } from '../utils/api';

interface CostCalculatorViewProps {
  printers: Printer[];
  filaments: Filament[];
  supplies: Supply[];
  settings: AppSettings;
  onRefreshData: () => void | Promise<void>;
  onNavigateToStock: () => void;
  theme?: AppTheme;
}

export const CostCalculatorView: React.FC<CostCalculatorViewProps> = ({
  printers,
  filaments,
  supplies,
  settings,
  onRefreshData,
  onNavigateToStock,
  theme = 'standard',
}) => {
  // Current active 3D Model state
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

  // Selected Equipment & Material
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(printers[0]?.id || '');
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>(filaments[0]?.id || '');

  // Formulator Parameters
  const [productName, setProductName] = useState('Chaveiro Tag Personalizado');
  const [productCategory, setProductCategory] = useState('Chaveiros & Brindes');
  const [customWeightGrams, setCustomWeightGrams] = useState<number>(14.5);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(38);
  const [lossMarginPercent, setLossMarginPercent] = useState<number>(10);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(5);
  const [markupPercent, setMarkupPercent] = useState<number>(120);

  // Bill of Materials (Insumos extras para chaveiro: argolas, embalagens, mosquetão, etc.)
  const [productSupplies, setProductSupplies] = useState<ExtraSupplyItem[]>([
    { supply_id: 'sup-1', name: 'Argola de Chaveiro com Corrente Italiana 25mm', qty: 1, unit_cost: 0.35 },
    { supply_id: 'sup-5', name: 'Saco Kraft c/ Visor e Fecho Zip 10x15cm', qty: 1, unit_cost: 0.45 },
  ]);

  // Selected supply to add
  const [supplyToAddId, setSupplyToAddId] = useState<string>('');
  const [supplyToAddQty, setSupplyToAddQty] = useState<number>(1);

  // Batch Print modal / state
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(null);

  // AI tips & Slicing Advisor
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState<boolean>(false);
  const [aiOptimizationResult, setAiOptimizationResult] = useState<AiOptimizationResult | null>(null);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const [activeProfileAppliedId, setActiveProfileAppliedId] = useState<string | null>(null);
  const canvasSnapshotGetterRef = useRef<(() => string | null) | null>(null);

  // Save product state
  const [savingProduct, setSavingProduct] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Set default printer & filament when available
  useEffect(() => {
    if (!selectedPrinterId && printers.length > 0) setSelectedPrinterId(printers[0].id);
    if (!selectedFilamentId && filaments.length > 0) setSelectedFilamentId(filaments[0].id);
  }, [printers, filaments]);

  const activePrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];
  const activeFilament = filaments.find((f) => f.id === selectedFilamentId) || filaments[0];

  // Update loss margin when printer changes if printer has specific failure rate
  useEffect(() => {
    if (activePrinter) {
      setLossMarginPercent(activePrinter.failure_rate_default || 10);
    }
  }, [selectedPrinterId]);

  // Handle Model Load from FileUploadZone
  const handleModelLoaded = (
    result: ParsedModelResult,
    buffer?: ArrayBuffer,
    object3D?: THREE.Object3D
  ) => {
    setParsedModel(result);
    setCustomWeightGrams(result.estimatedWeightGrams);
    setCustomTimeMinutes(result.estimatedTimeMinutes);

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
      const lower = result.fileName.toLowerCase();
      if (lower.includes('chaveiro')) setSampleType('keychain');
      else if (lower.includes('suporte')) setSampleType('phone_stand');
      else if (lower.includes('engrenagem') || result.fileType === 'gcode') setSampleType('gear');
      else if (lower.includes('container') || lower.includes('tampa') || result.fileType === '3mf') setSampleType('bambu_3mf');
      else if (lower.includes('flange') || result.fileType === 'step' || result.fileType === 'stp' || result.fileType === 'iges') setSampleType('cad_bracket');
      else setSampleType('vase');
    }

    // Auto-update product name from file name
    const cleanName = result.fileName
      .replace(/\.(stl|gcode|gco|g|nc|3mf|step|stp|iges|igs|obj|ply|amf|gltf|glb)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    setProductName(cleanName);
  };

  // Perform Cost Calculation
  const costResult = calculatePieceCost({
    filamentWeightGrams: customWeightGrams,
    printTimeMinutes: customTimeMinutes,
    filament: activeFilament,
    printer: activePrinter,
    supplies: productSupplies,
    settings,
    customLossMargin: lossMarginPercent,
    prepTimeMinutes,
    markupPercent,
  });

  // Supplies handlers
  const handleAddSupply = () => {
    if (!supplyToAddId) return;
    const supply = supplies.find((s) => s.id === supplyToAddId);
    if (!supply) return;

    const existingIndex = productSupplies.findIndex((item) => item.supply_id === supply.id);
    if (existingIndex >= 0) {
      const updated = [...productSupplies];
      updated[existingIndex].qty += supplyToAddQty;
      setProductSupplies(updated);
    } else {
      setProductSupplies([
        ...productSupplies,
        {
          supply_id: supply.id,
          name: supply.name,
          qty: supplyToAddQty,
          unit_cost: supply.unit_cost,
        },
      ]);
    }
    setSupplyToAddId('');
    setSupplyToAddQty(1);
  };

  const handleRemoveSupply = (index: number) => {
    setProductSupplies(productSupplies.filter((_, i) => i !== index));
  };

  const handleUpdateSupplyQty = (index: number, newQty: number) => {
    const updated = [...productSupplies];
    updated[index].qty = Math.max(1, newQty);
    setProductSupplies(updated);
  };

  // Save as Product
  const handleSaveProduct = async () => {
    setSavingProduct(true);
    setSaveSuccessMessage(null);
    try {
      const payload = {
        name: productName,
        category: productCategory,
        description: `Produto formado com ${customWeightGrams}g de ${activeFilament?.material || 'filamento'} e ${productSupplies.length} insumos adicionais.`,
        stl_filename: parsedModel.fileType === 'stl' ? parsedModel.fileName : '',
        gcode_filename: parsedModel.fileType === 'gcode' ? parsedModel.fileName : '',
        printer_id: activePrinter?.id || '',
        filament_id: activeFilament?.id || '',
        filament_weight_g: customWeightGrams,
        print_time_minutes: customTimeMinutes,
        energy_cost: costResult.energyCost,
        filament_cost: costResult.filamentCost,
        loss_margin_percent: lossMarginPercent,
        depreciation_cost: costResult.depreciationCost,
        labor_cost: costResult.laborCost,
        extra_supplies_json: JSON.stringify(productSupplies),
        extra_supplies_cost: costResult.suppliesCost,
        total_cost: costResult.totalProductionCost,
        markup_percent: markupPercent,
        suggested_price: costResult.suggestedSalePrice,
        sale_price: costResult.suggestedSalePrice,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccessMessage(`"${productName}" salvo com sucesso no catálogo!`);
        await onRefreshData();
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert('Erro ao salvar produto: ' + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  // Execute Print Job & Deduct Real-Time Stock
  const handleExecutePrintJob = async () => {
    setIsPrinting(true);
    setPrintSuccessMessage(null);

    try {
      const payload = {
        product_name: productName,
        printer_id: activePrinter?.id || '',
        filament_id: activeFilament?.id || '',
        quantity: printQuantity,
        filament_used_g: customWeightGrams,
        total_time_minutes: customTimeMinutes,
        total_cost: costResult.totalProductionCost,
        supplies_used: productSupplies.map((s) => ({
          supply_id: s.supply_id,
          name: s.name,
          qty: s.qty,
        })),
        status: 'completed',
      };

      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const totalGrams = (customWeightGrams * printQuantity).toFixed(1);
        setPrintSuccessMessage(
          `Impressão de ${printQuantity}x "${productName}" confirmada! Baixa automática realizada: ${totalGrams}g de filamento e ${productSupplies.length} insumos debitados do SQLite em tempo real.`
        );
        await onRefreshData();
        setTimeout(() => setPrintSuccessMessage(null), 6000);
      }
    } catch (err: any) {
      alert('Erro ao registrar impressão: ' + err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  // Request AI Optimization & Slicing Profiles
  const handleRequestAiOptimization = async (options?: {
    customImage?: string;
    userNotes?: string;
    intentCategory?: string;
  }) => {
    setLoadingAi(true);
    try {
      let imageToUse = options?.customImage;
      if (!imageToUse && canvasSnapshotGetterRef.current) {
        const snap = canvasSnapshotGetterRef.current();
        if (snap) {
          imageToUse = snap;
          setSnapshotDataUrl(snap);
        }
      }

      const data = await safeFetchJson<AiOptimizationResult>('/api/ai-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: productName,
          category: options?.intentCategory || productCategory,
          dimensions: parsedModel.dimensions,
          weightGrams: customWeightGrams,
          printTimeMinutes: customTimeMinutes,
          material: activeFilament?.material || 'PLA',
          printerName: activePrinter?.name || 'Impressora 3D FDM',
          imageDataUrl: imageToUse,
          userNotes: options?.userNotes,
        }),
      });

      if (data && data.profiles && Array.isArray(data.profiles) && data.profiles.length > 0) {
        setAiOptimizationResult(data);
        setIsAdvisorModalOpen(true);
        if (data.tips) setAiTips(data.tips);
      } else {
        // Instant local backup generation if network or proxy failed
        const baseW = customWeightGrams || 20;
        const baseT = customTimeMinutes || 60;
        const fallbackResult: AiOptimizationResult = {
          diagnostic: {
            pieceType: options?.intentCategory === 'keychain' ? 'Chaveiro / Acessório' : 'Peça Técnica / Modelo FDM',
            structuralAnalysis: 'Áreas finas exigem perímetros contínuos para evitar descolamento ou quebra por cisalhamento mecânico.',
            idealBedOrientation: 'Posicione a maior face plana assentada diretamente na mesa para maximizar área de contato e eliminar suportes.',
            supportNeeded: 'Desnecessário se a orientação mantiver saliências sob 45° de inclinação.',
            layerAdhesionTips: 'Limpe a chapa com álcool isopropílico 99% e mantenha a primeira camada a 0.24mm com ventoinha desligada.'
          },
          profiles: [
            {
              id: 'eco',
              name: '1. Economia Inteligente (Peça Leve & Rápida sem Quebrar)',
              tier: 1,
              badge: 'Custo Mínimo',
              badgeColor: 'emerald',
              description: 'Otimização com 2 paredes e preenchimento Gyroid 10% para corte de custo sem fragilidade.',
              summary: '2 paredes, 10% infill Gyroid, camada 0.24mm.',
              specs: {
                layerHeight: '0.24 mm',
                wallLoops: 2,
                infillPercent: 10,
                infillPattern: 'Gyroid',
                topLayers: 3,
                bottomLayers: 3,
                printSpeed: '60 - 80 mm/s',
                nozzleTemp: '205 °C',
                bedTemp: '60 °C',
                fanSpeed: '100%'
              },
              estimatedWeightGrams: Math.max(1, Math.round(baseW * 0.75)),
              estimatedTimeMinutes: Math.max(5, Math.round(baseT * 0.7)),
              actionableTips: [
                '2 paredes com Gyroid impedem que o anel do chaveiro quebre com o peso das chaves.',
                'Aumente a velocidade de deslocamento para 150mm/s reduzindo o tempo morto.',
                'Camada a 0.24mm economiza até 30% no tempo de máquina.'
              ],
              metrics: { strengthScore: 6, speedScore: 9, economyScore: 10, finishScore: 7 }
            },
            {
              id: 'balanced',
              name: '2. Equilibrado / Padrão Oficina (Qualidade Comercial & Firmeza)',
              tier: 2,
              badge: 'Recomendado',
              badgeColor: 'sky',
              description: 'Configuração padrão ouro com 3 paredes e camada 0.20mm para vendas comerciais.',
              summary: '3 paredes, 18% infill Gyroid, camada 0.20mm com acabamento refinado.',
              specs: {
                layerHeight: '0.20 mm',
                wallLoops: 3,
                infillPercent: 18,
                infillPattern: 'Gyroid',
                topLayers: 4,
                bottomLayers: 4,
                printSpeed: '50 - 65 mm/s',
                nozzleTemp: '210 °C',
                bedTemp: '60 °C',
                fanSpeed: '100%'
              },
              estimatedWeightGrams: baseW,
              estimatedTimeMinutes: baseT,
              actionableTips: [
                '3 perímetros criam casca sólida de 1.2mm eliminando qualquer transparência.',
                'Costura Z alinhada na parte traseira ou quina viva oculta imperfeições.',
                'Ative Ironing (alisamento de topo) para textura lisa e aspecto injetado.'
              ],
              metrics: { strengthScore: 8, speedScore: 7, economyScore: 8, finishScore: 9 }
            },
            {
              id: 'strength',
              name: '3. Ultra Resistência Mecânica (Carga & Impacto)',
              tier: 3,
              badge: 'Carga Máxima',
              badgeColor: 'amber',
              description: 'Máxima fusão molecular com 5 perímetros e 40% de infill cúbico estrutural.',
              summary: '5 paredes, 40% infill Cúbico, camada 0.16mm com alta fusão térmica.',
              specs: {
                layerHeight: '0.16 mm',
                wallLoops: 5,
                infillPercent: 40,
                infillPattern: 'Cúbico',
                topLayers: 5,
                bottomLayers: 5,
                printSpeed: '35 - 45 mm/s',
                nozzleTemp: '218 °C',
                bedTemp: '65 °C',
                fanSpeed: '60%'
              },
              estimatedWeightGrams: Math.round(baseW * 1.45),
              estimatedTimeMinutes: Math.round(baseT * 1.55),
              actionableTips: [
                '5 paredes transformam elementos finos e furos em plástico 100% maciço.',
                '+8°C no bico garante fusão contínua entre camadas impedindo delaminação.',
                'Reduza a ventoinha para 60% para que as camadas se fundam molecularmente.'
              ],
              metrics: { strengthScore: 10, speedScore: 5, economyScore: 6, finishScore: 8 }
            }
          ],
          slicerSnippets: {
            recommendedSlicer: 'Bambu Studio / OrcaSlicer / Cura / PrusaSlicer',
            quickCopyNotes: 'Perfis ajustados para bico 0.4mm em filamento ' + (activeFilament?.material || 'PLA')
          },
          tips: [
            'Paredes extras conferem até 3x mais resistência mecânica do que aumentar apenas o preenchimento.',
            'O padrão Gyroid dissipa tensões multidirecionais e nunca colide com o bico.',
            'A primeira camada deve ser nivelada a 0.24mm com fluxo a 105% para garantir adesão perfeita.'
          ]
        };
        setAiOptimizationResult(fallbackResult);
        setIsAdvisorModalOpen(true);
        if (fallbackResult.tips) setAiTips(fallbackResult.tips);
      }
    } catch (err) {
      console.warn('Erro ao solicitar otimização de fatiamento:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleApplyProfile = (profile: SlicingProfile) => {
    setCustomWeightGrams(profile.estimatedWeightGrams);
    setCustomTimeMinutes(profile.estimatedTimeMinutes);
    setActiveProfileAppliedId(profile.id);
    setPrintSuccessMessage(`✨ Perfil "${profile.name}" aplicado! Peso ajustado para ${profile.estimatedWeightGrams}g e tempo para ${profile.estimatedTimeMinutes} min.`);
    setTimeout(() => setPrintSuccessMessage(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert when print finished or saved */}
      {printSuccessMessage && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-950/30 animate-fadeIn backdrop-blur-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{printSuccessMessage}</span>
        </div>
      )}

      {saveSuccessMessage && (
        <div className="bg-sky-950/70 border border-sky-500/50 text-sky-200 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-sky-950/30 animate-fadeIn backdrop-blur-md">
          <BookmarkPlus className="w-5 h-5 text-sky-400 shrink-0" />
          <span className="text-sm font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Grid: Left = 3D Viewer & Upload, Right = Cost Calculation & Insumos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): 3D Canvas, File Upload, Dimensions */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 shadow-sm shadow-black/40 space-y-4">
            {/* Header: Title in full single row, actions in the row below */}
            <div className="space-y-2.5">
              {/* Line 1: Title full width in one clean line */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-sky-400" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Visualizador 3D Universal
                </h3>
              </div>

              {/* Line 2: Actions & Format in one clean horizontal row */}
              <div className="flex items-center justify-between gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (aiOptimizationResult) {
                      setIsAdvisorModalOpen(true);
                    } else {
                      handleRequestAiOptimization();
                    }
                  }}
                  disabled={loadingAi}
                  className="v3d-optimize-btn text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap shadow-sm cursor-pointer shrink-0"
                  title="Analisar geometria e obter 3 perfis de fatiamento recomendados"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${loadingAi ? 'animate-spin' : ''}`} />
                  <span>{loadingAi ? 'Analisando...' : 'Otimizar com IA'}</span>
                </button>

                <div className="v3d-format-pill flex items-center gap-1.5 text-xs font-mono font-semibold bg-white/[0.06] text-sky-300 px-3 py-1.5 rounded-xl border border-sky-400/25 whitespace-nowrap shadow-sm shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <span>{parsedModel.formatLabel || parsedModel.fileType.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* 3D Viewport with Three.js Multi-Format Support */}
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

            {/* Geometry Stats Cards - Bento Micro Cells */}
            <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-2.5 hover:border-white/[0.12] transition-colors">
                <span className="block text-[11px] text-slate-400 font-medium">Dimensões</span>
                <span className="text-xs font-bold text-white font-mono">
                  {parsedModel.dimensions.x}×{parsedModel.dimensions.y}×{parsedModel.dimensions.z} <span className="text-[10px] text-slate-500 font-normal">mm</span>
                </span>
              </div>
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-2.5 hover:border-white/[0.12] transition-colors">
                <span className="block text-[11px] text-slate-400 font-medium">Volume</span>
                <span className="text-xs font-bold text-white font-mono">
                  {parsedModel.volumeCm3} <span className="text-[10px] text-slate-500 font-normal">cm³</span>
                </span>
              </div>
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-2.5 hover:border-white/[0.12] transition-colors">
                <span className="block text-[11px] text-slate-400 font-medium">
                  {parsedModel.category === 'cad' ? 'Faces / Malha' : 'Camadas'}
                </span>
                <span className="text-xs font-bold text-white font-mono">
                  {parsedModel.category === 'cad'
                    ? parsedModel.trianglesCount?.toLocaleString() || 'B-Rep'
                    : parsedModel.layerCount || Math.round(parsedModel.dimensions.z / 0.2)}
                </span>
              </div>
            </div>

            {/* Extra Format Details (CAD / G-Code / 3MF) */}
            {parsedModel.cadDetails?.cadSystem && (
              <div className="flex items-center justify-between text-xs bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-2xl text-emerald-300 font-mono">
                <span className="flex items-center gap-1.5 font-sans font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  Sistema CAD Detectado:
                </span>
                <span className="font-bold">{parsedModel.cadDetails.cadSystem}</span>
              </div>
            )}

            {parsedModel.rawGcodeDetails?.slicer && (
              <div className="flex items-center justify-between text-xs bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-2xl text-indigo-300 font-mono">
                <span className="flex items-center gap-1.5 font-sans font-semibold">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  Fatiador ({parsedModel.rawGcodeDetails.slicer}):
                </span>
                <span className="font-bold">
                  Bico {parsedModel.rawGcodeDetails.nozzleTemp}°C • Mesa {parsedModel.rawGcodeDetails.bedTemp}°C
                </span>
              </div>
            )}

            {parsedModel.partsCount && parsedModel.partsCount > 1 && (
              <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-2xl text-amber-300 font-mono">
                <span className="flex items-center gap-1.5 font-sans font-semibold">
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  Montagem Multi-Peça (3MF / CAD):
                </span>
                <span className="font-bold">{parsedModel.partsCount} componentes</span>
              </div>
            )}
          </div>

          {/* File Upload Zone */}
          <FileUploadZone
            onModelLoaded={handleModelLoaded}
            selectedFilament={activeFilament}
            activeModelName={parsedModel.fileName}
          />
        </div>

        {/* Right Column (7 cols): Configuration, Supplies BOM, Detailed Costs */}
        <div className="lg:col-span-7 space-y-5">
          {/* Header Card: Product Info */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm shadow-black/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome do Produto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 transition"
                  placeholder="Ex: Chaveiro Tag Spotify Personalizado"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Categoria</label>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 transition"
                >
                  <option value="Chaveiros & Brindes">Chaveiros & Brindes</option>
                  <option value="Acessórios">Acessórios</option>
                  <option value="Decoração">Decoração</option>
                  <option value="Peças Técnicas">Peças Técnicas</option>
                  <option value="Suportes">Suportes</option>
                </select>
              </div>
            </div>

            {/* Equipment and Material Selection - Bento Sub-cells */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Printer Selection */}
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <PrinterIcon className="w-3.5 h-3.5 text-sky-400" />
                    Impressora 3D
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                    {activePrinter ? `${activePrinter.total_power_watts}W total` : ''}
                  </span>
                </div>

                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400 transition"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.printer_power_watts}W + {p.bed_heater_watts}W mesa)
                    </option>
                  ))}
                </select>

                {activePrinter && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                    <span>
                      Mesa: <strong className="text-slate-200 font-mono">{activePrinter.bed_heater_watts}W</strong>
                    </span>
                    <span>
                      Deprec.: <strong className="text-slate-200 font-mono">R$ {activePrinter.hourly_depreciation.toFixed(2)}/h</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Filament Selection */}
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Filamento & Carretel
                  </label>
                  {activeFilament && (
                    <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block shadow-sm"
                        style={{ backgroundColor: activeFilament.color_hex }}
                      />
                      {activeFilament.remaining_weight_g}g
                    </span>
                  )}
                </div>

                <select
                  value={selectedFilamentId}
                  onChange={(e) => setSelectedFilamentId(e.target.value)}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400 transition"
                >
                  {filaments.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.material}) - R$ {f.cost_per_spool.toFixed(2)}
                    </option>
                  ))}
                </select>

                {activeFilament && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                    <span>
                      Custo/g: <strong className="text-slate-200 font-mono">R$ {(activeFilament.cost_per_spool / activeFilament.total_weight_g).toFixed(4)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={onNavigateToStock}
                      className="text-sky-400 hover:text-sky-300 font-medium transition"
                    >
                      Gerenciar carretéis →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Slicer Outputs: Weight & Time with Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-sky-400" />
                    Peso do Filamento (Peça):
                  </span>
                  <span className="font-bold text-white font-mono">{customWeightGrams} g</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="250"
                  step="0.5"
                  value={customWeightGrams}
                  onChange={(e) => setCustomWeightGrams(Number(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
                  <span>1g (pequeno)</span>
                  <span>50g</span>
                  <span>250g (grande)</span>
                </div>
              </div>

              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] rounded-2xl p-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Tempo de Impressão:
                  </span>
                  <span className="font-bold text-white font-mono">
                    {Math.floor(customTimeMinutes / 60)}h {customTimeMinutes % 60}m ({customTimeMinutes}m)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="720"
                  step="5"
                  value={customTimeMinutes}
                  onChange={(e) => setCustomTimeMinutes(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
                  <span>15 min</span>
                  <span>2 horas</span>
                  <span>12 horas</span>
                </div>
              </div>
            </div>

            {/* Margem de Perda / Falha e Mão de Obra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="bg-[#0A0A0B]/50 border border-white/[0.05] rounded-2xl p-3.5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Percent className="w-3 h-3 text-rose-400" />
                    Margem de Perda / Falhas:
                  </span>
                  <span className="font-bold text-rose-400 font-mono">{lossMarginPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={lossMarginPercent}
                  onChange={(e) => setLossMarginPercent(Number(e.target.value))}
                  className="w-full accent-rose-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Compensa expurgo, brim, suportes e descolamentos.
                </span>
              </div>

              <div className="bg-[#0A0A0B]/50 border border-white/[0.05] rounded-2xl p-3.5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-teal-400" />
                    Preparação & Acabamento:
                  </span>
                  <span className="font-bold text-teal-400 font-mono">{prepTimeMinutes} min</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                  className="w-full accent-teal-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Fatiamento e pós-processamento (R$ {settings.hourly_labor_rate.toFixed(2)}/h).
                </span>
              </div>
            </div>
          </div>

          {/* Section: Insumos Adicionais (BOM - Bill of Materials) */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm shadow-black/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Insumos & Acessórios Adicionais (BOM)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ex: Argola de chaveiro, mosquetão, parafusos, ímãs, embalagem kraft com fecho.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 font-mono">
                + R$ {costResult.suppliesCost.toFixed(2)}
              </span>
            </div>

            {/* List of current supplies */}
            <div className="space-y-2">
              {productSupplies.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-white/[0.1] rounded-2xl bg-[#0A0A0B]/40">
                  Nenhum insumo extra adicionado. (Apenas peça plástica impressa)
                </div>
              ) : (
                productSupplies.map((item, idx) => {
                  const dbSupply = supplies.find((s) => s.id === item.supply_id);
                  const isStockLow = dbSupply && dbSupply.in_stock_qty < item.qty;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-[#0A0A0B]/80 border border-white/[0.06] hover:border-white/[0.12] p-3 rounded-2xl text-xs transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-200">{item.name}</span>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                            <span>R$ {item.unit_cost.toFixed(2)}/un</span>
                            {dbSupply && (
                              <span className={isStockLow ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                                (Estoque: {dbSupply.in_stock_qty} un)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-[#16161C] px-2.5 py-1 rounded-xl border border-white/[0.08]">
                          <span className="text-[11px] text-slate-400">Qtd:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={item.qty}
                            onChange={(e) => handleUpdateSupplyQty(idx, Number(e.target.value))}
                            className="w-10 bg-transparent text-center font-bold text-white font-mono focus:outline-none"
                          />
                        </div>
                        <span className="font-bold text-white font-mono w-16 text-right">
                          R$ {(item.qty * item.unit_cost).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupply(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add new supply bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-1">
              <select
                value={supplyToAddId}
                onChange={(e) => setSupplyToAddId(e.target.value)}
                className="flex-1 bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400 transition"
              >
                <option value="">Selecionar insumo do estoque...</option>
                {supplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (R$ {s.unit_cost.toFixed(2)} / un - Disp: {s.in_stock_qty})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 bg-[#0A0A0B] px-3 py-2 rounded-xl border border-white/[0.1]">
                <span className="text-[11px] text-slate-400 font-medium">Qtd:</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={supplyToAddQty}
                  onChange={(e) => setSupplyToAddQty(Math.max(1, Number(e.target.value)))}
                  className="w-10 bg-transparent text-center text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddSupply}
                disabled={!supplyToAddId}
                className="bg-[#18181E] hover:bg-[#22222A] disabled:opacity-40 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/[0.1]"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Incluir Insumo
              </button>
            </div>
          </div>

          {/* Section: Cost Breakdown & Profit Margin */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm shadow-black/40 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Composição Completa de Custos da Peça
              </span>
              <span className="text-xs text-slate-400 font-mono bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/[0.06]">
                Tarifa: R$ {settings.energy_kwh_rate.toFixed(2)}/kWh
              </span>
            </h3>

            {/* Individual Cost Bento Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Filamento + Perda</span>
                <span className="text-sm font-bold text-sky-400 font-mono mt-0.5 block">R$ {costResult.filamentCost.toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {customWeightGrams}g + {lossMarginPercent}%
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Energia Elétrica</span>
                <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">R$ {costResult.energyCost.toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {costResult.energyKwh} kWh
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Depreciação Máq.</span>
                <span className="text-sm font-bold text-purple-400 font-mono mt-0.5 block">R$ {costResult.depreciationCost.toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  R$ {activePrinter?.hourly_depreciation.toFixed(2)}/h
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Insumos (BOM)</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">R$ {costResult.suppliesCost.toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {productSupplies.length} itens
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Mão de Obra</span>
                <span className="text-sm font-bold text-teal-400 font-mono mt-0.5 block">R$ {costResult.laborCost.toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {prepTimeMinutes} min
                </span>
              </div>
            </div>

            {/* Markup Slider Bento Cell */}
            <div className="bg-[#0A0A0B]/80 p-4 rounded-2xl border border-white/[0.06] space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Margem de Lucro Desejada (Markup):
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400 text-sm font-mono">{markupPercent}%</span>
                  <span className="text-slate-400 font-mono">
                    (Margem: <strong className="text-emerald-300">{costResult.profitMarginPercent}%</strong>)
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="400"
                step="5"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-[#1F1F24] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>50% (Atacado)</span>
                <span>100% (2x Custo)</span>
                <span>150% (Padrão)</span>
                <span>300% (Premium)</span>
              </div>
            </div>

            {/* Total Cost vs Suggested Price Hero Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="bg-gradient-to-br from-[#141418] to-[#0A0A0B] border border-white/[0.1] p-5 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Custo de Produção Total</span>
                  <span className="text-2xl font-extrabold text-white tracking-tight font-mono mt-0.5 block">
                    R$ {costResult.totalProductionCost.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">por unidade produzida</span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-slate-300 shadow-inner">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-950/40 via-[#121215] to-[#0A0A0B] border border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-950/20">
                <div>
                  <span className="text-xs font-semibold text-emerald-300 block">Preço de Venda Sugerido</span>
                  <span className="text-2xl font-extrabold text-emerald-400 tracking-tight font-mono mt-0.5 block">
                    R$ {costResult.suggestedSalePrice.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-emerald-400/90 block mt-0.5 font-mono">
                    Lucro líquido: <strong>R$ {costResult.profitAmount.toFixed(2)}</strong> ({costResult.profitMarginPercent}%)
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Action Buttons: Save & Execute Print Job */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={savingProduct}
                className="flex-1 bg-[#18181E] hover:bg-[#22222A] text-slate-200 border border-white/[0.1] py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                <BookmarkPlus className="w-4 h-4 text-sky-400" />
                {savingProduct ? 'Salvando...' : 'Salvar no Catálogo'}
              </button>

              <div className="flex items-center gap-2.5 flex-1">
                <div className="flex items-center gap-1.5 bg-[#0A0A0B] border border-white/[0.1] px-3.5 py-2.5 rounded-2xl">
                  <span className="text-xs text-slate-400">Lote:</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={printQuantity}
                    onChange={(e) => setPrintQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-10 bg-transparent text-center font-bold text-xs text-white font-mono focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400">un</span>
                </div>

                <button
                  type="button"
                  onClick={handleExecutePrintJob}
                  disabled={isPrinting}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {isPrinting ? 'Processando baixa...' : 'Imprimir & Baixar Estoque'}
                </button>
              </div>
            </div>

            {/* AI Optimization Accordion */}
            <div className="pt-2 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Otimizador Inteligente de Fatiamento
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (aiOptimizationResult) {
                      setIsAdvisorModalOpen(true);
                    } else {
                      handleRequestAiOptimization();
                    }
                  }}
                  disabled={loadingAi}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition disabled:opacity-50"
                >
                  {loadingAi ? 'Analisando modelo com IA...' : aiOptimizationResult ? 'Abrir Estúdio Completo →' : 'Obter Recomendações →'}
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
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                isEco ? 'bg-emerald-500/20 text-emerald-300' : isStrength ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'
                              }`}>
                                {p.badge}
                              </span>
                              {isApplied && <span className="text-[10px] text-emerald-400 font-bold">✓ Ativo</span>}
                            </div>
                            <span className="text-[11px] font-bold text-slate-200 block leading-tight line-clamp-1">
                              {p.name.split('(')[0]}
                            </span>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-mono">
                              {p.estimatedWeightGrams}g / {p.estimatedTimeMinutes}m
                            </span>
                            <button
                              type="button"
                              onClick={() => handleApplyProfile(p)}
                              className="text-amber-400 hover:text-amber-300 font-bold transition"
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAdvisorModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-sky-500/10 hover:from-amber-500/20 hover:to-sky-500/20 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2 transition font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Ver Parecer com Imagem & Dicas Detalhadas do Fatiador →
                  </button>
                </div>
              )}

              {aiTips.length > 0 && !aiOptimizationResult && (
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
          </div>
        </div>
      </div>

      {/* Intelligent Slicing Advisor Studio Modal */}
      <SlicingAdvisorModal
        isOpen={isAdvisorModalOpen}
        onClose={() => setIsAdvisorModalOpen(false)}
        modelName={productName}
        category={productCategory}
        dimensions={parsedModel.dimensions}
        currentWeightGrams={customWeightGrams}
        currentTimeMinutes={customTimeMinutes}
        material={activeFilament?.material || 'PLA'}
        printerName={activePrinter?.name || 'Impressora 3D'}
        snapshotDataUrl={snapshotDataUrl}
        optimizationResult={aiOptimizationResult}
        isLoading={loadingAi}
        onReanalyze={handleRequestAiOptimization}
        onApplyProfile={handleApplyProfile}
      />
    </div>
  );
};
