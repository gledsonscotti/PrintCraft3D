# PrintCraft 3D — Controle de Impressão 3D, Gestão de Estoque e Engenharia de Custos

Sistema profissional full-stack desenvolvido para proprietários de impressoras 3D, fazendas de impressão (print farms), designers de produto e fabricantes sob demanda. O PrintCraft 3D calcula com precisão matemática o custo real de fabricação de qualquer peça 3D, gerencia o estoque de carretéis e insumos de montagem em tempo real e fornece formação inteligente de preço de venda.

---

## 🌟 Principais Funcionalidades

1. **Calculadora de Custos & Engenharia de Preços (BOM)**:
   - Cálculo automático de energia elétrica ($Potência\ Total\ em\ Watts \times Tempo\ de\ Impressão \times Tarifa\ kWh$).
   - Custo do filamento por grama com suporte a densidades físicas personalizadas ($PLA, ABS, PETG, TPU, ASA, Nylon, Resina$).
   - Depreciação e desgaste de máquina proporcional ao tempo de uso ($R\$/hora$).
   - Taxa de falha/perda de filamento configurável por máquina ou projeto.
   - Mão de obra operacional e fatiamento.
   - Lista de Materiais Adicionais (BOM - Bill of Materials): argolas de chaveiro, ímãs de neodímio, parafusos, rolamentos, caixas e embalagens.
   - Formação de preço de venda por markup multiplicador sobre o custo total.

2. **Visualizador 3D Integrado (Three.js + OCCT)**:
   - Suporte a modelos **STL** (binário e ASCII).
   - Suporte a modelos **STEP / STP** via tesselação paramétrica OpenCascade (`occt-import-js`).
   - Suporte a visualização de **G-Code** com simulação de trajetória de extrusão e estimativa nativa de tempo e peso.
   - Bounding box com medição dimensional precisa (X, Y, Z em milímetros).
   - Modos de visualização: Sombreamento suave, Wireframe (aramado), iluminação de estúdio e centralização automática.

3. **Parque de Impressoras 3D**:
   - Cadastro detalhado de máquinas com cálculo térmico separado: potência da extrusora/hotend + potência da mesa aquecida (bed heater).
   - Presets integrados prontos para uso: Bambu Lab X1C, Bambu Lab P1S, Creality Ender 3 S1 Pro, Prusa MK4, Voron 2.4 e Creality K1 Max.
   - Controle de status operacional (Disponível, Imprimindo, Em Manutenção, Offline).

4. **Gestão de Estoque em Tempo Real**:
   - **Carretéis de Filamento**: rastreamento de peso total, tara, gramas restantes com barra de progresso visual e alerta de carretel no fim (< 200g).
   - **Insumos e Ferragens**: unidades em estoque, custo unitário e gatilhos de alerta de reposição mínima.
   - **Baixa Automática**: ao concluir uma tiragem na calculadora, os gramas de filamento e as quantidades de todos os insumos extras são debitados instantaneamente do estoque.

5. **Catálogo de Produtos & Histórico**:
   - Salve produtos finalizados com toda a sua composição de insumos para orçamentos e pedidos recorrentes.
   - Histórico completo de impressões com registro de lotes, datas e custos incorridos.

6. **Consultor de Otimização com IA (Google Gemini)**:
   - Análise inteligente dos parâmetros da peça (dimensões, tempo, peso, material) sugerindo orientações ideais na mesa, ajustes de paredes versus infill e estratégias de economia energética.

7. **Persistência Robusta em Banco SQLite & Exclusões Permanentes**:
   - Banco de dados relacional **SQLite** com persistência física síncrona em arquivo (`database.sqlite`).
   - O SQLite é a **fonte única da verdade** (Single Source of Truth), com endpoints REST completos (GET, POST, DELETE) para impressoras, filamentos, insumos, produtos e histórico.
   - Proteção de estado via tabela `system_meta`: inicializa os dados padrão apenas na primeira execução da aplicação e nunca recria dados previamente apagados pelo usuário.
   - Modais de confirmação in-app para exclusões seguras e permanentes, sem risco de perda inadvertida de dados.
   - Ferramenta nativa para **Exportar Backup Completo (.json)** e **Importar / Restaurar Backup** com um clique para segurança adicional dos seus dados.

8. **Modo Oficina (Alto Contraste)**:
   - Tema *Dark Studio* (padrão), *Oficina Clara* (otimizado para ambientes industriais com luz solar intensa) e *Preto Puro*.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Visualização 3D**: Three.js, `@types/three`, STLLoader, `occt-import-js`.
- **Backend**: Node.js, Express, `sql.js` (SQLite compilado para WebAssembly com exportação síncrona em disco).
- **Inteligência Artificial**: Google Gen AI SDK (`@google/genai`) com modelo Gemini 2.5 Flash.
- **Empacotamento e Build**: `esbuild` para bundle do servidor em CommonJS (`dist/server.cjs`) e Vite para assets estáticos.

---

## 📋 Requisitos Prévios

- **Node.js**: Versão 18.x, 20.x ou superior.
- **npm**: Versão 9.x ou superior.
- **Chave de API Gemini (Opcional)**: Necessária apenas para as dicas do Consultor de IA. Caso não configurada, o sistema utiliza recomendações especializadas integradas offline.

---

## 🚀 Instalação e Execução

### 1. Clonar ou Baixar o Projeto
Extraia os arquivos do projeto no diretório desejado e abra o terminal na pasta raiz:
```bash
cd controle-de-impressao-3d-e-custos
```

### 2. Instalar as Dependências
Execute o comando de instalação do npm:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente (Opcional)
Se desejar habilitar os recursos generativos de IA do Google Gemini:
1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
2. Adicione sua chave de API:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```

### 4. Executar em Modo de Desenvolvimento
Inicie o servidor integrado (Express + Vite na porta 3000):
```bash
npm run dev
```
Abra seu navegador em: **`http://localhost:3000`**

### 5. Compilar e Executar em Produção
Para criar a versão otimizada de produção e inicializá-la:
```bash
# Compila o frontend com Vite e empacota o backend com esbuild:
npm run build

# Inicia o servidor de produção:
npm start
```

---

## 📖 Guia Detalhado de Utilização

### 1. Calculadora de Custos
1. **Upload de Modelo ou Entrada Manual**:
   - Arraste um arquivo `.stl`, `.stp`, `.step` ou `.gcode` para a área de upload ou insira manualmente o peso em gramas e o tempo previsto em minutos.
2. **Seleção de Máquina e Filamento**:
   - Escolha qual impressora executará a peça e qual carretel de filamento será utilizado. A potência da máquina e o custo por grama do filamento serão atualizados automaticamente.
3. **Insumos Adicionais (BOM)**:
   - Clique em **"+ Adicionar Insumo à Peça"** e selecione ferragens (ex: 1x Argola de Chaveiro, 2x Ímã 10x2mm). O custo desses insumos será somado ao custo de fabricação.
4. **Margem e Mão de Obra**:
   - Defina a margem de perda/falha (ex: 10%), o tempo gasto com preparação/fatiamento e a porcentagem de Markup desejada sobre o custo total (ex: 120%).
5. **Ações**:
   - **Salvar no Catálogo**: Armazena a peça com todos os insumos vinculados para consultas futuras.
   - **Confirmar Impressão**: Debita os gramas de filamento e os insumos extras do estoque imediatamente e registra a tiragem no histórico.

### 2. Parque de Impressoras
- Visualize o status de cada máquina da sua oficina.
- Clique em **"+ Nova Impressora"** para cadastrar um novo equipamento.
- Informe a potência do conjunto extrusor (ex: 70W) e da mesa aquecida (ex: 220W). O sistema calculará a potência nominal média combinada.
- Defina o valor de depreciação horária ($R\$/h$) para cobrir o desgaste de bicos (nozzles), correias e manutenções periódicas.

### 3. Gestão de Estoque
- **Aba Carretéis de Filamento**:
  - Cadastre carretéis informando marca, material, cor, peso total e custo de compra.
  - Utilize os botões rápidos de ajuste (+50g, -50g) após pesagens de rotina.
- **Aba Insumos & Ferragens**:
  - Cadastre os itens que você anexa às peças (parafusos, elásticos, caixas de papelão, fita adesiva, chaveiros).
  - Configure o estoque mínimo para receber avisos em vermelho quando for hora de recomprar.

### 4. Backup & Restauração de Dados
- Clique no ícone de **Engrenagem** no topo direito da barra de navegação.
- Na seção **Persistência & Backup do Sistema**:
  - **Exportar Backup JSON**: Faz o download de um arquivo `printcraft3d_backup_AAAA-MM-DD.json` contendo todas as impressoras, filamentos, insumos, produtos, histórico e configurações.
  - **Importar Backup JSON**: Selecione um arquivo de backup previamente exportado para restaurar integralmente o banco de dados em qualquer computador ou servidor.

---

## 📐 Fórmulas Matemáticas de Custo Aplicadas

O PrintCraft 3D utiliza fórmulas de engenharia de produção industrial:

$$Custo_{Energia} = \left( \frac{Potência_{Total} \times Horas_{Impressão}}{1000} \right) \times Tarifa_{kWh}$$

$$Custo_{Filamento} = \left( \frac{Custo_{Carretel}}{Peso_{Carretel}} \right) \times Gramas_{Consumidas}$$

$$Custo_{Depreciação} = Horas_{Impressão} \times Taxa_{Depreciação/Hora}$$

$$Custo_{Perda} = (Custo_{Filamento} + Custo_{Energia}) \times \left( \frac{Taxa_{Falha}}{100} \right)$$

$$Custo_{Insumos} = \sum (Quantidade_i \times Custo\_Unitário_i)$$

$$Custo_{Produção} = Custo_{Energia} + Custo_{Filamento} + Custo_{Depreciação} + Custo_{Perda} + Custo_{Mão\_de\_Obra} + Custo_{Insumos}$$

$$Preço_{Sugerido} = Custo_{Produção} \times \left( 1 + \frac{Markup\%}{100} \right)$$

---

## 📁 Estrutura de Diretórios do Projeto

```
├── index.html                   # Ponto de entrada HTML com meta tags e fontes
├── metadata.json                # Metadados e permissões da aplicação
├── package.json                 # Dependências e scripts de automação
├── tsconfig.json                # Configurações do compilador TypeScript
├── vite.config.ts               # Configuração do Vite e plugins
├── server.ts                    # Servidor Express com APIs REST e middleware Vite
├── server/
│   └── db.ts                    # Inicialização e persistência do SQLite (sql.js)
├── database.sqlite              # Arquivo de banco de dados SQLite persistido
├── src/
│   ├── main.tsx                 # Ponto de entrada do React
│   ├── App.tsx                  # Componente principal, sincronização e navegação
│   ├── types.ts                 # Interfaces TypeScript do ecossistema de impressão
│   ├── index.css                # Estilos globais Tailwind CSS
│   ├── components/
│   │   ├── CostCalculatorView.tsx # Calculadora de custos, BOM e integração com 3D
│   │   ├── ModelViewer3D.tsx      # Renderizador Three.js (STL, STEP e G-Code)
│   │   ├── StockManagementView.tsx# Gestão de filamentos e insumos com baixa em tempo real
│   │   ├── PrintersView.tsx       # Gerenciamento do parque de impressoras 3D
│   │   ├── ProductsView.tsx       # Catálogo de produtos e lista de montagem (BOM)
│   │   ├── PrintHistoryView.tsx   # Histórico de tiragens e ordens de impressão
│   │   ├── SettingsModal.tsx      # Configurações globais, temas e Backup JSON
│   │   └── ConfirmModal.tsx       # Modal acessível para confirmação de exclusões
└── .env.example                 # Exemplo de variáveis de ambiente
```

---

## 📄 Licença
Projeto distribuído sob a licença MIT. Sinta-se livre para usar, estudar, modificar e distribuir em sua oficina ou empreendimento.
