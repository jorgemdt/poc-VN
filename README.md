<img width="1356" height="672" alt="image" src="https://github.com/user-attachments/assets/653dee51-f77f-4b10-ba3d-14888a1175e9" />



# VN Framework POC — Demo Interativa

Prova de Conceito (POC) de um framework leve para **Visual Novels** que roda **100% no navegador**, sem etapa de build, utilizando **JavaScript puro (ES Modules)**, **Three.js** (via `<script type="importmap">`), **Canvas 2D** procedural e **Web Audio API**.

## Como Rodar a Demo

Por utilizar **ES Modules** nativos (`<script type="module">`), os navegadores exigem que os arquivos sejam servidos por um servidor HTTP local (abrir o `index.html` diretamente via `file://` é bloqueado por política de CORS).

Escolha qualquer uma das opções abaixo na pasta raiz do projeto:

### Opção 1: Python (recomendado)

```bash
python3 -m http.server 8080
```

Depois, abra no navegador: `http://localhost:8080`

### Opção 2: Node.js (`serve`)

```bash
npx serve .
```

### Opção 3: VS Code (Live Server)

1. Instale a extensão **Live Server** no VS Code.
2. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.

> **Observação:** É necessário acesso à internet na primeira abertura para carregar o módulo `three` via CDN (`jsDelivr`) definido no `importmap` do `index.html`. Texturas e áudios são gerados 100% em memória no navegador.

---

## O que Testar na Demo

1. **Menu Principal (Camada de UI):** Clique em **▶ Iniciar Demo** para desbloquear o áudio e iniciar o roteiro.
2. **Ato 1 — Pares `(Imagem + Efeito)` e Avanço:** Observe o empilhamento do cenário (*Laboratório Arcano* + shader `vignette`) e da personagem (*Lyra* + shader `pulse`). Avance clicando na cena ou no botão **Avançar ▶**.
3. **Ato 2 — Raycasting de Mouse:** Passe o mouse sobre o **Orbe de Cristal** à direita (o cursor muda para `pointer` com destaque visual e som de *hover*) e clique nele para ativá-lo.
4. **Ato 3 — Shaders em Tempo Real e Escolhas:** O clique ativa o shader `wave` no fundo, muda a expressão da Lyra e exibe botões de escolha ramificada (*Estabilizar o Orbe* ou *Liberar Energia Astral*).
5. **Barra Superior de UI (`z-index: 20`):**
   - **💾 Salvar / 📂 Carregar:** Persiste e restaura o ponto exato do roteiro, camadas, shaders e música em `localStorage`.
   - **✨ Alternar Efeito:** Cicla ao vivo os shaders GLSL do fundo (`vignette`, `wave`, `tint`, `pulse`, `none`).
   - **🔊 Som / 🔇 Mudo:** Liga ou silencia a música de fundo e os efeitos sonoros.
   - **📜 Histórico:** Exibe todas as falas já mostradas na sessão.
   - **🔄 Reiniciar / ☰ Menu:** Reinicia a demo ou reabre o menu principal.

---

## Estrutura do Projeto

```text
poc-VN/
├── index.html                  # Import Map do Three.js e camadas DOM (#scene, #dialogue, #ui)
├── styles/
│   └── main.css                # Layout empilhado (z-index 1, 10, 20) e estilos de UI
├── src/
│   ├── audio/
│   │   └── AudioManager.js     # Música ambiente e SFX procedurais via Web Audio API
│   ├── core/
│   │   ├── Engine.js           # Scene, OrthographicCamera (1280x720), WebGLRenderer e loop
│   │   ├── EventBus.js         # Barramento de eventos Publish/Subscribe
│   │   ├── LayerStack.js       # Pilha dinâmica de pares (ImageLayer + EffectLayer GLSL)
│   │   └── StoryRunner.js      # Interpretador de roteiro, rótulos, saltos e save/load
│   ├── input/
│   │   └── MouseController.js  # Raycaster para hover/clique em objetos e avanço na cena
│   ├── ui/
│   │   ├── DialogueBox.js      # Balão de fala, typewriter e botões de escolha
│   │   └── HudMenu.js          # Barra de controles, histórico e menu principal
│   └── main.js                 # Inicialização e integração dos módulos
└── demo/
    ├── AssetGenerator.js       # Texturas procedurais via Canvas2D (sem arquivos externos)
    └── story.js                # Roteiro interativo da demo
```
