import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import JSZip from 'jszip';
import { BuildPlate, BuildPlatePart } from '../types';

/**
 * Exports a single build plate containing parts into binary STL ArrayBuffer or Blob
 */
export function exportPlateToSTL(
  plate: BuildPlate,
  meshCache: Map<number, THREE.Mesh>
): Blob {
  const exporter = new STLExporter();
  const group = new THREE.Group();

  plate.parts.forEach((part) => {
    const cached = meshCache.get(part.originalMeshIndex);
    if (!cached) return;

    const cloned = cached.clone();
    cloned.position.set(part.position.x, part.position.y, part.position.z);
    cloned.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
    cloned.scale.set(part.scale.x, part.scale.y, part.scale.z);
    group.add(cloned);
  });

  // Export as binary STL
  const stlData = exporter.parse(group, { binary: true });
  return new Blob([stlData], { type: 'application/octet-stream' });
}

/**
 * Triggers browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports all plates into a single ZIP archive containing separate STL files
 */
export async function exportAllPlatesToZip(
  projectName: string,
  plates: BuildPlate[],
  meshCache: Map<number, THREE.Mesh>
): Promise<Blob> {
  const zip = new JSZip();
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'projeto_mesas';

  plates.forEach((plate, idx) => {
    if (plate.parts.length === 0) return;
    const blob = exportPlateToSTL(plate, meshCache);
    const colorTag = (plate.filament_color || plate.filament_name || 'cor_unica')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const plateFilename = `Mesa_${idx + 1}_${colorTag}.stl`;
    zip.file(plateFilename, blob);
  });

  // Add a manifest README with breakdown
  let readme = `# Projeto de Mesas: ${projectName}\n`;
  readme += `Data de Exportação: ${new Date().toLocaleString('pt-BR')}\n`;
  readme += `Total de Mesas: ${plates.length}\n\n`;
  readme += `## Divisão das Mesas para Impressão em Cor Única:\n`;

  plates.forEach((p, idx) => {
    readme += `\n### Mesa ${idx + 1}: ${p.name}\n`;
    readme += `- Filamento: ${p.filament_name || 'Padrão'} (${p.filament_color || p.filament_color_hex || 'N/A'})\n`;
    readme += `- Peças (${p.parts.length}): ${p.parts.map((part) => part.name).join(', ')}\n`;
    readme += `- Peso Estimado: ${p.estimated_weight_g}g\n`;
    readme += `- Tempo Estimado: ${p.estimated_time_minutes} min\n`;
  });

  zip.file('info_producao.txt', readme);

  return await zip.generateAsync({ type: 'blob' });
}
