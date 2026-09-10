import { PlanFeatureDefinition } from '../types';

export const AVAILABLE_PLAN_FEATURES: PlanFeatureDefinition[] = [
  // Cálculo & Engenharia 3D
  {
    key: 'cost_calculator',
    category: 'core',
    title: 'Calculadora de Custos & Orçamentos',
    description: 'Cálculo de energia em kWh, depreciação por hora, margem de perda e markup de lucro.',
  },
  {
    key: 'model_analyzer',
    category: 'core',
    title: 'Visualizador 3D & Análise de Arquivos STL/STEP',
    description: 'Renderizador WebGL em tempo real com cálculo volumétrico e estimativa de massa.',
  },
  {
    key: 'ai_optimizer',
    category: 'core',
    title: 'Assistente IA Gemini para Otimização de Fatiamento',
    description: 'Diagnóstico inteligente de resistência mecânica, orientação de impressão e redução de filamento.',
    badge: 'Inteligência Artificial',
  },

  // Chão de Oficina & Produção
  {
    key: 'printers_fleet',
    category: 'production',
    title: 'Gestão de Parque de Impressoras & Manutenções',
    description: 'Controle de potência, status em tempo real e manutenções preventivas/corretivas com alertas.',
  },
  {
    key: 'ams_heaters',
    category: 'production',
    title: 'Sistemas Multicores, Secadores & AMS',
    description: 'Gerenciamento de módulos de troca rápida de cor, dryboxes e estufas de filamento.',
  },
  {
    key: 'production_orders',
    category: 'production',
    title: 'Controle de Ordens de Produção (OPs) & Fila',
    description: 'Acompanhamento do status de fabricação, cronograma de entregas e apontamento de refugo.',
  },
  {
    key: 'setup_templates',
    category: 'production',
    title: 'Templates de Setup & Limpeza de Mesa',
    description: 'Padronização de rotinas pré-impressão e contabilização de tempo de preparação da máquina.',
  },

  // Estoque & Materiais
  {
    key: 'stock_filaments',
    category: 'stock',
    title: 'Controle de Estoque de Filamentos & Resinas',
    description: 'Rastreamento de gramas restantes por carretel, custo por kg e alertas de esgotamento.',
  },
  {
    key: 'stock_supplies',
    category: 'stock',
    title: 'Gestão de Insumos Extras & Fixação',
    description: 'Estoque de ímãs de neodímio, parafusos Allen, argolas de chaveiro e embalagens personalizadas.',
  },
  {
    key: 'ready_stock',
    category: 'stock',
    title: 'Estoque de Peças Prontas & Ponto de Reposição',
    description: 'Catálogo de pronta entrega para feiras, pronta venda balcão e marketplaces.',
  },

  // Vendas, CRM & Financeiro
  {
    key: 'sales_crm',
    category: 'sales',
    title: 'Gestão de Vendas Diretas & Encomendas',
    description: 'Registro de pedidos com abatimento automático de estoque e cálculo de comissões.',
  },
  {
    key: 'consignments',
    category: 'sales',
    title: 'Vendas em Consignação com Lojas Parceiras',
    description: 'Controle de lotes consignados, acertos financeiros periódicos e devoluções de peças.',
  },
  {
    key: 'clients_database',
    category: 'sales',
    title: 'Cadastro & CRM de Clientes (PF e PJ)',
    description: 'Histórico de pedidos por cliente, telefone/WhatsApp e dados de entrega.',
  },
  {
    key: 'pdf_whatsapp_quotations',
    category: 'sales',
    title: 'Emissão de Orçamentos PDF & WhatsApp',
    description: 'Geração instantânea de proposta comercial formalizada para envio rápido ao cliente.',
    badge: 'Comercial',
  },

  // Integrações & Avançado
  {
    key: 'integrations_marketplaces',
    category: 'integrations',
    title: 'Integrações (Mercado Livre, Shopee, Bling ERP)',
    description: 'Sincronização de anúncios, importação automática de pedidos e webhook de vendas.',
    badge: 'E-commerce',
  },
  {
    key: 'backup_sqlite',
    category: 'integrations',
    title: 'Backup Seguro SQLite & Portabilidade JSON',
    description: 'Snapshots locais com carimbo de tempo, download binário e proteção contra sobrescrita.',
  },
  {
    key: 'workshop_themes',
    category: 'integrations',
    title: 'Modos de Alto Contraste para Chão de Oficina',
    description: 'Temas Preto Puro, Oficina Clara, Sage Bento e Dark Studio ajustados para iluminação fabril.',
  },
  {
    key: 'priority_support',
    category: 'integrations',
    title: 'Suporte Técnico Prioritário VIP',
    description: 'Canal direto para dúvidas de parametrização e atendimento acelerado via WhatsApp.',
    badge: 'Exclusivo',
  },
];

export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  core: { label: 'Cálculo & Engenharia 3D', color: 'emerald' },
  production: { label: 'Produção & Parque de Máquinas', color: 'sky' },
  stock: { label: 'Estoque & Materiais', color: 'amber' },
  sales: { label: 'Vendas, CRM & Comercial', color: 'purple' },
  integrations: { label: 'Integrações & Infraestrutura', color: 'rose' },
};
