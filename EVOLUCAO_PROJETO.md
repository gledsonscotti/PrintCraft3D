# Registro de Evolução e Histórico do Projeto PrintCraft 3D

Este documento consolida o histórico integral de desenvolvimento, decisões de arquitetura de software, problemas diagnosticados com suas causas-raiz, soluções de engenharia implementadas e diretrizes de continuidade técnica do ecossistema **PrintCraft 3D**.

---

## 📌 Sumário Executivo

- **Nome da Aplicação**: PrintCraft 3D (Engenharia de Custos, Gestão Industrial de Impressão 3D & SaaS Multi-Tenant)
- **Escopo Funcional**:
  - Engenharia de custos de produção com cálculo de potências térmicas separadas, depreciação mecânica horária e lista de materiais (BOM).
  - Varredura de sub-rede local (LAN Auto-Discovery) com suporte a 10 marcas de impressoras e calibração em 1 clique.
  - Telemetria e envio direto de G-Code (Direct Print) com monitoramento em tempo real de bico/mesa e controle de emergência.
  - Gestão de estoque com rastreio de tara de carretéis e baixa atômica após impressão ou venda.
  - Controle comercial, gestão de pedidos, carteira de clientes, logística de transportadoras e controle fabril (MES).
  - Visualização 3D multiformato (STL binário/ASCII, STEP/STP via OpenCascade e simulação de trajetórias de G-Code).
  - Arquitetura multi-tenant com bancos de dados SQLite segregados por CNPJ/CPF da empresa contratante.
  - Módulo multi-banco com gerador de DDL e rotinas para migração para PostgreSQL, MySQL, MariaDB, SQL Server e Oracle.
- **Ambiente de Execução**: Full-Stack Node.js (Express) + React 19 (Vite) em porta unificada (3000), persistência atômica via `sql.js` (SQLite compilado para WebAssembly com exportação direta em disco) e inteligência artificial via Google GenAI SDK (`@google/genai`).

---

## 📜 Histórico Cronológico de Demandas e Fases de Desenvolvimento

### Fase 1: Fundação do Sistema e Engenharia de Custos
- **Demanda**: Desenvolver uma aplicação para calcular os custos reais de impressão 3D, superando estimativas simplistas de peso que ignoram consumo elétrico e desgaste mecânico.
- **Implementações**:
  - Implementação das fórmulas fundamentais:
    - Custo elétrico considerando a potência somada da extrusora e da mesa aquecida ($Watts \times Horas \div 1000 \times Tarifa$).
    - Custo de filamento baseado no valor do carretel, diâmetro (1.75mm / 2.85mm) e densidade real do polímero ($g/cm^3$).
    - Custo de depreciação e manutenção horária da máquina.
    - Margem de perda e falha percentual.
    - Mão de obra de preparação, fatiamento e pós-processamento.
  - Criação do catálogo inicial de materiais (PLA, ABS, PETG, TPU, etc.).

### Fase 2: Visualizador 3D Avançado (STL, STEP e G-Code)
- **Demanda**: Permitir ao operador visualizar a geometria da peça diretamente na aplicação e extrair dados sem depender de fatiadores externos para orçamentos rápidos.
- **Implementações**:
  - Integração com **Three.js** para renderização com iluminação de estúdio, sombras, controles orbitais (`OrbitControls`) e modo wireframe.
  - Parser nativo de arquivos **STL** binários e ASCII com cálculo de volume cúbico e bounding box milimétrica.
  - Integração com a biblioteca de modelagem paramétrica **OpenCascade** (`occt-import-js`) para ler arquivos CAD profissionais em formato **STEP** (`.step` / `.stp`), gerando malha poligonal diretamente no navegador.
  - Parser de arquivos **G-Code** (`.gcode`), renderizando as trajetórias de extrusão camada por camada e extraindo o tempo estimado e peso de filamento a partir de metadados gerados pelo PrusaSlicer, Bambu Studio e Cura.

### Fase 3: Gestão de Insumos Extras e Montagem (BOM)
- **Demanda**: Peças 3D raramente são vendidas isoladas; produtos como chaveiros exigem correntes e argolas, luminárias exigem soquetes e fiação, bonecos exigem ímãs ou parafusos.
- **Implementações**:
  - Criação do módulo de **Insumos & Ferragens** com controle de estoque, custo unitário e gatilhos de reposição mínima.
  - Integração da Lista de Materiais (**BOM - Bill of Materials**) na calculadora e no catálogo de produtos: o usuário adiciona múltiplos insumos a uma peça e o custo é computado na formação do preço.
  - Criação do fluxo de **Execução de Impressão (Baixa Automática)**: ao confirmar uma tiragem de $N$ peças, o sistema debita automaticamente os gramas do carretel selecionado e a quantidade exata de cada insumo utilizado.

### Fase 4: Resolução de Bloqueio de Exclusão (Diagnóstico do Modal Nativo)
- **Problema Relatado**: *"A exclusão dos insumos não esta funcional. Eu clico em excluir e não deleta."*
- **Diagnóstico Técnico**:
  - As rotas de exclusão no backend (`DELETE /api/supplies/:id`, `DELETE /api/printers/:id`, `DELETE /api/products/:id`) estavam corretas.
  - No entanto, a interface utilizava a função nativa do navegador `window.confirm("Deseja excluir...?")`. Em ambientes modernos protegidos por iframes ou políticas estritas de sandbox (como contêineres web e pré-visualizações), `window.confirm` e `window.alert` são frequentemente suprimidos ou retornam `false` silenciosamente, impedindo o disparo da requisição `fetch(..., { method: 'DELETE' })`.
- **Solução Aplicada**:
  - Criação de um componente React dedicado e acessível: `ConfirmModal.tsx`.
  - Substituição de todo o `window.confirm` em `StockManagementView.tsx`, `PrintersView.tsx` e `ProductsView.tsx` pelo `ConfirmModal`.
  - Adição de banners de notificação visual (toast inline) informando sucesso ou falha na operação.

### Fase 5: Diagnóstico e Blindagem da Persistência de Dados
- **Problema Relatado**: *"Os dados que modifico não estão ficando persistentes. Insumos e impressoras que cadastro não permanecem."*
- **Diagnóstico Técnico Profundo**:
  - O backend utiliza `sql.js` com persistência em arquivo (`database.sqlite`) via `fs.writeFileSync`.
  - Quando testado com `curl`, o backend salvava e recuperava dados com sucesso.
  - Foram adicionados cabeçalhos anti-cache em todas as rotas da API para evitar cache agressivo no navegador.
  - Ferramenta nativa para backup/restauração em formato JSON foi adicionada à interface.

### Fase 6: Unificação da Fonte Única da Verdade no SQLite e Exclusão Permanente
- **Problema Relatado**: *"As exclusões não estão funcionais. Inclusões devem ser permanentes e gravadas em banco sqlite e devem atender as solicitações de exclusões."*
- **Diagnóstico Técnico de Causa-Raiz**:
  1. O mecanismo de "bootstrap sync" anterior comparava os dados do `localStorage` com o banco na inicialização do cliente e tentava re-inserir registros no SQLite. Dessa forma, se um usuário excluísse um item, ele poderia ser reinjetado pelo cache do navegador.
  2. A função de semente de dados (`seedInitialData`) verificava apenas se a contagem de impressoras era zero. Se um usuário excluísse todas as impressoras ou se o servidor reiniciasse, o sistema voltava a semear os dados padrão de fábrica sobre os dados do usuário.
  3. Além disso, ao reiniciar com banco já existente, `seedInitialData` gerava `UNIQUE constraint failed: printers.id` caso tentasse inserir IDs que já constavam.
- **Soluções Arquiteturais Implementadas**:
  1. **SQLite como Fonte Única da Verdade (Single Source of Truth)**:
     - O cliente agora consulta unicamente a API REST do SQLite (`/api/*`) e atualiza o `localStorage` estritamente como reflexo dos dados confirmados pelo banco de dados.
     - O endpoint `/api/sync/bootstrap` foi removido para extinguir qualquer concorrência ou re-inserção de itens deletados.
  2. **Tabela de Metadados do Sistema (`system_meta`)**:
     - Criada a tabela `system_meta (key TEXT PRIMARY KEY, value TEXT)`.
     - O seed inicial registra a chave `initialized = '1'`. Em reinicializações ou reinícios de serviço, o sistema detecta que já foi inicializado e **NUNCA** re-insere os dados de exemplo caso o usuário tenha apagado qualquer impressora, filamento ou insumo.
  3. **Comandos Seguros com `INSERT OR IGNORE`**:
     - Todos os inserts de seed usam `INSERT OR IGNORE INTO`, eliminando qualquer falha de chave única.
  4. **Fluxos de Exclusão Confirmados e Testados**:
     - Confirmação via modais in-app (`ConfirmModal.tsx`), eliminando os bloqueios de sandbox causados pelo `window.confirm`.
     - Chamadas `await fetch('/api/...', { method: 'DELETE' })` com recarregamento assíncrono garantido.

### Fase 7: Plataforma SaaS Multi-Tenant & Governança do Super Administrador
- **Demanda**: Permitir a operação do PrintCraft 3D como um software como serviço (SaaS), onde múltiplas oficinas, empresas ou filiais possuem dados rigorosamente isolados por CNPJ/CPF, com gestão centralizada de planos de assinatura e auditoria.
- **Implementações**:
  - **Segregação Física de Dados**: criação do diretório `/tenant_databases` onde cada empresa cliente possui seu próprio arquivo de banco SQLite (`tenant_<cnpj>.sqlite`).
  - **Mapeamento Multi-Tenant**: tabela de empresas (`companies`), planos de assinatura (`subscription_plans`), permissões e cotas (limites de máquinas cadastradas, usuários simultâneos e produtos no catálogo).
  - **Painel Super Administrador (`AdminView.tsx`)**:
    - Visão geral com métricas de receita recorrente estimada, contagem de tenants ativos e status do sistema.
    - Gestão de empresas clientes (criação, edição, bloqueio, liberação e exclusão permanente).
    - Gestão e personalização de planos de assinatura públicos e corporativos.
    - Auditoria e logs de segurança (`AdminAccessLogsTab.tsx`) para rastrear tentativas de login, exportações e operações críticas.
    - Gestão de backups globais e individuais.

### Fase 8: Gestão Comercial, Vendas, Equipe e Controle de Produção (MES)
- **Demanda**: Conectar o custo da peça e a fabricação diretamente aos processos comerciais de atendimento ao cliente, logística de envio e chão de fábrica.
- **Implementações**:
  - **Gestão Comercial (`SalesManagementView.tsx` e `RegisterSaleModal.tsx`)**: registro de propostas, orçamentos, faturamento de vendas, emissão de ordens de serviço e baixa atômica dos produtos no estoque acabado.
  - **Carteira de Clientes (`ClientsView.tsx`)**: cadastro unificado de clientes com histórico de compras, prazos de entrega e canais de contato.
  - **Logística e Transportadoras (`CarriersView.tsx`)**: gestão de opções de frete, códigos de rastreio e prazos médios de entrega.
  - **Controle de Produção Fabril (`ProductionControlView.tsx`)**: quadro de acompanhamento de ordens de produção, permitindo alocar peças a máquinas disponíveis e controlar estados (Pendente, Em Produção, Concluído).
  - **Gestão de Equipe e Operadores (`CompanyTeamView.tsx`)**: controle de membros da oficina com definição de papéis e permissões funcionais.

### Fase 9: Varredura de Rede Local (LAN Auto-Discovery) para 10 Marcas Globais
- **Demanda**: Facilitar a integração de impressoras à oficina através de varredura automatizada na rede local, identificando protocolos industriais e de consumo sem necessidade de digitação manual exaustiva de IPs e portas.
- **Implementações**:
  - **Scanner de Sub-Rede (`/api/printers/scan-network` e `NetworkDiscoveryModal.tsx`)**:
    - Disparo de broadcasts e verificação paralela de portas de controle (8883, 7125, 80, 8888, 8899, 12345, 8000, 8088, 8443).
    - Identificação de protocolos: **mDNS**, **SSDP**, **Moonraker Klipper**, **Bambu MQTT**, **OctoPrint REST**, **FlashPrint** e controladores industriais.
  - **Homologação das 10 Principais Marcas**:
    - **Bambu Lab**: suporte a X1C, P1S, P1P, A1, A1 Mini, detecção nativa de módulos AMS (Multi-Cor) e cálculo térmico.
    - **Creality**: suporte a K1, K1 Max, K1C, Ender 3 V3, Ender 3 S1 Pro, Halot Mage.
    - **Prusa Research**: suporte a MK4, MK3S+, XL Multi-Tool, MINI+, SL1S.
    - **Anycubic**: Kobra 2/3 Series, Photon Mono e sistema ACE.
    - **Elegoo**: Neptune 4 Series e impressoras SLA Saturn/Mars.
    - **Flashforge**: Adventurer 5M, Guider 3 e Creator 4.
    - **Stratasys**: Linhas F123, Fortus e Origin.
    - **3D Systems**: Linhas ProJet, Figure 4 e SLA.
    - **EOS**: Linhas industriais SLS e DMLS (Formiga, EOS M).
    - **HP**: Linhas industriais Multi Jet Fusion (MJF 5200, 4200).
  - **Presets Automáticos (`src/data/printerBrands.ts`)**: preenchimento instantâneo de volume de mesa, potências da extrusora e da mesa, e taxa horária de depreciação recomendada para o equipamento.

### Fase 10: Impressão Direta (Direct Print) & Telemetria em Tempo Real
- **Demanda**: Permitir ao operador enviar o código G-Code diretamente da aplicação para a impressora e acompanhar as temperaturas e o progresso da fabricação.
- **Implementações**:
  - Criação do modal de despacho e telemetria `DirectPrintModal.tsx`.
  - Rotas backend `/api/printers/:id/send-job` e `/api/printers/:id/telemetry`.
  - Monitoramento gráfico contínuo das temperaturas atuais e alvos da ponta aquecida (Hotend) e da mesa (Bed).
  - Acompanhamento percentual do progresso, contagem de tempo decorrido e estimativa de término.
  - Ações operacionais de controle: pausar trabalho, retomar impressão e botão de **Parada de Emergência (Emergency Stop)**.

### Fase 11: Gerenciamento Multi-Banco de Dados (Enterprise RDBMS Engines)
- **Demanda**: Suportar cenários corporativos onde a empresa exige integração ou migração para bancos de dados relacionais gerenciados em nuvem ou servidores locais.
- **Implementações**:
  - Módulo `server/multiDbManager.ts` e interface `src/components/admin/database/`.
  - Suporte ao catálogo de 6 motores de banco de dados: **SQLite, PostgreSQL, MySQL, MariaDB, Microsoft SQL Server e Oracle**.
  - **Gerador de DDL Automático**: conversão dinâmica da estrutura relacional do PrintCraft 3D em scripts SQL compatíveis com as particularidades de tipos de dados de cada SGBD.
  - **Exportador de Carga de Dados (Data Inserts)**: conversão de dados do SQLite em comandos de inserção SQL para facilitar a migração e o provisionamento em bancos externos.
  - **Testador de Conectividade**: verificação de integridade de portas e hosts remotos via sockets diretos.

### Fase 12: Arquitetura de Temas (Sage Bento, Oficina Clara e Dark Studio) e Blindagem Defensiva Global
- **Demanda**: Atender requisitos de ergonomia visual para ambientes de oficina iluminados pelo sol, adotar um tema contemporâneo e resolver de forma definitiva potenciais erros de runtime com valores numéricos.
- **Implementações**:
  - **Mapeamento Triplo de Temas**:
    - **Sage Bento**: estética orgânica com cartolina suave, tons terrosos, verde sálvia e organização em blocos funcionais.
    - **Oficina Clara (High-Contrast Light)**: projetado para ambientes de alta iluminação; fundo branco sólido (#FFFFFF), contraste elevado (WCAG AAA), sem sombras difusas que dificultem a leitura em tablets industriais.
    - **Dark Studio / High-Contrast Dark**: ambiente escuro de alto contraste para consoles de controle em baixa luminosidade.
  - **Padronização Semântica de Componentes**:
    - Criação de classes CSS dedicadas em `src/index.css` para cartões de impressoras (`.printer-card`), botões de varredura (`.printer-scan-btn`), modais de cadastro (`.printer-modal-box`) e modais de descoberta de rede (`.discovery-modal-box`), garantindo que 100% dos novos componentes sigam o tema ativo.
  - **Blindagem Defensiva Numérica Global**:
    - Auditoria minuciosa em todos os componentes da aplicação, substituindo chamadas vulneráveis a valores nulos/indefinidos pelo padrão seguro `Number(valor || 0).toFixed(x)`.

---

## 🗄️ Mapeamento Consolidado de Endpoints REST da Aplicação

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Healthcheck do servidor e timestamp de execução |
| `POST` | `/api/auth/login` | Autenticação unificada (Superadmin ou Operador/Empresa) |
| `POST` | `/api/auth/register-company` | Criação de empresa, usuário administrador e banco de tenant |
| `GET` | `/api/public/plans` | Catálogo de planos de assinatura públicos |
| `GET` | `/api/printers` | Lista todas as impressoras cadastradas na empresa ativa |
| `POST` | `/api/printers` | Cadastro manual ou assistido de impressora 3D |
| `PUT` | `/api/printers/:id` | Atualização de parâmetros técnicos e térmicos da impressora |
| `DELETE` | `/api/printers/:id` | Exclusão permanente de impressora do parque |
| `POST` | `/api/printers/scan-network` | Varredura de sub-rede via mDNS, SSDP, Moonraker e MQTT |
| `POST` | `/api/printers/:id/test-connection` | Teste de ping e latência da impressora |
| `POST` | `/api/printers/:id/send-job` | Disparo de impressão direta (envio de G-Code) |
| `GET` | `/api/filaments` | Lista de carretéis de filamento no estoque |
| `POST` | `/api/filaments` | Cadastro de novo carretel |
| `PUT` | `/api/filaments/:id` | Atualização de dados do carretel |
| `PATCH` | `/api/filaments/:id/stock` | Ajuste incremental rápido de peso (+/- gramas) |
| `DELETE` | `/api/filaments/:id` | Exclusão permanente de carretel de filamento |
| `GET` | `/api/supplies` | Lista de insumos extras e ferragens de montagem (BOM) |
| `POST` | `/api/supplies` | Cadastro de novo insumo |
| `PUT` | `/api/supplies/:id` | Atualização de quantidade e custo unitário |
| `DELETE` | `/api/supplies/:id` | Exclusão permanente de insumo |
| `GET` | `/api/products` | Catálogo de produtos montados e orçados |
| `POST` | `/api/products` | Cadastro de produto com sua composição de BOM |
| `DELETE` | `/api/products/:id` | Exclusão permanente de produto do catálogo |
| `GET` | `/api/sales` | Histórico e lista de vendas faturadas |
| `POST` | `/api/sales` | Registro de venda com baixa atômica de estoque |
| `GET` | `/api/clients` | Cadastro e consulta de clientes |
| `POST` | `/api/clients` | Cadastro de novo cliente |
| `GET` | `/api/carriers` | Cadastro de transportadoras e opções logísticas |
| `POST` | `/api/carriers` | Cadastro de transportadora |
| `GET` | `/api/admin/companies` | Listagem e governança de empresas assinantes (Superadmin) |
| `POST` | `/api/admin/companies` | Criação manual de empresa cliente pelo Superadmin |
| `PUT` | `/api/admin/companies/:id` | Atualização de status e plano de empresa |
| `DELETE` | `/api/admin/companies/:id` | Exclusão de empresa e desativação do tenant |
| `GET` | `/api/admin/plans` | Gestão de planos SaaS e precificação |
| `POST` | `/api/admin/plans` | Criação de novo plano de assinatura |
| `PUT` | `/api/admin/plans/:id` | Atualização de limites e preços de planos |
| `GET` | `/api/admin/access-logs` | Consulta de trilha de auditoria e logs de segurança |
| `GET` | `/api/multidb/profiles` | Perfis e catalogação de conexões multi-banco |
| `POST` | `/api/multidb/test-connection` | Validação de conexão remota de SGBD |
| `GET` | `/api/multidb/export-ddl` | Geração de script DDL para SGBDs externos |
| `GET` | `/api/backup/export` | Exportação de backup consolidado em formato JSON |
| `POST` | `/api/backup/import` | Restauração completa de banco de dados via JSON |
| `POST` | `/api/ai-optimize` | Consultoria de fatiamento via modelo Gemini 2.5 Flash |

---

## 🚀 Recomendações e Roadmap Técnico para Continuidade

Para equipes ou desenvolvedores que continuarem a evolução do PrintCraft 3D, recomendam-se os seguintes passos estruturais:

1. **Agente de Telemetria Contínua (Daemon Local / WebSocket Gateway)**:
   - Para instalações industriais onde os navegadores não permanecem abertos continuamente, criar um pequeno serviço em Go ou Node.js que roda em um Raspberry Pi ou mini PC na mesma rede local das impressoras, comunicando o status do print diretamente com a API do PrintCraft 3D via WebSocket síncrono.
2. **Reconhecimento Visual de Falhas por Câmera (Spaghetti Detection via IA)**:
   - Integrar capturas de imagem de câmeras USB ou RTSP (ex: câmera nativa Bambu Lab ou Creality K1) com chamadas multimodais ao modelo Gemini para detectar descolamento de peça ou emaranhamento de filamento ("spaghetti"), disparando pausa de emergência automática.
3. **Leitura e Geração de Etiquetas com QR Code / Barcode**:
   - Integração com impressoras térmicas (Zebra / Brother) para imprimir etiquetas de carretéis com identificador único (ID do banco). Leitura por webcam ou leitor de código de barras para baixa instantânea no estoque.
4. **Exportação de Propostas Comerciais em PDF**:
   - Integração com bibliotecas de renderização vetorial (`jspdf` e `html2canvas`) para emissão de orçamentos formais com visualização 3D da peça, detalhamento do BOM, prazos de entrega e condições de pagamento prontas para envio ao cliente final.

---
*Documento compilado e atualizado de acordo com a evolução do projeto PrintCraft 3D.*
