/**
 * HudMenu.js
 * Gerencia a Camada de UI / Menus (DOM z-index: 20), sempre acima do diálogo e do canvas.
 *
 * Por que existe:
 * Fornece controles globais persistentes (Salvar, Carregar, Alternar Efeito, Histórico,
 * Reiniciar Demo e Menu Principal) sem interferir nos cliques da cena quando o usuário
 * não está interagindo com os botões ou modais.
 */
export class HudMenu {
  /**
   * @param {HTMLElement} container Elemento #ui-layer.
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.toastTimer = null;

    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    // Barra superior de controles rápidos
    this.hudBarEl = document.createElement('header');
    this.hudBarEl.className = 'hud-bar';

    this.badgeEl = document.createElement('div');
    this.badgeEl.className = 'hud-badge';
    this.badgeEl.innerHTML = '<span>Shader Fundo:</span> <strong id="hud-effect-name">none</strong>';
    this.effectNameEl = this.badgeEl.querySelector('#hud-effect-name');

    this.actionsEl = document.createElement('nav');
    this.actionsEl.className = 'hud-actions';

    this.saveBtn = this._createHudButton('💾 Salvar', 'ui:save');
    this.loadBtn = this._createHudButton('📂 Carregar', 'ui:load');
    this.effectBtn = this._createHudButton('✨ Alternar Efeito', 'ui:toggleEffect', true);
    this.muteBtn = this._createHudButton('🔊 Som', 'ui:toggleMute');
    this.historyBtn = this._createHudButton('📜 Histórico', 'ui:openHistory');
    this.restartBtn = this._createHudButton('🔄 Reiniciar', 'ui:restart');
    this.menuBtn = this._createHudButton('☰ Menu', 'ui:openMenu');

    this.actionsEl.append(
      this.saveBtn,
      this.loadBtn,
      this.effectBtn,
      this.muteBtn,
      this.historyBtn,
      this.restartBtn,
      this.menuBtn
    );

    this.hudBarEl.append(this.badgeEl, this.actionsEl);

    // Toast de notificações rápidas
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'hud-toast';

    // Modal do Menu Principal / Pausa
    this.mainMenuBackdrop = document.createElement('div');
    this.mainMenuBackdrop.className = 'ui-modal-backdrop';
    this.mainMenuBackdrop.innerHTML = `
      <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="vn-title">
        <h1 id="vn-title">VN Framework POC</h1>
        <p>
          Prova de Conceito 100% nativa no navegador (ES Modules + Three.js WebGL),
          sem etapa de build. Explore o empilhamento dinâmico de pares
          <strong>(Imagem + Efeito)</strong>, shaders em tempo real, raycasting de mouse,
          escolhas ramificadas e persistência em <code>localStorage</code>.
        </p>
        <div class="ui-modal-actions">
          <button type="button" class="primary-btn" data-action="start">▶ Iniciar Demo</button>
          <button type="button" class="secondary-btn" data-action="load">📂 Carregar Progresso</button>
          <button type="button" class="secondary-btn" data-action="close">Continuar Cena</button>
        </div>
      </div>
    `;

    // Modal de Histórico de Falas
    this.historyBackdrop = document.createElement('div');
    this.historyBackdrop.className = 'ui-modal-backdrop is-hidden';
    this.historyBackdrop.innerHTML = `
      <div class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <h2 id="history-title">Histórico de Diálogos</h2>
        <div class="history-list" id="vn-history-list"></div>
        <div class="ui-modal-actions">
          <button type="button" class="primary-btn" data-action="close-history">Fechar</button>
        </div>
      </div>
    `;
    this.historyListEl = this.historyBackdrop.querySelector('#vn-history-list');

    this.container.append(
      this.hudBarEl,
      this.toastEl,
      this.mainMenuBackdrop,
      this.historyBackdrop
    );
  }

  _createHudButton(label, eventName, isAccent = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isAccent ? 'hud-btn hud-btn--accent' : 'hud-btn';
    btn.textContent = label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.eventBus.emit(eventName);
    });
    return btn;
  }

  _bindEvents() {
    this.mainMenuBackdrop.addEventListener('click', (e) => {
      const action = e.target?.dataset?.action;
      if (action === 'start') {
        this.hideMainMenu();
        this.eventBus.emit('ui:startDemo');
      } else if (action === 'load') {
        this.hideMainMenu();
        this.eventBus.emit('ui:load');
      } else if (action === 'close') {
        this.hideMainMenu();
      }
    });

    this.historyBackdrop.addEventListener('click', (e) => {
      if (e.target === this.historyBackdrop || e.target?.dataset?.action === 'close-history') {
        this.hideHistory();
      }
    });
  }

  /**
   * Atualiza o indicador visual do shader ativo na camada de fundo.
   * @param {string} effectName
   */
  setActiveEffectLabel(effectName) {
    this.effectNameEl.textContent = effectName || 'none';
  }

  /**
   * Atualiza o rótulo do botão de áudio (Som / Mudo).
   * @param {boolean} isMuted
   */
  setMutedLabel(isMuted) {
    this.muteBtn.textContent = isMuted ? '🔇 Mudo' : '🔊 Som';
  }

  /**
   * Exibe uma mensagem temporária no canto superior direito.
   * @param {string} message
   */
  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-visible');

    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
      this.toastTimer = null;
    }, 2400);
  }

  showMainMenu() {
    this.mainMenuBackdrop.classList.remove('is-hidden');
  }

  hideMainMenu() {
    this.mainMenuBackdrop.classList.add('is-hidden');
  }

  /**
   * Preenche e exibe o modal de histórico de falas.
   * @param {Array<{ speaker: string, speakerColor?: string, text: string }>} entries
   */
  showHistory(entries) {
    this.historyListEl.innerHTML = '';

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhuma fala registrada ainda.';
      this.historyListEl.appendChild(empty);
    } else {
      for (const entry of entries) {
        const item = document.createElement('div');
        item.className = 'history-item';

        const speaker = document.createElement('div');
        speaker.className = 'history-item-speaker';
        speaker.textContent = entry.speaker || 'Narrador';
        if (entry.speakerColor) {
          speaker.style.color = entry.speakerColor;
        }

        const text = document.createElement('div');
        text.className = 'history-item-text';
        text.textContent = entry.text;

        item.append(speaker, text);
        this.historyListEl.appendChild(item);
      }
    }

    this.historyBackdrop.classList.remove('is-hidden');
    this.historyListEl.scrollTop = this.historyListEl.scrollHeight;
  }

  hideHistory() {
    this.historyBackdrop.classList.add('is-hidden');
  }
}
