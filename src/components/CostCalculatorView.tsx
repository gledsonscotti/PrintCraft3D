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
  Sliders,
  Truck
} from 'lucide-react';
import { AiOptimizationResult, AppSettings, AppTheme, ExtraSupplyItem, Filament, Printer, Product, SetupTemplate, SlicingProfile, Supply, ShippingCarrier, AmsHeater, ProductCategory } from '../types';
import { ParsedModelResult } from '../utils/fileParsers';
import { calculatePieceCost } from '../utils/costCalculator';
import { ModelViewer3D } from './ModelViewer3D';
import { FileUploadZone } from './FileUploadZone';
import { DirectPrintModal } from './DirectPrintModal';
import { safeFetchJson } from '../utils/api';

interface CostCalculatorViewProps {
  printers: Printer[];
  filaments: Filament[];
  supplies: Supply[];
  settings: AppSettings;
  onRefreshData: () => void | Promise<void>;
  onNavigateToStock: () => void;
  theme?: AppTheme;
  initialParams?: {
    weightG?: number;
    printTimeMinutes?: number;
    infill?: number;
    layerHeight?: number;
    modelName?: string;
  } | null;
}

export const CostCalculatorView: React.FC<CostCalculatorViewProps> = ({
  printers,
  filaments,
  supplies,
  settings,
  onRefreshData,
  onNavigateToStock,
  theme = 'standard',
  initialParams,
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
  const [amsHeaters, setAmsHeaters] = useState<AmsHeater[]>([]);
  const [showDirectPrintModal, setShowDirectPrintModal] = useState(false);

  useEffect(() => {
    safeFetchJson('/api/ams-heaters')
      .then(data => { if (Array.isArray(data)) setAmsHeaters(data); })
      .catch(() => {});
  }, []);

  const linkedAmsHeaters = amsHeaters.filter(a => a.printer_id === selectedPrinterId && a.status !== 'inactive');
  const effectiveHeaterWatts = linkedAmsHeaters.reduce((sum, a) => sum + (a.power_watts || 0), 0);

  // Formulator Parameters
  const [productName, setProductName] = useState('Chaveiro Tag Personalizado');
  const [productCategory, setProductCategory] = useState('Chaveiros & Brindes');
  const [productSubcategory, setProductSubcategory] = useState('Natal');
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>([]);
  const [productImageUrl, setProductImageUrl] = useState('');
  const [customWeightGrams, setCustomWeightGrams] = useState<number>(14.5);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number>(38);
  const [lossMarginPercent, setLossMarginPercent] = useState<number>(10);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(5);
  const [transportCost, setTransportCost] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(120);

  // Fetch available categories and subcategories
  useEffect(() => {
    safeFetchJson<ProductCategory[]>('/api/categories')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategoriesList(data);
          // If default category exists in list, sync subcategories
          const defaultCat = data.find((c) => c.name === 'Chaveiros & Brindes') || data[0];
          if (defaultCat && defaultCat.subcategories && defaultCat.subcategories.length > 0) {
            setProductCategory(defaultCat.name);
            setProductSubcategory(defaultCat.subcategories[0].name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Apply initialParams when coming from ModelAnalyzerView
  useEffect(() => {
    if (initialParams) {
      if (initialParams.weightG !== undefined) setCustomWeightGrams(initialParams.weightG);
      if (initialParams.printTimeMinutes !== undefined) setCustomTimeMinutes(initialParams.printTimeMinutes);
      if (initialParams.modelName) setProductName(initialParams.modelName);
    }
  }, [initialParams]);

  // Bill of Materials (Insumos extras vazios por padrão)
  const [productSupplies, setProductSupplies] = useState<ExtraSupplyItem[]>([]);

  // Selected supply to add
  const [supplyToAddId, setSupplyToAddId] = useState<string>('');
  const [supplyToAddQty, setSupplyToAddQty] = useState<number>(1);

  // Batch Print modal / state & Multi-color state
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [isSubmittingQueue, setIsSubmittingQueue] = useState<boolean>(false);
  const [printSuccessMessage, setPrintSuccessMessage] = useState<string | null>(null);

  const [printMode, setPrintMode] = useState<'monochrome' | 'multicolor'>('monochrome');
  const [multiColorItems, setMultiColorItems] = useState<{ id: string; filament_id: string; weight_g: number }[]>([
    { id: 'mc-1', filament_id: filaments[0]?.id || '', weight_g: 10 },
    { id: 'mc-2', filament_id: filaments[1]?.id || filaments[0]?.id || '', weight_g: 4.5 },
  ]);

  const addMultiColorItem = () => {
    setMultiColorItems([
      ...multiColorItems,
      { id: 'mc-' + Date.now(), filament_id: filaments[0]?.id || '', weight_g: 5 }
    ]);
  };

  const removeMultiColorItem = (id: string) => {
    if (multiColorItems.length <= 1) return;
    setMultiColorItems(multiColorItems.filter(item => item.id !== id));
  };

  const updateMultiColorItem = (id: string, field: 'filament_id' | 'weight_g', value: any) => {
    setMultiColorItems(multiColorItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const effectiveWeightGrams = printMode === 'multicolor'
    ? multiColorItems.reduce((acc, item) => acc + (Number(item.weight_g) || 0), 0)
    : customWeightGrams;

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

  // Carriers & Shipping cost selection
  const [carriers, setCarriers] = useState<ShippingCarrier[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('none');

  useEffect(() => {
    safeFetchJson<ShippingCarrier[]>('/api/carriers', undefined, []).then(data => {
      if (Array.isArray(data)) setCarriers(data);
    }).catch(() => {});
  }, []);

  // Set default printer & filament when available
  useEffect(() => {
    if (!selectedPrinterId && printers.length > 0) setSelectedPrinterId(printers[0].id);
    if (!selectedFilamentId && filaments.length > 0) setSelectedFilamentId(filaments[0].id);
  }, [printers, filaments]);

  const [calcTab, setCalcTab] = useState<'parameters' | 'setup_templates'>('parameters');
  const [setupTemplates, setSetupTemplates] = useState<SetupTemplate[]>([]);
  const [selectedSetupIds, setSelectedSetupIds] = useState<string[]>([]);
  const [newSetupName, setNewSetupName] = useState('');
  const [newSetupTime, setNewSetupTime] = useState<number>(10);
  const [newSetupCategory, setNewSetupCategory] = useState<'clean' | 'calibration' | 'preheat' | 'other'>('clean');
  const [newSetupDesc, setNewSetupDesc] = useState('');

  useEffect(() => {
    fetch('/api/setup-templates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSetupTemplates(data);
          if (data.length > 0 && selectedSetupIds.length === 0) {
            setSelectedSetupIds([data[0].id]);
          }
        }
      })
      .catch(err => console.error('Error loading setup templates:', err));
  }, []);

  const toggleSetupTemplate = (id: string) => {
    if (selectedSetupIds.includes(id)) {
      setSelectedSetupIds(selectedSetupIds.filter(sId => sId !== id));
    } else {
      setSelectedSetupIds([...selectedSetupIds, id]);
    }
  };

  const handleCreateSetupTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetupName.trim()) return;
    try {
      const res = await fetch('/api/setup-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSetupName,
          setup_time_minutes: newSetupTime,
          category: newSetupCategory,
          description: newSetupDesc
        })
      });
      if (res.ok) {
        const created = await res.json();
        setSetupTemplates([...setupTemplates, created]);
        setSelectedSetupIds([...selectedSetupIds, created.id]);
        setNewSetupName('');
        setNewSetupTime(10);
        setNewSetupDesc('');
      }
    } catch (err: any) {
      alert('Erro ao criar modelo de setup: ' + err.message);
    }
  };

  const handleDeleteSetupTemplate = async (id: string) => {
    if (!confirm('Deseja excluir este modelo de setup?')) return;
    try {
      const res = await fetch(`/api/setup-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSetupTemplates(setupTemplates.filter(s => s.id !== id));
        setSelectedSetupIds(selectedSetupIds.filter(sId => sId !== id));
      }
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const setupTemplatesTotalMinutes = selectedSetupIds.reduce((acc, id) => {
    const t = setupTemplates.find(s => s.id === id);
    return acc + (t ? Number(t.setup_time_minutes) || 0 : 0);
  }, 0);

  const effectivePrepTime = prepTimeMinutes + setupTemplatesTotalMinutes;

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
    filamentWeightGrams: effectiveWeightGrams,
    printTimeMinutes: customTimeMinutes,
    filament: activeFilament,
    printer: activePrinter,
    supplies: productSupplies,
    settings,
    customLossMargin: lossMarginPercent,
    prepTimeMinutes: effectivePrepTime,
    markupPercent,
    printMode,
    multiColorItems,
    allFilaments: filaments,
    transportCost,
    filamentHeaterWatts: effectiveHeaterWatts,
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
        subcategory: productSubcategory,
        image_url: productImageUrl,
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

  // Send to Production Queue (Enviar para Fila de Produção)
  const handleSendToProductionQueue = async () => {
    setIsSubmittingQueue(true);
    setPrintSuccessMessage(null);

    try {
      const notesDesc = printMode === 'multicolor'
        ? `Impressão Multicolorida: ${multiColorItems.map(m => {
            const fil = filaments.find(f => f.id === m.filament_id);
            return `${fil?.name || 'Filamento'} (${m.weight_g}g)`;
          }).join(', ')}`
        : `Monocromática: ${activeFilament?.name || 'Filamento'} (${effectiveWeightGrams}g)`;

      const payload = {
        product_name: productName,
        printer_id: activePrinter?.id || null,
        filament_id: printMode === 'monochrome' ? activeFilament?.id || null : (multiColorItems[0]?.filament_id || null),
        filament_weight_g: effectiveWeightGrams,
        print_time_minutes: customTimeMinutes,
        quantity: printQuantity,
        priority: 'normal',
        status: 'pending',
        destination: 'stock',
        notes: notesDesc,
        supplies_json: JSON.stringify(productSupplies),
      };

      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPrintSuccessMessage(
          `Ordem de produção de ${printQuantity}x "${productName}" emitida com sucesso e enviada para a fila de produção (PCP)!`
        );
        await onRefreshData();
        setTimeout(() => setPrintSuccessMessage(null), 6000);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao emitir ordem de produção');
      }
    } catch (err: any) {
      alert('Erro ao enviar para fila de produção: ' + err.message);
    } finally {
      setIsSubmittingQueue(false);
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

      {/* Sub-tabs: Parâmetros vs Tempo de Setup */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={() => setCalcTab('parameters')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition flex items-center gap-2 ${
            calcTab === 'parameters'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-[#121215] text-slate-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <Cpu className="w-4 h-4" /> Parâmetros & Custos
        </button>
        <button
          type="button"
          onClick={() => setCalcTab('setup_templates')}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition flex items-center gap-2 ${
            calcTab === 'setup_templates'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'bg-[#121215] text-slate-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <Clock className="w-4 h-4" /> Tempo de Setup ({selectedSetupIds.length} ativos • +{setupTemplatesTotalMinutes} min)
        </button>
      </div>

      {calcTab === 'setup_templates' ? (
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" /> Modelos de Tempo de Setup (Limpeza, Calibração & Preheating)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Selecione os modelos de preparação que se aplicam a esta ordem de produção. O tempo e custo de mão de obra correspondentes são somados automaticamente ao cálculo final.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-2xl text-xs font-mono font-semibold text-amber-300">
              Total de Setup Ativo: +{setupTemplatesTotalMinutes} minutos (R$ {(setupTemplatesTotalMinutes / 60 * (settings.hourly_labor_rate || 20)).toFixed(2)})
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {setupTemplates.map((t) => {
              const isSelected = selectedSetupIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleSetupTemplate(t.id)}
                  className={`cursor-pointer rounded-2xl p-4 border transition flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10'
                      : 'bg-[#0A0A0B] border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-white/20 bg-black text-amber-500 focus:ring-amber-500 w-4 h-4"
                      />
                      <h4 className="text-sm font-bold text-white">{t.name}</h4>
                    </div>
                    {t.description && <p className="text-xs text-slate-400 pl-6">{t.description}</p>}
                    <div className="pl-6 pt-1 flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-amber-400 font-semibold">{t.setup_time_minutes} min</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 uppercase text-[10px] bg-white/[0.06] px-2 py-0.5 rounded">
                        {t.category === 'clean' ? 'Limpeza de Mesa' : t.category === 'calibration' ? 'Calibração' : t.category === 'preheat' ? 'Preheating' : 'Outros'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSetupTemplate(t.id);
                    }}
                    className="text-slate-500 hover:text-rose-400 p-1.5 transition"
                    title="Excluir modelo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add New Setup Template Form */}
          <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-sky-400" /> Cadastrar Novo Modelo de Setup
            </h4>
            <form onSubmit={handleCreateSetupTemplate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Ex: Troca de bico 0.6mm + Z-Offset"
                  value={newSetupName}
                  onChange={(e) => setNewSetupName(e.target.value)}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Tempo (min)"
                  value={newSetupTime}
                  onChange={(e) => setNewSetupTime(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <select
                  value={newSetupCategory}
                  onChange={(e: any) => setNewSetupCategory(e.target.value)}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="clean">Limpeza de Mesa</option>
                  <option value="calibration">Calibração</option>
                  <option value="preheat">Preheating</option>
                  <option value="other">Outros</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Descrição opcional (ex: Limpeza com álcool e calibração de malha 5x5)"
                  value={newSetupDesc}
                  onChange={(e) => setNewSetupDesc(e.target.value)}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs py-2 px-4 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card: Product Info */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-sm shadow-black/40 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome do Produto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 transition"
                  placeholder="Ex: Chaveiro Tag Spotify Personalizado"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Categoria</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Taxonomia</span>
                </label>
                <select
                  value={productCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setProductCategory(newCat);
                    const catObj = categoriesList.find((c) => c.name === newCat);
                    if (catObj && catObj.subcategories && catObj.subcategories.length > 0) {
                      setProductSubcategory(catObj.subcategories[0].name);
                    } else {
                      setProductSubcategory('');
                    }
                  }}
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition"
                >
                  {categoriesList.length > 0 ? (
                    categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Chaveiros & Brindes">Chaveiros & Brindes</option>
                      <option value="Acessórios">Acessórios</option>
                      <option value="Decoração">Decoração</option>
                      <option value="Peças Técnicas & Ferramentas">Peças Técnicas & Ferramentas</option>
                      <option value="Utilidades Domésticas">Utilidades Domésticas</option>
                    </>
                  )}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Subcategoria</span>
                  <span className="text-[10px] text-sky-400 font-mono">Sazonal / Linha</span>
                </label>
                {(() => {
                  const currentCatObj = categoriesList.find(
                    (c) => c.name.toLowerCase() === productCategory.toLowerCase()
                  );
                  const subs = currentCatObj?.subcategories || [];
                  if (subs.length > 0) {
                    return (
                      <select
                        value={productSubcategory}
                        onChange={(e) => setProductSubcategory(e.target.value)}
                        className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 transition"
                      >
                        <option value="">Sem subcategoria</option>
                        {subs.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return (
                    <input
                      type="text"
                      value={productSubcategory}
                      onChange={(e) => setProductSubcategory(e.target.value)}
                      placeholder="Ex: Natal, Games, Geral..."
                      className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 transition"
                    />
                  );
                })()}
              </div>
            </div>

            {/* Product Image URL Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">URL da Imagem do Produto (Opcional)</label>
              <input
                type="url"
                value={productImageUrl}
                onChange={(e) => setProductImageUrl(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 transition font-mono text-xs"
                placeholder="https://exemplo.com/foto-produto.jpg"
              />
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
                  <span className="text-[11px] text-sky-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                    {activePrinter ? `${activePrinter.printer_power_watts + activePrinter.bed_heater_watts + effectiveHeaterWatts}W total` : ''}
                  </span>
                </div>

                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400 transition"
                >
                  {printers.map((p) => {
                    const inMnt = p.status === 'maintenance';
                    return (
                      <option key={p.id} value={p.id} disabled={inMnt}>
                        {p.name} {inMnt ? '⚠️ (EM MANUTENÇÃO - BLOQUEADA)' : `(${p.printer_power_watts}W + ${p.bed_heater_watts}W mesa)`}
                      </option>
                    );
                  })}
                </select>

                {activePrinter && (
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                    <span>
                      Mesa: <strong className="text-slate-200 font-mono">{activePrinter.bed_heater_watts}W</strong>
                    </span>
                    {effectiveHeaterWatts > 0 ? (
                      <span className="text-sky-400">
                        AMS/Aq.: <strong className="text-sky-300 font-mono">+{effectiveHeaterWatts}W</strong>
                      </span>
                    ) : (
                      <span>
                        AMS: <strong className="text-slate-500 font-mono">0W</strong>
                      </span>
                    )}
                    <span className="text-right">
                      Deprec.: <strong className="text-slate-200 font-mono">R$ {Number(activePrinter.hourly_depreciation || 0).toFixed(2)}/h</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Filament & Color Selection */}
              <div className="bg-[#0A0A0B]/80 border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Filamento & Cores
                  </label>
                  <div className="flex items-center bg-[#141418] p-0.5 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setPrintMode('monochrome')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        printMode === 'monochrome' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1 Cor
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintMode('multicolor')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        printMode === 'multicolor' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Multicolor
                    </button>
                  </div>
                </div>

                {printMode === 'monochrome' ? (
                  <>
                    <select
                      value={selectedFilamentId}
                      onChange={(e) => setSelectedFilamentId(e.target.value)}
                      className="w-full bg-[#141418] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400 transition"
                    >
                      {filaments.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.material}) - R$ {Number(f.cost_per_spool || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>

                    {activeFilament && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block shadow-sm"
                            style={{ backgroundColor: activeFilament.color_hex }}
                          />
                          Restante: <strong className="text-slate-200 font-mono">{activeFilament.remaining_weight_g}g</strong>
                        </span>
                        <button
                          type="button"
                          onClick={onNavigateToStock}
                          className="text-sky-400 hover:text-sky-300 font-medium transition"
                        >
                          Gerenciar →
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Cores / Filamentos ({multiColorItems.length}):</span>
                      <button
                        type="button"
                        onClick={addMultiColorItem}
                        className="text-amber-400 hover:text-amber-300 font-semibold transition flex items-center gap-1"
                      >
                        + Adicionar Cor
                      </button>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {multiColorItems.map((item) => {
                        const filObj = filaments.find((f) => f.id === item.filament_id);
                        return (
                          <div key={item.id} className="flex items-center gap-2 bg-[#141418] p-2 rounded-xl border border-white/[0.08]">
                            <span
                              className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-sm"
                              style={{ backgroundColor: filObj?.color_hex || '#cbd5e1' }}
                            />
                            <select
                              value={item.filament_id}
                              onChange={(e) => updateMultiColorItem(item.id, 'filament_id', e.target.value)}
                              className="flex-1 bg-[#0A0A0B] border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none"
                            >
                              {filaments.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name} ({f.material})
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={item.weight_g}
                                onChange={(e) => updateMultiColorItem(item.id, 'weight_g', Math.max(0.1, Number(e.target.value)))}
                                className="w-16 bg-[#0A0A0B] border border-white/[0.1] rounded-lg px-2 py-1 text-center text-[11px] text-white font-mono"
                              />
                              <span className="text-[10px] text-slate-400">g</span>
                            </div>
                            {multiColorItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMultiColorItem(item.id)}
                                className="text-rose-400 hover:text-rose-300 p-1 text-xs transition"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.06]">
                      <span>Total de Filamento:</span>
                      <strong className="text-amber-400 font-mono">
                        {Number(effectiveWeightGrams || 0).toFixed(1)}g
                      </strong>
                    </div>
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

            {/* Margem de Perda / Falha, Mão de Obra e Custo de Transporte */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
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
                  Fatiamento e pós-processamento (R$ {Number(settings?.hourly_labor_rate || 0).toFixed(2)}/h).
                </span>
              </div>

              <div className="bg-[#0A0A0B]/50 border border-white/[0.05] rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-400" />
                    Transportadora / Envio:
                  </span>
                  <span className="font-bold text-amber-400 font-mono">R$ {Number(transportCost || 0).toFixed(2)}</span>
                </div>
                <select
                  value={selectedCarrierId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedCarrierId(cid);
                    if (cid === 'none') {
                      setTransportCost(0);
                    } else if (cid !== 'custom') {
                      const found = carriers.find(c => c.id === cid);
                      if (found) setTransportCost(found.default_cost);
                    }
                  }}
                  className="w-full bg-[#16161C] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="none">Sem Frete (Retirada / Venda Direta)</option>
                  {carriers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.service_type}) - R$ {Number(c.default_cost || 0).toFixed(2)}
                    </option>
                  ))}
                  <option value="custom">Outro / Valor Personalizado</option>
                </select>
                {selectedCarrierId === 'custom' && (
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.50"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Math.max(0, Number(e.target.value)))}
                    placeholder="Valor do frete R$"
                    className="w-full bg-[#16161C] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white font-bold font-mono focus:outline-none"
                  />
                )}
                <span className="text-[10px] text-slate-500 block">
                  Selecione a transportadora cadastrada ou defina o custo.
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
                + R$ {Number(costResult?.suppliesCost || 0).toFixed(2)}
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
                            <span>R$ {Number(item.unit_cost || 0).toFixed(2)}/un</span>
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
                          R$ {Number((item.qty || 0) * (item.unit_cost || 0)).toFixed(2)}
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
                    {s.name} (R$ {Number(s.unit_cost || 0).toFixed(2)} / un - Disp: {s.in_stock_qty})
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
                Tarifa: R$ {Number(settings?.energy_kwh_rate || 0).toFixed(2)}/kWh
              </span>
            </h3>

            {/* Individual Cost Bento Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Filamento + Perda</span>
                <span className="text-sm font-bold text-sky-400 font-mono mt-0.5 block">R$ {Number(costResult?.filamentCost || 0).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {customWeightGrams}g + {lossMarginPercent}%
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Energia Elétrica</span>
                <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">R$ {Number(costResult?.energyCost || 0).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {costResult.energyKwh} kWh
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Depreciação Máq.</span>
                <span className="text-sm font-bold text-purple-400 font-mono mt-0.5 block">R$ {Number(costResult?.depreciationCost || 0).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  R$ {Number(activePrinter?.hourly_depreciation || 0).toFixed(2)}/h
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Insumos (BOM)</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">R$ {Number(costResult?.suppliesCost || 0).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {productSupplies.length} itens
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Mão de Obra</span>
                <span className="text-sm font-bold text-teal-400 font-mono mt-0.5 block">R$ {Number(costResult?.laborCost || 0).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  {prepTimeMinutes} min
                </span>
              </div>

              <div className="bg-[#0A0A0B]/80 p-3 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block truncate font-medium">Transporte / Frete</span>
                <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">R$ {Number(costResult?.transportCost || 0).toFixed(2)}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                  Logística
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
                    R$ {Number(costResult?.totalProductionCost || 0).toFixed(2)}
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
                    R$ {Number(costResult?.suggestedSalePrice || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-emerald-400/90 block mt-0.5 font-mono">
                    Lucro líquido: <strong>R$ {Number(costResult?.profitAmount || 0).toFixed(2)}</strong> ({costResult?.profitMarginPercent || 0}%)
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Action Buttons: Save, Queue & Direct Print */}
            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
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
                    onClick={handleSendToProductionQueue}
                    disabled={isSubmittingQueue}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white py-3 px-4 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {isSubmittingQueue ? 'Enviando...' : 'Enviar para Fila'}
                  </button>
                </div>
              </div>

              {/* Botão de Envio de Impressão Direta (LAN / Cloud) */}
              <button
                type="button"
                id="btn-trigger-direct-print"
                onClick={() => setShowDirectPrintModal(true)}
                className="direct-print-trigger-btn w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition shadow-md cursor-pointer border border-sky-400/30 text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:via-indigo-500 hover:to-blue-500"
              >
                <PrinterIcon className="w-4 h-4 shrink-0" />
                <span>Enviar Impressão Direta para Máquina (LAN / Nuvem)</span>
                <span className="direct-print-trigger-pill bg-black/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-normal border border-white/10 hidden sm:inline-block">
                  Bambu, Creality, Prusa, Anycubic, Stratasys, etc.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Disparo de Impressão Direta */}
      {showDirectPrintModal && (
        <DirectPrintModal
          isOpen={showDirectPrintModal}
          onClose={() => setShowDirectPrintModal(false)}
          printers={printers}
          filaments={filaments}
          selectedPrinterId={selectedPrinterId}
          selectedFilamentId={selectedFilamentId}
          theme={theme}
          jobData={{
            job_name: productName || parsedModel?.fileName || 'Peça da Calculadora',
            modelName: productName || parsedModel?.fileName || 'Peça da Calculadora',
            product_name: productName,
            file_name: parsedModel?.fileName,
            estimated_time_minutes: customTimeMinutes,
            printTimeMinutes: customTimeMinutes,
            filament_used_g: customWeightGrams,
            weightGrams: customWeightGrams,
            filament_id: selectedFilamentId,
            filament_name: activeFilament?.name,
            total_cost: costResult?.totalProductionCost || 0,
            totalCost: costResult?.totalProductionCost || 0,
            copies: printQuantity,
            dimensions: parsedModel ? {
              x: parsedModel.dimensions.x,
              y: parsedModel.dimensions.y,
              z: parsedModel.dimensions.z,
            } : undefined
          }}
          onPrintDispatched={() => {
            onRefreshData();
          }}
        />
      )}
    </div>
  );
};
