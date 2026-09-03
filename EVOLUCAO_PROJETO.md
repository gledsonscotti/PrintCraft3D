# Registro de Evolução e Histórico do Projeto PrintCraft 3D

Este documento registra todo o histórico de desenvolvimento, decisões arquiteturais, problemas diagnosticados, correções aplicadas e o guia de continuidade para futuras iterações do projeto **PrintCraft 3D**.

---

## 📌 Sumário Executivo

- **Nome do Projeto**: PrintCraft 3D (Controle de Impressão 3D, Gestão de Estoque e Custos)
- **Propósito**: Gestão técnica e financeira de oficinas de impressão 3D (FDM/Resina), cálculo automatizado de custos de produção com precisão de engenharia, baixa em tempo real de filamentos e insumos, catálogo de produtos com BOM (Bill of Materials) e visualização tridimensional de arquivos STL, STEP e G-Code.
- **Ambiente de Execução**: Full-Stack Node.js (Express) + React 19 (Vite) na porta única 3000, com banco de dados SQLite persistido (`sql.js`).

---

## 📜 Histórico Cronológico de Demandas e Implementações

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
- **Problema Relatado**: *"Os dados que modifico não estão ficando presidentes. Insumos e impressoras que cadastro não permanecem."*
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
     - Chamadas `await fetch('/api/...', { method: 'DELETE' })` com recarregamento assíncrono garantido (`await onRefreshData()`).
     - Testes automatizados executados via cURL comprovando o ciclo completo: `POST` de criação -> `GET` confirmando presença -> `DELETE` -> `GET` confirmando ausência permanente.

---

## 🗄️ Mapeamento de APIs e Estrutura do Banco SQLite

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Healthcheck do servidor e timestamp |
| `GET` | `/api/printers` | Lista todas as impressoras cadastradas |
| `POST` | `/api/printers` | Cadastra nova impressora 3D |
| `PUT` | `/api/printers/:id` | Atualiza parâmetros técnicos da impressora |
| `DELETE` | `/api/printers/:id` | Remove impressora do parque permanentemente |
| `GET` | `/api/filaments` | Lista carretéis de filamento no estoque |
| `POST` | `/api/filaments` | Cadastra novo carretel de filamento |
| `PUT` | `/api/filaments/:id` | Atualiza carretel |
| `PATCH` | `/api/filaments/:id/stock` | Ajuste rápido de gramas do carretel (+/-) |
| `DELETE` | `/api/filaments/:id` | Remove carretel do estoque permanentemente |
| `GET` | `/api/supplies` | Lista insumos e ferragens extras (BOM) |
| `POST` | `/api/supplies` | Cadastra novo insumo |
| `PUT` | `/api/supplies/:id` | Atualiza estoque e custo do insumo |
| `DELETE` | `/api/supplies/:id` | Exclui insumo do estoque permanentemente |
| `GET` | `/api/products` | Lista catálogo de produtos acabados |
| `POST` | `/api/products` | Salva produto com sua composição de insumos |
| `DELETE` | `/api/products/:id` | Remove produto do catálogo permanentemente |
| `GET` | `/api/print-jobs` | Lista histórico de ordens de impressão |
| `POST` | `/api/print-jobs` | Registra impressão e realiza baixa automática no estoque |
| `GET` | `/api/settings` | Obtém parâmetros globais de custo |
| `PUT` | `/api/settings` | Atualiza tarifa de energia, markup e taxas |
| `GET` | `/api/backup/export` | Exporta banco completo consolidado em JSON |
| `POST` | `/api/backup/import` | Restaura banco completo a partir de JSON |
| `POST` | `/api/ai-optimize` | Consulta modelo Gemini 2.5 Flash para análise de fatiamento |

---

## 🚀 Recomendações e Roadmap para Futuras Continuações

Para desenvolvedores ou operadores que derem continuidade a este projeto, os seguintes aprimoramentos são altamente recomendados:

1. **Integração com Servidores de Impressão (Klipper / OctoPrint / Moonraker)**:
   - Adicionar conexão via WebSocket ou API REST com o Moonraker/OctoPrint para capturar em tempo real o progresso da impressão (%), temperaturas da mesa e hotend, e disparar a baixa no estoque automaticamente assim que o status do print mudar para `complete`.
2. **Leitura de Código de Barras / QR Code para Carretéis**:
   - Utilizar a câmera do dispositivo para ler QR Codes colados nos carretéis, permitindo seleção instantânea do carretel na calculadora de custos.
3. **Emissão de Propostas e Orçamentos Comerciais em PDF**:
   - Criar um gerador de PDF (`jspdf` ou `pdfmake`) formatado profissionalmente para enviar ao cliente com descrição da peça, foto do modelo 3D renderizado, quantidade, prazos e preço final.
4. **Cálculo de Multi-Material (AMS / MMU)**:
   - Expandir a calculadora para permitir atribuição de múltiplos filamentos e cores em uma única peça, computando a torre de purga (purge tower) nos custos de perda.

---
*Documento compilado e atualizado em Setembro de 2026 para o projeto PrintCraft 3D.*
