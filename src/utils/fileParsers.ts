// Multi-format 3D File Parser for 3D Printing & CAD
// Supports: STL, G-Code, 3MF, STEP/STP, IGES, OBJ, PLY, AMF, GLTF/GLB
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { AMFLoader } from 'three/examples/jsm/loaders/AMFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GCodeLoader } from 'three/examples/jsm/loaders/GCodeLoader.js';
import JSZip from 'jszip';
import { parseCadBuffer } from './cadParsers';
import { detectMeshColor } from './modelArranger';

export type Supported3DFormat =
  | 'stl'
  | 'gcode'
  | '3mf'
  | 'step'
  | 'stp'
  | 'iges'
  | 'igs'
  | 'obj'
  | 'ply'
  | 'amf'
  | 'gltf'
  | 'glb'
  | 'cad'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'bmp';

export interface ParsedModelResult {
  fileName: string;
  fileType: Supported3DFormat;
  formatLabel: string;
  category: 'mesh' | 'cad' | 'toolpath';
  dimensions: {
    x: number; // mm
    y: number; // mm
    z: number; // mm
  };
  volumeCm3: number; // cm³
  estimatedWeightGrams: number; // g
  estimatedTimeMinutes: number; // min
  layerCount?: number;
  layerHeightMm?: number;
  filamentLengthMeters?: number;
  infillPercent: number;
  isWatertight?: boolean;
  verticesCount?: number;
  trianglesCount?: number;
  partsCount?: number;
  imageUrl?: string;
  rawGcodeDetails?: {
    slicer?: string;
    nozzleTemp?: number;
    bedTemp?: number;
    timeRaw?: string;
  };
  cadDetails?: {
    cadSystem?: string;
    partNames?: string[];
    isAssembly?: boolean;
  };
  threeObject?: THREE.Object3D;
}

export interface ParseOptions {
  density?: number; // g/cm³ (PLA: 1.24)
  infillPercent?: number; // e.g. 20%
  wallThicknessMm?: number; // e.g. 1.2mm
  layerHeightMm?: number; // e.g. 0.2mm
  filamentDiameter?: number; // 1.75mm
}

/**
 * Universal 3D Model Parser: automatically detects format and extracts geometry,
 * dimensions, volume, estimated filament weight, print time, and 3D scene objects.
 */
export async function parseUniversal3DFile(
  file: File,
  options: ParseOptions = {}
): Promise<{ result: ParsedModelResult; object3D: THREE.Object3D }> {
  const fileName = file.name;
  const ext = getFileExtension(fileName);
  const density = options.density || 1.24;
  const infillPercent = options.infillPercent ?? 20;
  const wallThicknessMm = options.wallThicknessMm || 1.2;
  const layerHeightMm = options.layerHeightMm || 0.2;
  const filamentDiameter = options.filamentDiameter || 1.75;

  if (ext === 'gcode' || ext === 'gco' || ext === 'g' || ext === 'nc') {
    const text = await file.text();
    const parsed = parseGCodeText(text, fileName, density, filamentDiameter);

    let gcodeObject: THREE.Object3D;
    try {
      const loader = new GCodeLoader();
      gcodeObject = loader.parse(text);
      gcodeObject.rotation.set(-Math.PI / 2, 0, 0); // Convert Z-up to Y-up
    } catch {
      gcodeObject = createGCodeFallbackLines(text);
    }

    return {
      result: {
        ...parsed,
        formatLabel: 'G-Code (Arquivo Fatiado / Trajetória)',
        category: 'toolpath',
        threeObject: gcodeObject,
      },
      object3D: gcodeObject,
    };
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
    const imageUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.readAsDataURL(file);
    });

    const fallbackObj = new THREE.Group();
    return {
      result: {
        fileName,
        fileType: ext as any,
        formatLabel: 'Imagem / Foto de Referência',
        category: 'mesh',
        dimensions: { x: 100, y: 100, z: 50 },
        volumeCm3: 50,
        estimatedWeightGrams: 50 * density,
        estimatedTimeMinutes: 120,
        infillPercent,
        imageUrl,
      },
      object3D: fallbackObj,
    };
  }

  const buffer = await file.arrayBuffer();
  let object3D: THREE.Object3D;
  let formatLabel = 'Modelo 3D';
  let category: 'mesh' | 'cad' | 'toolpath' = 'mesh';
  let fileType: Supported3DFormat = 'stl';
  let cadDetails: ParsedModelResult['cadDetails'];
  let extraMetadata: Record<string, any> = {};

  switch (ext) {
    case '3mf': {
      fileType = '3mf';
      formatLabel = '3MF (3D Manufacturing Format)';
      category = 'mesh';
      const parsed3mf = await parse3MFBuffer(buffer, fileName);
      object3D = parsed3mf.group;
      extraMetadata = parsed3mf.metadata;
      break;
    }

    case 'step':
    case 'stp': {
      fileType = 'step';
      formatLabel = 'STEP / STP (CAD ISO 10303 Standard)';
      category = 'cad';
      cadDetails = extractStepCadHeader(buffer);
      object3D = await parseCadBuffer(buffer, 'step');
      break;
    }

    case 'iges':
    case 'igs': {
      fileType = 'iges';
      formatLabel = 'IGES / IGS (CAD Exchange)';
      category = 'cad';
      object3D = await parseCadBuffer(buffer, 'iges');
      break;
    }

    case 'obj': {
      fileType = 'obj';
      formatLabel = 'Wavefront OBJ';
      category = 'mesh';
      const text = new TextDecoder('utf-8').decode(buffer);
      const loader = new OBJLoader();
      object3D = loader.parse(text);
      break;
    }

    case 'ply': {
      fileType = 'ply';
      formatLabel = 'PLY (Polygon File Format)';
      category = 'mesh';
      const loader = new PLYLoader();
      const geom = loader.parse(buffer);
      geom.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.2 });
      const mesh = new THREE.Mesh(geom, mat);
      object3D = new THREE.Group();
      object3D.add(mesh);
      break;
    }

    case 'amf': {
      fileType = 'amf';
      formatLabel = 'AMF (Additive Manufacturing File)';
      category = 'mesh';
      try {
        const loader = new AMFLoader();
        object3D = loader.parse(buffer);
      } catch {
        object3D = parseAmfXmlFallback(buffer);
      }
      break;
    }

    case 'gltf':
    case 'glb': {
      fileType = ext === 'glb' ? 'glb' : 'gltf';
      formatLabel = 'GLTF / GLB (3D Transmission)';
      category = 'mesh';
      object3D = await parseGltfBuffer(buffer);
      break;
    }

    case 'stl':
    default: {
      fileType = 'stl';
      formatLabel = 'STL (Standard Triangle Language)';
      category = 'mesh';
      const loader = new STLLoader();
      let geom: THREE.BufferGeometry;
      try {
        geom = loader.parse(buffer);
      } catch {
        geom = parseSTLBufferToGeometry(buffer);
      }
      geom.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.2 });
      const mesh = new THREE.Mesh(geom, mat);
      object3D = new THREE.Group();
      object3D.add(mesh);
      break;
    }
  }

  // Calculate 3D geometry metrics (bounding box, real watertight volume, triangles)
  const metrics = calculateObject3DMetrics(object3D);

  const dimX = Math.max(0.1, Number(metrics.dimensions.x.toFixed(1)));
  const dimY = Math.max(0.1, Number(metrics.dimensions.y.toFixed(1)));
  const dimZ = Math.max(0.1, Number(metrics.dimensions.z.toFixed(1)));

  // If polyhedral divergence volume is near zero (e.g. open surface sheets), fallback to bounding volume factor
  let rawVolCm3 = metrics.volumeCm3;
  if (rawVolCm3 <= 0.05 && (dimX * dimY * dimZ > 0.5)) {
    rawVolCm3 = (dimX * dimY * dimZ * 0.32) / 1000;
  }
  rawVolCm3 = Number(rawVolCm3.toFixed(2));

  // Infill and shell calculations for 3D printing
  const minDim = Math.min(dimX, dimY, dimZ);
  const shellRatio = Math.min(0.55, (wallThicknessMm * 2) / Math.max(2, minDim));
  const infillRatio = infillPercent / 100;
  const effectiveInfillFactor = shellRatio + (1 - shellRatio) * infillRatio;

  const printedVolumeCm3 = rawVolCm3 * Math.max(0.15, Math.min(1.0, effectiveInfillFactor));
  const estimatedGrams = Number((printedVolumeCm3 * density).toFixed(1));

  // Filament length (1.75mm or 2.85mm)
  const radiusMm = filamentDiameter / 2;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const lengthMeters = Number(((printedVolumeCm3 * 1000) / areaMm2 / 1000).toFixed(2));

  // Print time estimation
  const layerCount = Math.max(1, Math.ceil(dimZ / layerHeightMm));
  const avgVolumetricSpeedMm3PerSec = 8.5; // realistic quality extrusion
  const extrusionTimeSec = (printedVolumeCm3 * 1000) / avgVolumetricSpeedMm3PerSec;
  const layerChangeTimeSec = layerCount * 2.2;
  const totalPrintTimeMinutes = Math.max(1, Math.round((extrusionTimeSec + layerChangeTimeSec) / 60));

  const result: ParsedModelResult = {
    fileName,
    fileType,
    formatLabel,
    category,
    dimensions: { x: dimX, y: dimY, z: dimZ },
    volumeCm3: rawVolCm3,
    estimatedWeightGrams: estimatedGrams,
    estimatedTimeMinutes: totalPrintTimeMinutes,
    layerCount,
    layerHeightMm,
    filamentLengthMeters: lengthMeters,
    infillPercent,
    trianglesCount: metrics.trianglesCount,
    verticesCount: metrics.verticesCount,
    partsCount: metrics.partsCount,
    cadDetails,
    threeObject: object3D,
  };

  return { result, object3D };
}

/**
 * Parses 3MF archive (ZIP container with 3D/3dmodel.model XML)
 */
async function parse3MFBuffer(buffer: ArrayBuffer, fileName: string): Promise<{ group: THREE.Group; metadata: any }> {
  const group = new THREE.Group();
  group.name = fileName;
  const metadata: Record<string, any> = {};

  try {
    const zip = await JSZip.loadAsync(buffer);
    const modelFile = zip.file('3D/3dmodel.model') || zip.file(/.*\.model/i)[0];
    if (modelFile) {
      const xmlText = await modelFile.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');

      // Extract base materials / color groups
      const colorMap = new Map<string, string>();
      const baseMaterialsEls = doc.getElementsByTagName('basematerials');
      for (let i = 0; i < baseMaterialsEls.length; i++) {
        const bm = baseMaterialsEls[i];
        const bmId = bm.getAttribute('id') || `${i}`;
        const bases = bm.getElementsByTagName('base');
        for (let b = 0; b < bases.length; b++) {
          const base = bases[b];
          const displayColor = base.getAttribute('displaycolor') || base.getAttribute('color');
          if (displayColor) {
            let hex = displayColor.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            colorMap.set(`${bmId}_${b}`, hex);
            colorMap.set(`${bmId}`, hex);
          }
        }
      }

      const colorGroupEls = doc.getElementsByTagName('colorgroup');
      for (let i = 0; i < colorGroupEls.length; i++) {
        const cg = colorGroupEls[i];
        const cgId = cg.getAttribute('id') || `${i}`;
        const colors = cg.getElementsByTagName('color');
        for (let c = 0; c < colors.length; c++) {
          const col = colors[c];
          const colVal = col.getAttribute('color') || col.getAttribute('displaycolor');
          if (colVal) {
            let hex = colVal.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            colorMap.set(`${cgId}_${c}`, hex);
            colorMap.set(`${cgId}`, hex);
          }
        }
      }

      const objects = doc.getElementsByTagName('object');
      let parsedCount = 0;

      for (let o = 0; o < objects.length; o++) {
        const objEl = objects[o];
        const meshEl = objEl.getElementsByTagName('mesh')[0];
        if (!meshEl) continue;

        const objName = objEl.getAttribute('name') || `Parte_${o + 1}`;
        const pid = meshEl.getAttribute('pid') || objEl.getAttribute('pid');
        const p1 = meshEl.getAttribute('p1');

        const verticesEl = meshEl.getElementsByTagName('vertex');
        const trianglesEl = meshEl.getElementsByTagName('triangle');
        if (verticesEl.length === 0 || trianglesEl.length === 0) continue;

        const vertices: [number, number, number][] = [];
        for (let v = 0; v < verticesEl.length; v++) {
          const el = verticesEl[v];
          const x = parseFloat(el.getAttribute('x') || '0');
          const y = parseFloat(el.getAttribute('y') || '0');
          const z = parseFloat(el.getAttribute('z') || '0');
          vertices.push([x, z, -y]);
        }

        const positions: number[] = [];
        for (let t = 0; t < trianglesEl.length; t++) {
          const el = trianglesEl[t];
          const v1 = parseInt(el.getAttribute('v1') || '0', 10);
          const v2 = parseInt(el.getAttribute('v2') || '0', 10);
          const v3 = parseInt(el.getAttribute('v3') || '0', 10);

          const pt1 = vertices[v1];
          const pt2 = vertices[v2];
          const pt3 = vertices[v3];
          if (pt1 && pt2 && pt3) {
            positions.push(
              pt1[0], pt1[1], pt1[2],
              pt2[0], pt2[1], pt2[2],
              pt3[0], pt3[1], pt3[2]
            );
          }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geom.computeVertexNormals();

        // Determine color using xml metadata, colorMap, or name keywords
        let colorHex = '#2563eb';
        const triPid = trianglesEl[0]?.getAttribute('pid') || pid;
        const triP1 = trianglesEl[0]?.getAttribute('p1') || p1;

        if (triPid && colorMap.has(`${triPid}_${triP1}`)) {
          colorHex = colorMap.get(`${triPid}_${triP1}`)!;
        } else if (triPid && colorMap.has(triPid)) {
          colorHex = colorMap.get(triPid)!;
        } else {
          // Fallback via detectMeshColor logic on temporary mesh with name
          const tempMesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
          tempMesh.name = objName;
          colorHex = detectMeshColor(tempMesh, parsedCount);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.35,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.name = objName;
        mesh.userData.color_hex = colorHex;
        group.add(mesh);
        parsedCount++;
      }

      if (parsedCount > 0) {
        group.rotation.set(-Math.PI / 2, 0, 0);
        return { group, metadata };
      }
    }
  } catch (err) {
    console.warn('Advanced 3MF XML parsing failed:', err);
  }

  // Fallback to ThreeMFLoader
  try {
    const loader = new ThreeMFLoader();
    const parsed = loader.parse(buffer);
    parsed.rotation.set(-Math.PI / 2, 0, 0);
    parsed.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        const assigned = detectMeshColor(m, 0);
        m.userData.color_hex = assigned;
        if (m.material && (m.material as any).color) {
          (m.material as any).color.set(assigned);
        }
      }
    });
    group.add(parsed);
  } catch (err) {
    console.warn('ThreeMFLoader parse error:', err);
  }

  // Inspect slicer metadata if from Bambu / Prusa / Orca
  try {
    const zip = await JSZip.loadAsync(buffer);
    const sliceInfo = zip.file('Metadata/SlicingInfo.xml') || zip.file('Metadata/project_settings.config');
    if (sliceInfo) {
      metadata.hasSlicerConfig = true;
    }
  } catch {
    // ignore
  }

  return { group, metadata };
}

/**
 * Parses 3MF XML text into Three.js BufferGeometry
 */
function parse3MFXmlGeometry(xmlText: string): THREE.BufferGeometry {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const verticesEl = doc.getElementsByTagName('vertex');
  const trianglesEl = doc.getElementsByTagName('triangle');

  const vertices: [number, number, number][] = [];
  for (let i = 0; i < verticesEl.length; i++) {
    const el = verticesEl[i];
    const x = parseFloat(el.getAttribute('x') || '0');
    const y = parseFloat(el.getAttribute('y') || '0');
    const z = parseFloat(el.getAttribute('z') || '0');
    vertices.push([x, z, -y]); // Z-up to Y-up
  }

  const positions: number[] = [];
  for (let i = 0; i < trianglesEl.length; i++) {
    const el = trianglesEl[i];
    const v1 = parseInt(el.getAttribute('v1') || '0', 10);
    const v2 = parseInt(el.getAttribute('v2') || '0', 10);
    const v3 = parseInt(el.getAttribute('v3') || '0', 10);

    const pt1 = vertices[v1];
    const pt2 = vertices[v2];
    const pt3 = vertices[v3];
    if (pt1 && pt2 && pt3) {
      positions.push(
        pt1[0], pt1[1], pt1[2],
        pt2[0], pt2[1], pt2[2],
        pt3[0], pt3[1], pt3[2]
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Parses GLTF/GLB buffer into THREE.Group
 */
function parseGltfBuffer(buffer: ArrayBuffer): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      (gltf) => {
        resolve(gltf.scene);
      },
      (err) => {
        reject(err);
      }
    );
  });
}

/**
 * Parses AMF XML fallback
 */
function parseAmfXmlFallback(buffer: ArrayBuffer): THREE.Group {
  const text = new TextDecoder('utf-8').decode(buffer);
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const verticesEl = doc.getElementsByTagName('vertex');
  const trianglesEl = doc.getElementsByTagName('triangle');

  const vertices: [number, number, number][] = [];
  for (let i = 0; i < verticesEl.length; i++) {
    const coord = verticesEl[i].getElementsByTagName('coordinates')[0];
    if (coord) {
      const x = parseFloat(coord.getElementsByTagName('x')[0]?.textContent || '0');
      const y = parseFloat(coord.getElementsByTagName('y')[0]?.textContent || '0');
      const z = parseFloat(coord.getElementsByTagName('z')[0]?.textContent || '0');
      vertices.push([x, z, -y]);
    }
  }

  const positions: number[] = [];
  for (let i = 0; i < trianglesEl.length; i++) {
    const v1 = parseInt(trianglesEl[i].getElementsByTagName('v1')[0]?.textContent || '0', 10);
    const v2 = parseInt(trianglesEl[i].getElementsByTagName('v2')[0]?.textContent || '0', 10);
    const v3 = parseInt(trianglesEl[i].getElementsByTagName('v3')[0]?.textContent || '0', 10);
    if (vertices[v1] && vertices[v2] && vertices[v3]) {
      positions.push(...vertices[v1], ...vertices[v2], ...vertices[v3]);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/**
 * Extracts CAD Header metadata from STEP file text
 */
function extractStepCadHeader(buffer: ArrayBuffer): ParsedModelResult['cadDetails'] {
  try {
    const slice = buffer.slice(0, Math.min(buffer.byteLength, 4096));
    const headerText = new TextDecoder('utf-8').decode(slice);

    let cadSystem = 'CAD Standard';
    const sysMatch = headerText.match(/FILE_DESCRIPTION\s*\([^;]*\)/i) || headerText.match(/FILE_NAME\s*\([^;]*\)/i);
    if (sysMatch) {
      const line = sysMatch[0];
      if (/Fusion\s*360/i.test(line)) cadSystem = 'Autodesk Fusion 360';
      else if (/SolidWorks/i.test(line)) cadSystem = 'Dassault SolidWorks';
      else if (/FreeCAD/i.test(line)) cadSystem = 'FreeCAD';
      else if (/Inventor/i.test(line)) cadSystem = 'Autodesk Inventor';
      else if (/Onshape/i.test(line)) cadSystem = 'PTC Onshape';
      else if (/CATIA/i.test(line)) cadSystem = 'Dassault CATIA';
      else if (/Rhino/i.test(line)) cadSystem = 'Rhino 3D';
      else if (/Siemens/i.test(line)) cadSystem = 'Siemens NX';
    }

    return {
      cadSystem,
      isAssembly: headerText.includes('NEXT_ASSEMBLY_USAGE_OCCURRENCE') || headerText.includes('PRODUCT_DEFINITION_SHAPE'),
    };
  } catch {
    return { cadSystem: 'CAD Standard' };
  }
}

/**
 * Calculates real-world polyhedral volume, bounding box, triangles and vertices
 * for any Three.js Object3D (containing one or multiple meshes)
 */
export function calculateObject3DMetrics(object3D: THREE.Object3D) {
  // Compute bounding box
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  box.getSize(size);

  let totalVolumeMm3 = 0;
  let totalTriangles = 0;
  let totalVertices = 0;
  let partsCount = 0;

  object3D.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      partsCount++;
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry;
      if (geom) {
        totalTriangles += getGeometryTriangleCount(geom);
        totalVertices += geom.attributes.position ? geom.attributes.position.count : 0;
        totalVolumeMm3 += calculateGeometryVolume(geom, mesh.matrixWorld);
      }
    }
  });

  return {
    dimensions: {
      x: size.x,
      y: size.y,
      z: size.z,
    },
    volumeCm3: Math.abs(totalVolumeMm3) / 1000,
    trianglesCount: totalTriangles,
    verticesCount: totalVertices,
    partsCount: Math.max(1, partsCount),
  };
}

/**
 * Calculates polyhedral signed volume of a BufferGeometry via Divergence Theorem
 */
export function calculateGeometryVolume(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4): number {
  const pos = geometry.attributes.position;
  if (!pos) return 0;

  let volume = 0;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  const getV = (idx: number, target: THREE.Vector3) => {
    target.fromBufferAttribute(pos, idx);
    if (matrix) target.applyMatrix4(matrix);
  };

  const index = geometry.index;
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      getV(index.getX(i), vA);
      getV(index.getX(i + 1), vB);
      getV(index.getX(i + 2), vC);
      // Signed volume of tetrahedron: (A · (B × C)) / 6
      volume += vA.dot(vB.clone().cross(vC)) / 6.0;
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      getV(i, vA);
      getV(i + 1, vB);
      getV(i + 2, vC);
      volume += vA.dot(vB.clone().cross(vC)) / 6.0;
    }
  }

  return Math.abs(volume);
}

function getGeometryTriangleCount(geometry: THREE.BufferGeometry): number {
  if (geometry.index) return geometry.index.count / 3;
  if (geometry.attributes.position) return geometry.attributes.position.count / 3;
  return 0;
}

/**
 * Parses G-code text and extracts printing metadata
 */
export function parseGCodeText(
  content: string,
  fileName: string = 'model.gcode',
  density: number = 1.24,
  filamentDiameter: number = 1.75
): ParsedModelResult {
  const lines = content.split(/\r?\n/);

  let filamentLengthMm = 0;
  let filamentGrams = 0;
  let printTimeSeconds = 0;
  let layerHeight = 0.2;
  let layerCount = 0;
  let slicer = 'Desconhecido';
  let nozzleTemp = 200;
  let bedTemp = 60;
  let timeRaw = '';

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  let currentE = 0;
  let maxE = 0;
  let isRelativeE = false;
  let totalFeedrateTimeSec = 0;
  let lastX = 0, lastY = 0, lastZ = 0, lastF = 3000;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes('Generated with Cura') || line.includes('Cura_SteamEngine')) slicer = 'Ultimaker Cura';
    else if (line.includes('PrusaSlicer')) slicer = 'PrusaSlicer';
    else if (line.includes('BambuStudio') || line.includes('Bambu Studio')) slicer = 'Bambu Studio';
    else if (line.includes('OrcaSlicer')) slicer = 'OrcaSlicer';
    else if (line.includes('Simplify3D')) slicer = 'Simplify3D';

    if (line.startsWith(';TIME:')) {
      const val = parseInt(line.replace(';TIME:', '').trim(), 10);
      if (!isNaN(val)) printTimeSeconds = val;
    }
    if (line.startsWith(';Filament used:')) {
      const match = line.match(/([\d.]+)\s*m/);
      if (match) filamentLengthMm = parseFloat(match[1]) * 1000;
    }
    if (line.startsWith(';Layer height:')) {
      const val = parseFloat(line.replace(';Layer height:', '').trim());
      if (!isNaN(val)) layerHeight = val;
    }

    if (line.includes('filament used [mm] =')) {
      const match = line.match(/filament used \[mm\]\s*=\s*([\d.]+)/);
      if (match) filamentLengthMm = parseFloat(match[1]);
    }
    if (line.includes('filament used [g] =')) {
      const match = line.match(/filament used \[g\]\s*=\s*([\d.]+)/);
      if (match) filamentGrams = parseFloat(match[1]);
    }
    if (line.includes('estimated printing time (normal mode) =') || line.includes('total estimated time:')) {
      timeRaw = line.split('=')[1] || line.split(':')[1] || '';
      printTimeSeconds = parseDurationStringToSeconds(timeRaw);
    }

    if (line.includes('M104 S') || line.includes('M109 S')) {
      const match = line.match(/S(\d+)/);
      if (match && nozzleTemp === 200) nozzleTemp = parseInt(match[1], 10);
    }
    if (line.includes('M140 S') || line.includes('M190 S')) {
      const match = line.match(/S(\d+)/);
      if (match && bedTemp === 60) bedTemp = parseInt(match[1], 10);
    }

    if (line === 'M82') isRelativeE = false;
    if (line === 'M83') isRelativeE = true;
    if (line.startsWith('G92 E0')) currentE = 0;

    if (line.startsWith('G1') || line.startsWith('G0')) {
      const parts = line.split(' ');
      let moveX = lastX, moveY = lastY, moveZ = lastZ, moveF = lastF;
      let hasMove = false;

      for (const p of parts) {
        const char = p.charAt(0).toUpperCase();
        const val = parseFloat(p.slice(1));
        if (isNaN(val)) continue;

        if (char === 'X') { moveX = val; if (val < minX) minX = val; if (val > maxX) maxX = val; hasMove = true; }
        else if (char === 'Y') { moveY = val; if (val < minY) minY = val; if (val > maxY) maxY = val; hasMove = true; }
        else if (char === 'Z') { moveZ = val; if (val < minZ) minZ = val; if (val > maxZ) maxZ = val; hasMove = true; }
        else if (char === 'F') { moveF = val; }
        else if (char === 'E') {
          if (isRelativeE) {
            filamentLengthMm += Math.max(0, val);
          } else {
            if (val > maxE) maxE = val;
            currentE = val;
          }
        }
      }

      if (hasMove && moveF > 0) {
        const dist = Math.sqrt(
          Math.pow(moveX - lastX, 2) +
          Math.pow(moveY - lastY, 2) +
          Math.pow(moveZ - lastZ, 2)
        );
        totalFeedrateTimeSec += (dist / (moveF / 60));
        lastX = moveX;
        lastY = moveY;
        lastZ = moveZ;
        lastF = moveF;
      }
    }
  }

  if (!isRelativeE && maxE > filamentLengthMm) {
    filamentLengthMm = maxE;
  }

  const radius = filamentDiameter / 2;
  const crossSectionAreaMm2 = Math.PI * radius * radius;
  const volumeMm3 = crossSectionAreaMm2 * filamentLengthMm;
  const volumeCm3 = volumeMm3 / 1000;

  if (filamentGrams <= 0) {
    filamentGrams = volumeCm3 * density;
  }

  if (printTimeSeconds <= 0 && totalFeedrateTimeSec > 0) {
    printTimeSeconds = totalFeedrateTimeSec * 1.25;
  }

  const dimX = minX !== Infinity && maxX !== -Infinity ? Math.max(1, maxX - minX) : 40;
  const dimY = minY !== Infinity && maxY !== -Infinity ? Math.max(1, maxY - minY) : 40;
  const dimZ = minZ !== Infinity && maxZ !== -Infinity ? Math.max(1, maxZ - minZ) : 15;

  if (layerHeight > 0 && dimZ > 0) {
    layerCount = Math.round(dimZ / layerHeight);
  }

  return {
    fileName,
    fileType: 'gcode',
    formatLabel: 'G-Code (Arquivo Fatiado)',
    category: 'toolpath',
    dimensions: {
      x: Number(dimX.toFixed(1)),
      y: Number(dimY.toFixed(1)),
      z: Number(dimZ.toFixed(1)),
    },
    volumeCm3: Number(volumeCm3.toFixed(2)),
    estimatedWeightGrams: Number(filamentGrams.toFixed(1)),
    estimatedTimeMinutes: Math.max(1, Math.round(printTimeSeconds / 60)),
    layerCount: layerCount || 100,
    layerHeightMm: layerHeight,
    filamentLengthMeters: Number((filamentLengthMm / 1000).toFixed(2)),
    infillPercent: 20,
    rawGcodeDetails: {
      slicer,
      nozzleTemp,
      bedTemp,
      timeRaw: timeRaw || `${Math.round(printTimeSeconds / 60)} min`
    }
  };
}

/**
 * Creates fallback 3D toolpath lines from G-Code movements
 */
function createGCodeFallbackLines(text: string): THREE.Group {
  const group = new THREE.Group();
  const lines = text.split(/\r?\n/);
  const points: THREE.Vector3[] = [];
  let curX = 0, curY = 0, curZ = 0;

  for (let i = 0; i < Math.min(lines.length, 12000); i++) {
    const line = lines[i].trim();
    if (!line.startsWith('G1') && !line.startsWith('G0')) continue;

    const parts = line.split(' ');
    for (const p of parts) {
      const char = p.charAt(0).toUpperCase();
      const val = parseFloat(p.slice(1));
      if (isNaN(val)) continue;
      if (char === 'X') curX = val;
      if (char === 'Y') curY = val;
      if (char === 'Z') curZ = val;
    }
    // Convert Z-up to Y-up
    points.push(new THREE.Vector3(curX, curZ, -curY));
  }

  if (points.length > 1) {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8, opacity: 0.8, transparent: true });
    const lineObj = new THREE.Line(geom, mat);
    group.add(lineObj);
  }

  return group;
}

export function parseSTLBuffer(
  buffer: ArrayBuffer,
  fileName: string = 'model.stl',
  density: number = 1.24,
  infillPercent: number = 20,
  wallThicknessMm: number = 1.2,
  layerHeightMm: number = 0.2
): ParsedModelResult {
  const geom = parseSTLBufferToGeometry(buffer);
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial());
  const group = new THREE.Group();
  group.add(mesh);
  const metrics = calculateObject3DMetrics(group);

  const dimX = Math.max(0.1, Number(metrics.dimensions.x.toFixed(1)));
  const dimY = Math.max(0.1, Number(metrics.dimensions.y.toFixed(1)));
  const dimZ = Math.max(0.1, Number(metrics.dimensions.z.toFixed(1)));
  const rawVolCm3 = metrics.volumeCm3;

  const minDim = Math.min(dimX, dimY, dimZ);
  const shellRatio = Math.min(0.5, (wallThicknessMm * 2) / Math.max(2, minDim));
  const infillRatio = infillPercent / 100;
  const effectiveInfillFactor = shellRatio + (1 - shellRatio) * infillRatio;

  const printedVolumeCm3 = rawVolCm3 * Math.max(0.15, Math.min(1.0, effectiveInfillFactor));
  const estimatedGrams = Number((printedVolumeCm3 * density).toFixed(1));

  const radiusMm = 1.75 / 2;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const lengthMeters = Number(((printedVolumeCm3 * 1000) / areaMm2 / 1000).toFixed(2));

  const layerCount = Math.max(1, Math.ceil(dimZ / layerHeightMm));
  const avgVolumetricSpeedMm3PerSec = 8.5;
  const extrusionTimeSec = (printedVolumeCm3 * 1000) / avgVolumetricSpeedMm3PerSec;
  const layerChangeTimeSec = layerCount * 2.2;
  const totalPrintTimeMinutes = Math.max(1, Math.round((extrusionTimeSec + layerChangeTimeSec) / 60));

  return {
    fileName,
    fileType: 'stl',
    formatLabel: 'STL (Standard Triangle Language)',
    category: 'mesh',
    dimensions: { x: dimX, y: dimY, z: dimZ },
    volumeCm3: rawVolCm3,
    estimatedWeightGrams: estimatedGrams,
    estimatedTimeMinutes: totalPrintTimeMinutes,
    layerCount,
    layerHeightMm,
    filamentLengthMeters: lengthMeters,
    infillPercent,
    trianglesCount: metrics.trianglesCount,
    verticesCount: metrics.verticesCount,
  };
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
        vertices[idx + 1] = vz; // Z-up to Y-up
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

function parseDurationStringToSeconds(raw: string): number {
  let seconds = 0;
  const hMatch = raw.match(/(\d+)\s*h/);
  const mMatch = raw.match(/(\d+)\s*m/);
  const sMatch = raw.match(/(\d+)\s*s/);

  if (hMatch) seconds += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) seconds += parseInt(mMatch[1], 10) * 60;
  if (sMatch) seconds += parseInt(sMatch[1], 10);

  if (seconds === 0) {
    const colonParts = raw.trim().split(':');
    if (colonParts.length === 3) {
      seconds = parseInt(colonParts[0], 10) * 3600 + parseInt(colonParts[1], 10) * 60 + parseInt(colonParts[2], 10);
    } else if (colonParts.length === 2) {
      seconds = parseInt(colonParts[0], 10) * 60 + parseInt(colonParts[1], 10);
    }
  }

  return seconds;
}

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop()! : '';
}
