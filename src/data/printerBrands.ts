import { PrinterBrand, PrinterProtocol } from '../types';

export interface BrandModelPreset {
  model: string;
  category: 'fdm' | 'resin' | 'sls_dmls' | 'mjf';
  powerWatts: number;
  bedWatts: number;
  hourlyDepreciation: number;
  bedSize: { x: number; y: number; z: number };
  nozzleDiameter: number;
  defaultLanPort: number;
  defaultProtocol: PrinterProtocol;
  supportsAms: boolean;
  amsName?: string;
  hasCamera: boolean;
  hasLidarFlow: boolean;
}

export interface BrandInfo {
  brand: PrinterBrand;
  displayName: string;
  tagline: string;
  category: 'consumer_prosumer' | 'industrial';
  color: string;
  accentClass: string;
  badgeClass: string;
  cloudName: string;
  cloudDefaultEndpoint: string;
  lanProtocolName: string;
  models: BrandModelPreset[];
  instructions: {
    lan: string;
    cloud: string;
  };
}

export const PRINTER_BRANDS: Record<PrinterBrand, BrandInfo> = {
  'Bambu Lab': {
    brand: 'Bambu Lab',
    displayName: 'Bambu Lab',
    tagline: 'Série X1, P1, A1 com suporte a AMS & MQTT Local',
    category: 'consumer_prosumer',
    color: '#00AE42',
    accentClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cloudName: 'Bambu Cloud (Bambu Handy)',
    cloudDefaultEndpoint: 'https://api.bambulab.com/v1',
    lanProtocolName: 'Bambu MQTT / LAN Mode (Porta 8883 TLS)',
    models: [
      {
        model: 'X1-Carbon Combo',
        category: 'fdm',
        powerWatts: 120,
        bedWatts: 350,
        hourlyDepreciation: 1.20,
        bedSize: { x: 256, y: 256, z: 256 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8883,
        defaultProtocol: 'bambu_mqtt',
        supportsAms: true,
        amsName: 'Bambu AMS (4 Slots)',
        hasCamera: true,
        hasLidarFlow: true,
      },
      {
        model: 'P1S Combo',
        category: 'fdm',
        powerWatts: 100,
        bedWatts: 300,
        hourlyDepreciation: 0.85,
        bedSize: { x: 256, y: 256, z: 256 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8883,
        defaultProtocol: 'bambu_mqtt',
        supportsAms: true,
        amsName: 'Bambu AMS (4 Slots)',
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'A1 Mini Combo',
        category: 'fdm',
        powerWatts: 60,
        bedWatts: 150,
        hourlyDepreciation: 0.45,
        bedSize: { x: 180, y: 180, z: 180 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8883,
        defaultProtocol: 'bambu_mqtt',
        supportsAms: true,
        amsName: 'Bambu AMS Lite (4 Slots)',
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'X1E Enterprise',
        category: 'fdm',
        powerWatts: 150,
        bedWatts: 400,
        hourlyDepreciation: 1.90,
        bedSize: { x: 256, y: 256, z: 256 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8883,
        defaultProtocol: 'bambu_mqtt',
        supportsAms: true,
        amsName: 'Bambu AMS (4 Slots)',
        hasCamera: true,
        hasLidarFlow: true,
      }
    ],
    instructions: {
      lan: 'Na tela da impressora, acesse Configurações > Rede > Modo LAN. Copie o IP e o Código de Acesso (Access Code de 8 dígitos).',
      cloud: 'Insira o Número de Série (SN) de 15 caracteres localizado na etiqueta traseira ou no app Bambu Handy, juntamente com seu Auth Token.'
    }
  },

  'Creality': {
    brand: 'Creality',
    displayName: 'Creality',
    tagline: 'K1, K1 Max, Ender-3 V3 com Creality OS & Klipper Moonraker',
    category: 'consumer_prosumer',
    color: '#0099FF',
    accentClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    cloudName: 'Creality Cloud API',
    cloudDefaultEndpoint: 'https://api.crealitycloud.com/v1',
    lanProtocolName: 'Creality OS / Moonraker (Porta 7125 ou 4408)',
    models: [
      {
        model: 'K1 Max AI CoreXY',
        category: 'fdm',
        powerWatts: 110,
        bedWatts: 300,
        hourlyDepreciation: 0.95,
        bedSize: { x: 300, y: 300, z: 300 },
        nozzleDiameter: 0.4,
        defaultLanPort: 7125,
        defaultProtocol: 'moonraker_klipper',
        supportsAms: true,
        amsName: 'Creality CFS (4 Cores)',
        hasCamera: true,
        hasLidarFlow: true,
      },
      {
        model: 'K1 / K1C',
        category: 'fdm',
        powerWatts: 95,
        bedWatts: 250,
        hourlyDepreciation: 0.70,
        bedSize: { x: 220, y: 220, z: 250 },
        nozzleDiameter: 0.4,
        defaultLanPort: 7125,
        defaultProtocol: 'moonraker_klipper',
        supportsAms: true,
        amsName: 'Creality CFS (4 Cores)',
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Ender-3 V3 Plus',
        category: 'fdm',
        powerWatts: 80,
        bedWatts: 220,
        hourlyDepreciation: 0.55,
        bedSize: { x: 300, y: 300, z: 330 },
        nozzleDiameter: 0.4,
        defaultLanPort: 4408,
        defaultProtocol: 'moonraker_klipper',
        supportsAms: false,
        hasCamera: false,
        hasLidarFlow: false,
      },
      {
        model: 'Halot Mage Pro 8K',
        category: 'resin',
        powerWatts: 140,
        bedWatts: 0,
        hourlyDepreciation: 0.80,
        bedSize: { x: 228, y: 128, z: 230 },
        nozzleDiameter: 0.05,
        defaultLanPort: 80,
        defaultProtocol: 'custom_http',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Conecte a impressora ao Wi-Fi. Abra a interface web pelo IP no navegador ou use a porta padrão 7125 (Moonraker) com Fluidd/Mainsail.',
      cloud: 'Obtenha a chave de dispositivo vinculada à sua conta no Creality Cloud Developer Portal.'
    }
  },

  'Prusa Research': {
    brand: 'Prusa Research',
    displayName: 'Prusa Research',
    tagline: 'Original Prusa MK4, XL, MINI+ via PrusaLink & Prusa Connect',
    category: 'consumer_prosumer',
    color: '#FA6838',
    accentClass: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    cloudName: 'Prusa Connect Cloud',
    cloudDefaultEndpoint: 'https://connect.prusa3d.com/app/link',
    lanProtocolName: 'PrusaLink REST API (Porta 80 / 8080)',
    models: [
      {
        model: 'Original Prusa MK4',
        category: 'fdm',
        powerWatts: 90,
        bedWatts: 220,
        hourlyDepreciation: 0.90,
        bedSize: { x: 250, y: 210, z: 220 },
        nozzleDiameter: 0.4,
        defaultLanPort: 80,
        defaultProtocol: 'prusalink',
        supportsAms: true,
        amsName: 'Original Prusa MMU3 (5 Cores)',
        hasCamera: false,
        hasLidarFlow: false,
      },
      {
        model: 'Original Prusa XL (5 Cabeçotes)',
        category: 'fdm',
        powerWatts: 150,
        bedWatts: 450,
        hourlyDepreciation: 2.50,
        bedSize: { x: 360, y: 360, z: 360 },
        nozzleDiameter: 0.4,
        defaultLanPort: 80,
        defaultProtocol: 'prusalink',
        supportsAms: true,
        amsName: '5 Toolheads Independentes',
        hasCamera: false,
        hasLidarFlow: false,
      },
      {
        model: 'Original Prusa MINI+',
        category: 'fdm',
        powerWatts: 65,
        bedWatts: 160,
        hourlyDepreciation: 0.45,
        bedSize: { x: 180, y: 180, z: 180 },
        nozzleDiameter: 0.4,
        defaultLanPort: 80,
        defaultProtocol: 'prusalink',
        supportsAms: false,
        hasCamera: false,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Ative o PrusaLink nas configurações de rede da impressora. Copie o IP e gere uma Chave de API nas credenciais HTTP Digest.',
      cloud: 'No Prusa Connect, copie o Token de Conexão da Máquina ou o Fingerprint de registro gerado na tela LCD.'
    }
  },

  'Anycubic': {
    brand: 'Anycubic',
    displayName: 'Anycubic',
    tagline: 'Kobra 3 Combo, Kobra 2 Series & Photon Mono com Anycubic OS',
    category: 'consumer_prosumer',
    color: '#3B82F6',
    accentClass: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cloudName: 'Anycubic Cloud / Anycubic App API',
    cloudDefaultEndpoint: 'https://cloud-api.anycubic.com/v2',
    lanProtocolName: 'Anycubic Kobra OS LAN (Porta 8888 ou 8080)',
    models: [
      {
        model: 'Anycubic Kobra X (Direct LAN)',
        category: 'fdm',
        powerWatts: 90,
        bedWatts: 250,
        hourlyDepreciation: 0.65,
        bedSize: { x: 250, y: 250, z: 260 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8888,
        defaultProtocol: 'anycubic_lan',
        supportsAms: true,
        amsName: 'Anycubic ACE Pro Multi-Cor',
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Kobra 3 Combo (com ACE Pro)',
        category: 'fdm',
        powerWatts: 85,
        bedWatts: 240,
        hourlyDepreciation: 0.65,
        bedSize: { x: 250, y: 250, z: 260 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8888,
        defaultProtocol: 'anycubic_lan',
        supportsAms: true,
        amsName: 'Anycubic Color Engine (ACE Pro 4 Cores)',
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Kobra 2 Max High-Speed',
        category: 'fdm',
        powerWatts: 120,
        bedWatts: 350,
        hourlyDepreciation: 0.85,
        bedSize: { x: 420, y: 420, z: 500 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8080,
        defaultProtocol: 'anycubic_lan',
        supportsAms: false,
        hasCamera: false,
        hasLidarFlow: false,
      },
      {
        model: 'Photon Mono M5s Pro 14K',
        category: 'resin',
        powerWatts: 110,
        bedWatts: 0,
        hourlyDepreciation: 0.75,
        bedSize: { x: 200, y: 223, z: 126 },
        nozzleDiameter: 0.05,
        defaultLanPort: 80,
        defaultProtocol: 'anycubic_lan',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Conecte ao mesmo roteador. Obtenha o endereço IP na tela Configurações > Wi-Fi. A porta padrão de controle é 8888.',
      cloud: 'No aplicativo Anycubic, escaneie o QR code da impressora e vincule o Device ID ao seu perfil da oficina.'
    }
  },

  'Elegoo': {
    brand: 'Elegoo',
    displayName: 'Elegoo',
    tagline: 'Neptune 4 Series com Klipper Moonraker & Saturn 4 Ultra',
    category: 'consumer_prosumer',
    color: '#06B6D4',
    accentClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    cloudName: 'Elegoo Cloud Web / OctoEverywhere',
    cloudDefaultEndpoint: 'https://elegoo.octoeverywhere.com/api',
    lanProtocolName: 'Moonraker Klipper Web (Porta 7125 ou 80)',
    models: [
      {
        model: 'Neptune 4 Pro High-Speed',
        category: 'fdm',
        powerWatts: 90,
        bedWatts: 250,
        hourlyDepreciation: 0.55,
        bedSize: { x: 225, y: 225, z: 265 },
        nozzleDiameter: 0.4,
        defaultLanPort: 7125,
        defaultProtocol: 'moonraker_klipper',
        supportsAms: false,
        hasCamera: false,
        hasLidarFlow: false,
      },
      {
        model: 'Neptune 4 Max Gigante',
        category: 'fdm',
        powerWatts: 140,
        bedWatts: 400,
        hourlyDepreciation: 0.95,
        bedSize: { x: 420, y: 420, z: 480 },
        nozzleDiameter: 0.4,
        defaultLanPort: 7125,
        defaultProtocol: 'moonraker_klipper',
        supportsAms: false,
        hasCamera: false,
        hasLidarFlow: false,
      },
      {
        model: 'Saturn 4 Ultra 12K (Tilt Release)',
        category: 'resin',
        powerWatts: 130,
        bedWatts: 0,
        hourlyDepreciation: 0.85,
        bedSize: { x: 218, y: 122, z: 220 },
        nozzleDiameter: 0.05,
        defaultLanPort: 80,
        defaultProtocol: 'custom_http',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'As impressoras Neptune 4 rodam Klipper nativo. Acesse pelo IP na porta 7125 ou porta 80 do Fluidd integrado.',
      cloud: 'Utilize o token do plugin de acesso remoto Moonraker ou OctoEverywhere conectado à máquina.'
    }
  },

  'Flashforge': {
    brand: 'Flashforge',
    displayName: 'Flashforge',
    tagline: 'Adventurer 5M Pro, Guider 3 Plus com FlashPrint LAN & FlashCloud',
    category: 'consumer_prosumer',
    color: '#8B5CF6',
    accentClass: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    cloudName: 'FlashCloud / Polar Cloud',
    cloudDefaultEndpoint: 'https://cloud.sz3dp.com/api',
    lanProtocolName: 'FlashPrint Protocol (Porta 8899 TCP)',
    models: [
      {
        model: 'Adventurer 5M Pro (CoreXY Fechada)',
        category: 'fdm',
        powerWatts: 110,
        bedWatts: 280,
        hourlyDepreciation: 0.80,
        bedSize: { x: 220, y: 220, z: 220 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8899,
        defaultProtocol: 'flashforge_lan',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Guider 3 Plus Industrial',
        category: 'fdm',
        powerWatts: 220,
        bedWatts: 450,
        hourlyDepreciation: 2.20,
        bedSize: { x: 350, y: 350, z: 600 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8899,
        defaultProtocol: 'flashforge_lan',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Creator 4 IDEX (Duplo Extrusor)',
        category: 'fdm',
        powerWatts: 260,
        bedWatts: 500,
        hourlyDepreciation: 3.10,
        bedSize: { x: 400, y: 350, z: 500 },
        nozzleDiameter: 0.4,
        defaultLanPort: 8899,
        defaultProtocol: 'flashforge_lan',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Ative o controle de rede no menu de configurações da tela. A porta padrão de envio direto é 8899.',
      cloud: 'No menu Nuvem da Flashforge, insira o código de registro de 6 dígitos para sincronizar com o FlashCloud.'
    }
  },

  'Stratasys': {
    brand: 'Stratasys',
    displayName: 'Stratasys',
    tagline: 'F120, F170, F370, Fortus 450mc via GrabCAD Print Server API',
    category: 'industrial',
    color: '#E11D48',
    accentClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    cloudName: 'GrabCAD Print Cloud API',
    cloudDefaultEndpoint: 'https://print.grabcad.com/api/v1',
    lanProtocolName: 'Stratasys GrabCAD LAN (Porta 12345 ou 8080)',
    models: [
      {
        model: 'Stratasys F170 / F370',
        category: 'fdm',
        powerWatts: 350,
        bedWatts: 850,
        hourlyDepreciation: 8.50,
        bedSize: { x: 355, y: 254, z: 355 },
        nozzleDiameter: 0.4,
        defaultLanPort: 12345,
        defaultProtocol: 'stratasys_grabcad',
        supportsAms: true,
        amsName: 'Auto-Material Canisters (Material + Suporte Solúvel)',
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Fortus 450mc Industrial',
        category: 'fdm',
        powerWatts: 700,
        bedWatts: 1500,
        hourlyDepreciation: 25.00,
        bedSize: { x: 406, y: 355, z: 406 },
        nozzleDiameter: 0.4,
        defaultLanPort: 12345,
        defaultProtocol: 'stratasys_grabcad',
        supportsAms: true,
        amsName: 'Dual Bay Material Delivery System',
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Conecte à rede corporativa cabeada Ethernet. Configure o IP estático da máquina e a porta do GrabCAD Print Server.',
      cloud: 'Informe o Workgroup ID e a API Key gerada no portal administrativo da GrabCAD Print Enterprise.'
    }
  },

  '3D Systems': {
    brand: '3D Systems',
    displayName: '3D Systems',
    tagline: 'Figure 4, ProJet MJP, ProX SLS via 3D Sprint Network API',
    category: 'industrial',
    color: '#D97706',
    accentClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    cloudName: '3D Systems 3D Connect Cloud',
    cloudDefaultEndpoint: 'https://3dconnect.3dsystems.com/api',
    lanProtocolName: '3D Sprint REST API (Porta 8000 ou 8080)',
    models: [
      {
        model: 'Figure 4 Standalone',
        category: 'resin',
        powerWatts: 280,
        bedWatts: 0,
        hourlyDepreciation: 6.80,
        bedSize: { x: 124, y: 70, z: 196 },
        nozzleDiameter: 0.05,
        defaultLanPort: 8000,
        defaultProtocol: 'threed_systems_api',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'ProJet MJP 2500 Plus',
        category: 'resin',
        powerWatts: 450,
        bedWatts: 0,
        hourlyDepreciation: 14.50,
        bedSize: { x: 294, y: 211, z: 144 },
        nozzleDiameter: 0.03,
        defaultLanPort: 8000,
        defaultProtocol: 'threed_systems_api',
        supportsAms: true,
        amsName: 'MJP MultiJet Material & Wax Support',
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Instale o 3D Sprint Service na rede local ou aponte diretamente para o endereço IP do controlador da impressora na porta 8000.',
      cloud: 'Utilize as credenciais do 3D Connect IoT da 3D Systems para envio de telemetria e ordens de fabricação.'
    }
  },

  'EOS': {
    brand: 'EOS',
    displayName: 'EOS',
    tagline: 'Sistemas Industriais DMLS (Metal) & SLS via EOSCONNECT Core API',
    category: 'industrial',
    color: '#10B981',
    accentClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cloudName: 'EOSCONNECT Cloud Enterprise',
    cloudDefaultEndpoint: 'https://eosconnect.eos.info/api/v2',
    lanProtocolName: 'EOSCONNECT Core REST / OPC UA (Porta 8088)',
    models: [
      {
        model: 'FORMIGA P 110 Velocis (SLS Polímeros)',
        category: 'sls_dmls',
        powerWatts: 1200,
        bedWatts: 2000,
        hourlyDepreciation: 32.00,
        bedSize: { x: 200, y: 250, z: 330 },
        nozzleDiameter: 0.1,
        defaultLanPort: 8088,
        defaultProtocol: 'eosconnect',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'EOS M 290 (DMLS Fusão a Laser Metal)',
        category: 'sls_dmls',
        powerWatts: 2800,
        bedWatts: 3500,
        hourlyDepreciation: 75.00,
        bedSize: { x: 250, y: 250, z: 325 },
        nozzleDiameter: 0.08,
        defaultLanPort: 8088,
        defaultProtocol: 'eosconnect',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Acesse o EOSCONNECT Core na rede industrial OT da fábrica na porta 8088 ou configure o endpoint OPC UA.',
      cloud: 'Informe o Token corporativo da API EOSCONNECT com permissões de enqueue de tarefas de produção.'
    }
  },

  'HP': {
    brand: 'HP',
    displayName: 'HP Multi Jet Fusion',
    tagline: 'HP Jet Fusion 4200, 5200 & 5420W via HP Command Center & 3D Center API',
    category: 'industrial',
    color: '#0284C7',
    accentClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    cloudName: 'HP 3D Center Cloud Platform',
    cloudDefaultEndpoint: 'https://3dcenter.hp.com/api/v1',
    lanProtocolName: 'HP Command Center API (Porta 8443)',
    models: [
      {
        model: 'HP Jet Fusion 5200 3D Printer',
        category: 'mjf',
        powerWatts: 3000,
        bedWatts: 5000,
        hourlyDepreciation: 60.00,
        bedSize: { x: 380, y: 284, z: 380 },
        nozzleDiameter: 0.08,
        defaultLanPort: 8443,
        defaultProtocol: 'hp_jetfusion',
        supportsAms: true,
        amsName: 'HP Processing Station & Material Unit',
        hasCamera: true,
        hasLidarFlow: true,
      },
      {
        model: 'HP Jet Fusion 4200 3D Printer',
        category: 'mjf',
        powerWatts: 2400,
        bedWatts: 4200,
        hourlyDepreciation: 45.00,
        bedSize: { x: 380, y: 284, z: 380 },
        nozzleDiameter: 0.08,
        defaultLanPort: 8443,
        defaultProtocol: 'hp_jetfusion',
        supportsAms: true,
        amsName: 'HP Fast Cooling Unit',
        hasCamera: true,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Habilite a API no HP Command Center integrado à Processing Station na porta 8443 com certificado mTLS.',
      cloud: 'Conecte através das credenciais corporativas do HP 3D Center API Gateway (Client ID & Secret).'
    }
  },

  'Outra': {
    brand: 'Outra',
    displayName: 'Outra Marca / Custom Klipper / Marlin',
    tagline: 'Impressoras DIY, Voron, RatRig, Sovol, Artillery ou Servidor OctoPrint',
    category: 'consumer_prosumer',
    color: '#94A3B8',
    accentClass: 'text-slate-300 border-slate-500/30 bg-slate-500/10',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    cloudName: 'OctoEverywhere / Custom Webhook',
    cloudDefaultEndpoint: 'https://octoeverywhere.com/api',
    lanProtocolName: 'OctoPrint / Moonraker / Repetier Server',
    models: [
      {
        model: 'Custom CoreXY (Klipper / Voron 2.4)',
        category: 'fdm',
        powerWatts: 120,
        bedWatts: 350,
        hourlyDepreciation: 0.90,
        bedSize: { x: 350, y: 350, z: 350 },
        nozzleDiameter: 0.4,
        defaultLanPort: 7125,
        defaultProtocol: 'moonraker_klipper',
        supportsAms: false,
        hasCamera: true,
        hasLidarFlow: false,
      },
      {
        model: 'Impressora Genérica (OctoPrint)',
        category: 'fdm',
        powerWatts: 80,
        bedWatts: 200,
        hourlyDepreciation: 0.50,
        bedSize: { x: 220, y: 220, z: 250 },
        nozzleDiameter: 0.4,
        defaultLanPort: 5000,
        defaultProtocol: 'octoprint',
        supportsAms: false,
        hasCamera: false,
        hasLidarFlow: false,
      }
    ],
    instructions: {
      lan: 'Informe o IP e a porta do Moonraker (7125) ou OctoPrint (5000/80) com a Chave de API correspondente.',
      cloud: 'Use a URL do webhook ou servidor em nuvem da sua máquina.'
    }
  }
};
