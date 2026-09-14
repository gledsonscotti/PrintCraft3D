import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Layers,
  Box,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Download,
  Printer as PrinterIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCw,
  RotateCcw,
  FolderOpen,
  ArrowRight,
  Split,
  Eye,
  Tag,
  Palette,
  Clock,
  Scale,
  DollarSign,
  Maximize2,
  Minimize2,
  Upload,
  RefreshCw,
  X,
  ChevronRight,
  ExternalLink,
  Move,
  FlipHorizontal,
  Lock,
  Unlock,
  Sliders,
  ChevronDown,
  Check,
  ArrowDown,
  ArrowUp,
  Crosshair,
  LayoutGrid,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Percent,
} from 'lucide-react';
import {
  AppSettings,
  AppTheme,
  BuildPlate,
  BuildPlatePart,
  Filament,
  PlatesProjectData,
  Printer,
  Product
} from '../types';
import { PlateViewer3D } from './PlateViewer3D';
import { DirectPrintModal } from './DirectPrintModal';
import {
  extractPartsFromObject,
  detectMeshColor,
  autoArrangePartsOnBed,
  geometricPackPartsIntoPlates,
  GeometricPackOptions,
  GeometricPackResult,
  GeometricPackedPlate,
  GeometricPlacedPart,
} from '../utils/modelArranger';
import { parseUniversal3DFile, ParsedModelResult } from '../utils/fileParsers';
import { exportPlateToSTL, exportAllPlatesToZip, downloadBlob } from '../utils/stlExporter';

interface PlateEditorViewProps {
  printers: Printer[];
  filaments: Filament[];
  products: Product[];
  settings: AppSettings;
  theme?: AppTheme;
  initialModelResult?: ParsedModelResult | null;
  initialObject3D?: THREE.Object3D | null;
  onRefreshProducts?: () => void;
  onNavigateToCalculator?: (params: any) => void;
  onNavigateToProducts?: () => void;
}

export const PlateEditorView: React.FC<PlateEditorViewProps> = ({
  printers = [],
  filaments = [],
  products = [],
  settings,
  theme = 'standard',
  initialModelResult,
  initialObject3D,
  onRefreshProducts,
  onNavigateToCalculator,
  onNavigateToProducts,
}) => {
  // Project metadata
  const [projectName, setProjectName] = useState<string>('Meu Projeto Multipartes');
  const [sourceFileName, setSourceFileName] = useState<string>('modelo_multipartes.stl');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Mesh cache: stores the original Three.js meshes by index
  const [meshCache, setMeshCache] = useState<Map<number, THREE.Mesh>>(new Map());

  // Plates state
  const [plates, setPlates] = useState<BuildPlate[]>([]);
  const [activePlateId, setActivePlateId] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Multi-selection of parts for batch operations / geometric auto-arrangement
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

  // Geometric Auto-Arrangement Modal & Config States
  const [isAutoArrangeModalOpen, setIsAutoArrangeModalOpen] = useState<boolean>(false);
  const [arrangeScope, setArrangeScope] = useState<'selected' | 'active_plate' | 'all_plates'>('active_plate');
  const [arrangeGroupingMode, setArrangeGroupingMode] = useState<'minimal_plates' | 'active_plate_only' | 'by_color'>('minimal_plates');
  const [arrangeSpacing, setArrangeSpacing] = useState<number>(8);
  const [arrangeEdgeMargin, setArrangeEdgeMargin] = useState<number>(10);
  const [arrangeAllowRotation, setArrangeAllowRotation] = useState<boolean>(true);

  // Slicer Inspector & Tab controls
  const [rightSidebarTab, setRightSidebarTab] = useState<'slicer' | 'parts'>('slicer');
  const [slicerToolTab, setSlicerToolTab] = useState<'move' | 'rotate' | 'scale' | 'color' | 'multiply'>('move');
  const [uniformScaleLocked, setUniformScaleLocked] = useState<boolean>(true);

  // View settings
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [isWireframe, setIsWireframe] = useState<boolean>(false);

  // Loading & Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Direct Print Modal state
  const [isDirectPrintOpen, setIsDirectPrintOpen] = useState(false);

  // Save to Product Catalog Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [selectedExistingProductId, setSelectedExistingProductId] = useState<string>('');
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductCategory, setNewProductCategory] = useState<string>('Geral');
  const [newProductMarkup, setNewProductMarkup] = useState<number>(100);
  const [newProductSalePrice, setNewProductSalePrice] = useState<number>(0);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Canvas Snapshot getter reference
  const snapshotGetterRef = useRef<(() => string | null) | null>(null);

  // Notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Setup default plate templates
  const createDefaultPlate = (
    plateNumber: number,
    name?: string,
    filament?: Filament,
    printer?: Printer
  ): BuildPlate => {
    const selectedFilament = filament || filaments[plateNumber % (filaments.length || 1)] || null;
    const selectedPrinter = printer || printers[0] || null;

    const colors = ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const fallbackColor = colors[(plateNumber - 1) % colors.length];

    return {
      id: `plate-${Date.now()}-${plateNumber}-${Math.random().toString(36).substr(2, 5)}`,
      name: name || `Mesa ${plateNumber} - ${selectedFilament?.color || 'Cor Única'}`,
      plateNumber,
      printer_id: selectedPrinter?.id || '',
      filament_id: selectedFilament?.id || '',
      filament_name: selectedFilament ? `${selectedFilament.name} (${selectedFilament.material})` : 'Filamento Padrão',
      filament_color: selectedFilament?.color || 'Cor Única',
      filament_color_hex: selectedFilament?.color_hex || fallbackColor,
      filament_material: selectedFilament?.material || 'PLA',
      bed_dimensions: { x: 256, y: 256, z: 256 },
      parts: [],
      estimated_time_minutes: 0,
      estimated_weight_g: 0,
      estimated_cost: 0,
    };
  };

  // Color helper names
  const getColorName = (hex?: string) => {
    if (!hex) return 'Cor Única';
    const clean = hex.toLowerCase();
    if (clean.includes('2563eb') || clean.includes('3b82f6') || clean.includes('blue') || clean.includes('0284c7')) return 'Azul';
    if (clean.includes('ef4444') || clean.includes('dc2626') || clean.includes('red') || clean.includes('f43f5e')) return 'Vermelho';
    if (clean.includes('10b981') || clean.includes('16a34a') || clean.includes('green') || clean.includes('22c55e')) return 'Verde';
    if (clean.includes('f59e0b') || clean.includes('eab308') || clean.includes('yellow') || clean.includes('amber')) return 'Amarelo';
    if (clean.includes('8b5cf6') || clean.includes('7c3aed') || clean.includes('purple')) return 'Roxo';
    if (clean.includes('f97316') || clean.includes('ea580c') || clean.includes('orange')) return 'Laranja';
    if (clean.includes('f8fafc') || clean.includes('ffffff') || clean.includes('white')) return 'Branco';
    if (clean.includes('18181b') || clean.includes('000000') || clean.includes('black')) return 'Preto';
    return 'Colorido';
  };

  // Generate Sample Multi-Part Model Helper
  const generateSampleModel = (type: 'box_lid' | 'keychain_parts' | 'gears_batch') => {
    setIsProcessing(true);
    const group = new THREE.Group();

    if (type === 'box_lid') {
      // Part 1: Caixa base (Azul #2563eb)
      const boxGeom = new THREE.BoxGeometry(60, 24, 60);
      const boxMesh = new THREE.Mesh(boxGeom, new THREE.MeshStandardMaterial());
      boxMesh.name = 'Corpo da Caixa (Azul)';
      boxMesh.position.set(-35, 12, 0);
      boxMesh.userData = { color_hex: '#2563eb' };
      group.add(boxMesh);

      // Part 2: Tampa com encaixe (Vermelho #ef4444)
      const lidGeom = new THREE.BoxGeometry(62, 6, 62);
      const lidMesh = new THREE.Mesh(lidGeom, new THREE.MeshStandardMaterial());
      lidMesh.name = 'Tampa da Caixa (Vermelha)';
      lidMesh.position.set(38, 3, 0);
      lidMesh.userData = { color_hex: '#ef4444' };
      group.add(lidMesh);

      // Part 3: Logo / Letreiro frontal (Amarelo #f59e0b)
      const badgeGeom = new THREE.BoxGeometry(32, 4, 18);
      const badgeMesh = new THREE.Mesh(badgeGeom, new THREE.MeshStandardMaterial());
      badgeMesh.name = 'Emblema Frontal (Amarelo)';
      badgeMesh.position.set(38, 2, 42);
      badgeMesh.userData = { color_hex: '#f59e0b' };
      group.add(badgeMesh);

      setProjectName('Caixa Organizadora com Tampa e Emblema');
      setSourceFileName('caixa_organizadora_multipartes.stl');
    } else if (type === 'keychain_parts') {
      // Part 1: Base do Chaveiro (Azul #2563eb)
      const baseGeom = new THREE.CylinderGeometry(25, 25, 4, 32);
      const baseMesh = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial());
      baseMesh.name = 'Base do Chaveiro (Azul)';
      baseMesh.position.set(-25, 2, 0);
      baseMesh.userData = { color_hex: '#2563eb' };
      group.add(baseMesh);

      // Part 2: Letras e Grafismo (Vermelho #ef4444)
      const textGeom = new THREE.BoxGeometry(36, 3, 14);
      const textMesh = new THREE.Mesh(textGeom, new THREE.MeshStandardMaterial());
      textMesh.name = 'Grafismo em Relevo (Vermelho)';
      textMesh.position.set(25, 1.5, 0);
      textMesh.userData = { color_hex: '#ef4444' };
      group.add(textMesh);

      // Part 3: Anel de fixação (Branco #f8fafc)
      const ringGeom = new THREE.TorusGeometry(8, 2.5, 16, 32);
      const ringMesh = new THREE.Mesh(ringGeom, new THREE.MeshStandardMaterial());
      ringMesh.name = 'Argola de Fixação (Branca)';
      ringMesh.position.set(0, 1.5, 32);
      ringMesh.userData = { color_hex: '#f8fafc' };
      group.add(ringMesh);

      setProjectName('Chaveiro Tag Bicolor com Relevo');
      setSourceFileName('chaveiro_tag_bicolor.stl');
    } else {
      // Gears batch: 4 engrenagens (2 Azuis, 2 Vermelhas)
      for (let i = 0; i < 4; i++) {
        const cylGeom = new THREE.CylinderGeometry(15 + i * 2, 15 + i * 2, 8, 24);
        const cylMesh = new THREE.Mesh(cylGeom, new THREE.MeshStandardMaterial());
        const isBlue = i < 2;
        cylMesh.name = `Engrenagem ${isBlue ? 'Azul' : 'Vermelha'} ${i + 1}`;
        const angle = (i * Math.PI) / 2;
        cylMesh.position.set(Math.cos(angle) * 35, 4, Math.sin(angle) * 35);
        cylMesh.userData = { color_hex: isBlue ? '#2563eb' : '#ef4444' };
        group.add(cylMesh);
      }
      setProjectName('Lote de 4 Engrenagens Bicolor');
      setSourceFileName('lote_engrenagens.stl');
    }

    loadObjectIntoEditor(group);
    setIsProcessing(false);
    showNotification('success', 'Modelo carregado! Peças azuis e vermelhas identificadas e prontas para ajuste.');
  };

  // Convert an Object3D into separated parts and populate plates
  const loadObjectIntoEditor = (object: THREE.Object3D) => {
    const extractedMeshes = extractPartsFromObject(object);
    const newCache = new Map<number, THREE.Mesh>();

    const defaultColors = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

    const detectedParts: BuildPlatePart[] = extractedMeshes.map((mesh, index) => {
      newCache.set(index, mesh);

      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox || new THREE.Box3();
      const size = new THREE.Vector3();
      box.getSize(size);

      // Compute volume & weight
      const posAttr = mesh.geometry.attributes.position;
      let approxVolumeCm3 = 0;
      if (posAttr) {
        approxVolumeCm3 = Math.max(0.5, size.x * size.y * size.z * 0.00045);
      }
      const weight = Math.round(approxVolumeCm3 * 1.24 * 10) / 10;

      // Extract color from userData, material, or keyword name detection
      const assignedColor = detectMeshColor(mesh, index);

      return {
        id: `part-${index + 1}-${Date.now()}`,
        name: mesh.name || `Parte ${index + 1} (${getColorName(assignedColor)})`,
        originalMeshIndex: index,
        color_hex: assignedColor,
        position: { x: mesh.position.x, y: 0, z: mesh.position.z },
        rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        scale: { x: 1, y: 1, z: 1 },
        dimensions: {
          x: Math.round(size.x * 10) / 10,
          y: Math.round(size.z * 10) / 10, // Y in bed is Z in Three.js
          z: Math.round(size.y * 10) / 10, // Height in bed is Y in Three.js
        },
        volumeCm3: Math.round(approxVolumeCm3 * 10) / 10,
        weightGrams: weight,
        trianglesCount: posAttr ? posAttr.count / 3 : 0,
      };
    });

    setMeshCache(newCache);

    // Group detected parts by color
    const colorGroups = new Map<string, BuildPlatePart[]>();
    detectedParts.forEach((part) => {
      const color = part.color_hex || '#2563eb';
      if (!colorGroups.has(color)) {
        colorGroups.set(color, []);
      }
      colorGroups.get(color)!.push(part);
    });

    // If multiple colors detected (e.g. blue and red), create dedicated plates automatically!
    if (colorGroups.size > 1) {
      const initialPlates: BuildPlate[] = [];
      let pNum = 1;

      colorGroups.forEach((partsOfColor, hex) => {
        const cName = getColorName(hex);
        const matchingFilament = filaments.find(
          (f) => f.color_hex?.toLowerCase() === hex.toLowerCase() ||
                 f.color?.toLowerCase().includes(cName.toLowerCase())
        ) || filaments[(pNum - 1) % (filaments.length || 1)] || null;

        const newPlate: BuildPlate = {
          id: `plate-color-${Date.now()}-${pNum}`,
          name: `Mesa ${pNum} - ${cName}`,
          plateNumber: pNum,
          printer_id: printers[0]?.id || '',
          filament_id: matchingFilament?.id || '',
          filament_name: matchingFilament ? `${matchingFilament.name} (${matchingFilament.material})` : `Filamento ${cName}`,
          filament_color: cName,
          filament_color_hex: hex,
          filament_material: matchingFilament?.material || 'PLA',
          bed_dimensions: { x: 256, y: 256, z: 256 },
          parts: partsOfColor,
          estimated_time_minutes: 0,
          estimated_weight_g: 0,
          estimated_cost: 0,
        };

        // Auto-arrange parts on this bed
        const bedX = newPlate.bed_dimensions?.x || 250;
        const bedY = newPlate.bed_dimensions?.y || 250;
        const tempGroup = new THREE.Group();
        partsOfColor.forEach((p) => {
          const cached = newCache.get(p.originalMeshIndex);
          if (cached) {
            const cloned = cached.clone();
            cloned.userData = { partId: p.id };
            tempGroup.add(cloned);
          }
        });

        if (tempGroup.children.length > 0) {
          const arrangeResult = autoArrangePartsOnBed(tempGroup, bedX, bedY, 250, 10);
          newPlate.parts = partsOfColor.map((part) => {
            const placedMesh = arrangeResult.group.children.find(
              (c) => c.userData?.partId === part.id
            ) as THREE.Mesh;
            if (placedMesh) {
              return {
                ...part,
                position: {
                  x: Math.round(placedMesh.position.x * 10) / 10,
                  y: 0,
                  z: Math.round(placedMesh.position.z * 10) / 10,
                },
              };
            }
            return part;
          });
        }

        recalculatePlateMetrics(newPlate);
        initialPlates.push(newPlate);
        pNum++;
      });

      setPlates(initialPlates);
      setActivePlateId(initialPlates[0].id);
      setSelectedPartId(initialPlates[0].parts[0]?.id || null);
    } else {
      const plate1 = createDefaultPlate(1, `Mesa 1 - ${getColorName(detectedParts[0]?.color_hex)}`, filaments[0]);
      plate1.parts = detectedParts;
      recalculatePlateMetrics(plate1);
      setPlates([plate1]);
      setActivePlateId(plate1.id);
      setSelectedPartId(detectedParts[0]?.id || null);
    }
  };

  // Recalculate estimated weight, time, cost for a plate
  const recalculatePlateMetrics = (plate: BuildPlate) => {
    let totalWeight = 0;
    plate.parts.forEach((p) => {
      totalWeight += p.weightGrams;
    });

    // Time estimate: ~3.5 min per gram + 15 min bed heating & base layers
    const estimatedTime = plate.parts.length > 0 ? Math.round(totalWeight * 3.2 + 12) : 0;

    // Cost estimate: filament cost per gram
    const matchingFilament = filaments.find((f) => f.id === plate.filament_id);
    const costPerGram = matchingFilament
      ? matchingFilament.cost_per_spool / (matchingFilament.total_weight_g || 1000)
      : 0.12; // R$ 120/kg default
    const estimatedCost = Math.round(totalWeight * costPerGram * 100) / 100;

    plate.estimated_weight_g = Math.round(totalWeight * 10) / 10;
    plate.estimated_time_minutes = estimatedTime;
    plate.estimated_cost = estimatedCost;
  };

  // Initialize with initialModelResult / initialObject3D if passed from ModelAnalyzerView
  useEffect(() => {
    if (initialObject3D) {
      if (initialModelResult?.fileName) {
        setSourceFileName(initialModelResult.fileName);
        setProjectName(initialModelResult.fileName.replace(/\.[^/.]+$/, ''));
      }
      loadObjectIntoEditor(initialObject3D);
    } else if (plates.length === 0) {
      // Generate default sample model on first open
      generateSampleModel('box_lid');
    }
  }, [initialObject3D]);

  // Active plate reference
  const activePlate = useMemo(() => {
    return plates.find((p) => p.id === activePlateId) || plates[0] || createDefaultPlate(1);
  }, [plates, activePlateId]);

  // Project Totals
  const projectTotals = useMemo(() => {
    let totalWeight = 0;
    let totalTime = 0;
    let totalCost = 0;
    let totalParts = 0;

    plates.forEach((p) => {
      totalWeight += p.estimated_weight_g;
      totalTime += p.estimated_time_minutes;
      totalCost += p.estimated_cost;
      totalParts += p.parts.length;
    });

    return {
      totalPlates: plates.length,
      totalParts,
      totalWeight: Math.round(totalWeight * 10) / 10,
      totalTime,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  }, [plates]);

  // Handle File Upload from Disk
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const { result, object3D } = await parseUniversal3DFile(file);
      setSourceFileName(file.name);
      setProjectName(file.name.replace(/\.[^/.]+$/, ''));
      loadObjectIntoEditor(object3D);
      showNotification(
        'success',
        `Arquivo "${file.name}" importado com sucesso! Partes detectadas e prontas para distribuição em mesas.`
      );
    } catch (e: any) {
      showNotification('error', `Falha ao processar arquivo 3D: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add a new Build Plate
  const handleAddPlate = () => {
    const nextNum = plates.length + 1;
    const nextFilament = filaments[nextNum % (filaments.length || 1)] || null;
    const newPlate = createDefaultPlate(nextNum, `Mesa ${nextNum}`, nextFilament);
    setPlates((prev) => [...prev, newPlate]);
    setActivePlateId(newPlate.id);
    showNotification('info', `Mesa ${nextNum} adicionada. Mova as peças correspondentes a esta cor.`);
  };

  // Delete a Build Plate
  const handleDeletePlate = (plateId: string) => {
    if (plates.length <= 1) {
      showNotification('error', 'O projeto deve conter pelo menos uma mesa de impressão.');
      return;
    }

    const plateToDelete = plates.find((p) => p.id === plateId);
    if (!plateToDelete) return;

    // Move parts of deleted plate to another plate
    const remaining = plates.filter((p) => p.id !== plateId);
    const targetPlate = remaining[0];

    if (plateToDelete.parts.length > 0) {
      targetPlate.parts = [...targetPlate.parts, ...plateToDelete.parts];
      recalculatePlateMetrics(targetPlate);
    }

    setPlates(remaining);
    setActivePlateId(targetPlate.id);
    showNotification('info', `Mesa excluída. Suas peças foram realocadas para ${targetPlate.name}.`);
  };

  // Move a part from its current plate to another plate
  const handleMovePartToPlate = (partId: string, targetPlateId: string) => {
    setPlates((prevPlates) => {
      let movedPart: BuildPlatePart | null = null;

      // Remove from source plate
      const updatedPlates = prevPlates.map((plate) => {
        const partIdx = plate.parts.findIndex((p) => p.id === partId);
        if (partIdx !== -1) {
          movedPart = plate.parts[partIdx];
          const newParts = plate.parts.filter((p) => p.id !== partId);
          const updated = { ...plate, parts: newParts };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return plate;
      });

      if (!movedPart) return prevPlates;

      // Add to destination plate
      return updatedPlates.map((plate) => {
        if (plate.id === targetPlateId) {
          const newParts = [...plate.parts, movedPart!];
          const updated = { ...plate, parts: newParts };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return plate;
      });
    });

    showNotification('success', 'Peça movida de mesa com sucesso!');
  };

  // Multi-selection management helpers
  const handleToggleSelectPart = (partId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPartIds((prev) =>
      prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId]
    );
    setSelectedPartId(partId);
  };

  const handleSelectAllActivePlate = () => {
    const ids = activePlate.parts.map((p) => p.id);
    setSelectedPartIds(ids);
  };

  const handleSelectAllProjectParts = () => {
    const allIds: string[] = [];
    plates.forEach((pl) => pl.parts.forEach((p) => allIds.push(p.id)));
    setSelectedPartIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedPartIds([]);
  };

  // Move multiple selected parts to a target plate
  const handleMoveSelectedPartsToPlate = (targetPlateId: string) => {
    if (selectedPartIds.length === 0 || targetPlateId === activePlate.id) return;

    setPlates((prevPlates) => {
      const movedParts: BuildPlatePart[] = [];
      const updatedPlates = prevPlates.map((pl) => {
        const remainingParts: BuildPlatePart[] = [];
        pl.parts.forEach((p) => {
          if (selectedPartIds.includes(p.id)) {
            movedParts.push(p);
          } else {
            remainingParts.push(p);
          }
        });
        const updated = { ...pl, parts: remainingParts };
        recalculatePlateMetrics(updated);
        return updated;
      });

      return updatedPlates.map((pl) => {
        if (pl.id === targetPlateId) {
          const updated = { ...pl, parts: [...pl.parts, ...movedParts] };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return pl;
      });
    });

    showNotification('success', `${selectedPartIds.length} peças transferidas para a mesa selecionada!`);
    setSelectedPartIds([]);
  };

  // Move selected parts to a brand new plate
  const handleMoveSelectedPartsToNewPlate = () => {
    if (selectedPartIds.length === 0) return;

    const newPlateNumber = plates.length + 1;
    const bedX = activePlate.bed_dimensions?.x || 256;
    const bedY = activePlate.bed_dimensions?.y || 256;
    const bedZ = activePlate.bed_dimensions?.z || 256;

    let movedParts: BuildPlatePart[] = [];
    setPlates((prevPlates) => {
      const remainingPlates = prevPlates.map((pl) => {
        const kept: BuildPlatePart[] = [];
        pl.parts.forEach((p) => {
          if (selectedPartIds.includes(p.id)) {
            movedParts.push(p);
          } else {
            kept.push(p);
          }
        });
        const updated = { ...pl, parts: kept };
        recalculatePlateMetrics(updated);
        return updated;
      });

      const newPlate: BuildPlate = {
        id: `plate-${Date.now()}`,
        name: `Mesa ${newPlateNumber}`,
        plateNumber: newPlateNumber,
        printer_id: activePlate.printer_id || printers[0]?.id || '',
        filament_id: activePlate.filament_id || '',
        filament_name: activePlate.filament_name || 'PLA',
        filament_color: activePlate.filament_color || 'Azul',
        filament_color_hex: activePlate.filament_color_hex || '#3b82f6',
        filament_material: activePlate.filament_material || 'PLA',
        bed_dimensions: { x: bedX, y: bedY, z: bedZ },
        parts: movedParts,
        estimated_time_minutes: 0,
        estimated_weight_g: 0,
        estimated_cost: 0,
      };
      recalculatePlateMetrics(newPlate);
      return [...remainingPlates, newPlate];
    });

    showNotification('success', `${selectedPartIds.length} peças movidas para a nova Mesa ${newPlateNumber}!`);
    setSelectedPartIds([]);
  };

  // Open geometric arrangement dialog with configured scope
  const handleOpenGeometricArrangeModal = (scope?: 'selected' | 'active_plate' | 'all_plates') => {
    if (scope) {
      setArrangeScope(scope);
    } else if (selectedPartIds.length > 0) {
      setArrangeScope('selected');
    } else {
      setArrangeScope('active_plate');
    }
    setIsAutoArrangeModalOpen(true);
  };

  // Determine which parts are targeted by the geometric auto-organizer
  const candidatePartsForArranging = useMemo<BuildPlatePart[]>(() => {
    if (arrangeScope === 'selected') {
      if (selectedPartIds.length === 0) return activePlate.parts;
      const list: BuildPlatePart[] = [];
      plates.forEach((pl) => {
        pl.parts.forEach((p) => {
          if (selectedPartIds.includes(p.id)) list.push(p);
        });
      });
      return list;
    }
    if (arrangeScope === 'all_plates') {
      const list: BuildPlatePart[] = [];
      plates.forEach((pl) => {
        pl.parts.forEach((p) => list.push(p));
      });
      return list;
    }
    // 'active_plate'
    return activePlate.parts;
  }, [arrangeScope, selectedPartIds, activePlate, plates]);

  // Live preview calculation of the geometric packing
  const geometricPackPreview = useMemo<GeometricPackResult>(() => {
    const bedX = activePlate.bed_dimensions?.x || 256;
    const bedY = activePlate.bed_dimensions?.y || 256;
    const bedZ = activePlate.bed_dimensions?.z || 256;

    return geometricPackPartsIntoPlates(candidatePartsForArranging, {
      bedWidth: bedX,
      bedDepth: bedY,
      bedHeight: bedZ,
      spacing: arrangeSpacing,
      edgeMargin: arrangeEdgeMargin,
      allowRotation90: arrangeAllowRotation,
      groupMode: arrangeGroupingMode,
    });
  }, [
    candidatePartsForArranging,
    activePlate.bed_dimensions,
    arrangeSpacing,
    arrangeEdgeMargin,
    arrangeAllowRotation,
    arrangeGroupingMode,
  ]);

  // Direct Quick Auto-Arrange on Active Plate using Geometric Guillotine Best-Fit algorithm
  const handleAutoArrangePlate = () => {
    if (activePlate.parts.length === 0) {
      showNotification('info', 'Não há peças nesta mesa para auto-organizar.');
      return;
    }

    // If user has selected multiple specific parts, open the modal for fine control
    if (selectedPartIds.length > 1) {
      handleOpenGeometricArrangeModal('selected');
      return;
    }

    const bedX = activePlate.bed_dimensions?.x || 256;
    const bedY = activePlate.bed_dimensions?.y || 256;
    const bedZ = activePlate.bed_dimensions?.z || 256;

    const packResult = geometricPackPartsIntoPlates(activePlate.parts, {
      bedWidth: bedX,
      bedDepth: bedY,
      bedHeight: bedZ,
      spacing: 8,
      edgeMargin: 10,
      allowRotation90: true,
      groupMode: 'active_plate_only',
    });

    if (packResult.plates.length === 0 || !packResult.plates[0]) {
      showNotification('error', 'Não foi possível organizar as peças dentro das dimensões da mesa.');
      return;
    }

    const placedPartsMap = new Map<string, GeometricPlacedPart>();
    packResult.plates[0].parts.forEach((p) => placedPartsMap.set(p.partId, p));

    const updatedParts = activePlate.parts.map((part) => {
      const placed = placedPartsMap.get(part.id);
      if (placed) {
        return {
          ...part,
          position: { ...placed.position },
          rotation: { ...placed.rotation },
          dimensions: { ...placed.placedDimensions },
        };
      }
      return part;
    });

    setPlates((prev) =>
      prev.map((p) => {
        if (p.id === activePlate.id) {
          const updated = { ...p, parts: updatedParts };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return p;
      })
    );

    const eff = packResult.plates[0].efficiencyPercent;
    const empty = packResult.plates[0].emptySpacePercent;
    showNotification(
      'success',
      `Auto-organização geométrica concluída! Ocupação útil de ${eff}% na mesa (espaço vazio minimizado para ${empty}%).`
    );
  };

  // Apply full geometric arrangement from modal
  const handleApplyGeometricArrange = () => {
    if (candidatePartsForArranging.length === 0) {
      showNotification('error', 'Nenhuma peça para auto-organizar.');
      return;
    }

    const packResult = geometricPackPreview;
    if (packResult.plates.length === 0) {
      showNotification('error', 'Não foi possível empacotar as peças na mesa.');
      return;
    }

    const bedX = activePlate.bed_dimensions?.x || 256;
    const bedY = activePlate.bed_dimensions?.y || 256;
    const bedZ = activePlate.bed_dimensions?.z || 256;

    // SCENARIO 1: Scope is active_plate only and fits in single plate
    if (arrangeScope === 'active_plate' && packResult.plates.length === 1 && arrangeGroupingMode !== 'by_color') {
      const placedMap = new Map<string, GeometricPlacedPart>();
      packResult.plates[0].parts.forEach((p) => placedMap.set(p.partId, p));

      const updatedParts = activePlate.parts.map((part) => {
        const placed = placedMap.get(part.id);
        if (placed) {
          return {
            ...part,
            position: { ...placed.position },
            rotation: { ...placed.rotation },
            dimensions: { ...placed.placedDimensions },
          };
        }
        return part;
      });

      setPlates((prev) =>
        prev.map((pl) => {
          if (pl.id === activePlate.id) {
            const updated = { ...pl, parts: updatedParts };
            recalculatePlateMetrics(updated);
            return updated;
          }
          return pl;
        })
      );

      setIsAutoArrangeModalOpen(false);
      showNotification(
        'success',
        `Mesa auto-organizada! ${packResult.totalPartsPlaced} peças alocadas com ${packResult.averageEfficiencyPercent}% de aproveitamento da superfície.`
      );
      return;
    }

    // SCENARIO 2: Scope is 'selected' parts
    if (arrangeScope === 'selected') {
      const arrangedPartIds = new Set(candidatePartsForArranging.map((p) => p.id));
      const remainingPlates = plates
        .map((pl) => {
          const keptParts = pl.parts.filter((p) => !arrangedPartIds.has(p.id));
          const updated = { ...pl, parts: keptParts };
          recalculatePlateMetrics(updated);
          return updated;
        })
        .filter((pl) => pl.parts.length > 0 || pl.id === activePlate.id);

      const basePlateNumber = remainingPlates.length;
      const createdPlates: BuildPlate[] = packResult.plates.map((packedPlate, idx) => {
        const color = packedPlate.filamentColorHex || activePlate.filament_color_hex || '#3b82f6';
        const matchingFilament = filaments.find((f) => f.color_hex?.toLowerCase() === color.toLowerCase()) || null;
        const newPlateParts = packedPlate.parts.map((placed) => ({
          ...placed.part,
          position: { ...placed.position },
          rotation: { ...placed.rotation },
          dimensions: { ...placed.placedDimensions },
        }));

        const newPl: BuildPlate = {
          id: `plate-geo-${Date.now()}-${idx}`,
          name: `Mesa ${basePlateNumber + idx + 1} - ${getColorName(color)} (${packedPlate.efficiencyPercent}% Ocup.)`,
          plateNumber: basePlateNumber + idx + 1,
          printer_id: activePlate.printer_id || printers[0]?.id || '',
          filament_id: matchingFilament?.id || activePlate.filament_id || '',
          filament_name: matchingFilament ? `${matchingFilament.name}` : activePlate.filament_name || 'PLA',
          filament_color: matchingFilament?.color || activePlate.filament_color || 'Padrão',
          filament_color_hex: color,
          filament_material: matchingFilament?.material || activePlate.filament_material || 'PLA',
          bed_dimensions: activePlate.bed_dimensions || { x: bedX, y: bedY, z: bedZ },
          parts: newPlateParts,
          estimated_time_minutes: 0,
          estimated_weight_g: 0,
          estimated_cost: 0,
        };
        recalculatePlateMetrics(newPl);
        return newPl;
      });

      const nextPlates = [...remainingPlates, ...createdPlates];
      setPlates(nextPlates);
      if (createdPlates.length > 0) {
        setActivePlateId(createdPlates[0].id);
      }
      setSelectedPartIds([]);
      setIsAutoArrangeModalOpen(false);

      showNotification(
        'success',
        `Auto-organização geométrica concluída! Peças selecionadas organizadas em ${createdPlates.length} ${
          createdPlates.length === 1 ? 'mesa individual' : 'mesas individuais'
        } com taxa de ocupação de ${packResult.averageEfficiencyPercent}%.`
      );
      return;
    }

    // SCENARIO 3: 'all_plates' or multi-plate packaging
    const createdPlates: BuildPlate[] = packResult.plates.map((packedPlate, idx) => {
      const color = packedPlate.filamentColorHex || activePlate.filament_color_hex || '#3b82f6';
      const matchingFilament = filaments.find((f) => f.color_hex?.toLowerCase() === color.toLowerCase()) || null;
      const newPlateParts = packedPlate.parts.map((placed) => ({
        ...placed.part,
        position: { ...placed.position },
        rotation: { ...placed.rotation },
        dimensions: { ...placed.placedDimensions },
      }));

      const newPl: BuildPlate = {
        id: `plate-geo-${Date.now()}-${idx}`,
        name: `Mesa ${idx + 1} - ${getColorName(color)} (${packedPlate.efficiencyPercent}% Ocup.)`,
        plateNumber: idx + 1,
        printer_id: activePlate.printer_id || printers[0]?.id || '',
        filament_id: matchingFilament?.id || activePlate.filament_id || '',
        filament_name: matchingFilament ? `${matchingFilament.name}` : activePlate.filament_name || 'PLA',
        filament_color: matchingFilament?.color || activePlate.filament_color || 'Padrão',
        filament_color_hex: color,
        filament_material: matchingFilament?.material || activePlate.filament_material || 'PLA',
        bed_dimensions: activePlate.bed_dimensions || { x: bedX, y: bedY, z: bedZ },
        parts: newPlateParts,
        estimated_time_minutes: 0,
        estimated_weight_g: 0,
        estimated_cost: 0,
      };
      recalculatePlateMetrics(newPl);
      return newPl;
    });

    setPlates(createdPlates);
    if (createdPlates.length > 0) {
      setActivePlateId(createdPlates[0].id);
      setSelectedPartId(createdPlates[0].parts[0]?.id || null);
    }
    setSelectedPartIds([]);
    setIsAutoArrangeModalOpen(false);

    showNotification(
      'success',
      `Auto-organização concluída com sucesso! ${packResult.totalPartsPlaced} peças agrupadas em ${
        packResult.totalPlatesCount
      } ${packResult.totalPlatesCount === 1 ? 'mesa' : 'mesas'} (Taxa média de ocupação: ${
        packResult.averageEfficiencyPercent
      }%).`
    );
  };

  // Duplicate a part
  const handleDuplicatePart = (partId: string) => {
    const partToDup = activePlate.parts.find((p) => p.id === partId);
    if (!partToDup) return;

    const newPart: BuildPlatePart = {
      ...partToDup,
      id: `part-dup-${Date.now()}`,
      name: `${partToDup.name} (Cópia)`,
      position: {
        x: partToDup.position.x + 15,
        y: 0,
        z: partToDup.position.z + 15,
      },
    };

    setPlates((prev) =>
      prev.map((p) => {
        if (p.id === activePlate.id) {
          const updated = { ...p, parts: [...p.parts, newPart] };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return p;
      })
    );

    showNotification('info', `Cópia de "${partToDup.name}" criada na mesa.`);
  };

  // Delete a part
  const handleDeletePart = (partId: string) => {
    setPlates((prev) =>
      prev.map((p) => {
        if (p.id === activePlate.id) {
          const updated = { ...p, parts: p.parts.filter((part) => part.id !== partId) };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return p;
      })
    );
    if (selectedPartId === partId) setSelectedPartId(null);
  };

  // Selected Part helper
  const selectedPart = useMemo(() => {
    if (!selectedPartId) return null;
    for (const plate of plates) {
      const part = plate.parts.find((p) => p.id === selectedPartId);
      if (part) return part;
    }
    return null;
  }, [plates, selectedPartId]);

  // Separate parts across plates strictly by color (e.g. blue in one plate, red in another)
  const handleSeparatePlatesByColor = () => {
    // 1. Gather all parts across all plates
    const allParts: BuildPlatePart[] = [];
    plates.forEach((plate) => {
      plate.parts.forEach((part) => {
        const color = part.color_hex || plate.filament_color_hex || '#2563eb';
        allParts.push({ ...part, color_hex: color });
      });
    });

    if (allParts.length === 0) {
      showNotification('error', 'Nenhuma peça encontrada no projeto para separar por cor.');
      return;
    }

    // 2. Identify distinct colors
    let colorMap = new Map<string, BuildPlatePart[]>();
    allParts.forEach((part) => {
      const color = (part.color_hex || '#2563eb').toLowerCase();
      if (!colorMap.has(color)) {
        colorMap.set(color, []);
      }
      colorMap.get(color)!.push(part);
    });

    // If all parts currently have the same single color but there are multiple parts,
    // let's distribute alternating colors (Blue, Red, Yellow...) so user gets the requested separation!
    if (colorMap.size === 1 && allParts.length > 1) {
      colorMap.clear();
      const distinctPalette = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];
      allParts.forEach((part, idx) => {
        const assigned = distinctPalette[idx % distinctPalette.length];
        part.color_hex = assigned;
        part.name = `${part.name.replace(/\s*\([^)]*\)/, '')} (${getColorName(assigned)})`;
        if (!colorMap.has(assigned)) {
          colorMap.set(assigned, []);
        }
        colorMap.get(assigned)!.push(part);
      });
    }

    // 3. Create dedicated BuildPlate for each color
    const newPlates: BuildPlate[] = [];
    let plateCounter = 1;

    colorMap.forEach((partsForColor, colorHex) => {
      const colorLabel = getColorName(colorHex);
      const matchingFilament = filaments.find(
        (f) =>
          f.color_hex?.toLowerCase() === colorHex.toLowerCase() ||
          f.color?.toLowerCase().includes(colorLabel.toLowerCase())
      ) || filaments[(plateCounter - 1) % (filaments.length || 1)] || null;

      const newPlate: BuildPlate = {
        id: `plate-color-${Date.now()}-${plateCounter}`,
        name: `Mesa ${plateCounter} - ${colorLabel}`,
        plateNumber: plateCounter,
        printer_id: printers[0]?.id || '',
        filament_id: matchingFilament?.id || '',
        filament_name: matchingFilament ? `${matchingFilament.name} (${matchingFilament.material})` : `PLA ${colorLabel}`,
        filament_color: colorLabel,
        filament_color_hex: colorHex,
        filament_material: matchingFilament?.material || 'PLA',
        bed_dimensions: activePlate.bed_dimensions || { x: 256, y: 256, z: 256 },
        parts: partsForColor,
        estimated_time_minutes: 0,
        estimated_weight_g: 0,
        estimated_cost: 0,
      };

      // Auto-arrange parts nicely on this bed
      const bedX = newPlate.bed_dimensions?.x || 250;
      const bedY = newPlate.bed_dimensions?.y || 250;
      const tempGroup = new THREE.Group();
      partsForColor.forEach((p) => {
        const cached = meshCache.get(p.originalMeshIndex);
        if (cached) {
          const cloned = cached.clone();
          cloned.userData = { partId: p.id };
          tempGroup.add(cloned);
        }
      });

      if (tempGroup.children.length > 0) {
        const arrangeResult = autoArrangePartsOnBed(tempGroup, bedX, bedY, 250, 10);
        newPlate.parts = partsForColor.map((part) => {
          const placedMesh = arrangeResult.group.children.find(
            (c) => c.userData?.partId === part.id
          ) as THREE.Mesh;
          if (placedMesh) {
            return {
              ...part,
              position: {
                x: Math.round(placedMesh.position.x * 10) / 10,
                y: 0,
                z: Math.round(placedMesh.position.z * 10) / 10,
              },
            };
          }
          return part;
        });
      }

      recalculatePlateMetrics(newPlate);
      newPlates.push(newPlate);
      plateCounter++;
    });

    setPlates(newPlates);
    if (newPlates.length > 0) {
      setActivePlateId(newPlates[0].id);
      setSelectedPartId(newPlates[0].parts[0]?.id || null);
    }

    const summary = newPlates
      .map((p) => `${p.name} (${p.parts.length} peças)`)
      .join(', ');

    showNotification(
      'success',
      `Mesas separadas por cor com sucesso! ${summary}`
    );
  };

  // Update part position directly (e.g. from 3D dragging)
  const handleUpdatePartPosition = (
    partId: string,
    newPos: { x: number; y: number; z: number }
  ) => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) =>
          p.id === partId
            ? {
                ...p,
                position: {
                  x: Math.round(newPos.x * 10) / 10,
                  y: Math.round(newPos.y * 10) / 10,
                  z: Math.round(newPos.z * 10) / 10,
                },
              }
            : p
        );
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
  };

  // Step part position along an axis by delta mm
  const handleStepPartPosition = (
    partId: string,
    axis: 'x' | 'y' | 'z',
    delta: number
  ) => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          const current = p.position[axis] || 0;
          return {
            ...p,
            position: {
              ...p.position,
              [axis]: Math.round((current + delta) * 10) / 10,
            },
          };
        });
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
  };

  // Center part on bed (X=0, Z=0)
  const handleCenterPart = (partId: string) => {
    handleUpdatePartPosition(partId, { x: 0, y: 0, z: 0 });
    showNotification('info', 'Peça centralizada no meio da mesa.');
  };

  // Drop part flat to bed (Y=0)
  const handleDropToBed = (partId: string) => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;
        const updatedParts = plate.parts.map((p) =>
          p.id === partId ? { ...p, position: { ...p.position, y: 0 } } : p
        );
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
    showNotification('info', 'Peça assentada na superfície da mesa (Z=0).');
  };

  // Rotate part on specific axis by delta degrees
  const handleRotatePartAxis = (
    partId: string,
    axis: 'x' | 'y' | 'z',
    deltaDeg: number
  ) => {
    const deltaRad = (deltaDeg * Math.PI) / 180;
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          const newRot = { ...p.rotation, [axis]: p.rotation[axis] + deltaRad };
          let newDims = { ...p.dimensions };
          if (Math.abs(deltaDeg) === 90) {
            if (axis === 'z') {
              newDims = { x: p.dimensions.y, y: p.dimensions.x, z: p.dimensions.z };
            } else if (axis === 'x') {
              newDims = { x: p.dimensions.x, y: p.dimensions.z, z: p.dimensions.y };
            } else if (axis === 'y') {
              newDims = { x: p.dimensions.z, y: p.dimensions.y, z: p.dimensions.x };
            }
          }
          return { ...p, rotation: newRot, dimensions: newDims };
        });

        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
  };

  // Reset rotations
  const handleResetRotation = (partId: string) => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          return {
            ...p,
            rotation: { x: 0, y: 0, z: 0 },
            position: { ...p.position, y: 0 },
          };
        });
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
    showNotification('info', 'Rotações da peça redefinidas para o padrão original (0°).');
  };

  // Lay flat on largest face
  const handleLayFlat = (partId: string) => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          return {
            ...p,
            rotation: { x: 0, y: 0, z: 0 },
            position: { ...p.position, y: 0 },
          };
        });
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
    showNotification('info', 'Peça assentada rente à mesa.');
  };

  // Scale part uniformly by factor (e.g. 1.25 = 125%)
  const handleUpdatePartScaleFactor = (partId: string, factor: number) => {
    const safeFactor = Math.max(0.1, Math.min(10, factor));
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          const oldFactor = p.scale.x || 1;
          const ratio = safeFactor / oldFactor;
          const newWeight = Math.round(p.weightGrams * Math.pow(ratio, 3) * 10) / 10;
          return {
            ...p,
            scale: { x: safeFactor, y: safeFactor, z: safeFactor },
            weightGrams: Math.max(0.1, newWeight),
          };
        });
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
  };

  // Update part dimension (mm)
  const handleUpdatePartDimension = (
    partId: string,
    axis: 'x' | 'y' | 'z',
    newSizeMm: number,
    lockProportions: boolean
  ) => {
    if (newSizeMm <= 0) return;
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          const currentSize = p.dimensions[axis] || 1;
          const ratio = newSizeMm / currentSize;

          if (lockProportions) {
            const newScaleX = (p.scale.x || 1) * ratio;
            const newScaleY = (p.scale.y || 1) * ratio;
            const newScaleZ = (p.scale.z || 1) * ratio;
            const newWeight = Math.round(p.weightGrams * Math.pow(ratio, 3) * 10) / 10;
            return {
              ...p,
              dimensions: {
                x: Math.round(p.dimensions.x * ratio * 10) / 10,
                y: Math.round(p.dimensions.y * ratio * 10) / 10,
                z: Math.round(p.dimensions.z * ratio * 10) / 10,
              },
              scale: { x: newScaleX, y: newScaleY, z: newScaleZ },
              weightGrams: Math.max(0.1, newWeight),
            };
          } else {
            const newScale = { ...p.scale, [axis]: (p.scale[axis] || 1) * ratio };
            const newDims = { ...p.dimensions, [axis]: Math.round(newSizeMm * 10) / 10 };
            const newWeight = Math.round(p.weightGrams * ratio * 10) / 10;
            return {
              ...p,
              dimensions: newDims,
              scale: newScale,
              weightGrams: Math.max(0.1, newWeight),
            };
          }
        });

        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
  };

  // Mirror part across an axis
  const handleMirrorPart = (partId: string, axis: 'x' | 'y' | 'z') => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          return {
            ...p,
            scale: {
              ...p.scale,
              [axis]: (p.scale[axis] || 1) * -1,
            },
          };
        });
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
    showNotification('info', `Peça espelhada no eixo ${axis.toUpperCase()}.`);
  };

  // Multiply part by adding N copies on active bed
  const handleMultiplyPart = (partId: string, copiesCount: number) => {
    const partToCopy = activePlate.parts.find((p) => p.id === partId);
    if (!partToCopy) return;

    const newCopies: BuildPlatePart[] = [];
    for (let i = 1; i <= copiesCount; i++) {
      newCopies.push({
        ...partToCopy,
        id: `part-copy-${Date.now()}-${i}`,
        name: `${partToCopy.name} (Cópia ${i})`,
        position: {
          x: partToCopy.position.x + i * 20,
          y: 0,
          z: partToCopy.position.z + i * 20,
        },
      });
    }

    setPlates((prev) =>
      prev.map((plate) => {
        if (plate.id === activePlate.id) {
          const updated = { ...plate, parts: [...plate.parts, ...newCopies] };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return plate;
      })
    );

    showNotification('success', `${copiesCount} cópias adicionadas à mesa. Organize-as com Auto-Arranjo!`);
  };

  // Set part color
  const handleSetPartColor = (partId: string, colorHex: string) => {
    setPlates((prev) =>
      prev.map((plate) => {
        const hasPart = plate.parts.some((p) => p.id === partId);
        if (!hasPart) return plate;

        const updatedParts = plate.parts.map((p) => {
          if (p.id !== partId) return p;
          const colorName = getColorName(colorHex);
          return {
            ...p,
            color_hex: colorHex,
            name: `${p.name.replace(/\s*\([^)]*\)/, '')} (${colorName})`,
          };
        });
        const updated = { ...plate, parts: updatedParts };
        recalculatePlateMetrics(updated);
        return updated;
      })
    );
  };

  // Move part to matching color plate (or create one)
  const handleMovePartToMatchingColorPlate = (partId: string) => {
    const part = selectedPart;
    if (!part) return;

    const targetColor = (part.color_hex || '#2563eb').toLowerCase();
    const targetColorName = getColorName(targetColor);

    // Look for existing plate matching this color
    let matchingPlate = plates.find(
      (p) =>
        (p.filament_color_hex || '').toLowerCase() === targetColor ||
        (p.filament_color || '').toLowerCase() === targetColorName.toLowerCase()
    );

    if (matchingPlate) {
      if (matchingPlate.id === activePlate.id) {
        showNotification('info', `Esta peça já está na ${matchingPlate.name}!`);
        return;
      }
      handleMovePartToPlate(part.id, matchingPlate.id);
      setActivePlateId(matchingPlate.id);
      showNotification('success', `Peça movida para ${matchingPlate.name}.`);
    } else {
      // Create new plate with this color
      const nextNum = plates.length + 1;
      const matchingFilament = filaments.find(
        (f) =>
          f.color_hex?.toLowerCase() === targetColor ||
          f.color?.toLowerCase().includes(targetColorName.toLowerCase())
      ) || null;

      const newPlate: BuildPlate = {
        id: `plate-color-${Date.now()}-${nextNum}`,
        name: `Mesa ${nextNum} - ${targetColorName}`,
        plateNumber: nextNum,
        printer_id: printers[0]?.id || '',
        filament_id: matchingFilament?.id || '',
        filament_name: matchingFilament
          ? `${matchingFilament.name} (${matchingFilament.material})`
          : `PLA ${targetColorName}`,
        filament_color: targetColorName,
        filament_color_hex: targetColor,
        filament_material: matchingFilament?.material || 'PLA',
        bed_dimensions: activePlate.bed_dimensions || { x: 256, y: 256, z: 256 },
        parts: [part],
        estimated_time_minutes: 0,
        estimated_weight_g: 0,
        estimated_cost: 0,
      };
      recalculatePlateMetrics(newPlate);

      // Remove part from current plate and add newPlate
      setPlates((prev) => [
        ...prev.map((pl) => {
          if (pl.id === activePlate.id) {
            const updated = {
              ...pl,
              parts: pl.parts.filter((p) => p.id !== part.id),
            };
            recalculatePlateMetrics(updated);
            return updated;
          }
          return pl;
        }),
        newPlate,
      ]);
      setActivePlateId(newPlate.id);
      showNotification(
        'success',
        `Nova ${newPlate.name} criada e peça alocada com sucesso!`
      );
    }
  };

  // Update plate filament / color
  const handleUpdatePlateFilament = (plateId: string, filamentId: string) => {
    const fil = filaments.find((f) => f.id === filamentId);
    if (!fil) return;

    setPlates((prev) =>
      prev.map((p) => {
        if (p.id === plateId) {
          const updated = {
            ...p,
            filament_id: fil.id,
            filament_name: `${fil.name} (${fil.material})`,
            filament_color: fil.color,
            filament_color_hex: fil.color_hex,
            filament_material: fil.material,
          };
          recalculatePlateMetrics(updated);
          return updated;
        }
        return p;
      })
    );
  };

  // Export Active Plate STL
  const handleExportActivePlateSTL = () => {
    if (activePlate.parts.length === 0) {
      showNotification('error', 'A mesa selecionada não possui peças para exportar.');
      return;
    }
    const blob = exportPlateToSTL(activePlate, meshCache);
    const filename = `${activePlate.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.stl`;
    downloadBlob(blob, filename);
    showNotification('success', `Arquivo STL da "${activePlate.name}" exportado com sucesso!`);
  };

  // Export All Plates to ZIP
  const handleExportAllPlatesZip = async () => {
    if (projectTotals.totalParts === 0) {
      showNotification('error', 'O projeto não possui peças para exportar.');
      return;
    }
    try {
      setIsProcessing(true);
      const zipBlob = await exportAllPlatesToZip(projectName, plates, meshCache);
      const filename = `${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_mesas.zip`;
      downloadBlob(zipBlob, filename);
      showNotification('success', `Pacote completo com ${plates.length} mesas exportado em ZIP!`);
    } catch (e: any) {
      showNotification('error', `Falha ao gerar arquivo ZIP: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Project directly to Database (/api/plate-projects)
  const handleSavePlateProject = async () => {
    try {
      setIsProcessing(true);
      const payload: PlatesProjectData = {
        projectName,
        sourceFileName,
        plates,
        totalPlates: plates.length,
        totalParts: projectTotals.totalParts,
        totalWeightG: projectTotals.totalWeight,
        totalTimeMinutes: projectTotals.totalTime,
        totalCost: projectTotals.totalCost,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/plate-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          source_filename: sourceFileName,
          plates_json: JSON.stringify(payload),
          total_plates: plates.length,
          total_parts: projectTotals.totalParts,
          total_weight_g: projectTotals.totalWeight,
          total_time_minutes: projectTotals.totalTime,
        }),
      });

      if (res.ok) {
        showNotification('success', 'Projeto de mesas salvo com sucesso no banco de dados!');
      } else {
        throw new Error('Falha ao gravar projeto no servidor');
      }
    } catch (e: any) {
      showNotification('error', `Erro ao salvar projeto: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Save to Product Catalog Modal
  const handleOpenSaveToCatalogModal = () => {
    setNewProductName(projectName);
    const suggested = Math.round(projectTotals.totalCost * 2.2 * 100) / 100;
    setNewProductSalePrice(suggested);
    setIsSaveModalOpen(true);
  };

  // Confirm Saving to Product Catalog
  const handleSaveToCatalogConfirm = async () => {
    setIsSavingProduct(true);
    try {
      // Capture 3D Snapshot
      let snapshotUrl = '';
      if (snapshotGetterRef.current) {
        snapshotUrl = snapshotGetterRef.current() || '';
      }

      const platesPayload: PlatesProjectData = {
        projectName,
        sourceFileName,
        plates,
        totalPlates: plates.length,
        totalParts: projectTotals.totalParts,
        totalWeightG: projectTotals.totalWeight,
        totalTimeMinutes: projectTotals.totalTime,
        totalCost: projectTotals.totalCost,
        updatedAt: new Date().toISOString(),
      };

      const primaryFilament = filaments.find((f) => f.id === activePlate.filament_id) || filaments[0];
      const primaryPrinter = printers.find((p) => p.id === activePlate.printer_id) || printers[0];

      if (saveMode === 'new') {
        const payload = {
          name: newProductName.trim() || projectName,
          category: newProductCategory,
          description: `Produto com produção dividida em ${plates.length} mesas por cor única. Peso total: ${projectTotals.totalWeight}g.`,
          stl_filename: sourceFileName,
          printer_id: primaryPrinter?.id || '',
          filament_id: primaryFilament?.id || '',
          filament_weight_g: projectTotals.totalWeight,
          print_time_minutes: projectTotals.totalTime,
          energy_cost: Math.round((projectTotals.totalTime / 60) * 0.28 * 0.85 * 100) / 100,
          filament_cost: projectTotals.totalCost,
          loss_margin_percent: 10,
          depreciation_cost: Math.round((projectTotals.totalTime / 60) * 0.5 * 100) / 100,
          labor_cost: 0,
          extra_supplies_json: '[]',
          extra_supplies_cost: 0,
          total_cost: projectTotals.totalCost,
          markup_percent: newProductMarkup,
          suggested_price: Math.round(projectTotals.totalCost * (1 + newProductMarkup / 100) * 100) / 100,
          sale_price: newProductSalePrice || Math.round(projectTotals.totalCost * 2 * 100) / 100,
          ready_stock_qty: 0,
          min_stock_alert: 5,
          image_url: snapshotUrl,
          plates_json: JSON.stringify(platesPayload),
        };

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showNotification(
            'success',
            `Produto "${payload.name}" cadastrado no Catálogo com divisão em ${plates.length} mesas salva!`
          );
          setIsSaveModalOpen(false);
          if (onRefreshProducts) onRefreshProducts();
        } else {
          throw new Error('Erro ao cadastrar novo produto no catálogo');
        }
      } else {
        // Update existing product
        if (!selectedExistingProductId) {
          throw new Error('Selecione um produto existente para atualizar');
        }

        const res = await fetch(`/api/products/${selectedExistingProductId}/plates`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plates_json: JSON.stringify(platesPayload),
            filament_weight_g: projectTotals.totalWeight,
            print_time_minutes: projectTotals.totalTime,
            image_url: snapshotUrl || undefined,
          }),
        });

        if (res.ok) {
          showNotification('success', 'Ficha do produto atualizada com o novo arranjo de mesas!');
          setIsSaveModalOpen(false);
          if (onRefreshProducts) onRefreshProducts();
        } else {
          throw new Error('Erro ao atualizar produto no catálogo');
        }
      }
    } catch (e: any) {
      showNotification('error', `Erro ao salvar produto: ${e.message}`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Load an existing product's plates configuration from Catalog
  const handleLoadFromProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (!prod.plates_json || prod.plates_json === '[]') {
      showNotification('info', `O produto "${prod.name}" ainda não possui configuração de mesas salva.`);
      return;
    }

    try {
      const parsed: PlatesProjectData = JSON.parse(prod.plates_json);
      if (parsed.plates && parsed.plates.length > 0) {
        setProjectName(parsed.projectName || prod.name);
        setSourceFileName(parsed.sourceFileName || prod.stl_filename || 'produto_mesas.stl');
        setPlates(parsed.plates);
        setActivePlateId(parsed.plates[0].id);

        // If no meshes in cache, generate sample box so user can view
        if (meshCache.size === 0) {
          generateSampleModel('box_lid');
        }
        showNotification('success', `Projeto de mesas do produto "${prod.name}" carregado com sucesso!`);
      }
    } catch (e: any) {
      showNotification('error', `Erro ao ler dados de mesas do produto: ${e.message}`);
    }
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-[#0A0A0C] p-4 sm:p-6 overflow-y-auto space-y-5" : "space-y-5"}>
      {/* Top Notification Banner */}
      {notification && (
        <div
          role="alert"
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-fadeIn shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Split className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header & Actions Bar */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Editor 3D de Mesas (OrcaSlicer Style)
              </span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-transparent text-white font-bold text-base sm:text-lg border-b border-white/[0.1] hover:border-white/[0.3] focus:border-sky-500 focus:outline-none px-1 py-0.5 transition"
                placeholder="Nome do Projeto..."
                title="Clique para renomear o projeto"
              />
            </div>
            <p className="text-xs text-slate-400">
              Separe as partes do modelo 3D em mesas distintas para impressão em cor única. Salve no catálogo com ficha técnica completa.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="bg-white/[0.08] hover:bg-white/[0.15] text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer border border-white/[0.1]"
              title={isFullscreen ? "Sair da Tela Inteira" : "Modo Tela Inteira de Editoração (OrcaSlicer)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-sky-400" />
                  <span>Restaurar Tela</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-sky-400" />
                  <span>Tela Inteira</span>
                </>
              )}
            </button>

            {/* Direct Print Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsDirectPrintOpen(true)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Disparar impressão da mesa ativa via Moonraker/Bambu"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Imprimir Mesa</span>
            </button>

            {/* Save to Product Catalog Modal */}
            <button
              type="button"
              onClick={handleOpenSaveToCatalogModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Guardar arquivo e mesas junto ao Catálogo de Produtos"
            >
              <Tag className="w-4 h-4" />
              <span>Guardar no Catálogo</span>
            </button>

            {/* Export STLs */}
            <div className="flex items-center bg-[#0A0A0B] border border-white/[0.1] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={handleExportActivePlateSTL}
                className="text-slate-300 hover:text-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/[0.04] transition"
                title="Exportar STL da mesa ativa"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>STL da Mesa</span>
              </button>
              <div className="w-[1px] h-4 bg-white/[0.1]" />
              <button
                type="button"
                onClick={handleExportAllPlatesZip}
                className="text-slate-300 hover:text-white px-3 py-2 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/[0.04] transition"
                title="Exportar todas as mesas em um arquivo ZIP"
              >
                <span>ZIP Todas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Project Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-white/[0.06] text-xs">
          <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Mesas Configuradas</span>
            <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5 mt-0.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              {projectTotals.totalPlates} {projectTotals.totalPlates === 1 ? 'Mesa' : 'Mesas'}
            </span>
          </div>

          <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Total de Peças</span>
            <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5 mt-0.5">
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              {projectTotals.totalParts} componentes
            </span>
          </div>

          <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Filamento Total</span>
            <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5 mt-0.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              {projectTotals.totalWeight}g
            </span>
          </div>

          <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Tempo Estimado</span>
            <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              {Math.floor(projectTotals.totalTime / 60)}h {projectTotals.totalTime % 60}m
            </span>
          </div>

          <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-2.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block font-medium">Custo Material</span>
            <span className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
              R$ {projectTotals.totalCost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Model Import Source Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-white/[0.06]">
          {/* File Upload or Preset Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="bg-[#0A0A0B] border border-white/[0.1] hover:border-sky-500/50 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-2 transition font-medium">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Importar Arquivo 3D (STL, 3MF, STEP, OBJ)</span>
              <input
                type="file"
                accept=".stl,.3mf,.step,.stp,.obj,.ply"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </label>

            <span className="text-slate-500">ou Exemplos:</span>
            <button
              type="button"
              onClick={() => generateSampleModel('box_lid')}
              className="px-2.5 py-1 rounded-xl bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-300 hover:text-white text-[11px] transition"
            >
              Caixa + Tampa
            </button>
            <button
              type="button"
              onClick={() => generateSampleModel('keychain_parts')}
              className="px-2.5 py-1 rounded-xl bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-300 hover:text-white text-[11px] transition"
            >
              Chaveiro Bicolor
            </button>
            <button
              type="button"
              onClick={() => generateSampleModel('gears_batch')}
              className="px-2.5 py-1 rounded-xl bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-300 hover:text-white text-[11px] transition"
            >
              Lote de Engrenagens
            </button>
          </div>

          {/* Load from existing catalog product */}
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Carregar de Produto:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleLoadFromProduct(e.target.value);
                }}
                defaultValue=""
                className="bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="" disabled>
                  Selecionar do catálogo...
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.plates_json && p.plates_json !== '[]' ? '★ (Com Mesas)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Build Plates Tabs Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-2">
          {plates.map((plate) => {
            const isActive = plate.id === activePlate.id;
            return (
              <button
                key={plate.id}
                type="button"
                onClick={() => {
                  setActivePlateId(plate.id);
                  setViewMode('single');
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm font-bold'
                    : 'bg-[#121215] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0 border border-white/40 shadow-xs"
                  style={{ backgroundColor: plate.filament_color_hex || '#3b82f6' }}
                />
                <span>{plate.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-[#0A0A0B] border border-white/[0.06] text-slate-400'
                  }`}
                >
                  {plate.parts.length} peças
                </span>
              </button>
            );
          })}

          {/* Color Separation Button */}
          <button
            type="button"
            onClick={handleSeparatePlatesByColor}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-rose-600/30 border border-sky-500/50 hover:border-sky-400 text-sky-200 hover:text-white text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer shadow-xs"
            title="Separar peças azuis numa mesa e peças vermelhas em outra mesa"
          >
            <div className="flex -space-x-1 items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white/60 shadow-xs" />
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white/60 shadow-xs" />
            </div>
            <span>Separar Mesas por Cor</span>
          </button>

          {/* Smart Geometric Auto-Arrangement Button */}
          <button
            type="button"
            onClick={() => handleOpenGeometricArrangeModal('active_plate')}
            className="px-3.5 py-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 hover:border-sky-400 text-sky-200 hover:text-white text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer shadow-xs"
            title="Auto-organizar peças utilizando lógica geométrica 2D para minimizar o espaço vazio na mesa"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Organização Inteligente</span>
          </button>

          {/* Add Plate Button */}
          <button
            type="button"
            onClick={handleAddPlate}
            className="px-3 py-2 rounded-2xl border border-dashed border-white/[0.2] hover:border-sky-500 text-slate-400 hover:text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
            title="Adicionar nova mesa de impressão"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Mesa</span>
          </button>
        </div>

        {/* View Mode Toggle (Single Plate vs All Plates side-by-side) */}
        <div className="flex items-center bg-[#121215] border border-white/[0.08] rounded-2xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
              viewMode === 'single' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mesa Atual
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === 'all' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Todas Lado a Lado</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: 3D Stage (Left) and Slicer Inspector / Parts & Plate Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center: Interactive 3D Bed Viewer */}
        <div className="lg:col-span-8 bg-[#121215] border border-white/[0.08] rounded-3xl p-4 shadow-sm flex flex-col h-[580px]">
          <div className="flex-1 w-full relative">
            <PlateViewer3D
              activePlate={activePlate}
              allPlates={plates}
              viewMode={viewMode}
              selectedPartId={selectedPartId}
              onSelectPart={(id) => {
                setSelectedPartId(id);
                setRightSidebarTab('slicer');
              }}
              onUpdatePartPosition={handleUpdatePartPosition}
              onRotatePart90={() => {
                if (selectedPartId) handleRotatePartAxis(selectedPartId, 'z', 90);
              }}
              onAutoArrange={handleAutoArrangePlate}
              onSeparateByColor={handleSeparatePlatesByColor}
              meshCache={meshCache}
              theme={theme}
              isWireframe={isWireframe}
              onToggleWireframe={() => setIsWireframe((prev) => !prev)}
              onSnapshotReady={(getter) => {
                snapshotGetterRef.current = getter;
              }}
            />
          </div>

          {/* Quick Actions Bar for Active Plate */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-white/[0.06] text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoArrangePlate}
                className="bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-200 hover:text-white font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Distribui e empacota as peças na mesa utilizando algoritmo geométrico 2D"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Organizar Peças</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenGeometricArrangeModal('active_plate')}
                className="p-1.5 rounded-xl bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-300 hover:text-white transition cursor-pointer"
                title="Configurar opções de empacotamento geométrico e agrupamento de mesas"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedPartId) handleRotatePartAxis(selectedPartId, 'z', 90);
                }}
                disabled={!selectedPartId}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition font-semibold ${
                  selectedPartId
                    ? 'bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-200 hover:text-white cursor-pointer'
                    : 'opacity-40 cursor-not-allowed text-slate-500 bg-[#0A0A0B] border border-white/[0.04]'
                }`}
                title="Girar peça selecionada 90° no plano da mesa"
              >
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Girar 90°</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedPartId) handleCenterPart(selectedPartId);
                }}
                disabled={!selectedPartId}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition font-semibold ${
                  selectedPartId
                    ? 'bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-200 hover:text-white cursor-pointer'
                    : 'opacity-40 cursor-not-allowed text-slate-500 bg-[#0A0A0B] border border-white/[0.04]'
                }`}
                title="Centralizar peça no centro da mesa"
              >
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span>Centralizar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedPartId) handleDropToBed(selectedPartId);
                }}
                disabled={!selectedPartId}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition font-semibold ${
                  selectedPartId
                    ? 'bg-[#0A0A0B] border border-white/[0.08] hover:border-sky-500/50 text-slate-200 hover:text-white cursor-pointer'
                    : 'opacity-40 cursor-not-allowed text-slate-500 bg-[#0A0A0B] border border-white/[0.04]'
                }`}
                title="Assentar peça rente à superfície da mesa"
              >
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assentar Z=0</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-slate-400 font-mono">
              <span>{activePlate.parts.length} peças nesta mesa</span>
              <span>•</span>
              <span className="text-white font-semibold">{activePlate.estimated_weight_g}g</span>
              <span>•</span>
              <span>{activePlate.estimated_time_minutes} min</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Comprehensive Slicer Inspector & Plate Tools */}
        <div className="lg:col-span-4 space-y-4">
          {/* Main Sidebar Tabs */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-1.5 flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setRightSidebarTab('slicer')}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                rightSidebarTab === 'slicer'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustar Peça (Slicer)</span>
            </button>

            <button
              type="button"
              onClick={() => setRightSidebarTab('parts')}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                rightSidebarTab === 'parts'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Peças ({activePlate.parts.length})</span>
            </button>
          </div>

          {/* TAB 1: Slicer Inspector (Move, Rotate, Scale, Color, Duplicate) */}
          {rightSidebarTab === 'slicer' && (
            <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-4 space-y-4 shadow-sm">
              {selectedPart ? (
                <>
                  {/* Selected Part Header & Color Badge */}
                  <div className="border-b border-white/[0.06] pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/40 shadow-xs"
                          style={{ backgroundColor: selectedPart.color_hex || activePlate.filament_color_hex || '#2563eb' }}
                        />
                        <input
                          type="text"
                          value={selectedPart.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPlates((prev) =>
                              prev.map((pl) => ({
                                ...pl,
                                parts: pl.parts.map((p) =>
                                  p.id === selectedPart.id ? { ...p, name: val } : p
                                ),
                              }))
                            );
                          }}
                          className="bg-transparent text-white font-bold text-xs border-b border-transparent hover:border-white/[0.2] focus:border-sky-500 focus:outline-none flex-1 truncate"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicatePart(selectedPart.id)}
                          className="p-1 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-white/[0.06] transition"
                          title="Duplicar peça na mesa"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePart(selectedPart.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/[0.06] transition"
                          title="Excluir peça da mesa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dimensions & Weight Tags */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono bg-[#0A0A0B] border border-white/[0.06] px-2.5 py-1.5 rounded-xl">
                      <span>{selectedPart.dimensions.x} × {selectedPart.dimensions.y} × {selectedPart.dimensions.z} mm</span>
                      <span className="text-white font-semibold">{selectedPart.weightGrams}g</span>
                      <span>{selectedPart.volumeCm3} cm³</span>
                    </div>
                  </div>

                  {/* Color Palette & Send-to-Color-Plate Action */}
                  <div className="space-y-2 p-3 bg-[#0A0A0B] border border-white/[0.06] rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-sky-400" />
                        <span>Cor da Peça:</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {getColorName(selectedPart.color_hex || '#2563eb')}
                      </span>
                    </div>

                    {/* Quick Color Swatches */}
                    <div className="flex items-center gap-2">
                      {[
                        { hex: '#2563eb', label: 'Azul' },
                        { hex: '#ef4444', label: 'Vermelho' },
                        { hex: '#f59e0b', label: 'Amarelo' },
                        { hex: '#10b981', label: 'Verde' },
                        { hex: '#8b5cf6', label: 'Roxo' },
                        { hex: '#f8fafc', label: 'Branco' },
                        { hex: '#18181b', label: 'Preto' },
                      ].map((item) => {
                        const isCurrentColor =
                          (selectedPart.color_hex || '#2563eb').toLowerCase() === item.hex.toLowerCase();
                        return (
                          <button
                            key={item.hex}
                            type="button"
                            onClick={() => handleSetPartColor(selectedPart.id, item.hex)}
                            className={`w-6 h-6 rounded-full border transition relative flex items-center justify-center ${
                              isCurrentColor
                                ? 'scale-110 ring-2 ring-sky-400 border-white'
                                : 'border-white/30 hover:scale-105'
                            }`}
                            style={{ backgroundColor: item.hex }}
                            title={item.label}
                          >
                            {isCurrentColor && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                          </button>
                        );
                      })}
                      <input
                        type="color"
                        value={selectedPart.color_hex || '#2563eb'}
                        onChange={(e) => handleSetPartColor(selectedPart.id, e.target.value)}
                        className="w-6 h-6 rounded-full border border-white/30 cursor-pointer bg-transparent"
                        title="Cor personalizada"
                      />
                    </div>

                    {/* Direct Move to Color-Matched Plate */}
                    <button
                      type="button"
                      onClick={() => handleMovePartToMatchingColorPlate(selectedPart.id)}
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/60 text-sky-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                      title="Mover esta peça diretamente para a mesa de impressão da sua cor"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Mover para Mesa da Cor {getColorName(selectedPart.color_hex || '#2563eb')}</span>
                    </button>
                  </div>

                  {/* Slicer Tool Sub-tabs (Move, Rotate, Scale, Mirror, Multiply) */}
                  <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-2xl border border-white/[0.06] text-xs">
                    <button
                      type="button"
                      onClick={() => setSlicerToolTab('move')}
                      className={`flex-1 py-1.5 rounded-xl font-semibold transition ${
                        slicerToolTab === 'move' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mover
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlicerToolTab('rotate')}
                      className={`flex-1 py-1.5 rounded-xl font-semibold transition ${
                        slicerToolTab === 'rotate' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Girar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlicerToolTab('scale')}
                      className={`flex-1 py-1.5 rounded-xl font-semibold transition ${
                        slicerToolTab === 'scale' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Escala
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlicerToolTab('multiply')}
                      className={`flex-1 py-1.5 rounded-xl font-semibold transition ${
                        slicerToolTab === 'multiply' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Multiplicar
                    </button>
                  </div>

                  {/* SUB-TOOL: MOVE */}
                  {slicerToolTab === 'move' && (
                    <div className="space-y-3 text-xs bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                      <div className="space-y-2">
                        {/* Axis X */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 font-mono w-12">X (mm):</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'x', -10)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'x', -1)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              -1
                            </button>
                            <input
                              type="number"
                              step="1"
                              value={Math.round(selectedPart.position.x * 10) / 10}
                              onChange={(e) =>
                                handleUpdatePartPosition(selectedPart.id, {
                                  ...selectedPart.position,
                                  x: Number(e.target.value),
                                })
                              }
                              className="w-16 bg-[#121215] border border-white/[0.1] rounded-lg px-2 py-1 text-center font-mono text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'x', 1)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'x', 10)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              +10
                            </button>
                          </div>
                        </div>

                        {/* Axis Y (Z on bed) */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 font-mono w-12">Y (mm):</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'z', -10)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'z', -1)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              -1
                            </button>
                            <input
                              type="number"
                              step="1"
                              value={Math.round(selectedPart.position.z * 10) / 10}
                              onChange={(e) =>
                                handleUpdatePartPosition(selectedPart.id, {
                                  ...selectedPart.position,
                                  z: Number(e.target.value),
                                })
                              }
                              className="w-16 bg-[#121215] border border-white/[0.1] rounded-lg px-2 py-1 text-center font-mono text-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'z', 1)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepPartPosition(selectedPart.id, 'z', 10)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 font-mono text-[11px]"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => handleCenterPart(selectedPart.id)}
                          className="py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white font-medium flex items-center justify-center gap-1.5 transition text-xs"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Centralizar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDropToBed(selectedPart.id)}
                          className="py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white font-medium flex items-center justify-center gap-1.5 transition text-xs"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Assentar Z=0</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB-TOOL: ROTATE */}
                  {slicerToolTab === 'rotate' && (
                    <div className="space-y-3 text-xs bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                      <div className="space-y-2">
                        <span className="text-slate-400 block font-medium">Giro Rápido em 90°:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleRotatePartAxis(selectedPart.id, 'z', 90)}
                            className="py-2 px-1 rounded-xl bg-white/[0.06] hover:bg-sky-500/20 hover:border-sky-500/40 border border-transparent text-slate-200 hover:text-white flex flex-col items-center gap-1 transition"
                            title="Girar 90 graus no plano da mesa (Z)"
                          >
                            <RotateCw className="w-4 h-4 text-sky-400" />
                            <span className="text-[10px] font-mono">Eixo Z (+90°)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotatePartAxis(selectedPart.id, 'x', 90)}
                            className="py-2 px-1 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent text-slate-200 hover:text-white flex flex-col items-center gap-1 transition"
                            title="Tombar 90 graus no eixo X"
                          >
                            <RotateCw className="w-4 h-4 text-rose-400" />
                            <span className="text-[10px] font-mono">Eixo X (+90°)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotatePartAxis(selectedPart.id, 'y', 90)}
                            className="py-2 px-1 rounded-xl bg-white/[0.06] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-transparent text-slate-200 hover:text-white flex flex-col items-center gap-1 transition"
                            title="Tombar 90 graus no eixo Y"
                          >
                            <RotateCw className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-mono">Eixo Y (+90°)</span>
                          </button>
                        </div>
                      </div>

                      {/* Reset & Lay Flat */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => handleLayFlat(selectedPart.id)}
                          className="py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white font-medium flex items-center justify-center gap-1.5 transition text-xs"
                          title="Deitar a peça rente à mesa"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Deitar na Mesa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetRotation(selectedPart.id)}
                          className="py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white font-medium flex items-center justify-center gap-1.5 transition text-xs"
                          title="Redefinir rotações para zero"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                          <span>Resetar (0°)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB-TOOL: SCALE */}
                  {slicerToolTab === 'scale' && (
                    <div className="space-y-3 text-xs bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                      {/* Presets */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Escala Rápida:</span>
                          <button
                            type="button"
                            onClick={() => setUniformScaleLocked((prev) => !prev)}
                            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                          >
                            {uniformScaleLocked ? (
                              <>
                                <Lock className="w-3 h-3 text-sky-400" />
                                <span className="text-sky-400 font-semibold">Proporcional</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-amber-400" />
                                <span className="text-amber-400 font-semibold">Livre</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {[0.5, 0.75, 1.0, 1.25, 1.5].map((fac) => (
                            <button
                              key={fac}
                              type="button"
                              onClick={() => handleUpdatePartScaleFactor(selectedPart.id, fac)}
                              className="py-1 rounded-lg bg-white/[0.06] hover:bg-sky-500/20 text-slate-300 hover:text-white font-mono text-[11px]"
                            >
                              {Math.round(fac * 100)}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dimension inputs in mm */}
                      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                        <span className="text-slate-400 block font-medium">Dimensões em mm:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">X (Largura):</label>
                            <input
                              type="number"
                              step="0.5"
                              value={selectedPart.dimensions.x}
                              onChange={(e) =>
                                handleUpdatePartDimension(
                                  selectedPart.id,
                                  'x',
                                  Number(e.target.value),
                                  uniformScaleLocked
                                )
                              }
                              className="w-full bg-[#121215] border border-white/[0.1] rounded-lg px-2 py-1 text-center font-mono text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Y (Comp.):</label>
                            <input
                              type="number"
                              step="0.5"
                              value={selectedPart.dimensions.y}
                              onChange={(e) =>
                                handleUpdatePartDimension(
                                  selectedPart.id,
                                  'y',
                                  Number(e.target.value),
                                  uniformScaleLocked
                                )
                              }
                              className="w-full bg-[#121215] border border-white/[0.1] rounded-lg px-2 py-1 text-center font-mono text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Z (Altura):</label>
                            <input
                              type="number"
                              step="0.5"
                              value={selectedPart.dimensions.z}
                              onChange={(e) =>
                                handleUpdatePartDimension(
                                  selectedPart.id,
                                  'z',
                                  Number(e.target.value),
                                  uniformScaleLocked
                                )
                              }
                              className="w-full bg-[#121215] border border-white/[0.1] rounded-lg px-2 py-1 text-center font-mono text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mirror Actions */}
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <span className="text-slate-400 block font-medium">Espelhar Peça:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleMirrorPart(selectedPart.id, 'x')}
                            className="py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition text-[11px]"
                          >
                            <FlipHorizontal className="w-3.5 h-3.5 text-sky-400" />
                            <span>Espelhar X</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMirrorPart(selectedPart.id, 'y')}
                            className="py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition text-[11px]"
                          >
                            <FlipHorizontal className="w-3.5 h-3.5 text-rose-400" />
                            <span>Espelhar Y</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TOOL: MULTIPLY & TRANSFER */}
                  {slicerToolTab === 'multiply' && (
                    <div className="space-y-3 text-xs bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06]">
                      <div className="space-y-2">
                        <span className="text-slate-400 block font-medium">Multiplicar Peças nesta Mesa:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleMultiplyPart(selectedPart.id, 1)}
                            className="py-2 rounded-xl bg-white/[0.06] hover:bg-emerald-500/20 text-slate-200 hover:text-white font-semibold transition"
                          >
                            +1 Cópia
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMultiplyPart(selectedPart.id, 2)}
                            className="py-2 rounded-xl bg-white/[0.06] hover:bg-emerald-500/20 text-slate-200 hover:text-white font-semibold transition"
                          >
                            +2 Cópias
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMultiplyPart(selectedPart.id, 4)}
                            className="py-2 rounded-xl bg-white/[0.06] hover:bg-emerald-500/20 text-slate-200 hover:text-white font-semibold transition"
                          >
                            +4 Cópias
                          </button>
                        </div>
                      </div>

                      {/* Move to another plate dropdown */}
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <span className="text-slate-400 block font-medium">Transferir para Outra Mesa:</span>
                        <select
                          value={activePlate.id}
                          onChange={(e) => {
                            if (e.target.value !== activePlate.id) {
                              handleMovePartToPlate(selectedPart.id, e.target.value);
                            }
                          }}
                          className="w-full bg-[#121215] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                        >
                          {plates.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name} {pl.id === activePlate.id ? '(Mesa Atual)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Empty state when no part is selected */
                <div className="p-6 text-center space-y-3 bg-[#0A0A0B] rounded-2xl border border-white/[0.04]">
                  <Sliders className="w-8 h-8 text-sky-400/60 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">Nenhuma peça selecionada</p>
                    <p className="text-[11px] text-slate-400">
                      Clique em qualquer peça na mesa 3D ou selecione abaixo para ajustar posição, giro, escala e cor.
                    </p>
                  </div>
                  {activePlate.parts.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                      {activePlate.parts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPartId(p.id)}
                          className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-sky-500/20 text-slate-300 hover:text-white text-xs transition flex items-center gap-1.5"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: p.color_hex || activePlate.filament_color_hex || '#3b82f6' }}
                          />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Parts List on Active Plate with Multi-Selection */}
          {rightSidebarTab === 'parts' && (
            <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Peças nesta Mesa ({activePlate.parts.length})
                  </h3>
                </div>

                {/* Quick Selection Actions */}
                <div className="flex items-center gap-2 text-[11px]">
                  {activePlate.parts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allActiveSelected = activePlate.parts.every((p) =>
                          selectedPartIds.includes(p.id)
                        );
                        if (allActiveSelected) {
                          setSelectedPartIds((prev) =>
                            prev.filter((id) => !activePlate.parts.some((p) => p.id === id))
                          );
                        } else {
                          handleSelectAllActivePlate();
                        }
                      }}
                      className="text-sky-400 hover:text-sky-300 font-medium transition cursor-pointer"
                    >
                      {activePlate.parts.every((p) => selectedPartIds.includes(p.id))
                        ? 'Desmarcar Mesa'
                        : 'Selecionar Mesa'}
                    </button>
                  )}
                  {selectedPartIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-slate-400 hover:text-white font-medium transition cursor-pointer"
                    >
                      Limpar ({selectedPartIds.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Selection Batch Actions Banner */}
              {selectedPartIds.length > 0 && (
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                      {selectedPartIds.length} {selectedPartIds.length === 1 ? 'peça selecionada' : 'peças selecionadas'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenGeometricArrangeModal('selected')}
                      className="bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      title="Organizar geometricamente as peças selecionadas em mesas otimizadas"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Auto-Organizar Selecionadas</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-sky-500/20 text-[11px]">
                    <button
                      type="button"
                      onClick={handleMoveSelectedPartsToNewPlate}
                      className="bg-[#0A0A0B]/80 hover:bg-white/[0.08] text-slate-200 hover:text-white py-1.5 px-2 rounded-xl border border-white/[0.08] flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3 h-3 text-sky-400" />
                      <span>Mover p/ Nova Mesa</span>
                    </button>

                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMoveSelectedPartsToPlate(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-[#0A0A0B]/80 hover:bg-white/[0.08] text-slate-300 py-1.5 px-2 rounded-xl border border-white/[0.08] focus:outline-none text-[11px]"
                    >
                      <option value="" disabled>
                        Mover para Mesa...
                      </option>
                      {plates.map((pl) => (
                        <option key={pl.id} value={pl.id} disabled={pl.id === activePlate.id}>
                          {pl.name} {pl.id === activePlate.id ? '(Atual)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activePlate.parts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-[#0A0A0B] rounded-2xl border border-white/[0.04] space-y-2">
                  <p>Nenhuma peça nesta mesa.</p>
                  <p className="text-[11px] text-slate-600">
                    Use o botão "Separar Mesas por Cor" ou transfira peças através dos seletores.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {activePlate.parts.map((part) => {
                    const isSelectedSingle = selectedPartId === part.id;
                    const isSelectedMulti = selectedPartIds.includes(part.id);
                    return (
                      <div
                        key={part.id}
                        onClick={() => {
                          setSelectedPartId(part.id);
                          setRightSidebarTab('slicer');
                        }}
                        className={`p-3 rounded-2xl border transition cursor-pointer space-y-2 ${
                          isSelectedMulti
                            ? 'bg-sky-500/15 border-sky-500/60 shadow-sm'
                            : isSelectedSingle
                            ? 'bg-sky-500/10 border-sky-500/40 shadow-sm'
                            : 'bg-[#0A0A0B] border-white/[0.06] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Multi-select checkbox */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleSelectPart(part.id, e)}
                              className="text-slate-400 hover:text-sky-400 p-0.5 rounded transition shrink-0"
                              title={isSelectedMulti ? 'Desmarcar peça' : 'Selecionar peça para auto-organização'}
                            >
                              {isSelectedMulti ? (
                                <CheckSquare className="w-4 h-4 text-sky-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>

                            <div
                              className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                              style={{ backgroundColor: part.color_hex || activePlate.filament_color_hex || '#3b82f6' }}
                            />
                            <span className="text-white font-semibold text-xs truncate">
                              {part.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicatePart(part.id);
                              }}
                              className="text-slate-400 hover:text-amber-400 p-1 rounded-lg hover:bg-white/[0.06] transition"
                              title="Duplicar peça"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePart(part.id);
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/[0.06] transition"
                              title="Remover peça desta mesa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 font-mono bg-[#121215] border border-white/[0.06] p-1.5 rounded-xl">
                          <div>{part.dimensions.x}×{part.dimensions.y}×{part.dimensions.z}mm</div>
                          <div className="text-center text-white font-semibold">{part.weightGrams}g</div>
                          <div className="text-right">{part.volumeCm3} cm³</div>
                        </div>

                        {/* Move to another plate dropdown */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                          <span className="text-[10px] text-slate-500">Mover para:</span>
                          <select
                            value={activePlate.id}
                            onChange={(e) => {
                              if (e.target.value !== activePlate.id) {
                                handleMovePartToPlate(part.id, e.target.value);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#121215] border border-white/[0.1] rounded-lg px-2 py-0.5 text-[11px] text-sky-400 focus:outline-none"
                          >
                            {plates.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.name} {pl.id === activePlate.id ? '(Atual)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Active Plate Settings Card (Always accessible below) */}
          <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Configuração da Mesa
                </h3>
              </div>
              {plates.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeletePlate(activePlate.id)}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/[0.06] transition"
                  title="Excluir esta mesa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Plate Name Input */}
            <div>
              <label className="text-[11px] text-slate-400 block font-medium mb-1">Nome da Mesa:</label>
              <input
                type="text"
                value={activePlate.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setPlates((prev) =>
                    prev.map((p) => (p.id === activePlate.id ? { ...p, name: val } : p))
                  );
                }}
                className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Single Filament Assignment */}
            <div>
              <label className="text-[11px] text-slate-400 block font-medium mb-1">
                Filamento / Cor desta Mesa:
              </label>
              <select
                value={activePlate.filament_id || ''}
                onChange={(e) => handleUpdatePlateFilament(activePlate.id, e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {filaments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.material} - {f.color})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Printer & Bed Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block font-medium mb-1">Impressora:</label>
                <select
                  value={activePlate.printer_id || ''}
                  onChange={(e) => {
                    const pr = printers.find((p) => p.id === e.target.value);
                    setPlates((prev) =>
                      prev.map((p) => (p.id === activePlate.id ? { ...p, printer_id: pr?.id } : p))
                    );
                  }}
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {printers.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block font-medium mb-1">Dimensões:</label>
                <input
                  type="text"
                  readOnly
                  value={`${activePlate.bed_dimensions?.x || 256} × ${activePlate.bed_dimensions?.y || 256} mm`}
                  className="w-full bg-[#0A0A0B] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-slate-400 font-mono text-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save to Product Catalog Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#121215] border border-white/[0.12] rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Guardar no Catálogo de Produtos</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Vincule a divisão de {plates.length} mesas diretamente a um produto para disparar a produção na cor certa a qualquer momento.
            </p>

            {/* Mode Selector: New vs Existing */}
            <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B] p-1 rounded-2xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSaveMode('new')}
                className={`py-2 rounded-xl text-xs font-semibold transition ${
                  saveMode === 'new' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Novo Produto
              </button>
              <button
                type="button"
                onClick={() => setSaveMode('existing')}
                disabled={products.length === 0}
                className={`py-2 rounded-xl text-xs font-semibold transition ${
                  saveMode === 'existing' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                } ${products.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Atualizar Existente
              </button>
            </div>

            {saveMode === 'new' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block font-medium mb-1">Nome do Produto:</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: Suporte Articulado Bicolor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block font-medium mb-1">Categoria:</label>
                    <input
                      type="text"
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block font-medium mb-1">Preço de Venda (R$):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProductSalePrice}
                      onChange={(e) => setNewProductSalePrice(Number(e.target.value))}
                      className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Plates Breakdown Summary */}
                <div className="bg-[#0A0A0B] border border-white/[0.06] rounded-2xl p-3 space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Resumo das Mesas Vinculadas ({plates.length}):
                  </span>
                  <div className="space-y-1">
                    {plates.map((pl, idx) => (
                      <div
                        key={pl.id}
                        className="flex items-center justify-between text-[11px] text-slate-300 font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: pl.filament_color_hex || '#3b82f6' }}
                          />
                          <span>{pl.name}</span>
                        </div>
                        <span>
                          {pl.parts.length} peças • {pl.estimated_weight_g}g
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <label className="text-slate-400 block font-medium">Selecione o Produto do Catálogo:</label>
                <select
                  value={selectedExistingProductId}
                  onChange={(e) => setSelectedExistingProductId(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>
                    Escolha um produto...
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {Number(p.sale_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveToCatalogConfirm}
                disabled={isSavingProduct}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                {isSavingProduct ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Salvar Ficha do Produto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geometric Auto-Arrangement Modal */}
      {isAutoArrangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#121215] border border-white/[0.1] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-500/15 border border-amber-500/30">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Auto-Organização Geométrica de Peças</h3>
                  <p className="text-xs text-slate-400">
                    Otimiza o aproveitamento da mesa e minimiza o espaço vazio com empacotamento Guillotine 2D.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoArrangeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Scope Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                1. Selecionar Peças a Organizar:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setArrangeScope('selected')}
                  disabled={selectedPartIds.length === 0}
                  className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                    arrangeScope === 'selected'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-xs'
                      : selectedPartIds.length === 0
                      ? 'opacity-40 cursor-not-allowed bg-[#0A0A0B] border-white/[0.04] text-slate-500'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Peças Selecionadas</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({selectedPartIds.length} {selectedPartIds.length === 1 ? 'peça' : 'peças'})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setArrangeScope('active_plate')}
                  className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                    arrangeScope === 'active_plate'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-xs'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Mesa Atual</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({activePlate.parts.length} {activePlate.parts.length === 1 ? 'peça' : 'peças'})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setArrangeScope('all_plates')}
                  className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                    arrangeScope === 'all_plates'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-xs'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Todas do Projeto</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({projectTotals.totalParts} peças)
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Grouping Mode Strategy */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                2. Estratégia de Agrupamento em Mesas:
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setArrangeGroupingMode('minimal_plates')}
                  className={`w-full p-3 rounded-2xl border text-left transition ${
                    arrangeGroupingMode === 'minimal_plates'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-xs'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                      Mesas Individuais Mínimas (Minimizar Espaço Vazio)
                    </span>
                    {arrangeGroupingMode === 'minimal_plates' && (
                      <Check className="w-4 h-4 text-sky-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-5.5">
                    Empacota densamente no menor número de mesas individuais possíveis, distribuindo em novas mesas somente quando a área da mesa for atingida.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setArrangeGroupingMode('active_plate_only')}
                  className={`w-full p-3 rounded-2xl border text-left transition ${
                    arrangeGroupingMode === 'active_plate_only'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-xs'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Organizar Apenas na Mesa Atual ({activePlate.name})
                    </span>
                    {arrangeGroupingMode === 'active_plate_only' && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-5.5">
                    Consolida todas as peças selecionadas na mesa ativa, calculando o melhor encaixe geométrico sem criar mesas adicionais.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setArrangeGroupingMode('by_color')}
                  className={`w-full p-3 rounded-2xl border text-left transition ${
                    arrangeGroupingMode === 'by_color'
                      ? 'bg-sky-500/15 border-sky-500 text-white shadow-xs'
                      : 'bg-[#0A0A0B] border-white/[0.08] text-slate-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-purple-400" />
                      Agrupar por Cor em Mesas Individuais
                    </span>
                    {arrangeGroupingMode === 'by_color' && (
                      <Check className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-5.5">
                    Separa as peças por cor (azul numa mesa, vermelha em outra) e empacota geometricamente cada mesa de cor correspondente.
                  </p>
                </button>
              </div>
            </div>

            {/* Step 3: Geometric Parameters (Spacing, Margin, 90 deg rotation) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0A0A0B] p-3 rounded-2xl border border-white/[0.06] text-xs">
              <div>
                <label className="text-slate-400 block font-medium mb-1.5">
                  Espaçamento entre Peças:
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 8, 10, 15].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setArrangeSpacing(sp)}
                      className={`flex-1 py-1 rounded-xl font-mono text-[11px] font-semibold transition ${
                        arrangeSpacing === sp
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      {sp}mm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block font-medium mb-1.5">
                  Margem de Borda:
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15].map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setArrangeEdgeMargin(mg)}
                      className={`flex-1 py-1 rounded-xl font-mono text-[11px] font-semibold transition ${
                        arrangeEdgeMargin === mg
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      {mg}mm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block font-medium mb-1.5">
                  Giro Inteligente 90°:
                </label>
                <button
                  type="button"
                  onClick={() => setArrangeAllowRotation((prev) => !prev)}
                  className={`w-full py-1.5 px-2.5 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition ${
                    arrangeAllowRotation
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/[0.06] text-slate-400 border border-transparent'
                  }`}
                  title="Permite testar rotação de 90° para preencher lacunas na mesa"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{arrangeAllowRotation ? 'Ativado (Ótimo)' : 'Desativado'}</span>
                </button>
              </div>
            </div>

            {/* Real-time Geometric Efficiency & Preview Breakdown */}
            <div className="bg-[#0A0A0B] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-400" />
                  Prévia de Ocupação da Superfície
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {geometricPackPreview.averageEfficiencyPercent}% de Ocupação Útil
                </span>
              </div>

              {/* Progress visual meter */}
              <div className="space-y-1">
                <div className="w-full bg-white/[0.08] h-3 rounded-full overflow-hidden flex">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-sky-500 h-full transition-all duration-300"
                    style={{ width: `${geometricPackPreview.averageEfficiencyPercent}%` }}
                  />
                  <div
                    className="bg-white/[0.04] h-full"
                    style={{ width: `${geometricPackPreview.averageEmptySpacePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Espaço Útil Ocupado: {geometricPackPreview.averageEfficiencyPercent}%</span>
                  <span>Espaço Vazio Minimizado: {geometricPackPreview.averageEmptySpacePercent}%</span>
                </div>
              </div>

              {/* Resulting Plates Cards Preview */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Total de Mesas Resultantes:{' '}
                    <strong className="text-white font-mono">
                      {geometricPackPreview.totalPlatesCount}
                    </strong>
                  </span>
                  <span>
                    Peças Empacotadas:{' '}
                    <strong className="text-white font-mono">
                      {geometricPackPreview.totalPartsPlaced} de {candidatePartsForArranging.length}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {geometricPackPreview.plates.map((pl) => (
                    <div
                      key={pl.plateIndex}
                      className="bg-[#121215] border border-white/[0.06] rounded-xl p-2.5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: pl.filamentColorHex || '#3b82f6' }}
                          />
                          <span className="font-semibold text-white truncate max-w-[130px]">
                            {pl.plateName}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          {pl.efficiencyPercent}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span>{pl.parts.length} peças</span>
                        <span>{pl.occupiedDimensions.x.toFixed(0)}×{pl.occupiedDimensions.y.toFixed(0)} mm</span>
                        <span className={pl.fitsBed ? 'text-emerald-400' : 'text-rose-400'}>
                          {pl.fitsBed ? '✓ Cabe na mesa' : '⚠️ Excede'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsAutoArrangeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyGeometricArrange}
                disabled={candidatePartsForArranging.length === 0 || geometricPackPreview.plates.length === 0}
                className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  Aplicar em {geometricPackPreview.totalPlatesCount}{' '}
                  {geometricPackPreview.totalPlatesCount === 1 ? 'Mesa' : 'Mesas'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Print Modal (Pre-populated with Active Plate) */}
      {isDirectPrintOpen && (
        <DirectPrintModal
          isOpen={isDirectPrintOpen}
          onClose={() => setIsDirectPrintOpen(false)}
          printers={printers}
          filaments={filaments}
          modelName={`${projectName} - [${activePlate.name}]`}
          estimatedWeightG={activePlate.estimated_weight_g}
          estimatedTimeMinutes={activePlate.estimated_time_minutes}
          initialPrinterId={activePlate.printer_id}
          initialFilamentId={activePlate.filament_id}
          onSuccess={(job) => {
            showNotification(
              'success',
              `Impressão da "${activePlate.name}" transmitida para a impressora!`
            );
          }}
        />
      )}
    </div>
  );
};
