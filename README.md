# PrintCraft 3D — Plataforma Industrial de Impressão 3D, Gestão de Estoque, Engenharia de Custos & SaaS Multi-Tenant

Sistema profissional full-stack desenvolvido para proprietários de impressoras 3D, fazendas de impressão (*print farms*), oficinas de prototipagem rápida, indústrias de manufatura aditiva e operadores sob demanda. O **PrintCraft 3D** une engenharia de custos com precisão matemática, telemetria e envio direto de G-Code (Direct Print), varredura e autodescoberta de rede local (LAN Auto-Discovery), gestão de estoque em tempo real, controle de produção fabril, gestão comercial e arquitetura multi-tenant com bancos isolados por empresa.

> 📖 **Manual de Operação e Configuração do Usuário**: Para o passo a passo completo de configuração inicial da oficina (parâmetros elétricos, impressoras, filamentos, insumos BOM, equipe, clientes e vendas), consulte o [**Manual de Utilização Oficial (Manual_de_Utilizacao.md)**](./Manual_de_Utilizacao.md).

---

## 🌟 Principais Funcionalidades

### 1. Calculadora de Custos & Engenharia de Preços (BOM)
- **Consumo Energético Rigoroso**: cálculo térmico com potência nominal real separada (conjunto extrusor/hotend + mesa aquecida/bed heater) $\times$ tempo $\times$ tarifa local de kWh.
- **Custos de Filamento por Grama**: suporte a densidades físicas personalizadas ($PLA, ABS, PETG, TPU, ASA, Nylon, Resina, Fibra de Carbono$).
- **Depreciação de Máquina**: taxa de amortização e desgaste mecânico proporcional ao tempo de uso ($R\$/hora$).
- **Taxa de Falha & Margem de Risco**: percentual configurável de perda de material por máquina ou complexidade de peça.
- **Mão de Obra Especializada**: parametrização de custos operacionais de fatiamento, preparação de mesa e pós-processamento.
- **Lista de Materiais Adicionais (BOM - Bill of Materials)**: amarração de ferragens e insumos extras (argolas, ímãs, parafusos, rolamentos, caixas, fitas e embalagens) diretamente ao custo de montagem.
- **Formação de Preço Inteligente**: sugestão de preço de venda por markup multiplicador sobre o custo total e cálculo de margem líquida.

### 2. Varredura de Rede Local (LAN Auto-Discovery) & Presets de 10 Marcas
- **Descoberta Automática de Dispositivos**: varredura de sub-rede local (ex: `192.168.1.0/24`) com verificação síncrona de portas de controle (8883, 7125, 80, 8888, 8899, 12345, 8000, 8088, 8443) e protocolos de rede (**mDNS**, **SSDP**, **Moonraker Klipper**, **Bambu MQTT**, **OctoPrint REST**).
- **Suporte aos 10 Principais Fabricantes Globais**:
  - **Bambu Lab** (X1-Carbon, P1S, P1P, A1, A1 Mini, X1E com detecção nativa de AMS)
  - **Creality** (K1, K1 Max, K1C, Ender 3 V3, Ender 3 S1 Pro, CR-10 SE, Halot Mage)
  - **Prusa Research** (MK4, MK3S+, XL Multi-Tool, MINI+, SL1S Speed)
  - **Anycubic** (Kobra 2 Max, Kobra 2 Pro, Photon Mono M5s, Kobra 3 Combo com ACE)
  - **Elegoo** (Neptune 4 Pro, Neptune 4 Max, Saturn 3 Ultra, Mars 4 Ultra)
  - **Flashforge** (Adventurer 5M Pro, Guider 3 Plus, Creator 4)
  - **Stratasys** (F370, F170, Fortus 450mc, Origin One)
  - **3D Systems** (ProJet MJP 2500, Figure 4 Standalone, SLA 750)
  - **EOS** (Formiga P 110 Velocis, EOS M 290)
  - **HP** (Multi Jet Fusion 5200, MJF 4200)
- **Cadastro com 1 Clique**: identificação automática de dimensões de mesa (X, Y, Z mm), firmware, suporte a multi-cor/AMS e preenchimento das potências e depreciação recomendadas.
- **Teste de Ping & Latência**: validação imediata da conectividade e tempo de resposta da máquina antes da homologação.

### 3. Impressão Direta (Direct Print) & Telemetria em Tempo Real
- **Envio Direto de G-Code**: transmissão de arquivos fatiados diretamente para a impressora via rede local (Moonraker, PrusaLink, OctoPrint, Bambu MQTT, etc.).
- **Painel de Telemetria**: monitoramento de temperaturas atuais e de meta do bico (Hotend) e da mesa (Bed).
- **Controle de Produção**: acompanhamento de progresso percentual, tempo decorrido, tempo estimado restante e acionamento de pausa, retomada ou parada de emergência (*Emergency Stop*).

### 4. Visualizador 3D Integrado (Three.js + OpenCascade OCCT)
- **Suporte Multiformato**:
  - **STL** (binário e ASCII) com cálculo de volume e peso teórico.
  - **STEP / STP** via tesselação paramétrica profissional no navegador (`occt-import-js`).
  - **G-Code** com renderização das camadas de extrusão e extração de metadados de fatiamento.
- **Inspeção Dimensional**: *bounding box* milimétrica precisa (X, Y, Z mm) com centralização automática e controles de órbita e zoom.
- **Estilos de Visualização**: sombreamento de superfície com iluminação de estúdio e modo aramado (*wireframe*).

### 5. Gestão de Estoque em Tempo Real & Baixa Automática
- **Carretéis de Filamento**: rastreamento de peso total inicial, tara do carretel, gramas consumidas e restantes com alerta visual de reposição urgente (< 200g).
- **Insumos & Ferragens**: quantitativos unitários, custo médio de compra e estoque mínimo de segurança.
- **Débito Atômico**: ao confirmar a produção ou ordem de impressão, o peso de filamento e a quantidade exata de todos os insumos extras são debitados instantaneamente do estoque.

### 6. Gestão Comercial, Vendas & Controle de Produção (MES)
- **Gestão de Vendas & Pedidos**: registro de propostas comerciais, orçamentos, pedidos faturados e prazos de entrega.
- **Controle de Produção Fabril**: painel de ordens de fabricação para distribuição da carga de trabalho entre as máquinas disponíveis.
- **Gestão de Clientes & Transportadoras**: catálogo de parceiros comerciais, endereços, condições de frete e rastreio.
- **Gestão de Equipe**: controle de operadores e colaboradores por oficina com permissões de acesso.

### 7. Consultor de Fatiamento com Inteligência Artificial (Google Gemini)
- Análise algorítmica dos parâmetros de geometria, volume e material com sugestões geradas pelo modelo **Gemini 2.5 Flash** para:
  - Orientação ótima na mesa para redução de suportes.
  - Estratégias de número de paredes (*perimeters*) versus densidade de preenchimento (*infill*).
  - Ajustes de temperatura e fluxo para minimização de falhas mecânicas.

### 8. Arquitetura Multi-Tenant & Painel Super Administrador (SaaS)
- **Isolamento por Empresa (CNPJ/CPF)**: criação e segregação de bancos de dados SQLite individuais por empresa cliente (`tenant_databases/tenant_<cnpj>.sqlite`), além do banco central administrativo.
- **Planos de Assinatura Flexíveis**: precificação mensal/anual, limites de usuários, cotas de impressoras e recursos liberados por plano.
- **Auditoria & Logs de Acesso**: histórico completo de operações, logins de usuários e atividades de segurança da plataforma.
- **Governança do Super Administrador**: criação, ativação, suspensão e exclusão de empresas e assinantes.

### 9. Gerenciador Multi-Banco de Dados (Enterprise RDBMS)
- Suporte corporativo aos principais bancos relacionais: **MySQL**, **PostgreSQL**, **MariaDB**, **Microsoft SQL Server**, **Oracle** e **SQLite**.
- **Gerador Automático de DDL**: criação de scripts de schema SQL compatíveis com a sintaxe de cada motor.
- **Exportação de Dados (Data Inserts)**: conversão de dados do parque, estoques e pedidos para migração transparente entre SGBDs.
- **Testador de Conectividade**: validação de host, porta e credenciais via socket TCP direto.

### 10. Sistema de Temas Dinâmicos & Acessibilidade
- **Sage Bento**: paleta contemporânea inspirada em manufatura artesanal, tons terrosos e verde sálvia com caixas organizadas estilo bento-grid.
- **Oficina Clara (High-Contrast Light)**: projetado para operadores de oficinas com alta incidência de luz natural e galpões industriais; fundo branco puro, bordas nítidas e tipografia de máximo contraste (WCAG AAA).
- **Dark Studio / High-Contrast Dark**: ambiente escuro de alta legibilidade para baixa fadiga visual em turnos noturnos.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias Principais |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion |
| **Renderização 3D** | Three.js, `@types/three`, STLLoader, `occt-import-js` (OpenCascade WASM) |
| **Backend & APIs** | Node.js, Express, `sql.js` (SQLite WASM persistido em disco via FS) |
| **Inteligência Artificial** | Google Gen AI SDK (`@google/genai`), modelo Gemini 2.5 Flash |
| **Persistência Multi-Tenant** | Bancos SQLite isolados por CNPJ (`/tenant_databases`) e banco principal |
| **SGBDs Compatíveis** | SQLite, PostgreSQL, MySQL, MariaDB, SQL Server, Oracle |
| **Build & Deploy** | `esbuild` (bundle de servidor CommonJS em `dist/server.cjs`) e Vite SPA |

---

## 📋 Requisitos Prévios

- **Node.js**: Versão 18.x, 20.x ou superior.
- **npm**: Versão 9.x ou superior.
- **Chave de API Gemini (Opcional)**: Definida na variável de ambiente `GEMINI_API_KEY` para conselhos generativos do consultor de fatiamento.

---

## 🚀 Instalação e Execução

### 1. Instalar as Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente (Opcional)
```bash
cp .env.example .env
# Edite .env e preencha GEMINI_API_KEY se desejar utilizar IA online
```

### 3. Executar em Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em: **`http://localhost:3000`**

### 4. Compilar e Executar em Produção
```bash
npm run build
npm start
```

---

## 📐 Fórmulas de Engenharia de Custos Aplicadas

$$Custo_{Energia} = \left( \frac{(Potência_{Extrusora} + Potência_{Mesa}) \times Horas_{Impressão}}{1000} \right) \times Tarifa_{kWh}$$

$$Custo_{Filamento} = \left( \frac{Custo_{Carretel}}{Peso_{Carretel}} \right) \times Gramas_{Consumidas}$$

$$Custo_{Depreciação} = Horas_{Impressão} \times Taxa_{Depreciação/Hora}$$

$$Custo_{Perda} = (Custo_{Filamento} + Custo_{Energia}) \times \left( \frac{Taxa_{Falha}}{100} \right)$$

$$Custo_{Insumos\ (BOM)} = \sum_{i=1}^{n} (Quantidade_i \times Custo\_Unitário_i)$$

$$Custo_{Produção} = Custo_{Energia} + Custo_{Filamento} + Custo_{Depreciação} + Custo_{Perda} + Custo_{Mão\_de\_Obra} + Custo_{Insumos}$$

$$Preço_{Venda} = Custo_{Produção} \times \left( 1 + \frac{Markup\%}{100} \right)$$

---

## 🗄️ Principais Rotas da API REST

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Verificação de integridade e timestamp do servidor |
| `POST` | `/api/auth/login` | Login unificado (Superadmin ou Empresa/Operador) |
| `POST` | `/api/auth/register-company` | Cadastro de nova empresa e provisionamento de tenant |
| `GET` | `/api/public/plans` | Lista de planos de assinatura públicos |
| `GET` | `/api/printers` | Lista todas as impressoras da empresa ativa |
| `POST` | `/api/printers` | Cadastro manual ou assistido de impressora 3D |
| `POST` | `/api/printers/scan-network` | Varredura de sub-rede local por mDNS, SSDP, Moonraker e MQTT |
| `POST` | `/api/printers/:id/test-connection`| Teste de ping e latência da porta da impressora |
| `POST` | `/api/printers/:id/send-job` | Disparo de impressão direta (Direct Print G-Code) |
| `GET` | `/api/filaments` | Lista de carretéis de filamento com rastreio de tara e saldo |
| `POST` | `/api/filaments` | Cadastro de novo carretel de material |
| `PATCH` | `/api/filaments/:id/stock` | Ajuste rápido de peso no estoque (+/- gramas) |
| `GET` | `/api/supplies` | Lista de insumos e ferragens (BOM) |
| `POST` | `/api/supplies` | Cadastro de insumos de montagem |
| `GET` | `/api/products` | Catálogo de produtos finalizados e orçados |
| `POST` | `/api/products` | Cadastro de produto com composição de insumos |
| `GET` | `/api/sales` | Lista de vendas e pedidos faturados |
| `POST` | `/api/sales` | Registro de nova venda com baixa no estoque |
| `GET` | `/api/clients` | Cadastro e consulta de clientes |
| `GET` | `/api/carriers` | Cadastro de transportadoras e logística |
| `GET` | `/api/admin/companies` | Listagem e gestão de empresas clientes (Superadmin) |
| `GET` | `/api/admin/plans` | Gestão de planos e pacotes de assinatura (Superadmin) |
| `GET` | `/api/admin/access-logs` | Auditoria e logs de segurança da plataforma |
| `GET` | `/api/multidb/profiles` | Perfis e catalogação de bancos de dados externos |
| `POST` | `/api/multidb/test-connection`| Teste de conectividade com SGBDs (MySQL, Postgres, etc.) |
| `GET` | `/api/multidb/export-ddl` | Gerador de DDL para migração entre motores de banco |
| `GET` | `/api/backup/export` | Download de backup completo consolidado em JSON |
| `POST` | `/api/backup/import` | Restauração integral de banco de dados via JSON |
| `POST` | `/api/ai-optimize` | Consultoria de fatiamento via Gemini 2.5 Flash |

---

## 📁 Estrutura do Projeto

```
├── index.html                           # Ponto de entrada HTML com fontes e viewport
├── metadata.json                        # Metadados e permissões da aplicação
├── package.json                         # Dependências, scripts dev, build e start
├── server.ts                            # Servidor Express com rotas REST e middleware Vite
├── database.sqlite                      # Banco de dados SQLite central persistido
├── tenant_databases/                    # Diretório com bancos SQLite individuais por empresa
├── server/
│   ├── db.ts                            # Inicialização, helpers e persistência síncrona
│   ├── multiDbManager.ts                # Gestão de múltiplos SGBDs, DDL e sincronização
│   └── aiAdvisor.ts                     # Integração com Google GenAI SDK (Gemini)
├── src/
│   ├── main.tsx                         # Bootstrap da aplicação React
│   ├── App.tsx                          # Orquestração principal de rotas, auth e temas
│   ├── types.ts                         # Definições completas de tipos TypeScript
│   ├── index.css                        # Estilos globais e regras semânticas dos temas
│   ├── data/
│   │   └── printerBrands.ts             # Especificações técnicas e presets de 10 marcas
│   └── components/
│       ├── CostCalculatorView.tsx       # Calculadora de custos e BOM integrada a 3D
│       ├── ModelViewer3D.tsx            # Renderizador Three.js (STL, STEP e G-Code)
│       ├── PrintersView.tsx             # Gestão do parque de impressoras e telemetria
│       ├── NetworkDiscoveryModal.tsx    # Varredura LAN Auto-Discovery com radar
│       ├── DirectPrintModal.tsx         # Disparo de impressão direta e monitoramento
│       ├── StockManagementView.tsx      # Controle de carretéis de filamento e insumos
│       ├── ProductsView.tsx             # Catálogo de produtos montados
│       ├── ProductionControlView.tsx    # Controle de produção industrial (MES)
│       ├── SalesManagementView.tsx      # Faturamento comercial e pedidos
│       ├── ClientsView.tsx              # Gestão de carteira de clientes
│       ├── CarriersView.tsx             # Gestão de transportadoras e fretes
│       ├── CompanyTeamView.tsx          # Gestão de equipe e operadores da oficina
│       ├── CategoriesView.tsx           # Categorização de produtos e filamentos
│       ├── SettingsView.tsx             # Configurações de custos, energia e temas
│       ├── ConfirmModal.tsx             # Modal acessível para exclusões permanentes
│       ├── admin/                       # Painel Super Administrador da plataforma SaaS
│       │   ├── AdminView.tsx            # Hub principal de administração
│       │   ├── AdminCompaniesTab.tsx    # Gestão de empresas e assinaturas
│       │   ├── AdminPlansTab.tsx        # Configuração de planos SaaS
│       │   ├── AdminAccessLogsTab.tsx   # Logs de acesso e segurança
│       │   └── database/                # Gestão multi-banco (PostgreSQL, MySQL, etc.)
│       └── auth/                        # Telas de login, registro de empresa e planos
└── .env.example                         # Exemplo de configuração de variáveis de ambiente
```

---

## 📄 Licença
Distribuído sob a licença MIT. Livre para uso comercial, modificação e implantação em oficinas, fazendas de impressão e indústrias.
