import * as THREE from 'three';

export interface ArrangedResult {
  group: THREE.Group;
  partsCount: number;
  dimensions: { x: number; y: number; z: number };
  fitsBed: boolean;
  scaleApplied: number;
  overflowX: number;
  overflowY: number;
  overflowZ: number;
  efficiencyPercent?: number;
  emptySpacePercent?: number;
}

export interface GeometricPackOptions {
  bedWidth?: number;
  bedDepth?: number;
  bedHeight?: number;
  spacing?: number;
  edgeMargin?: number;
  allowRotation90?: boolean;
  groupMode?: 'minimal_plates' | 'active_plate_only' | 'by_color';
}

export interface GeometricPlacedPart {
  partId: string;
  originalMeshIndex: number;
  part: any;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  placedDimensions: { x: number; y: number; z: number };
  rotated90: boolean;
  color_hex?: string;
}

export interface GeometricPackedPlate {
  plateIndex: number;
  plateName: string;
  filamentColorHex?: string;
  parts: GeometricPlacedPart[];
  occupiedAreaMm2: number;
  usableAreaMm2: number;
  totalBedAreaMm2: number;
  efficiencyPercent: number;
  emptySpacePercent: number;
  boundingHull: { width: number; depth: number };
  fitsBed: boolean;
}

export interface GeometricPackResult {
  plates: GeometricPackedPlate[];
  totalPartsPlaced: number;
  unplacedPartsCount: number;
  totalPlatesCount: number;
  averageEfficiencyPercent: number;
  totalOccupiedAreaMm2: number;
  summaryMessage: string;
}

interface FreeRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/**
 * Extracts individual distinct parts/meshes from a Three.js Object3D.
 * If the object contains multiple meshes, it returns each mesh.
 * If it has a single mesh with disconnected triangle islands (e.g. multi-part STL),
 * it splits the geometry into separate meshes.
 */
export function extractPartsFromObject(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];

  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshes.push((child as THREE.Mesh).clone());
    }
  });

  if (meshes.length > 1) {
    return meshes;
  }

  if (meshes.length === 1) {
    const singleMesh = meshes[0];
    const splitIslands = splitDisconnectedIslands(singleMesh.geometry, singleMesh.material);
    if (splitIslands.length > 1) {
      return splitIslands;
    }
    return [singleMesh];
  }

  return [];
}

/**
 * Splits a BufferGeometry into separate meshes if it contains disconnected triangle components.
 */
function splitDisconnectedIslands(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[]
): THREE.Mesh[] {
  const posAttr = geometry.attributes.position;
  if (!posAttr || posAttr.count < 30) return [];

  const triCount = geometry.index ? geometry.index.count / 3 : posAttr.count / 3;
  if (triCount < 30 || triCount > 250000) {
    // Avoid slow graph traversal for gigantic meshes > 250k triangles in UI thread
    return [];
  }

  const getVertexKey = (idx: number): string => {
    const x = Math.round(posAttr.getX(idx) * 5) / 5;
    const y = Math.round(posAttr.getY(idx) * 5) / 5;
    const z = Math.round(posAttr.getZ(idx) * 5) / 5;
    return `${x}_${y}_${z}`;
  };

  const vertexToTriangles = new Map<string, number[]>();
  const index = geometry.index;

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    const k0 = getVertexKey(i0);
    const k1 = getVertexKey(i1);
    const k2 = getVertexKey(i2);

    for (const k of [k0, k1, k2]) {
      let list = vertexToTriangles.get(k);
      if (!list) {
        list = [];
        vertexToTriangles.set(k, list);
      }
      list.push(t);
    }
  }

  // BFS to identify connected components of triangles
  const visited = new Uint8Array(triCount);
  const components: number[][] = [];

  for (let t = 0; t < triCount; t++) {
    if (visited[t]) continue;

    const component: number[] = [];
    const queue = [t];
    visited[t] = 1;

    let head = 0;
    while (head < queue.length) {
      const curTri = queue[head++];
      component.push(curTri);

      const i0 = index ? index.getX(curTri * 3) : curTri * 3;
      const i1 = index ? index.getX(curTri * 3 + 1) : curTri * 3 + 1;
      const i2 = index ? index.getX(curTri * 3 + 2) : curTri * 3 + 2;

      for (const i of [i0, i1, i2]) {
        const k = getVertexKey(i);
        const neighbors = vertexToTriangles.get(k);
        if (neighbors) {
          for (const n of neighbors) {
            if (!visited[n]) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
      }
    }

    // Only keep components that have a reasonable number of triangles
    if (component.length >= 20) {
      components.push(component);
    }
  }

  if (components.length <= 1) {
    return [];
  }

  // Build separate BufferGeometries for each component
  const resultMeshes: THREE.Mesh[] = [];
  const normalAttr = geometry.attributes.normal;

  for (let cIdx = 0; cIdx < components.length; cIdx++) {
    const compTris = components[cIdx];
    const subPositions = new Float32Array(compTris.length * 9);
    const subNormals = normalAttr ? new Float32Array(compTris.length * 9) : null;

    let destIdx = 0;
    for (let i = 0; i < compTris.length; i++) {
      const t = compTris[i];
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      for (const idx of [i0, i1, i2]) {
        subPositions[destIdx] = posAttr.getX(idx);
        subPositions[destIdx + 1] = posAttr.getY(idx);
        subPositions[destIdx + 2] = posAttr.getZ(idx);

        if (subNormals && normalAttr) {
          subNormals[destIdx] = normalAttr.getX(idx);
          subNormals[destIdx + 1] = normalAttr.getY(idx);
          subNormals[destIdx + 2] = normalAttr.getZ(idx);
        }
        destIdx += 3;
      }
    }

    const subGeom = new THREE.BufferGeometry();
    subGeom.setAttribute('position', new THREE.BufferAttribute(subPositions, 3));
    if (subNormals) {
      subGeom.setAttribute('normal', new THREE.BufferAttribute(subNormals, 3));
    } else {
      subGeom.computeVertexNormals();
    }

    const meshMat = Array.isArray(material) ? material[0].clone() : material.clone();
    const subMesh = new THREE.Mesh(subGeom, meshMat);
    subMesh.name = `Parte_${cIdx + 1}`;
    resultMeshes.push(subMesh);
  }

  return resultMeshes;
}

/**
 * Arranges multiple parts on the printer bed with safe margins, dropping each to Y=0.
 */
export function autoArrangePartsOnBed(
  object: THREE.Object3D,
  bedWidth: number = 250,
  bedDepth: number = 250,
  bedHeight: number = 260,
  spacing: number = 8
): ArrangedResult {
  const parts = extractPartsFromObject(object);

  if (parts.length === 0) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    return {
      group: object as THREE.Group,
      partsCount: 1,
      dimensions: { x: size.x, y: size.z, z: size.y },
      fitsBed: size.x <= bedWidth && size.z <= bedDepth,
      scaleApplied: 1,
      overflowX: Math.max(0, size.x - bedWidth),
      overflowY: Math.max(0, size.z - bedDepth),
      overflowZ: Math.max(0, size.y - bedHeight),
    };
  }

  const containerGroup = new THREE.Group();
  containerGroup.name = 'Arranged_Parts_Plate';

  // Prepare each part: center locally and align bottom to y=0
  const partItems: Array<{
    mesh: THREE.Mesh;
    width: number;
    depth: number;
    height: number;
  }> = [];

  for (const part of parts) {
    part.geometry.computeBoundingBox();
    const bbox = part.geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Center geometry so rotation/placement is predictable
    part.geometry.center();
    // Drop bottom to Y=0
    part.position.y = size.y / 2;

    partItems.push({
      mesh: part,
      width: Math.max(1, size.x),
      depth: Math.max(1, size.z),
      height: Math.max(1, size.y),
    });
  }

  // Sort by footprint area (largest first for optimal 2D packing)
  partItems.sort((a, b) => b.width * b.depth - a.width * a.depth);

  // 2D Row-Shelf packing
  const maxRowWidth = Math.max(bedWidth * 0.88, 120);
  let currentRowX = 0;
  let currentRowZ = 0;
  let currentRowMaxDepth = 0;

  for (const item of partItems) {
    if (currentRowX > 0 && currentRowX + item.width > maxRowWidth) {
      // Wrap to next row
      currentRowX = 0;
      currentRowZ += currentRowMaxDepth + spacing;
      currentRowMaxDepth = 0;
    }

    item.mesh.position.x = currentRowX + item.width / 2;
    item.mesh.position.z = currentRowZ + item.depth / 2;

    currentRowX += item.width + spacing;
    if (item.depth > currentRowMaxDepth) {
      currentRowMaxDepth = item.depth;
    }

    containerGroup.add(item.mesh);
  }

  // Center the whole arranged pack around (0, 0)
  const totalBox = new THREE.Box3().setFromObject(containerGroup);
  const totalSize = new THREE.Vector3();
  totalBox.getSize(totalSize);
  const totalCenter = new THREE.Vector3();
  totalBox.getCenter(totalCenter);

  for (const item of partItems) {
    item.mesh.position.x -= totalCenter.x;
    item.mesh.position.z -= totalCenter.z;
  }

  // Recalculate bounding box
  const finalBox = new THREE.Box3().setFromObject(containerGroup);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  const dimX = Number(finalSize.x.toFixed(1));
  const dimY = Number(finalSize.z.toFixed(1)); // Three.js Z is slicer/printer Y bed axis
  const dimZ = Number(finalSize.y.toFixed(1)); // Three.js Y is slicer/printer Z height axis

  const fitsBed = dimX <= bedWidth && dimY <= bedDepth && dimZ <= bedHeight;
  const overflowX = Math.max(0, dimX - bedWidth);
  const overflowY = Math.max(0, dimY - bedDepth);
  const overflowZ = Math.max(0, dimZ - bedHeight);

  return {
    group: containerGroup,
    partsCount: parts.length,
    dimensions: { x: dimX, y: dimY, z: dimZ },
    fitsBed,
    scaleApplied: 1,
    overflowX,
    overflowY,
    overflowZ,
  };
}

/**
 * Automatically scales and centers an object so it fits completely within the printer bed.
 */
export function fitObjectToBed(
  object: THREE.Object3D,
  bedWidth: number = 250,
  bedDepth: number = 250,
  bedHeight: number = 260,
  marginPercent: number = 0.92
): { scale: number; dimensions: { x: number; y: number; z: number } } {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const currentX = Math.max(0.1, size.x);
  const currentDepth = Math.max(0.1, size.z);
  const currentHeight = Math.max(0.1, size.y);

  const targetMaxX = bedWidth * marginPercent;
  const targetMaxDepth = bedDepth * marginPercent;
  const targetMaxHeight = bedHeight * marginPercent;

  const scaleX = targetMaxX / currentX;
  const scaleDepth = targetMaxDepth / currentDepth;
  const scaleHeight = targetMaxHeight / currentHeight;

  const requiredScale = Math.min(1.0, scaleX, scaleDepth, scaleHeight);

  if (requiredScale < 0.999) {
    object.scale.multiplyScalar(requiredScale);

    // Re-align to bed plate (y = 0) and center
    const newBox = new THREE.Box3().setFromObject(object);
    const newCenter = new THREE.Vector3();
    newBox.getCenter(newCenter);

    object.position.x -= newCenter.x;
    object.position.z -= newCenter.z;
    object.position.y -= newBox.min.y;
  }

  const finalBox = new THREE.Box3().setFromObject(object);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  return {
    scale: Number(requiredScale.toFixed(3)),
    dimensions: {
      x: Number(finalSize.x.toFixed(1)),
      y: Number(finalSize.z.toFixed(1)),
      z: Number(finalSize.y.toFixed(1)),
    },
  };
}

/**
 * Advanced 2D Guillotine Bin Packing with Best Short Side Fit (BSSF) and Best Area Fit (BAF).
 * Automatically groups candidate parts into individual build plates, minimizing wasted empty space.
 */
export function geometricPackPartsIntoPlates(
  parts: Array<{
    id: string;
    originalMeshIndex: number;
    name?: string;
    color_hex?: string;
    dimensions: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    [key: string]: any;
  }>,
  options: GeometricPackOptions = {}
): GeometricPackResult {
  const {
    bedWidth = 256,
    bedDepth = 256,
    spacing = 8,
    edgeMargin = 10,
    allowRotation90 = true,
    groupMode = 'minimal_plates',
  } = options;

  const usableW = Math.max(20, bedWidth - 2 * edgeMargin);
  const usableD = Math.max(20, bedDepth - 2 * edgeMargin);

  if (!parts || parts.length === 0) {
    return {
      plates: [],
      totalPartsPlaced: 0,
      unplacedPartsCount: 0,
      totalPlatesCount: 0,
      averageEfficiencyPercent: 0,
      totalOccupiedAreaMm2: 0,
      summaryMessage: 'Nenhuma peça selecionada para auto-organização geométrica.',
    };
  }

  // Pre-calculate effective dimensions
  const itemsToPack = parts.map((p) => {
    const scaleX = Math.abs(p.scale?.x || 1);
    const scaleY = Math.abs(p.scale?.y || 1);
    const scaleZ = Math.abs(p.scale?.z || 1);
    const width = Math.max(1, (p.dimensions?.x || 10) * scaleX);
    const depth = Math.max(1, (p.dimensions?.y || 10) * scaleY);
    const height = Math.max(1, (p.dimensions?.z || 10) * scaleZ);

    return {
      id: p.id,
      name: p.name || 'Parte',
      originalMeshIndex: p.originalMeshIndex,
      color_hex: p.color_hex,
      part: p,
      width,
      depth,
      height,
      area: width * depth,
    };
  });

  // If grouping by color first:
  if (groupMode === 'by_color') {
    const colorGroups = new Map<string, typeof itemsToPack>();
    itemsToPack.forEach((item) => {
      const c = item.color_hex?.toLowerCase() || '#2563eb';
      if (!colorGroups.has(c)) colorGroups.set(c, []);
      colorGroups.get(c)!.push(item);
    });

    const packedPlates: GeometricPackedPlate[] = [];
    let plateCounter = 1;

    colorGroups.forEach((groupItems, colorHex) => {
      const subResult = packSingleGroupOfItems(
        groupItems,
        usableW,
        usableD,
        bedWidth,
        bedDepth,
        spacing,
        allowRotation90,
        plateCounter,
        colorHex
      );
      packedPlates.push(...subResult);
      plateCounter += subResult.length;
    });

    return assemblePackResult(packedPlates, parts.length);
  }

  // Minimal plates mode or active plate only
  const packedPlates = packSingleGroupOfItems(
    itemsToPack,
    usableW,
    usableD,
    bedWidth,
    bedDepth,
    spacing,
    allowRotation90,
    1,
    itemsToPack[0]?.color_hex,
    groupMode === 'active_plate_only'
  );

  return assemblePackResult(packedPlates, parts.length);
}

function packSingleGroupOfItems(
  items: Array<{
    id: string;
    name: string;
    originalMeshIndex: number;
    color_hex?: string;
    part: any;
    width: number;
    depth: number;
    height: number;
    area: number;
  }>,
  usableW: number,
  usableD: number,
  bedWidth: number,
  bedDepth: number,
  spacing: number,
  allowRotation90: boolean,
  startPlateIndex: number = 1,
  defaultColorHex: string = '#2563eb',
  singlePlateOnly: boolean = false
): GeometricPackedPlate[] {
  // Sort items by footprint area descending (Best-Fit Decreasing)
  const sorted = [...items].sort(
    (a, b) => b.area - a.area || Math.max(b.width, b.depth) - Math.max(a.width, a.depth)
  );

  interface BinState {
    plateIndex: number;
    freeRects: FreeRect[];
    placedParts: GeometricPlacedPart[];
  }

  const bins: BinState[] = [];

  const createNewBin = (): BinState => {
    const bin: BinState = {
      plateIndex: startPlateIndex + bins.length,
      freeRects: [{ x: 0, z: 0, w: usableW, d: usableD }],
      placedParts: [],
    };
    bins.push(bin);
    return bin;
  };

  createNewBin();

  for (const item of sorted) {
    let bestBin: BinState | null = null;
    let bestRectIndex = -1;
    let bestRotated = false;
    let bestShortSideScore = Infinity;
    let bestAreaFitScore = Infinity;

    // Search existing bins
    const targetBins = singlePlateOnly ? [bins[0]] : bins;

    for (const bin of targetBins) {
      for (let rIdx = 0; rIdx < bin.freeRects.length; rIdx++) {
        const rect = bin.freeRects[rIdx];

        // Test normal orientation
        if (item.width <= rect.w && item.depth <= rect.d) {
          const leftoverW = rect.w - item.width;
          const leftoverD = rect.d - item.depth;
          const shortSide = Math.min(leftoverW, leftoverD);
          const areaWaste = rect.w * rect.d - item.width * item.depth;

          if (
            shortSide < bestShortSideScore ||
            (shortSide === bestShortSideScore && areaWaste < bestAreaFitScore)
          ) {
            bestBin = bin;
            bestRectIndex = rIdx;
            bestRotated = false;
            bestShortSideScore = shortSide;
            bestAreaFitScore = areaWaste;
          }
        }

        // Test 90° rotated orientation
        if (allowRotation90 && item.depth <= rect.w && item.width <= rect.d) {
          const leftoverW = rect.w - item.depth;
          const leftoverD = rect.d - item.width;
          const shortSide = Math.min(leftoverW, leftoverD);
          const areaWaste = rect.w * rect.d - item.depth * item.width;

          if (
            shortSide < bestShortSideScore ||
            (shortSide === bestShortSideScore && areaWaste < bestAreaFitScore)
          ) {
            bestBin = bin;
            bestRectIndex = rIdx;
            bestRotated = true;
            bestShortSideScore = shortSide;
            bestAreaFitScore = areaWaste;
          }
        }
      }
    }

    // If it didn't fit in any existing bin, open a new bin if allowed
    if (!bestBin || bestRectIndex === -1) {
      if (singlePlateOnly) {
        // Place with warning/clamping in single plate mode
        const placedW = item.width;
        const placedD = item.depth;
        bins[0].placedParts.push({
          partId: item.id,
          originalMeshIndex: item.originalMeshIndex,
          part: item.part,
          position: { x: 0, y: 0, z: 0 },
          rotation: item.part.rotation || { x: 0, y: 0, z: 0 },
          placedDimensions: { x: placedW, y: placedD, z: item.height },
          rotated90: false,
          color_hex: item.color_hex,
        });
        continue;
      }

      // Open new bin
      const newBin = createNewBin();
      bestBin = newBin;
      bestRectIndex = 0;

      const normalLeftover = Math.min(usableW - item.width, usableD - item.depth);
      const rotatedLeftover = allowRotation90
        ? Math.min(usableW - item.depth, usableD - item.width)
        : -Infinity;

      bestRotated =
        allowRotation90 &&
        rotatedLeftover > normalLeftover &&
        item.depth <= usableW &&
        item.width <= usableD;
    }

    // Place the part into the chosen free rectangle
    const rect = bestBin.freeRects[bestRectIndex];
    const placedW = bestRotated ? item.depth : item.width;
    const placedD = bestRotated ? item.width : item.depth;

    const centerX = rect.x + placedW / 2;
    const centerZ = rect.z + placedD / 2;

    const origRot = item.part.rotation || { x: 0, y: 0, z: 0 };
    const newRot = bestRotated
      ? { ...origRot, z: (origRot.z || 0) + Math.PI / 2 }
      : { ...origRot };

    bestBin.placedParts.push({
      partId: item.id,
      originalMeshIndex: item.originalMeshIndex,
      part: item.part,
      position: { x: centerX, y: 0, z: centerZ },
      rotation: newRot,
      placedDimensions: {
        x: bestRotated ? item.part.dimensions?.y || placedW : item.part.dimensions?.x || placedW,
        y: bestRotated ? item.part.dimensions?.x || placedD : item.part.dimensions?.y || placedD,
        z: item.height,
      },
      rotated90: bestRotated,
      color_hex: item.color_hex,
    });

    // Remove the chosen free rect
    bestBin.freeRects.splice(bestRectIndex, 1);

    // Guillotine subdivision
    const occupiedW = placedW + spacing;
    const occupiedD = placedD + spacing;

    const remW = rect.w - occupiedW;
    const remD = rect.d - occupiedD;

    // Shorter Axis Split rule: maximize the contiguous area of the larger rectangle
    if (remW > 4 && remD > 4) {
      if (remW <= remD) {
        bestBin.freeRects.push({
          x: rect.x + occupiedW,
          z: rect.z,
          w: remW,
          d: placedD,
        });
        bestBin.freeRects.push({
          x: rect.x,
          z: rect.z + occupiedD,
          w: rect.w,
          d: remD,
        });
      } else {
        bestBin.freeRects.push({
          x: rect.x + occupiedW,
          z: rect.z,
          w: remW,
          d: rect.d,
        });
        bestBin.freeRects.push({
          x: rect.x,
          z: rect.z + occupiedD,
          w: placedW,
          d: remD,
        });
      }
    } else if (remW > 4) {
      bestBin.freeRects.push({
        x: rect.x + occupiedW,
        z: rect.z,
        w: remW,
        d: rect.d,
      });
    } else if (remD > 4) {
      bestBin.freeRects.push({
        x: rect.x,
        z: rect.z + occupiedD,
        w: rect.w,
        d: remD,
      });
    }
  }

  const usableAreaMm2 = usableW * usableD;
  const totalBedAreaMm2 = bedWidth * bedDepth;

  return bins.map((bin) => {
    if (bin.placedParts.length === 0) {
      return {
        plateIndex: bin.plateIndex,
        plateName: `Mesa ${bin.plateIndex}`,
        filamentColorHex: defaultColorHex,
        parts: [],
        occupiedAreaMm2: 0,
        usableAreaMm2,
        totalBedAreaMm2,
        efficiencyPercent: 0,
        emptySpacePercent: 100,
        boundingHull: { width: 0, depth: 0 },
        fitsBed: true,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let totalPartArea = 0;

    bin.placedParts.forEach((p) => {
      const halfW = (p.placedDimensions.x || 10) / 2;
      const halfD = (p.placedDimensions.y || 10) / 2;
      minX = Math.min(minX, p.position.x - halfW);
      maxX = Math.max(maxX, p.position.x + halfW);
      minZ = Math.min(minZ, p.position.z - halfD);
      maxZ = Math.max(maxZ, p.position.z + halfD);
      totalPartArea += (p.placedDimensions.x || 10) * (p.placedDimensions.y || 10);
    });

    const shiftX = (minX + maxX) / 2;
    const shiftZ = (minZ + maxZ) / 2;

    // Shift parts so the whole cluster is centered on the bed at (0, 0)
    bin.placedParts.forEach((p) => {
      p.position.x = Math.round((p.position.x - shiftX) * 10) / 10;
      p.position.z = Math.round((p.position.z - shiftZ) * 10) / 10;
      p.position.y = 0;
    });

    const hullW = Math.max(1, maxX - minX);
    const hullD = Math.max(1, maxZ - minZ);

    const efficiencyPercent = Math.min(
      99.5,
      Math.round((totalPartArea / usableAreaMm2) * 1000) / 10
    );
    const emptySpacePercent = Math.max(
      0,
      Math.round((100 - efficiencyPercent) * 10) / 10
    );

    const fitsBed = hullW <= bedWidth && hullD <= bedDepth;

    return {
      plateIndex: bin.plateIndex,
      plateName: `Mesa ${bin.plateIndex}`,
      filamentColorHex: bin.placedParts[0]?.color_hex || defaultColorHex,
      parts: bin.placedParts,
      occupiedAreaMm2: Math.round(totalPartArea),
      usableAreaMm2: Math.round(usableAreaMm2),
      totalBedAreaMm2: Math.round(totalBedAreaMm2),
      efficiencyPercent,
      emptySpacePercent,
      boundingHull: {
        width: Math.round(hullW * 10) / 10,
        depth: Math.round(hullD * 10) / 10,
      },
      fitsBed,
    };
  });
}

function assemblePackResult(
  plates: GeometricPackedPlate[],
  totalRequestedParts: number
): GeometricPackResult {
  const totalPartsPlaced = plates.reduce((acc, p) => acc + p.parts.length, 0);
  const totalOccupiedAreaMm2 = plates.reduce((acc, p) => acc + p.occupiedAreaMm2, 0);
  const averageEfficiency =
    plates.length > 0
      ? Math.round(
          (plates.reduce((acc, p) => acc + p.efficiencyPercent, 0) / plates.length) * 10
        ) / 10
      : 0;

  const summaryMessage =
    plates.length === 1
      ? `${totalPartsPlaced} peças auto-organizadas com sucesso na mesa (${averageEfficiency}% de superfície ocupada, minimizando espaços vazios)!`
      : `${totalPartsPlaced} peças agrupadas geometricamente em ${plates.length} mesas individuais (aproveitamento médio de ${averageEfficiency}%)!`;

  return {
    plates,
    totalPartsPlaced,
    unplacedPartsCount: Math.max(0, totalRequestedParts - totalPartsPlaced),
    totalPlatesCount: plates.length,
    averageEfficiencyPercent: averageEfficiency,
    totalOccupiedAreaMm2,
    summaryMessage,
  };
}
