import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Box,
  RefreshCw,
  Compass,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

import { AppTheme } from '../types';

export interface ModelViewer3DProps {
  modelObject?: THREE.Object3D | null;
  modelBuffer?: ArrayBuffer | null;
  sampleType?: 'keychain' | 'phone_stand' | 'gear' | 'vase' | 'bambu_3mf' | 'cad_bracket';
  filamentColor?: string;
  dimensions?: { x: number; y: number; z: number };
  fileType?: string;
  formatLabel?: string;
  trianglesCount?: number;
  layerCount?: number;
  theme?: AppTheme;
  onSnapshotReady?: (captureSnapshot: () => string | null) => void;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelObject,
  modelBuffer,
  sampleType = 'keychain',
  filamentColor = '#2563eb',
  dimensions,
  fileType = 'stl',
  formatLabel,
  trianglesCount,
  layerCount,
  theme = 'standard',
  onSnapshotReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const activeRootGroupRef = useRef<THREE.Group | null>(null);
  const bedMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameRef = useRef<number>(0);

  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front'>('iso');
  const [webglFailed, setWebglFailed] = useState(false);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.45, y: -0.65 });
  const zoomRef = useRef(85);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 320;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: false });
    } catch (e) {
      console.warn('WebGL context creation failed or was blocked:', e);
      setWebglFailed(true);
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0A0A0B'); // Bento dark canvas
    sceneRef.current = scene;

    // Root group for model rotation & centering
    const rootGroup = new THREE.Group();
    rootGroup.name = 'Model_Root_Container';
    scene.add(rootGroup);
    activeRootGroupRef.current = rootGroup;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 50, 85);
    cameraRef.current = camera;

    // Renderer
    try {
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
    } catch (e) {
      console.warn('WebGL setup error:', e);
      setWebglFailed(true);
      return;
    }

    if (onSnapshotReady) {
      onSnapshotReady(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return null;
        try {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          const dom = rendererRef.current.domElement;
          // Downscale to max 480px for lightning-fast and reliable AI vision payload
          const maxDim = 480;
          const scale = Math.min(1, maxDim / Math.max(dom.width || 1, dom.height || 1));
          const thumb = document.createElement('canvas');
          thumb.width = Math.max(1, Math.round(dom.width * scale));
          thumb.height = Math.max(1, Math.round(dom.height * scale));
          const ctx = thumb.getContext('2d');
          if (ctx) {
            ctx.drawImage(dom, 0, 0, thumb.width, thumb.height);
            return thumb.toDataURL('image/jpeg', 0.72);
          }
          return dom.toDataURL('image/jpeg', 0.7);
        } catch (e) {
          console.warn('Could not capture canvas snapshot:', e);
          return null;
        }
      });
    }

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Build plate / Heated bed grid (e.g. 220x220mm standard Ender-3 / Bambu Lab build volume)
    const bedSize = 160;
    const gridHelper = new THREE.GridHelper(bedSize, 32, 0x38bdf8, 0x1f293d);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Heated bed surface plate
    const bedGeo = new THREE.BoxGeometry(bedSize, 1.2, bedSize);
    const bedMat = new THREE.MeshStandardMaterial({
      color: theme === 'high-contrast-light' ? 0xE2E8F0 : theme === 'high-contrast-dark' ? 0x050505 : 0x111827,
      roughness: 0.85,
      metalness: 0.15,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.y = -0.65;
    bedMesh.receiveShadow = true;
    bedMeshRef.current = bedMesh;
    scene.add(bedMesh);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(70, 110, 70);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.6);
    dirLight2.position.set(-70, 50, -70);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x38bdf8, 0.4, 300);
    pointLight.position.set(0, 40, 0);
    scene.add(pointLight);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(newW, newH);
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (autoRotate && !isDraggingRef.current && activeRootGroupRef.current) {
        rotationRef.current.y += 0.005;
      }

      if (cameraRef.current) {
        const radius = zoomRef.current;
        const phi = Math.max(0.05, Math.min(Math.PI / 2 - 0.02, rotationRef.current.x));
        const theta = rotationRef.current.y;

        cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
        cameraRef.current.position.y = Math.max(8, radius * Math.cos(phi));
        cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
        cameraRef.current.lookAt(0, 12, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Geometry whenever modelObject, modelBuffer, sampleType or filamentColor changes
  useEffect(() => {
    if (!activeRootGroupRef.current) return;
    const root = activeRootGroupRef.current;

    // Clear previous model objects
    while (root.children.length > 0) {
      const obj = root.children[0];
      root.remove(obj);
      disposeObject(obj);
    }

    let displayObject: THREE.Object3D;

    if (modelObject) {
      // Use parsed object from universal 3D parser (3MF, CAD, STEP, OBJ, PLY, GLTF, STL, GCode)
      displayObject = modelObject.clone();
    } else if (modelBuffer && modelBuffer.byteLength > 84) {
      // Fallback direct buffer parse
      try {
        const geom = parseSTLBufferToGeometry(modelBuffer);
        geom.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(filamentColor),
          roughness: 0.35,
          metalness: 0.15,
          wireframe: isWireframe,
        });
        displayObject = new THREE.Mesh(geom, mat);
      } catch {
        displayObject = createSampleObject(sampleType, filamentColor, isWireframe);
      }
    } else {
      displayObject = createSampleObject(sampleType, filamentColor, isWireframe);
    }

    // Apply materials and wireframe settings
    const isToolpath = fileType === 'gcode' || sampleType === 'gear';
    if (!isToolpath) {
      displayObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // If child already has standard material, update color & wireframe
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color.set(filamentColor);
            mesh.material.wireframe = isWireframe;
            mesh.material.roughness = 0.35;
            mesh.material.metalness = 0.15;
            mesh.material.needsUpdate = true;
          } else {
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(filamentColor),
              roughness: 0.35,
              metalness: 0.15,
              wireframe: isWireframe,
            });
          }
        }
      });
    }

    // Center and align bottom to build plate (y = 0)
    const box = new THREE.Box3().setFromObject(displayObject);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    displayObject.position.x = -center.x;
    displayObject.position.z = -center.z;
    displayObject.position.y = -box.min.y;

    root.add(displayObject);

    // Adjust zoom smoothly based on object size
    const maxDim = Math.max(size.x, size.y, size.z, 20);
    const idealZoom = Math.min(180, Math.max(45, maxDim * 1.55));
    zoomRef.current = idealZoom;
  }, [modelObject, modelBuffer, sampleType, filamentColor, isWireframe, fileType]);

  // Update wireframe & color dynamically on existing mesh
  useEffect(() => {
    if (!activeRootGroupRef.current) return;
    const isToolpath = fileType === 'gcode' || sampleType === 'gear';
    if (isToolpath) return;

    activeRootGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.color.set(filamentColor);
          mesh.material.wireframe = isWireframe;
          mesh.material.needsUpdate = true;
        }
      }
    });
  }, [filamentColor, isWireframe, fileType, sampleType]);

  // Mouse / Touch handlers for 3D Orbiting
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    rotationRef.current.y += deltaX * 0.01;
    rotationRef.current.x = Math.max(0.05, Math.min(1.45, rotationRef.current.x - deltaY * 0.01));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomRef.current = Math.max(25, Math.min(220, zoomRef.current + e.deltaY * 0.05));
  };

  const setViewAngle = (view: 'iso' | 'top' | 'front') => {
    setCameraView(view);
    setAutoRotate(false);
    if (view === 'iso') {
      rotationRef.current = { x: 0.5, y: -0.65 };
    } else if (view === 'top') {
      rotationRef.current = { x: 0.05, y: 0 };
    } else if (view === 'front') {
      rotationRef.current = { x: 1.45, y: 0 };
    }
  };

  const handleResetCamera = () => {
    setViewAngle('iso');
    setAutoRotate(true);
    zoomRef.current = 85;
  };

  const formatBadgeColor = () => {
    switch (fileType) {
      case '3mf':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'step':
      case 'stp':
      case 'cad':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'gcode':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'obj':
      case 'ply':
      case 'amf':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default:
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
    }
  };

  useEffect(() => {
    if (!sceneRef.current) return;
    if (theme === 'high-contrast-light') {
      sceneRef.current.background = new THREE.Color('#F1F5F9');
      if (bedMeshRef.current) {
        (bedMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0xE2E8F0);
      }
    } else if (theme === 'high-contrast-dark') {
      sceneRef.current.background = new THREE.Color('#000000');
      if (bedMeshRef.current) {
        (bedMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x050505);
      }
    } else {
      sceneRef.current.background = new THREE.Color('#0A0A0B');
      if (bedMeshRef.current) {
        (bedMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x111827);
      }
    }
  }, [theme]);

  return (
    <div id="v3d-canvas-wrap" className="relative w-full h-72 md:h-80 rounded-3xl overflow-hidden bg-[#0A0A0B] border border-white/[0.08] select-none shadow-inner group">
      {webglFailed ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#111115]">
          <Box className="w-10 h-10 text-emerald-400 mb-2 animate-bounce" />
          <h4 className="text-sm font-bold text-white mb-1">Visualização CAD 2D Ativa</h4>
          <p className="text-xs text-slate-400 max-w-xs mb-3">
            O hardware WebGL não pôde ser inicializado neste navegador. O modelo está pronto para fabricação e fatiamento.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <span>{formatLabel || fileType.toUpperCase()}</span>
            <span>•</span>
            <span>{trianglesCount ? `${trianglesCount.toLocaleString()} faces` : 'Pronto'}</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full relative">
          {/* 3D Canvas Mount */}
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* Floating Header Overlay: Mesa 3D Status & Geometry Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1 pointer-events-none z-10">
        {/* Mesa 3D Status Pill - Compact */}
        <div className="v3d-badge flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-md backdrop-blur-md">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="v3d-title text-[11px] tracking-wide">Mesa 3D</span>
        </div>

        {/* Faces and Layers Badges - Compact & subtle */}
        <div className="flex items-center gap-1">
          {trianglesCount && trianglesCount > 0 ? (
            <div className="v3d-sub-badge flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono shadow-sm backdrop-blur-md">
              <Sparkles className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span className="v3d-dim">{trianglesCount.toLocaleString()} faces</span>
            </div>
          ) : null}

          {layerCount && layerCount > 0 ? (
            <div className="v3d-sub-badge flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono shadow-sm backdrop-blur-md">
              <Layers className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
              <span className="v3d-dim">{layerCount} cam</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating Action Controls - Compact & Non-overlapping */}
      <div className="v3d-toolbar absolute top-2.5 right-2.5 flex items-center gap-0.5 backdrop-blur-md p-1 rounded-xl shadow-md z-10">
        {/* Camera View Presets */}
        <div className="flex items-center gap-0.5 border-r border-white/[0.15] pr-1 mr-0.5">
          <button
            type="button"
            onClick={() => setViewAngle('iso')}
            title="Vista Isométrica (3D)"
            className={`v3d-cam-btn text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition cursor-pointer ${
              cameraView === 'iso' ? 'v3d-active' : ''
            }`}
          >
            ISO
          </button>
          <button
            type="button"
            onClick={() => setViewAngle('top')}
            title="Vista Superior (Planta 2D)"
            className={`v3d-cam-btn text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition cursor-pointer ${
              cameraView === 'top' ? 'v3d-active' : ''
            }`}
          >
            TOP
          </button>
          <button
            type="button"
            onClick={() => setViewAngle('front')}
            title="Vista Frontal"
            className={`v3d-cam-btn text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition cursor-pointer ${
              cameraView === 'front' ? 'v3d-active' : ''
            }`}
          >
            FRT
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsWireframe(!isWireframe)}
          title="Alternar Modo Aramado (Wireframe)"
          className={`v3d-tool-btn p-1 rounded-lg transition cursor-pointer ${
            isWireframe ? 'v3d-active bg-sky-500/30' : ''
          }`}
        >
          <Box className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Alternar Giro Automático"
          className={`v3d-tool-btn p-1 rounded-lg transition cursor-pointer ${
            autoRotate ? 'v3d-active bg-indigo-500/30' : ''
          }`}
        >
          <RotateCw className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => (zoomRef.current = Math.max(25, zoomRef.current - 12))}
          title="Aproximar Zoom"
          className="v3d-tool-btn p-1 rounded-lg transition cursor-pointer"
        >
          <ZoomIn className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => (zoomRef.current = Math.min(220, zoomRef.current + 12))}
          title="Afastar Zoom"
          className="v3d-tool-btn p-1 rounded-lg transition cursor-pointer"
        >
          <ZoomOut className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          title="Resetar Vista 3D"
          className="v3d-tool-btn p-1 rounded-lg transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Helper footer */}
      <div className="v3d-footer absolute bottom-2.5 right-2.5 text-[10px] font-mono px-2 py-0.5 rounded-lg backdrop-blur-sm pointer-events-none flex items-center gap-1.5 shadow-sm">
        <Compass className="w-3 h-3 text-sky-400 shrink-0" />
        <span className="v3d-dim hidden sm:inline">Arraste para rotacionar • Scroll para zoom</span>
        <span className="v3d-dim sm:hidden">Girar • Zoom</span>
      </div>
        </div>
      )}
    </div>
  );
};

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  });
}

// Generates procedural geometries for sample 3D items
function createSampleObject(
  sampleType: string,
  filamentColor: string,
  isWireframe: boolean
): THREE.Object3D {
  const group = new THREE.Group();

  if (sampleType === 'bambu_3mf') {
    // A modern 3MF multi-component assembly: threaded container body + lid
    const bodyGeom = new THREE.CylinderGeometry(24, 24, 32, 36);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.35,
      metalness: 0.15,
      wireframe: isWireframe,
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.position.y = 16;
    group.add(bodyMesh);

    // Knurled lid on top
    const lidGeom = new THREE.CylinderGeometry(25.5, 25.5, 8, 48);
    const lidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor).offsetHSL(0, 0, 0.08),
      roughness: 0.25,
      metalness: 0.2,
      wireframe: isWireframe,
    });
    const lidMesh = new THREE.Mesh(lidGeom, lidMat);
    lidMesh.position.y = 36;
    group.add(lidMesh);

    return group;
  }

  if (sampleType === 'cad_bracket') {
    // Mechanical L-Bracket with mounting flange & fillet (standard CAD STEP model)
    const shape = new THREE.Shape();
    shape.moveTo(-30, 0);
    shape.lineTo(30, 0);
    shape.lineTo(30, 10);
    shape.lineTo(5, 10);
    shape.lineTo(5, 45);
    shape.lineTo(-30, 45);
    shape.lineTo(-30, 0);

    // Counterbore holes
    const hole1 = new THREE.Path();
    hole1.absarc(-15, 25, 4.5, 0, Math.PI * 2, true);
    shape.holes.push(hole1);

    const hole2 = new THREE.Path();
    hole2.absarc(18, 5, 4.5, 0, Math.PI * 2, true);
    shape.holes.push(hole2);

    const extrudeSettings = {
      depth: 35,
      bevelEnabled: true,
      bevelThickness: 1.5,
      bevelSize: 1.5,
      bevelSegments: 4,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.3,
      metalness: 0.3,
      wireframe: isWireframe,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
    return group;
  }

  if (sampleType === 'keychain') {
    const shape = new THREE.Shape();
    const width = 50;
    const height = 22;
    const radius = 6;

    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);

    const holePath = new THREE.Path();
    holePath.absarc(-width / 2 + 7, 0, 3.2, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    const extrudeSettings = {
      steps: 1,
      depth: 4.5,
      bevelEnabled: true,
      bevelThickness: 0.8,
      bevelSize: 0.8,
      bevelSegments: 3,
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.35,
      metalness: 0.15,
      wireframe: isWireframe,
    });
    group.add(new THREE.Mesh(geom, mat));
    return group;
  }

  if (sampleType === 'phone_stand') {
    const shape = new THREE.Shape();
    shape.moveTo(-25, 0);
    shape.lineTo(25, 0);
    shape.lineTo(25, 12);
    shape.lineTo(15, 12);
    shape.lineTo(20, 35);
    shape.lineTo(12, 37);
    shape.lineTo(6, 12);
    shape.lineTo(-20, 12);
    shape.lineTo(-25, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 30,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 2,
    };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.35,
      metalness: 0.15,
      wireframe: isWireframe,
    });
    group.add(new THREE.Mesh(geom, mat));
    return group;
  }

  if (sampleType === 'gear') {
    // Mechanical toolpath gear with visible layer lines for G-code simulation
    const toolpathGroup = new THREE.Group();
    const teeth = 14;
    const rInner = 15;
    const rOuter = 24;

    for (let layer = 0; layer < 15; layer++) {
      const z = layer * 0.8;
      const points: THREE.Vector3[] = [];

      for (let i = 0; i <= teeth; i++) {
        const a1 = (i / teeth) * Math.PI * 2;
        const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
        const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
        const a4 = ((i + 0.8) / teeth) * Math.PI * 2;

        points.push(new THREE.Vector3(Math.cos(a1) * rInner, z, Math.sin(a1) * rInner));
        points.push(new THREE.Vector3(Math.cos(a2) * rOuter, z, Math.sin(a2) * rOuter));
        points.push(new THREE.Vector3(Math.cos(a3) * rOuter, z, Math.sin(a3) * rOuter));
        points.push(new THREE.Vector3(Math.cos(a4) * rInner, z, Math.sin(a4) * rInner));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(filamentColor).offsetHSL(0, 0, (layer / 15) * 0.2 - 0.1),
        linewidth: 2,
      });
      toolpathGroup.add(new THREE.Line(geom, mat));
    }

    // Add solid hub
    const hubGeom = new THREE.CylinderGeometry(8, 8, 12, 24);
    const hubMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(filamentColor), roughness: 0.4 });
    const hubMesh = new THREE.Mesh(hubGeom, hubMat);
    hubMesh.position.y = 6;
    toolpathGroup.add(hubMesh);

    return toolpathGroup;
  }

  // Geometric vase default
  const geom = new THREE.CylinderGeometry(14, 18, 38, 7, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(filamentColor),
    roughness: 0.35,
    metalness: 0.15,
    wireframe: isWireframe,
  });
  group.add(new THREE.Mesh(geom, mat));
  return group;
}

function parseSTLBufferToGeometry(buffer: ArrayBuffer): THREE.BufferGeometry {
  const isBinary = buffer.byteLength > 84 && new DataView(buffer).getUint32(80, true) * 50 + 84 === buffer.byteLength;
  const geometry = new THREE.BufferGeometry();

  if (isBinary) {
    const reader = new DataView(buffer);
    const triangles = reader.getUint32(80, true);
    const vertices = new Float32Array(triangles * 9);
    const normals = new Float32Array(triangles * 9);
    let offset = 84;

    for (let i = 0; i < triangles; i++) {
      if (offset + 50 > buffer.byteLength) break;
      const nx = reader.getFloat32(offset, true);
      const ny = reader.getFloat32(offset + 4, true);
      const nz = reader.getFloat32(offset + 8, true);
      offset += 12;

      for (let j = 0; j < 3; j++) {
        const vx = reader.getFloat32(offset, true);
        const vy = reader.getFloat32(offset + 4, true);
        const vz = reader.getFloat32(offset + 8, true);
        offset += 12;

        const idx = i * 9 + j * 3;
        vertices[idx] = vx;
        vertices[idx + 1] = vz;
        vertices[idx + 2] = -vy;

        normals[idx] = nx;
        normals[idx + 1] = nz;
        normals[idx + 2] = -ny;
      }
      offset += 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  } else {
    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split(/\r?\n/);
    const verts: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        verts.push(parseFloat(parts[1]), parseFloat(parts[3]), -parseFloat(parts[2]));
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    geometry.computeVertexNormals();
  }

  return geometry;
}
