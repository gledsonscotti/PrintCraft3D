import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, Box, Eye, RefreshCw } from 'lucide-react';

interface ModelViewer3DProps {
  modelBuffer?: ArrayBuffer | null;
  sampleType?: 'keychain' | 'phone_stand' | 'gear' | 'vase';
  filamentColor?: string;
  dimensions?: { x: number; y: number; z: number };
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelBuffer,
  sampleType = 'keychain',
  filamentColor = '#2563eb',
  dimensions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animFrameRef = useRef<number>(0);

  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.4, y: -0.6 });
  const zoomRef = useRef(75);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 320;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0A0A0B'); // Bento dark canvas
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 50, 85);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Build plate / Heated bed grid (e.g. 200x200mm)
    const bedSize = 140;
    const gridHelper = new THREE.GridHelper(bedSize, 28, 0x38bdf8, 0x334155);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // Heated bed surface plate
    const bedGeo = new THREE.BoxGeometry(bedSize, 1.2, bedSize);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.y = -0.7;
    bedMesh.receiveShadow = true;
    scene.add(bedMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(60, 100, 60);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.5);
    dirLight2.position.set(-60, 40, -60);
    scene.add(dirLight2);

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

      if (autoRotate && !isDraggingRef.current && meshRef.current) {
        rotationRef.current.y += 0.006;
      }

      if (meshRef.current && cameraRef.current) {
        // Orbit camera around center
        const radius = zoomRef.current;
        const phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, rotationRef.current.x));
        const theta = rotationRef.current.y;

        cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
        cameraRef.current.position.y = Math.max(10, radius * Math.cos(phi));
        cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
        cameraRef.current.lookAt(0, 10, 0);
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

  // Update Geometry whenever modelBuffer or sampleType changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach((m) => m.dispose());
      } else {
        meshRef.current.material.dispose();
      }
      meshRef.current = null;
    }

    let geometry: THREE.BufferGeometry;

    if (modelBuffer && modelBuffer.byteLength > 84) {
      try {
        geometry = parseSTLToThreeGeometry(modelBuffer);
      } catch (err) {
        console.warn('Error parsing uploaded STL buffer, falling back to sample:', err);
        geometry = createSampleGeometry(sampleType);
      }
    } else {
      geometry = createSampleGeometry(sampleType);
    }

    geometry.computeVertexNormals();
    geometry.center();

    // Align bottom of model to the build plate surface (y = 0)
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      geometry.translate(0, height / 2, 0);
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(filamentColor),
      roughness: 0.35,
      metalness: 0.15,
      wireframe: isWireframe,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;
  }, [modelBuffer, sampleType, filamentColor, isWireframe]);

  // Update material color if filament changes without rebuilding geometry
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(filamentColor);
      mat.wireframe = isWireframe;
      mat.needsUpdate = true;
    }
  }, [filamentColor, isWireframe]);

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
    rotationRef.current.x = Math.max(0.1, Math.min(1.4, rotationRef.current.x - deltaY * 0.01));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomRef.current = Math.max(30, Math.min(150, zoomRef.current + e.deltaY * 0.05));
  };

  const handleResetCamera = () => {
    rotationRef.current = { x: 0.5, y: -0.6 };
    zoomRef.current = 75;
  };

  return (
    <div className="relative w-full h-72 md:h-80 rounded-2xl overflow-hidden bg-[#0A0A0B] border border-white/[0.08] select-none shadow-inner group">
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

      {/* Floating Controls Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#121215]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.1] text-xs text-slate-300 shadow-lg">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
        <span className="font-semibold text-white">Mesa 3D</span>
        {dimensions && (
          <span className="text-slate-400 border-l border-white/[0.1] pl-2 font-mono text-[11px]">
            {dimensions.x}×{dimensions.y}×{dimensions.z}mm
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#121215]/90 backdrop-blur-md p-1 rounded-xl border border-white/[0.1] shadow-lg">
        <button
          type="button"
          onClick={() => setIsWireframe(!isWireframe)}
          title="Alternar Modo Aramado (Wireframe)"
          className={`p-1.5 rounded-lg transition ${
            isWireframe ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Alternar Giro Automático"
          className={`p-1.5 rounded-lg transition ${
            autoRotate ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-400/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => (zoomRef.current = Math.max(30, zoomRef.current - 12))}
          title="Aproximar Zoom"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => (zoomRef.current = Math.min(140, zoomRef.current + 12))}
          title="Afastar Zoom"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          title="Resetar Vista 3D"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Helper note at bottom */}
      <div className="absolute bottom-2.5 right-3 text-[11px] text-slate-400 font-mono bg-[#0A0A0B]/80 px-2.5 py-1 rounded-lg border border-white/[0.06] backdrop-blur-sm pointer-events-none">
        Arraste para rotacionar • Scroll para zoom
      </div>
    </div>
  );
};

// Generates procedural geometries for sample 3D items
function createSampleGeometry(sampleType: string): THREE.BufferGeometry {
  if (sampleType === 'keychain') {
    // A realistic 3D Keychain Tag with rounded bevel and keyring attachment hole!
    const shape = new THREE.Shape();
    const width = 50;
    const height = 22;
    const radius = 6;

    // Rounded rectangle shape
    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);

    // Hole for keyring
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
    return geom;
  }

  if (sampleType === 'phone_stand') {
    // Angled phone stand base
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
    return geom;
  }

  if (sampleType === 'gear') {
    // Mechanical gear
    const shape = new THREE.Shape();
    const teeth = 12;
    const rInner = 16;
    const rOuter = 24;

    for (let i = 0; i < teeth; i++) {
      const angle1 = (i / teeth) * Math.PI * 2;
      const angle2 = ((i + 0.3) / teeth) * Math.PI * 2;
      const angle3 = ((i + 0.5) / teeth) * Math.PI * 2;
      const angle4 = ((i + 0.8) / teeth) * Math.PI * 2;

      if (i === 0) shape.moveTo(Math.cos(angle1) * rInner, Math.sin(angle1) * rInner);
      else shape.lineTo(Math.cos(angle1) * rInner, Math.sin(angle1) * rInner);

      shape.lineTo(Math.cos(angle2) * rOuter, Math.sin(angle2) * rOuter);
      shape.lineTo(Math.cos(angle3) * rOuter, Math.sin(angle3) * rOuter);
      shape.lineTo(Math.cos(angle4) * rInner, Math.sin(angle4) * rInner);
    }

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 6, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    const extrudeSettings = { depth: 10, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8 };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.rotateX(Math.PI / 2);
    return geom;
  }

  // Geometric vase default
  const geom = new THREE.CylinderGeometry(14, 18, 38, 7, 1);
  return geom;
}

// Parses raw STL ArrayBuffer into Three.js BufferGeometry
function parseSTLToThreeGeometry(buffer: ArrayBuffer): THREE.BufferGeometry {
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
        vertices[idx + 1] = vz; // Convert Z-up to Y-up in Three.js
        vertices[idx + 2] = -vy;

        normals[idx] = nx;
        normals[idx + 1] = nz;
        normals[idx + 2] = -ny;
      }
      offset += 2; // attribute byte count
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  } else {
    // ASCII STL parser
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

    const vertices = new Float32Array(verts);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
  }

  return geometry;
}
