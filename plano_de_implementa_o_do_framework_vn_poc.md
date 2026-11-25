# Plano de Implementação: Framework Simplificado de Visual Novel (POC)

## 1. Visão Geral e Objetivo Principal (Foco na Demo)

Você deve desenvolver uma **Prova de Conceito (POC)** de um framework leve para **Visual Novels** que rode **100% no navegador**, sem etapa de build (usando **JavaScript puro com ES Modules**, HTML5, CSS3 e **Three.js** via CDN/Import Map para aceleração de hardware via WebGL).

> **DIRETRIZ CRÍTICA — DEMO OBRIGATÓRIA:** O entregável principal deste projeto **não é apenas a biblioteca isolada, mas sim uma Demo Interativa completa e jogável** rodando diretamente ao abrir o `index.html`. A demo **deve obrigatoriamente exercitar e demonstrar na prática todas as funcionalidades** construídas no framework (empilhamento dinâmico de múltiplos pares de imagem+efeito, shaders ativos em tempo real, eventos de hover e clique do mouse em objetos da cena, avanço de diálogo por clique/botão, escolhas ramificadas e menus da camada de UI). O projeto só será considerado concluído quando a demo estiver 100% funcional e demonstrando cada recurso.

### Requisitos Técnicos Obrigatórios:

* **Zero Build / Navegador Nativo:** Deve funcionar abrindo via um servidor estático simples (ex.: `npx serve`, `python -m http.server`, Live Server) usando `<script type="importmap">` para importar o `three`.
* **Código Didático:** Código limpo, modular, legível e bem comentado em português explicando o *porquê* de cada estrutura.
* **Cobertura Total pela Demo:** Nenhuma funcionalidade deve ser criada "no vácuo" — todo recurso implementado nos módulos `core/`, `input/` e `ui/` precisa ser utilizado e visível durante a execução da demo.

## 2. Arquitetura de Camadas (Regra Fundamental)

A pilha visual da aplicação deve obedecer rigorosamente à seguinte ordem de profundidade (de trás para frente):

1. **Camadas de Cena (Renderizadas no `<canvas>` WebGL do Three.js):**
   * A cena é composta por $N$ **pares de camadas** empilhados dinamicamente.
   * Cada par é formado por:
     * **Camada de Imagem (`ImageLayer`):** Um plano (`THREE.Mesh` com `PlaneGeometry`) exibindo uma textura (cenário, personagem, objeto interativo, CG).
     * **Camada de Efeito (`EffectLayer`):** Posicionada imediatamente à frente da sua respectiva Camada de Imagem, responsável por aplicar efeitos visuais acelerados por hardware (ex.: shaders GLSL para vinheta, distorção/onda, flash de cor, escurecimento, fade ou partículas simples).
   * A ordem de criação/índice define o `renderOrder` / posição no eixo `Z` para que novos pares fiquem acima dos anteriores.
2. **Camada de Balão de Diálogo (Overlay DOM - `z-index: 10`):**
   * Posicionada sempre acima de todo o `<canvas>` do Three.js.
   * Contém nome do falante, texto com efeito de digitação (*typewriter*), indicador de clique para avançar e container de botões de escolha.
3. **Camada de UI / Menus (Overlay DOM - `z-index: 20`):**
   * Posicionada sempre no topo absoluto, acima do balão de diálogo e da cena.
   * Contém botões de controle rápido (ex.: Salvar, Carregar, Auto/Pular, Alternar Efeito, Reiniciar Demo) e modal de Menu Principal/Pausa.

## 3. Estrutura de Diretórios Sugerida

```
vn-framework-poc/
├── index.html                  # Estrutura base, importmap do Three.js, containers de UI e Diálogo
├── styles/
│   └── main.css                # Estilização das camadas DOM (Diálogo e UI) sobre o canvas
├── src/
│   ├── core/
│   │   ├── Engine.js           # Setup do Three.js (Scene, OrthographicCamera, WebGLRenderer, Loop)
│   │   ├── EventBus.js         # Barramento de eventos (mouse, botões, estado do roteiro)
│   │   ├── LayerStack.js       # Gerenciador dos pares (Camada de Imagem + Camada de Efeito)
│   │   └── StoryRunner.js      # Interpretador de comandos do roteiro e controle de fluxo
│   ├── input/
│   │   └── MouseController.js  # Raycasting 2D/3D para hover/clique em objetos da cena e clique global
│   ├── ui/
│   │   ├── DialogueBox.js      # Controle do balão de fala, typewriter e botões de escolha
│   │   └── HudMenu.js          # Controle da barra superior/lateral de UI e menus
│   └── main.js                 # Ponto de entrada que inicializa o framework e carrega a demo
└── demo/
    ├── AssetGenerator.js       # Gerador procedural de texturas via Canvas2D (sem arquivos externos)
    └── story.js                # Roteiro completo da demo interativa demonstrando TODOS os recursos
```

> **Nota sobre Assets na Demo:** Para garantir que a demo funcione imediatamente sem erros de CORS ou falta de imagens externas, crie o módulo `demo/AssetGenerator.js` que gera texturas `THREE.CanvasTexture` nítidas (cenários estilizados, personagens com expressões e objetos clicáveis) diretamente em memória.

## 4. Plano de Execução Passo a Passo

Execute as etapas abaixo sequencialmente, validando cada entrega antes de avançar para a próxima.

### Passo 1: Setup Base e `EventBus`

1. Criar `index.html` configurando o `importmap` para `three` (versão estável via unpkg/jsdelivr) e definindo três camadas principais no DOM:
   * `#scene-container` (onde o `<canvas>` do Three.js será injetado)
   * `#dialogue-layer` (camada do balão de diálogo)
   * `#ui-layer` (camada superior de menus e controles)
2. Criar `styles/main.css` garantindo `100vw`/`100vh`, `overflow: hidden`, posicionamento absoluto empilhado e `pointer-events` bem configurados (para que áreas vazias do DOM deixem o clique passar para o `<canvas>`).
3. Implementar `src/core/EventBus.js` com métodos `on(event, callback)`, `off(event, callback)` e `emit(event, payload)`.

### Passo 2: Motor Three.js (`Engine.js`) e Sistema de Pares de Camadas (`LayerStack.js`)

1. Implementar `src/core/Engine.js`:
   * Utilizar `THREE.OrthographicCamera` normalizada (ex.: coordenadas de `-1` a `1` ou resolução lógica `1280x720`) para facilitar o posicionamento 2D mantendo aceleração total da GPU.
   * Gerenciar resize da janela mantendo proporção (*aspect ratio*) e executar o loop `requestAnimationFrame` passando `deltaTime` e `elapsedTime` para atualização de shaders e animações.
2. Implementar `src/core/LayerStack.js`:
   * Cada par registrado recebe um `id` único (ex.: `'bg'`, `'character'`, `'foreground'`) e um índice de pilha.
   * **Camada de Imagem:** `THREE.Mesh` com textura, suporte a posicionamento `(x, y)`, escala, opacidade e transição suave (*fade in/out*).
   * **Camada de Efeito:** `THREE.Mesh` logo à frente da imagem usando `THREE.ShaderMaterial` transparente, suportando efeitos selecionáveis por comando:
     * `'none'`: Transparente.
     * `'vignette'`: Escurecimento nas bordas para clima dramático.
     * `'wave'`: Distorção senoidal/ondulação (útil para sonhos, memórias ou água).
     * `'tint'`: Sobreposição de cor atmosférica (ex.: pôr do sol, alerta vermelho, noite).
     * `'pulse'`: Brilho/pulso rítmico via `uTime`.
   * Métodos obrigatórios: `addLayerPair(id, options)`, `setLayerImage(id, texture, transition)`, `setLayerEffect(id, effectType, params)`, `removeLayerPair(id)` e `update(deltaTime, elapsedTime)`.

### Passo 3: Controle de Eventos de Mouse (`MouseController.js`)

1. Implementar `src/input/MouseController.js` integrado ao `Engine` e ao `EventBus`:
   * **Clique na Cena (Avanço):** Detectar cliques no `<canvas>` que não acertaram objetos interativos e emitir `scene:click` para avançar diálogos.
   * **Objetos Interativos na Cena (Raycaster):** Permitir marcar pares de camadas (ex.: um cristal ou artefato na cena) como `interactive: true`.
   * Ao mover o mouse (`pointermove`), usar `THREE.Raycaster` para detectar *hover*, mudar o cursor para `pointer`, destacar o elemento (ex.: leve aumento de escala ou brilho no shader da camada de efeito) e emitir `object:hover`.
   * Ao clicar (`pointerdown`) em um objeto interativo, emitir `object:click` com o ID do objeto para disparar eventos no roteiro.

### Passo 4: Camada de Diálogo (`DialogueBox.js`) e Camada de UI (`HudMenu.js`)

1. Implementar `src/ui/DialogueBox.js`:
   * Exibir nome do personagem (com cor customizável) e texto animado letra por letra (*typewriter*).
   * Se o usuário clicar enquanto o texto ainda está sendo digitado, completar o texto imediatamente; se já estiver completo, emitir `dialogue:next`.
   * Renderizar botões dinâmicos de escolha (`renderChoices(choices)`) que bloqueiam o avanço por clique na cena até que o jogador clique em um dos botões, emitindo `dialogue:choice`.
2. Implementar `src/ui/HudMenu.js`:
   * Sempre visível/acessível acima de todas as camadas (`z-index` mais alto).
   * Incluir botões funcionais para a demo:
     * **Salvar / Carregar Estado** (persistindo índice do roteiro e estado das camadas em `localStorage`).
     * **Alternar Efeito da Cena** (permite testar/alternar shaders ao vivo na demo).
     * **Histórico (Log)** de falas exibidas.
     * **Reiniciar Demo** e **Menu Principal** (overlay de título com botão "Iniciar Demo").

### Passo 5: Interpretador de Roteiro (`StoryRunner.js`)

1. Implementar `src/core/StoryRunner.js` para executar uma lista linear/ramificada de passos com suporte a rótulos (`label`) e saltos (`goto`).
2. Comandos suportados no roteiro:
   * `layer`: Cria ou atualiza um par `(Imagem + Efeito)` (ex.: `{ type: 'layer', id: 'bg', image: 'sala_noite', effect: 'vignette' }`).
   * `effect`: Altera apenas a camada de efeito de um par existente (ex.: `{ type: 'effect', id: 'bg', effect: 'wave', intensity: 0.5 }`).
   * `say`: Exibe fala no balão de diálogo e aguarda clique ou botão (ex.: `{ type: 'say', speaker: 'Guia', text: 'Clique no artefato brilhante sobre a mesa.' }`).
   * `waitInteraction`: Pausa o fluxo linear e aguarda o clique do mouse em um objeto interativo específico da cena (`targetId`).
   * `choice`: Exibe botões de decisão e salta para o `label` correspondente à escolha do jogador.
   * `goto`: Salta diretamente para um `label`.

### Passo 6: Construção da Demo Completa (`demo/AssetGenerator.js`, `demo/story.js` e `src/main.js`)

Esta etapa é **essencial** para validar o framework de ponta a ponta:

1. Implementar `demo/AssetGenerator.js` gerando texturas claras e visualmente distintas para a demo:
   * **Cenário 1:** *Laboratório Arcano* (fundo atmosférico).
   * **Cenário 2:** *Jardim Astral* (fundo alternativo para demonstrar troca dinâmica de cenário).
   * **Personagem:** *Lyra* (com pelo menos duas expressões: neutra e surpresa).
   * **Objeto Interativo:** *Orbe de Cristal* posicionado em destaque na cena.
2. Implementar `demo/story.js` como uma experiência guiada e interativa que **demonstra obrigatoriamente todas as funcionalidades**:
   * **Tela Inicial (Camada de UI):** Abre com o Menu Principal sobre a cena animada ao fundo, com botão **"Iniciar Demo"**.
   * **Ato 1 — Empilhamento de Pares (Imagem + Efeito) e Avanço por Clique/Botão:**
     * Cria o Par 1 (Cenário *Laboratório Arcano* + efeito `vignette`), depois o Par 2 (Personagem *Lyra* + efeito `pulse`).
     * A personagem guia o usuário explicando as camadas enquanto o usuário avança usando clique na cena ou o botão de avançar no balão.
   * **Ato 2 — Eventos de Mouse (Hover e Clique em Objeto na Cena):**
     * Adiciona o Par 3 (*Orbe de Cristal*, marcado como `interactive: true`) acima dos anteriores.
     * Pausa o roteiro (`waitInteraction`) instruindo o usuário a passar o mouse sobre o orbe (demonstrando o feedback visual de *hover* e mudança de cursor) e clicar nele para ativá-lo.
   * **Ato 3 — Shaders em Tempo Real e Botões de Escolha:**
     * Ao clicar no orbe, dispara o efeito `wave` (distorção WebGL) na camada de fundo, troca a expressão da personagem e exibe **botões de escolha** na camada de diálogo (*"Estabilizar o Orbe"* vs. *"Liberar Energia Astral"*).
     * Cada escolha leva a um desfecho diferente (trocando para o *Jardim Astral* ou aplicando filtro `tint`), encerrando com instruções para testar os botões da barra superior de UI (**Salvar**, **Carregar**, **Alternar Efeito**, **Histórico** e **Reiniciar Demo**).
3. Conectar tudo em `src/main.js` garantindo que a demo inicie limpa, responsiva e sem dependências externas quebradas.

## 5. Critérios de Aceitação (Checklist Final)

* \[ \] **Demo Completa e Jogável:** A demo existe, inicia imediatamente no navegador e demonstra na prática **todas** as funcionalidades listadas abaixo.
* \[ \] **Execução Direta:** A aplicação abre no navegador sem erros no console e sem necessidade de bundler.
* \[ \] **Pares de Camadas:** É possível criar múltiplos pares `(Camada de Imagem + Camada de Efeito)` em ordem arbitrária.
* \[ \] **Efeitos Acelerados por Hardware:** Os efeitos rodam via shaders WebGL no Three.js em cima de suas respectivas imagens.
* \[ \] **Hierarquia de Sobreposição:** O balão de diálogo permanece sempre acima de todas as camadas da cena, e a UI/Menus permanece sempre acima do balão de diálogo.
* \[ \] **Eventos de Mouse:** Funcionam tanto para avançar diálogo quanto para *hover* e *clique* em objetos específicos da cena.
* \[ \] **Botões Interativos:** Botões de escolha no diálogo e botões globais na barra de UI (Salvar/Carregar, Alternar Efeito, Histórico, Reiniciar) funcionam perfeitamente durante a demo.