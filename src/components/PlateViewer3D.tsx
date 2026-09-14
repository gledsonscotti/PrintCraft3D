import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Grid,
  Layers,
  Eye,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Move,
  RotateCw,
  Sparkles,
  Palette,
  Crosshair,
  Sliders
} from 'lucide-react';
import { AppTheme, BuildPlate, BuildPlatePart } from '../types';

interface PlateViewer3DProps {
  activePlate: BuildPlate;
  allPlates?: BuildPlate[];
  viewMode?: 'single' | 'all';
  selectedPartId?: string | null;
  onSelectPart?: (partId: string) => void;
  onUpdatePartPosition?: (partId: string, newPos: { x: number; y: number; z: number }) => void;
  onRotatePart90?: (partId?: string) => void;
  onAutoArrange?: () => void;
  onSeparateByColor?: () => void;
  meshCache: Map<number, THREE.Mesh>;
  theme?: AppTheme;
  isWireframe?: boolean;
  onToggleWireframe?: () => void;
  onSnapshotReady?: (getter: () => string | null) => void;
}

export const PlateViewer3D: React.FC<PlateViewer3DProps> = ({
  activePlate,
  allPlates = [],
  viewMode = 'single',
  selectedPartId,
  onSelectPart,
  onUpdatePartPosition,
  onRotatePart90,
  onAutoArrange,
  onSeparateByColor,
  meshCache,
  theme = 'standard',
  isWireframe = false,
  onToggleWireframe,
  onSnapshotReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front'>('iso');

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isDraggingPartRef = useRef(false);
  const draggedPartIdRef = useRef<string | null>(null);
  const dragStartPlanePointRef = useRef(new THREE.Vector3());
  const dragPartInitialPosRef = useRef(new THREE.Vector3());

  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 360, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Raycaster for part selection and dragging
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseVecRef = useRef(new THREE.Vector2());
  const bedPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Snapshot getter callback
  useEffect(() => {
    if (onSnapshotReady && rendererRef.current) {
      onSnapshotReady(() => {
        if (!rendererRef.current) return null;
        try {
          return rendererRef.current.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      });
    }
  }, [onSnapshotReady]);

  // Update camera position based on spherical coordinates + pan offset
  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    const clampedPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, phi));

    const x = radius * Math.sin(clampedPhi) * Math.sin(theta) + panOffsetRef.current.x;
    const y = radius * Math.cos(clampedPhi) + panOffsetRef.current.y;
    const z = radius * Math.sin(clampedPhi) * Math.cos(theta) + panOffsetRef.current.z;

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(panOffsetRef.current.x, panOffsetRef.current.y + 15, panOffsetRef.current.z);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const getBgColor = (th?: string) => {
      if (th === 'high-contrast-light') return '#F1F5F9';
      if (th === 'high-contrast-dark') return '#000000';
      if (th === 'sage-bento') return '#F5F2EB';
      return '#0A0A0B';
    };
    scene.background = new THREE.Color(getBgColor(theme));

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    cameraRef.current = camera;
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Root Group
    const root = new THREE.Group();
    rootGroupRef.current = root;
    scene.add(root);

    // Lighting setup
    const isLight = theme === 'high-contrast-light' || theme === 'sage-bento';
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.9 : 0.65);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainDirLight.position.set(150, 260, 180);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 1024;
    mainDirLight.shadow.mapSize.height = 1024;
    mainDirLight.shadow.camera.near = 10;
    mainDirLight.shadow.camera.far = 800;
    mainDirLight.shadow.camera.left = -250;
    mainDirLight.shadow.camera.right = 250;
    mainDirLight.shadow.camera.top = 250;
    mainDirLight.shadow.camera.bottom = -250;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 0.4);
    fillLight.position.set(-150, 100, -150);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(
      0xffffff,
      isLight ? (theme === 'sage-bento' ? 0xd5ccbd : 0xd1d5db) : 0x334155,
      isLight ? 0.5 : 0.3
    );
    scene.add(hemiLight);

    // Animation Loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update scene background and lights whenever theme changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (theme === 'high-contrast-light') {
      sceneRef.current.background = new THREE.Color('#F1F5F9');
    } else if (theme === 'high-contrast-dark') {
      sceneRef.current.background = new THREE.Color('#000000');
    } else if (theme === 'sage-bento') {
      sceneRef.current.background = new THREE.Color('#F5F2EB');
    } else {
      sceneRef.current.background = new THREE.Color('#0A0A0B');
    }
  }, [theme]);

  // Build Bed Plate Helper
  const createBedMesh = (
    bedX: number,
    bedY: number,
    offsetX: number = 0,
    plateTitle: string = 'Mesa 1',
    plateColor: string = '#3b82f6'
  ): THREE.Group => {
    const bedGroup = new THREE.Group();
    bedGroup.position.set(offsetX, 0, 0);

    const isLight = theme === 'high-contrast-light' || theme === 'sage-bento';
    const bedPlateColor =
      theme === 'high-contrast-light'
        ? 0xe2e8f0
        : theme === 'high-contrast-dark'
        ? 0x050505
        : theme === 'sage-bento'
        ? 0xede8dc
        : 0x111827;

    // 1. Bed Base Plate
    const plateGeom = new THREE.BoxGeometry(bedX, 3, bedY);
    const plateMat = new THREE.MeshStandardMaterial({
      color: bedPlateColor,
      roughness: 0.85,
      metalness: 0.15,
    });
    const plateMesh = new THREE.Mesh(plateGeom, plateMat);
    plateMesh.position.y = -1.5;
    plateMesh.receiveShadow = true;
    bedGroup.add(plateMesh);

    // Bed accent edge (matching plate filament color)
    const edgeGeom = new THREE.BoxGeometry(bedX + 2, 0.8, bedY + 2);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(plateColor),
      transparent: true,
      opacity: 0.6,
    });
    const edgeMesh = new THREE.Mesh(edgeGeom, edgeMat);
    edgeMesh.position.y = -2.8;
    bedGroup.add(edgeMesh);

    // 2. Grid lines
    if (showGrid) {
      const gridColorPrimary =
        theme === 'high-contrast-light'
          ? 0x0284c7
          : theme === 'sage-bento'
          ? 0x567d6b
          : 0x38bdf8;

      const gridColorSecondary =
        theme === 'high-contrast-light'
          ? 0xcbd5e1
          : theme === 'sage-bento'
          ? 0xd5ccbd
          : 0x27272a;

      const maxDim = Math.max(bedX, bedY);
      const divisions = Math.max(10, Math.round(maxDim / 10));
      const gridHelper = new THREE.GridHelper(maxDim, divisions, gridColorPrimary, gridColorSecondary);
      gridHelper.position.y = 0.05;
      bedGroup.add(gridHelper);
    }

    // Safety perimeter printable border
    const borderPoints = [
      new THREE.Vector3(-bedX / 2, 0.2, -bedY / 2),
      new THREE.Vector3(bedX / 2, 0.2, -bedY / 2),
      new THREE.Vector3(bedX / 2, 0.2, bedY / 2),
      new THREE.Vector3(-bedX / 2, 0.2, bedY / 2),
      new THREE.Vector3(-bedX / 2, 0.2, -bedY / 2),
    ];
    const borderGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: theme === 'sage-bento' ? 0x3e6251 : isLight ? 0x0284c7 : 0x0ea5e9,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const borderLine = new THREE.Line(borderGeom, borderMat);
    bedGroup.add(borderLine);

    // 3. Build Volume Wireframe Box
    const wireGeom = new THREE.BoxGeometry(bedX, 220, bedY);
    const wireMatColor =
      theme === 'sage-bento'
        ? 0x7e9a8b
        : isLight
        ? 0x94a3b8
        : 0x52525b;

    const wireMat = new THREE.LineBasicMaterial({
      color: wireMatColor,
      transparent: true,
      opacity: theme === 'sage-bento' ? 0.35 : 0.2,
    });
    const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(wireGeom), wireMat);
    wireframe.position.y = 110;
    bedGroup.add(wireframe);

    return bedGroup;
  };

  // Rebuild 3D Meshes whenever activePlate, meshCache, or viewMode changes
  useEffect(() => {
    if (!rootGroupRef.current) return;
    const root = rootGroupRef.current;

    // Clear old objects
    while (root.children.length > 0) {
      const obj = root.children[0];
      root.remove(obj);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else if (m.material) m.material.dispose();
        }
      });
    }

    if (viewMode === 'all' && allPlates.length > 1) {
      // Side-by-side multi-bed view
      const spacing = 320;
      const totalWidth = (allPlates.length - 1) * spacing;
      panOffsetRef.current.set(0, 0, 0);

      allPlates.forEach((plate, pIdx) => {
        const bedX = plate.bed_dimensions?.x || 250;
        const bedY = plate.bed_dimensions?.y || 250;
        const offsetX = pIdx * spacing - totalWidth / 2;

        const bedGroup = createBedMesh(
          bedX,
          bedY,
          offsetX,
          plate.name,
          plate.filament_color_hex || '#3b82f6'
        );
        root.add(bedGroup);

        // Render parts for this plate
        const filamentColor = plate.filament_color_hex || '#3b82f6';
        renderPlateParts(plate, bedGroup, filamentColor, pIdx);
      });

      sphericalRef.current.radius = Math.max(480, allPlates.length * 280);
      updateCamera();
    } else {
      // Single active plate view
      const bedX = activePlate.bed_dimensions?.x || 250;
      const bedY = activePlate.bed_dimensions?.y || 250;
      const filamentColor = activePlate.filament_color_hex || '#3b82f6';

      const bedGroup = createBedMesh(bedX, bedY, 0, activePlate.name, filamentColor);
      root.add(bedGroup);

      renderPlateParts(activePlate, bedGroup, filamentColor, 0);
      sphericalRef.current.radius = 360;
      updateCamera();
    }
  }, [activePlate, allPlates, viewMode, meshCache, showGrid, theme, isWireframe, selectedPartId]);

  // Helper to render parts belonging to a plate
  const renderPlateParts = (
    plate: BuildPlate,
    parentGroup: THREE.Group,
    plateFilamentColor: string,
    plateIndex: number
  ) => {
    const bedX = plate.bed_dimensions?.x || 250;
    const bedY = plate.bed_dimensions?.y || 250;

    plate.parts.forEach((part) => {
      const cachedMesh = meshCache.get(part.originalMeshIndex);
      if (!cachedMesh) return;

      const partMesh = cachedMesh.clone();
      partMesh.castShadow = true;
      partMesh.receiveShadow = true;

      // Position, Rotation, Scale with bed surface alignment (bottom at Y = 0)
      partMesh.position.set(0, 0, 0);
      partMesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
      partMesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
      partMesh.updateMatrixWorld(true);

      const partBox = new THREE.Box3().setFromObject(partMesh);
      const bottomY = partBox.min.y;
      const finalY = part.position.y - bottomY;

      partMesh.position.set(part.position.x, finalY, part.position.z);

      // Material: Use part's individual color if set, or fall back to plate filament color
      const isSelected = selectedPartId === part.id;
      const partColorHex = part.color_hex || plateFilamentColor;
      const baseColor = new THREE.Color(partColorHex);

      // Check if part overflows bed
      const halfW = (part.dimensions.x * Math.abs(part.scale.x || 1)) / 2;
      const halfD = (part.dimensions.y * Math.abs(part.scale.y || 1)) / 2;
      const isOutOfBounds =
        part.position.x - halfW < -bedX / 2 ||
        part.position.x + halfW > bedX / 2 ||
        part.position.z - halfD < -bedY / 2 ||
        part.position.z + halfD > bedY / 2;

      const mat = new THREE.MeshStandardMaterial({
        color: isOutOfBounds
          ? new THREE.Color(0xf43f5e)
          : isSelected
          ? baseColor.clone().offsetHSL(0, 0, 0.15)
          : baseColor,
        roughness: 0.35,
        metalness: 0.12,
        wireframe: isWireframe,
        emissive: isOutOfBounds
          ? new THREE.Color(0x881337)
          : isSelected
          ? new THREE.Color(0x0284c7)
          : new THREE.Color(0x000000),
        emissiveIntensity: isOutOfBounds ? 0.35 : isSelected ? 0.25 : 0,
      });
      partMesh.material = mat;
      partMesh.userData = { partId: part.id, plateNumber: plate.plateNumber };

      parentGroup.add(partMesh);

      // Selected Part Highlight Outline & Bed Projection Ring
      if (isSelected) {
        const boxGeom = new THREE.BoxGeometry(
          part.dimensions.x * Math.abs(part.scale.x || 1) + 2,
          part.dimensions.z * Math.abs(part.scale.z || 1) + 2,
          part.dimensions.y * Math.abs(part.scale.y || 1) + 2
        );
        const boxMat = new THREE.LineBasicMaterial({
          color: isOutOfBounds ? 0xf43f5e : 0x38bdf8,
          linewidth: 2,
        });
        const highlightBox = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeom), boxMat);
        highlightBox.position.set(
          part.position.x,
          part.position.y + (part.dimensions.z * Math.abs(part.scale.z || 1)) / 2,
          part.position.z
        );
        parentGroup.add(highlightBox);

        // Bed projection ring / ground shadow disc
        const ringGeom = new THREE.RingGeometry(
          Math.max(6, halfW * 0.85),
          Math.max(8, halfW * 0.85 + 2.5),
          32
        );
        const ringMat = new THREE.MeshBasicMaterial({
          color: isOutOfBounds ? 0xf43f5e : 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(part.position.x, 0.2, part.position.z);
        parentGroup.add(ringMesh);
      }
    });
  };

  // Mouse Orbit, Pan & 3D Bed Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    if (e.button === 2 || e.shiftKey) {
      isPanningRef.current = true;
      return;
    }

    if (e.button === 0) {
      // Test if clicking on a part in the active plate for dragging / selection
      if (mountRef.current && cameraRef.current && rootGroupRef.current) {
        const rect = mountRef.current.getBoundingClientRect();
        mouseVecRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVecRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(rootGroupRef.current.children, true);
        const hit = intersects.find((i) => i.object.userData?.partId);

        if (hit) {
          const partId = hit.object.userData.partId;
          onSelectPart?.(partId);

          // Prepare Bed Plane Drag
          const intersectionPoint = new THREE.Vector3();
          if (raycasterRef.current.ray.intersectPlane(bedPlaneRef.current, intersectionPoint)) {
            isDraggingPartRef.current = true;
            draggedPartIdRef.current = partId;
            dragStartPlanePointRef.current.copy(intersectionPoint);

            const foundPart = activePlate.parts.find((p) => p.id === partId);
            if (foundPart) {
              dragPartInitialPosRef.current.set(
                foundPart.position.x,
                foundPart.position.y,
                foundPart.position.z
              );
            }
            return;
          }
        }
      }

      // If clicked empty space, orbit camera
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. If currently dragging a part across the bed
    if (isDraggingPartRef.current && draggedPartIdRef.current && cameraRef.current && mountRef.current) {
      const rect = mountRef.current.getBoundingClientRect();
      mouseVecRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVecRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
      const currentPoint = new THREE.Vector3();
      if (raycasterRef.current.ray.intersectPlane(bedPlaneRef.current, currentPoint)) {
        const deltaX = currentPoint.x - dragStartPlanePointRef.current.x;
        const deltaZ = currentPoint.z - dragStartPlanePointRef.current.z;

        const newX = Math.round((dragPartInitialPosRef.current.x + deltaX) * 10) / 10;
        const newZ = Math.round((dragPartInitialPosRef.current.z + deltaZ) * 10) / 10;

        onUpdatePartPosition?.(draggedPartIdRef.current, {
          x: newX,
          y: dragPartInitialPosRef.current.y,
          z: newZ,
        });
      }
      return;
    }

    // 2. If orbiting or panning camera
    if (isDraggingRef.current || isPanningRef.current) {
      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      if (isPanningRef.current) {
        const panSpeed = sphericalRef.current.radius * 0.0012;
        const cosTheta = Math.cos(sphericalRef.current.theta);
        const sinTheta = Math.sin(sphericalRef.current.theta);

        panOffsetRef.current.x -= (deltaX * cosTheta) * panSpeed;
        panOffsetRef.current.z += (deltaX * sinTheta) * panSpeed;
        panOffsetRef.current.y += deltaY * panSpeed;
      } else if (isDraggingRef.current) {
        sphericalRef.current.theta -= deltaX * 0.008;
        sphericalRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.02, sphericalRef.current.phi - deltaY * 0.008)
        );
      }
      updateCamera();
      return;
    }

    // 3. Hover test for cursor feedback
    if (mountRef.current && cameraRef.current && rootGroupRef.current) {
      const rect = mountRef.current.getBoundingClientRect();
      mouseVecRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVecRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(rootGroupRef.current.children, true);
      const hit = intersects.find((i) => i.object.userData?.partId);
      mountRef.current.style.cursor = hit ? 'move' : 'grab';
    }
  };

  const handleMouseUp = () => {
    isDraggingPartRef.current = false;
    draggedPartIdRef.current = null;
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.4;
    sphericalRef.current.radius = Math.max(60, Math.min(1800, sphericalRef.current.radius + zoomDelta));
    updateCamera();
  };

  // Preset Views
  const setPresetView = (preset: 'iso' | 'top' | 'front') => {
    setCameraPreset(preset);
    panOffsetRef.current.set(0, 0, 0);
    if (preset === 'top') {
      sphericalRef.current = { radius: 380, theta: 0, phi: 0.06 };
    } else if (preset === 'front') {
      sphericalRef.current = { radius: 380, theta: 0, phi: Math.PI / 2 - 0.05 };
    } else {
      sphericalRef.current = { radius: 360, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    }
    updateCamera();
  };

  const resetView = () => {
    panOffsetRef.current.set(0, 0, 0);
    sphericalRef.current = { radius: 360, theta: Math.PI / 4, phi: Math.PI / 3.2 };
    updateCamera();
  };

  // Dimensions & Overflow Check for Active Plate
  const bedX = activePlate.bed_dimensions?.x || 250;
  const bedY = activePlate.bed_dimensions?.y || 250;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;

  activePlate.parts.forEach((p) => {
    const halfW = p.dimensions.x / 2;
    const halfD = p.dimensions.y / 2;
    minX = Math.min(minX, p.position.x - halfW);
    maxX = Math.max(maxX, p.position.x + halfW);
    minZ = Math.min(minZ, p.position.z - halfD);
    maxZ = Math.max(maxZ, p.position.z + halfD);
    maxY = Math.max(maxY, p.position.y + p.dimensions.z);
  });

  const partsWidth = maxX > minX ? maxX - minX : 0;
  const partsDepth = maxZ > minZ ? maxZ - minZ : 0;
  const overflowsBed =
    minX < -bedX / 2 || maxX > bedX / 2 || minZ < -bedY / 2 || maxZ > bedY / 2;

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden select-none flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black' : ''
      }`}
    >
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        {/* Left: Plate Information Pill & Color indicator */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#121215]/85 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/[0.08] text-xs font-semibold shadow-sm text-white">
          <div
            className="w-3 h-3 rounded-full shrink-0 border border-white/40 shadow-xs"
            style={{ backgroundColor: activePlate.filament_color_hex || '#3b82f6' }}
          />
          <span>{activePlate.name}</span>
          <span className="text-[11px] text-slate-400 font-mono">
            {activePlate.parts.length} {activePlate.parts.length === 1 ? 'peça' : 'peças'}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] text-slate-300 font-mono">
            Mesa {bedX}×{bedY} mm
          </span>
        </div>

        {/* Center: Slicer Quick Actions (Auto-Arrange, Separate Colors) */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#121215]/85 backdrop-blur-md p-1 rounded-2xl border border-white/[0.08] shadow-sm">
          {onSeparateByColor && (
            <button
              type="button"
              onClick={onSeparateByColor}
              title="Separar peças de cores diferentes em mesas dedicadas (Azul, Vermelho, etc.)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-gradient-to-r from-blue-600/80 to-rose-600/80 hover:from-blue-500 hover:to-rose-500 text-white transition shadow-xs"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Separar Mesas por Cor</span>
            </button>
          )}

          {onAutoArrange && (
            <button
              type="button"
              onClick={onAutoArrange}
              title="Auto-organizar peças na mesa com margem de segurança de 10mm"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Arranjar</span>
            </button>
          )}

          {selectedPartId && onRotatePart90 && (
            <button
              type="button"
              onClick={() => onRotatePart90(selectedPartId)}
              title="Girar peça selecionada 90° na mesa"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Girar 90°</span>
            </button>
          )}
        </div>

        {/* Right: View & Grid Tools */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#121215]/85 backdrop-blur-md p-1 rounded-2xl border border-white/[0.08] shadow-sm">
          {/* Preset views */}
          <button
            type="button"
            onClick={() => setPresetView('iso')}
            title="Vista Isométrica"
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
              cameraPreset === 'iso' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D Iso
          </button>
          <button
            type="button"
            onClick={() => setPresetView('top')}
            title="Vista Superior (Planta)"
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
              cameraPreset === 'top' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Topo
          </button>
          <button
            type="button"
            onClick={() => setPresetView('front')}
            title="Vista Frontal"
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
              cameraPreset === 'front' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Frente
          </button>

          <div className="w-[1px] h-4 bg-white/[0.1] mx-0.5" />

          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            title="Alternar Grade da Mesa"
            className={`p-1.5 rounded-xl transition ${
              showGrid ? 'text-sky-400 bg-sky-500/15' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Wireframe Toggle */}
          {onToggleWireframe && (
            <button
              type="button"
              onClick={onToggleWireframe}
              title="Alternar Modo Aramado (Wireframe)"
              className={`p-1.5 rounded-xl transition ${
                isWireframe ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Reset Camera */}
          <button
            type="button"
            onClick={resetView}
            title="Recentralizar Câmera"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Floating Status Banner */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
        {/* Bed Fit Warning or Success Pill */}
        <div className="pointer-events-auto">
          {activePlate.parts.length === 0 ? (
            <div className="bg-[#121215]/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/[0.08] text-xs text-slate-400 flex items-center gap-2">
              <span>Mesa vazia. Mova peças ou adicione componentes.</span>
            </div>
          ) : overflowsBed ? (
            <div className="bg-rose-500/20 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-rose-500/40 text-xs font-semibold text-rose-300 flex items-center gap-2 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Atenção: Peças extrapolam a borda da mesa ({bedX}×{bedY} mm)!</span>
            </div>
          ) : (
            <div className="bg-emerald-500/15 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Área ocupada: {Math.round(partsWidth)}×{Math.round(partsDepth)} mm • 100% dentro dos limites
              </span>
            </div>
          )}
        </div>

        {/* Orbit / Navigation Help Tip */}
        <div className="hidden sm:flex items-center gap-2 pointer-events-auto bg-[#121215]/75 backdrop-blur-xs px-3 py-1 rounded-2xl border border-white/[0.06] text-[11px] text-slate-400">
          <span>Girar: Botão Esquerdo</span>
          <span className="text-slate-600">•</span>
          <span>Pan: Shift + Clique ou Botão Direito</span>
          <span className="text-slate-600">•</span>
          <span>Zoom: Scroll</span>
        </div>
      </div>
    </div>
  );
};
