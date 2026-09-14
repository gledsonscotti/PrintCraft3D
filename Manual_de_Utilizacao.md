# Manual de Operação e Configuração do Usuário — PrintCraft 3D

Guia oficial passo a passo para proprietários de oficinas de impressão 3D, operadores de *print farms*, prestadores de serviços de prototipagem e indústrias de manufatura aditiva.

Este manual foi estruturado na **ordem cronológica exata de implementação**. Siga cada etapa sequencialmente para deixar sua oficina 100% calibrada, garantindo custos elétricos e de material precisos, rastreabilidade de estoque em tempo real e controle de vendas integrado à produção.

---

## 📑 Sumário

1. [Visão Geral e Primeiros Passos](#1-visão-geral-e-primeiros-passos)
2. [Etapa 1: Acesso e Seleção do Tema da Oficina](#2-etapa-1-acesso-e-seleção-do-tema-da-oficina)
3. [Etapa 2: Configurações Gerais da Oficina (Parâmetros de Custo)](#3-etapa-2-configurações-gerais-da-oficina-parâmetros-de-custo)
4. [Etapa 3: Cadastro do Parque de Impressoras 3D](#4-etapa-3-cadastro-do-parque-de-impressoras-3d)
   - [3.1 Varredura de Rede Local (LAN Auto-Discovery) — Recomendado](#31-varredura-de-rede-local-lan-auto-discovery--recomendado)
   - [3.2 Cadastro Manual com Presets Técnicos](#32-cadastro-manual-com-presets-técnicos)
5. [Etapa 4: Estoque — Cadastro de Filamentos e Matéria-Prima](#5-etapa-4-estoque--cadastro-de-filamentos-e-matéria-prima)
6. [Etapa 5: Estoque — Cadastro de Insumos Extras e Ferragens (BOM)](#6-etapa-5-estoque--cadastro-de-insumos-extras-e-ferragens-bom)
7. [Etapa 6: Gestão de Pessoas — Equipe da Oficina e Permissões](#7-etapa-6-gestão-de-pessoas--equipe-da-oficina-e-permissões)
8. [Etapa 7: Gestão de Pessoas — Cadastro de Clientes](#8-etapa-7-gestão-de-pessoas--cadastro-de-clientes)
9. [Etapa 8: Logística — Cadastro de Transportadoras](#9-etapa-8-logística--cadastro-de-transportadoras)
10. [Etapa 9: Catálogo de Produtos e Peças Acabadas](#10-etapa-9-catálogo-de-produtos-e-peças-acabadas)
11. [Etapa 10: Fluxo Operacional Diário](#11-etapa-10-fluxo-operacional-diário)
    - [10.1 Orçamento Rápido e Fatiamento 3D (Calculadora)](#101-orçamento-rápido-e-fatiamento-3d-calculadora)
    - [10.2 Planejamento e Controle de Produção (PCP / MES)](#102-planejamento-e-controle-de-produção-pcp--mes)
    - [10.3 Impressão Direta (Direct Print) e Telemetria](#103-impressão-direta-direct-print-e-telemetria)
    - [10.4 Vendas, Faturamento e Baixa de Estoque](#104-vendas-faturamento-e-baixa-de-estoque)
12. [⚠️ Cuidados Críticos, Armadilhas Comuns e Boas Práticas](#12-️-cuidados-críticos-armadilhas-comuns-e-boas-práticas)
13. [Perguntas Frequentes (FAQ)](#13-perguntas-frequentes-faq)

---

## 1. Visão Geral e Primeiros Passos

O **PrintCraft 3D** é um ecossistema integrado onde cada módulo alimenta diretamente o seguinte:

```
[Configurações de Energia & Mão de Obra]
                  │
                  ▼
         [Parque de Impressoras] ──────► [Potência Térmica + Depreciação/Hora]
                  │                                     │
                  ▼                                     ▼
      [Filamentos & Insumos BOM] ────────► [Calculadora de Custos & 3D]
                  │                                     │
                  ▼                                     ▼
        [Catálogo de Produtos] ──────────► [Ordens de Produção (PCP)]
                  │                                     │
                  ▼                                     ▼
          [Módulo de Vendas] ◄────────────── [Baixa Atômica de Estoque]
```

> **Regra de Ouro:** Não tente orçar uma peça na calculadora antes de cadastrar pelo menos **uma impressora** e **um filamento**, pois a matemática de custos depende dos valores nominais desses ativos.

---

## 2. Etapa 1: Acesso e Seleção do Tema da Oficina

### 2.1 Primeiro Acesso
1. Ao abrir a aplicação, caso não esteja autenticado, a janela de **Login / Cadastro de Empresa** será exibida.
2. Se você é um novo usuário proprietário de oficina, clique na aba **"Cadastrar Nova Empresa"**.
3. Preencha os dados:
   - **Razão Social / Nome da Oficina** (ex: *Prototipagem Rápida Alpha Ltda*)
   - **Nome Fantasia** (ex: *Oficina Alpha 3D*)
   - **CNPJ ou CPF** (usado como chave de segregação do seu banco de dados isolado)
   - **E-mail e Senha Administrativa**
   - **Escolha do Plano de Assinatura** (ex: *Plano Oficina Pro*)
4. Ao concluir, o sistema criará o banco de dados dedicado da sua empresa e realizará o login automático com perfil de **Administrador da Empresa**.

### 2.2 Escolha do Tema de Trabalho
No canto superior direito da barra de navegação, clique no ícone de tema (`#btn-workshop-contrast`) para escolher a melhor ergonomia visual para o seu ambiente de trabalho:
- 🌿 **Sage Bento**: Estilo contemporâneo em tons suaves de verde sálvia e cartolina natural. Excelente para estações de trabalho de escritório e computadores desktop.
- ☀️ **Oficina Clara (High-Contrast Light)**: Fundo branco puro com bordas pretas sólidas e contraste máximo (WCAG AAA). **Recomendado para tablets industriais e celulares em ambientes de oficina com forte incidência de luz solar.**
- 🌙 **Dark Studio / High-Contrast Dark**: Fundo escuro de alto contraste para turnos noturnos e estações com pouca luminosidade.

---

## 3. Etapa 2: Configurações Gerais da Oficina (Parâmetros de Custo)

Antes de cadastrar materiais ou peças, defina os custos operacionais base da sua oficina.

1. Clique no ícone de engrenagem **Configurações** no topo direito (`Ajustes do Sistema`).
2. Na sub-aba **Custos & Parâmetros**, configure com rigor:
   - **Tarifa de Energia (R$/kWh)**: Consulte sua conta de luz recente. Some a tarifa de consumo + bandeira tarifária + impostos (ICMS/PIS/COFINS). Exemplo típico no Brasil: `0.85` a `1.15` R$/kWh.
   - **Custo da Mão de Obra (R$/hora)**: Custo da hora do operador técnico envolvido em fatiar, limpar a mesa, remover suportes e fazer acabamento (ex: `R$ 35,00/hora`).
   - **Margem de Falha Padrão (%)**: Percentual estimado de perda de material e retrabalho (o padrão recomendado para oficinas bem calibradas é de `8%` a `12%`).
   - **Altura de Camada Padrão**: Geralmente `0.20 mm` (usado nas estimativas rápidas).
   - **Infill Padrão (%)**: Geralmente `15%` a `20%`.
   - **Moeda Principal**: Selecione `BRL (R$)`.
3. Clique em **"Salvar Configurações"**.

---

## 4. Etapa 3: Cadastro do Parque de Impressoras 3D

As impressoras 3D determinam duas variáveis críticas da engenharia de custos: **o consumo elétrico térmico** e a **taxa horária de depreciação mecânica**.

Para acessar o parque, abra **Configurações** ➔ sub-aba **Impressoras**.

### 4.1 Varredura de Rede Local (LAN Auto-Discovery) — Recomendado
Se as suas impressoras estão conectadas na mesma rede Wi-Fi ou cabo da oficina:

1. Clique no botão **"Varredura de Rede Local"** (ícone de radar/Wi-Fi).
2. O sistema sugere a faixa de IP padrão da sua rede (ex: `192.168.1.0/24`). Se sua rede utilizar outra faixa, clique nos atalhos (`192.168.0.x`, `10.0.0.x`) ou digite a máscara.
3. Clique em **"Iniciar Varredura na Rede"**.
4. O radar inteligente verificará portas de controle (8883, 7125, 80, 8888, 8899, etc.) e protocolos mDNS/SSDP/Klipper/MQTT dos 10 maiores fabricantes:
   - **Bambu Lab** (X1C, P1S, P1P, A1, A1 Mini — detectando inclusive se há AMS conectado)
   - **Creality** (K1, K1 Max, K1C, Ender 3 V3, Ender 3 S1 Pro)
   - **Prusa Research** (MK4, MK3S+, XL Multi-Tool, MINI+)
   - **Anycubic**, **Elegoo**, **Flashforge**, **Stratasys**, **3D Systems**, **EOS** e **HP**.
5. Quando o dispositivo for listado, clique em **"Testar"** para medir a latência de ping.
6. Clique em **"Cadastrar com 1 Clique"**: a impressora é adicionada instantaneamente com dimensões de mesa (X, Y, Z), potências elétricas e taxa de depreciação calibradas de fábrica.

### 4.2 Cadastro Manual com Presets Técnicos
Caso sua impressora não esteja em rede ou seja do tipo standalone (via cartão SD / pen drive):

1. Clique em **"Cadastrar Impressora"**.
2. Escolha a marca do equipamento entre os 10 fabricantes homologados.
3. O sistema carregará os modelos pré-configurados (ex: *Bambu Lab P1S*, *Creality K1 Max*, *Prusa MK4*).
4. Verifique os dados preenchidos:
   - **Potência da Extrusora / Hotend (Watts)**: Varia de 40W a 80W.
   - **Potência da Mesa Aquecida / Bed (Watts)**: Varia de 150W a 350W (impressoras industriais ou de grande formato podem ter 600W+).
   - **Depreciação por Hora (R$/h)**: Valor que amortiza a compra da impressora e custeia bicos, correias e manutenções periódicas (ex: `R$ 0,80/hora` para impressoras desktop; `R$ 2,50/hora` para industriais).
   - **Taxa de Falha Própria (%)**: Caso a máquina tenha histórico de descolamento de mesa ou seja mais antiga.
   - **Tipo de Conexão**: Selecione *Cartão SD / Pendrive*, *Rede Local (LAN)* ou *Nuvem Oficial*.
5. Clique em **"Salvar Impressora"**.

---

## 5. Etapa 4: Estoque — Cadastro de Filamentos e Matéria-Prima

O cálculo de custo de material por grama exige o cadastro fiel dos carretéis.

1. No menu principal superior, clique na aba **"Estoque"**.
2. Na sub-aba **"Filamentos"**, clique em **"Novo Carretel de Filamento"**.
3. Preencha os campos com os dados do rótulo da embalagem:
   - **Marca do Filamento** (ex: *Voolt3D, PrintaLot, Esun, Creality, Polymaker*).
   - **Tipo de Polímero** (*PLA, ABS, PETG, TPU, ASA, Nylon, Resina, Fibra de Carbono*). O sistema preenche automaticamente a densidade padrão do material (ex: `1.24 g/cm³` para PLA).
   - **Cor e Acabamento** (ex: *Preto Fosco, Cinza Espacial, Mármore, Silk Ouro*).
   - **Peso Líquido Inicial (g)**: Peso apenas do fio (geralmente `1000g` para carretéis de 1kg).
   - **Peso da Tara do Carretel (g)**: Peso do carretel plástico/papelão vazio (consulte a [Seção 12](#12-️-cuidados-críticos-armadilhas-comuns-e-boas-práticas) para detalhes).
   - **Preço de Compra (R$)**: Custo total pago pelo carretel com frete rateado (ex: `R$ 95,00`). O sistema calculará o custo por grama (`R$ 0,095/g`).
   - **Localização na Oficina**: Exemplo: *Prateleira A2 - Gaveta Seca 1*.
4. Clique em **"Cadastrar Filamento"**.

> 💡 **Dica de Operação Diária:** Ao gastar filamento em impressões de teste ou expurgo manual, você pode usar os botões rápidos `+50g` ou `-50g` diretamente no card do carretel no estoque.

---

## 6. Etapa 5: Estoque — Cadastro de Insumos Extras e Ferragens (BOM)

Muitas peças precisam de itens que não saem do bico da impressora: parafusos, ímãs, argolas de chaveiro, caixas de papelão, saquinhos de embalagem, lâmpadas LED, etc.

1. Na aba **"Estoque"**, selecione a sub-aba **"Insumos & Ferragens (BOM)"**.
2. Clique em **"Novo Insumo"**.
3. Cadastre cada item:
   - **Nome do Insumo** (ex: *Argola de Chaveiro com Corrente 25mm*).
   - **Categoria** (*Ferragem, Fixador, Embalagem, Eletrônica, Acabamento*).
   - **Quantidade em Estoque** (ex: `200` unidades).
   - **Estoque Mínimo de Alerta** (ex: `30` unidades).
   - **Custo Unitário de Compra (R$)** (ex: `R$ 0,35` por unidade).
4. Clique em **"Cadastrar Insumo"**.

---

## 7. Etapa 6: Gestão de Pessoas — Equipe da Oficina e Permissões

Se você possui operadores, fatiadores, estoquistas ou técnicos de manutenção na sua oficina:

1. No menu superior, clique na aba **"Pessoas"** e selecione a sub-aba **"Equipe da Oficina"**.
2. Clique em **"Novo Membro da Equipe"**.
3. Preencha o nome, e-mail e senha de acesso.
4. Escolha a **Função (Role)**:
   - **Administrador da Oficina**: Acesso total a custos, precificação, relatórios financeiros e configurações.
   - **Operador de Produção**: Acesso à fila de impressão (PCP), telemetria de impressoras e baixa de estoque, sem visualização de margens líquidas ou faturamento.
   - **Técnico / Fatiador**: Acesso ao analisador 3D e fila de produção.
5. Em **Permissões de Acesso aos Módulos**, marque ou desmarque exatamente o que esse operador pode abrir (*Analisador, Calculadora, Estoque, Catálogo, Produção, Vendas, Pessoas, Configurações*).

---

## 8. Etapa 7: Gestão de Pessoas — Cadastro de Clientes

Para vincular pedidos e orçamentos formais:

1. Na aba **"Pessoas"**, selecione a sub-aba **"Clientes"**.
2. Clique em **"Novo Cliente"**.
3. Selecione o tipo:
   - **Pessoa Física (PF)**: Nome, CPF, WhatsApp/Telefone e E-mail.
   - **Pessoa Jurídica (CNPJ)**: Razão Social, CNPJ, Inscrição Estadual e Contato.
   - **Loja / Revenda Parceira**: Para clientes de atacado ou consignação.
4. Preencha o endereço completo de entrega para cálculo logístico.
5. Clique em **"Cadastrar Cliente"**.

---

## 9. Etapa 8: Logística — Cadastro de Transportadoras

1. Acesse **Configurações** ➔ sub-aba **Transportadoras**.
2. Clique em **"Nova Transportadora"**.
3. Cadastre as modalidades de entrega que sua oficina oferece:
   - *Correios (Sedex / PAC)*
   - *Melhor Envio / Jadlog*
   - *Motoboy Local / Entrega Expressa*
   - *Retirada no Balcão da Oficina*
4. Informe o prazo médio de entrega e se há taxa fixa de coleta.

---

## 10. Etapa 9: Catálogo de Produtos e Peças Acabadas

Para peças que sua oficina vende com frequência (ex: *Suporte de Headset*, *Luminária Articulada*, *Vaso Poligonal*, *Action Figure*):

1. No menu superior, clique na aba **"Catálogo"**.
2. Clique em **"Cadastrar Novo Produto"**.
3. Preencha os dados da peça:
   - **Nome do Produto** e **Categoria**.
   - **Tempo Estimado de Impressão (horas)**.
   - **Impressora Homologada** (vincula o consumo de energia e depreciação).
   - **Filamento Padrão e Peso da Peça (gramas)**.
   - **Insumos Extras do BOM**: Adicione os itens de montagem necessários para 1 unidade (ex: 4 parafusos M3 + 1 caixa de papelão kraft).
   - **Markup de Venda Desejado (%)**: Exemplo: `150%` de lucro sobre o custo total.
4. O sistema calculará o **Custo de Fabricação** exato e sugerirá o **Preço de Venda Final**.
5. Clique em **"Salvar Produto"**.

---

## 11. Etapa 10: Fluxo Operacional Diário

Com a oficina calibrada, o fluxo de trabalho diário funciona em 4 rotinas integradas:

### 10.1 Orçamento Rápido e Fatiamento 3D (Calculadora)
1. Clique na aba **"Calculadora"**.
2. Arraste e solte o arquivo do cliente (`.stl`, `.step` ou `.gcode`).
3. O **Visualizador 3D** exibirá a peça milimétrica com dimensões X, Y, Z e volume.
4. Selecione a **Impressora** e o **Filamento**.
5. Opcionalmente, clique em **"Consultor de Fatiamento (IA)"** para que o **Google Gemini 2.5 Flash** analise a geometria da peça e recomende:
   - Número ideal de perímetros e infill.
   - Orientação na mesa para eliminar suportes difíceis.
   - Temperatura de bico recomendada para resistência mecânica máxima.
6. Adicione o tempo de fatiamento e pós-processamento da mão de obra.
7. O sistema gera na hora o valor mínimo de custo e o preço final de venda para passar ao cliente via WhatsApp ou e-mail.

### 10.2 Planejamento e Controle de Produção (PCP / MES)
1. Clique na aba **"Produção"**.
2. Clique em **"Nova Ordem de Produção (OP)"**.
3. Selecione o produto ou a peça orçada, a quantidade a imprimir e a impressora designada.
4. O status da OP passará por:
   - 🟡 **Pendente**: Na fila aguardando liberação de máquina.
   - 🟢 **Em Produção**: Máquina imprimindo.
   - ✅ **Concluída**: Peça finalizada e mesa liberada.
5. Ao marcar a OP como **Concluída**, o PrintCraft 3D realiza a **Baixa Atômica no Estoque**: subtrai os gramas de filamento consumidos e decrementa a quantidade exata de insumos do BOM.

### 10.3 Impressão Direta (Direct Print) e Telemetria
1. Na tela de Produção ou no Parque de Impressoras, clique em **"Imprimir Direto"** no card da máquina conectada via LAN/Moonraker/Bambu.
2. Selecione o arquivo G-Code fatiado e clique em **"Enviar para Impressora"**.
3. Acompanhe a telemetria em tempo real:
   - Temperatura do Hotend (atual e alvo)
   - Temperatura da Mesa Aquecida (atual e alvo)
   - Percentual de progresso e contagem regressiva de tempo
   - Botão de **Pausa** e botão vermelho de **Parada de Emergência (Emergency Stop)**.

### 10.4 Vendas, Faturamento e Baixa de Estoque
1. Ao concretizar uma venda, clique na aba **"Vendas"** ➔ **"Registrar Nova Venda"**.
2. Selecione o Cliente cadastrado.
3. Escolha a modalidade da venda:
   - **Venda Direta (Pronta-Entrega)**: Se a peça já está impressa no estoque de produtos acabados.
   - **Venda por Encomenda / Pré-Venda**: O sistema gera automaticamente uma Ordem de Produção (OP) no painel fabril.
   - **Consignação ou Marketplaces (Shopee / Mercado Livre)**.
4. Selecione a forma de pagamento (Pix, Cartão, Boleto, Dinheiro) e a transportadora.
5. Clique em **"Concluir Venda"**.

---

## 12. ⚠️ Cuidados Críticos, Armadilhas Comuns e Boas Práticas

Evite os erros mais comuns cometidos por oficinas de manufatura aditiva:

### 1. Cuidado com a Tara do Carretel (Peso Vazio)
- **O Problema**: Um carretel cheio pesa entre 1.180g e 1.250g na balança (1.000g de plástico + 180g a 250g do carretel vazio). Se você pesar o carretel restante na balança sem subtrair a tara, você acreditará que tem 200g a mais de filamento do que realmente possui, causando falhas por falta de material no meio de impressões longas.
- **A Solução**: Sempre que abrir um carretel de marca nova, consulte o peso do carretel vazio indicado pelo fabricante (ou pese um carretel vazio idêntico) e preencha o campo **Tara do Carretel** no sistema.

### 2. Não Subestime a Mesa Aquecida (Bed Heater)
- **O Problema**: Muitos orçamentos consideram apenas a potência do bico extrusor (~50W). No entanto, a mesa aquecida consome de 150W a 350W contínuos ou em ciclos PWM. Em impressões de ABS/PETG a 80°C–100°C que duram 14 horas, a mesa consome mais de 70% de toda a energia elétrica do trabalho.
- **A Solução**: Mantenha as potências separadas (Extrusora vs Mesa) devidamente preenchidas no cadastro de cada impressora.

### 3. IP Estático ou Reserva DHCP para Impressoras na Rede (ex: Anycubic Kobra, Bambu, Creality)
- **O Problema**: Se o roteador da sua oficina reiniciar e atribuir um novo IP dinâmico para a impressora via DHCP, o envio direto de G-Code e o teste de ping falharão.
- **A Solução**: Acesse o roteador Wi-Fi da oficina e faça a **Reserva de IP (DHCP Static Lease)** para o endereço MAC de cada impressora (ex: fixar a Anycubic Kobra X em `192.168.1.130`, a Bambu P1S em `192.168.1.108` e a Prusa MK4 em `192.168.1.122`). Na ferramenta de **Varredura de Rede**, você pode digitar o IP fixo no campo *IP Específico* para localização instantânea da sua máquina Anycubic Kobra.

### 4. Evite Duplicidade de Baixa de Estoque
- Se você cadastrou um produto acabado com BOM e efetuou a baixa através da conclusão da Ordem de Produção (OP), **não debite manualmente** os gramas do carretel na tela de estoque, caso contrário haverá baixa em dobro.

### 5. Rotina de Backup e Restauração de Dados (JSON e SQLite por Empresa)
- **Backup da Empresa Conectada**: Acesse **Configurações** ➔ sub-aba **Integrações & Backups** e clique em **"Exportar Backup Completo (JSON)"**. Você também pode restaurar backups JSON a qualquer momento nesta mesma tela.
- **Gerenciamento por Empresa (Super Administrador)**: No painel **Super Administrador** ➔ aba **Bancos SQLite por Empresa**, você pode:
  - **Baixar Banco (.sqlite)**: download do arquivo binário SQLite isolado da empresa selecionada.
  - **Importar Banco / Backup**: envie tanto arquivos binários `.sqlite` quanto backups `.json` salvos anteriormente. O sistema reconhece o formato automaticamente, valida a integridade e restaura todo o catálogo de filamentos, insumos, impressoras e ordens da empresa sem falhas.

---

## 13. Perguntas Frequentes (FAQ)

#### P: O que acontece se a conexão com a internet cair?
R: O PrintCraft 3D opera com banco local SQLite e servidor próprio. Toda a engenharia de custos, visualização 3D, gestão de estoque e comunicação local com as impressoras via LAN continuam funcionando normalmente sem internet. Apenas o Consultor de Fatiamento (IA Gemini) exige conexão externa.

#### P: Como cadastrar filamentos fracionados ou sobras de amostras?
R: Ao cadastrar o filamento, no campo *Peso Líquido Inicial (g)* coloque a quantidade restante pesada na balança descontada a tara (ex: `350g`) e calcule o valor proporcional de compra no campo de custo.

#### P: Como trocar de operador na mesma estação sem fechar o navegador?
R: Clique no botão de logout (ícone de porta com seta vermelha `#btn-logout`) no topo direito da barra de navegação. A tela de login será aberta instantaneamente para que o próximo colaborador digite suas credenciais.

#### P: O que significa o alerta vermelho no menu de Estoque?
R: Indica que um ou mais carretéis estão com saldo inferior a 200g, ou que insumos extras atingiram o estoque mínimo de segurança cadastrado. Clique na aba Estoque para providenciar a reposição.

---
*Manual desenvolvido e validado para a versão estável do PrintCraft 3D. Em caso de dúvidas estruturais, consulte o administrador do sistema da sua empresa.*
