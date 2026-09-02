// 3D File Parser: STL (Binary & ASCII) and G-Code metadata extraction

export interface ParsedModelResult {
  fileName: string;
  fileType: 'stl' | 'gcode';
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
  rawGcodeDetails?: {
    slicer?: string;
    nozzleTemp?: number;
    bedTemp?: number;
    timeRaw?: string;
  };
}

/**
 * Parses G-code text and extracts printing metadata
 */
export function parseGCodeText(
  content: string,
  fileName: string = 'model.gcode',
  density: number = 1.24, // PLA default 1.24 g/cm³
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

    // Detect Slicer
    if (line.includes('Generated with Cura') || line.includes('Cura_SteamEngine')) slicer = 'Ultimaker Cura';
    else if (line.includes('PrusaSlicer')) slicer = 'PrusaSlicer';
    else if (line.includes('BambuStudio') || line.includes('Bambu Studio')) slicer = 'Bambu Studio';
    else if (line.includes('OrcaSlicer')) slicer = 'OrcaSlicer';
    else if (line.includes('Simplify3D')) slicer = 'Simplify3D';

    // Check Cura Comments
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

    // Check Prusa/Orca/Bambu Comments
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

    // Temperatures
    if (line.includes('M104 S') || line.includes('M109 S')) {
      const match = line.match(/S(\d+)/);
      if (match && nozzleTemp === 200) nozzleTemp = parseInt(match[1], 10);
    }
    if (line.includes('M140 S') || line.includes('M190 S')) {
      const match = line.match(/S(\d+)/);
      if (match && bedTemp === 60) bedTemp = parseInt(match[1], 10);
    }

    // Detect extrusion mode
    if (line === 'M82') isRelativeE = false;
    if (line === 'M83') isRelativeE = true;
    if (line.startsWith('G92 E0')) currentE = 0;

    // Movement parsing for dimensions & fallback time
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

  // Calculate grams if not explicitly in comments
  const radius = filamentDiameter / 2;
  const crossSectionAreaMm2 = Math.PI * radius * radius;
  const volumeMm3 = crossSectionAreaMm2 * filamentLengthMm;
  const volumeCm3 = volumeMm3 / 1000;

  if (filamentGrams <= 0) {
    filamentGrams = volumeCm3 * density;
  }

  if (printTimeSeconds <= 0 && totalFeedrateTimeSec > 0) {
    // Add 15% acceleration / retract overhead
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
 * Parses STL ArrayBuffer (Binary or ASCII)
 * Calculates true 3D watertight volume, dimensions, and estimated print parameters
 */
export function parseSTLBuffer(
  buffer: ArrayBuffer,
  fileName: string = 'model.stl',
  density: number = 1.24, // g/cm³
  infillPercent: number = 20,
  wallThicknessMm: number = 1.2,
  layerHeightMm: number = 0.2
): ParsedModelResult {
  const isBinary = isBinarySTL(buffer);
  let totalVolumeMm3 = 0;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let triangles = 0;

  if (isBinary) {
    const dataView = new DataView(buffer);
    triangles = dataView.getUint32(80, true);
    let offset = 84;

    for (let i = 0; i < triangles; i++) {
      if (offset + 50 > buffer.byteLength) break;
      // Skip normal vector (12 bytes)
      offset += 12;

      // Vertex 1
      const x1 = dataView.getFloat32(offset, true);
      const y1 = dataView.getFloat32(offset + 4, true);
      const z1 = dataView.getFloat32(offset + 8, true);
      offset += 12;

      // Vertex 2
      const x2 = dataView.getFloat32(offset, true);
      const y2 = dataView.getFloat32(offset + 4, true);
      const z2 = dataView.getFloat32(offset + 8, true);
      offset += 12;

      // Vertex 3
      const x3 = dataView.getFloat32(offset, true);
      const y3 = dataView.getFloat32(offset + 4, true);
      const z3 = dataView.getFloat32(offset + 8, true);
      offset += 12;

      // Attribute byte count (2 bytes)
      offset += 2;

      // Signed volume of tetrahedron
      const v321 = x3 * y2 * z1;
      const v231 = x2 * y3 * z1;
      const v312 = x3 * y1 * z2;
      const v132 = x1 * y3 * z2;
      const v213 = x2 * y1 * z3;
      const v123 = x1 * y2 * z3;

      totalVolumeMm3 += (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);

      // Bounding Box
      if (x1 < minX) minX = x1; if (x1 > maxX) maxX = x1;
      if (x2 < minX) minX = x2; if (x2 > maxX) maxX = x2;
      if (x3 < minX) minX = x3; if (x3 > maxX) maxX = x3;

      if (y1 < minY) minY = y1; if (y1 > maxY) maxY = y1;
      if (y2 < minY) minY = y2; if (y2 > maxY) maxY = y2;
      if (y3 < minY) minY = y3; if (y3 > maxY) maxY = y3;

      if (z1 < minZ) minZ = z1; if (z1 > maxZ) maxZ = z1;
      if (z2 < minZ) minZ = z2; if (z2 > maxZ) maxZ = z2;
      if (z3 < minZ) minZ = z3; if (z3 > maxZ) maxZ = z3;
    }
  } else {
    // ASCII STL
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);
    const lines = text.split(/\r?\n/);
    const v: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('vertex')) {
        const parts = line.split(/\s+/);
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        v.push({ x, y, z });

        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

        if (v.length === 3) {
          triangles++;
          const [v1, v2, v3] = v;
          const v321 = v3.x * v2.y * v1.z;
          const v231 = v2.x * v3.y * v1.z;
          const v312 = v3.x * v1.y * v2.z;
          const v132 = v1.x * v3.y * v2.z;
          const v213 = v2.x * v1.y * v3.z;
          const v123 = v1.x * v2.y * v3.z;
          totalVolumeMm3 += (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
          v.length = 0;
        }
      }
    }
  }

  const rawVolCm3 = Math.abs(totalVolumeMm3) / 1000;
  const dimX = minX !== Infinity && maxX !== -Infinity ? Math.max(0.1, maxX - minX) : 30;
  const dimY = minY !== Infinity && maxY !== -Infinity ? Math.max(0.1, maxY - minY) : 30;
  const dimZ = minZ !== Infinity && maxZ !== -Infinity ? Math.max(0.1, maxZ - minZ) : 10;

  // Real 3D printing density model:
  // Shell (perimeters + top + bottom) are 100% solid.
  // The interior has infillPercent (e.g. 20%).
  // Typical shell volume accounts for 20-35% of total volume for small/medium models.
  const shellRatio = Math.min(0.5, (wallThicknessMm * 2) / Math.max(2, Math.min(dimX, dimY, dimZ)));
  const infillRatio = infillPercent / 100;
  const effectiveInfillFactor = shellRatio + (1 - shellRatio) * infillRatio;
  
  const printedVolumeCm3 = rawVolCm3 * Math.max(0.15, Math.min(1.0, effectiveInfillFactor));
  const estimatedGrams = printedVolumeCm3 * density;

  // Filament length (1.75mm diameter)
  const radiusMm = 1.75 / 2;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const lengthMeters = (printedVolumeCm3 * 1000) / areaMm2 / 1000;

  // Estimated print time: average volumetric extrusion speed ~ 8 to 12 mm³/s
  // Plus layer change overhead (~2 sec per layer)
  const layerCount = Math.ceil(dimZ / layerHeightMm);
  const avgVolumetricSpeedMm3PerSec = 8.5; // realistic for quality print
  const extrusionTimeSec = (printedVolumeCm3 * 1000) / avgVolumetricSpeedMm3PerSec;
  const layerChangeTimeSec = layerCount * 2.2;
  const totalPrintTimeMinutes = Math.max(1, Math.round((extrusionTimeSec + layerChangeTimeSec) / 60));

  return {
    fileName,
    fileType: 'stl',
    dimensions: {
      x: Number(dimX.toFixed(1)),
      y: Number(dimY.toFixed(1)),
      z: Number(dimZ.toFixed(1)),
    },
    volumeCm3: Number(rawVolCm3.toFixed(2)),
    estimatedWeightGrams: Number(estimatedGrams.toFixed(1)),
    estimatedTimeMinutes: totalPrintTimeMinutes,
    layerCount,
    layerHeightMm,
    filamentLengthMeters: Number(lengthMeters.toFixed(2)),
    infillPercent,
    trianglesCount: triangles,
  };
}

function isBinarySTL(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const reader = new DataView(buffer);
  const numTriangles = reader.getUint32(80, true);
  const expectedSize = 84 + numTriangles * 50;
  return expectedSize === buffer.byteLength;
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
