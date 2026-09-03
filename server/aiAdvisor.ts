import { GoogleGenAI } from '@google/genai';

export interface SlicingAdvisorInput {
  modelName?: string;
  category?: string;
  dimensions?: { x: number; y: number; z: number };
  weightGrams?: number;
  printTimeMinutes?: number;
  material?: string;
  printerName?: string;
  imageDataUrl?: string;
  userNotes?: string;
}

export interface SlicingProfileOutput {
  id: 'eco' | 'balanced' | 'strength';
  name: string;
  tier: number;
  badge: string;
  badgeColor: 'emerald' | 'sky' | 'amber' | 'purple';
  description: string;
  summary: string;
  specs: {
    layerHeight: string;
    wallLoops: number;
    infillPercent: number;
    infillPattern: string;
    topLayers: number;
    bottomLayers: number;
    printSpeed: string;
    nozzleTemp: string;
    bedTemp: string;
    fanSpeed: string;
  };
  estimatedWeightGrams: number;
  estimatedTimeMinutes: number;
  actionableTips: string[];
  metrics: {
    strengthScore: number;
    speedScore: number;
    economyScore: number;
    finishScore: number;
  };
}

export interface SlicingAdvisorResult {
  diagnostic: {
    pieceType: string;
    structuralAnalysis: string;
    idealBedOrientation: string;
    supportNeeded: string;
    layerAdhesionTips: string;
  };
  profiles: SlicingProfileOutput[];
  slicerSnippets: {
    recommendedSlicer: string;
    quickCopyNotes: string;
  };
  tips?: string[];
}

export function generateDynamicFallbackAdvice(input: SlicingAdvisorInput): SlicingAdvisorResult {
  const name = input.modelName || 'Peça 3D';
  const mat = (input.material || 'PLA').toUpperCase();
  const weight = Math.max(2, Number(input.weightGrams) || 15);
  const timeMin = Math.max(5, Number(input.printTimeMinutes) || 45);
  const dim = input.dimensions || { x: 50, y: 30, z: 10 };

  const isKeychain = /chaveiro|tag|brinde|anel|logo|placa/i.test(name) || (dim.z <= 6 && dim.x <= 80 && dim.y <= 80);
  const isMechanical = /engrenag|suporte|fixador|braço|polia|gear|bracket|holder|parafuso/i.test(name);
  const isVaseOrDeco = /vaso|estatua|decor|boneco|figure|busto/i.test(name);

  let pieceType = 'Peça Utilitária / Modelo 3D Geral';
  let structuralAnalysis = 'Modelo geométrico com distribuição de esforços dependente da adesão entre camadas e densidade das paredes.';
  let orientation = 'Posicione a maior face plana assentada diretamente sobre a mesa de impressão para máxima estabilidade e área de contato térmico.';
  let supportNeeded = dim.z > 50 && (dim.x > 80 || dim.y > 80) ? 'Possível necessidade de suporte em saliências acima de 50°' : 'Não necessita suportes com orientação plana correta.';

  if (isKeychain) {
    pieceType = 'Chaveiro / Brinde Promocional com Ilhós de Fixação';
    structuralAnalysis = 'Peça plana com furação fina para argola. O risco principal de quebra é no anel do chaveiro por cisalhamento se tracionado ou torcido no bolso.';
    orientation = 'Imprimir deitado 100% plano no plano XY (eixo Z baixo). As linhas de filamento concêntricas nos perímetros abraçam o anel, garantindo que a argola não rasgue.';
    supportNeeded = 'Sem suportes. Superfície plana excelente para mesa texturizada PEI.';
  } else if (isMechanical) {
    pieceType = 'Componente Mecânico Funcional / Suporte de Carga';
    structuralAnalysis = 'Peça sujeita a esforço de tração, flexão ou torque cíclico. A adesão entre camadas (eixo Z) é o elo mais fraco; a resistência vem do número de perímetros/paredes.';
    orientation = 'Oriente as camadas paralelamente às linhas de esforço mecânico (nunca aplique força de cisalhamento perpendicular às camadas).';
    supportNeeded = 'Verifique se os furos requerem suportes internos ou use suportes em árvore (tree supports) apenas onde estritamente necessário.';
  } else if (isVaseOrDeco) {
    pieceType = 'Peça Decorativa / Geometria Estética ou Vaso';
    structuralAnalysis = 'Foco em estética de superfície, sem imperfeições de retração ou costura visível. O esforço mecânico é baixo a moderado.';
    orientation = 'Base do modelo bem nivelada na mesa com brim externo de 3mm a 5mm para garantir estabilidade vertical.';
    supportNeeded = 'Avaliar inclinação de paredes. Abaixo de 55° dispensa suportes.';
  }

  // Material temperatures
  let nozzleTempBase = '205°C';
  let bedTempBase = '60°C';
  if (mat.includes('PETG')) {
    nozzleTempBase = '235°C';
    bedTempBase = '75°C';
  } else if (mat.includes('ABS') || mat.includes('ASA')) {
    nozzleTempBase = '245°C';
    bedTempBase = '100°C';
  } else if (mat.includes('TPU')) {
    nozzleTempBase = '220°C';
    bedTempBase = '50°C';
  }

  // Profile 1: Economy
  const ecoWeight = Math.max(1, Math.round(weight * 0.72));
  const ecoTime = Math.max(5, Math.round(timeMin * 0.68));

  // Profile 2: Balanced
  const balWeight = Math.max(1, Math.round(weight * 1.0));
  const balTime = Math.max(5, Math.round(timeMin * 1.0));

  // Profile 3: Strength
  const strWeight = Math.max(1, Math.round(weight * 1.45));
  const strTime = Math.max(5, Math.round(timeMin * 1.65));

  const profiles: SlicingProfileOutput[] = [
    {
      id: 'eco',
      name: '1. Economia Inteligente (Peça Leve & Rápida sem Quebrar)',
      tier: 1,
      badge: 'Custo Mínimo',
      badgeColor: 'emerald',
      description: 'Foco em alta produtividade, menor tempo de máquina e baixo consumo de filamento, mantendo integridade funcional sem fragilidade.',
      summary: `Economiza cerca de 28% de filamento (${ecoWeight}g) e 32% do tempo (${ecoTime} min), ideal para lotes comerciais, chaveiros e brindes.`,
      specs: {
        layerHeight: '0.24 mm (ou 0.28 mm para alta velocidade)',
        wallLoops: 2,
        infillPercent: 10,
        infillPattern: 'Gyroid (distribuição isotrópica com pouca massa) ou Lightning',
        topLayers: 3,
        bottomLayers: 3,
        printSpeed: '100 - 180 mm/s (ou 60 mm/s em máquinas padrão)',
        nozzleTemp: nozzleTempBase,
        bedTemp: bedTempBase,
        fanSpeed: '100%'
      },
      estimatedWeightGrams: ecoWeight,
      estimatedTimeMinutes: ecoTime,
      actionableTips: [
        'Ative "Detectar Paredes Finas" no fatiador: isso reforça detalhes pequenos sem gastar material extra.',
        'Use preenchimento Gyroid a 10%: consome quase nada e evita que as linhas se cruzem no mesmo plano, eliminando vibrações na cabeça de impressão.',
        'Aumente a velocidade de deslocamento (Travel Speed) para 200-250 mm/s para economizar minutos valiosos entre saltos da peça.',
        isKeychain ? 'Mesmo com 2 paredes, a região do furo do chaveiro fica resistente porque as paredes contornam o perímetro inteiro.' : 'Reduza as camadas de topo para 3 com 1 camada de amortecimento.'
      ],
      metrics: {
        strengthScore: 6,
        speedScore: 9,
        economyScore: 10,
        finishScore: 7
      }
    },
    {
      id: 'balanced',
      name: '2. Equilibrado / Padrão Oficina (Qualidade Comercial & Firmeza)',
      tier: 2,
      badge: 'Recomendado',
      badgeColor: 'sky',
      description: 'O padrão comercial ideal para venda ao cliente final. Excelente acabamento de superfície, sem linhas grosseiras e rigidez balanceada.',
      summary: `Equilíbrio milimétrico entre estética de alto padrão e rigidez mecânica diária (${balWeight}g em ${balTime} min).`,
      specs: {
        layerHeight: '0.20 mm (camada padrão universal)',
        wallLoops: 3,
        infillPercent: 18,
        infillPattern: 'Gyroid ou Cúbico Adaptativo',
        topLayers: 4,
        bottomLayers: 4,
        printSpeed: '60 - 100 mm/s',
        nozzleTemp: nozzleTempBase,
        bedTemp: bedTempBase,
        fanSpeed: '100%'
      },
      actionableTips: [
        '3 paredes (perímetros) formam uma casca de 1.2mm de espessura que garante resistência muito superior a aumentar preenchimento.',
        'Habilite "Ironing" (alisamento a quente) na camada superior mais visível para um toque acetinado estilo molde de injeção.',
        'Defina o posicionamento da costura (Z-Seam) como "Alinhada na Traseira" ou "Canto Mais Agudo" para sumir com marcas visíveis.',
        '18% de preenchimento Gyroid garante absorção uniforme de impactos sem rangidos.'
      ],
      estimatedWeightGrams: balWeight,
      estimatedTimeMinutes: balTime,
      metrics: {
        strengthScore: 8,
        speedScore: 7,
        economyScore: 8,
        finishScore: 9
      }
    },
    {
      id: 'strength',
      name: '3. Ultra Resistência & Peças Mecânicas (Carga & Impacto)',
      tier: 3,
      badge: 'Carga Máxima',
      badgeColor: 'amber',
      description: 'Projetado para resistir a quedas, torção, impactos contínuos ou cargas mecânicas pesadas (engrenagens, suportes, braços).',
      summary: `Fusão intercamadas maximizada com 5 paredes sólidas (${strWeight}g em ${strTime} min). A peça torna-se praticamente maciça onde importa.`,
      specs: {
        layerHeight: '0.16 mm (maior área de contato e aderência intermolecular)',
        wallLoops: 5,
        infillPercent: 40,
        infillPattern: 'Cúbico ou Tri-Hexagonal (resistência multidirecional)',
        topLayers: 5,
        bottomLayers: 5,
        printSpeed: '40 - 60 mm/s (impressão mais lenta para melhor fusão plástica)',
        nozzleTemp: `${parseInt(nozzleTempBase) + 7}°C (aumento para fundir as camadas)`,
        bedTemp: `${parseInt(bedTempBase) + 5}°C`,
        fanSpeed: '50% a 70% (ventoinha reduzida evita choque térmico)'
      },
      actionableTips: [
        'Regra de Ouro: Resistência mecânica vem de PAREDES, não de preenchimento! 5 paredes criam uma blindagem sólida contra torção.',
        'Aumente a temperatura do bico em +7°C e reduza a ventoinha para 60%: o plástico funde a nível molecular prevenindo delaminação.',
        'Camadas mais baixas (0.16mm) aumentam em 25% a área de contato entre as trilhas plásticas.',
        'Orientação crítica: Nunca imprima pinos, alavancas ou dentes de engrenagem na vertical perpendicular à mesa, pois o esforço quebrará a linha de camada.'
      ],
      estimatedWeightGrams: strWeight,
      estimatedTimeMinutes: strTime,
      metrics: {
        strengthScore: 10,
        speedScore: 5,
        economyScore: 6,
        finishScore: 8
      }
    }
  ];

  return {
    diagnostic: {
      pieceType,
      structuralAnalysis,
      idealBedOrientation: orientation,
      supportNeeded,
      layerAdhesionTips: `Primeira camada com altura 0.28mm a 20 mm/s com mesa a ${bedTempBase} para adesão sem descolamento nas bordas (sem warping).`
    },
    profiles,
    slicerSnippets: {
      recommendedSlicer: 'Bambu Studio / OrcaSlicer / Cura / PrusaSlicer',
      quickCopyNotes: `[Fatiamento Otimizado para ${name}]\nMaterial: ${mat}\nModo 1 (Eco): 2 paredes, 10% infill, Camada 0.24mm -> ~${ecoWeight}g / ${ecoTime}min\nModo 2 (Bal): 3 paredes, 18% infill, Camada 0.20mm -> ~${balWeight}g / ${balTime}min\nModo 3 (Str): 5 paredes, 40% infill, Camada 0.16mm -> ~${strWeight}g / ${strTime}min`
    },
    tips: [
      'Para peças como chaveiros e brindes, use 2 a 3 paredes e infill Gyroid de 12%: resiste à torção diária gastando o mínimo.',
      'Em peças mecânicas ou engrenagens, priorize aumentar paredes (4 a 5 perímetros) e suba a temperatura em +5°C para fundir as camadas.',
      'O padrão Gyroid dissipa forças de tração em todos os eixos X, Y e Z sem acumular tensões pontuais.'
    ]
  };
}

export async function analyzePieceWithGemini(
  ai: GoogleGenAI,
  input: SlicingAdvisorInput
): Promise<SlicingAdvisorResult> {
  const name = input.modelName || 'Peça 3D';
  const mat = input.material || 'PLA';
  const weight = input.weightGrams || 15;
  const timeMin = input.printTimeMinutes || 45;
  const dim = input.dimensions || { x: 50, y: 30, z: 10 };
  const printer = input.printerName || 'Impressora 3D FDM';

  const systemInstruction = `Você é um engenheiro sênior especialista em impressão 3D (FDM), fatiamento avançado (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura) e consultor de manufatura aditiva.
Sua missão é analisar uma peça 3D (a partir da imagem e/ou parâmetros técnicos) e entregar:
1. Diagnóstico estrutural conciso (tipo de peça, onde ela costuma quebrar, melhor orientação na mesa e suportes).
2. EXATAMENTE 3 opções de perfis de fatiamento sob medida:
   - Opção 1 (id: 'eco'): Economia Inteligente (Peça Leve & Rápida sem Quebrar). Foco em custo mínimo para chaveiros, brindes ou protótipos, mas garantindo que não quebre fácil (ex: 2 paredes, infill inteligente, espessura mínima).
   - Opção 2 (id: 'balanced'): Equilibrado / Padrão Oficina (Qualidade Comercial & Firmeza). O padrão ouro para venda com acabamento limpo e rigidez balanceada.
   - Opção 3 (id: 'strength'): Ultra Resistência Mecânica (Carga & Impacto). Para peças sob esforço mecânico, engrenagens, suportes e ferramentas (foco em muitas paredes, fusão molecular a quente, baixa refrigeração).
3. Dicas práticas e diretas em linguagem acessível de oficina ("faça isso, isso e aquilo").
Retorne APENAS um JSON válido.`;

  const promptText = `Analise este modelo e gere os 3 perfis de impressão:
- Nome: ${name}
- Categoria / Aplicação: ${input.category || 'Geral'}
- Dimensões: ${dim.x}mm x ${dim.y}mm x ${dim.z}mm
- Peso estimado atual: ${weight}g
- Tempo estimado atual: ${timeMin} min
- Material selecionado: ${mat}
- Impressora: ${printer}
${input.userNotes ? `- Observações do usuário: ${input.userNotes}` : ''}

IMPORTANTE: Se uma imagem foi fornecida, analise a forma geométrica visualmente (ex: se é um chaveiro com anel fino, uma engrenagem com dentes, um suporte em L, etc.) e ajuste as dicas e orientações diretamente para as características visuais identificadas.

O formato JSON deve ter a estrutura exata:
{
  "diagnostic": {
    "pieceType": "string",
    "structuralAnalysis": "string",
    "idealBedOrientation": "string",
    "supportNeeded": "string",
    "layerAdhesionTips": "string"
  },
  "profiles": [
    {
      "id": "eco",
      "name": "1. Economia Inteligente (Peça Leve & Rápida sem Quebrar)",
      "tier": 1,
      "badge": "Custo Mínimo",
      "badgeColor": "emerald",
      "description": "string",
      "summary": "string",
      "specs": {
        "layerHeight": "0.24 mm",
        "wallLoops": 2,
        "infillPercent": 10,
        "infillPattern": "Gyroid",
        "topLayers": 3,
        "bottomLayers": 3,
        "printSpeed": "string",
        "nozzleTemp": "string",
        "bedTemp": "string",
        "fanSpeed": "string"
      },
      "estimatedWeightGrams": number,
      "estimatedTimeMinutes": number,
      "actionableTips": ["dica 1", "dica 2", "dica 3"],
      "metrics": {
        "strengthScore": 6,
        "speedScore": 9,
        "economyScore": 10,
        "finishScore": 7
      }
    },
    {
      "id": "balanced",
      "name": "2. Equilibrado / Padrão Oficina (Qualidade Comercial & Firmeza)",
      "tier": 2,
      "badge": "Recomendado",
      "badgeColor": "sky",
      "description": "string",
      "summary": "string",
      "specs": {
        "layerHeight": "0.20 mm",
        "wallLoops": 3,
        "infillPercent": 18,
        "infillPattern": "Gyroid",
        "topLayers": 4,
        "bottomLayers": 4,
        "printSpeed": "string",
        "nozzleTemp": "string",
        "bedTemp": "string",
        "fanSpeed": "string"
      },
      "estimatedWeightGrams": number,
      "estimatedTimeMinutes": number,
      "actionableTips": ["dica 1", "dica 2", "dica 3"],
      "metrics": {
        "strengthScore": 8,
        "speedScore": 7,
        "economyScore": 8,
        "finishScore": 9
      }
    },
    {
      "id": "strength",
      "name": "3. Ultra Resistência & Peças Mecânicas (Carga & Impacto)",
      "tier": 3,
      "badge": "Carga Máxima",
      "badgeColor": "amber",
      "description": "string",
      "summary": "string",
      "specs": {
        "layerHeight": "0.16 mm",
        "wallLoops": 5,
        "infillPercent": 40,
        "infillPattern": "Cúbico",
        "topLayers": 5,
        "bottomLayers": 5,
        "printSpeed": "string",
        "nozzleTemp": "string",
        "bedTemp": "string",
        "fanSpeed": "string"
      },
      "estimatedWeightGrams": number,
      "estimatedTimeMinutes": number,
      "actionableTips": ["dica 1", "dica 2", "dica 3"],
      "metrics": {
        "strengthScore": 10,
        "speedScore": 5,
        "economyScore": 6,
        "finishScore": 8
      }
    }
  ],
  "slicerSnippets": {
    "recommendedSlicer": "Bambu Studio / OrcaSlicer / Cura / PrusaSlicer",
    "quickCopyNotes": "string"
  }
}`;

  const imagePart: any = null;
  const partsWithImage: any[] = [];

  if (input.imageDataUrl && typeof input.imageDataUrl === 'string') {
    const match = input.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match && match[2].length > 100) {
      partsWithImage.push({
        inlineData: {
          mimeType: match[1] || 'image/jpeg',
          data: match[2]
        }
      });
    }
  }

  partsWithImage.push({ text: promptText });
  const partsTextOnly = [{ text: promptText }];

  // Priority list of models to try in case of 503 high demand or unavailability
  const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];

  for (const model of candidateModels) {
    // 1st attempt: with image if available
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: partsWithImage.length > 1 ? partsWithImage : partsTextOnly
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.6
        }
      });

      let rawText = response.text?.trim() || '';
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      }

      const parsed = JSON.parse(rawText);
      if (parsed.profiles && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        const tips = parsed.profiles.flatMap((p: any) => p.actionableTips || []).slice(0, 4);
        return {
          ...parsed,
          tips
        };
      }
    } catch (err: any) {
      // If error indicates image issue or 503, try text-only on this model before switching
      if (partsWithImage.length > 1) {
        try {
          const textOnlyRes = await ai.models.generateContent({
            model,
            contents: {
              parts: partsTextOnly
            },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.6
            }
          });
          let raw = textOnlyRes.text?.trim() || '';
          if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
          }
          const parsed = JSON.parse(raw);
          if (parsed.profiles && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
            const tips = parsed.profiles.flatMap((p: any) => p.actionableTips || []).slice(0, 4);
            return { ...parsed, tips };
          }
        } catch {
          // Continue to next model candidate
        }
      }
      // Continue to next candidate model
    }
  }

  // Gracefully fallback to dynamic engineering analysis if all cloud models are unavailable
  return generateDynamicFallbackAdvice(input);
}
